/**
 * @jest-environment jsdom
 */

import { wait } from 'utils/helper';
import { Controller } from 'controller';

import * as mockserver from './mockserver';
import { Events, ID } from "types";
import { IncomingMessageType, Message, MessageType, OutgoingMessage, OutgoingMessageType } from "types/socket.message";

const nopeersconfig = {
  socket: {
    url: "ws://localhost:8000"
  },
  testing: {
    peers: false
  }
}
let controller: Controller;


//#region ############ SETUP #####################

beforeAll(() => {
  mockserver.setup(8000);
});

afterAll(() => {
  mockserver.teardown();
});

beforeEach(async () => {
  // clear socket
  
});

afterEach(() => {
  
});

describe("core controller functionalities", () => {
  let clientA:Controller;
  beforeAll(() => {
    clientA = new Controller(nopeersconfig);
  });

  it("should create a network", async () => {
    clientA.register({ name: 'bananas' });
    await wait();
    expect(clientA.UserInfo.id).toBe('0');
    expect(clientA.network?.Info).toHaveProperty("name", "bananas");
    expect(clientA.network?.Host).toHaveProperty(clientA.UserInfo.id);
  });
  it("another client should connect to this network", async () => {
    const clientB = new Controller(nopeersconfig);
    await wait();
    clientB.join(clientA.network?.Host as ID);
    await wait();

    expect(clientA.UserInfo.id).toBe('0');
    expect(clientB.network?.Host).toBe(clientA.UserInfo.id);
    expect(clientA.network?.size).toBe(2);
    expect(clientB.network?.size).toBe(2);
  });
});