import http from "http";
import * as dotenv from "dotenv";
import { InitSocketServer } from './socket';

dotenv.config({ path: __dirname+'/.env' });

let httpserver: http.Server;

export function startup() {
  httpserver = http.createServer();

  InitSocketServer(httpserver);

  httpserver.listen(process.env.PORT, () => {
    console.log("listening on port " + process.env.PORT)
  });
}

export function teardown() {
  httpserver.close();
}