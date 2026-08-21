import { useState, useMemo } from 'react';

// obrasSociales: lista completa [{id, nombre, tipo, rnas, rnemp, cuit}]
// value: obra_social_id seleccionado (o null)
export default function ObraSocialCodeSelector({ obrasSociales, value, onChange, onCrear }) {
  const [tipo, setTipo] = useState('Obra Social');
  const [codigo, setCodigo] = useState('');
  const [open, setOpen] = useState(false);

  const seleccionada = obrasSociales.find((o) => o.id === value);

  const resultados = useMemo(() => {
    const c = codigo.trim();
    if (!c) return [];
    return obrasSociales
      .filter((o) => o.tipo === tipo)
      .filter((o) => (tipo === 'Obra Social' ? o.rnas : o.rnemp)?.toLowerCase().includes(c.toLowerCase()))
      .slice(0, 20);
  }, [obrasSociales, tipo, codigo]);

  if (seleccionada && !open) {
    return (
      <div className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{seleccionada.nombre}</strong>
          <div className="hint">
            {seleccionada.tipo} · {seleccionada.tipo === 'Obra Social' ? `RNAS ${seleccionada.rnas ?? '—'}` : `RNEMP ${seleccionada.rnemp ?? '—'}`}
            {seleccionada.cuit ? ` · CUIT ${seleccionada.cuit}` : ''}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => { setOpen(true); setCodigo(''); }}>Cambiar</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {['Obra Social', 'Empresa de Medicina Prepaga'].map((t) => (
          <button
            key={t}
            className={tipo === t ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => { setTipo(t); setCodigo(''); }}
          >
            {t === 'Obra Social' ? 'Obra Social (RNAS)' : 'EMP (RNEMP)'}
          </button>
        ))}
      </div>
      <input
        className="search-input"
        style={{ width: '100%' }}
        placeholder={tipo === 'Obra Social' ? 'Buscar por código RNAS...' : 'Buscar por código RNEMP...'}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
      />
      {codigo.trim() && (
        <div className="card" style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
          {resultados.map((o) => (
            <div
              key={o.id}
              onClick={() => { onChange(o.id); setOpen(false); setCodigo(''); }}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft)' }}
            >
              <strong>{o.nombre}</strong>
              <div className="hint">
                {tipo === 'Obra Social' ? `RNAS ${o.rnas}` : `RNEMP ${o.rnemp}`}
                {o.cuit ? ` · CUIT ${o.cuit}` : ' · sin CUIT registrado'}
              </div>
            </div>
          ))}
          {resultados.length === 0 && (
            <div
              onClick={() => onCrear(tipo, codigo.trim())}
              style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--teal)', fontWeight: 600 }}
            >
              + No existe — crear {tipo === 'Obra Social' ? 'RNAS' : 'RNEMP'} "{codigo.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
