const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('../services/api');
const { createApp } = require('../../inglisc-be/server');

test('frontend API client plays three rounds, rematches and leaves', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const api = createClient(`http://127.0.0.1:${server.address().port}`);
  try {
    const host = await api.create('Ada', 6);
    assert.equal((await api.activeUsers()).activeUsers >= 1, true);
    const code = host.snapshot.code;
    const bob = await api.join(code.toLowerCase(), 'Bob');
    const cat = await api.join(code, 'Cat');
    const players = [host, bob, cat].map(p => ({ token: p.token, code, id: p.playerId }));
    await assert.rejects(api.join(code, 'Dan'), { code: 'ROOM_FULL' });
    assert.equal(host.snapshot.roundCount, 6);
    await api.action(players[0], 'start');
    for (let round = 0; round < 6; round++) {
      const master = players[round % 3];
      const guessers = players.filter(p => p !== master);
      let state = (await api.snapshot(master)).snapshot;
      assert.equal(state.phase, 'setup');
      assert.equal(state.round.wordmasterId, master.id);
      await api.action(master, 'setup', { prompt: `gatto ${round}`, options: ['cat', 'dog', 'bird', 'fish', 'horse'], correctIndex: 0 });
      state = (await api.snapshot(guessers[0])).snapshot;
      assert.equal(state.round.result, null);
      assert.equal(JSON.stringify(state.round).includes('correctOptionId'), false);
      const catId = state.round.options.find(o => o.text === 'cat').id;
      const dogId = state.round.options.find(o => o.text === 'dog').id;
      await api.action(guessers[0], 'initial-choice', { optionId: dogId });
      assert.deepEqual((await api.snapshot(guessers[1])).snapshot.round.initialChoices, []);
      await api.action(guessers[1], 'initial-choice', { optionId: catId });
      assert.equal((await api.snapshot(master)).snapshot.round.initialChoices.length, 2);
      await assert.rejects(api.action(master, 'discard', { optionId: catId }), { code: 'INVALID_DISCARD' });
      await api.action(master, 'discard', { optionId: dogId });
      await assert.rejects(api.action(guessers[0], 'confirm', { optionId: dogId }), { code: 'INVALID_OPTION' });
      await api.action(guessers[0], 'confirm', { optionId: catId });
      await api.action(guessers[1], 'confirm', { optionId: catId });
      state = (await api.snapshot(players[0])).snapshot;
      assert.equal(state.phase, 'round-result');
      assert.equal(state.round.result.correctOptionId, catId);
      assert.deepEqual(state.round.result.guesses.map(g => g.points).sort(), [1, 3]);
      await api.action(players[0], 'advance');
    }
    assert.equal((await api.snapshot(players[0])).snapshot.phase, 'game-result');
    await api.action(players[0], 'rematch');
    assert.equal((await api.snapshot(players[0])).snapshot.phase, 'setup');
    await api.action(players[1], 'leave');
    const waiting = (await api.snapshot(players[0])).snapshot;
    assert.equal(waiting.phase, 'waiting');
    assert.equal(waiting.lastEvent.type, 'game_aborted');
    assert.ok(waiting.players.every(p => p.score === 0));
    await assert.rejects(api.snapshot(players[1]), { code: 'UNAUTHORIZED' });
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('configuration and network errors do not expose credentials', async () => {
  await assert.rejects(createClient('').create('a'), { code: 'CONFIG' });
  await assert.rejects(createClient('http://127.0.0.1:1').snapshot({ code: 'ABC234', token: 'secret' }), error => error.code === 'NETWORK' && !error.message.includes('secret'));
});