"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error";
type Toast = { type: ToastType; message: string };
type AdminToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const AdminToastContext = createContext<AdminToastContextValue | null>(null);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, type });
    timeoutRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return (
    <AdminToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-4 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-emerald-700" : "bg-red-700"}`}
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="shrink-0 text-white/80 hover:text-white"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const context = useContext(AdminToastContext);
  if (!context) {
    throw new Error("useAdminToast phải được dùng bên trong AdminToastProvider.");
  }
  return context;
}
