// types
import { ID } from 'types';
import { SignalMessage, SignalType } from 'types/peer.message';

// modules
import { Peer } from 'peer';
import { Reactor } from './reactor';
import { Global } from './global';
import { print } from "./helper";
import { Medium } from './medium';
import { TargetMessage } from 'types/socket.message';

// variables
const reactor = new Reactor();

export class PeerManager {
  private peers: Map<ID, Peer> = new Map();
  private log = print("peer-manager");
  private error = print("peer-manager", "error");
  private media = new Medium();
  private config?: RTCConfiguration;

  constructor(config?: RTCConfiguration) {
    this.config = config;
  }

  add(message: SignalMessage, offer?: RTCSessionDescriptionInit) {
    if (["info", "debug"].includes(Global.logger)) this.log('adding', message.sender);

    this.peers.set(message.sender, new Peer({
      id: message.sender,
      rtcConfiguration: this.config,
      offer,
      streams: this.media.streams,
      channels: this.media.channels,
    }));
  }

  remove (id: ID) {
    const p = this.peers.get(id);
    if (p) {
      if (["info", "debug"].includes(Global.logger)) this.log('removing', id);
      p.close();
      this.peers.delete(id);
    }
  }

  signal(message: SignalMessage) {
    const { signal, data } = message;
    if (signal === SignalType.offer) this.add(message, data as RTCSessionDescriptionInit);
    else {
      reactor.dispatch(`peer-${message.sender}-${signal}`, data);
    }
  }

  forward(message: TargetMessage, target:ID) {
    const p = this.peers.get(target);
    if (!p) {
      if (Global.logger !== "none") this.error("forward", "not found", target);
    }
    else {
      p.systemsend(message);
      return;
    }
  }

  send(channel:string, target:ID, message:string):boolean {
    const p = this.peers.get(target);
  
    if (!p) {
      if (["warning", "debug"].includes(Global.logger)) this.error("send", "peer not found");
      return false;
    }
  
    return p.send(channel, message);
  }

  broadcast(channel:string, message:string) {
    
  }
}