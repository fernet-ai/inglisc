import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { setAudioModeAsync } from 'expo-audio';

const NOTES = {
  tap: [620],
  success: [660, 880],
  reveal: [523, 659, 784],
};

let player = null;
let enabled = true;
let nativeSoundsPromise = null;
let webAudioContext = null;
let nativeSoundUris = null;

function makeWave(frequencies) {
  const sampleRate = 22050;
  const samplesPerNote = Math.floor(sampleRate * 0.095);
  const gap = Math.floor(sampleRate * 0.025);
  const sampleCount = frequencies.length * samplesPerNote + (frequencies.length - 1) * gap;
  const bytes = new Uint8Array(44 + sampleCount * 2);
  const view = new DataView(bytes.buffer);
  const writeText = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
  };

  writeText(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  let cursor = 0;
  frequencies.forEach((frequency, noteIndex) => {
    for (let i = 0; i < samplesPerNote; i += 1) {
      const fade = Math.min(1, i / 120, (samplesPerNote - i - 1) / 180);
      const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * Math.max(0, fade) * 0.18;
      view.setInt16(44 + cursor * 2, Math.round(sample * 32767), true);
      cursor += 1;
    }
    if (noteIndex < frequencies.length - 1) cursor += gap;
  });
  return bytes;
}

async function prepareNativeSounds() {
  if (nativeSoundsPromise) return nativeSoundsPromise;
  nativeSoundsPromise = (async () => {
    const directory = new Directory(Paths.cache, 'inglisc-sounds');
    directory.create({ idempotent: true, intermediates: true });
    const sounds = {};
    for (const [name, frequencies] of Object.entries(NOTES)) {
      const file = new File(directory, `${name}.wav`);
      if (!file.exists) {
        file.create({ intermediates: true });
        await file.write(makeWave(frequencies));
      }
      sounds[name] = file.uri;
    }
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    nativeSoundUris = sounds;
    return sounds;
  })().catch(error => {
    nativeSoundsPromise = null;
    throw error;
  });
  return nativeSoundsPromise;
}

export function attachSoundPlayer(audioPlayer) {
  player = audioPlayer;
  if (Platform.OS !== 'web') return prepareNativeSounds().catch(() => null);
  return Promise.resolve(null);
}

export function setSoundEnabled(value) {
  enabled = value;
}

function playWebSound(effect) {
  if (typeof globalThis === 'undefined') return;
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    webAudioContext ||= new AudioContextClass();
    if (webAudioContext.state === 'suspended') void webAudioContext.resume();
    const now = webAudioContext.currentTime;
    const frequencies = NOTES[effect] || NOTES.tap;
    frequencies.forEach((frequency, index) => {
      const start = now + index * 0.12;
      const oscillator = webAudioContext.createOscillator();
      const gain = webAudioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.095);
      oscillator.connect(gain);
      gain.connect(webAudioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.1);
    });
  } catch {
    // Audio is optional; a browser policy or unsupported device must not interrupt play.
  }
}

export async function playUiSound(effect = 'tap') {
  if (!enabled) return;
  if (Platform.OS === 'web') {
    playWebSound(effect);
    return;
  }
  if (!player) return;
  try {
    const sounds = nativeSoundUris || await prepareNativeSounds();
    const uri = sounds?.[effect] || sounds?.tap;
    if (!uri) return;
    player.replace({ uri });
    player.play();
  } catch {
    // Keep sound effects best-effort so an audio failure never blocks a game action.
  }
}