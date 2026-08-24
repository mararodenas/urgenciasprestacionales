import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../lib/useToast.jsx';
import { useConfirm } from '../lib/useConfirm.jsx';

export default function PlantillaForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast, ToastEl } = useToast();
  const { confirmAction, ConfirmEl } = useConfirm();

  const [nombre, setNombre] = useState('');
  const [apertura, setApertura] = useState('');
  const [cierre, setCierre] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      supabase.from('plantillas_informe').select('*').eq('id', id).single().then(({ data }) => {
        if (data) { setNombre(data.nombre); setApertura(data.texto_apertura ?? ''); setCierre(data.texto_cierre_tecnico ?? ''); }
        setLoading(false);
      });
    }
  }, [id]);

  async function handleSave() {
    if (!nombre.trim()) { showToast('Falta el nombre de la plantilla'); return; }
    setSaving(true);
    const payload = { nombre: nombre.trim(), texto_apertura: apertura, texto_cierre_tecnico: cierre };
    if (isNew) {
      const { data, error } = await supabase.from('plantillas_informe').insert(payload).select().single();
      setSaving(false);
      if (error) { showToast('Error: ' + error.message); return; }
      showToast('Plantilla creada');
      navigate(`/plantillas/${data.id}`);
    } else {
      const { error } = await supabase.from('plantillas_informe').update(payload).eq('id', id);
      setSaving(false);
      if (error) { showToast('Error: ' + error.message); return; }
      showToast('Guardado');
    }
  }

  async function handleDelete() {
    const ok = await confirmAction('Esta acción no se puede deshacer.', { title: `Eliminar "${nombre}"` });
    if (!ok) return;
    const { error } = await supabase.from('plantillas_informe').delete().eq('id', id);
    if (error) { showToast('No se pudo eliminar: ' + error.message); return; }
    navigate('/plantillas');
  }

  if (loading) return <div className="empty-state">Cargando...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{isNew ? 'Nueva plantilla' : 'Ficha'}</div>
          <h1>{isNew ? 'Nueva plantilla' : nombre}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/plantillas')}>Volver</button>
          {!isNew && <button className="btn btn-ghost btn-danger" onClick={handleDelete}>Eliminar</button>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginTop: 0 }}>Datos generales</div>
        <div className="form-grid">
          <div className="field span-4">
            <label>Nombre <span className="hint">(ej: Oncología)</span></label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
        </div>

        <div className="section-title">Texto de apertura</div>
        <p className="hint" style={{ marginTop: -4, marginBottom: 8 }}>
          Va después del párrafo del denunciante/afiliado y antes del DIAGNÓSTICO. Separá párrafos dejando una línea en blanco.
        </p>
        <div className="field">
          <textarea style={{ minHeight: 260, fontFamily: 'inherit' }} value={apertura} onChange={(e) => setApertura(e.target.value)} />
        </div>

        <div className="section-title">Texto de cierre técnico</div>
        <p className="hint" style={{ marginTop: -4, marginBottom: 8 }}>
          Va después de las Indicaciones Médicas de la droga y antes del traslado a la entidad denunciada.
        </p>
        <div className="field">
          <textarea style={{ minHeight: 140, fontFamily: 'inherit' }} value={cierre} onChange={(e) => setCierre(e.target.value)} />
        </div>
      </div>
      {ToastEl}
      {ConfirmEl}
    </>
  );
}
