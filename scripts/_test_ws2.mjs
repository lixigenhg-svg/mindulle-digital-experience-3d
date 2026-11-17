import { WebSocket } from 'ws';
const ORIGIN = { headers: { Origin: 'https://3d.mindulle.kr' } };
const open = (port, id, name, headers = ORIGIN) => new Promise((res, rej) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, headers);
  ws.on('open', () => res(ws)); ws.on('error', rej);
});
const wait = (ws, type, ms = 3000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout ' + type)), ms);
  const h = raw => { const m = JSON.parse(raw.toString()); if (m.type === type) { clearTimeout(t); ws.off('message', h); res(m); } };
  ws.on('message', h);
});

// 满员：CAPACITY=2，第 3 人应收到 room_full
const c1 = await open(8092, 'C1', '일'); c1.send(JSON.stringify({ type:'join', clientId:'C1', roomId:'kr:temple:0', name:'일' }));
await wait(c1, 'joined');
const c2 = await open(8092, 'C2', '이'); c2.send(JSON.stringify({ type:'join', clientId:'C2', roomId:'kr:temple:0', name:'이' }));
await wait(c2, 'joined');
const c3 = await open(8092, 'C3', '삼');
c3.send(JSON.stringify({ type:'join', clientId:'C3', roomId:'kr:temple:0', name:'삼' }));
const full = await wait(c3, 'room_full');
console.log('第 3 人收到:', full.type, '→ 客户端会 instance+1 去下一殿');

// 换殿：C3 改 instance=1
const c3b = await open(8092, 'C3b', '삼'); c3b.send(JSON.stringify({ type:'join', clientId:'C3b', roomId:'kr:temple:1', name:'삼' }));
const j3 = await wait(c3b, 'joined');
console.log('换到 1 号殿成功:', j3.roomId, 'count:', j3.count);

// 无 Origin 头 → 应被 1008 拒绝
const bad = new WebSocket('ws://127.0.0.1:8092/ws');
await new Promise(res => { bad.on('close', code => { console.log('无 Origin 连接被关闭, code =', code); res(); }); bad.on('open', () => bad.send(JSON.stringify({type:'join',clientId:'X',roomId:'kr:temple:0'}))); });
c1.close(); c2.close();
console.log('--- 满员换房 & 来源拦截 OK ---');
process.exit(0);
