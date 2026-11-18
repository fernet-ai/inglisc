function createClient(baseUrl) {
  const messages = {
    INVALID_INPUT: 'Controlla i dati inseriti: non sono validi.', INVALID_OPTION: 'Questa opzione non è disponibile.',
    INVALID_DISCARD: 'Non puoi scartare la risposta corretta.', INVALID_PHASE: 'La fase è cambiata. Controlla lo stato aggiornato.',
    ALREADY_SUBMITTED: 'Hai già inviato questa scelta.', NICKNAME_TAKEN: 'Questo nickname è già in uso.',
    ROOM_FULL: 'La lobby è piena.', NEED_THREE_PLAYERS: 'Servono esattamente tre giocatori.',
    FORBIDDEN: 'Questa azione non è consentita al tuo ruolo.', ROOM_NOT_FOUND: 'Lobby non trovata, scaduta oppure codice non valido.',
  };
  async function request(path, { token, body, signal } = {}) {
    if (!/^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(baseUrl)) {
      throw Object.assign(new Error('Configura un URL server valido (http o https). Su Android usa l’indirizzo LAN del computer.'), { code: 'CONFIG' });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const abort = () => controller.abort();
    if (signal) {
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort);
    }
    try {
      const response = await fetch(`${baseUrl}${path}`, {
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
  };
}
module.exports = { createClient };