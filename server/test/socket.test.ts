/**
 * @jest-environment jsdom
 */

import * as socketserver from 'socket';
import http from 'http';
import chalk from 'chalk';
import { MessageType, SocketMessage } from 'types/socket';

// ############ SETUP #####################

beforeAll(() => {
  console.log(chalk.yellow('Server startup'));
  socketserver.startup({
    socketserver: http.createServer()
  });
});

afterAll(() => {
  console.log(chalk.yellow('Server teardown'));
  socketserver.teardown();
});

describe('Connection Test', () => {
  it('Should accept connection', () => {

  });

  it('Should handle disconnect', () => {

  });

  it('Should prevent spamming', () => {

  });
});

describe('', () => {

})

// helper functions 

function getSocket() {
  const socket = new WebSocket("ws://localhost:8000");
  const messages = {};

  socket.onmessage = function (event: MessageEvent) {
    const message: SocketMessage = JSON.parse(event.data);
    // if (message.)
  }
}