import { WebSocket } from 'ws';
const ORIGIN = { headers: { Origin: 'https://mindulle.kr' } };
const open = (port, id, name) => new Promise((res, rej) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, ORIGIN);
  ws.on('open', () => res(ws));
  ws.on('error', rej);
});
const wait = (ws, type, ms = 3000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout ' + type)), ms);
  const h = raw => { const m = JSON.parse(raw.toString()); if (m.type === type) { clearTimeout(t); ws.off('message', h); res(m); } };
  ws.on('message', h);
});

// ---- 1) 正常房间：3 人，互相看见，能广播移动
const a = await open(8090, 'A1', '김스님');
const b = await open(8090, 'B1', '박보살');
a.send(JSON.stringify({ type: 'join', clientId: 'A1', roomId: 'kr:temple:0', name: '김스님', color: '#8a6d3b' }));
const ja = await wait(a, 'joined');
console.log('A1 joined -> peers:', ja.peers.length, 'count:', ja.count);
b.send(JSON.stringify({ type: 'join', clientId: 'B1', roomId: 'kr:temple:0', name: '박보살', color: '#123456' }));
const jb = await wait(b, 'joined');
console.log('B1 joined -> peers:', jb.peers.length, 'count:', jb.count);
const pj = await wait(a, 'peer_join');
console.log('A1 收到 peer_join:', pj.name);
b.send(JSON.stringify({ type: 'move', x: 1.5, z: 2.0, rot: 0.3, anim: 'walk' }));
const mv = await wait(a, 'peer_move');
console.log('A1 收到 peer_move:', mv.x, mv.z, mv.anim);
b.send(JSON.stringify({ type: 'move', x: 999999, z: NaN }));
const mv2 = await wait(a, 'peer_move');
console.log('越界坐标被 clamp 到:', mv2.x, mv2.z);
a.close(); b.close();
console.log('--- 正常房间 OK ---');
process.exit(0);
