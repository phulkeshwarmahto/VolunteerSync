module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_dashboard', (userId) => {
      if (userId) {
        socket.join(`coordinator_${userId}`);
      }
    });

    socket.on('update_availability', (payload) => {
      io.emit('volunteer_availability_changed', payload);
    });

    socket.on('task_status_update', (payload) => {
      io.emit('task_updated', payload);
    });

    socket.on('volunteer_accept_task', (payload) => {
      io.emit('task_accepted', payload);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
