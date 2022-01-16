/**
 * @jest-environment jsdom
 */

import { SocketServer } from 'socket';
import http from 'http';
import { IncomingMessage, IncomingMessageType, Message, MessageType, OutgoingMessageType } from 'types/message';

// ############ SETUP #####################

let httpserver: http.Server;
let socketserver: SocketServer;
let idticker = 0;
const logs = {
  errors: [] as string[],
  logs: [] as string[],
}

beforeAll(async () => {
  console.log = (...args:any[]) => logs.logs.push(args.join(' '));
  console.error = (...args:any[]) => logs.errors.push(args.join(' '));

  return new Promise<void>(rs => {
    httpserver = http.createServer();
    httpserver.listen(8888, () => {
      console.log('Server Startup');
      rs();
    });
  });
});

afterAll(() => {
  httpserver.close();
  console.log('Server teardown');
});

beforeEach(() => {
  socketserver = new SocketServer({ 
    server: httpserver,
    setClientID: () => {
      idticker++;
      return idticker.toString();
    }
  });
});

afterEach(async () => {
  idticker = 0;
  socketserver.close();
  await wait();
});

describe('Core Functionalities', () => {
  it('Should accept connection', async () => {
    const { socket } = getSocket();
    await wait();

    expect(socketserver.sockets.size).toBe(1);
    expect(socket.readyState).toBe(WebSocket.OPEN);
  });

  it('Assigning custom IDs', async () => {
    socketserver.close();
    socketserver = new SocketServer({
      server: httpserver,
      setClientID: () => '55555',
    });
    await wait();
    getSocket();
    await wait();

    const socket = socketserver.sockets.get('55555');
    expect(socket?.id).toBe('55555');
  });

  it('Duplicate Id', async () => {
    socketserver.close();
    socketserver = new SocketServer({
      server: httpserver,
      setClientID: () => '55555',
    });
    await wait();
    getSocket();
    await wait();
    getSocket();
    await wait();
    
    expect(socketserver.sockets.size).toBe(1);
  });
  
  it('register network', async () => {
    const {socket} = getSocket();
    await wait();

    socket.send(JSON.stringify({
      type: IncomingMessageType.Register,
      network: { name: 'something' }
    }));
    await wait();

    expect(socketserver.hosts.size).toBe(1);
    expect(socketserver.hosts.get('1')).toHaveProperty('name', 'something');
  });
  

  it('host leave should result in network gone', async () => {
    const {socket} = getSocket();
    await wait();

    socket.send(JSON.stringify({
      type: IncomingMessageType.Register,
      network: { name: 'something' }
    }));
    await wait();
    socket.close();
    await wait();

    expect(socketserver.hosts.size).toBe(0);
  });

  it('Should prevent spamming', async () => {
    const {socket} = getSocket();

    await wait();
    for (let i=0; i<6; i++) {
      socket.send('hello world');
    }
    await wait();

    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });

  it('Reset spamming', async () => {
    const {socket} = getSocket();

    await wait();
    for (let i=0; i<4; i++) {
      socket.send('hello world');
    }
    await wait(1500);
    socket.send('hello world');
    socket.send('hello world');
    await wait();

    expect(socket.readyState).toBe(WebSocket.OPEN);
  });

  it('Network should be updated', async () => {
    const { socket } = getSocket();
    await wait();

    socket.send(JSON.stringify({
      type: IncomingMessageType.Register,
      network: { name: 'something' }
    }));
    await wait();
    socket.send(JSON.stringify({
      type: IncomingMessageType.Update,
      network: { name: 'something-else' }
    }));
    await wait();
    expect(socketserver.hosts.get('1')).toHaveProperty('name', 'something-else');
  });
});

describe('Checking responses', () => {
  it("newly connected sockets should receive their id", async () => {
    const { messages } = getSocket();
    await wait();

    expect(messages[OutgoingMessageType.ConnectionACK]).toHaveLength(1);
    expect(messages[OutgoingMessageType.ConnectionACK][0]).toHaveProperty('id', '1');
  });

  it("successful register should be recognized by register-ack", async () => {
    const { socket, messages } = getSocket();
    await wait();

    send(socket, {
      type: IncomingMessageType.Register,
      network: { name: 'hello' }
    } as IncomingMessage);

    await wait();
    expect(messages[OutgoingMessageType.RegisterACK]).toHaveLength(1);
    expect(messages[OutgoingMessageType.RegisterACK][0]).toHaveProperty("network", { name: 'hello', id: '1' });
  });

  it("successful update of network should be recognized by update-ack", async () => {
    const { socket, messages } = getSocket();
    await wait();

    send(socket, {
      type: IncomingMessageType.Register,
      network: { name: 'hello' }
    } as IncomingMessage);
    await wait();
    send(socket, {
      type: IncomingMessageType.Update,
      network: { name: 'hello-updated' }
    } as IncomingMessage);
    await wait();

    expect(messages[OutgoingMessageType.UpdateACK]).toHaveLength(1);
    expect(messages[OutgoingMessageType.UpdateACK][0]).toHaveProperty("network", { name: 'hello-updated', id: '1' });
  });

  it.skip("unsuccessful register should get error", async () => {
    // NOTE this is difficult to simulate as it depends on id generation
  });

  it("unsuccessful update of network should get error", async () => {
    const { socket, messages } = getSocket();
    await wait();

    send(socket, {
      type: IncomingMessageType.Update,
      network: { name: 'hello-updated' }
    } as IncomingMessage);
    await wait();

    expect(messages[OutgoingMessageType.Error]).toHaveLength(1);
    expect(messages[OutgoingMessageType.Error][0]).toHaveProperty("error", 'Host not found');
  });
})


// helper functions 

function getSocket() {
  const socket = new WebSocket("ws://localhost:8888");
  const messages = {
    [OutgoingMessageType.Error]: [] as Message[],
    [OutgoingMessageType.RegisterACK]: [] as Message[],
    [OutgoingMessageType.UpdateACK]: [] as Message[],
    [OutgoingMessageType.ConnectionACK]: [] as Message[],
    [MessageType.Target]: [] as Message[],
  };

  socket.onmessage = function (event: MessageEvent) {
    const message: Message = JSON.parse(event.data);
    messages[message.type as MessageType|OutgoingMessageType].push(message);
   }

  return { messages, socket };
}

function send(socket: WebSocket, message: IncomingMessage) {
  socket.send(JSON.stringify(message));
}

function wait(milliseconds: number = 100): Promise<void> {
  return new Promise(rs => {
    setTimeout(rs, milliseconds);
  })
}