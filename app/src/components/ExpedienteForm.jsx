import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import SearchSelect from './SearchSelect';
import ObraSocialModal from './ObraSocialModal';
import ObraSocialCodeSelector from './ObraSocialCodeSelector';
import RichTextEditor from './RichTextEditor';
import HelpTip from './HelpTip';
import { useToast } from '../lib/useToast.jsx';
import { useConfirm } from '../lib/useConfirm.jsx';
import { generarInformeDocx } from '../lib/informeGenerator';

const emptyForm = {
  numero_ee: '',
  fecha_ingreso: '',
  fecha_limite: '',
  fecha_cierre: '',
  estado: 'Abierto',
  nombre_paciente: '',
  dni_cuit_paciente: '',
  telefono_paciente: '',
  email_paciente: '',
  denunciante_nombre: '',
  denunciante_dni_cuit: '',
  patologia_id: null,
  motivo_denuncia: '',
  diagnostico_detalle: '',
  resumen_hc: '',
  obra_social_id: null,
  filial_id: null,
  plantilla_id: null,
  pasos_resolucion: '',
};

export default function ExpedienteForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { showToast, ToastEl } = useToast();
  const { confirmAction, ConfirmEl } = useConfirm();

  const [form, setForm] = useState(emptyForm);
  const [patologias, setPatologias] = useState([]);
  const [obrasSociales, setObrasSociales] = useState([]);
  const [drogasCatalogo, setDrogasCatalogo] = useState([]);
  const [marcasCatalogo, setMarcasCatalogo] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [drogasSeleccionadas, setDrogasSeleccionadas] = useState([]); // [{droga_id, fundamentacion}]
  const [drogasAsociadasPatologia, setDrogasAsociadasPatologia] = useState([]); // [{droga_id, nombre, fundamentacion_texto}]
  const [adjuntos, setAdjuntos] = useState([]);
  const [informesGenerados, setInformesGenerados] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generandoInforme, setGenerandoInforme] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [obraSocialModalOpen, setObraSocialModalOpen] = useState(false);
  const [obraSocialModalTipo, setObraSocialModalTipo] = useState('Obra Social');
  const [obraSocialModalCodigo, setObraSocialModalCodigo] = useState('');

  useEffect(() => {
    loadCatalogos();
    if (!isNew) loadExpediente();
  }, [id]);

  async function loadCatalogos() {
    const [pat, os, dr, mc, pl] = await Promise.all([
      supabase.from('patologias').select('id, nombre').order('nombre'),
      supabase.from('obras_sociales').select('id, nombre, tipo, rnas, rnemp, cuit, nombre_comercial').order('nombre'),
      supabase.from('drogas').select('id, nombre, codigo_atc, descripcion_anmat').order('nombre'),
      supabase.from('marcas_comerciales').select('id, droga_id, nombre_comercial, numero_anmat, laboratorio').order('nombre_comercial'),
      supabase.from('plantillas_informe').select('*').order('nombre'),
    ]);
    setPatologias(pat.data ?? []);
    setObrasSociales(os.data ?? []);
    setDrogasCatalogo(dr.data ?? []);
    setMarcasCatalogo(mc.data ?? []);
    setPlantillas(pl.data ?? []);
  }

  async function loadExpediente() {
    setLoading(true);
    const { data: exp } = await supabase.from('expedientes').select('*').eq('id', id).single();
    if (exp) setForm(exp);
    if (exp?.patologia_id) cargarDrogasAsociadas(exp.patologia_id);

    const { data: meds } = await supabase
      .from('expediente_medicamentos')
      .select('droga_id, marca_id')
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
          marca_id: m.marca_id ?? null,
          fundamentacion: combos[i].data?.fundamentacion_texto ?? '',
        }))
      );
    } else if (meds?.length) {
      setDrogasSeleccionadas(meds.map((m) => ({ droga_id: m.droga_id, marca_id: m.marca_id ?? null, fundamentacion: '' })));
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

  async function cargarDrogasAsociadas(patologiaId) {
    if (!patologiaId) { setDrogasAsociadasPatologia([]); return; }
    const { data } = await supabase
      .from('droga_patologia')
      .select('droga_id, fundamentacion_texto, drogas(nombre)')
      .eq('patologia_id', patologiaId);
    setDrogasAsociadasPatologia(
      (data ?? []).map((r) => ({ droga_id: r.droga_id, nombre: r.drogas?.nombre, fundamentacion_texto: r.fundamentacion_texto }))
    );
  }

  async function handlePatologiaChange(patologiaId) {
    setField('patologia_id', patologiaId);
    cargarDrogasAsociadas(patologiaId);
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

  function abrirCrearObraSocial(tipo, codigo) {
    setObraSocialModalTipo(tipo);
    setObraSocialModalCodigo(codigo);
    setObraSocialModalOpen(true);
  }

  function handleObraSocialGuardada(data) {
    setObrasSociales((os) => [...os, data]);
    setField('obra_social_id', data.id);
    setObraSocialModalOpen(false);
  }

  function handleObraSocialModalClose() {
    setObraSocialModalOpen(false);
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
    setDrogasSeleccionadas((prev) => [...prev, { droga_id: drogaId, marca_id: null, fundamentacion }]);
  }

  function quitarDroga(drogaId) {
    setDrogasSeleccionadas((prev) => prev.filter((d) => d.droga_id !== drogaId));
  }

  function toggleDrogaAsociada(drogaId, fundamentacionPrevia) {
    setDrogasSeleccionadas((prev) => {
      const yaEsta = prev.some((d) => d.droga_id === drogaId);
      if (yaEsta) return prev.filter((d) => d.droga_id !== drogaId);
      return [...prev, { droga_id: drogaId, marca_id: null, fundamentacion: fundamentacionPrevia ?? '' }];
    });
  }

  function setFundamentacion(drogaId, texto) {
    setDrogasSeleccionadas((prev) =>
      prev.map((d) => (d.droga_id === drogaId ? { ...d, fundamentacion: texto } : d))
    );
  }

  function setMarcaSeleccionada(drogaId, marcaId) {
    setDrogasSeleccionadas((prev) =>
      prev.map((d) => (d.droga_id === drogaId ? { ...d, marca_id: marcaId || null } : d))
    );
  }

  function actualizarCampoDroga(drogaId, campo, valor) {
    setDrogasCatalogo((prev) => prev.map((d) => (d.id === drogaId ? { ...d, [campo]: valor } : d)));
  }

  async function guardarCampoDroga(drogaId) {
    const droga = drogasCatalogo.find((d) => d.id === drogaId);
    if (!droga) return;
    const { error } = await supabase
      .from('drogas')
      .update({ codigo_atc: droga.codigo_atc, descripcion_anmat: droga.descripcion_anmat })
      .eq('id', drogaId);
    if (error) showToast('Error al guardar: ' + error.message);
  }

  async function handleDelete() {
    const ok = await confirmAction(
      `Se va a eliminar el expediente ${form.numero_ee} junto con sus adjuntos e informes asociados. Esta acción no se puede deshacer.`,
      { title: 'Eliminar expediente' }
    );
    if (!ok) return;
    const { error } = await supabase.from('expedientes').delete().eq('id', id);
    if (error) { showToast('No se pudo eliminar: ' + error.message); return; }
    navigate('/');
  }

  async function handleUsarDatosAfiliado() {
    if (form.denunciante_nombre?.trim() || form.denunciante_dni_cuit?.trim()) {
      const ok = await confirmAction(
        'Ya hay datos cargados en Denunciante y se van a reemplazar por los del afiliado. Esta acción no se puede deshacer.',
        { title: 'Usar los datos del afiliado', confirmLabel: 'Sí, reemplazar' }
      );
      if (!ok) return;
    }
    setForm((f) => ({ ...f, denunciante_nombre: f.nombre_paciente, denunciante_dni_cuit: f.dni_cuit_paciente }));
  }

  async function handleSave() {
    if (!form.numero_ee || !form.fecha_ingreso || !form.nombre_paciente || !form.diagnostico_detalle) {
      showToast('Completá N° EE, fecha de ingreso, afiliado y diagnóstico');
      return;
    }
    if (form.estado === 'Cerrado' && informesGenerados.length === 0) {
      showToast('No podés marcar el expediente como Cerrado sin generar antes un informe IFSOL o IFDER');
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
        drogasSeleccionadas.map((d) => ({ expediente_id: expedienteId, droga_id: d.droga_id, marca_id: d.marca_id ?? null }))
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

  async function subirAdjunto(file) {
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
  }

  async function handleUploadAdjunto(e) {
    const file = e.target.files[0];
    await subirAdjunto(file);
    e.target.value = '';
  }

  async function handlePasteAdjunto(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imagen = Array.from(items).find((it) => it.type.startsWith('image/'));
    if (!imagen) return;
    e.preventDefault();
    const file = imagen.getAsFile();
    if (!file) return;
    const extension = file.type.split('/')[1] || 'png';
    const nombreado = new File([file], `captura_${Date.now()}.${extension}`, { type: file.type });
    await subirAdjunto(nombreado);
  }

  async function handleEliminarAdjunto(adjunto) {
    const ok = await confirmAction('Esta acción no se puede deshacer.', { title: `Eliminar "${adjunto.nombre_archivo}"` });
    if (!ok) return;
    const path = adjunto.archivo_url.split('/adjuntos/')[1];
    if (path) await supabase.storage.from('adjuntos').remove([path]);
    const { error } = await supabase.from('expediente_adjuntos').delete().eq('id', adjunto.id);
    if (error) { showToast('No se pudo eliminar: ' + error.message); return; }
    setAdjuntos((prev) => prev.filter((a) => a.id !== adjunto.id));
    showToast('Adjunto eliminado');
  }


  async function handleGenerarInforme(tipo) {
    if (!id) { showToast('Guardá el expediente antes de generar el informe'); return; }
    const patologia = patologias.find((p) => p.id === form.patologia_id);
    const obraSocial = obrasSociales.find((o) => o.id === form.obra_social_id);
    const plantilla = plantillas.find((p) => p.id === form.plantilla_id) ?? null;
    const drogasInfo = drogasSeleccionadas.map((d) => drogasCatalogo.find((c) => c.id === d.droga_id));
    const marcasInfo = drogasSeleccionadas.map((d) => marcasCatalogo.find((m) => m.id === d.marca_id) ?? null);
    const fundamentacionesHtml = drogasSeleccionadas.map((d) => d.fundamentacion);

    let filialNombre = null;
    if (form.filial_id) {
      const { data } = await supabase.from('filiales').select('nombre').eq('id', form.filial_id).maybeSingle();
      filialNombre = data?.nombre ?? null;
    }

    setGenerandoInforme(tipo);
    let blob;
    try {
      blob = await generarInformeDocx({
        expediente: form,
        obraSocial,
        filialNombre,
        patologiaNombre: patologia?.nombre,
        drogas: drogasInfo,
        marcas: marcasInfo,
        fundamentacionesHtml,
        plantilla,
        gestionHtml: form.pasos_resolucion,
        tipo,
      });
    } catch (e) {
      showToast('Error al generar el informe: ' + e.message);
      setGenerandoInforme(null);
      return;
    }

    // subirlo a Storage para poder abrirlo después con un link
    const path = `informes/${id}/${tipo}_${Date.now()}.docx`;
    const { error: upErr } = await supabase.storage.from('adjuntos').upload(path, blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    let archivoUrl = null;
    if (!upErr) {
      archivoUrl = supabase.storage.from('adjuntos').getPublicUrl(path).data.publicUrl;
    }

    // se queda solo con el último de este tipo: borra los anteriores
    const anteriores = informesGenerados.filter((i) => i.tipo === tipo);
    if (anteriores.length) {
      await supabase.from('informes').delete().in('id', anteriores.map((i) => i.id));
    }

    const { data, error } = await supabase
      .from('informes')
      .insert({ expediente_id: id, tipo, archivo_url: archivoUrl })
      .select()
      .single();
    setGenerandoInforme(null);
    if (!error) {
      setInformesGenerados((prev) => [...prev.filter((i) => i.tipo !== tipo), data]);
    }
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
          {!isNew && <button className="btn btn-ghost btn-danger" onClick={handleDelete}>Eliminar</button>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title section-title-flush">Expediente</div>
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
            <label>Fecha límite <span className="hint">(dispara la alerta)</span></label>
            <input type="date" value={form.fecha_limite ?? ''} onChange={(e) => setField('fecha_limite', e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha de cierre</label>
            <input type="date" value={form.fecha_cierre ?? ''} onChange={(e) => setField('fecha_cierre', e.target.value)} />
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={form.estado ?? 'Abierto'} onChange={(e) => setField('estado', e.target.value)}>
              <option value="Abierto">Abierto</option>
              <option value="Pendiente">Pendiente (esperando OS/EMP o afiliado)</option>
              <option value="Cerrado" disabled={informesGenerados.length === 0}>
                Cerrado{informesGenerados.length === 0 ? ' (generá un informe primero)' : ''}
              </option>
            </select>
          </div>
        </div>

        <div className="section-title">Obra Social / EMP</div>
        <div className="form-grid">
          <div className="field span-4">
            <label>Entidad (buscar por RNAS o RNEMP)</label>
            <ObraSocialCodeSelector
              obrasSociales={obrasSociales}
              value={form.obra_social_id}
              onChange={(id) => setField('obra_social_id', id)}
              onCrear={abrirCrearObraSocial}
              filialValue={form.filial_id}
              onFilialChange={(fid) => setField('filial_id', fid)}
            />
          </div>
        </div>

        <div className="section-title">Datos filiatorios</div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Nombre del paciente</label>
            <input value={form.nombre_paciente} onChange={(e) => setField('nombre_paciente', e.target.value)} />
          </div>
          <div className="field">
            <label>DNI / CUIT</label>
            <input value={form.dni_cuit_paciente ?? ''} onChange={(e) => setField('dni_cuit_paciente', e.target.value)} />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input value={form.telefono_paciente ?? ''} onChange={(e) => setField('telefono_paciente', e.target.value)} />
          </div>
          <div className="field span-2">
            <label>Email</label>
            <input value={form.email_paciente ?? ''} onChange={(e) => setField('email_paciente', e.target.value)} />
          </div>
        </div>

        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span>Denunciante <span className="hint">(si es distinto del afiliado)</span></span>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            onClick={handleUsarDatosAfiliado}
          >
            Usar los datos del afiliado
          </button>
        </div>
        <div className="form-grid">
          <div className="field span-2">
            <label>Nombre del denunciante</label>
            <input value={form.denunciante_nombre ?? ''} onChange={(e) => setField('denunciante_nombre', e.target.value)} />
          </div>
          <div className="field span-2">
            <label>DNI / CUIT <span className="hint">(opcional)</span></label>
            <input value={form.denunciante_dni_cuit ?? ''} onChange={(e) => setField('denunciante_dni_cuit', e.target.value)} />
          </div>
        </div>

        <div className="section-title">Solicitud
          <HelpTip title="Solicitud">
            Acá cargás qué pide el caso: la <strong>Patología</strong> (determina qué drogas te sugiere el sistema),
            el <strong>Diagnóstico</strong> del médico tratante (va textual en el informe), el <strong>Motivo de la denuncia</strong>
            (va en negrita en el encabezado del IFSOL/IFDER) y opcionalmente un <strong>Resumen de historia clínica</strong>.
            Debajo elegís la o las drogas involucradas.
          </HelpTip>
        </div>
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
            <label>Motivo de la denuncia <span className="hint">(va en negrita en el encabezado del informe)</span></label>
            <textarea value={form.motivo_denuncia ?? ''} onChange={(e) => setField('motivo_denuncia', e.target.value)} />
          </div>
          <div className="field span-2">
            <label>Resumen de historia clínica <span className="hint">(opcional)</span></label>
            <textarea value={form.resumen_hc ?? ''} onChange={(e) => setField('resumen_hc', e.target.value)} />
          </div>
        </div>

        {form.patologia_id && drogasAsociadasPatologia.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', display: 'block', marginBottom: 6 }}>
              Drogas ya asociadas a esta patología <span className="hint">— tildá las que apliquen a este caso (podés elegir varias)</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {drogasAsociadasPatologia.map((d) => (
                <label key={d.droga_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={drogasSeleccionadas.some((s) => s.droga_id === d.droga_id)}
                    onChange={() => toggleDrogaAsociada(d.droga_id, d.fundamentacion_texto)}
                  />
                  {d.nombre}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="field span-2" style={{ marginBottom: 14 }}>
          <label>{drogasAsociadasPatologia.length > 0 ? 'Agregar otra droga (no listada arriba)' : 'Agregar droga'}</label>
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
        </div>

        {drogasSeleccionadas.length > 0 && (
          <>
            <div className="section-title">Explicación de la droga
              <HelpTip title="Explicación de la droga">
                Por cada droga elegida: la <strong>Marca comercial</strong> usada (trae su propio N° de Certificado ANMAT),
                el <strong>Código ATC</strong> y <strong>Descripción ANMAT</strong> (datos generales de la droga, se editan
                acá o desde Catálogo drogas), y las <strong>Indicaciones médicas / mecanismo de acción</strong> para esta
                patología puntual — este último texto se autocompleta si ya se cargó antes esa combinación droga+patología,
                y es el que va en el informe.
              </HelpTip>
            </div>
            {drogasSeleccionadas.map((d) => {
              const info = drogasCatalogo.find((c) => c.id === d.droga_id);
              const marcasDeEsta = marcasCatalogo.filter((m) => m.droga_id === d.droga_id);
              const marcaElegida = marcasDeEsta.find((m) => m.id === d.marca_id);
              return (
                <div key={d.droga_id} className="card" style={{ marginBottom: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{info?.nombre ?? '...'}</strong>
                    <button className="btn btn-ghost btn-danger" onClick={() => quitarDroga(d.droga_id)}>Quitar</button>
                  </div>
                  <div className="form-grid" style={{ marginBottom: 12 }}>
                    <div className="field span-2">
                      <label>Marca comercial utilizada <span className="hint">(cada una tiene su propio N° de Certificado ANMAT)</span></label>
                      {marcasDeEsta.length > 0 ? (
                        <select value={d.marca_id ?? ''} onChange={(e) => setMarcaSeleccionada(d.droga_id, e.target.value)}>
                          <option value="">Sin especificar</option>
                          {marcasDeEsta.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre_comercial}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="hint">Sin marcas cargadas — agregalas desde Catálogo drogas.</p>
                      )}
                    </div>
                    <div className="field">
                      <label>N° Certificado ANMAT</label>
                      <input value={marcaElegida?.numero_anmat ?? ''} disabled />
                    </div>
                    <div className="field">
                      <label>Código ATC</label>
                      <input
                        value={info?.codigo_atc ?? ''}
                        onChange={(e) => actualizarCampoDroga(d.droga_id, 'codigo_atc', e.target.value)}
                        onBlur={() => guardarCampoDroga(d.droga_id)}
                      />
                    </div>
                    <div className="field span-4">
                      <label>Descripción ANMAT <span className="hint">(mecanismo de acción / grupo farmacoterapéutico)</span></label>
                      <input
                        value={info?.descripcion_anmat ?? ''}
                        onChange={(e) => actualizarCampoDroga(d.droga_id, 'descripcion_anmat', e.target.value)}
                        onBlur={() => guardarCampoDroga(d.droga_id)}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Indicaciones médicas / mecanismo de acción para esta patología
                      <span className="hint"> — se autocompleta si ya se cargó antes esta combinación</span>
                    </label>
                    <RichTextEditor
                      value={d.fundamentacion}
                      onChange={(html) => setFundamentacion(d.droga_id, html)}
                      placeholder={form.patologia_id ? 'Escribí la fundamentación...' : 'Elegí primero una patología'}
                      minHeight={90}
                    />
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div className="section-title">Análisis
          <HelpTip title="Análisis">
            Acá va la <strong>Gestión realizada</strong>: el relato de las acciones que hizo GCP para resolver el caso
            (fecha de notificación al Agente de Seguro, respuesta recibida, contacto con el denunciante, etc.). Este texto
            va tal cual en el informe, justo antes del cierre. Podés pegar capturas de pantalla (Ctrl+V) directo adentro
            del cuadro y quedan incrustadas en el Word. Debajo podés adjuntar archivos de evidencia aparte (no se incluyen
            en el Word, quedan como respaldo).
          </HelpTip>
        </div>
        <div className="field span-4" style={{ marginBottom: 16 }}>
          <label>Gestión realizada <span className="hint">(acciones de GCP para la resolución del caso — va en el informe)</span></label>
          <RichTextEditor
            value={form.pasos_resolucion ?? ''}
            onChange={(html) => setField('pasos_resolucion', html)}
            placeholder="Ej: fecha de notificación al Agente de Seguro, respuesta recibida, contacto con el denunciante..."
            minHeight={120}
          />
        </div>
        {!isNew ? (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', display: 'block', marginBottom: 6 }}>
              Adjuntos (evidencia)
            </label>
            <div className="form-grid" style={{ marginBottom: 10 }}>
              <div className="field span-2">
                <label>Adjuntar archivo</label>
                <input type="file" onChange={handleUploadAdjunto} disabled={uploading} accept="image/*,.pdf" />
              </div>
              <div className="field span-2">
                <label>Pegar imagen</label>
                <div
                  className="paste-zone"
                  tabIndex={0}
                  onPaste={handlePasteAdjunto}
                >
                  {uploading ? 'Subiendo...' : 'Hacé clic acá y pegá con Ctrl+V'}
                </div>
              </div>
            </div>
            <div className="attach-list">
              {adjuntos.map((a) => (
                <div className="attach-item" key={a.id}>
                  {a.archivo_url.match(/\.(png|jpe?g|webp)$/i) && <img src={a.archivo_url} alt="" />}
                  <a href={a.archivo_url} target="_blank" rel="noreferrer">{a.nombre_archivo}</a>
                  <button className="attach-delete" title="Eliminar adjunto" onClick={() => handleEliminarAdjunto(a)}>✕</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="hint">Guardá el expediente para poder adjuntar archivos.</p>
        )}

        <div className="section-title">Dictamen
          <HelpTip title="Dictamen">
            Elegí la <strong>Plantilla</strong> según el tipo de caso (por ejemplo "Oncología") — trae el texto normativo
            fijo que va antes y después del diagnóstico. Después generá el <strong>IFSOL</strong> (si la Obra Social
            respondió/resolvió) o el <strong>IFDER</strong> (si no respondió) — se descarga el .docx y además queda un
            link acá abajo para volver a abrirlo. Solo se guarda el último de cada tipo.
          </HelpTip>
        </div>
        {!isNew ? (
          <>
            <div className="dictamen-bar">
              <div className="field" style={{ flex: 1, minWidth: 220 }}>
                <label>Plantilla del informe</label>
                <select value={form.plantilla_id ?? ''} onChange={(e) => setField('plantilla_id', e.target.value || null)}>
                  <option value="">Sin plantilla</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => handleGenerarInforme('IFSOL')} disabled={!!generandoInforme}>
                {generandoInforme === 'IFSOL' ? 'Generando...' : 'Generar IFSOL (.docx)'}
              </button>
              <button className="btn btn-primary" onClick={() => handleGenerarInforme('IFDER')} disabled={!!generandoInforme}>
                {generandoInforme === 'IFDER' ? 'Generando...' : 'Generar IFDER (.docx)'}
              </button>
            </div>
            {informesGenerados.length > 0 && (
              <p className="hint" style={{ marginTop: 12 }}>
                Último generado: {informesGenerados.map((i) => (
                  <span key={i.id}>
                    {i.archivo_url ? (
                      <a href={i.archivo_url} target="_blank" rel="noreferrer">
                        {i.tipo} ({new Date(i.created_at).toLocaleDateString('es-AR')})
                      </a>
                    ) : (
                      `${i.tipo} (${new Date(i.created_at).toLocaleDateString('es-AR')})`
                    )}
                    {' '}
                  </span>
                ))}
              </p>
            )}
          </>
        ) : (
          <p className="hint">Guardá el expediente para poder generar el informe.</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
      <ObraSocialModal
        open={obraSocialModalOpen}
        initialTipo={obraSocialModalTipo}
        initialCodigo={obraSocialModalCodigo}
        onClose={handleObraSocialModalClose}
        onSaved={handleObraSocialGuardada}
      />
      {ToastEl}
      {ConfirmEl}
    </>
  );
}
