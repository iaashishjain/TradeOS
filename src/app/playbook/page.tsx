"use client";

import { useState } from "react";
import { usePlaybooks, useTrades } from "@/hooks/use-data";
import {
  PageShell,
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui";
import { formatCurrency, num } from "@/lib/calculations";
import { exportPlaybookPDF } from "@/lib/pdf-export";
import type { Playbook } from "@/db/schema";

const MARKET_OPTIONS = [
  { value: "", label: "Any Market" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "commodities", label: "Commodities" },
  { value: "cfd", label: "CFD" },
];

const defaultForm = {
  name: "",
  description: "",
  marketType: "",
  rules: "",
  entryConditions: "",
  exitConditions: "",
  riskManagement: "",
  timeframes: "",
  isActive: true,
};

export default function PlaybookPage() {
  const { playbooks, loading, createPlaybook, updatePlaybook, deletePlaybook } =
    usePlaybooks();
  const { trades } = useTrades();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Playbook | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openModal = (pb?: Playbook) => {
    if (pb) {
      setEditing(pb);
      setForm({
        name: pb.name,
        description: pb.description || "",
        marketType: pb.marketType || "",
        rules: (pb.rules as string[])?.join("\n") || "",
        entryConditions: (pb.entryConditions as string[])?.join("\n") || "",
        exitConditions: (pb.exitConditions as string[])?.join("\n") || "",
        riskManagement: pb.riskManagement || "",
        timeframes: (pb.timeframes as string[])?.join(", ") || "",
        isActive: pb.isActive,
      });
    } else {
      setEditing(null);
      setForm(defaultForm);
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        marketType: form.marketType || null,
        rules: form.rules
          ? form.rules.split("\n").map((r) => r.trim()).filter(Boolean)
          : [],
        entryConditions: form.entryConditions
          ? form.entryConditions.split("\n").map((r) => r.trim()).filter(Boolean)
          : [],
        exitConditions: form.exitConditions
          ? form.exitConditions.split("\n").map((r) => r.trim()).filter(Boolean)
          : [],
        riskManagement: form.riskManagement || null,
        timeframes: form.timeframes
          ? form.timeframes.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        isActive: form.isActive,
      };
      if (editing) {
        await updatePlaybook({ id: editing.id, ...payload });
      } else {
        await createPlaybook(payload);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this playbook?")) {
      await deletePlaybook(id);
    }
  };

  const getPlaybookStats = (pbId: string) => {
    const pbTrades = trades.filter(
      (t) => t.playbookId === pbId && t.status === "closed"
    );
    const wins = pbTrades.filter((t) => t.outcome === "win").length;
    const totalPnl = pbTrades.reduce((sum, t) => sum + num(t.pnl), 0);
    return {
      count: pbTrades.length,
      winRate: pbTrades.length > 0 ? Math.round((wins / pbTrades.length) * 100) : 0,
      pnl: totalPnl,
    };
  };

  const updateField = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PageShell
      title="Playbook"
      subtitle="Define and track your trading strategies"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => exportPlaybookPDF(playbooks, trades).catch((e: any) => alert('PDF Error: ' + e.message))}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export PDF
          </Button>
          <Button onClick={() => openModal()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Strategy
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <div className="h-40 animate-pulse bg-dark-700 rounded" />
            </Card>
          ))}
        </div>
      ) : playbooks.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            }
            title="No playbooks yet"
            description="Create your first trading playbook to systematize your approach."
            action={<Button onClick={() => openModal()}>Create Playbook</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {playbooks.map((pb) => {
            const stats = getPlaybookStats(pb.id);
            const isExpanded = expandedId === pb.id;
            return (
              <Card key={pb.id} className="relative overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        {pb.name}
                      </h3>
                      <Badge variant={pb.isActive ? "profit" : "default"}>
                        {pb.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {pb.description && (
                      <p className="text-sm text-dark-300 mt-1">
                        {pb.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openModal(pb)}
                      className="p-1.5 rounded hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(pb.id)}
                      className="p-1.5 rounded hover:bg-loss/10 text-dark-400 hover:text-loss transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-dark-800 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">{stats.count}</p>
                    <p className="text-[10px] text-dark-400 uppercase">Trades</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-white">
                      {stats.winRate}%
                    </p>
                    <p className="text-[10px] text-dark-400 uppercase">Win Rate</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3 text-center">
                    <p
                      className={`text-lg font-bold ${
                        stats.pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatCurrency(stats.pnl)}
                    </p>
                    <p className="text-[10px] text-dark-400 uppercase">P&L</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {pb.marketType && (
                    <Badge variant="accent">
                      {pb.marketType.toUpperCase()}
                    </Badge>
                  )}
                  {(pb.timeframes as string[])?.map((tf) => (
                    <Badge key={tf}>{tf}</Badge>
                  ))}
                </div>

                {/* Expand/Collapse */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : pb.id)}
                  className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  {isExpanded ? "Hide Details" : "Show Details"}
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-white/5 animate-fade-in">
                    {(pb.entryConditions as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-dark-300 uppercase mb-1">
                          Entry Conditions
                        </p>
                        <ul className="space-y-1">
                          {(pb.entryConditions as string[]).map((c, i) => (
                            <li key={i} className="text-sm text-dark-200 flex items-start gap-2">
                              <span className="text-accent-400 mt-0.5">•</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(pb.exitConditions as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-dark-300 uppercase mb-1">
                          Exit Conditions
                        </p>
                        <ul className="space-y-1">
                          {(pb.exitConditions as string[]).map((c, i) => (
                            <li key={i} className="text-sm text-dark-200 flex items-start gap-2">
                              <span className="text-warn mt-0.5">•</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(pb.rules as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-dark-300 uppercase mb-1">
                          Rules
                        </p>
                        <ul className="space-y-1">
                          {(pb.rules as string[]).map((r, i) => (
                            <li key={i} className="text-sm text-dark-200 flex items-start gap-2">
                              <span className="text-profit mt-0.5">•</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {pb.riskManagement && (
                      <div>
                        <p className="text-xs font-medium text-dark-300 uppercase mb-1">
                          Risk Management
                        </p>
                        <p className="text-sm text-dark-200">{pb.riskManagement}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Playbook" : "New Strategy Playbook"}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Strategy Name"
              value={form.name}
              onChange={(e) => updateField("name", e.currentTarget.value)}
              placeholder="e.g., London Breakout"
            />
            <Select
              label="Market"
              options={MARKET_OPTIONS}
              value={form.marketType}
              onChange={(e) => updateField("marketType", e.currentTarget.value)}
            />
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => updateField("description", e.currentTarget.value)}
            placeholder="Brief description of this strategy..."
          />
          <Textarea
            label="Entry Conditions (one per line)"
            value={form.entryConditions}
            onChange={(e) =>
              updateField("entryConditions", e.currentTarget.value)
            }
            placeholder="Price above 200 EMA&#10;RSI < 30&#10;Volume spike detected"
          />
          <Textarea
            label="Exit Conditions (one per line)"
            value={form.exitConditions}
            onChange={(e) =>
              updateField("exitConditions", e.currentTarget.value)
            }
            placeholder="Target reached (2R)&#10;Trailing stop hit&#10;End of session"
          />
          <Textarea
            label="Rules (one per line)"
            value={form.rules}
            onChange={(e) => updateField("rules", e.currentTarget.value)}
            placeholder="Max 2 trades per session&#10;Only trade in trend direction&#10;Wait for confirmation candle"
          />
          <Textarea
            label="Risk Management"
            value={form.riskManagement}
            onChange={(e) =>
              updateField("riskManagement", e.currentTarget.value)
            }
            placeholder="1% risk per trade, 3% max daily loss..."
          />
          <Input
            label="Timeframes (comma separated)"
            value={form.timeframes}
            onChange={(e) => updateField("timeframes", e.currentTarget.value)}
            placeholder="H1, H4, D1"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : editing ? "Update" : "Create Playbook"}
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}
