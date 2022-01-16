import { Controller } from 'controller';
import { Reactor } from 'utils/reactor';

window.initnet = function (config) {
  return new Controller(config);
}