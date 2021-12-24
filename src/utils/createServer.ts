import http from "http";

let server: http.Server;

export function startServer(port:number, createServer: (server: http.Server) => void) {
  server = http.createServer();

  createServer(server);

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

export function shutdownServer() {
  server.close();
}