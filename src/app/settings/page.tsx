"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSettings, useTrades } from "@/hooks/use-data";
import { PageShell, Card, Button, Input, Select, Badge, Modal } from "@/components/ui";
import { calculatePerformanceMetrics, formatCurrency, num } from "@/lib/calculations";
import { format, subMonths, subDays } from "date-fns";
import { BackupRestore } from "@/components/backup-restore";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "JPY", label: "JPY" },
  { value: "AUD", label: "AUD" },
  { value: "CAD", label: "CAD" },
  { value: "CHF", label: "CHF" },
  { value: "NZD", label: "NZD" },
  { value: "SGD", label: "SGD" },
  { value: "INR", label: "INR" },
];

export default function SettingsPage() {
  const { settings, accounts, loading, updateSettings, createAccount, deleteAccount, setDefaultAccount } = useSettings();
  const defaultId = settings?.id;
  const { trades } = useTrades({ accountId: defaultId });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAccount, setNewAccount] = useState({ accountName: "", broker: "", startingBalance: "10000", currency: "USD" });

  // Edit form state per account
  const [editForms, setEditForms] = useState<Record<string, { accountName: string; broker: string; startingBalance: string; currency: string }>>({});

  useEffect(() => {
    const forms: Record<string, { accountName: string; broker: string; startingBalance: string; currency: string }> = {};
    for (const a of accounts) {
      forms[a.id] = {
        accountName: a.accountName,
        broker: (a as any).broker || "",
        startingBalance: a.startingBalance,
        currency: a.currency,
      };
    }
    setEditForms(forms);
  }, [accounts]);

  const handleSave = useCallback(async (id: string) => {
    const form = editForms[id];
    if (!form) return;
    setSaving(true);
    try {
      await updateSettings({ id, ...form });
    } catch (err) {
      alert("Failed to save: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  }, [editForms, updateSettings]);

  const handleAdd = useCallback(async () => {
    if (!newAccount.accountName.trim()) return;
    setSaving(true);
    try {
      await createAccount(newAccount);
      setShowAddModal(false);
      setNewAccount({ accountName: "", broker: "", startingBalance: "10000", currency: "USD" });
    } catch (err) {
      alert("Failed to create account");
    } finally {
      setSaving(false);
    }
  }, [newAccount, createAccount]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this account? All trades linked to it will remain but become unlinked.")) return;
    try {
      await deleteAccount(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }, [deleteAccount]);

  const handleSetDefault = useCallback(async (id: string) => {
    try {
      await setDefaultAccount(id);
    } catch (err) {
      alert("Failed to set default");
    }
  }, [setDefaultAccount]);

  const updateForm = (id: string, key: string, value: string) => {
    setEditForms((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  };

  const metrics = calculatePerformanceMetrics(trades);

  // Monthly performance
  const monthlyStats = useMemo(() => {
    const months: { label: string; pnl: number; trades: number; wr: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = subMonths(new Date(), i);
      const ms = new Date(start.getFullYear(), start.getMonth(), 1);
      const me = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
      const mt = trades.filter((t) => { if (t.status !== "closed" || !t.exitDate) return false; const d = new Date(t.exitDate); return d >= ms && d <= me; });
      const wins = mt.filter((t) => t.outcome === "win").length;
      const pnl = mt.reduce((s, t) => s + num(t.pnl), 0);
      months.push({ label: format(ms, "MMM yyyy"), pnl: Math.round(pnl * 100) / 100, trades: mt.length, wr: mt.length > 0 ? Math.round((wins / mt.length) * 100) : 0 });
    }
    return months;
  }, [trades]);

  const activityData = useMemo(() => {
    const data: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const ds = format(d, "yyyy-MM-dd");
      data.push({ day: format(d, "dd"), count: trades.filter((t) => format(new Date(t.entryDate), "yyyy-MM-dd") === ds).length });
    }
    return data;
  }, [trades]);
  const maxActivity = Math.max(...activityData.map((d) => d.count), 1);

  if (loading) {
    return <PageShell title="Settings"><Card><div className="h-60 animate-pulse bg-dark-700 rounded" /></Card></PageShell>;
  }

  const balance = num(settings?.startingBalance) + metrics.totalPnl;
  const currency = settings?.currency || "USD";

  return (
    <PageShell title="Settings" subtitle="Accounts, configuration, and performance overview">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Accounts */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Trading Accounts</h3>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Account
            </Button>
          </div>

          {accounts.map((account) => {
            const form = editForms[account.id];
            if (!form) return null;
            const isEditing = editingId === account.id;
            const isDefault = account.isDefault;

            return (
              <Card key={account.id} className={`${isDefault ? "border-accent-500/30 bg-accent-500/5" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isDefault ? (
                      <Badge variant="accent" size="sm">DEFAULT</Badge>
                    ) : (
                      <button onClick={() => handleSetDefault(account.id)} className="text-[10px] text-dark-400 hover:text-accent-400 transition-colors px-2 py-0.5 rounded border border-white/10 hover:border-accent-500/30">
                        Set Default
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditing ? (
                      <button onClick={() => setEditingId(account.id)} className="p-1 text-dark-400 hover:text-white rounded hover:bg-white/10">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                      </button>
                    ) : null}
                    {!isDefault && (
                      <button onClick={() => handleDelete(account.id)} className="p-1 text-dark-400 hover:text-loss rounded hover:bg-loss/10">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <Input label="Account Name" value={form.accountName} onChange={(e) => updateForm(account.id, "accountName", e.target.value)} />
                    <Input label="Broker" value={form.broker} onChange={(e) => updateForm(account.id, "broker", e.target.value)} placeholder="e.g. IC Markets" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Balance" type="number" value={form.startingBalance} onChange={(e) => updateForm(account.id, "startingBalance", e.target.value)} />
                      <Select label="Currency" options={CURRENCY_OPTIONS} value={form.currency} onChange={(e) => updateForm(account.id, "currency", e.target.value)} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => handleSave(account.id)} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-base font-semibold text-white">{form.accountName}</p>
                    {form.broker && <p className="text-xs text-dark-400 mt-0.5">{form.broker}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-lg font-bold text-white">{formatCurrency(num(form.startingBalance), form.currency)}</p>
                      <span className="text-xs text-dark-400">{form.currency}</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          <BackupRestore />

          {/* Data Management */}
          <DataManagement accountId={settings?.id} />
        </div>

        {/* Right: Performance of default account */}
        <div className="lg:col-span-2 space-y-6">
          {settings && (
            <div className="glass-card p-4 border-l-4 border-accent-500">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Active Account</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{settings.accountName}</p>
                  {(settings as any).broker && <p className="text-xs text-dark-400">{(settings as any).broker}</p>}
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${balance >= num(settings.startingBalance) ? "text-profit" : "text-loss"}`}>{formatCurrency(balance, currency)}</p>
                  <p className="text-xs text-dark-400">Current Balance</p>
                </div>
              </div>
            </div>
          )}

          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Account Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-1">Starting</p>
                <p className="text-lg font-bold text-white">{formatCurrency(num(settings?.startingBalance), currency)}</p>
              </div>
              <div className="text-center p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-1">Return</p>
                <p className={`text-lg font-bold ${metrics.totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
                  {metrics.totalPnl >= 0 ? "+" : ""}{((metrics.totalPnl / Math.max(num(settings?.startingBalance), 1)) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-1">Trades</p>
                <p className="text-lg font-bold text-white">{metrics.totalTrades}</p>
              </div>
              <div className="text-center p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-1">Win Rate</p>
                <p className={`text-lg font-bold ${metrics.winRate >= 50 ? "text-profit" : metrics.totalTrades > 0 ? "text-loss" : "text-dark-300"}`}>
                  {metrics.totalTrades > 0 ? `${metrics.winRate}%` : "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Monthly Performance</h3>
            {monthlyStats.every((m) => m.trades === 0) ? (
              <p className="text-dark-400 text-sm text-center py-4">No trades yet for this account.</p>
            ) : (
              <div className="space-y-2">
                {monthlyStats.map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-dark-400 shrink-0">{m.label}</span>
                    <div className="flex-1 h-6 bg-dark-800 rounded-full overflow-hidden relative">
                      {m.trades > 0 && (
                        <div className={`h-full ${m.pnl >= 0 ? "bg-profit/40" : "bg-loss/40"}`}
                          style={{ width: `${Math.min(100, Math.abs(m.pnl) / (Math.max(...monthlyStats.map((x) => Math.abs(x.pnl)), 1)) * 100)}%` }} />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                        {m.trades > 0 ? `${m.wr}% WR · ${m.trades} trades` : "—"}
                      </span>
                    </div>
                    <span className={`w-20 text-right text-xs font-semibold shrink-0 ${m.pnl >= 0 ? "text-profit" : m.pnl < 0 ? "text-loss" : "text-dark-400"}`}>
                      {m.trades > 0 ? formatCurrency(m.pnl, currency) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">30-Day Activity</h3>
            <div className="flex items-end gap-[3px] h-16">
              {activityData.map((d, i) => (
                <div key={i} className="flex-1 rounded-t transition-all group relative"
                  style={{ height: `${d.count > 0 ? Math.max(15, (d.count / maxActivity) * 100) : 5}%`, backgroundColor: d.count > 0 ? `rgba(99,102,241,${0.3 + (d.count / maxActivity) * 0.7})` : "rgba(255,255,255,0.03)" }}
                  title={`${d.day}: ${d.count} trades`}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 glass-card px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {d.day}: {d.count} trades
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-dark-500"><span>30 days ago</span><span>Today</span></div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Key Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
              {[
                ["Win Rate", `${metrics.winRate}%`, metrics.winRate >= 50],
                ["Profit Factor", metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2), metrics.profitFactor >= 1],
                ["Expectancy", formatCurrency(metrics.expectancy, currency), metrics.expectancy >= 0],
                ["Avg Win", formatCurrency(metrics.avgWin, currency), true],
                ["Avg Loss", formatCurrency(metrics.avgLoss, currency), false],
                ["Max Drawdown", formatCurrency(metrics.maxDrawdown, currency), false],
              ].map(([label, value, positive]) => (
                <div key={String(label)} className="flex items-center justify-between text-sm py-1">
                  <span className="text-dark-400">{String(label)}</span>
                  <span className={`font-medium ${positive ? "text-profit" : "text-loss"}`}>{String(value)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Account Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Trading Account">
        <div className="space-y-4">
          <Input label="Account Name" value={newAccount.accountName} onChange={(e) => setNewAccount((p) => ({ ...p, accountName: e.target.value }))} placeholder="e.g. Live Account #2" />
          <Input label="Broker" value={newAccount.broker} onChange={(e) => setNewAccount((p) => ({ ...p, broker: e.target.value }))} placeholder="e.g. IC Markets, Binance..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Balance" type="number" value={newAccount.startingBalance} onChange={(e) => setNewAccount((p) => ({ ...p, startingBalance: e.target.value }))} />
            <Select label="Currency" options={CURRENCY_OPTIONS} value={newAccount.currency} onChange={(e) => setNewAccount((p) => ({ ...p, currency: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving || !newAccount.accountName.trim()}>{saving ? "Creating..." : "Create Account"}</Button>
        </div>
      </Modal>
    </PageShell>
  );
}

function DataManagement({ accountId }: { accountId?: string }) {
  const [mode, setMode] = useState<"all" | "range">("all");
  const [from, setFrom] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!accountId) return;
    setDeleting(true);
    try {
      let url = `/api/trades/bulk-delete?accountId=${accountId}`;
      if (mode === "range") url += `&from=${from}&to=${to}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setConfirm(false);
      // Force all trade hooks across the app to refetch
      window.location.reload();
    } catch {
      alert("Failed to delete trades");
    } finally {
      setDeleting(false);
    }
  }, [accountId, mode, from, to]);

  return (
    <Card>
      <h3 className="text-sm font-semibold text-white mb-1">Data Management</h3>
      <p className="text-xs text-dark-400 mb-4">Delete trade records for this account.</p>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode("all")} className={`px-3 py-1.5 text-xs rounded-lg ${mode === "all" ? "bg-loss/15 text-loss" : "bg-dark-800 text-dark-400"}`}>All Trades</button>
          <button onClick={() => setMode("range")} className={`px-3 py-1.5 text-xs rounded-lg ${mode === "range" ? "bg-loss/15 text-loss" : "bg-dark-800 text-dark-400"}`}>Date Range</button>
        </div>

        {mode === "range" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!py-1.5 text-xs !w-36" />
            <span className="text-dark-500 text-xs">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!py-1.5 text-xs !w-36" />
          </div>
        )}

        {!confirm ? (
          <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
            {mode === "all" ? "Delete All Trades" : "Delete Trades in Range"}
          </Button>
        ) : (
          <div className="p-3 bg-loss/10 border border-loss/20 rounded-lg">
            <p className="text-xs text-loss mb-3">
              {mode === "all"
                ? "This will permanently delete ALL trades for this account. This cannot be undone."
                : `This will permanently delete all trades from ${from} to ${to}. This cannot be undone.`}
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
