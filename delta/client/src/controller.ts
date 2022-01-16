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

import { Reactor } from 'utils/reactor';
import { Socket } from "socket";
import { Network } from "network";
import { print } from "utils/helper";
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
  private printerror = print("controller", "error");
  private log = print("controller");
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
    this.socket = new Socket(
      config.socket.url, 
      config.socket.protocols, 
      config.printinfo,
    );
  }

  private eventsetup() {
    for (const type of Object.values(Events)) {
      reactor.register(type);
    }

    // add all events 
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
    if (this.config.printinfo) this.log('register', network);
    this.socket.send({
      type: OutgoingMessageType.Register,
      network,
    } as Message);
  }

  public update(network: NetworkInfo) {
    // TODO tell server if host & connected
    // need to tell peers, (by calling network and let it deal with this logic)
  }

  public join(network: ID, config: any) {

  }

  // event functions 
  private addPeer(message: TargetMessage, offer?: RTCSessionDescriptionInit) {
    if (this.config.printinfo) this.log('peer', 'adding');
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
    if (this.config.printinfo) this.log('welcome-id', id);
  }
}