import WebSocket, { WebSocketServer } from 'ws';
import http from "http";

import { 
  ISocket, 
  UserStatus,
  MessageType, 
  SocketLoginMessage, 
  SocketMessage, 
  SocketRegisterMessage, 
  SocketTargetMessage, 
  IRoom
} from './utils/types'


let wss: WebSocketServer;
const DURATION = 100;
const MAXSTRIKES = 3;

const rooms = new Map<string, IRoom>();

export function InitSocketServer (server: http.Server) {
  wss = new WebSocketServer({ server });
  // wss.clients
  wss.on("connection", (socket: ISocket) => {
    socket.lastmessage = 0;
    socket.strike = 0;

    socket.onclose = (event: WebSocket.CloseEvent) => onclose(socket, event);
    socket.onmessage = (event: WebSocket.MessageEvent) => onmessage(socket, event);
  });
}

async function spamcheck (socket: ISocket) {
  if (socket.system?.status === UserStatus.banned) throw new Error(`user ${socket.system._id} is banned`);
  if (socket.lastmessage) {
    if (performance.now() - socket.lastmessage < DURATION) {
      // user sent message before duration time has passed, user should have MAXSTRIKES strikes and then banned
      if (socket.strike >= MAXSTRIKES) {
        // ban user 

        // await database.ban()

        throw new Error(`banning user ${socket.system._id} due to spam`);
      }
      socket.strike++;
    } 
  }

  socket.lastmessage = performance.now();
}

function authcheck (socket: ISocket): boolean {

}

async function onmessage (socket: ISocket, event: WebSocket.MessageEvent) {
  try {
    await spamcheck(socket);

    const message: SocketMessage = JSON.parse(event.data as string);
   
  
    switch (message.type) {
      case MessageType.Login: 
        handlelogin(socket, message as SocketLoginMessage);
        break;
      case MessageType.Register:
        handleregister(socket, message as SocketRegisterMessage);
        break;
      case MessageType.Target: // from socket to socket
        handletarget(socket, message as SocketTargetMessage);
        break;
    } 
  }
  catch (e) {
    console.log('error');
  }
} 

function onclose (socket: ISocket, event: WebSocket.CloseEvent) {

} 

// event functions 
function handlelogin (socket: ISocket, message: SocketLoginMessage) {
  // 1 query database 
  // 2 asign public and system info on socket
  // 3 
  // 4 respond with user
}

function handleregister (socket: ISocket, message: SocketRegisterMessage) {

}

function handletarget (socket: ISocket, message: SocketTargetMessage) {
  const { target } = message;
}

// helper functions 

function send(socket: ISocket, message: SocketMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    const stringmessage = JSON.stringify(message);
    socket.send(stringmessage);
  }
}

function broadcast(message: SocketMessage): void {
  if (wss) {
    const stringmessage = JSON.stringify(message);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(stringmessage)
    });
  }
}