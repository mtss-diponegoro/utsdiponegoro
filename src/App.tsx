/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ProfileModal } from './components/Common/ProfileModal';
import { LoginPage } from './components/Auth/LoginPage';

// Teacher & Homeroom Views
import { GradeInputView } from './components/TeacherViews/GradeInputView';
import { SubjectAnalyticsView } from './components/TeacherViews/SubjectAnalyticsView';
import { HomeroomLedgerView } from './components/HomeroomViews/HomeroomLedgerView';
import { HomeroomAttendanceNotesView } from './components/HomeroomViews/HomeroomAttendanceNotesView';
import { HomeroomReportCardView } from './components/HomeroomViews/HomeroomReportCardView';
import { KopSettingsView } from './components/HomeroomViews/KopSettingsView';

// Admin Views
import { AdminDashboardView } from './components/AdminViews/AdminDashboardView';
import { StudentManagementView } from './components/AdminViews/StudentManagementView';
import { SubjectManagementView } from './components/AdminViews/SubjectManagementView';
import { TeacherManagementView } from './components/AdminViews/TeacherManagementView';
import { SchoolLedgerView } from './components/AdminViews/SchoolLedgerView';
import { SettingsView } from './components/AdminViews/SettingsView';

const MainContent: React.FC = () => {
  const { activeView, currentRole, currentUser } = useApp();
  const isAdminSession = currentUser?.role === 'admin' && currentRole === 'admin';

  const renderView = () => {
    if (isAdminSession) {
      switch (activeView) {
        case 'dashboard':
          return <AdminDashboardView />;
        case 'students':
          return <StudentManagementView />;
        case 'subjects':
          return <SubjectManagementView />;
        case 'teachers':
          return <TeacherManagementView />;
        case 'school_ledger':
          return <SchoolLedgerView />;
        case 'settings':
          return <SettingsView />;
        case 'walikelas_kop':
          return <KopSettingsView />;
        case 'walikelas_rapor':
          return <HomeroomReportCardView />;
        default:
          return <AdminDashboardView />;
      }
    }

    switch (activeView) {
      // Guru views
      case 'teacher_grades':
        return <GradeInputView />;
      case 'teacher_analytics':
        return <SubjectAnalyticsView />;

      // Menu Wali Kelas (in role guru)
      case 'walikelas_ledger':
        return <HomeroomLedgerView />;
      case 'walikelas_attendance':
        return <HomeroomAttendanceNotesView />;
      case 'walikelas_rapor':
        return <HomeroomReportCardView />;
      case 'walikelas_kop':
        return <KopSettingsView />;

      default:
        return <GradeInputView />;
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:max-w-none print:p-0 print:bg-white">
      {renderView()}
    </main>
  );
};

const AppLayout: React.FC = () => {
  const { isAuthenticated, settings } = useApp();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white text-slate-900 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1">
        <MainContent />
      </div>

      {/* User Profile / Edit Identitas Modal */}
      <ProfileModal />

      {/* Clean Footer (Hidden when printing report cards) */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">SiNilai UTS</span>
            <span>·</span>
            <span>Sistem Penilaian Ujian Tengah Semester &amp; Leger Terpadu</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>{settings.schoolName}</span>
            <span>·</span>
            <span>Tahun Ajaran {settings.academicYear}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
