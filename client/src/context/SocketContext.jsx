import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from './socketContext';

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [activity, setActivity] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);

  const appendActivity = useEffectEvent((event) => {
    setLastEvent(event);
    setActivity((current) => [event, ...current].slice(0, 20));
  });

  useEffect(() => {
    if (!token || !user) {
      return undefined;
    }

    const nextSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = nextSocket;

    if (user.role === 'coordinator') {
      nextSocket.emit('join_dashboard', user.id);
    }

    const listeners = {
      task_created: (payload) =>
        appendActivity({
          type: 'task_created',
          message: `New task created: ${payload.title || payload.task?.title || 'Untitled task'}`,
          payload,
          timestamp: new Date().toISOString(),
        }),
      task_updated: (payload) =>
        appendActivity({
          type: 'task_updated',
          message: `Task updated: ${payload.task?.title || payload.title || payload.taskId}`,
          payload,
          timestamp: new Date().toISOString(),
        }),
      task_deleted: (payload) =>
        appendActivity({
          type: 'task_deleted',
          message: `Task removed: ${payload.taskId}`,
          payload,
          timestamp: new Date().toISOString(),
        }),
      ai_match_complete: (payload) =>
        appendActivity({
          type: 'ai_match_complete',
          message: `AI found ${payload.matches?.length || 0} suggestions for task ${payload.taskId}`,
          payload,
          timestamp: new Date().toISOString(),
        }),
      volunteer_availability_changed: (payload) =>
        appendActivity({
          type: 'volunteer_availability_changed',
          message: `${payload.volunteer?.name || 'Volunteer'} is now ${payload.availability ? 'available' : 'busy'}`,
          payload,
          timestamp: new Date().toISOString(),
        }),
      task_accepted: (payload) =>
        appendActivity({
          type: 'task_accepted',
          message: `${payload.volunteerName || 'Volunteer'} accepted a task`,
          payload,
          timestamp: new Date().toISOString(),
        }),
    };

    Object.entries(listeners).forEach(([eventName, handler]) => {
      nextSocket.on(eventName, handler);
    });

    return () => {
      Object.entries(listeners).forEach(([eventName, handler]) => {
        nextSocket.off(eventName, handler);
      });
      nextSocket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  function emitEvent(eventName, payload) {
    if (socketRef.current) {
      socketRef.current.emit(eventName, payload);
    }
  }

  return (
    <SocketContext.Provider
      value={{
        emitEvent,
        activity,
        lastEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
