// types
import { ID } from 'types';

// modules
import { Peer } from 'peer';
import { Socket } from 'socket';

// utils
import { Network } from 'utils/network2'
import { Reactor } from 'utils/reactor';
import { Medium } from 'utils/medium';
import { Global } from 'utils/global';

// variables
const reactor = new Reactor();
const peers: Map<ID, Peer> = new Map();
const network = new Network();


// functions 
function init (config: any) {
  // TODO config is old controllerConfig
}

function events() {
  reactor.on();
}