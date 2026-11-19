// @vitest-environment node
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { expect, test } from 'vitest';
import WebSocket from 'ws';
import type { ActionEvent } from '../src/actions';

const actions = {
  bow_start: true, bow_stop: true, pray: true, beads_start: true, beads_stop: true,
  wood_hit: true, sit_start: true, sit_stop: true, kowtow: true, incense: true, offer: true,
} satisfies Record<ActionEvent, true>;

test('production WebSocket broadcasts all client actions in the same room only', async () => {
  const origin = 'http://localhost';
  const signal = AbortSignal.timeout(7000);
  const server = spawn(process.execPath, ['server/ws-server.mjs'], {
    env: { PORT: '0', ALLOW_ORIGIN: origin },
  });
  const sockets: WebSocket[] = [];

  async function receive(socket: WebSocket) {
    const [data] = await once(socket, 'message', { signal });
    return JSON.parse(data.toString());
  }

  async function join(url: string, clientId: string, roomId: string) {
    const socket = new WebSocket(url, { origin });
    sockets.push(socket);
    await once(socket, 'open', { signal });
    const joined = receive(socket);
    socket.send(JSON.stringify({ type: 'join', clientId, roomId }));
    expect(await joined).toMatchObject({ type: 'joined', selfId: clientId, roomId });
    return socket;
  }

  try {
    const [stdout] = await once(server.stdout, 'data', { signal });
    const port = /on :(\d+)\/ws/.exec(stdout.toString())?.[1];
    expect(port).toBeTruthy();
    const url = 'ws://127.0.0.1:' + port + '/ws';
    const sender = await join(url, 'sender', 'apac:contract:0');
    const peer = await join(url, 'peer', 'apac:contract:0');
    const other = await join(url, 'other', 'apac:contract:1');
    const isolated: unknown[] = [];
    other.on('message', data => isolated.push(JSON.parse(data.toString())));
    const events = Object.keys(actions);
    const received: unknown[] = [];
    peer.on('message', data => received.push(JSON.parse(data.toString())));

    for (const action of ['unknown_action', ...events]) {
      sender.send(JSON.stringify({ type: 'action', action }));
    }
    await expect.poll(() => received.length, { timeout: 4000 }).toBe(events.length);
    expect(received).toEqual(events.map(action => ({ type: 'peer_action', id: 'sender', action })));

    const pong = receive(other);
    other.send(JSON.stringify({ type: 'ping' }));
    expect(await pong).toEqual({ type: 'pong' });
    expect(isolated).toEqual([{ type: 'pong' }]);
  } finally {
    for (const socket of sockets) socket.terminate();
    const exited = once(server, 'exit');
    server.kill('SIGKILL');
    await exited;
  }
}, 9000);
