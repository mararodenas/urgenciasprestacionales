import { useState, useRef, useEffect } from 'react';

// Icono "?" que abre un popover flotante con ayuda contextual.
// Uso: <HelpTip title="Solicitud">Texto explicando la sección...</HelpTip>
export default function HelpTip({ title, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <span className="help-tip" ref={ref}>
      <button
        type="button"
        className="help-tip-btn"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Ayuda"
      >
        ?
      </button>
      {open && (
        <div className="help-tip-popover" onClick={(e) => e.stopPropagation()}>
          {title && <strong>{title}</strong>}
          <div>{children}</div>
        </div>
      )}
    </span>
  );
}
