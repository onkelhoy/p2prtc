import http, { OutgoingHttpHeaders } from 'http';
import { NetworkInfo } from 'types/socket';
import { SocketServer } from 'socket';
import url from 'url';

export function app(wss: SocketServer) {
  return function (req: http.IncomingMessage, res: http.ServerResponse) {
    const headers:OutgoingHttpHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, GET',
      'Access-Control-Max-Age': 2592000, // 30 days
      /** add other headers as per requirement */
      'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    if (req.method === 'GET') {
      router(req, res, headers, wss);
      return;
    }

    res.writeHead(405, headers);
    res.end(`${req.method} is not allowed for the request.`);
  }
}

function router(
  req: http.IncomingMessage, 
  res: http.ServerResponse, 
  headers: OutgoingHttpHeaders,
  wss: SocketServer,
) {
  const pathname = url.parse(req.url as string).pathname || ""; 
  const path = /^\/network\/?(\d+)?/.exec(pathname);

  if (path) {
    let networks:NetworkInfo[]|null = [];

    if (path[1]) {
      const network = wss.networks.get(path[1]);
      if (network) {
        networks.push(network);
      }
      else networks = null;
    }

    if (path[0] === path.input) {
      // get all networks
      wss.networks.forEach(network => (networks as NetworkInfo[]).push(network));
    }

    if (networks) {
      res.writeHead(200, headers);
      res.write(JSON.stringify(networks));
      res.end();
      return;
    }
  }

  res.writeHead(404, headers);
  res.write(JSON.stringify({ error: "404 not found" }));
  res.end();
}