import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createClient } from './api';

export function getServerUrl() {
  const explicit = process.env.EXPO_PUBLIC_SERVER_URL || Constants.expoConfig?.extra?.SERVER_URL;
  if (explicit) return explicit.trim().replace(/\/+$/, '');
  if (Platform.OS === 'web') return 'http://localhost:3000';
  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return `http://${host}:3000`;
  }
  return '';
}

export const serverUrl = getServerUrl();
export const api = createClient(serverUrl);
