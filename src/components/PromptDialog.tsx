"use client";

import { useEffect, useState } from "react";

export default function PromptDialog({
  open,
  title,
  message,
  label,
  defaultValue = "",
  placeholder,
  type = "text",
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: "text" | "number";
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);

  // Reseed the field each time the dialog opens.
  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) onConfirm(value);
        }}
        role="dialog"
        aria-modal="true"
        className="card relative z-10 w-full max-w-sm p-5 shadow-2xl"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && <p className="mt-2 text-sm text-muted">{message}</p>}

        <div className="mt-4">
          {label && <label className="label">{label}</label>}
          <input
            className="input"
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>

        {error && <p className="mt-2 text-sm text-down">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={danger ? "btn-down" : "btn-brand"}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
