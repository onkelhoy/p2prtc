import { Reactor } from "../src/reactor";

const reactor = new Reactor();

describe('Reactor Pattern', () => {
  afterEach(() => {
    reactor.deregister("foo");
  })

  it('register foo and add listerners', () => {
    reactor.register("foo");
    const fooevent = reactor.get("foo");
    expect(fooevent).toMatchObject({ callbacks: [], name: "foo" });

    reactor.addEventListener("foo", () => 5);
    expect(fooevent?.callbacks.length).toBe(1);
  });

  it("deregister of foo", () => {
    expect(reactor.has("foo")).toBe(false);
  })

  it("dispatch event", async () => {
    let comp = 0;
    reactor.register("foo");
    for (let i=0; i<10; i++) {
      reactor.addEventListener("foo", (value:number) => {
        comp+=value;
      });
    }
    reactor.dispatch("foo", 5);

    expect(comp).toBe(50);
  });
});