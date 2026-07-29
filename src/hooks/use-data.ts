"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import type { Trade, Playbook, DailyReview, AccountSettings, CustomOption } from "@/db/schema";

// ── Global revision counter — increments on every mutation ──
// Every hook subscribes to this. When it increments, all hooks refetch.
let tradesRev = 0;
let settingsRev = 0;
let optionsRev = 0;
let playbooksRev = 0;
let reviewsRev = 0;

const listeners = new Set<() => void>();
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function notify() { listeners.forEach((fn) => fn()); }

function bump(type: "trades" | "settings" | "options" | "playbooks" | "reviews") {
  if (type === "trades") tradesRev++;
  else if (type === "settings") settingsRev++;
  else if (type === "options") optionsRev++;
  else if (type === "playbooks") playbooksRev++;
  else if (type === "reviews") reviewsRev++;
  notify();
}

function getSnapshot(type: "trades" | "settings" | "options" | "playbooks" | "reviews") {
  if (type === "trades") return tradesRev;
  if (type === "settings") return settingsRev;
  if (type === "options") return optionsRev;
  if (type === "playbooks") return playbooksRev;
  return reviewsRev;
}

function useRev(type: "trades" | "settings" | "options" | "playbooks" | "reviews") {
  const snap = useCallback(() => getSnapshot(type), [type]);
  const serverSnap = useCallback(() => 0, []);
  return useSyncExternalStore(subscribe, snap, serverSnap);
}

// ── Trade Filters ──
export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  symbol?: string;
  strategy?: string;
  setup?: string;
  session?: string;
  timeframe?: string;
  outcome?: string;
  direction?: string;
  weekday?: string;
  tags?: string;
  search?: string;
  accountId?: string;
}

