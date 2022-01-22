// types
import { ControllerConfig, Events, ID, SparseUserInfo, UIEvents, UserInfo } from "types";
import { 
  JoinMessage,
  Message,
  MessageType,
  NetworkMessage as SocketNetworkMessage,
  OutgoingMessageType,
  TargetMessage,
  TargetMessageSparse,
  TargetType,
  WelcomeMessage,
} from "types/socket.message";
import { SignalMessage, SignalType } from "types/peer.message";
import { NetworkInfo, PartialNetworkInfo } from "types/network";

// utils
import { print } from "utils/helper";
import { Reactor } from 'utils/reactor';

// modules
import { Socket } from "socket";
import { Network } from "network";
import { Peer } from "peer";
import { Global } from "global";
import { Medium } from "medium";

const reactor = new Reactor();

export class Controller {
  private socket: Socket;
  private printerror = print("controller", "error");
  private log = print("controller");
  private peers: Map<ID, Peer>;
  private config: ControllerConfig;
  public medium: Medium;
  public network?: Network;

  constructor(config: ControllerConfig) {
    Global.logger = config.logger||'none';
    Global.user = (config.user || {}) as UserInfo;
    this.peers = new Map();
    this.medium = new Medium();
    this.config = config;

    this.eventsetup();
    // after event setup
    this.socket = new Socket(
      config.socket.url, 
      config.socket.protocols, 
    );
  }

  public get UserInfo () {
    return Global.user;
  }

  public set UserInfo (info: SparseUserInfo) {
    Global.user = { ...Global.user, ...info };
    if (["info", "debug"].includes(Global.logger)) this.log("userinfo", Global.user);
  }

  private eventsetup() {
    // add all events 
    reactor.on(Events.SendTarget, this.sendTargetMessage.bind(this));
    reactor.on(Events.Target, this.onTargetMessage.bind(this));
    reactor.on(Events.SocketConnectionACK, this.socketwelcome.bind(this));
    // network
    reactor.on(Events.SocketRegisterACK, this.createNetwork.bind(this));
    reactor.on(Events.NetworkUpdate, this.updateNetwork);
    reactor.on(Events.SocketUpdateACK, (message:SocketNetworkMessage) => this.updateNetwork(message.network));
    reactor.on(Events.PeerConnectionOpen, this.onPeerConnection);
    reactor.on(Events.ForwardMessage, this.forward.bind(this));
    // peer
    reactor.on(Events.PeerDelete, this.removePeer);
  }

  // exposed api for windows
  public register(network: PartialNetworkInfo) {
    if (["info", "debug"].includes(Global.logger)) this.log('register', network);
    this.socket.send({
      type: OutgoingMessageType.Register,
      network,
    } as Message);
  }
  public join(network: ID, config?: any) {
    this.sendTargetMessage({
      target: network,
      targetType: TargetType.Join, 
      config,
    });
  }
  public broadcast(channel:string, message:string) {
    this.peers.forEach(p => p.send(channel, message));
  }
  public send(channel:string, target:ID, message:string):boolean {
    const p = this.peers.get(target);

    if (!p) {
      if (["warning", "debug"].includes(Global.logger)) this.printerror("send", "peer not found");
      return false;
    }

    return p.send(channel, message);
  }
  public onDataMessage(channel:string, callback:(data:{id:ID, message:string})=>void) {
    reactor.on(`${Events.PeerMessage}-${channel}`, callback);
  }

  public on(event:UIEvents, callback:Function) {
    reactor.on(event, callback);
  }

