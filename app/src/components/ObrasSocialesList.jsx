import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ObrasSocialesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState('activas');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('obras_sociales')
      .select('*')
      .order('nombre')
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtrados = useMemo(() => {
    let list = items;
    if (filtro === 'activas') list = list.filter((o) => o.activo !== false);
    if (filtro === 'baja') list = list.filter((o) => o.activo === false);
    if (filtroTipo !== 'todos') list = list.filter((o) => o.tipo === filtroTipo);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.nombre.toLowerCase().includes(q) ||
          o.rnas?.toLowerCase().includes(q) ||
          o.rnemp?.toLowerCase().includes(q) ||
          o.cuit?.toLowerCase().includes(q) ||
          o.nombre_comercial?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, query, filtro, filtroTipo]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Registro</div>
          <h1>Obras Sociales / EMP</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/obras-sociales/nueva')}>
          + Nueva entidad
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar por nombre, comercial, RNAS, RNEMP o CUIT..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '8px 10px', fontSize: 13.5 }}
          >
            <option value="todos">Todos los tipos</option>
            <option value="Obra Social">Obra Social (RNAS)</option>
            <option value="Empresa de Medicina Prepaga">Empresa de Medicina Prepaga (RNEMP)</option>
          </select>
          {[
            ['activas', 'Activas'],
            ['baja', 'De baja'],
            ['todas', 'Todas'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filtro === key ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setFiltro(key)}
            >
              {label}
            </button>
          ))}
          <span className="badge-count">{filtrados.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>No hay entidades para mostrar</h3></div></div>
      ) : (
        <table className="registry">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Comercial</th>
              <th>RNAS</th>
              <th>RNEMP</th>
              <th>CUIT</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((o) => (
              <tr key={o.id} onClick={() => navigate(`/obras-sociales/${o.id}`)}>
                <td><strong>{o.nombre}</strong></td>
                <td>{o.nombre_comercial || '—'}</td>
                <td className="ee-num">{o.rnas || '—'}</td>
                <td className="ee-num">{o.rnemp || '—'}</td>
                <td className="ee-num">{o.cuit || '—'}</td>
                <td>
                  {o.activo === false ? (
                    <span className="deadline-pill vencido">De baja</span>
                  ) : (
                    <span className="deadline-pill ok">Activa</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
