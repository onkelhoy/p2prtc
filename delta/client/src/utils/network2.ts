import { Global } from "utils/global";
import { Events, ID, UserInfo } from "types";
import { NetworkInfo, RouterInfo } from "types/network";
import { ForwardMessage } from "types/peer.message";
import { Reactor } from "utils/reactor";

const reactor = new Reactor();
export class Network {
  private router: Map<ID, RouterInfo>;

  constructor() {
    this.router = new Map();
    reactor.on(Events.NetworkUpdate, this.update);
    reactor.on(Events.PeerAdd, this.newpeer);
    reactor.on(Events.PeerDelete, this.removepeer);
  }

  private update = (info: NetworkInfo) => {
    Global.network = info;
  }

  private newpeer = (peer: UserInfo) => {
    this.router.set(peer.id, {
      connection: [Global.user.id]
    });
  }

  private removepeer = (peer: ID) => {
    this.router.delete(peer);
  }

  private findTarget(id:ID) {

  }

  forward (message: ForwardMessage) {
    message.connections.push(Global.user.id);
    const target = this.findTarget(message.target);
    
  }

}