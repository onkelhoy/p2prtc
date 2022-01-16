import { Controller } from 'controller'

declare global {
  interface Window {
    initnet(config: ControllerConfig): Controller;
  }
}