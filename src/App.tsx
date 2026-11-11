import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import HomePage from './pages/HomePage';
import NameCountriesPage from './pages/NameCountriesPage';
import FindCountryPage from './pages/FindCountryPage';
import RegionsPage from './pages/RegionsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play/name-countries" element={<NameCountriesPage />} />
        <Route path="/play/find-country" element={<FindCountryPage />} />
        <Route path="/play/regions" element={<RegionsPage />} />
        <Route path="/play/regions/:regionId" element={<RegionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
