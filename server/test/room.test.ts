import { Room } from "room";
import { ISocketSimple } from 'types/socket';
import { Reactor } from 'reactor';
import { ReactorEvents, SendEvent } from "types";
import { RoomType, UnothorizedReason } from "types/room";

function getClient(id: number): ISocketSimple {
  return { id: id.toString(), info: {} };
}

const roomtestconfig = {
  name: 'testroom',
  password: '123',
  limit: 5,
  id: '0',
}

describe("Core room tests", () => {
  it("create room", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
    });

    expect(room.size).toBe(1);
    expect(room.host).toBe('0');
  });

  it("join room", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
    });
    room.join(getClient(1));

    expect(room.size).toBe(2);
  });

  it("room limit", () => {
    const room = new Room(getClient(0), {
      id: '0',
      name: 'test-room',
      limit: 1,
    });
    room.join(getClient(1));

    expect(room.size).toBe(1);
  });

  it("join locked room", () => {
    const room = new Room(getClient(0), roomtestconfig);
    room.join(getClient(1), '123');

    expect(room.size).toBe(2);
  });

  it("no password", () => {
    const room = new Room(getClient(0), roomtestconfig);
    room.join(getClient(1));

    expect(room.size).toBe(1);
  });

  it("wrong password", () => {
    const room = new Room(getClient(0), roomtestconfig);
    room.join(getClient(1), '1234');

    expect(room.size).toBe(1);
  });

  it("kick socket", () => {
    const room = new Room(getClient(0), roomtestconfig);
    room.join(getClient(1), '123');
    room.kick('0', '1');

    expect(room.size).toBe(1);
  });
  
  it("unothorized kick socket", () => {
    const room = new Room(getClient(0), roomtestconfig);
    room.join(getClient(1), '123');
    room.kick('1', '0');

    expect(room.size).toBe(2);
  });

  it("ban socket", () => {
    const room = new Room(getClient(0), roomtestconfig);
    room.ban('0', '1');
    room.join(getClient(1), '123');

    expect(room.size).toBe(1);
  });

  it("unban socket", () => {
    const room = new Room(getClient(0), roomtestconfig);
    room.ban('0', '1');
    room.unban('0', '1');
    room.join(getClient(1), '123');

    expect(room.size).toBe(2);
  });
});

describe('Event room tests', () => {
  let reactor = new Reactor();

  beforeEach(() => {
    reactor.register(ReactorEvents.Send);
    reactor.register(ReactorEvents.RoomRemove);
  });

  afterEach(() => {
    reactor.deregister(ReactorEvents.Send);
    reactor.deregister(ReactorEvents.RoomRemove);
  });

  it("room create should yield create event", done => {
    reactor.addEventListener(ReactorEvents.Send, (event: SendEvent) => {
      expect(event.message.type).toBe(RoomType.Created);
      expect(event.message.room).toBe("0");
      expect(event.sockets.length).toBe(1);
      expect(event.sockets[0]).toBe("0");
      done();
    });

    new Room(getClient(0), roomtestconfig);
  });

  it("room join should yeild others/client gets join message", done => {
    const room = new Room(getClient(12), roomtestconfig);
    room.join(getClient(1), '123');
    room.join(getClient(73), '123');
    room.join(getClient(3), '123');

    let messagecount = 0;
    reactor.addEventListener(ReactorEvents.Send, (event: SendEvent) => {
      
      if (messagecount === 0) {
        // first wave should be to others
        expect(event.message.type).toBe(RoomType.Join);
        expect(event.sockets.length).toBe(4);
        expect(event.message.socket).toHaveProperty("id", "4");
        messagecount++;
      }
      else {
        // second should be to joining client
        expect(event.message.type).toBe(RoomType.Welcome);
        expect(event.sockets.length).toBe(1);
        expect(event.message.sockets.length).toBe(4);
        expect(event.message.sockets[2]).toHaveProperty("id", "73");
        expect(event.message.room).toBe("0");
        expect(event.message.host).toBe("12");
        done();
      }
    });

    room.join(getClient(4), '123');
  });

  it("socket leave", done => {
    const room = new Room(getClient(0), roomtestconfig);
    room.join(getClient(1), '123');
    room.join(getClient(2), '123');

    reactor.addEventListener(ReactorEvents.Send, (event: SendEvent) => {
      expect(event.message.type).toBe(RoomType.Leave);
      expect(event.sockets.length).toBe(2);

      done();
    });

    room.leave('2');
  });

  it("host leave", done => {
    const room = new Room(getClient(0), roomtestconfig);
    room.join(getClient(1), '123');
    room.join(getClient(2), '123');

    let messagecount = 0;

    reactor.addEventListener(ReactorEvents.Send, (event: SendEvent) => {
      if (messagecount === 0) {
        expect(event.message.type).toBe(RoomType.Leave);
        expect(event.message.socket).toBe('0');
        messagecount++;
      }
      else {
        expect(event.message.type).toBe(RoomType.Host);
        expect(event.message.host).toBe('1');
        done();
      }
    });

    room.leave('0');
  });
});

describe('unothorized events', () => {
  let reactor = new Reactor();

  beforeEach(() => {
    reactor.register(ReactorEvents.Send);
    reactor.register(ReactorEvents.RoomRemove);
  });

  afterEach(() => {
    reactor.deregister(ReactorEvents.Send);
    reactor.deregister(ReactorEvents.RoomRemove);
  });

  it("wrong password", done => {
    const room = new Room(getClient(0), roomtestconfig);
    
    reactor.addEventListener(ReactorEvents.Send, (event: SendEvent) => {
      expect(event.message.type).toBe(RoomType.Unothorized);
      expect(event.message.reason).toBe(UnothorizedReason.Password);

      done();
    });

    room.join(getClient(1), '1234');
  });

  it("duplicate socket", done => {
    const room = new Room(getClient(0), roomtestconfig);
    
    reactor.addEventListener(ReactorEvents.Send, (event: SendEvent) => {
      expect(event.message.type).toBe(RoomType.Unothorized);
      expect(event.message.reason).toBe(UnothorizedReason.Duplicate);

      done();
    });

    room.join(getClient(0), '123');
  });

  it("banned socket", done => {
    const room = new Room(getClient(0), roomtestconfig);
    room.ban('0', '1');
    
    reactor.addEventListener(ReactorEvents.Send, (event: SendEvent) => {
      expect(event.message.type).toBe(RoomType.Unothorized);
      expect(event.message.reason).toBe(UnothorizedReason.Banned);

      done();
    });

    room.join(getClient(1), '123');
  });
})