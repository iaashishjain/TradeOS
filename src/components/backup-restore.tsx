"use client";

import { useState, useRef, useCallback } from "react";
import { Card, Button, Modal } from "@/components/ui";

type Status = "idle" | "backing-up" | "downloading" | "validating" | "confirming" | "restoring" | "success" | "error";

interface ValidationResult {
  valid: boolean;
  createdAt?: string;
  version?: number;
  counts?: Record<string, number>;
  errors?: string[];
}

interface RestoreResult {
  success?: boolean;
  restored?: Record<string, number>;
  message?: string;
  error?: string;
}

export function BackupRestore() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── BACKUP ──
  const handleBackup = useCallback(async () => {
    setStatus("backing-up");
    setMessage("Preparing backup...");
    setProgress(10);

    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      setProgress(50);
      setMessage("Packaging data...");

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const totalRecords = Object.values(data._counts as Record<string, number>).reduce((a, b) => a + b, 0);

      setProgress(80);
      setStatus("downloading");
      setMessage("Starting download...");

      // Create download link
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `tradeos-backup-${dateStr}.json`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);

      // Trigger download
      a.click();

      // Cleanup after a delay to ensure download starts
      await new Promise((resolve) => setTimeout(resolve, 1500));
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus("success");
      setMessage(`Backup downloaded: ${filename} (${totalRecords} records, ${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Backup failed");
    }
  }, []);

  // ── RESTORE: File Selection ──
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    if (fileRef.current) fileRef.current.value = "";

    // Basic checks
    if (!file.name.endsWith(".json")) {
      setStatus("error");
      setMessage("Please select a .json backup file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setStatus("error");
      setMessage("File too large (max 100MB)");
      return;
    }

    setStatus("validating");
    setMessage("Validating backup file...");
    setProgress(20);

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("File is not valid JSON");
      }

      setProgress(50);

      // Send to server for validation
      const res = await fetch("/api/backup/restore?mode=validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });

      const result: ValidationResult = await res.json();
      setProgress(100);

      if (!res.ok || !result.valid) {
        setStatus("error");
        setMessage(result.errors?.join(". ") || "Invalid backup file");
        setValidation(null);
        return;
      }

      // Show confirmation
      setValidation(result);
      setPendingFile(file);
      setStatus("confirming");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Validation failed");
    }
  }, []);

  // ── RESTORE: Execute ──
  const executeRestore = useCallback(async () => {
    if (!pendingFile) return;

    setStatus("restoring");
    setMessage("Restoring data... Do not close this page.");
    setProgress(10);

    try {
      const text = await pendingFile.text();
      setProgress(30);

      const res = await fetch("/api/backup/restore?mode=execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });

      setProgress(80);
      const result: RestoreResult = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || "Restore failed");
      }

      setProgress(100);
      setRestoreResult(result);
      setStatus("success");
      setMessage(result.message || "Data restored successfully");
      setPendingFile(null);
      setValidation(null);

      // Reload page to reflect new data after short delay
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Restore failed");
      setPendingFile(null);
    }
  }, [pendingFile]);

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage("");
    setProgress(0);
    setValidation(null);
    setPendingFile(null);
    setRestoreResult(null);
  }, []);

  const isWorking = status === "backing-up" || status === "downloading" || status === "validating" || status === "restoring";

  return (
    <>
      <Card>
        <h3 className="text-sm font-semibold text-white mb-1">Backup &amp; Restore</h3>
        <p className="text-xs text-dark-400 mb-5">
          Export all your data or restore from a previous backup. Backups include trades, settings, playbooks, reviews, screenshots, and all metadata.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Backup */}
          <div className="p-4 bg-dark-800/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent-500/10 text-accent-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Create Backup</p>
                <p className="text-[11px] text-dark-400">Download a full copy of your data</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleBackup}
              disabled={isWorking}
            >
              {status === "backing-up" ? "Preparing..." : status === "downloading" ? "Downloading..." : "Download Backup"}
            </Button>
          </div>

          {/* Restore */}
          <div className="p-4 bg-dark-800/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-warn/10 text-warn">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Restore Backup</p>
                <p className="text-[11px] text-dark-400">Replace all data from a backup file</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={isWorking}
            >
              {status === "validating" ? "Validating..." : status === "restoring" ? "Restoring..." : "Upload Backup File"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Progress / Status */}
        {status !== "idle" && status !== "confirming" && (
          <div className="mt-4 animate-fade-in">
            {isWorking && (
              <div className="mb-2">
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              {status === "success" && (
                <svg className="w-4 h-4 text-profit shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
              {status === "error" && (
                <svg className="w-4 h-4 text-loss shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              )}
              <p className={`text-xs ${status === "success" ? "text-profit" : status === "error" ? "text-loss" : "text-dark-300"}`}>
                {message}
              </p>
              {(status === "success" || status === "error") && (
                <button onClick={reset} className="text-xs text-dark-400 hover:text-white ml-auto">
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Restore Confirmation Modal */}
      <Modal
        open={status === "confirming"}
        onClose={() => { setPendingFile(null); setValidation(null); setStatus("idle"); }}
        title="Confirm Restore"
      >
        <div className="space-y-4">
          <div className="p-3 bg-warn/10 border border-warn/20 rounded-lg">
            <p className="text-sm text-warn font-medium mb-1">⚠ This will overwrite all current data</p>
            <p className="text-xs text-dark-300">
              All existing trades, settings, playbooks, reviews, and media will be replaced with the backup data. This cannot be undone.
            </p>
          </div>

          {validation && (
            <div className="space-y-3">
              <p className="text-xs text-dark-400">
                Backup created: <span className="text-dark-200">{validation.createdAt ? new Date(validation.createdAt).toLocaleString() : "Unknown"}</span>
              </p>
              <p className="text-xs text-dark-400 mb-2">Data to restore:</p>
              <div className="grid grid-cols-3 gap-2">
                {validation.counts && Object.entries(validation.counts).map(([table, count]) => (
                  <div key={table} className="text-center p-2 bg-dark-800 rounded-lg">
                    <p className="text-sm font-bold text-white">{count}</p>
                    <p className="text-[9px] text-dark-400 uppercase">{table.replace(/([A-Z])/g, " $1").trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setPendingFile(null); setValidation(null); setStatus("idle"); }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={executeRestore}>
              Overwrite &amp; Restore
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
