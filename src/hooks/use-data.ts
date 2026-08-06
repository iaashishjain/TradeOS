"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Trade, Playbook, DailyReview, AccountSettings, CustomOption } from "@/db/schema";

// ── Shared trade store ──
// Single source of truth. All useTrades instances read/write from this.
// Mutations update the store directly. Fetches replace it.
let tradeStore: Trade[] = [];
let tradeStoreUrl: string | null = null;
let tradeStoreLoaded = false;
const tradeListeners = new Set<() => void>();
function notifyTrades() { tradeListeners.forEach((fn) => fn()); }

function setTradeStore(trades: Trade[], url: string) {
  tradeStore = trades;
  tradeStoreUrl = url;
  tradeStoreLoaded = true;
  notifyTrades();
}

function updateTradeInStore(updated: Trade) {
  tradeStore = tradeStore.map((t) => t.id === updated.id ? updated : t);
  notifyTrades();
}

function addTradeToStore(trade: Trade) {
  tradeStore = [trade, ...tradeStore];
  notifyTrades();
}

function removeTradeFromStore(id: string) {
  tradeStore = tradeStore.filter((t) => t.id !== id);
  notifyTrades();
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
  const isReady = filters.accountId !== undefined;
  const [, forceRender] = useState(0);
  const fetchingRef = useRef(false);

  const url = (() => {
    if (!isReady) return null;
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.append(key, value); });
    params.set("slim", "1"); // Exclude screenshot blobs from list queries
    return `/api/trades?${params.toString()}`;
  })();

  // Subscribe to store changes
  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    tradeListeners.add(listener);
    return () => { tradeListeners.delete(listener); };
  }, []);

  // Fetch when URL changes or when store doesn't match current URL
  useEffect(() => {
    if (!url) return;
    if (tradeStoreUrl === url && tradeStoreLoaded) return; // already have data for this URL
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((json) => { setTradeStore(json, url); })
      .catch(() => {})
      .finally(() => { fetchingRef.current = false; });
  }, [url]);

  const refetch = useCallback(() => {
    if (!url) return;
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((json) => {
  setTradeStore(json, url);
})
      .catch(() => {});
  }, [url]);

  const createTrade = useCallback(async (trade: Record<string, unknown>) => {
    const res = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(trade) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
    const created = await res.json();
    addTradeToStore(created);
    return created;
  }, []);

  const updateTrade = useCallback(async (trade: Record<string, unknown>) => {
    const res = await fetch("/api/trades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(trade) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Failed"); }
    const updated = await res.json();
    updateTradeInStore(updated);
    return updated;
  }, []);

  const deleteTrade = useCallback(async (id: string) => {
    const res = await fetch(`/api/trades?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    removeTradeFromStore(id);
  }, []);

  // Fetch full trade with screenshots for detail view
  const fetchFullTrade = useCallback(async (id: string): Promise<Trade | null> => {
  try {
    const res = await fetch(`/api/trades?id=${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}, []);

  // loading = true when: (1) settings not loaded yet OR (2) trades not fetched yet for this account
  const isCurrentData = tradeStoreUrl === url;

const loading = !isReady || !tradeStoreLoaded || !isCurrentData;

return {
  trades: isCurrentData ? tradeStore : [],
  loading,
  error: null as string | null,
  refetch,
  createTrade,
  updateTrade,
  deleteTrade,
  fetchFullTrade
};
}

// ── Generic data hook ──
function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const doFetch = useCallback(() => {
    if (!loadedRef.current) setLoading(true);
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((json) => { setData(json); setLoading(false); loadedRef.current = true; })
      .catch(() => { setLoading(false); });
  }, [url]);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, setData, refetch: doFetch };
}

