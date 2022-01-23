// events
import { JoinMessage, TargetMessage, TargetType } from "types/socket.message";
import { NetworkInfo, RouterInfo } from "types/network";
import { Events, ID, UserInfo } from "types";

// utils
import { Reactor } from "utils/reactor";
import { Global } from "utils/global";
import { print } from "utils/helper";

const reactor = new Reactor();
export class Network {
  private router: Map<ID, RouterInfo>;
  private log = print("network");

  constructor() {
    this.router = new Map();
    reactor.on(Events.NetworkUpdate, this.update);
    reactor.on(Events.PeerAdd, this.newpeer);
    reactor.on(Events.PeerDelete, this.removepeer);
  }

  private update = (info: NetworkInfo) => {
    Global.network = info;
    if (["info", "debug"].includes(Global.logger)) this.log("update", Global.network);
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

  private get password () {
    return Global.network?.password;
  }

  get registered () {
    return Global.network !== undefined;
  }


  forward (message: TargetMessage):ID {
    return Global.network?.id as ID; // base
  }

  connect (message: TargetMessage) {

  }

  join (message: JoinMessage) {
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