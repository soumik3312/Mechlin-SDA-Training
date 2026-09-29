const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  console.log('Socket ID:', socket.id);

  socket.emit('join', 'day8-test-room');

  socket.emit('user:update', {
    userId: 'day8-test-user',
    action: 'profile-updated',
  });

  socket.emit('order:create', {
    orderId: 'day8-test-order',
    action: 'created',
  });
});

socket.on('user:updated', (data) => {
  console.log('Received user update:', data);
});

socket.on('order:created', (data) => {
  console.log('Received order update:', data);
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

setTimeout(() => {
  socket.disconnect();
  process.exit(0);
}, 5000);