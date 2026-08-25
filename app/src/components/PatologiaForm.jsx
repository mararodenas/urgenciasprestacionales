import { useEffect, useState, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../lib/useToast.jsx';
import { useConfirm } from '../lib/useConfirm.jsx';
import SearchSelect from './SearchSelect';
import RichTextEditor from './RichTextEditor';
import HelpTip from './HelpTip';

export default function PatologiaForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast, ToastEl } = useToast();
  const { confirmAction, ConfirmEl } = useConfirm();

  const [nombre, setNombre] = useState('');
  const [combos, setCombos] = useState([]);
  const [drogas, setDrogas] = useState([]);
  const [comboAbierto, setComboAbierto] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const { data: d } = await supabase.from('drogas').select('id, nombre').order('nombre');
    setDrogas(d ?? []);

    if (!isNew) {
      setLoading(true);
      const { data: pat } = await supabase.from('patologias').select('*').eq('id', id).single();
      if (pat) { setNombre(pat.nombre); }
      const { data: c } = await supabase.from('droga_patologia').select('*').eq('patologia_id', id);
      setCombos(c ?? []);
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!nombre.trim()) { showToast('Falta el nombre de la patología'); return; }
    setSaving(true);
    if (isNew) {
      const { data, error } = await supabase.from('patologias').insert({ nombre: nombre.trim() }).select().single();
      setSaving(false);
      if (error) { showToast('Error: ' + error.message); return; }
      showToast('Patología creada');
      navigate(`/patologias/${data.id}`);
    } else {
      const { error } = await supabase.from('patologias').update({ nombre: nombre.trim() }).eq('id', id);
      setSaving(false);
      if (error) { showToast('Error: ' + error.message); return; }
      showToast('Guardado');
    }
  }

  async function handleDelete() {
    const ok = await confirmAction(
      'Se van a quitar también sus asociaciones con drogas. Esta acción no se puede deshacer.',
      { title: `Eliminar "${nombre}"` }
    );
    if (!ok) return;
    const { error } = await supabase.from('patologias').delete().eq('id', id);
    if (error) { showToast('No se pudo eliminar: ' + error.message); return; }
    navigate('/patologias');
  }

  async function crearDroga(nombreDrogaNueva) {
    const { data: droga, error } = await supabase.from('drogas').insert({ nombre: nombreDrogaNueva }).select().single();
    if (error) { showToast('Error al crear droga: ' + error.message); return null; }
    setDrogas((prev) => [...prev, droga]);
    return { id: droga.id, label: droga.nombre };
  }

  async function asociarDroga(drogaId) {
    const { data, error } = await supabase
      .from('droga_patologia')
      .insert({ patologia_id: id, droga_id: drogaId, fundamentacion_texto: '' })
      .select()
      .single();
    if (error) { showToast('Error al asociar: ' + error.message); return; }
    setCombos((prev) => [...prev, data]);
  }

  async function desasociarDroga(comboId) {
    const { error } = await supabase.from('droga_patologia').delete().eq('id', comboId);
    if (error) { showToast('Error: ' + error.message); return; }
    setCombos((prev) => prev.filter((c) => c.id !== comboId));
  }

  function actualizarFundamentacion(comboId, texto) {
    setCombos((prev) => prev.map((c) => (c.id === comboId ? { ...c, fundamentacion_texto: texto } : c)));
  }

  async function guardarFundamentacion(combo) {
    const { error } = await supabase
      .from('droga_patologia')
      .update({ fundamentacion_texto: combo.fundamentacion_texto })
      .eq('id', combo.id);
    if (error) showToast('Error: ' + error.message);
    else showToast('Fundamentación guardada');
  }

  const nombreDroga = (drogaId) => drogas.find((d) => d.id === drogaId)?.nombre ?? '—';

  if (loading) return <div className="empty-state">Cargando...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{isNew ? 'Nueva patología' : 'Ficha'}</div>
          <h1>{isNew ? 'Nueva patología' : nombre}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/patologias')}>Volver</button>
          {!isNew && <button className="btn btn-ghost btn-danger" onClick={handleDelete}>Eliminar</button>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title section-title-flush">Datos generales
          <HelpTip title="Datos generales">
            Solo el <strong>nombre</strong> de la patología. Se usa como opción en el desplegable "Patología" de cada
            expediente, y agrupa las drogas/fundamentaciones asociadas de abajo. La descripción de cada caso puntual
            se carga aparte, en el propio expediente (campo Diagnóstico).
          </HelpTip>
        </div>
        <div className="form-grid">
          <div className="field span-4">
            <label>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
        </div>

        {!isNew && (
          <>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>
                Drogas asociadas <span className="hint">(hasta 6 por tratamiento habitual)</span>
                <HelpTip title="Drogas asociadas">
                  Las drogas que se usan habitualmente para tratar esta patología. Al elegir esta patología en un
                  expediente, estas mismas drogas aparecen tildables para elegir rápido. Cada una tiene su propio
                  texto de "Indicaciones médicas / mecanismo de acción" — es el que después va en el informe.
                </HelpTip>
              </span>
              <a href="https://servicios.pami.org.ar/vademecum/views/consultaPublica/listado.zul" target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600 }}>
                Buscar en el Vademecum ↗
              </a>
            </div>
            {combos.length > 0 && (
              <table className="registry" style={{ marginBottom: 10 }}>
                <thead>
                  <tr><th>Droga</th><th></th></tr>
                </thead>
                <tbody>
                  {combos.map((c) => {
                    const abierto = comboAbierto === c.id;
                    return (
                      <Fragment key={c.id}>
                        <tr onClick={() => setComboAbierto(abierto ? null : c.id)}>
                          <td><strong>{nombreDroga(c.droga_id)}</strong></td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="hint" style={{ marginRight: 14 }}>{abierto ? 'Cerrar ▲' : 'Ver / editar ▾'}</span>
                            <button className="btn btn-ghost btn-danger" onClick={(e) => { e.stopPropagation(); desasociarDroga(c.id); }}>Quitar</button>
                          </td>
                        </tr>
                        {abierto && (
                          <tr style={{ cursor: 'default' }}>
                            <td colSpan={2} style={{ padding: '0 16px 16px' }}>
                              <div className="field">
                                <label>Indicaciones médicas / mecanismo de acción</label>
                                <RichTextEditor
                                  value={c.fundamentacion_texto}
                                  onChange={(html) => actualizarFundamentacion(c.id, html)}
                                  onBlurSave={() => guardarFundamentacion(c)}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="field">
              <label>Asociar droga</label>
              <SearchSelect
                options={drogas.filter((d) => !combos.some((c) => c.droga_id === d.id)).map((d) => ({ id: d.id, label: d.nombre }))}
                value={null}
                onChange={asociarDroga}
                placeholder="+ Agregar droga a esta patología..."
                onCreate={crearDroga}
                createLabel="Crear droga"
              />
            </div>
          </>
        )}
        {isNew && <p className="hint">Guardá la patología para poder asociarle drogas.</p>}
      </div>
      {ToastEl}
      {ConfirmEl}
    </>
  );
}
