interface IEvent {
  name: string;
  callbacks: Function[];
}

export class Reactor {
  private events: Map<string, IEvent>;

  private static instance: Reactor;

  constructor () {
    this.events = new Map();
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
    const event:IEvent = {
      name,
      callbacks: [],
    };

    this.events.set(name, event);
  }

  public disptatch (name: string, eventArgs?: any) {
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
}