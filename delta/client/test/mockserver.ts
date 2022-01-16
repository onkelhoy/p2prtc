import http from 'http';
import { OutgoingMessage } from 'types/socket.message';

import { SocketServer } from '../../server/src/socket';

let server: http.Server;
let wss: SocketServer;

export function setup (port:number) {
  server = http.createServer();
  wss = new SocketServer({ server });

  server.listen(port);
}

export function teardown () {
  wss.close();
  server.close();
}

export function broadcast(message: OutgoingMessage) {
  wss.broadcast(message);
}