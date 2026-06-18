import { createContext, useContext } from 'react'

// Toast context + hook live apart from the provider component so the file
// exports no components (keeps react-refresh happy) and any page can pull in
// `useToast` without importing the provider.

export type ToastAction = { label: string; onClick: () => void }
/** A toast as rendered: message + optional action (no timing). */
export type ToastItem = {
  message: string
  action?: ToastAction
}
export type ToastInput = ToastItem & {
  /** Auto-dismiss after this many ms (default 5000). */
  duration?: number
}
export type ToastFn = (input: ToastInput) => void

export const ToastContext = createContext<ToastFn | null>(null)

/** Show a transient snackbar. Must be used under <ToastProvider>. */
export function useToast(): ToastFn {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
