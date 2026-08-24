import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ExpedientesList from './components/ExpedientesList';
import ExpedienteForm from './components/ExpedienteForm';
import ObrasSocialesList from './components/ObrasSocialesList';
import ObraSocialForm from './components/ObraSocialForm';
import DrogasList from './components/DrogasList';
import DrogaForm from './components/DrogaForm';
import PatologiasList from './components/PatologiasList';
import PatologiaForm from './components/PatologiaForm';
import PlantillasList from './components/PlantillasList';
import PlantillaForm from './components/PlantillaForm';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ExpedientesList />} />
          <Route path="/expedientes/nuevo" element={<ExpedienteForm />} />
          <Route path="/expedientes/:id" element={<ExpedienteForm />} />
          <Route path="/obras-sociales" element={<ObrasSocialesList />} />
          <Route path="/obras-sociales/nueva" element={<ObraSocialForm />} />
          <Route path="/obras-sociales/:id" element={<ObraSocialForm />} />
          <Route path="/catalogo" element={<DrogasList />} />
          <Route path="/catalogo/nueva" element={<DrogaForm />} />
          <Route path="/catalogo/:id" element={<DrogaForm />} />
          <Route path="/patologias" element={<PatologiasList />} />
          <Route path="/patologias/nueva" element={<PatologiaForm />} />
          <Route path="/patologias/:id" element={<PatologiaForm />} />
          <Route path="/plantillas" element={<PlantillasList />} />
          <Route path="/plantillas/nueva" element={<PlantillaForm />} />
          <Route path="/plantillas/:id" element={<PlantillaForm />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
