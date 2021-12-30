import { InitSocketServer } from 'socket';
import chalk from 'chalk';
import { MessageType, SocketMessage } from 'utils/types';
import * as server from 'server';

// ############ SETUP #####################

before(() => {
  console.log(chalk.yellow('Server startup'));
  server.startup();
});

after(() => {
  console.log(chalk.yellow('Server teardown'));
  server.teardown();
});

describe('Connection Test', () => {
  it('Should accept connection', () => {

  });

  it('Should handle disconnect', () => {

  });

  it('Should handle unothorized users', () => {

  });

  it('Should prevent spamming', () => {

  });
});

describe('Login, Register, Logout Test', () => {
  it('Should handle successful login', () => {

  });

  it('Should handle unsuccessful login', () => {

  });

  it('Should handle successful register', () => {

  });

  it('Should handle unsuccessful register', () => {

  });

  it('Should handle logout successfully', () => {

  });
});

// helper functions 

function getSocket() {
  const socket = new WebSocket("ws://localhost:8000");
  const messages = {};

  socket.onmessage = function (event: MessageEvent) {
    const message: SocketMessage = JSON.parse(event.data);
    // if (message.)
  }
}