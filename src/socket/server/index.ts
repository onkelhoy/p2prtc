import http from "http";
import dotenv from "dotenv";
import { InitSocketServer } from './socket';

dotenv.config();

const httpserver = http.createServer();
InitSocketServer(httpserver);

httpserver.listen(process.env.PORT, () => {
  console.log("listening on port " + process.env.PORT)
});