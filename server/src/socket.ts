import ws from 'ws';
import http from 'http';

// import types
import { ID } from 'types';
import { Socket, Host, NetworkInfo } from 'types/socket';
import { IncomingMessage, IncomingMessageType, Message, MessageType, OutgoingMessage, OutgoingMessageType } from 'types/message';

export interface ServerOptions extends ws.ServerOptions {
  setClientID?(request: http.IncomingMessage): ID;
  heartbeat_interval?: number;
  spam_duration?: number;
  spam_reset?: number;
  strikes?: number;
}

export class SocketServer extends ws.WebSocketServer {
  private heartbeat_timer: NodeJS.Timer;

  public sockets!: Map<ID, Socket>;
  public hosts!: Map<ID, Host>;
  public options!: ServerOptions;

  constructor(options: ServerOptions, callback?: (() => void) | undefined) {
    super(options, callback);
    this.sockets = new Map();
    this.hosts = new Map();

    this.on('connection', (socket: Socket, request) => {
      this.welcome(socket, request);
  
      socket.onmessage = this.onclientmessage();
      socket.onclose = this.onclientclose();
      socket.on("pong", function () {
        socket.is_alive = true;
      })
    });
    
    this.on("error", (err) => {
      this.printerror(err.message);
    });

    // heartbeat
    this.heartbeat_timer = setInterval(() => {
      this.clients.forEach(wssocket => {
        const socket = wssocket as Socket;
        if (!socket.is_alive) {
          socket.close();
        }
        else {
          socket.is_alive = false;
          socket.ping();
        }
      });
    }, this.options.heartbeat_interval || 2000);
  }

  private onclientmessage() {
    const wss = this;
    return function (this: Socket, event: ws.MessageEvent) {
      if (wss.spamcheck(this)) {
        wss.printerror(`socket ${this.id} is spamming server`);
        this.close();
        return;
      }
    
      try {
        const message = JSON.parse(event.data as string) as Message;
        switch (message.type) {
          case MessageType.Target: {
            wss.send(this, message)
            break;
          }
        }
      }
      catch (error) {
        // NOTE this most likely failed at parse level
        wss.send(this, {
          type: OutgoingMessageType.Error,
          error: 'unsupported message got'
        } as OutgoingMessage);
      }
    }
  }
  private onclientclose() {
    const wss = this;
    return function(this: Socket) {
      wss.sockets.delete(this.id);

      if (wss.hosts.has(this.id)) {
        wss.hosts.delete(this.id);

        wss.broadcast({
          type: OutgoingMessageType.Deleted,
          network: this.id,
        } as OutgoingMessage);
      }
    }
  }

  private welcome(socket: Socket, request: http.IncomingMessage) {
    const networks: NetworkInfo[] = [];
    this.hosts.forEach(host => networks.push(host.network));
    
    socket.is_alive = true;
    socket.id = this.getID(request); 
    socket.strike = 0;
    // NOTE duplicate id will be replaced

    this.sockets.set(socket.id, socket);
    // send all available rooms
    this.send(socket, {
      type: OutgoingMessageType.Welcome,
      networks,
    } as OutgoingMessage);
  }
  private spamcheck(socket: Socket):boolean {
    const maxstrikes = (this.options.strikes || 5);
    if (socket.lastmessage) {
      const duration = performance.now() - socket.lastmessage;
      if (duration < (this.options.spam_duration || 200)) {
        // user sent message before duration time has passed, user should have MAXSTRIKES strikes and then banned
        socket.strike++;
      }
      else if (socket.strike < maxstrikes && duration >= (this.options.spam_reset || 1500)) {
        socket.strike = 0;
      }
    }
  
    socket.lastmessage = performance.now();
    return socket.strike >= maxstrikes;
  }
  private printerror(error:string) {
    console.log(
      "socket server error",
      performance.now(),
      error,
    );
  }
  private getID(req: http.IncomingMessage): ID {
    if (this.options.setClientID) 
      return this.options.setClientID(req);

    return `${req.headers['user-agent']} ${req.socket.remoteAddress}`;
  }

  public send(target: Socket, message: OutgoingMessage): void {
    const strmessage = JSON.stringify(message);
    target.send(strmessage);
  }
  public broadcast(message: OutgoingMessage): void {
    const strmessage = JSON.stringify(message);
    this.sockets.forEach(socket => {
      // we dont need to send update to host clients
      if (!this.hosts.has(socket.id)) {
        socket.send(strmessage)
      }
    });
  }
  public close() {
    for (const socket of this.clients) {
      socket.terminate();
    }
    super.close();
    clearInterval(this.heartbeat_timer);
  }
}