const http = require('http');
http.createServer((_, r) => { r.writeHead(404); r.end(); })
  .listen(process.env.PORT, () => console.log(`dev-stub listening on port ${process.env.PORT}`));
