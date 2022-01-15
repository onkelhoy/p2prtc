import { IncomingMessageType, MessageType, Message, NetworkMessage, OutgoingMessage } from 'types/socket.message';
import { Reactor } from 'reactor';

const MAX_ATTEMPTS = 10;
const RECONNECT_TIME_INTERVAL_STEP = 700; // with attempt=10 => 1400 (total time = 10850)
const reactor = new Reactor();

export class Socket {
  private ws!: WebSocket;
  private attempts: number;
  private offline: OutgoingMessage[];
  private protocols?: string | string[];
  private url: string | URL;

  constructor(url: string | URL, protocols?: string | string[]) {
    this.attempts = 0;
    this.offline = [];
    this.protocols = protocols;
    this.url = url;

    this.setup();
  }

  get OfflineCount () { return this.offline.length; }
  get Status () { return this.ws.readyState; }

  // private methods
  private setup() {
    this.close(); // logs out socket if exists

    this.ws = new window.WebSocket(this.url, this.protocols);
    this.ws.onmessage = this.message;
    this.ws.onerror = this.error;
    this.ws.onopen = this.open;
  }

  private message = (msg:MessageEvent) => {
    if (typeof msg.data === "string") {
      const message: Message = JSON.parse(msg.data);

      switch (message.type) {
        default: {
          // target, update-ack, register-ack
          reactor.dispatch(message.type, message);
          break;
        }
        case IncomingMessageType.Error: {
          // this.printerror(message.error);
          break;
        }
      }
      
    }
  }

  private error = (ev: Event) => {
    if (![WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)) {
      if (this.attempts < MAX_ATTEMPTS) {
        this.attempts++;
        setTimeout(() => {
          this.setup();
        }, (Math.sign(this.attempts) + (this.attempts / MAX_ATTEMPTS)) * RECONNECT_TIME_INTERVAL_STEP)
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
        this.send(message); // will send the rest
        return;
      }
    }
  }

  // public methods
  public reconnect() {
    this.attempts = 0;
    this.setup();
  }
   
  public send(message: OutgoingMessage) {
    const msg = JSON.stringify(message);
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
      while (this.offline.length > 0) {
        const message = this.offline.pop();
        if (message) this.send(message);
      }
      return true;
    }
    
    this.offline.push(message);
    return false;
  }

  public close() {
    if (!this.ws) return;

    // remove events
    this.ws.onerror = null;
    this.ws.onmessage = null;
    this.ws.onopen = null;

    this.terminate();
  }

  public terminate(test?: boolean) {
    if (!this.ws) return;
    if (!test) this.attempts = MAX_ATTEMPTS;
    this.ws.close();
  }
}