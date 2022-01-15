import { MediaType } from "types/peer";
import { Reactor } from 'reactor';
import { ControllerConfig, Events, ID } from "types";
import { NetworkInfo } from "types/socket";
import { 
  IncomingMessageType as SocketIncomingMessageType, 
  MessageType as SocketMessageType, 
  NetworkMessage as SocketNetworkMessage,
  TargetMessage as SocketTargetMessage,
  TargetType as SocketTargetType,
} from "types/socket.message";
import { Socket } from "socket";

const reactor = new Reactor();

class Controller {
  private mystreams: Map<string, MediaStream>;
  private socket: Socket;
  private id?: ID;
  public network?: NetworkInfo;

  constructor(config: ControllerConfig) {
    this.mystreams = new Map();

    this.eventsetup();
    // after event setup
    this.socket = new Socket(config.socket.url, config.socket.protocols);
  }

  private eventsetup() {
    for (const type in Events) {
      reactor.register(type);
    }

    // add all events 
    const updateNetwork = this.updateNetwork.bind(this);
    reactor.addEventListener(Events.NewPeer, this.addPeer.bind(this));
    reactor.addEventListener(Events.SocketTarget, this.socketTarget.bind(this));
    reactor.addEventListener(Events.SocketRegisterACK, updateNetwork);
    reactor.addEventListener(Events.SocketUpdateACK, updateNetwork);
  }

  private printerror(...errors: any[]) {
    console.error('Client error -', ...errors);
  }

  public async addMedia(type: MediaType, config?: MediaStreamConstraints|DisplayMediaStreamConstraints) {
    try {
      let stream: MediaStream|undefined = undefined;

      switch (type) {
        case "audio": {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          break;
        }
        case "video": {
          stream = await navigator.mediaDevices.getUserMedia(config);
          break;
        }
        case "screen": {
          stream = await navigator.mediaDevices.getDisplayMedia(config)
          break;
        }
        default: 
          this.printerror(`Unsupported media::${type}`);
          return;
      }

      if (stream) this.mystreams.set(type, stream);
    }
    catch (error) {
      this.printerror(`Most likly media rejected`, error);
    }
  }

  // event functions 
  private addPeer() {
    console.log('adding a new peer');
  }
  private updateNetwork(message: SocketNetworkMessage) {
    this.network = message.network;
  }
  private socketTarget (message: SocketTargetMessage) {
    if (message.target !== this.id) {
      // forward to someone else (or target : based on Topology)
    }
    switch (message.targetType) {
      case SocketTargetType.Join: {
        // we got a request from another socket that they want to join our network
        if (this.network) {
          
        }
        else {

        }
      }
      case SocketTargetType.Reject: {

      }
      case SocketTargetType.Signal: {

      }
    }
  }
}