import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../lib/useToast.jsx';

export default function CatalogoDrogas() {
  const [drogas, setDrogas] = useState([]);
  const [combos, setCombos] = useState([]);
  const [patologias, setPatologias] = useState([]);
  const [expandedDroga, setExpandedDroga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuevaDroga, setNuevaDroga] = useState({ nombre: '', nombre_comercial: '', numero_anmat: '' });
  const { showToast, ToastEl } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [d, c, p] = await Promise.all([
      supabase.from('drogas').select('*').order('nombre'),
      supabase.from('droga_patologia').select('*'),
      supabase.from('patologias').select('*').order('nombre'),
    ]);
    setDrogas(d.data ?? []);
    setCombos(c.data ?? []);
    setPatologias(p.data ?? []);
    setLoading(false);
  }

  async function crearDroga() {
    if (!nuevaDroga.nombre.trim()) return;
    const { error } = await supabase.from('drogas').insert(nuevaDroga);
    if (error) { showToast('Error: ' + error.message); return; }
    setNuevaDroga({ nombre: '', nombre_comercial: '', numero_anmat: '' });
    showToast('Droga agregada');
    load();
  }

  async function actualizarDroga(id, campo, valor) {
    setDrogas((prev) => prev.map((d) => (d.id === id ? { ...d, [campo]: valor } : d)));
  }

  async function guardarDroga(droga) {
    const { error } = await supabase
      .from('drogas')
      .update({ nombre: droga.nombre, nombre_comercial: droga.nombre_comercial, numero_anmat: droga.numero_anmat })
      .eq('id', droga.id);
    if (error) showToast('Error: ' + error.message);
    else showToast('Guardado');
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
        <div className="section-title" style={{ marginTop: 0 }}>Agregar droga</div>
        <div className="form-grid">
          <div className="field">
            <label>Nombre genérico</label>
            <input value={nuevaDroga.nombre} onChange={(e) => setNuevaDroga((f) => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div className="field">
            <label>Nombre comercial</label>
            <input value={nuevaDroga.nombre_comercial} onChange={(e) => setNuevaDroga((f) => ({ ...f, nombre_comercial: e.target.value }))} />
          </div>
          <div className="field">
            <label>N° ANMAT</label>
            <input value={nuevaDroga.numero_anmat} onChange={(e) => setNuevaDroga((f) => ({ ...f, numero_anmat: e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={crearDroga}>+ Agregar</button>
      </div>

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : drogas.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>Sin drogas cargadas todavía</h3></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drogas.map((droga) => {
            const combosDroga = combos.filter((c) => c.droga_id === droga.id);
            const isOpen = expandedDroga === droga.id;
            return (
              <div key={droga.id} className="card">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}
                  onClick={() => setExpandedDroga(isOpen ? null : droga.id)}
                >
                  <div>
                    <strong>{droga.nombre}</strong>
                    {droga.nombre_comercial && <span style={{ color: 'var(--ink-muted)' }}> · {droga.nombre_comercial}</span>}
                  </div>
                  <span className="badge-count">{combosDroga.length} patología{combosDroga.length !== 1 ? 's' : ''}</span>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--line-soft)' }}>
                    <div className="form-grid" style={{ marginTop: 16 }}>
                      <div className="field">
                        <label>Nombre genérico</label>
                        <input value={droga.nombre} onChange={(e) => actualizarDroga(droga.id, 'nombre', e.target.value)} onBlur={() => guardarDroga(droga)} />
                      </div>
                      <div className="field">
                        <label>Nombre comercial</label>
                        <input value={droga.nombre_comercial ?? ''} onChange={(e) => actualizarDroga(droga.id, 'nombre_comercial', e.target.value)} onBlur={() => guardarDroga(droga)} />
                      </div>
                      <div className="field span-2">
                        <label>N° ANMAT</label>
                        <input value={droga.numero_anmat ?? ''} onChange={(e) => actualizarDroga(droga.id, 'numero_anmat', e.target.value)} onBlur={() => guardarDroga(droga)} />
                      </div>
                    </div>

                    {combosDroga.length > 0 && (
                      <>
                        <div className="section-title">Fundamentación por patología</div>
                        {combosDroga.map((c) => (
                          <div key={c.id} className="field" style={{ marginBottom: 12 }}>
                            <label>{patologiaNombre(c.patologia_id)}</label>
                            <textarea
                              value={c.fundamentacion_texto}
                              onChange={(e) => actualizarFundamentacion(c.id, e.target.value)}
                              onBlur={() => guardarFundamentacion(c)}
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
