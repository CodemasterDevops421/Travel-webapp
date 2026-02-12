const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.LITEAPI_KEY = process.env.LITEAPI_KEY || 'sandbox_dummy';

const app = require('../server');

test('returns health', async () => {
  const res = await request(app).get('/healthz');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});

test('renders home', async () => {
  const res = await request(app).get('/');
  assert.equal(res.statusCode, 200);
  assert.match(res.text, /Book Your Stay/);
});
