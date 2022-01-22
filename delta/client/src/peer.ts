import { Reactor } from "utils/reactor";
import { Events, ID, PrintFunction, UserInfo } from "types";
import { DataChannelConfig, PeerConfiguration, PeerType } from "types/peer";
import { SignalData, SignalMessage, SignalType } from "types/peer.message";
import { MessageType, TargetMessage, TargetMessageSparse, TargetType } from "types/socket.message";
import { print, trycatch, tryuntil } from "utils/helper";
import { Global } from "global";

const reactor = new Reactor();

// NOTE good page for stun servers: 
// https://ourcodeworld.com/articles/read/1536/list-of-free-functional-public-stun-servers-2021
// TODO add propper documentation
export class Peer {
  public id: ID;
  private type: PeerType;
  private connection!: RTCPeerConnection;
  private log: PrintFunction;
  private printerror: PrintFunction;
  private userinfo!: UserInfo;

  private channels: Map<string, RTCDataChannel>;
  
  constructor(config: PeerConfiguration) {
    this.id = config.id;
    if (config.user) this.userinfo = config.user;
    this.type = config.offer ? "receiving" : "calling";
    this.printerror = print(`PEER#${this.id}`, 'error');
    this.log = print(`PEER#${this.id}`);
    this.channels = new Map();

    this.setup(config);
  }

  private setup (config: PeerConfiguration) {
    this.connection = new RTCPeerConnection(config.rtcConfiguration);
    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        // transport this message to corresponding peer
        this.signal(SignalType.candidate, event.candidate);
      }
    }
    this.connection.onicecandidateerror = (event) => {
      if (["warning", "debug"].includes(Global.logger)) this.printerror("candidate", event);
    }
    // NOTE this will handle reconnection and trigger offer with iceRestart as option
    this.connection.oniceconnectionstatechange = () => {
      if (this.connection.iceConnectionState === "failed" && this.type === "calling") {
        this.createOffer(false);
      }
      else if (this.connection.iceConnectionState === "disconnected") {
        reactor.dispatch(Events.PeerDelete, this.id);
      }
    }

    reactor.on(Events.NewDataChannel, (config: DataChannelConfig) => this.addChannel(config.label, config.dataChannelDict))
    reactor.on(`peer-${this.id}-candidate`, this.reveiceCandidate);
    reactor.on(`peer-${this.id}-answer`, this.receiveAnswer);
    this.connection.ondatachannel = e => {
      this.setupChannel(e.channel);
    }

    if (this.type === "calling") this.setupCallee(config);
    else this.setupReceive(config);
  }

  private setupCallee(config: PeerConfiguration) {
    // create an offer
    this.createOffer();
    config.channels.forEach((config, label) => {
      this.addChannel(label, config);
    });
  }

  private setupReceive(config: PeerConfiguration) {
    // create an answer
    this.createAnswer(config.offer as RTCSessionDescriptionInit);
  }

  private reveiceCandidate = (candidate: RTCIceCandidate) => {
    tryuntil("receive-answer", async () => {
      await this.connection.addIceCandidate(candidate)
    }, 3, this.printerror);
  }

  private receiveAnswer = (data: {user: UserInfo, answer: RTCSessionDescriptionInit}) => {
    this.userinfo = data.user;
    tryuntil("receive-answer", async () => {
      await this.connection.setRemoteDescription(data.answer);
    }, 3, this.printerror);
  }

  // mendium setup 
  private addChannel(label: string, config?: RTCDataChannelInit) {
    if (this.channels.has(label)) {
      if (["warning", "debug"].includes(Global.logger)) this.printerror("data-channel-add", "duplicate channel");
    }

    const channel = this.connection.createDataChannel(label, config);
    this.setupChannel(channel);
  }
  
  private setupChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      if (channel.label === 'system') {
        reactor.dispatch(Events.PeerConnectionOpen, { ...(this.userinfo||{}), id: this.id });
        if (["info", "debug"].includes(Global.logger)) this.log('connection', 'established');
      }
      else if (["info", "debug"].includes(Global.logger)) this.log('channel-open', channel.label);
    }
    if (channel.label === "system") {
      channel.onmessage = e => {
        reactor.dispatch(Events.Target, JSON.parse(e.data));
      }
    }
    else {
      channel.onmessage = (e) => {
        reactor.dispatch(`${Events.PeerMessage}-${channel.label}`, { id: this.id, message: e.data })
      }
    }
    channel.onerror = (e) => {
      // do something
    }

    this.channels.set(channel.label, channel);
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
      await this.connection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.connection.createAnswer();
      await this.connection.setLocalDescription(answer);
      this.signal(SignalType.answer, answer);
    }, 3, this.printerror);
  }

  private signal(type: SignalType, data: SignalData) {
    reactor.dispatch(Events.SendTarget, {
      signal: type,
      type: MessageType.Target,
      target: this.id,
      targetType: TargetType.Signal,
      data,
      user: Global.user,
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
        if (["error", "debug"].includes(Global.logger)) this.printerror("signaling", `incorrect signaling type::${signal}`);
    }
  }

  public send(label: string, message:string):boolean {
    const channel = this.channels.get(label)
    if (!channel) {
      if (["warning", "debug"].includes(Global.logger)) this.printerror("send", "cant find channel", label);
      return false;
    }

    channel.send(message);
    return true;
  }

  public systemSend(message:TargetMessage):boolean {
    const channel = this.channels.get('system');
    if (!channel) {
      if (["fatal", "error", "warning", "debug"].includes(Global.logger)) this.printerror('system-send', 'channel not found');
      return false;
    }

    channel.send(JSON.stringify(message));
    return true;
  }
}