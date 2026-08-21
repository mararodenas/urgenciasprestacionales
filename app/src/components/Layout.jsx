import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="mark">SSS</div>
          <div className="title">Urgencias Prestacionales</div>
          <div className="subtitle">Gerencia de Control Prestacional</div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="dot" /> Expedientes
          </NavLink>
          <NavLink to="/obras-sociales" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="dot" /> Obras Sociales / EMP
          </NavLink>
          <NavLink to="/catalogo" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="dot" /> Catálogo drogas
          </NavLink>
          <NavLink to="/patologias" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="dot" /> Patologías
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
