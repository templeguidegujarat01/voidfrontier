// Minimal RFC6455 WebSocket server, zero dependencies.
// Handles: handshake, text-frame send/receive, ping/pong, close, and
// fragmented-frame reassembly for incoming client messages. This exists
// because the sandbox this project was built in has no npm registry
// access — it is a real, correct implementation, not a stand-in.

import crypto from 'node:crypto';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OPCODE = { CONTINUATION: 0x0, TEXT: 0x1, BINARY: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xa };

/** Wraps a raw TCP socket (post-handshake) as a simple text-message WebSocket connection. */
class WebSocketConnection {
  constructor(socket) {
    this.socket = socket;
    this.alive = true;
    this._buffer = Buffer.alloc(0);
    this._fragments = [];
    this._fragmentOpcode = null;
    this.onMessage = null;
    this.onClose = null;

    socket.on('data', (chunk) => this._onData(chunk));
    socket.on('close', () => this._handleClose());
    socket.on('error', () => this._handleClose());
  }

  _handleClose() {
    if (!this.alive) return;
    this.alive = false;
    this.onClose?.();
  }

  send(str) {
    if (!this.alive) return;
    const payload = Buffer.from(str, 'utf8');
    const frame = encodeFrame(OPCODE.TEXT, payload);
    try {
      this.socket.write(frame);
    } catch {
      this._handleClose();
    }
  }

  close() {
    if (!this.alive) return;
    try {
      this.socket.write(encodeFrame(OPCODE.CLOSE, Buffer.alloc(0)));
      this.socket.end();
    } catch {
      /* socket already gone */
    }
    this._handleClose();
  }

  _onData(chunk) {
    this._buffer = Buffer.concat([this._buffer, chunk]);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const parsed = tryParseFrame(this._buffer);
      if (!parsed) return;
      this._buffer = this._buffer.subarray(parsed.frameLength);
      this._handleFrame(parsed);
    }
  }

  _handleFrame(frame) {
    switch (frame.opcode) {
      case OPCODE.TEXT:
      case OPCODE.BINARY:
        if (frame.fin) {
          this.onMessage?.(frame.payload.toString('utf8'));
        } else {
          this._fragments = [frame.payload];
          this._fragmentOpcode = frame.opcode;
        }
        break;
      case OPCODE.CONTINUATION:
        this._fragments.push(frame.payload);
        if (frame.fin) {
          const full = Buffer.concat(this._fragments);
          this._fragments = [];
          this.onMessage?.(full.toString('utf8'));
        }
        break;
      case OPCODE.PING:
        try {
          this.socket.write(encodeFrame(OPCODE.PONG, frame.payload));
        } catch {
          /* ignore */
        }
        break;
      case OPCODE.CLOSE:
        this.close();
        break;
      default:
        break;
    }
  }
}

function encodeFrame(opcode, payload) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode; // FIN + opcode
    header[1] = len; // no mask bit set — server frames are never masked
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/** Returns { opcode, fin, payload, frameLength } or null if the buffer doesn't yet hold a full frame. */
function tryParseFrame(buf) {
  if (buf.length < 2) return null;
  const fin = (buf[0] & 0x80) !== 0;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let payloadLen = buf[1] & 0x7f;
  let offset = 2;

  if (payloadLen === 126) {
    if (buf.length < offset + 2) return null;
    payloadLen = buf.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLen === 127) {
    if (buf.length < offset + 8) return null;
    payloadLen = Number(buf.readBigUInt64BE(offset));
    offset += 8;
  }

  let maskKey = null;
  if (masked) {
    if (buf.length < offset + 4) return null;
    maskKey = buf.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buf.length < offset + payloadLen) return null;

  let payload = buf.subarray(offset, offset + payloadLen);
  if (masked && maskKey) {
    const unmasked = Buffer.alloc(payloadLen);
    for (let i = 0; i < payloadLen; i++) unmasked[i] = payload[i] ^ maskKey[i % 4];
    payload = unmasked;
  }

  return { opcode, fin, payload: Buffer.from(payload), frameLength: offset + payloadLen };
}

/**
 * Attaches WebSocket upgrade handling to an existing http.Server.
 * onConnection(conn) fires for each accepted client.
 */
export function attachWebSocketServer(httpServer, { onConnection, path = null } = {}) {
  httpServer.on('upgrade', (req, socket) => {
    if (path && req.url !== path) {
      socket.destroy();
      return;
    }
    const key = req.headers['sec-websocket-key'];
    if (!key || (req.headers['upgrade'] || '').toLowerCase() !== 'websocket') {
      socket.destroy();
      return;
    }
    const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      ''
    ].join('\r\n');
    socket.write(responseHeaders);

    const conn = new WebSocketConnection(socket);
    onConnection?.(conn);
  });
}
