import { useState, useCallback } from 'react';

export function useToast() {
  const [message, setMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2800);
  }, []);

  const ToastEl = message ? <div className="toast">{message}</div> : null;

  return { showToast, ToastEl };
}
