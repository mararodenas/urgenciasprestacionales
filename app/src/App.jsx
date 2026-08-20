import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ExpedientesList from './components/ExpedientesList';
import ExpedienteForm from './components/ExpedienteForm';
import ObrasSocialesList from './components/ObrasSocialesList';
import ObraSocialForm from './components/ObraSocialForm';
import CatalogoDrogas from './components/CatalogoDrogas';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ExpedientesList />} />
          <Route path="/expedientes/nuevo" element={<ExpedienteForm />} />
          <Route path="/expedientes/:id" element={<ExpedienteForm />} />
          <Route path="/obras-sociales" element={<ObrasSocialesList />} />
          <Route path="/obras-sociales/nueva" element={<ObraSocialForm />} />
          <Route path="/obras-sociales/:id" element={<ObraSocialForm />} />
          <Route path="/catalogo" element={<CatalogoDrogas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
