import { ID } from "types";
import { NetworkInfo, RouterInfo } from "types/network";

export class Network {
  public info: NetworkInfo;
  private router: Map<ID, RouterInfo>;

  constructor(info: NetworkInfo) {
    this.info = info;
    this.router = new Map();
  }

  public update(info: NetworkInfo) {
    this.info = info;
  }

  public accept(id: ID):boolean {
    return true;
  }

  public forward(id: ID): ID {
    // NOTE this is where topology magic can take place
    return id;
  }

  public join(id: ID) {
    this.router.set(id, {});
  }
  public leave(id: ID) {
    this.router.delete(id);
  }
}
