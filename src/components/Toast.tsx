import { useMemo } from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { useToastStore, type Toast } from "../store/useToastStore";
import { cn } from "../lib/utils";

const icons = {
  success: <CheckCircle2 size={16} className="text-success shrink-0" />,
  error: <XCircle size={16} className="text-destructive shrink-0" />,
  warning: <AlertTriangle size={16} className="text-warning shrink-0" />,
  info: <Info size={16} className="text-primary shrink-0" />,
} as const;

const toastStyles = {
  success: "border-success/20 bg-success/5",
  error: "border-destructive/20 bg-destructive/5",
  warning: "border-warning/20 bg-warning/5",
  info: "border-primary/20 bg-primary/5",
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm",
        "animate-in slide-in-from-right-full duration-300",
        "max-w-sm w-full",
        toastStyles[toast.type],
      )}
    >
      {icons[toast.type]}
      <p className="text-sm text-foreground flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  return useMemo(
    () => ({
      success: (message: string) => addToast("success", message),
      error: (message: string) => addToast("error", message),
      warning: (message: string) => addToast("warning", message),
      info: (message: string) => addToast("info", message),
    }),
    [addToast],
  );
}
