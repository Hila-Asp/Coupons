import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { bootstrapNotifications } from './notifications';
import { CompanyPage } from './routes/CompanyPage';
import { HomePage } from './routes/HomePage';
import { SettingsPage } from './routes/SettingsPage';
import { SharePage } from './routes/SharePage';
import { ThemeProvider } from './theme';
import { ToastProvider } from './ui';

function NotificationsBootstrap() {
  useEffect(() => {
    void bootstrapNotifications();
  }, []);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NotificationsBootstrap />
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/company/:id" element={<CompanyPage />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
