/**
 * Low-level storage adapter for native and web platforms.
 * 
 * Uses Capacitor Preferences on native platforms and localStorage on web.
 * This provides a unified async interface for both platforms.
 */

import { Capacitor } from '@capacitor/core';

interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

class WebStorage implements StorageAdapter {
  async get(key: string) {
    return localStorage.getItem(key);
  }
  
  async set(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  
  async remove(key: string) {
    localStorage.removeItem(key);
  }
  
  async clear() {
    localStorage.clear();
  }
  
  async keys() {
    return Object.keys(localStorage);
  }
}

class NativeStorage implements StorageAdapter {
  private prefs: any = null;
  private fallbackToWeb = false;
  private webStorage = new WebStorage();
  
  private async getPrefs() {
    if (this.fallbackToWeb) return null;
    if (!this.prefs) {
      try {
        const mod = await import('@capacitor/preferences');
        this.prefs = mod.Preferences;
        // Test that it actually works
        await this.prefs.get({ key: '__test__' });
      } catch (e) {
        console.warn('[storageAdapter] Preferences not available, falling back to localStorage', e);
        this.fallbackToWeb = true;
        return null;
      }
    }
    return this.prefs;
  }
  
  async get(key: string) {
    const prefs = await this.getPrefs();
    if (!prefs) return this.webStorage.get(key);
    const { value } = await prefs.get({ key });
    return value;
  }
  
  async set(key: string, value: string) {
    const prefs = await this.getPrefs();
    if (!prefs) return this.webStorage.set(key, value);
    await prefs.set({ key, value });
  }
  
  async remove(key: string) {
    const prefs = await this.getPrefs();
    if (!prefs) return this.webStorage.remove(key);
    await prefs.remove({ key });
  }
  
  async clear() {
    const prefs = await this.getPrefs();
    if (!prefs) return this.webStorage.clear();
    await prefs.clear();
  }
  
  async keys() {
    const prefs = await this.getPrefs();
    if (!prefs) return this.webStorage.keys();
    const { keys } = await prefs.keys();
    return keys;
  }
}

export const storageAdapter: StorageAdapter = Capacitor.isNativePlatform()
  ? new NativeStorage()
  : new WebStorage();
