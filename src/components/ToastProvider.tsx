import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from '../hooks/useToast'
import type { ToastFn, ToastItem } from '../hooks/useToast'
import { uuid } from '../lib/id'
import { IconClose } from './Icons'
import styles from './ToastProvider.module.css'

type ActiveToast = ToastItem & { id: string }

const DEFAULT_DURATION = 5000

/**
 * App-wide snackbar host. Renders a fixed stack above the bottom nav and hands
 * `toast()` down via context. Auto-dismisses each toast; an optional action
 * (e.g. Undo) dismisses on tap. Slide-in honours the global reduced-motion
 * reset.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback<ToastFn>(
    ({ message, action, duration = DEFAULT_DURATION }) => {
      const id = uuid()
      setToasts((ts) => [...ts, { id, message, action }])
      timers.current.set(id, setTimeout(() => dismiss(id), duration))
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className={styles.viewport} role="region" aria-label="Notifications">
          {toasts.map((t) => (
            <div key={t.id} className={styles.toast} role="status">
              <span className={styles.message}>{t.message}</span>
              {t.action && (
                <button
                  className={styles.action}
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                className={styles.close}
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
              >
                <IconClose size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
