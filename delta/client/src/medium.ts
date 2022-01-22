import { DataChannelConfig, MediaConfig, MediaType } from "types/peer";
import { print } from "utils/helper";
import { Global } from 'global';
import { Reactor } from "utils/reactor";
import { Events } from "types";

const reactor = new Reactor();
export class Medium {
  private printerror = print("medium", "error");
  
  public streams: Map<Omit<MediaType, 'data'>, MediaStream>;
  public channels: Map<string, RTCDataChannelInit | undefined>;

  constructor() {
    this.streams = new Map();
    this.channels = new Map();
  }

  public async add(type: MediaType, config?: MediaConfig) {
    if (!Global.network) {
      // we dont have a network yet
      if (["warning", "debug"].includes(Global.logger)) this.printerror("add", "we have no network yet");
    }
    else if (Global.user.id !== Global.Host) {
      // we are not the host
      if (["warning", "debug"].includes(Global.logger)) this.printerror("add", "we are not the host");
    }
    
    try {
      let stream: MediaStream|undefined = undefined;

      switch (type) {
        case "audio": {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          break;
        }
        case "video": {
          stream = await navigator.mediaDevices.getUserMedia(config as MediaStreamConstraints | undefined);
          break;
        }
        case "screen": {
          stream = await navigator.mediaDevices.getDisplayMedia(config as DisplayMediaStreamConstraints | undefined)
          break;
        }
        case "data": {
          const { label, dataChannelDict } = config as DataChannelConfig; 
          if (!this.channels.has(label)) {
            this.channels.set(label, dataChannelDict);
            reactor.dispatch(Events.NewDataChannel, config);
          }
          else if (["warning", "debug"].includes(Global.logger)) this.printerror("data-channel", "dupplicate");
          return;
        }
        default: 
          if (["warning", "debug"].includes(Global.logger)) this.printerror('add-media', 'unssuported type:', type);
          return;
      }

      // NOTE this will ovveride current streams
      if (stream) this.streams.set(type, stream);
      reactor.dispatch(Events.NewStream, { type, stream });
    }
    catch (error) {
      if (["error", "debug"].includes(Global.logger))  this.printerror('add-media', error);
      throw error;
    }
  }

  public remove(type: MediaType, datalabel?:string) {
    if (type === "data") {
      if (!datalabel && ["warning", "debug"].includes(Global.logger)) this.printerror("remove-data-channel", "no label");
      this.channels.delete(datalabel as string);
    }
    else {
      this.streams.delete(type);
    }
  } 
}