  // event functions 
  private addPeer(message: TargetMessage, offer?: RTCSessionDescriptionInit) {
    if (["info", "debug"].includes(Global.logger)) this.log('peer', 'adding');
    if (this.config.testing?.peers === false) {
      return;
    }

    this.peers.set(message.sender, new Peer({
      id: message.sender,
      rtcConfiguration: this.config.rtcConfiguration as RTCConfiguration,
      offer,
      streams: this.medium.streams,
      channels: this.medium.channels,
      user: (message as SignalMessage).user
    }));
  }
  private removePeer = (peer: ID) => {
    if (["info", "debug"].includes(Global.logger)) this.log('peer', 'removed', peer);
    reactor.dispatch(UIEvents.PeerDelete, peer);
    this.peers.delete(peer);
    this.network?.disconnected(peer);
  }
  private onPeerConnection = (id:ID) => {
    this.network?.join(id);

    if (Global.user.id !== Global.network?.id) {
      this.socket.close();
    }
    else {
      // we are the host so send our network info to socket 
      const p = this.peers.get(id);
      if (p) {
        p.systemSend({
          type: MessageType.Target,
          targetType: TargetType.Network,
          sender: Global.user.id,
          target: id,
          network: Global.network,
        });

        // we should also make them connect to our other peers
      }
    }
  }
  private updateNetwork = (info: NetworkInfo) => {
    if (this.network) {
      this.network.update(info);
    }
    else {
      if (["error", "warning", "debug"].includes(Global.logger)) this.printerror("network-update", "no network found", info);
    } 
  }
  private createNetwork (message: SocketNetworkMessage) {
    if (this.network) {
      if (["error", "warning", "debug"].includes(Global.logger)) this.printerror("network-crate", "already have network");
    }
    else {
      this.network = new Network(message.network);
      this.medium.add("data", { label: "system" }); // standard data-channel
    }
  }
  private sendTargetMessage (sparsemessage: TargetMessageSparse) {

    let message:TargetMessage;
    
    if (sparsemessage.type && sparsemessage.sender) {
      // its just a forward 
      message = sparsemessage as TargetMessage;
    }
    else {
      message = { 
        ...sparsemessage, 
        sender: Global.user.id,
        type: MessageType.Target,
      };
    }

    if (["debug"].includes(Global.logger)) this.log("send-target-message", message);
    
    this.forward(message);
  }
  private forward(message: TargetMessage) {
    if (this.network) {
      const forward = this.network.forward(message.target);
      if (forward !== null) {
        const p = this.peers.get(forward);
        if (!p) {
          if (Global.logger !== "none") this.printerror("forward-target", "peer-not-found", forward);
        }
        else {
          p.systemSend(message);
          return;
        }
      } 
    }
    // network or forward is null : thus socket transport
    if (this.socket.status === WebSocket.OPEN) this.socket.send(message);
    else if (Global.logger !== "none") this.printerror("forward", "no socket connection");
  }
  private onTargetMessage (message: TargetMessage) {
    if (["debug"].includes(Global.logger)) this.log("on-target-message", message);
    if (message.target !== Global.user.id) {
      // forward to someone else (or target : based on Topology)
      if (this.network) {
        this.forward(message);
      }
      else {
        if (["error", "warning", "debug"].includes(Global.logger)) this.printerror("forward-message", "no network", message.target);
      }

      return;
    }
    switch (message.targetType) {
      case TargetType.Join: {
        // we got a request from another socket that they want to join our network
        if (this.network) {
          if (!this.network.accept(message as JoinMessage)) {
            this.sendTargetMessage({
              targetType: TargetType.Reject,
              target: message.sender,
            });
          }
          else {
            // we are connecting to them (by creating an offer)
            // TODO we should network decide who this peer should join
            this.addPeer(message); 
          }
        }
        else {
          if (["warning", "debug"].includes(Global.logger)) this.printerror("network-join", "no network", message.target);
        }
        break;
      }
      case TargetType.Reject: {
        if (["warning", "info", "debug"].includes(Global.logger)) this.log("join-request", "we got rejected");
        break;
      }
      case TargetType.Signal: {
        const { signal, data, user } = message as SignalMessage;
        if (signal === SignalType.offer) {
          // we got contacted by someone
          this.addPeer(message, data as RTCSessionDescriptionInit);
        }
        else {
          reactor.dispatch(`peer-${message.sender}-${signal}`, { data, user });
        }
        break;
      }
      case TargetType.Network: { 
        this.network = new Network(message.network);
        // as this is comming from host (we add him to our network)
        this.network.join(message.sender);
        if (["info", "debug"].includes(Global.logger)) this.log("network-set", message.network);
        break;
      }
      default: {
        if (["warning", "debug"].includes(Global.logger))  this.printerror("target-message", "unsupported type", message.targetType);
        break;
      }
    }
  }
  private socketwelcome (message: WelcomeMessage) {
    const { id } = message;
    Global.user = { ...Global.user, id };
    if (["info", "debug"].includes(Global.logger)) this.log('welcome-id', id);
  }
}