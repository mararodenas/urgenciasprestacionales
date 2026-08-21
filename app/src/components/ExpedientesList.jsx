import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { urgenciaExpediente, formatFecha } from '../lib/utils';

export default function ExpedientesList() {
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState('activos');
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('expedientes')
      .select('*, patologias(nombre), obras_sociales(nombre), informes(tipo)')
      .order('created_at', { ascending: false });
    if (!error) setExpedientes(data);
    setLoading(false);
  }

  const filtrados = useMemo(() => {
    let list = expedientes;
    if (filtro === 'activos') list = list.filter((e) => e.estado !== 'Cerrado');
    if (filtro === 'abiertos') list = list.filter((e) => e.estado === 'Abierto');
    if (filtro === 'pendientes') list = list.filter((e) => e.estado === 'Pendiente');
    if (filtro === 'cerrados') list = list.filter((e) => e.estado === 'Cerrado');
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.numero_ee.toLowerCase().includes(q) ||
          e.nombre_paciente.toLowerCase().includes(q) ||
          e.obras_sociales?.nombre?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expedientes, query, filtro]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Registro</div>
          <h1>Expedientes</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/expedientes/nuevo')}>
          + Nuevo expediente
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar por N° EE, afiliado u OS/EMP..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            ['activos', 'Activos'],
            ['abiertos', 'Abiertos'],
            ['pendientes', 'Pendientes'],
            ['cerrados', 'Cerrados'],
            ['todos', 'Todos'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filtro === key ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setFiltro(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No hay expedientes para mostrar</h3>
            <p>Cargá el primero con "Nuevo expediente".</p>
          </div>
        </div>
      ) : (
        <table className="registry">
          <thead>
            <tr>
              <th>N° EE</th>
              <th>Afiliado</th>
              <th>OS / EMP</th>
              <th>Patología</th>
              <th>Ingreso</th>
              <th>Fecha límite</th>
              <th>Estado</th>
              <th>Informe</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e) => {
              const urg = urgenciaExpediente(e);
              return (
                <tr
                  key={e.id}
                  className={`urg-${urg.nivel}`}
                  onClick={() => navigate(`/expedientes/${e.id}`)}
                >
                  <td><span className="ee-num">{e.numero_ee}</span></td>
                  <td>{e.nombre_paciente}</td>
                  <td>{e.obras_sociales?.nombre ?? '—'}</td>
                  <td>{e.patologias?.nombre ?? '—'}</td>
                  <td>{formatFecha(e.fecha_ingreso)}</td>
                  <td><DeadlinePill urg={urg} /></td>
                  <td><EstadoPill estado={e.estado} /></td>
                  <td>
                    {e.informes?.length ? (
                      e.informes.map((i) => i.tipo).join(', ')
                    ) : (
                      <span style={{ color: 'var(--ink-muted)' }}>Pendiente</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

function DeadlinePill({ urg }) {
  if (urg.nivel === 'cerrado') return <span className="deadline-pill sin-dato">—</span>;
  if (urg.nivel === 'sin-dato') return <span className="deadline-pill sin-dato">Sin fecha</span>;
  const label =
    urg.dias < 0 ? `Vencido hace ${Math.abs(urg.dias)}d` : `Vence en ${urg.dias}d`;
  return <span className={`deadline-pill ${urg.nivel}`}>{label}</span>;
}

function EstadoPill({ estado }) {
  if (estado === 'Cerrado') return <span className="deadline-pill sin-dato">Cerrado</span>;
  if (estado === 'Pendiente') return <span className="deadline-pill proximo">Pendiente</span>;
  return <span className="deadline-pill ok">Abierto</span>;
}
