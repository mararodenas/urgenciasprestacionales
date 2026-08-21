import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../lib/useToast.jsx';
import RichTextEditor from './RichTextEditor';

export default function CatalogoDrogas() {
  const [drogas, setDrogas] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [combos, setCombos] = useState([]);
  const [patologias, setPatologias] = useState([]);
  const [expandedDroga, setExpandedDroga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuevaDroga, setNuevaDroga] = useState({ nombre: '', codigo_atc: '' });
  const [nuevaMarca, setNuevaMarca] = useState({});
  const { showToast, ToastEl } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [d, m, c, p] = await Promise.all([
      supabase.from('drogas').select('*').order('nombre'),
      supabase.from('marcas_comerciales').select('*').order('nombre_comercial'),
      supabase.from('droga_patologia').select('*'),
      supabase.from('patologias').select('*').order('nombre'),
    ]);
    setDrogas(d.data ?? []);
    setMarcas(m.data ?? []);
    setCombos(c.data ?? []);
    setPatologias(p.data ?? []);
    setLoading(false);
  }

  async function crearDroga() {
    if (!nuevaDroga.nombre.trim()) return;
    const { error } = await supabase.from('drogas').insert(nuevaDroga);
    if (error) { showToast('Error: ' + error.message); return; }
    setNuevaDroga({ nombre: '', codigo_atc: '' });
    showToast('Droga agregada');
    load();
  }

  function actualizarDroga(id, campo, valor) {
    setDrogas((prev) => prev.map((d) => (d.id === id ? { ...d, [campo]: valor } : d)));
  }

  async function guardarDroga(droga) {
    const { error } = await supabase.from('drogas').update({
      nombre: droga.nombre,
      codigo_atc: droga.codigo_atc,
      descripcion_anmat: droga.descripcion_anmat,
    }).eq('id', droga.id);
    if (error) showToast('Error: ' + error.message);
    else showToast('Guardado');
  }

  async function crearMarca(drogaId) {
    const datos = nuevaMarca[drogaId];
    if (!datos?.nombre_comercial?.trim()) return;
    const { error } = await supabase.from('marcas_comerciales').insert({
      droga_id: drogaId,
      nombre_comercial: datos.nombre_comercial.trim(),
      numero_anmat: datos.numero_anmat?.trim() || null,
      laboratorio: datos.laboratorio?.trim() || null,
    });
    if (error) { showToast('Error: ' + error.message); return; }
    setNuevaMarca((prev) => ({ ...prev, [drogaId]: { nombre_comercial: '', numero_anmat: '', laboratorio: '' } }));
    showToast('Marca agregada');
    load();
  }

  function actualizarMarca(id, campo, valor) {
    setMarcas((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
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

  async function eliminarMarca(id) {
    const { error } = await supabase.from('marcas_comerciales').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message); return; }
    setMarcas((prev) => prev.filter((m) => m.id !== id));
  }

  async function actualizarFundamentacion(comboId, texto) {
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

  const patologiaNombre = (id) => patologias.find((p) => p.id === id)?.nombre ?? '—';

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Catálogo</div>
          <h1>Drogas y fundamentaciones</h1>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>Agregar droga (ingrediente activo)</span>
          <a href="https://servicios.pami.org.ar/vademecum/views/consultaPublica/listado.zul" target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600 }}>
            Buscar en el Vademecum ↗
          </a>
        </div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Nombre genérico</label>
            <input value={nuevaDroga.nombre} onChange={(e) => setNuevaDroga((f) => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div className="field span-2">
            <label>Código ATC</label>
            <input value={nuevaDroga.codigo_atc} onChange={(e) => setNuevaDroga((f) => ({ ...f, codigo_atc: e.target.value }))} />
          </div>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>Las marcas comerciales (con su propio N° ANMAT) se agregan después, dentro de cada droga.</p>
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={crearDroga}>+ Agregar droga</button>
      </div>

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : drogas.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>Sin drogas cargadas todavía</h3></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {drogas.map((droga) => {
            const combosDroga = combos.filter((c) => c.droga_id === droga.id);
            const marcasDroga = marcas.filter((m) => m.droga_id === droga.id);
            const isOpen = expandedDroga === droga.id;
            const nuevaM = nuevaMarca[droga.id] ?? { nombre_comercial: '', numero_anmat: '', laboratorio: '' };
            return (
              <div key={droga.id} className="card">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 20px', cursor: 'pointer' }}
                  onClick={() => setExpandedDroga(isOpen ? null : droga.id)}
                >
                  <div>
                    <strong>{droga.nombre}</strong>
                    {marcasDroga.length > 0 && (
                      <span style={{ color: 'var(--ink-muted)' }}> · {marcasDroga.map((m) => m.nombre_comercial).join(', ')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge-count">{marcasDroga.length} marca{marcasDroga.length !== 1 ? 's' : ''}</span>
                    <span className="badge-count">{combosDroga.length} patología{combosDroga.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--line-soft)' }}>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <div className="field span-2">
                        <label>Nombre genérico</label>
                        <input value={droga.nombre} onChange={(e) => actualizarDroga(droga.id, 'nombre', e.target.value)} onBlur={() => guardarDroga(droga)} />
                      </div>
                      <div className="field span-2">
                        <label>Código ATC</label>
                        <input value={droga.codigo_atc ?? ''} onChange={(e) => actualizarDroga(droga.id, 'codigo_atc', e.target.value)} onBlur={() => guardarDroga(droga)} />
                      </div>
                      <div className="field span-4">
                        <label>Descripción ANMAT <span className="hint">(mecanismo de acción / grupo farmacoterapéutico)</span></label>
                        <textarea value={droga.descripcion_anmat ?? ''} onChange={(e) => actualizarDroga(droga.id, 'descripcion_anmat', e.target.value)} onBlur={() => guardarDroga(droga)} />
                      </div>
                    </div>

                    <div className="section-title">Marcas comerciales</div>
                    {marcasDroga.map((marca) => (
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
                    <div className="card" style={{ padding: 12, background: 'var(--paper)' }}>
                      <div className="form-grid">
                        <div className="field">
                          <label>+ Nueva marca</label>
                          <input
                            placeholder="Nombre comercial"
                            value={nuevaM.nombre_comercial}
                            onChange={(e) => setNuevaMarca((prev) => ({ ...prev, [droga.id]: { ...nuevaM, nombre_comercial: e.target.value } }))}
                          />
                        </div>
                        <div className="field">
                          <label>N° Certificado ANMAT</label>
                          <input
                            value={nuevaM.numero_anmat ?? ''}
                            onChange={(e) => setNuevaMarca((prev) => ({ ...prev, [droga.id]: { ...nuevaM, numero_anmat: e.target.value } }))}
                          />
                        </div>
                        <div className="field">
                          <label>Laboratorio</label>
                          <input
                            value={nuevaM.laboratorio ?? ''}
                            onChange={(e) => setNuevaMarca((prev) => ({ ...prev, [droga.id]: { ...nuevaM, laboratorio: e.target.value } }))}
                          />
                        </div>
                        <div className="field" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-primary" onClick={() => crearMarca(droga.id)}>+ Agregar marca</button>
                        </div>
                      </div>
                    </div>

                    {combosDroga.length > 0 && (
                      <>
                        <div className="section-title">Fundamentación por patología</div>
                        {combosDroga.map((c) => (
                          <div key={c.id} className="field" style={{ marginBottom: 12 }}>
                            <label>{patologiaNombre(c.patologia_id)}</label>
                            <RichTextEditor
                              value={c.fundamentacion_texto}
                              onChange={(html) => actualizarFundamentacion(c.id, html)}
                              onBlurSave={() => guardarFundamentacion(c)}
                            />
                          </div>
                        ))}
                      </>
                    )}
                    {combosDroga.length === 0 && (
                      <p className="hint">
                        Todavía no se usó esta droga en ningún expediente, así que no tiene fundamentación cargada.
                        Se genera automáticamente la primera vez que la elegís en un expediente con una patología.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {ToastEl}
    </>
  );
}
