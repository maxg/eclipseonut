const fs = require('fs');
const http = require('http');
const https = require('https');
const mongodb = require('mongodb');
const ws = require('ws');
const websocketjsonstream = require('websocket-json-stream');

const config = require('./config');
const logger = require('./logger');

(async function app() {
  
  const log = logger.log.child({ in: 'app' });
  const db = await require('./db').createBackend(config);
  const web = await require('./web').createFrontend(config, db);
  
  const servers = {
    web: https.createServer(web),
    websocket: https.createServer(),
  };
  const certify = () => Object.values(servers).forEach(server => {
    server.setSecureContext && server.setSecureContext({
      key: fs.readFileSync(`${config.dir}/tls/privkey.pem`),
      cert: fs.readFileSync(`${config.dir}/tls/fullchain.pem`),
    });
  });
  certify();
  setInterval(certify, 1000 * 60 * 60 * 24).unref();
  
  // connect websocket to share
  
  let websocketserver = new ws.Server({ server: servers.websocket });
  websocketserver.on('connection', function(connection, req) {
    let connectionid = mongodb.ObjectID().toString();
    let useragent = req.headers['user-agent'];
    connection.on('error', err => log.error({ err }, 'WebSocket error'));
    connection._heartbeat = true;
    connection.on('pong', () => connection._heartbeat = true);
    let stream = new websocketjsonstream(connection);
    stream.authusername = db.tokenUsername(req.url.substr(1));
    stream.push = function push(chunk, encoding) {
      if (chunk) {
        if (chunk.a === 'ping') {
          return db.ping(chunk.collabid);
        }
        if (chunk.a === 's' && chunk.c === 'files') {
          db.subscribed(connectionid, stream.authusername, useragent, chunk.d);
        } else if (chunk.a === 'bs' && chunk.c === 'files') {
          let b = Array.isArray(chunk.b) ? chunk.b : Object.keys(chunk.b);
          b.forEach(d => db.subscribed(connectionid, stream.authusername, useragent, d));
        } else if (chunk.a === 'u' && chunk.c === 'files') {
          db.unsubscribed(connectionid, chunk.d);
        } else if (chunk.a === 'bu' && chunk.c === 'files') {
          let b = Array.isArray(chunk.b) ? chunk.b : Object.keys(chunk.b);
          b.forEach(d => db.unsubscribed(connectionid, d));
        }
      }
      websocketjsonstream.prototype.push.call(this, chunk, encoding);
    };
    stream._write = function _write(msg, encoding, next) {
      if (this.ws.readyState !== ws.OPEN) {
        return next(new Error('WebSocket must be OPEN to send'));
      }
      websocketjsonstream.prototype._write.call(this, msg, encoding, next);
    };
    connection.on('close', () => db.closed(connectionid));
    db.share.listen(stream);
  });
  setInterval(() => websocketserver.clients.forEach(connection => {
    if (connection.readyState === ws.OPEN) {
      connection.ping();
    }
  }), 1000 * 60 * 5).unref();
  setInterval(() => websocketserver.clients.forEach(connection => {
    if ( ! connection._heartbeat) { return connection.terminate(); }
    connection._heartbeat = false;
  }), 1000 * 60 * 30).unref();
  
  // start listening
  
  servers.web.listen(config.web.https, function() {
    log.info({ address: servers.web.address() }, 'Web server listening');
  });
  servers.websocket.listen(config.web.wss, function() {
    log.info({ address: servers.websocket.address() }, 'WebSocket server listening');
  });
  if (config.web.httpUpdateSite) {
    servers.update = http.createServer(web.createUpdateSite());
    servers.update.listen(config.web.httpUpdateSite, function() {
      log.info({ address: servers.update.address() }, 'HTTP update site listening');
    });
  }
  
})();
