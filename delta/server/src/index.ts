// TODO handle-upgrade needs to assign id + info to sockets 
import http from 'http';
import * as dotenv from "dotenv";
import { SocketServer } from 'socket';
import { app } from 'server';

dotenv.config();

// CONSTANTS
const spam_duration = Number(process.env.SPAM_DURATION || 200);
const spam_reset = Number(process.env.SPAM_RESET || 1500);
const strikes = Number(process.env.MAX_STRIKES || 3);
const heartbeat_interval = Number(process.env.HEARTBEAT_INTERVAL || 2000);
const PORT = Number(process.env.PORT || 3000);

let id = 0;
const server = http.createServer();
const wss = new SocketServer({
  server,
  spam_duration,
  spam_reset,
  strikes,
  heartbeat_interval,
  setClientID: () => {
    id++;
    return id.toString();
  }
});

server.on("request", app(wss));

server.listen(PORT, () => {
  console.log("server listening on port", PORT);
});

process.on('SIGINT', () => {
  if (wss) wss.close();
  server.close();
  console.log("\nserver closed");

  process.exit(1);
});