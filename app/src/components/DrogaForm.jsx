import { useEffect, useState, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../lib/useToast.jsx';
import { useConfirm } from '../lib/useConfirm.jsx';
import RichTextEditor from './RichTextEditor';
import HelpTip from './HelpTip';

export default function DrogaForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast, ToastEl } = useToast();
  const { confirmAction, ConfirmEl } = useConfirm();

  const [nombre, setNombre] = useState('');
  const [codigoAtc, setCodigoAtc] = useState('');
  const [descripcionAnmat, setDescripcionAnmat] = useState('');
  const [marcas, setMarcas] = useState([]);
  const [nuevaMarca, setNuevaMarca] = useState({ nombre_comercial: '', numero_anmat: '', laboratorio: '' });
  const [combos, setCombos] = useState([]);
  const [patologias, setPatologias] = useState([]);
  const [comboAbierto, setComboAbierto] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data: p } = await supabase.from('patologias').select('id, nombre').order('nombre');
    setPatologias(p ?? []);
    if (!isNew) {
      setLoading(true);
      const { data: droga } = await supabase.from('drogas').select('*').eq('id', id).single();
      if (droga) { setNombre(droga.nombre); setCodigoAtc(droga.codigo_atc ?? ''); setDescripcionAnmat(droga.descripcion_anmat ?? ''); }
      const [m, c] = await Promise.all([
        supabase.from('marcas_comerciales').select('*').eq('droga_id', id).order('nombre_comercial'),
        supabase.from('droga_patologia').select('*').eq('droga_id', id),
      ]);
      setMarcas(m.data ?? []);
      setCombos(c.data ?? []);
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!nombre.trim()) { showToast('Falta el nombre genérico'); return; }
    setSaving(true);
    const payload = { nombre: nombre.trim(), codigo_atc: codigoAtc, descripcion_anmat: descripcionAnmat };
    if (isNew) {
      const { data, error } = await supabase.from('drogas').insert(payload).select().single();
      setSaving(false);
      if (error) { showToast('Error: ' + error.message); return; }
      showToast('Droga creada');
      navigate(`/catalogo/${data.id}`);
    } else {
      const { error } = await supabase.from('drogas').update(payload).eq('id', id);
      setSaving(false);
      if (error) { showToast('Error: ' + error.message); return; }
      showToast('Guardado');
    }
  }

  async function handleDelete() {
    const ok = await confirmAction('Esta acción no se puede deshacer.', { title: `Eliminar "${nombre}"` });
    if (!ok) return;
    const { error } = await supabase.from('drogas').delete().eq('id', id);
    if (error) { showToast('No se pudo eliminar: ' + error.message); return; }
    navigate('/catalogo');
  }

  async function crearMarca() {
    if (!nuevaMarca.nombre_comercial.trim()) return;
    const { data, error } = await supabase.from('marcas_comerciales').insert({
      droga_id: id,
      nombre_comercial: nuevaMarca.nombre_comercial.trim(),
      numero_anmat: nuevaMarca.numero_anmat.trim() || null,
      laboratorio: nuevaMarca.laboratorio.trim() || null,
    }).select().single();
    if (error) { showToast('Error: ' + error.message); return; }
    setMarcas((prev) => [...prev, data]);
    setNuevaMarca({ nombre_comercial: '', numero_anmat: '', laboratorio: '' });
    showToast('Marca agregada');
  }

  function actualizarMarca(marcaId, campo, valor) {
    setMarcas((prev) => prev.map((m) => (m.id === marcaId ? { ...m, [campo]: valor } : m)));
  }

  async function guardarMarca(marca) {
    const { error } = await supabase.from('marcas_comerciales').update({
      nombre_comercial: marca.nombre_comercial,
      numero_anmat: marca.numero_anmat,
      laboratorio: marca.laboratorio,
    }).eq('id', marca.id);
    if (error) showToast('Error: ' + error.message);
    else showToast('Guardado');
  }

  async function eliminarMarca(marcaId) {
    const { error } = await supabase.from('marcas_comerciales').delete().eq('id', marcaId);
    if (error) { showToast('Error: ' + error.message); return; }
    setMarcas((prev) => prev.filter((m) => m.id !== marcaId));
  }

  function actualizarFundamentacion(comboId, html) {
    setCombos((prev) => prev.map((c) => (c.id === comboId ? { ...c, fundamentacion_texto: html } : c)));
  }

  async function guardarFundamentacion(combo) {
    const { error } = await supabase
      .from('droga_patologia')
      .update({ fundamentacion_texto: combo.fundamentacion_texto })
      .eq('id', combo.id);
    if (error) showToast('Error: ' + error.message);
    else showToast('Fundamentación guardada');
  }

  const patologiaNombre = (patId) => patologias.find((p) => p.id === patId)?.nombre ?? '—';

  if (loading) return <div className="empty-state">Cargando...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{isNew ? 'Nueva droga' : 'Ficha'}</div>
          <h1>{isNew ? 'Nueva droga' : nombre}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/catalogo')}>Volver</button>
          {!isNew && <button className="btn btn-ghost btn-danger" onClick={handleDelete}>Eliminar</button>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title" style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>
            Datos generales
            <HelpTip title="Datos generales">
              El <strong>Nombre genérico</strong> es el ingrediente activo (ej: Adalimumab) — es único, no se repite por marca.
              El <strong>Código ATC</strong> y la <strong>Descripción ANMAT</strong> (mecanismo de acción / grupo farmacoterapéutico)
              son datos de la droga en sí, iguales para todas sus marcas comerciales.
            </HelpTip>
          </span>
          <a href="https://servicios.pami.org.ar/vademecum/views/consultaPublica/listado.zul" target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600 }}>
            Buscar en el Vademecum ↗
          </a>
        </div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Nombre genérico</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="field span-2">
            <label>Código ATC</label>
            <input value={codigoAtc} onChange={(e) => setCodigoAtc(e.target.value)} />
          </div>
          <div className="field span-4">
            <label>Descripción ANMAT <span className="hint">(mecanismo de acción / grupo farmacoterapéutico)</span></label>
            <textarea value={descripcionAnmat} onChange={(e) => setDescripcionAnmat(e.target.value)} />
          </div>
        </div>

        {!isNew && (
          <>
            <div className="section-title">Marcas comerciales
              <HelpTip title="Marcas comerciales">
                Una misma droga puede venderse bajo varios nombres comerciales (ej: Adalimumab → AMGEVITA, HUMIRA, HULIO...).
                Cada marca tiene su propio <strong>N° de Certificado ANMAT</strong> — por eso van separadas acá, y no en
                los Datos generales. Cuando armás un expediente, elegís qué marca puntual se usó en ese caso.
              </HelpTip>
            </div>
            {marcas.map((marca) => (
              <div key={marca.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
                <div className="form-grid">
                  <div className="field">
                    <label>Nombre comercial</label>
                    <input value={marca.nombre_comercial} onChange={(e) => actualizarMarca(marca.id, 'nombre_comercial', e.target.value)} onBlur={() => guardarMarca(marca)} />
                  </div>
                  <div className="field">
                    <label>N° Certificado ANMAT</label>
                    <input value={marca.numero_anmat ?? ''} onChange={(e) => actualizarMarca(marca.id, 'numero_anmat', e.target.value)} onBlur={() => guardarMarca(marca)} />
                  </div>
                  <div className="field">
                    <label>Laboratorio</label>
                    <input value={marca.laboratorio ?? ''} onChange={(e) => actualizarMarca(marca.id, 'laboratorio', e.target.value)} onBlur={() => guardarMarca(marca)} />
                  </div>
                  <div className="field" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-danger" onClick={() => eliminarMarca(marca.id)}>Eliminar marca</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="card" style={{ padding: 12, background: 'var(--teal-tint)' }}>
              <div className="form-grid">
                <div className="field">
                  <label>+ Nueva marca</label>
                  <input
                    placeholder="Nombre comercial"
                    value={nuevaMarca.nombre_comercial}
                    onChange={(e) => setNuevaMarca((f) => ({ ...f, nombre_comercial: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>N° Certificado ANMAT</label>
                  <input value={nuevaMarca.numero_anmat} onChange={(e) => setNuevaMarca((f) => ({ ...f, numero_anmat: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Laboratorio</label>
                  <input value={nuevaMarca.laboratorio} onChange={(e) => setNuevaMarca((f) => ({ ...f, laboratorio: e.target.value }))} />
                </div>
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={crearMarca}>+ Agregar marca</button>
                </div>
              </div>
            </div>

            <div className="section-title">Fundamentación por patología
              <HelpTip title="Fundamentación por patología">
                Cada droga puede usarse para más de una patología, y la justificación médica cambia según el caso —
                por eso hay un texto de indicaciones distinto por cada combinación droga+patología. Este texto es el
                que se autocompleta en el expediente cuando elegís esa misma droga con esa misma patología, y es el
                que termina en el informe.
              </HelpTip>
            </div>
            {combos.length > 0 ? (
              <table className="registry" style={{ marginBottom: 10 }}>
                <tbody>
                  {combos.map((c) => {
                    const abierto = comboAbierto === c.id;
                    return (
                      <Fragment key={c.id}>
                        <tr onClick={() => setComboAbierto(abierto ? null : c.id)}>
                          <td><strong>{patologiaNombre(c.patologia_id)}</strong></td>
                          <td style={{ textAlign: 'right', color: 'var(--ink-muted)' }}>{abierto ? 'Cerrar ▲' : 'Ver / editar ▾'}</td>
                        </tr>
                        {abierto && (
                          <tr style={{ cursor: 'default' }}>
                            <td colSpan={2} style={{ padding: '0 16px 16px' }}>
                              <RichTextEditor
                                value={c.fundamentacion_texto}
                                onChange={(html) => actualizarFundamentacion(c.id, html)}
                                onBlurSave={() => guardarFundamentacion(c)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="hint">
                Todavía no se usó esta droga en ninguna patología. Se genera automáticamente la primera vez
                que la asociás desde la ficha de una Patología o desde un expediente.
              </p>
            )}
          </>
        )}
        {isNew && <p className="hint">Guardá la droga para poder cargarle marcas comerciales.</p>}
      </div>
      {ToastEl}
      {ConfirmEl}
    </>
  );
}
