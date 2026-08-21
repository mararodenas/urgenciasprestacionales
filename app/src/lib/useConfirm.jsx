import { useState, useCallback, useRef } from 'react';

// Uso: const { confirmAction, ConfirmEl } = useConfirm();
// const ok = await confirmAction('¿Seguro?', { title: 'Eliminar expediente' });
export function useConfirm() {
  const [state, setState] = useState({ open: false, title: '', message: '', confirmLabel: 'Sí, eliminar' });
  const resolver = useRef(null);

  const confirmAction = useCallback((message, opts = {}) => {
    setState({
      open: true,
      title: opts.title ?? 'Confirmar acción',
      message,
      confirmLabel: opts.confirmLabel ?? 'Sí, eliminar',
    });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function handle(result) {
    setState((s) => ({ ...s, open: false }));
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  }

  const ConfirmEl = state.open ? (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) handle(false); }}>
      <div className="modal-panel" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>{state.title}</h2>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)' }}>{state.message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => handle(false)}>Cancelar</button>
          <button
            className="btn"
            style={{ background: 'var(--brick)', color: '#fff' }}
            onClick={() => handle(true)}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirmAction, ConfirmEl };
}
