import { Global } from "global";
import { Events, ID, UIEvents } from "types";
import { NetworkInfo, PartialNetworkInfo, RouterInfo } from "types/network";
import { JoinMessage, TargetMessage } from "types/socket.message";
import { Reactor } from "utils/reactor";

const reactor = new Reactor();

export class Network {
  private router: Map<ID, RouterInfo>;

  constructor(info: NetworkInfo) {
    Global.network = info; // id is the host
    this.router = new Map();

    reactor.dispatch(UIEvents.Network, info);
  }

  private canjoin(id: ID): boolean {
    if (Global.user.id === id || this.router.has(id)) return false;
    return true;
  }

  public get size() {
    return this.router.size + 1; // + myself
  }

  public get Info () {
    return Global.network;
  }

  public get Host ():ID|undefined {
    return Global.network?.id;
  }

  public update(info: PartialNetworkInfo) {
    // TODO tell server if host & connected
    // need to tell peers, (by calling network and let it deal with this logic)
    Global.network = { ...info, id: Global.user.id };
    reactor.dispatch(UIEvents.Network, Global.network);
  }

  public accept(message: JoinMessage):boolean {
    if (!this.canjoin(message.sender)) return false;

    // TODO use the rest of info to determin if they can join etc...

    /** NOTE host could maybe ask peers to drop current connections and replace with others as network scales etc
     * then we should have a method to say: hey replace a with b and after signaling is done with b the they drop a connection
     * 
     * could notify the rest asking them if its okay etc
     */
    
    return true;
  }

  public connect(message: TargetMessage) {
    let connector = Global.user.id;
    // TODO figure out if we should connect or forward the connection 

    this.router.set(message.target, { 
      connection: [connector],
    });

    reactor.dispatch(Events.ForwardMessage, message);
  }

  public disconnected(peer: ID) {
    this.remove(peer);
    // should we ask others if they got removed also ?
    // if not maybe we should reconnect ?
  }

  public forward(id: ID): ID|null {
    // NOTE this is where topology magic can take place
    const t = this.router.get(id)
    if (t && t.connection.includes(Global.user.id)) return id;

    // NOTE figure out the best way to connect 
    const h = this.Host;
    if (h) {
      if (Global.user.id !== h) return h
    }

    // socket has to do it
    return null;
  }
  public remove(id: ID) {
    this.router.delete(id);
    // this should be left alone (not do what remove does) 
    // as this could be a order from host (for topology change)
  }
  public join(id: ID) { //
    this.router.set(id, { 
      connection: [Global.user.id], // this means we have direct-contact
    })
  }
}
