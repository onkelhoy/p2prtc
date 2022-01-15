import { Reactor } from "reactor";
import { Events, ID } from "types";
import { PeerConfiguration, PeerType } from "types/peer";
import { SignalData, SignalMessage, SignalType } from "types/peer.message";
import { MessageType, TargetType } from "types/socket.message";


const reactor = new Reactor();

export class Peer {
  private id: ID;
  private type: PeerType;
  private connection!: RTCPeerConnection;
  private first = true;
  
  constructor(config: PeerConfiguration) {
    this.id = config.id;
    this.type = config.offer ? "receiving" : "calling";

    this.setup(config.rtcConfiguration);

    if (this.type === "calling") {
      // create an offer
      this.createOffer();
    }
    else 
    {
      // create an answer
      this.createAnswer(config.offer as RTCSessionDescriptionInit);
    }
  }

  private printerror(type: string, ...errors: any[]) {
    console.error(`PEER#${this.id} ${type}-error`, ...errors);
  }

  private setup (configuration: RTCConfiguration) {
    this.connection = new RTCPeerConnection(configuration);
    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        // transport this message to corresponding peer
        this.signal(SignalType.candidate, event.candidate);
      }
    }
    this.connection.onicecandidateerror = (event) => {
      this.printerror("candidate", event);
    }
  }

  private createOffer() {
    this.tryuntil("create-offer", async () => {
      let options:RTCOfferOptions | undefined  = undefined;
      if (!this.first) options = { iceRestart: true };
      const offer = await this.connection.createOffer(options);
      await this.connection.setLocalDescription(offer);

      this.signal(SignalType.offer, offer);
    }, 3);
  }

  private createAnswer(offer: RTCSessionDescriptionInit) {
    this.tryuntil("create-answer", async () => {
      this.connection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.connection.createAnswer();
      this.signal(SignalType.answer, answer);
    }, 3);
  }

  private signal(type: SignalType, data: SignalData) {
    reactor.dispatch(Events.Target, {
      type: MessageType.Target,
      target: this.id,
      targetType: TargetType.Signal,
      data,
    } as SignalMessage);
  }

  private async trycatch(type: string, func:Function) {
    try {
      await func();
      return null;
    }
    catch (e) {
      this.printerror(type, e);
      return e;
    }
  }

  private tryuntil(type: string, func:Function, tries: number, duration = 100) {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const failed = await this.trycatch(type, func);
      if (!failed || attempts > tries) {
        clearInterval(interval);
      }
    }, duration);
  }

  public onSignal(message: SignalMessage) {
    const { signal, data } = message
    switch (signal) {
      case SignalType.candidate: {
        this.tryuntil("signal-candidate", async () => {
          await this.connection.addIceCandidate(data as RTCIceCandidate);
        }, 3);
        break;
      }
      case SignalType.answer: {
        this.trycatch("signal-answer", async () => {
          const remoteDesc = new RTCSessionDescription(data as RTCSessionDescriptionInit);
          await this.connection.setRemoteDescription(remoteDesc);
        });
        break;
      }
      default: 
        this.printerror("signaling", `incorrect signaling type::${signal}`);
    }
  }
}