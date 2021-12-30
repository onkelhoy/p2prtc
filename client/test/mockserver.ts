import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { ICredentials } from 'types';

export enum MessageType {
  Unothenticated = "unothenticated", // for testing purposes
  Authenticated = "authenticated",
  Unothorized = "unothorized", // server response

  Logout = "logout",
  Login = "login",
  LoginAnswer = "login-answer",
}

const LoginResponse = {
  success: { user: { score: 10, email: "foo" }, token: "banana" },
  unothenticated: { user: null },
}

export function createMockServer (server: http.Server ) {

  const wss = new WebSocketServer({ server });
  wss.on("connection", user => {
    user.onmessage = (event: WebSocket.MessageEvent) => onmessage(user, event);
  });
}

function onmessage(user: WebSocket, event: WebSocket.MessageEvent): void {
  if (typeof event.data === "string") {
    const msg = JSON.parse(event.data);

    if (![MessageType.Login, MessageType.Unothenticated].includes(msg.type as MessageType)) {
      send(user, MessageType.Unothorized, {});
    }
    else {
      switch (msg.type as MessageType) {
        case MessageType.Login: {
          const { email, password } = msg.credentials as ICredentials;
          if (email === "foo" && password === "bar") {
            send(user, MessageType.LoginAnswer, LoginResponse.success)
          }
          else send(user, MessageType.LoginAnswer, LoginResponse.unothenticated);
          break;
        }
        default: {
          send(user, msg.type, msg);
          break;
        }
      }
    }
  }
}

function send(user: WebSocket, type: MessageType, data: object) {
  const msg = JSON.stringify({ type, ...data });
  user.send(msg);
}