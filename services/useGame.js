import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, serverUrl } from './LobbyService';

const SESSION = '@inglisc/session-v1';
const MEMO = '@inglisc/memo-v1';
const SECRET = '@inglisc/wordmaster-v1';

export default function useGame() {
  const [session, setSession] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [memo, setMemo] = useState([]);
  const [secret, setSecret] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [openLobbies, setOpenLobbies] = useState([]);
  const lock = useRef(false);
  const poll = useRef(null);
  const current = useRef(null);
  const revision = useRef(-1);

  const apply = useCallback((value) => {
    if (value && value.rev >= revision.current) {
      revision.current = value.rev;
      setSnapshot(value);
    }
  }, []);
  const forget = useCallback(async (message = '') => {
    current.current = null;
    revision.current = -1;
    setSession(null); setSnapshot(null); setSecret(null); setUncertain(false); setError(message);
    try { await AsyncStorage.multiRemove([SESSION, SECRET]); } catch { setError('Impossibile aggiornare la memoria locale.'); }
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [saved, words, savedSecret] = await AsyncStorage.multiGet([SESSION, MEMO, SECRET]);
        const stored = saved[1] ? JSON.parse(saved[1]) : null;
        const list = words[1] ? JSON.parse(words[1]) : [];
        const known = savedSecret[1] ? JSON.parse(savedSecret[1]) : null;
        if (!live) return;
        if (Array.isArray(list)) setMemo(list);
        if (stored?.code && stored?.token && stored?.url) {
          current.current = stored; setSession(stored); setSecret(known);
          if (stored.url !== serverUrl) setError('Il server configurato è cambiato: ripristina l’URL originale oppure rimuovi la sessione locale.');
        }
      } catch { if (live) setError('Impossibile leggere la memoria locale.'); }
      finally { if (live) setReady(true); }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer;
    let active = AppState.currentState === 'active';

    async function tick() {
      if (stopped || !active) return;
      try {
        const [coffeeResult, lobbiesResult] = await Promise.allSettled([api.coffeeCount(), api.openLobbies()]);
        if (!stopped && coffeeResult.status === 'fulfilled' && Number.isInteger(coffeeResult.value.coffeeCount)) setCoffeeCount(coffeeResult.value.coffeeCount);
        if (!stopped && lobbiesResult.status === 'fulfilled' && Array.isArray(lobbiesResult.value.lobbies)) setOpenLobbies(lobbiesResult.value.lobbies);
      } catch {}
      if (!stopped && active) timer = setTimeout(tick, 5000);
    }

    const sub = AppState.addEventListener('change', state => {
      active = state === 'active';
      clearTimeout(timer);
      if (active) tick();
    });
    tick();
    return () => { stopped = true; clearTimeout(timer); sub.remove(); };
  }, []);

  const offerCoffee = useCallback(async () => {
    try {
      const data = await api.offerCoffee();
      if (Number.isInteger(data.coffeeCount)) setCoffeeCount(data.coffeeCount);
      return data.coffeeCount;
    } catch { return null; }
  }, []);

  const lost = useCallback(async (e) => {
    if (current.current && (e.code === 'ROOM_NOT_FOUND' || e.code === 'UNAUTHORIZED' || e.status === 401)) {
      await forget('La sessione non è più valida: la lobby potrebbe essere scaduta o il server riavviato.');
      return true;
    }
    return false;
  }, [forget]);

  const refresh = useCallback(async (s, signal) => {
    if (!s || current.current !== s) return false;
    if (s.url !== serverUrl) { setError('Il server configurato è cambiato: ripristina l’URL originale oppure rimuovi la sessione locale.'); return false; }
    try {
      const data = await api.snapshot(s, signal);
      if (current.current === s && !signal?.aborted) { apply(data.snapshot); setUncertain(false); }
      return true;
    } catch (e) {
      if (current.current !== s || signal?.aborted) return;
      if (!await lost(e)) setError(e.message);
      return false;
    }
  }, [apply, lost]);

  useEffect(() => {
    if (!session || session.url !== serverUrl) return;
    let active = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    let stopped = false, timer, failures = 0, controller;
    async function tick() {
      if (stopped || !active) return;
      if (lock.current || poll.current) { timer = setTimeout(tick, 500); return; }
      controller = new AbortController();
      const work = refresh(session, controller.signal);
      poll.current = work;
      const ok = await work;
      if (poll.current === work) poll.current = null;
      if (!stopped && active) {
        failures = ok ? 0 : Math.min(failures + 1, 4);
        timer = setTimeout(tick, ok ? 2000 : 2000 * 2 ** failures);
      }
    }
    const sub = AppState.addEventListener('change', state => {
      active = state === 'active';
      clearTimeout(timer);
      if (!active && controller) controller.abort();
      if (active && !poll.current) tick();
    });
    tick();
    return () => { stopped = true; clearTimeout(timer); if (controller) controller.abort(); sub.remove(); };
  }, [session, refresh]);

  useEffect(() => {
    let stopped = false;
    let timer;
    let active = AppState.currentState === 'active';

    async function tick() {
      if (stopped || !active) return;
      try {
        const data = await api.activeUsers();
        if (!stopped) setActiveUsers(Number.isInteger(data.activeUsers) ? data.activeUsers : 0);
      } catch {}
      if (!stopped && active) timer = setTimeout(tick, 5000);
    }

    const sub = AppState.addEventListener('change', state => {
      active = state === 'active';
      clearTimeout(timer);
      if (active) tick();
    });
    tick();
    return () => { stopped = true; clearTimeout(timer); sub.remove(); };
  }, []);

  const run = useCallback(async (fn) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError('');
    try {
      if (poll.current) await poll.current;
      return await fn();
    } catch (e) {
      if (!await lost(e)) {
        if (e.code === 'NETWORK' && current.current) setUncertain(true);
        setError(`${e.message}${e.code === 'NETWORK' ? ' L’azione potrebbe essere stata ricevuta: verifica lo stato prima di riprovare.' : ''}`);
        const s = current.current;
        if (s && s.url === serverUrl) {
          try { const data = await api.snapshot(s); if (current.current === s) { apply(data.snapshot); setUncertain(false); } } catch (refreshError) { await lost(refreshError); }
        }
      }
      return false;
    } finally { lock.current = false; setBusy(false); }
  }, [apply, lost]);

  const enter = (code, nickname, roundCount = 3) => run(async () => {
    const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (code && !/^[A-Z0-9]{6}$/i.test(normalizedCode)) {
      throw Object.assign(new Error('Il codice lobby deve essere di 6 caratteri: lettere e numeri senza spazi.'), { code: 'INVALID_INPUT' });
    }
    const data = normalizedCode ? await api.join(normalizedCode, nickname) : await api.create(nickname, roundCount);
    const s = { code: data.snapshot.code, token: data.token, url: serverUrl };
    // Keep the live session even if persistence fails: the player can still leave.
    current.current = s; revision.current = -1; setSession(s); apply(data.snapshot);
    try { await AsyncStorage.setItem(SESSION, JSON.stringify(s)); }
    catch { setError('Sessione attiva, ma non salvata sul dispositivo: non sarà ripristinata.'); }
    return true;
  });
  const action = (name, body) => run(async () => {
    if (uncertain) throw new Error('Aggiorna lo stato prima di inviare un’altra azione.');
    const s = current.current;
    if (!s || s.url !== serverUrl) throw new Error('Server della sessione non disponibile.');
    if (name === 'setup') {
      const known = { code: s.code, playerId: snapshot.me, roundId: snapshot.round.id, prompt: body.prompt.normalize('NFKC').trim(), text: body.options[body.correctIndex].normalize('NFKC').trim() };
      setSecret(known);
      try { await AsyncStorage.setItem(SECRET, JSON.stringify(known)); } catch { setError('La soluzione non è stata salvata localmente.'); }
    }
    const data = await api.action(s, name, body);
    if (name === 'leave') { await forget(); return true; }
    if (current.current === s) apply(data.snapshot);
    return true;
  });
  const updateMemo = async (items) => {
    try { await AsyncStorage.setItem(MEMO, JSON.stringify(items)); setMemo(items); }
    catch { setError('Impossibile salvare il memo sul dispositivo.'); }
  };
  const saveWord = (result) => {
    const text = result.options.find(o => o.id === result.correctOptionId)?.text;
    if (!text) return;
    if (!memo.some(w => w.prompt === result.prompt && w.text === text)) updateMemo([{ prompt: result.prompt, text }, ...memo]);
  };
  const retry = () => run(async () => { await refresh(current.current); return true; });
  return { session, snapshot, ready, busy: busy || uncertain, error, setError, enter, action, forget, refresh: retry, memo, saveWord, removeWord: index => updateMemo(memo.filter((_, i) => i !== index)), secret, activeUsers, coffeeCount, offerCoffee, openLobbies };
}