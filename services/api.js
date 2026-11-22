function createClient(baseUrl, options = {}) {
  const {
    fetchImpl = globalThis.fetch,
    healthRetryMs = 2500,
    healthTimeoutMs = 8000,
    healthMaxWaitMs = 90000,
    healthCacheMs = 10 * 60 * 1000,
  } = options;
  const wakeListeners = new Set();
  let healthPromise = null;
  let lastHealthyAt = 0;
  let waking = false;
  function setWaking(value) {
    if (waking === value) return;
    waking = value;
    wakeListeners.forEach(listener => listener(waking));
  }
  async function probeHealth(timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}/health`, { signal: controller.signal });
      if (!response.ok) return false;
      const data = await response.json().catch(() => null);
      return data?.status === 'ok';
    } catch { return false; }
    finally { clearTimeout(timer); }
  }
  function waitForHealth(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(Object.assign(new Error('Request aborted.'), { code: 'ABORTED' }));
    let onAbort;
    const aborted = new Promise((resolve, reject) => {
      onAbort = () => reject(Object.assign(new Error('Request aborted.'), { code: 'ABORTED' }));
      signal.addEventListener('abort', onAbort, { once: true });
    });
    return Promise.race([promise, aborted]).finally(() => signal.removeEventListener('abort', onAbort));
  }
  function ensureHealthy(signal) {
    if (Date.now() - lastHealthyAt < healthCacheMs) return Promise.resolve();
    if (!healthPromise) {
      setWaking(true);
      healthPromise = (async () => {
        const deadline = Date.now() + healthMaxWaitMs;
        while (Date.now() < deadline) {
          const timeoutMs = Math.max(1, Math.min(healthTimeoutMs, deadline - Date.now()));
          if (await probeHealth(timeoutMs)) {
            lastHealthyAt = Date.now();
            return;
          }
          const remaining = deadline - Date.now();
          if (remaining > 0) await new Promise(resolve => setTimeout(resolve, Math.min(healthRetryMs, remaining)));
        }
        throw Object.assign(new Error('Il server non è ancora disponibile. Riprova tra poco.'), { code: 'SERVER_UNAVAILABLE' });
      })().finally(() => {
        healthPromise = null;
        setWaking(false);
      });
    }
    return waitForHealth(healthPromise, signal);
  }
  const messages = {
    INVALID_INPUT: 'Controlla i dati inseriti: non sono validi.', INVALID_OPTION: 'Questa opzione non è disponibile.',
    INVALID_DISCARD: 'Non puoi scartare la risposta corretta.', INVALID_PHASE: 'La fase è cambiata. Controlla lo stato aggiornato.',
    ALREADY_SUBMITTED: 'Hai già inviato questa scelta.', NICKNAME_TAKEN: 'Questo nickname è già in uso.',
    ROOM_FULL: 'La lobby è piena.', NEED_THREE_PLAYERS: 'Servono esattamente tre giocatori.',
    FORBIDDEN: 'Questa azione non è consentita al tuo ruolo.', ROOM_NOT_FOUND: 'Lobby non trovata, scaduta oppure codice non valido.',
    MESSAGES_FULL: 'La casella dei messaggi è piena. Riprova più tardi.',
  };
  async function request(path, { token, body, signal } = {}) {
    if (!/^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(baseUrl)) {
      throw Object.assign(new Error('Configura un URL server valido (http o https). Su Android usa l’indirizzo LAN del computer.'), { code: 'CONFIG' });
    }
    await ensureHealthy(signal);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const abort = () => controller.abort();
    if (signal) {
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort);
    }
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(messages[data.error?.code] || `Errore server (${response.status}).`), { code: data.error?.code, status: response.status });
      return data;
    } catch (error) {
      if (error.status || error.code === 'CONFIG') throw error;
      throw Object.assign(new Error('Connessione non riuscita o scaduta. Controlla server e rete, poi riprova.'), { code: 'NETWORK' });
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', abort);
    }
  }
  const normalizeCode = (code) => String(code ?? '').trim().toUpperCase();
  const path = code => `/lobby/${encodeURIComponent(normalizeCode(code))}`;
  return {
    create: (nickname, roundCount = 3) => request('/lobby', { body: { nickname, roundCount } }),
    join: (code, nickname) => request(`${path(code)}/join`, { body: { nickname } }),
    snapshot: (session, signal) => request(path(session.code), { token: session.token, signal }),
    action: (session, action, body = {}) => request(`${path(session.code)}/${action}`, { token: session.token, body }),
    activeUsers: () => request('/active'),
    openLobbies: () => request('/lobbies'),
    coffeeCount: () => request('/coffee'),
    offerCoffee: () => request('/coffee', { body: {} }),
    sendMessage: message => request('/messages', { body: { message } }),
    subscribeWake(listener) {
      wakeListeners.add(listener);
      listener(waking);
      return () => wakeListeners.delete(listener);
    },
  };
}
module.exports = { createClient };