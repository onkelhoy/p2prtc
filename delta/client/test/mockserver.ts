import http from 'http';
import ws from 'ws';
import { IncomingMessageType, Message, MessageType, NetworkMessage, OutgoingMessage, OutgoingMessageType, TargetMessage } from 'types/socket.message';
import { NetworkInfo } from 'types/network';
import { ID } from 'types';

let server: http.Server;
let wss: ws.WebSocketServer;
let id = 0;
const hosts = new Map<ID, NetworkInfo>();
const sockets = new Map<ID, Socket>();

interface Socket extends ws.WebSocket {
  id: ID;
}

export function setup (port:number) {
  server = http.createServer();
  wss = new ws.WebSocketServer({ server });

  wss.on('connection', connected)

  server.listen(port);
}

export function teardown () {
  id = 0;
  wss.close();
  server.close();
  hosts.clear();
  sockets.clear();
}

function connected (socket: Socket) {
  socket.id = id.toString();
  id++;

  sockets.set(socket.id, socket);

  send(socket, {
    type: IncomingMessageType.ConnectionACK,
    id: socket.id,
  } as Message);

  socket.onmessage = function (strmessage) {
    const message = JSON.parse(strmessage.data as string) as Message; 
    switch (message.type) {
      case MessageType.Target: {
        const { target } = message as TargetMessage;
        const tsocket = sockets.get(target);
        if (tsocket) {
          send(tsocket, message);
        }
        else {
          send(socket, {
            type: IncomingMessageType.Error,
            error: 'Target not found',
          } as Message);
        }
        break;
      }
      case OutgoingMessageType.Update: 
      case OutgoingMessageType.Register: {
        const network = { ...(message as NetworkMessage).network, id: socket.id };
        hosts.set(socket.id, network);

        send(socket, { 
          type: message.type === OutgoingMessageType.Register ? IncomingMessageType.RegisterACK : IncomingMessageType.UpdateACK,
          network: hosts.get(socket.id),
        } as NetworkMessage);
        break;
      }
    }
  }
}

function send(socket: Socket, message: Message) {
  const strmessage = JSON.stringify(message);

  socket.send(strmessage);
}