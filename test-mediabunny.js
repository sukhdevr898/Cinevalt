import * as mb from 'mediabunny';

async function run() {
  console.log(Object.keys(mb).filter(k => k.includes('Source')));
}
run().catch(console.error);
