import http from 'http';
import { SocketMessage } from 'types/socket';

import {┬áSocketServer } from '../../server/src/socket';

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

export function broadcast(message: SocketMessage) {
  wss.broadcast(message);
}