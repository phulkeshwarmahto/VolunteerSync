import { useEffect, useState } from 'react';
import api from '../api/axios';
import CreateTaskForm from '../components/Task/CreateTaskForm';
import TaskBoard from '../components/Task/TaskBoard';
import Loader from '../components/shared/Loader';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

export default function TasksPage() {
  const { user, getApiError } = useAuth();
  const { emitEvent, lastEvent } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadTasks() {
      setLoading(true);
      setError('');

      try {
        const endpoint = user.role === 'volunteer' ? `/tasks?assignedTo=${user.id}` : '/tasks';
        const { data } = await api.get(endpoint);

        if (!ignore) {
          setTasks(data);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(getApiError(requestError, 'Failed to load tasks.'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      ignore = true;
    };
  }, [getApiError, lastEvent?.timestamp, user]);

  async function createTask(payload) {
    setCreating(true);
    setError('');
    setMessage('');

    try {
      await api.post('/tasks', payload);
      setMessage('Task created successfully.');
      return true;
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to create task.'));
      return false;
    } finally {
      setCreating(false);
    }
  }

  async function runMatch(task) {
    setBusyTaskId(task.id);
    setError('');
    setMessage('');

    try {
      await api.post(`/match/${task.id}`);
      setMessage(`AI suggestions refreshed for "${task.title}".`);
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to run AI matching.'));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function assignVolunteer(task, match) {
    setBusyTaskId(task.id);
    setError('');
    setMessage('');

    try {
      await api.put(`/tasks/${task.id}`, {
        assignedTo: match.volunteerId,
        status: 'Assigned',
      });
      setMessage(`${match.name} assigned to "${task.title}".`);
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to assign volunteer.'));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function updateStatus(task, status) {
    setBusyTaskId(task.id);
    setError('');
    setMessage('');

    try {
      await api.put(`/tasks/${task.id}`, { status });

      if (user.role === 'volunteer' && status === 'In Progress') {
        emitEvent('volunteer_accept_task', {
          taskId: task.id,
          volunteerId: user.id,
          volunteerName: user.name,
        });
      }

      emitEvent('task_status_update', {
        taskId: task.id,
        newStatus: status,
        assignedVolunteer: task.assignedTo?.name || user.name,
      });

      setMessage(`Task "${task.title}" updated to ${status}.`);
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to update task status.'));
    } finally {
      setBusyTaskId(null);
    }
  }

  async function deleteTask(task) {
    const shouldDelete = window.confirm(`Delete "${task.title}"?`);
    if (!shouldDelete) {
      return;
    }

    setBusyTaskId(task.id);
    setError('');
    setMessage('');

    try {
      await api.delete(`/tasks/${task.id}`);
      setMessage(`Task "${task.title}" deleted.`);
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to delete task.'));
    } finally {
      setBusyTaskId(null);
    }
  }

  if (loading) {
    return <Loader label="Loading task board" />;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Task Board</p>
          <h1>{user.role === 'coordinator' ? 'Dispatch work with confidence' : 'Track your assigned work'}</h1>
          <p>Use live updates, AI suggestions, and clear status flows to keep execution moving.</p>
        </div>
      </div>

      {error ? <p className="form-message form-message--error">{error}</p> : null}
      {message ? <p className="form-message form-message--success">{message}</p> : null}

      <div className="tasks-layout">
        {user.role === 'coordinator' ? (
          <aside className="panel">
            <CreateTaskForm onCreate={createTask} creating={creating} />
          </aside>
        ) : null}

        <div className="panel panel--grow">
          <TaskBoard
            tasks={tasks}
            currentUser={user}
            busyTaskId={busyTaskId}
            onRunMatch={runMatch}
            onAssign={assignVolunteer}
            onStatusChange={updateStatus}
            onDelete={deleteTask}
          />
        </div>
      </div>
    </div>
  );
}