// ── Custom Options ──
export function useCustomOptions(type?: string) {
  const url = type ? `/api/custom-options?type=${type}` : "/api/custom-options";
  const { data, loading, setData, refetch } = useData<CustomOption[]>(url);

  const createOption = useCallback(async (opt: { type: string; value: string; color?: string }) => {
    const res = await fetch("/api/custom-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(opt) });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setData((p) => (p ? [...p, created] : [created]));
    return created;
  }, [setData]);

  const updateOption = useCallback(async (opt: { id: string; value?: string; color?: string }) => {
    const res = await fetch("/api/custom-options", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(opt) });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setData((p) => (p ? p.map((o) => (o.id === updated.id ? updated : o)) : p));
    return updated;
  }, [setData]);

  const deleteOption = useCallback(async (id: string) => {
    const res = await fetch(`/api/custom-options?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    setData((p) => (p ? p.filter((o) => o.id !== id) : p));
  }, [setData]);

  const incrementUsage = useCallback(async (id: string) => {
    await fetch("/api/custom-options", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }, []);

  return { options: data || [], loading, error: null, refetch, createOption, updateOption, deleteOption, incrementUsage };
}

// ── Playbooks ──
export function usePlaybooks() {
  const { data, loading, setData, refetch } = useData<Playbook[]>("/api/playbooks");
  const createPlaybook = useCallback(async (pb: Record<string, unknown>) => {
    const res = await fetch("/api/playbooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pb) });
    if (!res.ok) throw new Error("Failed"); const c = await res.json(); setData((p) => (p ? [c, ...p] : [c])); return c;
  }, [setData]);
  const updatePlaybook = useCallback(async (pb: Record<string, unknown>) => {
    const res = await fetch("/api/playbooks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pb) });
    if (!res.ok) throw new Error("Failed"); const u = await res.json(); setData((p) => (p ? p.map((x) => (x.id === u.id ? u : x)) : p)); return u;
  }, [setData]);
  const deletePlaybook = useCallback(async (id: string) => {
    const res = await fetch(`/api/playbooks?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed"); setData((p) => (p ? p.filter((x) => x.id !== id) : p));
  }, [setData]);
  return { playbooks: data || [], loading, error: null, refetch, createPlaybook, updatePlaybook, deletePlaybook };
}

// ── Reviews ──
export function useReviews() {
  const { data, loading, setData, refetch } = useData<DailyReview[]>("/api/reviews");
  const createReview = useCallback(async (r: Record<string, unknown>) => {
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
    if (!res.ok) throw new Error("Failed"); const c = await res.json(); setData((p) => (p ? [c, ...p] : [c])); return c;
  }, [setData]);
  const updateReview = useCallback(async (r: Record<string, unknown>) => {
    const res = await fetch("/api/reviews", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
    if (!res.ok) throw new Error("Failed"); const u = await res.json(); setData((p) => (p ? p.map((x) => (x.id === u.id ? u : x)) : p)); return u;
  }, [setData]);
  const deleteReview = useCallback(async (id: string) => {
    const res = await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed"); setData((p) => (p ? p.filter((x) => x.id !== id) : p));
  }, [setData]);
  return { reviews: data || [], loading, error: null, refetch, createReview, updateReview, deleteReview };
}

// ── Settings ──
interface SettingsResponse { accounts: AccountSettings[]; default: AccountSettings; }
export function useSettings() {
  const { data, loading, setData, refetch } = useData<SettingsResponse>("/api/settings");
  const defaultAccount = data?.default || null;
  const accounts = data?.accounts || [];

  const updateAccount = useCallback(async (account: Record<string, unknown>) => {
    const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(account) });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setData((prev) => prev ? { accounts: prev.accounts.map((a) => (a.id === updated.id ? updated : a)), default: prev.default.id === updated.id ? updated : prev.default } : prev);
  }, [setData]);

  const createAccount = useCallback(async (account: Record<string, unknown>) => {
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(account) });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setData((prev) => prev ? { accounts: [...prev.accounts, created], default: prev.default } : prev);
  }, [setData]);

  const deleteAccount = useCallback(async (id: string) => {
    const res = await fetch(`/api/settings?id=${id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error || "Failed"); }
    setData((prev) => prev ? { accounts: prev.accounts.filter((a) => a.id !== id), default: prev.default } : prev);
  }, [setData]);

  const setDefaultAccount = useCallback(async (id: string) => {
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!res.ok) throw new Error("Failed");
    setData((prev) => {
      if (!prev) return prev;
      const accs = prev.accounts.map((a) => ({ ...a, isDefault: a.id === id }));
      return { accounts: accs, default: accs.find((a) => a.id === id) || prev.default };
    });
    // Reset trade store so it refetches for new account
    tradeStoreUrl = null;
    tradeStoreLoaded = false;
    tradeStore = [];
    notifyTrades();
  }, [setData]);

  return { settings: defaultAccount, accounts, loading, error: null, refetch, updateSettings: updateAccount, createAccount, deleteAccount, setDefaultAccount };
}
