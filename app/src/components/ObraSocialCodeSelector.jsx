import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// obrasSociales: lista completa [{id, nombre, tipo, rnas, rnemp, cuit}]
// value: obra_social_id seleccionado (o null)
// filialValue / onFilialChange: filial_id seleccionada (opcional)
export default function ObraSocialCodeSelector({ obrasSociales, value, onChange, onCrear, filialValue, onFilialChange }) {
  const [tipo, setTipo] = useState('Obra Social');
  const [codigo, setCodigo] = useState('');
  const [open, setOpen] = useState(false);
  const [filiales, setFiliales] = useState([]);

  const seleccionada = obrasSociales.find((o) => o.id === value);

  useEffect(() => {
    if (!value) { setFiliales([]); return; }
    supabase.from('filiales').select('id, nombre').eq('obra_social_id', value).order('nombre').then(({ data }) => {
      setFiliales(data ?? []);
    });
  }, [value]);

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
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: 'block', marginBottom: 6, fontSize: 14.5 }}>{seleccionada.nombre}</strong>
            <table className="os-datos">
              <tbody>
                <tr>
                  <td>Tipo</td>
                  <td>{seleccionada.tipo}</td>
                </tr>
                <tr>
                  <td>{seleccionada.tipo === 'Obra Social' ? 'RNAS' : 'RNEMP'}</td>
                  <td>{(seleccionada.tipo === 'Obra Social' ? seleccionada.rnas : seleccionada.rnemp) ?? '—'}</td>
                </tr>
                <tr>
                  <td>CUIT</td>
                  <td>{seleccionada.cuit ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button className="btn btn-secondary" onClick={() => { setOpen(true); setCodigo(''); }}>Cambiar</button>
        </div>
        {filiales.length > 0 && (
          <div className="field" style={{ marginTop: 12 }}>
            <label>Filial / Delegación <span className="hint">(opcional)</span></label>
            <select value={filialValue ?? ''} onChange={(e) => onFilialChange(e.target.value || null)}>
              <option value="">Sin especificar</option>
              {filiales.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </div>
        )}
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
              onClick={() => { onChange(o.id); onFilialChange?.(null); setOpen(false); setCodigo(''); }}
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