// ── Trades Hook ──
export function useTrades(filters: TradeFilters = {}) {
  const rev = useRev("trades");
  const isReady = filters.accountId !== undefined;

  const url = (() => {
    if (!isReady) return null;
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.append(key, value); });
    const q = params.toString();
    return `/api/trades${q ? `?${q}` : ""}`;
  })();

  const cached = url ? (memCache.get(url) as Trade[] | undefined) : undefined;
  const [trades, setTrades] = useState<Trade[]>(cached || []);
  const [loading, setLoading] = useState(!cached && isReady);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        if (!memCache.has(url)) setLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        memCache.set(url, json);
        if (!cancelled) { setTrades(json); setLoading(false); }
      } catch (e) {
        if (!cancelled && e instanceof Error) setError(e.message);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url, rev]);

  const createTrade = useCallback(async (trade: Record<string, unknown>) => {
    const res = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(trade) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
    const created = await res.json();
    setTrades((p) => [created, ...p]);
    clearCache("/api/trades");
    bump("trades");
    return created;
  }, []);

  const updateTrade = useCallback(async (trade: Record<string, unknown>) => {
    const res = await fetch("/api/trades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(trade) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
    const updated = await res.json();
    setTrades((p) => p.map((t) => (t.id === updated.id ? updated : t)));
    clearCache("/api/trades");
    bump("trades");
    return updated;
  }, []);

  const deleteTrade = useCallback(async (id: string) => {
    const res = await fetch(`/api/trades?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    setTrades((p) => p.filter((t) => t.id !== id));
    clearCache("/api/trades");
    bump("trades");
  }, []);

  return { trades, loading, error, refetch: () => bump("trades"), createTrade, updateTrade, deleteTrade };
}

// ── Simple cross-request memory cache ──
const memCache = new Map<string, unknown>();

function clearCache(prefix: string) {
  for (const key of memCache.keys()) {
    if (key.startsWith(prefix)) memCache.delete(key);
  }
}

// ── Generic fetch with revision tracking ──
function useFetchWithRev<T>(url: string, revType: "settings" | "options" | "playbooks" | "reviews") {
  const rev = useRev(revType);
  const cached = memCache.get(url) as T | undefined;
  const [data, setData] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!memCache.has(url)) setLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        memCache.set(url, json);
        if (!cancelled) { setData(json); setLoading(false); }
      } catch (e) {
        if (!cancelled && e instanceof Error) setError(e.message);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url, rev]);

  const setDataWrapped = useCallback((fn: (prev: T | null) => T | null) => {
    setData((prev) => {
      const next = fn(prev);
      if (next) memCache.set(url, next);
      return next;
    });
  }, [url]);

  return { data, loading, error, setData: setDataWrapped };
}

// ── Custom Options Hook ──
export function useCustomOptions(type?: string) {
  const url = type ? `/api/custom-options?type=${type}` : "/api/custom-options";
  const { data, loading, error, setData } = useFetchWithRev<CustomOption[]>(url, "options");

  const createOption = useCallback(async (option: { type: string; value: string; color?: string }) => {
    const res = await fetch("/api/custom-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(option) });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setData((p) => (p ? [...p, created] : [created]));
    bump("options");
    return created;
  }, [setData]);

  const updateOption = useCallback(async (option: { id: string; value?: string; color?: string }) => {
    const res = await fetch("/api/custom-options", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(option) });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setData((p) => (p ? p.map((o) => (o.id === updated.id ? updated : o)) : p));
    bump("options");
    return updated;
  }, [setData]);

  const deleteOption = useCallback(async (id: string) => {
    const res = await fetch(`/api/custom-options?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    setData((p) => (p ? p.filter((o) => o.id !== id) : p));
    bump("options");
  }, [setData]);

  const incrementUsage = useCallback(async (id: string) => {
    await fetch("/api/custom-options", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }, []);

  return { options: data || [], loading, error, refetch: () => bump("options"), createOption, updateOption, deleteOption, incrementUsage };
}

// ── Playbooks Hook ──
export function usePlaybooks() {
  const { data, loading, error, setData } = useFetchWithRev<Playbook[]>("/api/playbooks", "playbooks");

  const createPlaybook = useCallback(async (pb: Record<string, unknown>) => {
    const res = await fetch("/api/playbooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pb) });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setData((p) => (p ? [created, ...p] : [created]));
    bump("playbooks");
    return created;
  }, [setData]);

  const updatePlaybook = useCallback(async (pb: Record<string, unknown>) => {
    const res = await fetch("/api/playbooks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pb) });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setData((p) => (p ? p.map((x) => (x.id === updated.id ? updated : x)) : p));
    bump("playbooks");
    return updated;
  }, [setData]);

  const deletePlaybook = useCallback(async (id: string) => {
    const res = await fetch(`/api/playbooks?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    setData((p) => (p ? p.filter((x) => x.id !== id) : p));
    bump("playbooks");
  }, [setData]);

  return { playbooks: data || [], loading, error, refetch: () => bump("playbooks"), createPlaybook, updatePlaybook, deletePlaybook };
}

// ── Reviews Hook ──
export function useReviews() {
  const { data, loading, error, setData } = useFetchWithRev<DailyReview[]>("/api/reviews", "reviews");

  const createReview = useCallback(async (r: Record<string, unknown>) => {
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setData((p) => (p ? [created, ...p] : [created]));
    bump("reviews");
    return created;
  }, [setData]);

  const updateReview = useCallback(async (r: Record<string, unknown>) => {
    const res = await fetch("/api/reviews", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setData((p) => (p ? p.map((x) => (x.id === updated.id ? updated : x)) : p));
    bump("reviews");
    return updated;
  }, [setData]);

  const deleteReview = useCallback(async (id: string) => {
    const res = await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    setData((p) => (p ? p.filter((x) => x.id !== id) : p));
    bump("reviews");
  }, [setData]);

  return { reviews: data || [], loading, error, refetch: () => bump("reviews"), createReview, updateReview, deleteReview };
}

// ── Settings Hook (multi-account) ──
interface SettingsResponse {
  accounts: AccountSettings[];
  default: AccountSettings;
}

export function useSettings() {
  const { data, loading, error, setData } = useFetchWithRev<SettingsResponse>("/api/settings", "settings");

  const defaultAccount = data?.default || null;
  const accounts = data?.accounts || [];

  const updateAccount = useCallback(async (account: Record<string, unknown>) => {
    const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(account) });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setData((prev) => prev ? { accounts: prev.accounts.map((a) => (a.id === updated.id ? updated : a)), default: prev.default.id === updated.id ? updated : prev.default } : prev);
    bump("settings");
  }, [setData]);

  const createAccount = useCallback(async (account: Record<string, unknown>) => {
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(account) });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setData((prev) => prev ? { accounts: [...prev.accounts, created], default: prev.default } : prev);
    bump("settings");
  }, [setData]);

  const deleteAccount = useCallback(async (id: string) => {
    const res = await fetch(`/api/settings?id=${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as {error?:string}).error || "Failed"); }
    setData((prev) => prev ? { accounts: prev.accounts.filter((a) => a.id !== id), default: prev.default } : prev);
    bump("settings");
  }, [setData]);

  const setDefaultAccount = useCallback(async (id: string) => {
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!res.ok) throw new Error("Failed");
    setData((prev) => {
      if (!prev) return prev;
      const accs = prev.accounts.map((a) => ({ ...a, isDefault: a.id === id }));
      return { accounts: accs, default: accs.find((a) => a.id === id) || prev.default };
    });
    clearCache("/api/settings");
    clearCache("/api/trades");
    bump("settings");
    bump("trades");
  }, [setData]);

  return { settings: defaultAccount, accounts, loading, error, refetch: () => bump("settings"), updateSettings: updateAccount, createAccount, deleteAccount, setDefaultAccount };
}
