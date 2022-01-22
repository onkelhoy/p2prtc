interface IEvent {
  name: string;
  callbacks: Function[];
}

export class Reactor {
  private events!: Map<string, IEvent>;

  private static instance: Reactor;

  constructor () {
    if (Reactor.instance) return Reactor.instance;

    this.events = new Map();
    Reactor.instance = this;
  }

  public static getInstance() {
    return this.instance || (this.instance = new Reactor());
  }


  public has (name: string) {
    return this.events.has(name);
  }

  public get (name: string) {
    return this.events.get(name);
  }

  public register (name: string) {
    if (this.has(name)) return;
    
    const event:IEvent = {
      name,
      callbacks: [],
    };

    this.events.set(name, event);
  }

  public deregister(name:string) {
    this.events.delete(name);
  }

  public dispatch (name: string, eventArgs?: any) {
    const event = this.get(name);
    if (event) {
      event.callbacks.forEach(callback => callback(eventArgs));
    }
  }

  public addEventListener (name: string, callback: Function) {
    const event = this.get(name);
    if (event) {
      event.callbacks.push(callback);
    }
  }

  public removeEventListener (name: string, callback: Function) {
    const event = this.get(name);
    if (event) {
      event.callbacks = event.callbacks.filter(cb => cb !== callback);
    }
  }

  public on (type: string, callback: Function) {
    if (!this.has(type)) this.register(type);
    this.addEventListener(type, callback);
  }
}