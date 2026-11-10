import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeItems, mustInt, mustMoney, HttpError} from '../src/util.js';

test('normalizes shopping cart items',()=>{
  assert.deepEqual(normalizeItems([{ticketTypeId:3,quantity:2}]),[{ticket_type_id:3,quantity:2}]);
});
test('rejects duplicate ticket types',()=>{
  assert.throws(()=>normalizeItems([{ticketTypeId:1,quantity:1},{ticketTypeId:1,quantity:2}]),HttpError);
});
test('rejects missing or zero quantity',()=>{
  assert.throws(()=>normalizeItems([{ticket_type_id:1,quantity:0}]),HttpError);
});
test('rejects unsafe ids',()=>{
  assert.throws(()=>mustInt('abc'),HttpError);
  assert.throws(()=>mustInt(0),HttpError);
});
test('rejects invalid prices',()=>{
  assert.equal(mustMoney('129.50'),129.5);
  assert.throws(()=>mustMoney(-2),HttpError);
  assert.throws(()=>mustMoney(1.234),HttpError);
});
