import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import SearchSelect from './SearchSelect';
import { useToast } from '../lib/useToast.jsx';
import { generarInformeDocx } from '../lib/informeGenerator';

const emptyForm = {
  numero_ee: '',
  fecha_ingreso: '',
  fecha_limite: '',
  fecha_cierre: '',
  nombre_paciente: '',
  telefono_paciente: '',
  email_paciente: '',
  patologia_id: null,
  diagnostico_detalle: '',
  resumen_hc: '',
  obra_social_id: null,
  pasos_resolucion: '',
};

export default function ExpedienteForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast, ToastEl } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [patologias, setPatologias] = useState([]);
  const [obrasSociales, setObrasSociales] = useState([]);
  const [drogasCatalogo, setDrogasCatalogo] = useState([]);
  const [drogasSeleccionadas, setDrogasSeleccionadas] = useState([]); // [{droga_id, fundamentacion}]
  const [adjuntos, setAdjuntos] = useState([]);
  const [informesGenerados, setInformesGenerados] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCatalogos();
    if (!isNew) loadExpediente();
  }, [id]);

  async function loadCatalogos() {
    const [pat, os, dr] = await Promise.all([
      supabase.from('patologias').select('id, nombre').order('nombre'),
      supabase.from('obras_sociales').select('id, nombre').order('nombre'),
      supabase.from('drogas').select('id, nombre').order('nombre'),
    ]);
    setPatologias(pat.data ?? []);
    setObrasSociales(os.data ?? []);
    setDrogasCatalogo(dr.data ?? []);
  }

  async function loadExpediente() {
    setLoading(true);
    const { data: exp } = await supabase.from('expedientes').select('*').eq('id', id).single();
    if (exp) setForm(exp);

    const { data: meds } = await supabase
      .from('expediente_medicamentos')
      .select('droga_id')
      .eq('expediente_id', id);

    if (meds?.length && exp?.patologia_id) {
      const combos = await Promise.all(
        meds.map((m) =>
          supabase
            .from('droga_patologia')
            .select('fundamentacion_texto')
            .eq('droga_id', m.droga_id)
            .eq('patologia_id', exp.patologia_id)
            .maybeSingle()
        )
      );
      setDrogasSeleccionadas(
        meds.map((m, i) => ({
          droga_id: m.droga_id,
          fundamentacion: combos[i].data?.fundamentacion_texto ?? '',
        }))
      );
    } else if (meds?.length) {
      setDrogasSeleccionadas(meds.map((m) => ({ droga_id: m.droga_id, fundamentacion: '' })));
    }

    const { data: adj } = await supabase
      .from('expediente_adjuntos')
      .select('*')
      .eq('expediente_id', id)
      .order('created_at');
    setAdjuntos(adj ?? []);

    const { data: inf } = await supabase
      .from('informes')
      .select('*')
      .eq('expediente_id', id)
      .order('created_at', { ascending: false });
    setInformesGenerados(inf ?? []);

    setLoading(false);
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePatologiaChange(patologiaId) {
    setField('patologia_id', patologiaId);
    // re-cargar fundamentaciones de las drogas ya elegidas para la nueva patología
    if (drogasSeleccionadas.length) {
      const combos = await Promise.all(
        drogasSeleccionadas.map((d) =>
          supabase
            .from('droga_patologia')
            .select('fundamentacion_texto')
            .eq('droga_id', d.droga_id)
            .eq('patologia_id', patologiaId)
            .maybeSingle()
        )
      );
      setDrogasSeleccionadas((prev) =>
        prev.map((d, i) => ({ ...d, fundamentacion: combos[i].data?.fundamentacion_texto ?? d.fundamentacion }))
      );
    }
  }

  async function crearPatologia(nombre) {
    const { data, error } = await supabase.from('patologias').insert({ nombre }).select().single();
    if (error) { showToast('Error al crear patología'); return null; }
    setPatologias((p) => [...p, data]);
    return { id: data.id, label: data.nombre };
  }

  async function crearObraSocial(nombre) {
    const { data, error } = await supabase
      .from('obras_sociales')
      .insert({ nombre, tipo: 'Obra Social' })
      .select()
      .single();
    if (error) { showToast('Error al crear Obra Social'); return null; }
    setObrasSociales((os) => [...os, data]);
    return { id: data.id, label: data.nombre };
  }

  async function crearDroga(nombre) {
    const { data, error } = await supabase.from('drogas').insert({ nombre }).select().single();
    if (error) { showToast('Error al crear droga'); return null; }
    setDrogasCatalogo((d) => [...d, data]);
    return { id: data.id, label: data.nombre };
  }

  async function agregarDroga(drogaId) {
    if (drogasSeleccionadas.some((d) => d.droga_id === drogaId)) return;
    let fundamentacion = '';
    if (form.patologia_id) {
      const { data } = await supabase
        .from('droga_patologia')
        .select('fundamentacion_texto')
        .eq('droga_id', drogaId)
        .eq('patologia_id', form.patologia_id)
        .maybeSingle();
      fundamentacion = data?.fundamentacion_texto ?? '';
    }
    setDrogasSeleccionadas((prev) => [...prev, { droga_id: drogaId, fundamentacion }]);
  }

  function quitarDroga(drogaId) {
    setDrogasSeleccionadas((prev) => prev.filter((d) => d.droga_id !== drogaId));
  }

  function setFundamentacion(drogaId, texto) {
    setDrogasSeleccionadas((prev) =>
      prev.map((d) => (d.droga_id === drogaId ? { ...d, fundamentacion: texto } : d))
    );
  }

  async function handleSave() {
    if (!form.numero_ee || !form.fecha_ingreso || !form.nombre_paciente || !form.diagnostico_detalle) {
      showToast('Completá N° EE, fecha de ingreso, afiliado y diagnóstico');
      return;
    }
    setSaving(true);
    const payload = { ...form };
    delete payload.patologias;
    delete payload.obras_sociales;
    delete payload.informes;
    // normalizar fechas vacías a null
    ['fecha_limite', 'fecha_cierre'].forEach((k) => { if (!payload[k]) payload[k] = null; });

    let expedienteId = id;
    if (isNew) {
      const { data, error } = await supabase.from('expedientes').insert(payload).select().single();
      if (error) { showToast('Error al guardar: ' + error.message); setSaving(false); return; }
      expedienteId = data.id;
    } else {
      const { error } = await supabase.from('expedientes').update(payload).eq('id', id);
      if (error) { showToast('Error al guardar: ' + error.message); setSaving(false); return; }
    }

    // sincronizar medicamentos del expediente
    await supabase.from('expediente_medicamentos').delete().eq('expediente_id', expedienteId);
    if (drogasSeleccionadas.length) {
      await supabase.from('expediente_medicamentos').insert(
        drogasSeleccionadas.map((d) => ({ expediente_id: expedienteId, droga_id: d.droga_id }))
      );
    }

    // guardar/actualizar fundamentación droga+patología (reutilizable a futuro)
    if (form.patologia_id) {
      for (const d of drogasSeleccionadas) {
        await supabase
          .from('droga_patologia')
          .upsert(
            {
              droga_id: d.droga_id,
              patologia_id: form.patologia_id,
              fundamentacion_texto: d.fundamentacion || '',
            },
            { onConflict: 'droga_id,patologia_id' }
          );
      }
    }

    setSaving(false);
    showToast('Expediente guardado');
    if (isNew) navigate(`/expedientes/${expedienteId}`);
  }

  async function handleUploadAdjunto(e) {
    const file = e.target.files[0];
    if (!file || !id) {
      if (!id) showToast('Guardá el expediente antes de adjuntar archivos');
      return;
    }
    setUploading(true);
    const path = `${id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('adjuntos').upload(path, file);
    if (upErr) { showToast('Error al subir: ' + upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('adjuntos').getPublicUrl(path);
    const { data, error } = await supabase
      .from('expediente_adjuntos')
      .insert({
        expediente_id: id,
        archivo_url: urlData.publicUrl,
        nombre_archivo: file.name,
      })
      .select()
      .single();
    if (!error) setAdjuntos((prev) => [...prev, data]);
    setUploading(false);
    e.target.value = '';
  }

  async function handleGenerarInforme(tipo) {
    if (!id) { showToast('Guardá el expediente antes de generar el informe'); return; }
    const patologiaNombre = patologias.find((p) => p.id === form.patologia_id)?.nombre;
    const drogasInfo = drogasSeleccionadas.map((d) => drogasCatalogo.find((c) => c.id === d.droga_id));
    const fundamentaciones = drogasSeleccionadas.map((d) => d.fundamentacion);

    generarInformeDocx({
      expediente: form,
      patologiaNombre,
      drogas: drogasInfo,
      fundamentaciones,
      tipo,
    });

    const { data, error } = await supabase
      .from('informes')
      .insert({ expediente_id: id, tipo })
      .select()
      .single();
    if (!error) setInformesGenerados((prev) => [data, ...prev]);
    showToast(`Informe ${tipo} generado`);
  }

  if (loading) return <div className="empty-state">Cargando...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">{isNew ? 'Nuevo registro' : `Expediente ${form.numero_ee}`}</div>
          <h1>{isNew ? 'Nuevo expediente' : 'Editar expediente'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Volver</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title">Expediente</div>
        <div className="form-grid">
          <div className="field">
            <label>N° EE</label>
            <input value={form.numero_ee} onChange={(e) => setField('numero_ee', e.target.value)} placeholder="EE-2026-000123" />
          </div>
          <div className="field">
            <label>Fecha de ingreso</label>
            <input type="date" value={form.fecha_ingreso ?? ''} onChange={(e) => setField('fecha_ingreso', e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha límite <span className="hint">(carga manual — dispara la alerta)</span></label>
            <input type="date" value={form.fecha_limite ?? ''} onChange={(e) => setField('fecha_limite', e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha de cierre</label>
            <input type="date" value={form.fecha_cierre ?? ''} onChange={(e) => setField('fecha_cierre', e.target.value)} />
          </div>
        </div>

        <div className="section-title">Afiliado</div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Nombre del paciente</label>
            <input value={form.nombre_paciente} onChange={(e) => setField('nombre_paciente', e.target.value)} />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input value={form.telefono_paciente ?? ''} onChange={(e) => setField('telefono_paciente', e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={form.email_paciente ?? ''} onChange={(e) => setField('email_paciente', e.target.value)} />
          </div>
        </div>

        <div className="section-title">Obra Social / EMP</div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Entidad</label>
            <SearchSelect
              options={obrasSociales.map((o) => ({ id: o.id, label: o.nombre }))}
              value={form.obra_social_id}
              onChange={(v) => setField('obra_social_id', v)}
              placeholder="Buscar Obra Social / EMP..."
              onCreate={crearObraSocial}
              createLabel="Crear OS/EMP"
            />
          </div>
        </div>

        <div className="section-title">Patología</div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Patología</label>
            <SearchSelect
              options={patologias.map((p) => ({ id: p.id, label: p.nombre }))}
              value={form.patologia_id}
              onChange={handlePatologiaChange}
              placeholder="Buscar patología..."
              onCreate={crearPatologia}
              createLabel="Crear patología"
            />
          </div>
          <div className="field span-2">
            <label>Diagnóstico (detalle del caso)</label>
            <textarea value={form.diagnostico_detalle} onChange={(e) => setField('diagnostico_detalle', e.target.value)} />
          </div>
          <div className="field span-2">
            <label>Resumen de historia clínica <span className="hint">(opcional)</span></label>
            <textarea value={form.resumen_hc ?? ''} onChange={(e) => setField('resumen_hc', e.target.value)} />
          </div>
        </div>

        <div className="section-title">Medicación solicitada</div>
        <SearchSelect
          options={drogasCatalogo
            .filter((d) => !drogasSeleccionadas.some((s) => s.droga_id === d.id))
            .map((d) => ({ id: d.id, label: d.nombre }))}
          value={null}
          onChange={agregarDroga}
          placeholder="+ Agregar droga..."
          onCreate={crearDroga}
          createLabel="Crear droga"
        />
        {drogasSeleccionadas.map((d) => {
          const info = drogasCatalogo.find((c) => c.id === d.droga_id);
          return (
            <div key={d.droga_id} className="card" style={{ marginTop: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>{info?.nombre ?? '...'}</strong>
                <button className="btn btn-ghost btn-danger" onClick={() => quitarDroga(d.droga_id)}>Quitar</button>
              </div>
              <div className="field">
                <label>Indicaciones médicas / mecanismo de acción para esta patología
                  <span className="hint"> — se autocompleta si ya se cargó antes esta combinación</span>
                </label>
                <textarea
                  value={d.fundamentacion}
                  onChange={(e) => setFundamentacion(d.droga_id, e.target.value)}
                  placeholder={form.patologia_id ? '' : 'Elegí primero una patología'}
                />
              </div>
            </div>
          );
        })}

        <div className="section-title">Gestión / resolución</div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Pasos seguidos en la resolución del reclamo</label>
            <textarea value={form.pasos_resolucion ?? ''} onChange={(e) => setField('pasos_resolucion', e.target.value)} />
          </div>
        </div>

        <div className="section-title">Adjuntos (evidencia)</div>
        {!isNew ? (
          <>
            <input type="file" onChange={handleUploadAdjunto} disabled={uploading} accept="image/*,.pdf" />
            <div className="attach-list">
              {adjuntos.map((a) => (
                <div className="attach-item" key={a.id}>
                  {a.archivo_url.match(/\.(png|jpe?g|webp)$/i) && <img src={a.archivo_url} alt="" />}
                  <a href={a.archivo_url} target="_blank" rel="noreferrer">{a.nombre_archivo}</a>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="hint">Guardá el expediente para poder adjuntar archivos.</p>
        )}

        <div className="section-title">Informe</div>
        {!isNew ? (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn btn-secondary" onClick={() => handleGenerarInforme('IFSOL')}>
                Generar IFSOL (.docx)
              </button>
              <button className="btn btn-secondary" onClick={() => handleGenerarInforme('IFDER')}>
                Generar IFDER (.docx)
              </button>
            </div>
            {informesGenerados.length > 0 && (
              <p className="hint">
                Generados: {informesGenerados.map((i) => `${i.tipo} (${new Date(i.created_at).toLocaleDateString('es-AR')})`).join(', ')}
              </p>
            )}
          </>
        ) : (
          <p className="hint">Guardá el expediente para poder generar el informe.</p>
        )}
      </div>
      {ToastEl}
    </>
  );
}
