const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatOption } = require('../services/formatOption');

test('formats options consistently without changing the source', () => {
  for (const value of ['hELLO wORLD', 'HELLO WORLD', 'hello world']) {
    assert.equal(formatOption(value), 'Hello world');
  }
  assert.equal(formatOption('ÈCLAIR'), 'Èclair');
  assert.equal(formatOption(''), '');
});