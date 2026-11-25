import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {builtIn} from '../src/catalog.mjs';
const actual=JSON.parse(readFileSync(process.argv[2],'utf8'));
const sort=a=>[...a].sort((x,y)=>x.id.localeCompare(y.id));
assert.deepEqual(sort(actual),sort(builtIn));console.log('PostgreSQL seed / frontend catalog parity verified');
