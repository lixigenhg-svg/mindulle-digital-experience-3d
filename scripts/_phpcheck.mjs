import parser from 'php-parser';
import { readFileSync } from 'fs';
const files = process.argv.slice(2);
const engine = new parser({
  parser: { extractDoc: false, suppressErrors: false, version: 704 },
  ast: { withPositions: true },
});
let bad = 0;
for (const f of files) {
  try {
    engine.parseCode(readFileSync(f, 'utf8'), f);
    console.log('OK   ', f);
  } catch (e) {
    bad++;
    console.log('FAIL ', f, '->', String(e.message).slice(0, 200));
  }
}
process.exit(bad ? 1 : 0);
