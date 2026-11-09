import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanName,repeatPalette,validateDesign,initialDesign,orderUrl} from './design.ts';
test('normalizes Albanian letters, rejects markup, limits long input',()=>{assert.equal(cleanName('çelë'),'ÇELË');assert.equal(cleanName('a1!💚'),'A');assert.equal(cleanName('a'.repeat(50)).length,16)});
test('palette repeats across letters without consuming colors on spaces',()=>assert.deepEqual(repeatPalette('A BCD',[1,2]),[1,0,2,1,2]));
test('invalid saved data cannot corrupt the design',()=>{assert.deepEqual(validateDesign({}),initialDesign);assert.deepEqual(validateDesign({...initialDesign,colors:[100,-1]}).colors,[1,1,1,1,1])});
test('WhatsApp uses requested recipient and specifies each repeated letter',()=>{const url=new URL(orderUrl(initialDesign));assert.equal(url.pathname,'/355684069999');const text=url.searchParams.get('text');assert.ok(text.includes('1. E: Bezhë'));assert.ok(text.includes('5. A: Bezhë'));assert.ok(text.includes('Madhësia: 10 cm'))});
