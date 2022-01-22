/**
 * @jest-environment jsdom
 */

import { Socket } from "socket";
import { wait } from 'utils/helper';
import { Reactor } from 'utils/reactor';

import * as mockserver from './mockserver';
import { Events } from "types";
import { IncomingMessageType, Message, MessageType, OutgoingMessage, OutgoingMessageType } from "types/socket.message";

const reactor = new Reactor();
const URL = "ws://localhost:8000";
let socket: Socket;

const messages:Record<string, Message[]> = {
  [IncomingMessageType.Error]: [] as Message[],
  [IncomingMessageType.RegisterACK]: [] as Message[],
  [IncomingMessageType.UpdateACK]: [] as Message[],
  [IncomingMessageType.ConnectionACK]: [] as Message[],
  [MessageType.Target]: [] as Message[],
};

//#region ############ SETUP #####################

beforeAll(() => {
  mockserver.setup(8000);

  const onmessage = (message:Message) => {
    messages[message.type].push(message);
  }
  reactor.on(IncomingMessageType.Error, onmessage);
  reactor.on(IncomingMessageType.RegisterACK, onmessage);
  reactor.on(IncomingMessageType.UpdateACK, onmessage);
  reactor.on(IncomingMessageType.ConnectionACK, onmessage);
  reactor.on(MessageType.Target, onmessage);
});

afterAll(() => {
  mockserver.teardown();
});

beforeEach(async () => {
  // clear socket
  socket = new Socket(URL);
});

afterEach(() => {
  socket.close();

  for (const key in messages) {
    messages[key] = [];
  }
});

//#endregion ########### TESTS ######################

describe('Socket Connection', () => {
  it('Should connect successfully', async () => {
    await wait();
    await wait();

    expect(socket.status).toBe(WebSocket.OPEN);
    expect(messages[IncomingMessageType.ConnectionACK]).toHaveLength(1);
    expect(messages[IncomingMessageType.ConnectionACK][0]).toHaveProperty('id');
  });

  it('Should reconnect on failure', async () => {
    socket.terminate(true);
    expect([WebSocket.CLOSED, WebSocket.CLOSING].includes(socket.status)).toBe(true);
    await wait(2000);

    expect([WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.status)).toBe(true);
  });

  it('Should disconnect successfully', () => {
    socket.close();
    expect([WebSocket.CLOSED, WebSocket.CLOSING].includes(socket.status)).toBe(true);
  });

  it('Should handle connection loss', async () => {
    mockserver.teardown();
    await wait();
    expect([WebSocket.CLOSED, WebSocket.CLOSING].includes(socket.status)).toBe(true);
    mockserver.setup(8000);
    await wait(1000);
    expect([WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.status)).toBe(true);
  });
});

describe('Socket Send', () => {
  it("should register network", async () => {
    socket.send({
      type: OutgoingMessageType.Register,
      network: { name: 'test' },
    } as OutgoingMessage);
    await wait();

    expect(messages[IncomingMessageType.RegisterACK]).toHaveLength(1);
  });

  it("should register network & update", async () => {
    socket.send({
      type: OutgoingMessageType.Register,
      network: { name: 'test' },
    } as OutgoingMessage);
    await wait();
    socket.send({
      type: OutgoingMessageType.Update,
      network: { name: 'test-bla' },
    } as OutgoingMessage);
    await wait();
    await wait();

    expect(messages[IncomingMessageType.UpdateACK]).toHaveLength(1);
  });

  it('Should store message on offline', () => {
    socket.terminate();
    const now = socket.offlineCount;
    socket.send({ type: 'test' } as Message);
    socket.send({ type: 'test' } as Message);
    socket.send({ type: 'test' } as Message);
    expect(socket.offlineCount - now).toBe(3);
  });

  it('Should send all offline messages on reconnect', async () => {
    socket.terminate();
    expect(socket.offlineCount).toBe(0);
    socket.send({ type: 'test' } as Message);
    socket.send({ type: 'test' } as Message);
    socket.send({ type: 'test' } as Message);
    expect(socket.offlineCount).toBe(3);

    socket.reconnect();
    await wait(3000);
    expect(socket.offlineCount).toBeLessThan(3);
  });
});

// helper functions
