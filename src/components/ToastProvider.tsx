import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number; // ms
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = nextId.current++;
      const defaultDur = type === 'warning' ? 5000 : 3000;
      const toast: Toast = { id, type, message, duration: duration ?? defaultDur };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => removeToast(id), toast.duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-md shadow-md text-sm text-white 
              ${t.type === 'success' ? 'bg-emerald-600' : ''}
              ${t.type === 'error' ? 'bg-rose-600' : ''}
              ${t.type === 'warning' ? 'bg-amber-600' : ''}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
