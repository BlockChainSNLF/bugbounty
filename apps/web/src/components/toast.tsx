"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { explorerTxUrl, shortHash } from "../lib/explorer";

type Toast = {
  id: number;
  kind: "tx" | "success" | "error";
  title: string;
  hash?: string;
};

type ToastApi = {
  showTx: (title: string, hash: string) => void;
  showSuccess: (title: string) => void;
  showError: (title: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++counter;
      setToasts((current) => [...current, { ...toast, id }]);
      const ttl = toast.kind === "error" ? 8000 : 6000;
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      showTx: (title, hash) => push({ kind: "tx", title, hash }),
      showSuccess: (title) => push({ kind: "success", title }),
      showError: (title) => push({ kind: "error", title }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            <div className="toast-body">
              <span className="toast-title">{toast.title}</span>
              {toast.hash ? (
                <a className="toast-link" href={explorerTxUrl(toast.hash)} target="_blank" rel="noopener noreferrer">
                  View on explorer · {shortHash(toast.hash)} ↗
                </a>
              ) : null}
            </div>
            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Close">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
