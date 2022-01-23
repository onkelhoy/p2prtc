import { Controller } from 'controller'

declare global {
  interface Window {
    init(config: ControllerConfig);
    onMessage(channel:string, callback:Function);
    on(event:string, callback:Function);
    join(network: ID, config?: Record<string, any>);
    register(network: PartialNetworkInfo);
  }
}