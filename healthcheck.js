const net = require('net');

const host = process.env.HEALTHCHECK_HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);

const socket = net.createConnection(
  {
    host,
    port
  },
  () => {
    socket.end();
    process.exit(0);
  }
);

socket.setTimeout(2500);

socket.on('timeout', () => {
  socket.destroy();
  process.exit(1);
});

socket.on('error', () => {
  process.exit(1);
});