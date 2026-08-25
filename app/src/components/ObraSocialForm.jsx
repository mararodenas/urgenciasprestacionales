import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../lib/useToast.jsx';
import { useConfirm } from '../lib/useConfirm.jsx';
import HelpTip from './HelpTip';

const empty = {
  tipo: 'Obra Social',
  nombre: '',
  nombre_comercial: '',
  rnas: '',
  rnemp: '',
  cuit: '',
  activo: true,
  dg_nombre: '', dg_cargo: '', dg_telefono: '', dg_movil: '', dg_email: '', dg_notas: '',
  am_nombre: '', am_cargo: '', am_telefono: '', am_movil: '', am_email: '', am_notas: '',
  ad_nombre: '', ad_cargo: '', ad_telefono: '', ad_movil: '', ad_email: '', ad_notas: '',
  info_adicional: '',
};

export default function ObraSocialForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast, ToastEl } = useToast();
  const { confirmAction, ConfirmEl } = useConfirm();
  const [form, setForm] = useState(empty);
  const [filiales, setFiliales] = useState([]);
  const [nuevaFilial, setNuevaFilial] = useState({ nombre: '', localidad: '', provincia: '', telefono: '', email: '' });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      supabase.from('obras_sociales').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setForm(data);
        setLoading(false);
      });
      supabase.from('filiales').select('*').eq('obra_social_id', id).order('nombre').then(({ data }) => {
        setFiliales(data ?? []);
      });
    }
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.nombre) { showToast('Falta el nombre de la entidad'); return; }
    setSaving(true);
    const payload = { ...form };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    let error;
    if (isNew) {
      const res = await supabase.from('obras_sociales').insert(payload).select().single();
      error = res.error;
      if (!error) { showToast('Entidad creada'); navigate(`/obras-sociales/${res.data.id}`); }
    } else {
      const res = await supabase.from('obras_sociales').update(payload).eq('id', id);
      error = res.error;
      if (!error) showToast('Guardado');
    }
    if (error) showToast('Error: ' + error.message);
    setSaving(false);
  }

  async function handleDelete() {
    const ok = await confirmAction('Esta acción no se puede deshacer.', { title: `Eliminar "${form.nombre}"` });
    if (!ok) return;
    const { error } = await supabase.from('obras_sociales').delete().eq('id', id);
    if (error) { showToast('No se pudo eliminar: ' + error.message); return; }
    navigate('/obras-sociales');
  }

  async function crearFilial() {
    if (!nuevaFilial.nombre.trim()) return;
    const { data, error } = await supabase.from('filiales').insert({
      obra_social_id: id,
      nombre: nuevaFilial.nombre.trim(),
      localidad: nuevaFilial.localidad.trim() || null,
      provincia: nuevaFilial.provincia.trim() || null,
      telefono: nuevaFilial.telefono.trim() || null,
      email: nuevaFilial.email.trim() || null,
    }).select().single();
    if (error) { showToast('Error: ' + error.message); return; }
    setFiliales((prev) => [...prev, data]);
    setNuevaFilial({ nombre: '', localidad: '', provincia: '', telefono: '', email: '' });
    showToast('Filial agregada');
  }

  function actualizarFilial(filialId, campo, valor) {
    setFiliales((prev) => prev.map((f) => (f.id === filialId ? { ...f, [campo]: valor } : f)));
  }

  async function guardarFilial(filial) {
    const { error } = await supabase.from('filiales').update({
      nombre: filial.nombre,
      localidad: filial.localidad,
      provincia: filial.provincia,
      telefono: filial.telefono,
      email: filial.email,
    }).eq('id', filial.id);
    if (error) showToast('Error: ' + error.message);
    else showToast('Guardado');
  }

  async function eliminarFilial(filialId) {
    const { error } = await supabase.from('filiales').delete().eq('id', filialId);
    if (error) { showToast('Error: ' + error.message); return; }
    setFiliales((prev) => prev.filter((f) => f.id !== filialId));
  }

  if (loading) return <div className="empty-state">Cargando...</div>;

  const bloques = [
    { prefix: 'dg', titulo: 'Dirección General' },
    { prefix: 'am', titulo: 'Auditoría Médica' },
    { prefix: 'ad', titulo: 'Contacto adicional' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{isNew ? 'Nueva entidad' : 'Ficha'}</div>
          <h1>{isNew ? 'Nueva Obra Social / EMP' : form.nombre}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/obras-sociales')}>Volver</button>
          {!isNew && <button className="btn btn-ghost btn-danger" onClick={handleDelete}>Eliminar</button>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title">Datos generales</div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Nombre</label>
            <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
          </div>
          <div className="field span-2">
            <label>Nombre comercial</label>
            <input value={form.nombre_comercial ?? ''} onChange={(e) => set('nombre_comercial', e.target.value)} />
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
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
          <div className="field">
            <label>Estado</label>
            <select value={form.activo ? 'activa' : 'baja'} onChange={(e) => set('activo', e.target.value === 'activa')}>
              <option value="activa">Activa</option>
              <option value="baja">De baja</option>
            </select>
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

        {!isNew && (
          <>
            <div className="section-title">Filiales / Delegaciones
              <HelpTip title="Filiales">
                Si esta entidad tiene sucursales o delegaciones regionales (ej: "Filial Rosario", "Delegación Tandil"),
                cargalas acá. Al elegir esta Obra Social/EMP en un expediente, vas a poder elegir a cuál filial puntual
                corresponde el caso — útil cuando el reclamo se dirige a una delegación específica.
              </HelpTip>
            </div>
            {filiales.map((f) => (
              <div key={f.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
                <div className="form-grid">
                  <div className="field span-2">
                    <label>Nombre de la filial</label>
                    <input value={f.nombre} onChange={(e) => actualizarFilial(f.id, 'nombre', e.target.value)} onBlur={() => guardarFilial(f)} />
                  </div>
                  <div className="field">
                    <label>Localidad</label>
                    <input value={f.localidad ?? ''} onChange={(e) => actualizarFilial(f.id, 'localidad', e.target.value)} onBlur={() => guardarFilial(f)} />
                  </div>
                  <div className="field">
                    <label>Provincia</label>
                    <input value={f.provincia ?? ''} onChange={(e) => actualizarFilial(f.id, 'provincia', e.target.value)} onBlur={() => guardarFilial(f)} />
                  </div>
                  <div className="field">
                    <label>Teléfono</label>
                    <input value={f.telefono ?? ''} onChange={(e) => actualizarFilial(f.id, 'telefono', e.target.value)} onBlur={() => guardarFilial(f)} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input value={f.email ?? ''} onChange={(e) => actualizarFilial(f.id, 'email', e.target.value)} onBlur={() => guardarFilial(f)} />
                  </div>
                  <div className="field" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-danger" onClick={() => eliminarFilial(f.id)}>Eliminar filial</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="card" style={{ padding: 12, background: 'var(--teal-tint)' }}>
              <div className="form-grid">
                <div className="field span-2">
                  <label>+ Nueva filial</label>
                  <input
                    placeholder="Nombre (ej: Filial Rosario)"
                    value={nuevaFilial.nombre}
                    onChange={(e) => setNuevaFilial((f) => ({ ...f, nombre: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Localidad</label>
                  <input value={nuevaFilial.localidad} onChange={(e) => setNuevaFilial((f) => ({ ...f, localidad: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Provincia</label>
                  <input value={nuevaFilial.provincia} onChange={(e) => setNuevaFilial((f) => ({ ...f, provincia: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input value={nuevaFilial.telefono} onChange={(e) => setNuevaFilial((f) => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={crearFilial}>+ Agregar filial</button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="section-title">Información adicional</div>
        <div className="field">
          <textarea value={form.info_adicional ?? ''} onChange={(e) => set('info_adicional', e.target.value)} />
        </div>
      </div>
      {ToastEl}
      {ConfirmEl}
    </>
  );
}
