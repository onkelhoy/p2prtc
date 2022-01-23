// types
import { ID, Config, UserInfo, Events, SetType, SparseUserInfo } from 'types';
import { NetworkInfo, PartialNetworkInfo } from 'types/network';
import { SignalMessage } from 'types/peer.message';
import { 
  JoinMessage, 
  Message, 
  MessageType, 
  OutgoingMessageType, 
  TargetMessage, 
  TargetMessageSparse, 
  TargetType 
} from 'types/socket.message';

// modules
import { Socket } from 'socket';

// utils
import { Network } from 'utils/network'
import { Reactor } from 'utils/reactor';
import { Global } from 'utils/global';
import { print } from "utils/helper";
import { PeerManager } from 'utils/manager';
import { MediaConfig, MediaType } from 'types/peer';

// variables
const reactor = new Reactor();
const network = new Network();
const manager = new PeerManager();
const error = print("main", "error");
const log = print("main");

// dynamic variables
let socket: Socket;

// exposed api for windows
const p2pclient = {
  info: Global,
  init: function(config: Config) {
    Global.logger = config.logger || 'none'; 
    p2pclient.set(SetType.User, (config.user || {}) as UserInfo)
  
    events();
    socket = new Socket(
      config.socket.url, 
      config.socket.protocols, 
    );
  },
  register: function(network: PartialNetworkInfo) {
    if (["info", "debug"].includes(Global.logger)) log('register', network);
    socket.send({
      type: OutgoingMessageType.Register,
      network,
    } as Message);
  },
  join: function(network: ID, config?: Record<string, any>) {
    sendTargetMessage({
      target: network,
      targetType: TargetType.Join, 
      config,
    });
  },
  onMessage: function(channel:string, callback:Function) {
    reactor.on(`${Events.PeerMessage}-${channel}`, callback);
  },
  on: function(event:string, callback:Function) {
    reactor.on(event, callback);
  },
  set: function (type: SetType, data:any) {
    switch (type) {
      case SetType.User: {
        if (!Global.user) Global.user = data;
        else Global.user = { ...(data || {}), id: Global.user.id };

        if (["info", "debug"].includes(Global.logger)) log("userinfo", Global.user);
        break;
      }
      case SetType.Network: {
        // TODO update so network can have both host & id seperate 
        // and before updating we should check if we are host 
        reactor.dispatch(Events.NetworkUpdate, data);
        break;
      }
      case SetType.Media: {
        const { type, config } = data as { type: MediaType, config?: MediaConfig };
        manager.media.add(type, config);
        break;
      }
      default: {
        if (["warning", "info", "debug"].includes(Global.logger)) error("set", "unssuported type", type);
      }
    }
  },
  send: function (channel:string, to:ID, data:any) {
    const message = data instanceof Object ? JSON.stringify(data) : data;
    
    if (channel === "system") error("send", "forbidden channel");
    else manager.send(channel, to, message)
  },
  broadcast: function (channel:string, data:any) {
    const message = data instanceof Object ? JSON.stringify(data) : data;
    
    if (channel === "system") error("send", "forbidden channel");
    else manager.broadcast(channel, message)
  }
}

window.p2pclient = p2pclient;

// functions 
function events() {
  reactor.on(Events.Target, onTargetMessage);
  reactor.on(Events.SendTarget, sendTargetMessage);
}

function forward (message: TargetMessage):boolean {
  if (network.registered) {
    // forward to someone else (or target : based on Topology)
    const forward = network.forward(message);
    if (forward !== undefined) {
      manager.forward(message, forward);
      return true;
    } 
    else if (["error", "warning", "debug"].includes(Global.logger)) error("forward", "not found", message.target);
  }

  return false;
}

function sendTargetMessage (sparsemessage: TargetMessageSparse) {
  let message:TargetMessage;
  if (sparsemessage.type && sparsemessage.sender) {
    // its just a forward 
    message = sparsemessage as TargetMessage;
  }
  else {
    message = { 
      ...sparsemessage, 
      sender: Global.user.id,
      type: MessageType.Target,
    };
  }

  if (["debug"].includes(Global.logger)) log("send-target-message", message);
       
  // network or forward is null : thus socket transport
  if (!forward(message)) socket.send(message);
}

function onTargetMessage(message: TargetMessage) {
  if (["debug"].includes(Global.logger)) log("on-target-message", message);
    
  if (message.target !== Global.user.id) {
    if (forward(message)) return;
  }

  switch (message.targetType) {
    case TargetType.Join: {
      if (network.registered) {
        network.join(message as JoinMessage);
      }
      else if (["warning", "debug"].includes(Global.logger)) error("network-join", "no network", message.target);
      break;
    }
    case TargetType.Reject: {
      if (["warning", "info", "debug"].includes(Global.logger)) log("join-request", "we got rejected");
      break;
    }
    case TargetType.Signal: {
      manager.signal(message as SignalMessage);
      break;
    }
    default: {
      if (["warning", "debug"].includes(Global.logger))  error("target-message", "unsupported type", message.targetType);
      break;
    }
  }
}