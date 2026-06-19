"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Kind = "ok" | "err" | "info";
type Toast = { id: number; text: string; kind: Kind };

const ToastCtx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border px-4 py-2 text-sm shadow-2xl ${
              t.kind === "ok"
                ? "border-up/40 bg-panel text-up"
                : t.kind === "err"
                ? "border-down/40 bg-panel text-down"
                : "border-border bg-panel text-text"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
