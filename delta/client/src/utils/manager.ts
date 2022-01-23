// types
import { Events, ID } from 'types';
import { SignalMessage, SignalType } from 'types/peer.message';
import { DataChannelConfig, MediaType } from 'types/peer';
import { TargetMessage } from 'types/socket.message';

// modules
import { Peer } from 'peer';
import { Reactor } from './reactor';
import { Global } from './global';
import { print } from "./helper";
import { Medium } from './medium';
import { NetworkInfo } from 'types/network';

// variables
const reactor = new Reactor();

export class PeerManager {
  private peers: Map<ID, Peer> = new Map();
  private log = print("peer-manager");
  private error = print("peer-manager", "error");
  public media = new Medium();
  private config?: RTCConfiguration;

  constructor(config?: RTCConfiguration) {
    this.config = config;

    reactor.on(Events.PeerAdd, this.add);
    reactor.on(Events.NetworkUpdate, this.network);
  }

  private network = (info:NetworkInfo) => {
    if (info.host === Global.user.id) {
      if (!this.media.channels.has("system")) {
        const config: DataChannelConfig = {
          label: 'system',
        };
        this.media.add(MediaType.Data, config);
      }
    }
  }
  add = (message: SignalMessage) => {
    if (["info", "debug"].includes(Global.logger)) this.log('adding', message.sender);

    this.peers.set(message.sender, new Peer({
      id: message.sender,
      rtcConfiguration: this.config,
      offer: message.signal === SignalType.offer ? message.data as RTCSessionDescriptionInit : undefined,
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
    if (signal === SignalType.offer) this.add(message);
    else {
      reactor.dispatch(`peer-${message.sender}-${signal}`, data);
    }
  }

  forward(message: TargetMessage, target:ID) {
    const p = this.peers.get(target);
    if (!p) {
      if (Global.logger !== "none") this.error("forward", "not found", target);
      return;
    }

    p.systemsend(message);
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
    this.peers.forEach(p => {
      p.send(channel, message);
    });
  }
}