import { MediaType } from "types/peer";
import { ControllerConfig, Events, ID } from "types";
import { 
  IncomingMessage,
  MessageType,
  NetworkMessage as SocketNetworkMessage,
  TargetMessage,
  TargetType as SocketTargetType,
  TargetType,
  WelcomeMessage,
} from "types/socket.message";
import { SignalMessage, SignalType } from "types/peer.message";

import { Reactor } from 'reactor';
import { Socket } from "socket";
import { Network } from "network";
import { printerror } from "utils/helper";

const reactor = new Reactor();
const defaultRTCConfiguration:RTCConfiguration = {
  iceServers: [
    {urls: ["stun:stun1.l.google.com:19302?transport=udp", "iphone-stun.strato-iphone.de:3478?transport=udp"]}
  ],
}

export class Controller {
  private mystreams: Map<string, MediaStream>;
  private socket: Socket;
  private config: ControllerConfig;
  private id?: ID;
  private printerror = printerror("controller");
  public network?: Network;

  constructor(config: ControllerConfig) {
    this.config = config;
    this.mystreams = new Map();

    if (!this.config.rtcConfiguration) {
      this.config.rtcConfiguration = defaultRTCConfiguration;
    }

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
    reactor.addEventListener(Events.Target, this.targetMessage.bind(this));
    reactor.addEventListener(Events.SocketRegisterACK, updateNetwork);
    reactor.addEventListener(Events.SocketUpdateACK, updateNetwork);
    reactor.addEventListener(Events.SocketConnectionACK, this.connected.bind(this));
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
          this.printerror('unsupported-media', type);
          return;
      }

      if (stream) this.mystreams.set(type, stream);
    }
    catch (error) {
      this.printerror('media-rejected', error);
    }
  }

  // event functions 
  private addPeer() {
    console.log('adding a new peer');
  }
  private updateNetwork(message: SocketNetworkMessage) {
    if (this.network) {
      this.network.update(message.network);
      // TODO convay this to the rest
    }
    else {
      this.printerror("network-update", "no network found", message.network);
    } 
  }
  private targetMessage (message: TargetMessage) {
    if (message.target !== this.id) {
      // forward to someone else (or target : based on Topology)
      if (this.network) {
        const target = this.network.forward(message.target);
        // TODO 
      }
      else {
        this.printerror("forward-message", "no network", message.target);
      }

      return;
    }
    switch (message.targetType) {
      case SocketTargetType.Join: {
        // we got a request from another socket that they want to join our network
        if (this.network) {
          if (!this.network.accept(message.target)) {
            this.socket.send({
              type: MessageType.Target,
              targetType: TargetType.Reject,
              target: message.sender,
              sender: this.id,
            } as TargetMessage)
          }
        }
        else {
          this.printerror("network-join", "no network", message.target);
        }
      }
      case SocketTargetType.Reject: {
        this.printerror("join-request", "got rejected");
      }
      case SocketTargetType.Signal: {
        const { signal } = message as SignalMessage;
        if (signal === SignalType.offer) {
          // create a new peer
        }
      }
    }
  }
  private connected (message: WelcomeMessage) {
    const { id } = message;
    this.id = id;
  }
}