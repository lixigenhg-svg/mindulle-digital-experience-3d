import WebSocket from 'ws';
const URL = 'ws://127.0.0.1:8090/ws';
const once = (payload, waitTypes) => new Promise((resolve, reject) => {
  const ws = new WebSocket(URL, { origin: 'http://localhost:5173' });
  const timer = setTimeout(() => { ws.terminate(); reject(new Error('timeout '+waitTypes.join(','))); }, 5000);
  ws.on('open', () => ws.send(JSON.stringify(payload)));
  ws.on('message', d => {
    const m = JSON.parse(String(d));
    if (waitTypes.includes(m.type)) { clearTimeout(timer); resolve(m); }
    if (m.type === 'error') { clearTimeout(timer); reject(new Error(m.msg || 'error')); }
  });
  ws.on('error', reject);
});
const created = await once({type:'private_create', clientId:'t1', region:'apac'}, ['private_created']);
console.log('created', created.room, created.key, 'private?', created.private);
const roomId = `apac:${created.room}:0`;
const j1 = await once({type:'join', roomId, clientId:'a', name:'A', color:'#fff', key:created.key, region:'apac'}, ['joined','private_locked','private_unknown']);
console.log('join correct:', j1.type, 'private=', j1.private, 'capacity=', j1.capacity);
const bad = await once({type:'join', roomId, clientId:'b', name:'B', color:'#fff', key:'000000', region:'apac'}, ['joined','private_locked','private_unknown']);
console.log('join wrong:', bad.type);
// 3 more with correct key to prove no cap
for (let i=0;i<3;i++) {
  const x = await once({type:'join', roomId, clientId:'c'+i, name:'C'+i, color:'#fff', key:created.key, region:'apac'}, ['joined','room_full','private_locked']);
  console.log('join extra', i, x.type, x.count ?? '');
}
