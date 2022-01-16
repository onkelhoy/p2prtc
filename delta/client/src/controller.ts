import { MediaType } from "types/peer";
import { ControllerConfig, Events, ID } from "types";
import { 
  IncomingMessage,
  Message,
  MessageType,
  NetworkMessage,
  NetworkMessage as SocketNetworkMessage,
  OutgoingMessageType,
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
import { NetworkInfo } from "types/network";
import { Peer } from "peer";

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
  private peers: Set<Peer>;

  public network?: Network;

  constructor(config: ControllerConfig) {
    this.config = config;
    this.mystreams = new Map();
    this.peers = new Set();

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
    reactor.addEventListener(Events.NewPeer, this.addPeer.bind(this));
    reactor.addEventListener(Events.Target, this.targetMessage.bind(this));
    reactor.addEventListener(Events.SocketRegisterACK, this.createNetwork.bind(this));
    reactor.addEventListener(Events.SocketUpdateACK, this.updateNetwork.bind(this));
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
      this.printerror('media-gathering', error);
    }
  }

  public register(network: NetworkInfo) {
    this.socket.send({
      type: OutgoingMessageType.Register,
      network,
    } as Message);
  }

  public join(network: ID, config: any) {

  }

  // event functions 
  private addPeer(message: TargetMessage, offer?: RTCSessionDescriptionInit) {
    console.log('Adding a new peer!!');
    // this.peers.add(new Peer({
    //   id: message.sender,
    //   rtcConfiguration: this.config.rtcConfiguration as RTCConfiguration,
    //   offer,
    // }));
  }
  private updateNetwork (message: SocketNetworkMessage) {
    if (this.network) {
      this.network.update(message.network);

      // TODO implement a smart flooding system
      // if (this.network.info.id === this.id) {
      //   // TODO convay this to the rest
      // }
    }
    else {
      this.printerror("network-update", "no network found", message.network);
    } 
  }
  private createNetwork (message: SocketNetworkMessage) {
    if (this.network) {
      this.printerror("network-crate", "already have network");
    }
    else {
      this.network = new Network(message.network);
    }
  } 
  private targetMessage (message: TargetMessage) {
    if (message.target !== this.id) {
      // forward to someone else (or target : based on Topology)
      if (this.network) {
        this.network.forward(message.target);
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
          else {
            // we are connecting them
            this.addPeer(message); 
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
        const { signal, data } = message as SignalMessage;
        if (signal === SignalType.offer) {
          // we got contacted by someone
          this.addPeer(message, data as RTCSessionDescriptionInit);
        }
      }
    }
  }
  private connected (message: WelcomeMessage) {
    const { id } = message;
    this.id = id;
  }
}