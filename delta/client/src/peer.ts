import { Reactor } from "utils/reactor";
import { Events, ID, PrintFunction, UserInfo } from "types";
import { DataChannelConfig, MediaType, PeerConfiguration, PeerType } from "types/peer";
import { ConnectMessage, SignalData, SignalMessage, SignalType, SystemInitMessage, SystemMessage, SystemType } from "types/peer.message";
import { Message, MessageType, TargetType } from "types/socket.message";
import { print, trycatch, tryuntil } from "utils/helper";
import { Global } from "utils/global";

const reactor = new Reactor();

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
    reactor.on(`peer-${this.id}-system-send`, this.systemsend);
    this.connection.ondatachannel = e => {
      this.setupChannel(e.channel);

      reactor.dispatch(Events.IncommingMedia, { 
        type: MediaType.Data,
        config: { label: e.channel.label }
      });
    }

    if (this.type === "calling") {
      // create an offer
      this.createOffer();
      config.channels.forEach((config, label) => {
        this.addChannel(label, config);
      });
    }
    else {
      // create an answer
      this.createAnswer(config.offer as RTCSessionDescriptionInit);
    }
  }

  public close() {
    this.connection.close();
  }

  //#region handshake
  private reveiceCandidate = (candidate: RTCIceCandidate) => {
    tryuntil("receive-answer", async () => {
      await this.connection.addIceCandidate(candidate)
    }, 3, this.printerror);
  }
  private receiveAnswer = (answer: RTCSessionDescriptionInit) => {
    tryuntil("receive-answer", async () => {
      await this.connection.setRemoteDescription(answer);
    }, 3, this.printerror);
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
  //#endregion

  //#region send methods
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
  //#endregion

  //#region data-channel
  private addChannel(label: string, config?: RTCDataChannelInit) {
    if (this.channels.has(label)) {
      // NOTE this is most likly caused when another peer creates it
      if (["debug"].includes(Global.logger)) this.printerror("data-channel-add", "duplicate channel");
      return;
    }

    const channel = this.connection.createDataChannel(label, config);
    this.setupChannel(channel);
  }
  private setupChannel(channel: RTCDataChannel) {
    // NOTE its going to circle around twice (onDataChannel [->here] -> media.add -> newDataChannel -> here) see: 2x here
    if (this.channels.get(channel.label)) {
      return;
    }
    channel.onopen = () => {
      if (channel.label === 'system') {
        this.systemopen();
      }
      else if (["info", "debug"].includes(Global.logger)) this.log('channel-open', channel.label);
    }
    if (channel.label === "system") {
      channel.onmessage = this.systemmessage;
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
  //#endregion
  
  //#region system-data-chanel
  public systemsend = (message:Message):boolean => {
    const channel = this.channels.get('system');
    if (!channel) {
      if (["fatal", "error", "warning", "debug"].includes(Global.logger)) this.printerror('system-send', 'channel not found');
      return false;
    }

    channel.send(JSON.stringify(message));
    return true;
  }
  private systemmessage = (event:MessageEvent) => {
    const message:SystemMessage = JSON.parse(event.data);
    switch (message.type) {
      case SystemType.Target: {
        reactor.dispatch(Events.Target, message);
        break;
      }
      case SystemType.Init: {
        const { user, network } = message as SystemInitMessage;
        if (network && (!Global.network || Global.network?.host === user.id)) {
          reactor.dispatch(Events.NetworkUpdate, network);
        }
        reactor.dispatch(Events.PeerConnectionOpen, { ...user, type: this.type });
        this.userinfo = user;
        break;
      }
      case SystemType.Connect: {
        const { target } = message as ConnectMessage;
        const smsg = {
          sender: target
        } as SignalMessage;
        reactor.dispatch(Events.PeerAdd, smsg);
        break;
      }
      default: {

      }
    }
  }
  private systemopen () {
    // exchange info 
    this.systemsend({
      type: SystemType.Init,
      user: Global.user,
      network: Global.network,
    } as SystemInitMessage);

    if (this.type === "calling") {
      // reactor.dispatch()
    }

    if (["info", "debug"].includes(Global.logger)) this.log('connection', 'established');
  }
  //#endregion
}