import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const bloques = [
  { prefix: 'dg', titulo: 'Dirección General' },
  { prefix: 'am', titulo: 'Auditoría Médica' },
  { prefix: 'ad', titulo: 'Contacto adicional' },
];

export default function ObraSocialModal({ open, initialNombre, initialTipo, initialCodigo, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const tipo = initialTipo || 'Obra Social';
      setForm({
        tipo,
        nombre: initialNombre || '',
        nombre_comercial: '',
        rnas: tipo === 'Obra Social' ? (initialCodigo || '') : '',
        rnemp: tipo === 'Empresa de Medicina Prepaga' ? (initialCodigo || '') : '',
        cuit: '',
        activo: true,
        dg_nombre: '', dg_cargo: '', dg_telefono: '', dg_movil: '', dg_email: '', dg_notas: '',
        am_nombre: '', am_cargo: '', am_telefono: '', am_movil: '', am_email: '', am_notas: '',
        ad_nombre: '', ad_cargo: '', ad_telefono: '', ad_movil: '', ad_email: '', ad_notas: '',
        info_adicional: '',
      });
      setError('');
    }
  }, [open, initialNombre, initialTipo, initialCodigo]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.nombre?.trim()) { setError('Falta el nombre de la entidad'); return; }
    setSaving(true);
    setError('');
    const { data, error: err } = await supabase.from('obras_sociales').insert(form).select().single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved(data);
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h2>Nueva Obra Social / EMP</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="section-title section-title-flush">Datos generales</div>
          <div className="form-grid">
            <div className="field span-2">
              <label>Nombre</label>
              <input value={form.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} autoFocus />
            </div>
            <div className="field span-2">
              <label>Nombre comercial</label>
              <input value={form.nombre_comercial ?? ''} onChange={(e) => set('nombre_comercial', e.target.value)} />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={form.tipo ?? 'Obra Social'} onChange={(e) => set('tipo', e.target.value)}>
                <option>Obra Social</option>
                <option>Empresa de Medicina Prepaga</option>
              </select>
            </div>
            {form.tipo === 'Obra Social' ? (
              <div className="field">
                <label>RNAS</label>
                <input value={form.rnas ?? ''} onChange={(e) => set('rnas', e.target.value)} />
              </div>
            ) : (
              <div className="field">
                <label>RNEMP</label>
                <input value={form.rnemp ?? ''} onChange={(e) => set('rnemp', e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>CUIT</label>
              <input value={form.cuit ?? ''} onChange={(e) => set('cuit', e.target.value)} />
            </div>
          </div>

          {bloques.map(({ prefix, titulo }) => (
            <div key={prefix}>
              <div className="section-title">{titulo}</div>
              <div className="form-grid">
                <div className="field">
                  <label>Nombre</label>
                  <input value={form[`${prefix}_nombre`] ?? ''} onChange={(e) => set(`${prefix}_nombre`, e.target.value)} />
                </div>
                <div className="field">
                  <label>Cargo</label>
                  <input value={form[`${prefix}_cargo`] ?? ''} onChange={(e) => set(`${prefix}_cargo`, e.target.value)} />
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input value={form[`${prefix}_telefono`] ?? ''} onChange={(e) => set(`${prefix}_telefono`, e.target.value)} />
                </div>
                <div className="field">
                  <label>Móvil</label>
                  <input value={form[`${prefix}_movil`] ?? ''} onChange={(e) => set(`${prefix}_movil`, e.target.value)} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input value={form[`${prefix}_email`] ?? ''} onChange={(e) => set(`${prefix}_email`, e.target.value)} />
                </div>
                <div className="field">
                  <label>Notas</label>
                  <input value={form[`${prefix}_notas`] ?? ''} onChange={(e) => set(`${prefix}_notas`, e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          <div className="section-title">Información adicional</div>
          <div className="field">
            <textarea value={form.info_adicional ?? ''} onChange={(e) => set('info_adicional', e.target.value)} />
          </div>

          {error && <p style={{ color: 'var(--brick)', fontSize: 13, marginTop: 10 }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar entidad'}
          </button>
        </div>
      </div>
    </div>
  );
}
