// TODO handle-upgrade needs to assign id + info to sockets 
import http from 'http';
import url from 'url';
import * as dotenv from "dotenv";
import { SocketServer } from 'socket';
import { NetworkInfo } from 'types/socket';

dotenv.config();

const server = http.createServer();
let wss: SocketServer;

// CONSTANTS
const spam_duration = Number(process.env.SPAM_DURATION || 200);
const spam_reset = Number(process.env.SPAM_RESET || 1500);
const strikes = Number(process.env.MAX_STRIKES || 3);
const heartbeat_interval = Number(process.env.HEARTBEAT_INTERVAL || 2000);
const PORT = Number(process.env.PORT || 3000);

server.listen(PORT, () => {
  console.log("server listening on port", PORT);

  wss = new SocketServer({
    server,
    spam_duration,
    spam_reset,
    strikes,
    heartbeat_interval,
  });
});

server.on("request", (req, res) => {
  const pathname = url.parse(req.url as string).pathname || ""; 
  const path = /^\/api\/network\/?(\d+)?/.exec(pathname);
  if (path) {
    res.setHeader('Content-Type', 'application/json');
    if (path[1]) {
      // get specific id
      const network = wss.hosts.get(path[1]);
      if (network)
        res.write(JSON.stringify(network));
      else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.write("404 Not Found")
        res.end();
        return;
      }
    }
    else if (path[0] === path.input) {
      // get all networks
      const networks:NetworkInfo[] = [];
      wss.hosts.forEach(network => networks.push(network));
      res.write(JSON.stringify(networks));
    }
    res.statusCode = 200;
  }
  else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html');
    res.write("404 Not Found")
  }
  res.end();
});

process.on('SIGINT', () => {
  if (wss) wss.close();
  server.close();
  console.log("\nserver closed");

  process.exit(1);
});