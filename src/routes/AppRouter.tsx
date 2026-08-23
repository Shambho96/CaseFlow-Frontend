import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { CommandCenter } from '@/pages/dashboard/CommandCenter';
import { CasesPage } from '@/pages/dashboard/CasesPage';
import { CaseDetailPage } from '@/pages/dashboard/CaseDetailPage';
import { ClientsPage } from '@/pages/dashboard/ClientsPage';
import { CalendarPage } from '@/pages/dashboard/CalendarPage';
import { DocumentsPage } from '@/pages/dashboard/DocumentsPage';
import { TasksPage } from '@/pages/dashboard/TasksPage';
import { ProfilePage } from '@/pages/dashboard/ProfilePage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Dashboard */}
      <Route path="/dashboard" element={<DashboardShell />}>
        <Route index element={<CommandCenter />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
