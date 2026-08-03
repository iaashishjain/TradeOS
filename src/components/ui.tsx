"use client";

import {
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";

// ── Inline Menu Button ──
import { triggerOpenSidebar } from "@/components/sidebar";

function MenuButton() {
  return (
    <button
      onClick={triggerOpenSidebar}
      className="p-2 rounded-lg bg-dark-800 border border-white/10 text-dark-300 hover:text-white hover:bg-dark-700 active:scale-95 transition-all"
      aria-label="Open menu"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>
  );
}

// ── Page Shell ──
export const PageShell = memo(function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="p-5 pt-6 lg:p-8 space-y-6 animate-fade-in min-h-screen">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-dark-300 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
          <MenuButton />
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  );
});

// ── Card ──
export const Card = memo(function Card({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={`glass-card ${padding ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
});

// ── Stat Card ──
export const StatCard = memo(function StatCard({
  label,
  value,
  change,
  icon,
  color = "default",
}: {
  label: string;
  value: string;
  change?: string;
  icon?: ReactNode;
  color?: "default" | "profit" | "loss" | "accent";
}) {
  const colorMap = {
    default: "text-white",
    profit: "text-profit",
    loss: "text-loss",
    accent: "text-accent-400",
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-dark-400 font-medium">{label}</p>
          <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
          {change && (
            <p
              className={`text-xs font-medium ${
                change.startsWith("+") ? "text-profit" : change.startsWith("-") ? "text-loss" : "text-dark-300"
              }`}
            >
              {change}
            </p>
          )}
        </div>
        {icon && <div className="p-2 rounded-lg bg-white/5 text-dark-300">{icon}</div>}
      </div>
    </Card>
  );
});

// ── Button ──
export const Button = memo(function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-500/50";
  const variants = {
    primary: "bg-accent-500 hover:bg-accent-600 text-white shadow-lg shadow-accent-500/20",
    secondary: "bg-dark-700 hover:bg-dark-600 text-dark-100 border border-white/10",
    ghost: "hover:bg-white/5 text-dark-300 hover:text-white",
    danger: "bg-loss/10 hover:bg-loss/20 text-loss border border-loss/20",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
});

// ── Input ──
export const Input = memo(function Input({
  label,
  error,
  className = "",
  suffix,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  suffix?: string;
}) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-dark-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={`w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-dark-400 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all ${
            error ? "border-loss/50" : ""
          } ${suffix ? "pr-12" : ""} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-dark-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-loss" role="alert">{error}</p>}
    </div>
  );
});

// ── Select ──
export const Select = memo(function Select({
  label,
  options,
  className = "",
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
}) {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-dark-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all cursor-pointer ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
});

// ── Textarea ──
export const Textarea = memo(function Textarea({
  label,
  className = "",
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
}) {
  const textareaId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-xs font-medium text-dark-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-dark-400 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all resize-none ${className}`}
        rows={3}
        {...props}
      />
    </div>
  );
});

// ── Searchable Combobox ──
export function Combobox({
  label,
  value,
  onChange,
  options,
  onCreateNew,
  onEdit,
  onDelete,
  placeholder = "Search or type to create...",
  allowCreate = true,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; value: string; color?: string | null }[];
  onCreateNew?: (value: string) => Promise<void>;
  onEdit?: (id: string, value: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  placeholder?: string;
  allowCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => options.filter((o) => o.value.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const showCreateOption = allowCreate && search.trim() && !options.some((o) => o.value.toLowerCase() === search.toLowerCase().trim());

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setSearch(val);
    setOpen(false);
  }, [onChange]);

  const handleCreate = useCallback(async () => {
    if (onCreateNew && search.trim() && !isCreating) {
      setIsCreating(true);
      try {
        await onCreateNew(search.trim());
        onChange(search.trim());
        setOpen(false);
      } finally {
        setIsCreating(false);
      }
    }
  }, [onCreateNew, search, onChange, isCreating]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && showCreateOption) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab" && open && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[0].value);
    }
  }, [showCreateOption, handleCreate, open, filtered, handleSelect]);

  const startEdit = useCallback((id: string, val: string) => {
    setEditingId(id);
    setEditValue(val);
  }, []);

  const saveEdit = useCallback(async (id: string) => {
    if (onEdit && editValue.trim()) {
      await onEdit(id, editValue.trim());
    }
    setEditingId(null);
  }, [onEdit, editValue]);

  const comboboxId = `combobox-${label?.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={comboboxId} className="text-xs font-medium text-dark-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={comboboxId}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-dark-400 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all pr-8"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white p-1"
          aria-label="Toggle dropdown"
          tabIndex={-1}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {open && (
          <div 
            className="absolute z-50 w-full mt-1 bg-dark-800 border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in"
            role="listbox"
          >
            {filtered.length === 0 && !showCreateOption && (
              <div className="px-3 py-4 text-sm text-dark-400 text-center">No options found</div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-white/5 group"
                role="option"
              >
                {editingId === opt.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(opt.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => saveEdit(opt.id)}
                    autoFocus
                    className="flex-1 bg-dark-700 border border-accent-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className="flex-1 text-left text-sm text-white py-0.5"
                    >
                      {opt.value}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(opt.id, opt.value);
                          }}
                          className="p-1 text-dark-400 hover:text-white rounded hover:bg-white/10"
                          aria-label={`Edit ${opt.value}`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(opt.id);
                          }}
                          className="p-1 text-dark-400 hover:text-loss rounded hover:bg-loss/10"
                          aria-label={`Delete ${opt.value}`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full px-3 py-2 text-left text-sm text-accent-400 hover:bg-accent-500/10 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {isCreating ? "Creating..." : `Create "${search.trim()}"`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Multi-Select Combobox ──
export function MultiCombobox({
  label,
  values,
  onChange,
  options,
  onCreateNew,
  onEdit,
  onDelete,
  placeholder = "Search or add...",
}: {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: { id: string; value: string }[];
  onCreateNew?: (value: string) => Promise<void>;
  onEdit?: (id: string, value: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => options.filter((o) => o.value.toLowerCase().includes(search.toLowerCase()) && !values.includes(o.value)),
    [options, search, values]
  );

  const showCreateOption = search.trim() && !options.some((o) => o.value.toLowerCase() === search.toLowerCase().trim());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addValue = useCallback((val: string) => {
    if (!values.includes(val)) {
      onChange([...values, val]);
    }
    setSearch("");
  }, [values, onChange]);

  const removeValue = useCallback((val: string) => {
    onChange(values.filter((v) => v !== val));
  }, [values, onChange]);

  const handleCreate = useCallback(async () => {
    if (onCreateNew && search.trim() && !isCreating) {
      setIsCreating(true);
      try {
        await onCreateNew(search.trim());
        addValue(search.trim());
      } finally {
        setIsCreating(false);
      }
    }
  }, [onCreateNew, search, addValue, isCreating]);

  const multiId = `multi-${label?.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={multiId} className="text-xs font-medium text-dark-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <div
          className="min-h-[38px] bg-dark-800 border border-white/10 rounded-lg px-2 py-1.5 flex flex-wrap gap-1.5 cursor-text focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500/30 transition-all"
          onClick={() => inputRef.current?.focus()}
        >
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-500/15 text-accent-400 rounded text-xs"
            >
              {v}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeValue(v);
                }}
                className="hover:text-white focus:outline-none"
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={multiId}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreateOption) {
                e.preventDefault();
                handleCreate();
              } else if (e.key === "Enter" && filtered.length > 0) {
                e.preventDefault();
                addValue(filtered[0].value);
              } else if (e.key === "Backspace" && !search && values.length > 0) {
                removeValue(values[values.length - 1]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={values.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[100px] bg-transparent text-sm text-white placeholder:text-dark-400 focus:outline-none"
          />
        </div>

        {open && (filtered.length > 0 || showCreateOption) && (
          <div className="absolute z-50 w-full mt-1 bg-dark-800 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-fade-in">
            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => addValue(opt.value)}
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center justify-between group"
              >
                {opt.value}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  {onEdit && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        const newVal = prompt("Edit value:", opt.value);
                        if (newVal && newVal.trim()) onEdit(opt.id, newVal.trim());
                      }}
                      className="p-1 text-dark-400 hover:text-white cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    </span>
                  )}
                  {onDelete && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(opt.id);
                      }}
                      className="p-1 text-dark-400 hover:text-loss cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            ))}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full px-3 py-2 text-left text-sm text-accent-400 hover:bg-accent-500/10 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {isCreating ? "Creating..." : `Create "${search.trim()}"`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Badge ──
export const Badge = memo(function Badge({
  children,
  variant = "default",
  size = "md",
}: {
  children: ReactNode;
  variant?: "default" | "profit" | "loss" | "warn" | "accent";
  size?: "sm" | "md";
}) {
  const variants = {
    default: "bg-dark-600 text-dark-200",
    profit: "bg-profit/15 text-profit",
    loss: "bg-loss/15 text-loss",
    warn: "bg-warn/15 text-warn",
    accent: "bg-accent-500/15 text-accent-400",
  };
  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
  };
  return (
    <span className={`inline-flex items-center rounded-md font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
});

// ── Modal ──
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative glass-card p-6 ${wide ? "w-full max-w-4xl" : "w-full max-w-lg"} max-h-[90vh] overflow-y-auto animate-fade-in`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="modal-title" className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/50"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Empty State ──
export const EmptyState = memo(function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-white/5 text-dark-400 mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-dark-400 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
});

// ── Tabs ──
export const Tabs = memo(function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: string; label: string }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-dark-800/50 p-1 rounded-lg overflow-x-auto" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          role="tab"
          aria-selected={active === tab.value}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-accent-500/50 ${
            active === tab.value
              ? "bg-accent-500/15 text-accent-400"
              : "text-dark-400 hover:text-dark-200 hover:bg-white/5"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

// ── Toggle/Switch ──
export const Toggle = memo(function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
}) {
  const toggleId = id || `toggle-${label?.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={toggleId} className="flex items-center gap-3 cursor-pointer">
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/50 ${
          checked ? "bg-accent-500" : "bg-dark-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
      {label && <span className="text-sm text-dark-200">{label}</span>}
    </label>
  );
});

// ── Image Upload ──
export function ImageUpload({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value?: string | null;
  onChange: (dataUrl: string) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onChange(ev.target.result as string);
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        alert("Failed to read file");
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    }
  }, [onChange]);

  const uploadId = `upload-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={uploadId} className="text-xs font-medium text-dark-300 uppercase tracking-wider">
        {label}
      </label>
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt={label}
            className="w-full h-32 object-cover rounded-lg border border-white/10"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Replace image"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-2 bg-loss/30 rounded-lg text-loss hover:bg-loss/50 transition-colors focus:outline-none focus:ring-2 focus:ring-loss/50"
                aria-label="Remove image"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="w-full h-32 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-2 text-dark-400 hover:border-accent-500/50 hover:text-accent-400 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
        >
          {isLoading ? (
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <span className="text-xs">Click to upload</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        id={uploadId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label={label}
      />
    </div>
  );
}

// ── Loading Skeleton ──
export const Skeleton = memo(function Skeleton({
  className = "",
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-dark-700 rounded animate-pulse" style={{ width: `${60 + ((i * 13) % 40)}%` }} />
      ))}
    </div>
  );
});

// ── Confirmation Dialog ──
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
}) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-dark-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
        <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
