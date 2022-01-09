// TODO handle-upgrade needs to assign id + info to sockets 
import http from 'http';
import * as dotenv from "dotenv";
import { SocketServer } from 'socket';

dotenv.config();

const server = http.createServer();
let wss: SocketServer;

// CONSTANTS
const spam_duration = Number(process.env.SPAM_DURATION || 200);
const spam_reset = Number(process.env.SPAM_RESET || 1500);
const strikes = Number(process.env.MAX_STRIKES || 3);
const heartbeat_interval = Number(process.env.HEARTBEAT_INTERVAL || 2000);
const PORT = Number(process.env.PORT || 3000);

server.listen(PORT, () => {
  console.log("server listening on port", PORT);

  wss = new SocketServer({
    server,
    spam_duration,
    spam_reset,
    strikes,
    heartbeat_interval,
  });
});

process.on('SIGINT', () => {
  if (wss) wss.close();
  server.close();
  console.log("server closed");
});