import { Reactor } from ".";


describe('Reactor Pattern', () => {
  let instance: Reactor;

  beforeEach(() => {
    // clear instance
    instance = new Reactor();
    expect(instance).toBeInstanceOf(Reactor);
  });


  it('register foo and add listerners', () => {
    instance.register("foo");
    const fooevent = instance.events.get("foo");
    expect(fooevent).toMatchObject({ callbacks: [], name: "foo" });

    instance.addEventListener("foo", () => 5);
    expect(fooevent?.callbacks.length).toBe(1);
  });

  it("dispatch event", async () => {
    let comp = 0;
    instance.register("foo");
    for (let i=0; i<10; i++) {
      instance.addEventListener("foo", (value:number) => {
        comp+=value;
      });
    }
    instance.disptatch("foo", 5);

    expect(comp).toBe(50);
  });
});