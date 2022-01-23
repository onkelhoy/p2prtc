// events
import { JoinMessage, MessageType, TargetMessage, TargetType } from "types/socket.message";
import { NetworkInfo, RouterInfo } from "types/network";
import { Events, ID, UserInfo } from "types";

// utils
import { Reactor } from "utils/reactor";
import { Global } from "utils/global";
import { print } from "utils/helper";
import { SystemType } from "types/peer.message";

const reactor = new Reactor();
export class Network {
  private router: Map<ID, RouterInfo>;
  private log = print("network");

  constructor() {
    this.router = new Map();
    reactor.on(Events.NetworkUpdate, this.update);
    reactor.on(Events.PeerConnectionOpen, this.newpeer);
    reactor.on(Events.PeerDelete, this.removepeer);
  }

  private update = (info: NetworkInfo) => {
    Global.network = info;
    if (["info", "debug"].includes(Global.logger)) this.log("update", Global.network);
  }

  private newpeer = (peer: UserInfo) => {
    this.router.set(peer.id, {
      connection: [Global.user.id],
      type: peer.type,
    });

    // make sure this new peer gets our connection to establish a mesh network
    
    // NOTE this will cause them to later send your id to others
    this.router.forEach((_info, id) => {
      // NOTE this means when disconnect we need to remove all references - dont like this
      if (id !== peer.id) {
        // this.router.set(id, { 
        //   ...info,
        //   connection: [...info.connection, peer.id]
        // });

        reactor.dispatch(`peer-${id}-system-send`, {
          type: SystemType.Connect,
          target: peer.id,
        });
      }
    });
  }

  private removepeer = (peer: ID) => {
    this.router.delete(peer);
  }

  private get password () {
    return Global.network?.password;
  }

  get registered () {
    return Global.network !== undefined;
  }


  forward (message: TargetMessage):ID|undefined {
    const target = this.router.get(message.target);
    if (target) return message.target;

    // NOTE check if we can be connected to this target via another peer ?

    if (Global.user.id === Global.network?.host) {
      return undefined;
    }
    else {
      // right now we just fallback to host
      return Global.network?.host;
    }
  }

  connect (message: TargetMessage) {
    // NOTE we now have the power to determine who in our network should connect to this peer
    // for now it will always be us 

    reactor.dispatch(Events.PeerAdd, message);
  }

  join (message: JoinMessage) {
    if (this.router.has(message.target)) {
      if (["info", "debug"].includes(Global.logger)) this.log("join", "we already have the connection");
      return;
    }

    const { config } = message;
    const pass = this.password;

    if (!pass || pass === config?.password) {
      this.connect(message as TargetMessage);
    }
    else {
      reactor.dispatch(Events.SendTarget, {
        targetType: TargetType.Reject,
        target: message.sender,
      });
    }
  }
}