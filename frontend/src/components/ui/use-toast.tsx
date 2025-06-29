import * as React from "react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, "id">) => void
  dismiss: (toastId: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    // Return a mock implementation if not in provider
    return {
      toast: (toast: Omit<Toast, "id">) => {
        // Simple console log for now
        console.log('Toast:', toast.title, toast.description)
      },
      toasts: [],
      dismiss: () => {},
    }
  }
  return context
}

export { ToastContext }