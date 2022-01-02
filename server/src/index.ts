// TODO handle-upgrade needs to assign id + info to sockets 
import http from 'http';
import * as dotenv from "dotenv";
import { startup, teardown } from 'socket';

dotenv.config();

const server = http.createServer();
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("server listening on port", PORT);

  startup(server);
});

process.on('SIGINT', () => {
  teardown();
})