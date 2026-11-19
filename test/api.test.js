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
    assert.equal((await api.coffeeCount()).coffeeCount, 0);
    assert.equal((await api.offerCoffee()).coffeeCount, 1);
    assert.equal((await api.coffeeCount()).coffeeCount, 1);
    assert.equal((await api.openLobbies()).lobbies[0].creatorNickname, 'Ada');
    assert.equal((await api.openLobbies()).lobbies[0].roundCount, 6);
    assert.equal((await api.openLobbies()).lobbies[0].participantCount, 1);
    assert.equal((await api.openLobbies()).lobbies[0].joinable, true);
    const code = host.snapshot.code;
    const bob = await api.join(code.toLowerCase(), 'Bob');
    assert.equal((await api.openLobbies()).lobbies[0].participantCount, 2);
    const cat = await api.join(code, 'Cat');
    assert.equal((await api.openLobbies()).lobbies[0].participantCount, 3);
    assert.equal((await api.openLobbies()).lobbies[0].joinable, false);
    const players = [host, bob, cat].map(p => ({ token: p.token, code, id: p.playerId }));
    await assert.rejects(api.join(code, 'Dan'), { code: 'ROOM_FULL' });
    assert.equal(host.snapshot.roundCount, 6);
    await api.action(players[0], 'start');
    const playingLobby = (await api.openLobbies()).lobbies[0];
    assert.equal(playingLobby.isInProgress, true);
    assert.equal(playingLobby.joinable, false);
    assert.deepEqual(playingLobby.participantNames, ['Ada', 'Bob', 'Cat']);
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
  await assert.rejects(createClient('http://127.0.0.1:1', { healthRetryMs: 0, healthTimeoutMs: 1, healthMaxWaitMs: 1 }).snapshot({ code: 'ABC234', token: 'secret' }), error => error.code === 'SERVER_UNAVAILABLE' && !error.message.includes('secret'));
});

test('API requests wait for a shared health check and expose the waking state', async () => {
  const paths = [];
  const healthHeaders = [];
  const wakeStates = [];
  let healthChecks = 0;
  const client = createClient('https://backend.example', {
    fetchImpl: async (url, options) => {
      const path = new URL(url).pathname;
      paths.push(path);
      if (path === '/health') {
        healthHeaders.push(options.headers);
        healthChecks++;
        return healthChecks === 1
          ? { ok: false, status: 503, json: async () => ({}) }
          : { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
      }
      return { ok: true, status: 200, json: async () => ({ lobbies: [] }) };
    },
    healthRetryMs: 0,
    healthTimeoutMs: 100,
    healthMaxWaitMs: 1000,
    healthCacheMs: 60000,
  });
  const unsubscribe = client.subscribeWake(waking => wakeStates.push(waking));

  const [lobbies, users] = await Promise.all([client.openLobbies(), client.activeUsers()]);

  assert.deepEqual(lobbies.lobbies, []);
  assert.deepEqual(users.lobbies, []);
  assert.equal(healthChecks, 2);
  assert.deepEqual(healthHeaders, [undefined, undefined]);
  assert.equal(paths.filter(path => path === '/lobbies').length, 1);
  assert.equal(paths.filter(path => path === '/active').length, 1);
  assert.deepEqual(wakeStates, [false, true, false]);
  unsubscribe();
});