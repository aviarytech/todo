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
  
  private async getPrefs() {
    if (!this.prefs) {
      const mod = await import('@capacitor/preferences');
      this.prefs = mod.Preferences;
    }
    return this.prefs;
  }
  
  async get(key: string) {
    const prefs = await this.getPrefs();
    const { value } = await prefs.get({ key });
    return value;
  }
  
  async set(key: string, value: string) {
    const prefs = await this.getPrefs();
    await prefs.set({ key, value });
  }
  
  async remove(key: string) {
    const prefs = await this.getPrefs();
    await prefs.remove({ key });
  }
  
  async clear() {
    const prefs = await this.getPrefs();
    await prefs.clear();
  }
  
  async keys() {
    const prefs = await this.getPrefs();
    const { keys } = await prefs.keys();
    return keys;
  }
}

export const storageAdapter: StorageAdapter = Capacitor.isNativePlatform()
  ? new NativeStorage()
  : new WebStorage();
