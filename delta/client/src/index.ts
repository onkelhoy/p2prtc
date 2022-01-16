import { Controller } from 'controller';

window.initnet = function (config) {
  return new Controller(config);
}