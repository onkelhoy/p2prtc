/**
 * @jest-environment jsdom
 */

import { InitSocketServer } from 'socket';
import chalk from 'chalk';
import { MessageType, SocketMessage } from 'utils/types';
import * as server from 'server';

// ############ SETUP #####################

beforeAll(() => {
  console.log(chalk.yellow('Server startup'));
  server.startup();
});

afterAll(() => {
  console.log(chalk.yellow('Server teardown'));
  server.teardown();
});

describe('Connection Test', () => {
  it('Should accept connection', () => {

  });

  it('Should handle disconnect', () => {

  });

  it('Should handle room creation', () => {

  });

  it('Should prevent spamming', () => {

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