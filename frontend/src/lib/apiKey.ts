"use client";

import { useEffect, useState } from "react";

export type LLMProvider = "openai" | "openrouter";

const LEGACY_OPENAI_STORAGE_KEY = "openai_api_key";
const PROVIDER_STORAGE_KEY = "llm_provider";
const MODEL_STORAGE_PREFIX = "llm_model_";
const API_KEY_STORAGE_PREFIX = "llm_api_key_";

const DEFAULT_PROVIDER: LLMProvider = "openai";
const ALL_PROVIDERS: readonly LLMProvider[] = ["openai", "openrouter"];

const isBrowser = () => typeof window !== "undefined";

function providerStorageKey(provider: LLMProvider): string {
  return `${API_KEY_STORAGE_PREFIX}${provider}`;
}

function modelStorageKey(provider: LLMProvider): string {
  return `${MODEL_STORAGE_PREFIX}${provider}`;
}

function dispatchStorageUpdate(key: string, newValue: string | null): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

function normalizeProvider(value: string | null | undefined): LLMProvider {
  return value === "openrouter" ? "openrouter" : "openai";
}

function migrateLegacyOpenAIKey(): void {
  if (!isBrowser()) return;
  try {
    const legacy = localStorage.getItem(LEGACY_OPENAI_STORAGE_KEY);
    if (!legacy) return;
    const openaiKeyStorage = providerStorageKey("openai");
    if (!localStorage.getItem(openaiKeyStorage)) {
      localStorage.setItem(openaiKeyStorage, legacy);
      dispatchStorageUpdate(openaiKeyStorage, legacy);
    }
    localStorage.removeItem(LEGACY_OPENAI_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredProvider(): LLMProvider {
  if (!isBrowser()) return DEFAULT_PROVIDER;
  try {
    return normalizeProvider(localStorage.getItem(PROVIDER_STORAGE_KEY));
  } catch {
    return DEFAULT_PROVIDER;
  }
}

export function saveProvider(provider: LLMProvider): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    dispatchStorageUpdate(PROVIDER_STORAGE_KEY, provider);
  } catch {
    /* ignore */
  }
}

export function getStoredKey(provider?: LLMProvider): string | null {
  if (!isBrowser()) return null;
  try {
    migrateLegacyOpenAIKey();
    const effectiveProvider = provider ?? getStoredProvider();
    return localStorage.getItem(providerStorageKey(effectiveProvider));
  } catch {
    return null;
  }
}

export function saveKey(provider: LLMProvider, key: string): void {
  if (!isBrowser()) return;
  try {
    const storageKey = providerStorageKey(provider);
    localStorage.setItem(storageKey, key);
    dispatchStorageUpdate(storageKey, key);
  } catch {
    /* ignore */
  }
}

export function clearKey(provider: LLMProvider): void {
  if (!isBrowser()) return;
  try {
    const storageKey = providerStorageKey(provider);
    localStorage.removeItem(storageKey);
    dispatchStorageUpdate(storageKey, null);
  } catch {
    /* ignore */
  }
}

export function getStoredModel(provider?: LLMProvider): string | null {
  if (!isBrowser()) return null;
  try {
    const effectiveProvider = provider ?? getStoredProvider();
    return localStorage.getItem(modelStorageKey(effectiveProvider));
  } catch {
    return null;
  }
}

export function saveModel(provider: LLMProvider, model: string): void {
  if (!isBrowser()) return;
  try {
    const storageKey = modelStorageKey(provider);
    localStorage.setItem(storageKey, model);
    dispatchStorageUpdate(storageKey, model);
  } catch {
    /* ignore */
  }
}

export function clearModel(provider: LLMProvider): void {
  if (!isBrowser()) return;
  try {
    const storageKey = modelStorageKey(provider);
    localStorage.removeItem(storageKey);
    dispatchStorageUpdate(storageKey, null);
  } catch {
    /* ignore */
  }
}

/** Returns headers to merge into fetch/axios requests for any LLM-using endpoint. */
export function getApiHeaders(): Record<string, string> {
  const provider = getStoredProvider();
  const key = getStoredKey(provider);
  const model = getStoredModel(provider);

  const headers: Record<string, string> = {
    "X-LLM-Provider": provider,
  };

  if (model) headers["X-LLM-Model"] = model;

  if (key) {
    headers[provider === "openrouter" ? "X-OpenRouter-Key" : "X-OpenAI-Key"] = key;
  }

  return headers;
}

/** True when at least one provider has a stored (already-validated) API key. */
export function hasAnyStoredKey(): boolean {
  if (!isBrowser()) return false;
  return ALL_PROVIDERS.some((p) => {
    const key = getStoredKey(p);
    return !!key && key.trim().length > 0;
  });
}

/**
 * React hook that reports whether any provider has valid stored credentials.
 *
 * Initializes to `false` so SSR and the first client render agree (React does
 * not patch className mismatches during hydration). A mount effect then reads
 * localStorage and re-renders, so the indicator turns green on launch once
 * populated. It also refreshes on any `llm_*` storage change (save/reset).
 */
export function useHasStoredCredentials(): boolean {
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    const refresh = () => setHasCredentials(hasAnyStoredKey());
    refresh(); // sync from localStorage after hydration (first launch)

    const onStorage = (e: StorageEvent) => {
      const key = e.key;
      if (
        key === null ||
        key === PROVIDER_STORAGE_KEY ||
        key === LEGACY_OPENAI_STORAGE_KEY ||
        key.startsWith(API_KEY_STORAGE_PREFIX) ||
        key.startsWith(MODEL_STORAGE_PREFIX)
      ) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return hasCredentials;
}

/** React hook for the active provider + its key + selected model. */
export function useStoredLlmState(): { provider: LLMProvider; key: string | null; model: string | null } {
  const [state, setState] = useState(() => {
    const provider = getStoredProvider();
    return { provider, key: getStoredKey(provider), model: getStoredModel(provider) };
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const key = e.key || "";
      if (
        key === PROVIDER_STORAGE_KEY ||
        key.startsWith(API_KEY_STORAGE_PREFIX) ||
        key.startsWith(MODEL_STORAGE_PREFIX) ||
        key === null
      ) {
        const provider = getStoredProvider();
        setState({
          provider,
          key: getStoredKey(provider),
          model: getStoredModel(provider),
        });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return state;
}

