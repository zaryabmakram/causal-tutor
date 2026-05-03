"use client";

import { useEffect, useState } from "react";

export const STORAGE_KEY = "openai_api_key";

const isBrowser = () => typeof window !== "undefined";

export function getStoredKey(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveKey(key: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, key);
    // Notify same-tab subscribers (storage event only fires across tabs by default)
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: key }));
  } catch {
    /* ignore */
  }
}

export function clearKey(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: null }));
  } catch {
    /* ignore */
  }
}

/** Returns headers to merge into fetch/axios requests for any OpenAI-using endpoint. */
export function getApiHeaders(): Record<string, string> {
  const key = getStoredKey();
  return key ? { "X-OpenAI-Key": key } : {};
}

/** React hook that subscribes to localStorage updates of the API key. */
export function useStoredKey(): string | null {
  const [key, setKey] = useState<string | null>(() => getStoredKey());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        setKey(getStoredKey());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return key;
}
