import { DoAndWait } from '../../utils/functions';
import { Reactor } from '../../utils/reactor';
import { IToken, SocketMessage, MessageType, SocketLoginMessage, ICredentials, IUser, SocketLoginResponse } from './types';

const reactor = new Reactor();
const MAX_ATTEMPTS = 10;
const DELAY = 12 * 1000;

export class Socket {
  private ws!: WebSocket;
  private attempts: number;
  private offline: SocketMessage[];
  token!: IToken;

  constructor(url:string) {
    this.attempts = 0;
    this.offline = [];
    this.init(url);
  }

  get OfflineCount () { return this.offline.length; }
  get Status () { return this.ws.readyState; }

  private init(url:string) {
    for (const value in MessageType) {
      if (isNaN(Number(value))) {
        continue;
      }

      if (["unothenticated", "authenticated", "unothorized"].includes(value)) {
        continue;
      }

      reactor.register(`socket-${value}`);
    }

    this.setup(url);
  }

  private setup(url:string) {
    this.Logout(); // logs out socket if exists

    this.ws = new window.WebSocket(url);
    this.ws.onmessage = this.message;
    this.ws.onerror = this.error;
    this.ws.onopen = this.open;
  }

  private message = (msg:MessageEvent) => {
    if (typeof msg.data === "string") {
      const socketmessage: SocketMessage = JSON.parse(msg.data);

      switch (socketmessage.type) {
        default: 
          reactor.disptatch(socketmessage.type, socketmessage);
          break;
        case MessageType.TESTAuthenticated:
        case MessageType.TESTUnothenticated:
          // do something that should not trigger event
          break;
      }
      
    }
  }

  private error = (ev: Event) => {
    if (![WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)) {
      if (this.attempts < MAX_ATTEMPTS) {
        this.attempts++;
        this.setup(this.ws.url);
      }
      else console.error(`[SOCKET ERROR] connection attempt maxed out: ${this.attempts}`);
    }
    else console.error("[SOCKET ERROR]", ev);
  }

  private open = () => {
    this.attempts = 0;
    while (this.offline.length > 0) {
      const message = this.offline.pop();
      if (message) {
        this.Send(message); // will send the rest
        return;
      }
    }
  }

  Reconnect(url?:string) {
    this.attempts = 0;
    if (!url && this.ws) {
      this.setup(this.ws.url);
    }
    else if (url) {
      this.setup(url);
    }
    else throw new Error("[SOCKET ERROR] - reconnect must pass a URL");
  }
   
  Send(message: SocketMessage) {
    const msg = JSON.stringify({ ...message, token: this.token });
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
      while (this.offline.length > 0) {
        const message = this.offline.pop();
        if (message) this.Send(message);
      }
      return true;
    }
    
    this.offline.push(message);
    return false;
  }

  Login(credentials: ICredentials): Promise<IUser> {
    return DoAndWait<IUser>(
      MessageType.LoginAnswer, 
      () => this.Send({ type: MessageType.Login, credentials } as SocketLoginMessage),
      (data: object, resolve, reject) => {
        const message = data as SocketLoginResponse;
        if (message.error) reject(message.error);
        else if (!message.user) reject("did not retrive user object");
        else if (!message.token) reject("did not receive token");
        else {
          this.token = message.token as IToken;
          resolve(message.user);
        }
      }
    ) 
  }

  Logout() {
    if (!this.ws) return;

    // remove events
    this.ws.onerror = null;
    this.ws.onmessage = null;
    this.ws.onopen = null;

    this.Send({ type: MessageType.Logout });
    this.Terminate();
  }

  Terminate(test?: boolean) {
    if (!this.ws) return;
    if (!test) this.attempts = MAX_ATTEMPTS;
    this.ws.close();
  }
}