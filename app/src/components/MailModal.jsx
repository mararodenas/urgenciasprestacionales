import { useState, useEffect } from 'react';

// Modal simple: muestra un texto generado (mail a OS o a Afiliado) en un
// textarea de solo lectura visual pero editable (por si hace falta un
// retoque de último momento antes de copiar), con botón "Copiar".
// tipoTratamiento es opcional: si se pasa onTipoTratamientoChange, se
// muestra un campo editable arriba del texto y se regenera el texto al
// tipear (usado solo por el mail a OS).
export default function MailModal({ open, title, texto, onClose, tipoTratamiento, onTipoTratamientoChange }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (open) setCopiado(false);
  }, [open, texto]);

  if (!open) return null;

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {onTipoTratamientoChange && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Tipo de tratamiento <span className="hint">(no se guarda, solo para este mail)</span></label>
              <input
                value={tipoTratamiento}
                onChange={(e) => onTipoTratamientoChange(e.target.value)}
                placeholder="ej: adyuvante a resección quirúrgica efectuada"
              />
            </div>
          )}
          <div className="field">
            <label>Texto del mail</label>
            <textarea
              readOnly
              value={texto}
              style={{ minHeight: 380, fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.5 }}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={handleCopiar}>
            {copiado ? '✓ Copiado' : 'Copiar texto'}
          </button>
        </div>
      </div>
    </div>
  );
}
