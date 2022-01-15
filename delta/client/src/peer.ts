import { Reactor } from "reactor";
import { Events, ID } from "types";
import { MediaType, PeerType } from "types/peer";
import { SignalData, SignalMessage, SignalType } from "types/peer.message";
import { MessageType, TargetMessage, TargetType } from "types/socket.message";

const defaultConfiguration:RTCConfiguration = {
  iceServers: [
    {urls: ["stun:stun1.l.google.com:19302?transport=udp", "iphone-stun.strato-iphone.de:3478?transport=udp"]}
  ],
}

const reactor = new Reactor();

export class Peer {
  private id: ID;
  private type: PeerType;
  private connection!: RTCPeerConnection;
  private icestate: IceState;
  private first = true;
  
  constructor(target: ID, type: PeerType, configuration: RTCConfiguration = defaultConfiguration) {
    this.id = target;
    this.type = type;

    this.setup(configuration);

    if (type === "calling") {
      // create an offer
      this.createOffer();
    }
    else 
    {
      // create an answer
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

  private async createOffer() {
    try {
      let options:RTCOfferOptions | undefined  = undefined;
      if (!this.first) options = { iceRestart: true };
      const offer = await this.connection.createOffer(options);
      await this.connection.setLocalDescription(offer);

      this.signal(SignalType.offer, offer);
    }
    catch (e) {
      this.printerror("offer", e);
    }
  }

  private async createAnswer() {
    try {

    }
    catch (e) {
      this.printerror("answer", e);
    }
  }

  private signal(type: SignalType, data: SignalData) {
    reactor.dispatch(Events.Target, {
      type: MessageType.Target,
      target: this.id,
      targetType: TargetType.Signal,
      data,
    } as SignalMessage);
  }

  public onSignal(message: SignalMessage) {
    switch (message.signal) {
      case SignalType.candidate: {

        break;
      }
      case SignalType.offer: {

        break;
      }
      case SignalType.answer: {

        break;
      }
    }
  }
}