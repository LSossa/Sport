import { Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { LogPage } from './pages/LogPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/log" element={<LogPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
