import { Global } from 'utils/global';
import { Network } from 'network';
import { JoinMessage } from 'types/socket.message';

beforeAll(() => {
  Global.user = { id: '0' }
})

describe("core networking functionalities", () => {
  it("creation", () => {
    const network = new Network({id: '0', name: 'test'});
    expect(network.Info?.id).toBe('0');
  });

  it("update", () => {
    const network = new Network({id: '0', name: 'test'});
    network.update({ hello: 'world' });
    expect(network.Info?.hello).toBe('world');
  });

  it("update network id should not be successful", () => {
    const network = new Network({id: '0', name: 'test'});
    network.update({ id: 'world' });
    expect(network.Info?.id).toBe('0');
  });

  it("should accept new connection", () => {
    const network = new Network({id: '0', name: 'test'});
    const ans = network.accept({ sender: '1' } as JoinMessage);
    expect(ans).toBe(true);
  });

  it("should not accept new connection (duplicate peer)", () => {
    const network = new Network({id: '0', name: 'test'});
    const ans = network.accept({ sender: '0' } as JoinMessage);
    expect(ans).toBe(false);
  });

  it("should not accept new connection (duplicate peer)", () => {
    const network = new Network({id: '0', name: 'test'});
    network.accept({ sender: '1' } as JoinMessage);
    network.accept({ sender: '2' } as JoinMessage);
    expect(network.size).toBe(3);
  });

  it("should be able to join & leave", () => {
    const network = new Network({id: '0', name: 'test'});
    network.accept({ sender: '1' } as JoinMessage);
    network.leave('1');
    expect(network.size).toBe(1);
  })
});