import { Reactor } from "reactor";
import { Events, ID, PrintErrorFunction } from "types";
import { PeerConfiguration, PeerType } from "types/peer";
import { SignalData, SignalMessage, SignalType } from "types/peer.message";
import { MessageType, TargetType } from "types/socket.message";
import { printerror, trycatch, tryuntil } from "utils/helper";

const reactor = new Reactor();

// NOTE good page for stun servers: 
// https://ourcodeworld.com/articles/read/1536/list-of-free-functional-public-stun-servers-2021
// TODO add propper documentation
export class Peer {
  private id: ID;
  private type: PeerType;
  private connection!: RTCPeerConnection;
  private printerror: PrintErrorFunction;
  
  constructor(config: PeerConfiguration) {
    this.id = config.id;
    this.type = config.offer ? "receiving" : "calling";
    this.printerror = printerror(`PEER#${this.id}`);

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
    // NOTE this will handle reconnection and trigger offer with iceRestart as option
    this.connection.oniceconnectionstatechange = () => {
      if (this.connection.iceConnectionState === "failed" && this.type === "calling") {
        this.createOffer(false);
      }
    }
  }

  private createOffer(first = true) {
    tryuntil("create-offer", async () => {
      let options:RTCOfferOptions | undefined  = undefined;
      if (!first) options = { iceRestart: true };
      const offer = await this.connection.createOffer(options);
      await this.connection.setLocalDescription(offer);

      this.signal(SignalType.offer, offer);
    }, 3, this.printerror);
  }

  private createAnswer(offer: RTCSessionDescriptionInit) {
    tryuntil("create-answer", async () => {
      this.connection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.connection.createAnswer();
      this.signal(SignalType.answer, answer);
    }, 3, this.printerror);
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
    const { signal, data } = message
    switch (signal) {
      case SignalType.candidate: {
        tryuntil("signal-candidate", async () => {
          await this.connection.addIceCandidate(data as RTCIceCandidate);
        }, 3, this.printerror);
        break;
      }
      case SignalType.answer: {
        trycatch("signal-answer", async () => {
          const remoteDesc = new RTCSessionDescription(data as RTCSessionDescriptionInit);
          await this.connection.setRemoteDescription(remoteDesc);
        }, this.printerror);
        break;
      }
      default: 
        this.printerror("signaling", `incorrect signaling type::${signal}`);
    }
  }
}