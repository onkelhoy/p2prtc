// types
import { ID, Config, UserInfo, Events } from 'types';
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

// variables
const reactor = new Reactor();
const network = new Network();
const manager = new PeerManager();
const printerror = print("main", "error");
const log = print("main");

// dynamic variables
let socket: Socket;

// exposed api for windows
window.init = function init (config: Config) {
  Global.logger = config.logger || 'none'; 
  UserUpdate((config.user || {}) as UserInfo);

  events();
  socket = new Socket(
    config.socket.url, 
    config.socket.protocols, 
  );
}
window.register = function register(network: PartialNetworkInfo) {
  if (["info", "debug"].includes(Global.logger)) log('register', network);
  socket.send({
    type: OutgoingMessageType.Register,
    network,
  } as Message);
}
window.join = function join(network: ID, config?: Record<string, any>) {
  sendTargetMessage({
    target: network,
    targetType: TargetType.Join, 
    config,
  });
}
window.onMessage = function onMessage(channel:string, callback:Function) {
  reactor.on(`${Events.PeerMessage}-${channel}`, callback);
}
window.on = function on(event:string, callback:Function) {
  reactor.on(event, callback);
}

// functions 
function events() {
  reactor.on(Events.Target, onTargetMessage);
  reactor.on(Events.SendTarget, sendTargetMessage);
}

function forward (message: TargetMessage):boolean {
  if (network.registered) {
    // forward to someone else (or target : based on Topology)
    const forward = network.forward(message);
    if (forward !== null) {
      manager.forward(message, forward);
      return true;
    } 
    else if (["error", "warning", "debug"].includes(Global.logger)) printerror("forward", "not found", message.target);
  }
  else if (["error", "warning", "debug"].includes(Global.logger)) printerror("forward", "no network", message.target);

  return false;
}

function UserUpdate(info: UserInfo) {
  Global.user = info;
  if (["info", "debug"].includes(Global.logger)) log("userinfo", Global.user);
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
      else if (["warning", "debug"].includes(Global.logger)) printerror("network-join", "no network", message.target);
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
      if (["warning", "debug"].includes(Global.logger))  printerror("target-message", "unsupported type", message.targetType);
      break;
    }
  }
}