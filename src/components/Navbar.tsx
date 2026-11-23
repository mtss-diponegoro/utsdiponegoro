import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap,
  Database,
  UserCheck,
  Shield,
  Layers,
  BookOpen,
  FileSpreadsheet,
  Users,
  Settings,
  Printer,
  Sliders,
  LogOut,
  Edit3,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    activeTeacherId,
    setActiveTeacherId,
    activeTeacher,
    teachers,
    activeView,
    setActiveView,
    currentUser,
    logout,
    setIsProfileModalOpen,
    settings,
  } = useApp();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const isHomeroomTeacher = activeTeacher?.isHomeroom;
  const isAdminUser = currentUser?.role === 'admin';
  const isAdminMode = isAdminUser && currentRole === 'admin';
  const isAdminPreviewingGuru = isAdminUser && currentRole === 'guru';

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Primary Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Zone 1: Brand Wordmark with Clear Role Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm ${
              isAdminMode ? 'bg-indigo-700' : 'bg-emerald-600'
            }`}
          >
            {isAdminMode ? <Shield className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                SiNilai UTS
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-bold border ${
                  isAdminMode
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isAdminMode ? 'Admin' : isHomeroomTeacher ? 'Guru & Wali' : 'Guru Mapel'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {settings.schoolName} · Semester {settings.semester} {settings.academicYear}
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links (single-line, concise) */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto text-sm font-medium text-slate-600">
          {!isAdminMode ? (
            <>
              <button
                onClick={() => setActiveView('teacher_grades')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'teacher_grades'
                    ? 'bg-slate-100 text-emerald-800 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Input Nilai Mapel
              </button>

              <button
                onClick={() => setActiveView('teacher_analytics')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'teacher_analytics'
                    ? 'bg-slate-100 text-emerald-800 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4 text-slate-500" />
                Statistik Nilai
              </button>

              {/* Walikelas Menu Group */}
              <div className="h-5 w-px bg-slate-200 mx-1" />

              <button
                onClick={() => setActiveView('walikelas_ledger')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView.startsWith('walikelas_') && activeView === 'walikelas_ledger'
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-emerald-700 hover:bg-emerald-50 font-medium'
                }`}
                title="Leger Nilai Seluruh Mapel Kelas Binaan"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Leger Kelas (Wali)
              </button>

              <button
                onClick={() => setActiveView('walikelas_attendance')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'walikelas_attendance'
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-emerald-700 hover:bg-emerald-50 font-medium'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Presensi & Catatan
              </button>

              <button
                onClick={() => setActiveView('walikelas_rapor')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'walikelas_rapor'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50 font-medium'
                }`}
              >
                <Printer className="w-4 h-4" />
                Menu Cetak
              </button>

              <button
                onClick={() => setActiveView('walikelas_kop')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'walikelas_kop'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50 font-medium'
                }`}
                title="Pengaturan Kop Cetak & Logo Instansi/Lembaga"
              >
                <Sliders className="w-4 h-4" />
                Kop &amp; Logo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeView === 'dashboard' ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Ringkasan Admin
              </button>
              <button
                onClick={() => setActiveView('students')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'students' ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Data Siswa
              </button>
              <button
                onClick={() => setActiveView('subjects')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'subjects' ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Mata Pelajaran
              </button>
              <button
                onClick={() => setActiveView('teachers')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'teachers' ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Guru & Wali Kelas
              </button>
              <button
                onClick={() => setActiveView('school_ledger')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'school_ledger' ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Leger Sekolah
              </button>
              <button
                onClick={() => setActiveView('walikelas_kop')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'walikelas_kop' || activeView === 'walikelas_rapor'
                    ? 'bg-indigo-50 text-indigo-900 font-semibold'
                    : 'hover:text-slate-900'
                }`}
                title="Pengaturan Kop, Ukuran Kertas & Margin Cetak Rapor"
              >
                <Printer className="w-4 h-4" />
                Atur Cetak Rapor
              </button>
              <button
                onClick={() => setActiveView('settings')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'settings' ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                Pengaturan
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Primary Action & Role Badge */}
        <div className="flex items-center gap-2.5 shrink-0">

          {/* Role Status Indicator (Locked to Login Role; Admin can exit teacher preview if active) */}
          {isAdminPreviewingGuru ? (
            <div className="flex items-center gap-2">
              <select
                value={activeTeacherId}
                onChange={(e) => setActiveTeacherId(e.target.value)}
                aria-label="Pilih Guru Pratinjau"
                className="hidden lg:block bg-white border border-slate-200 text-slate-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                {teachers
                  .filter((t) => t.role === 'guru')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isHomeroom ? `(Wali ${t.homeroomClassId?.replace('c-', '').toUpperCase()})` : ''}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => setCurrentRole('admin')}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
                title="Kembali ke Dashboard Administrator"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Kembali ke Admin</span>
              </button>
            </div>
          ) : (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap ${
                isAdminMode
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
              title={
                isAdminMode
                  ? 'Anda masuk dengan hak akses penuh Administrator'
                  : 'Anda masuk dengan hak akses Guru & Wali Kelas'
              }
            >
              {isAdminMode ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Role: Admin</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {currentUser?.isHomeroom
                      ? `Wali ${currentUser.homeroomClassId?.replace('c-', '').toUpperCase()}`
                      : 'Role: Guru'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* User Profile Button (Edit Identitas) */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors text-left ${
              isAdminMode
                ? 'hover:border-indigo-300 hover:bg-indigo-50/50'
                : 'hover:border-emerald-300 hover:bg-emerald-50/50'
            }`}
            title="Klik untuk Edit Identitas Saya"
          >
            <div
              className={`w-6 h-6 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                isAdminMode ? 'bg-indigo-700' : 'bg-emerald-700'
              }`}
            >
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                {currentUser?.name || 'Profil Pengguna'}
              </p>
              <p
                className={`text-[10px] font-medium flex items-center gap-0.5 ${
                  isAdminMode ? 'text-indigo-700' : 'text-emerald-700'
                }`}
              >
                <Edit3 className="w-2.5 h-2.5" />
                Edit Identitas
              </p>
            </div>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors flex items-center gap-1.5 text-xs cursor-pointer active:scale-95 shadow-2xs"
            title="Keluar dari Akun (Logout)"
            aria-label="Keluar dari Akun"
          >
            <LogOut className="w-3.5 h-3.5 transition-colors" />
            <span className="hidden xl:inline font-medium">Keluar</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs bg-slate-50">
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="px-2 py-1 rounded whitespace-nowrap bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold flex items-center gap-1 shrink-0"
          title="Edit Identitas Profil Saya"
        >
          <Edit3 className="w-3 h-3" />
          <span>Edit Profil</span>
        </button>

        {isAdminPreviewingGuru && (
          <button
            onClick={() => setCurrentRole('admin')}
            className="px-2.5 py-1 rounded whitespace-nowrap bg-indigo-700 text-white font-bold flex items-center gap-1 shrink-0"
          >
            <Shield className="w-3 h-3" />
            Kembali ke Admin
          </button>
        )}

        {!isAdminMode ? (
          <>
            <button
              onClick={() => setActiveView('teacher_grades')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'teacher_grades' ? 'bg-emerald-600 text-white font-medium' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Input Nilai
            </button>
            <button
              onClick={() => setActiveView('walikelas_ledger')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'walikelas_ledger' ? 'bg-emerald-600 text-white font-medium' : 'bg-white text-emerald-700 border border-emerald-200'
              }`}
            >
              Leger Wali
            </button>
            <button
              onClick={() => setActiveView('walikelas_attendance')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'walikelas_attendance' ? 'bg-emerald-600 text-white font-medium' : 'bg-white text-emerald-700 border border-emerald-200'
              }`}
            >
              Presensi/Catatan
            </button>
            <button
              onClick={() => setActiveView('walikelas_rapor')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'walikelas_rapor' ? 'bg-emerald-600 text-white font-medium' : 'bg-white text-emerald-700 border border-emerald-200'
              }`}
            >
              Menu Cetak
            </button>
            <button
              onClick={() => setActiveView('walikelas_kop')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'walikelas_kop' ? 'bg-emerald-600 text-white font-medium' : 'bg-white text-emerald-700 border border-emerald-200'
              }`}
            >
              Kop &amp; Logo
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'dashboard' ? 'bg-indigo-700 text-white font-medium' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Ringkasan
            </button>
            <button
              onClick={() => setActiveView('students')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'students' ? 'bg-indigo-700 text-white font-medium' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Siswa
            </button>
            <button
              onClick={() => setActiveView('subjects')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'subjects' ? 'bg-indigo-700 text-white font-medium' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Mapel
            </button>
            <button
              onClick={() => setActiveView('teachers')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'teachers' ? 'bg-indigo-700 text-white font-medium' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Guru &amp; Wali
            </button>
            <button
              onClick={() => setActiveView('school_ledger')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'school_ledger' ? 'bg-indigo-700 text-white font-medium' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Leger Sekolah
            </button>
            <button
              onClick={() => setActiveView('walikelas_kop')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'walikelas_kop' || activeView === 'walikelas_rapor'
                  ? 'bg-indigo-700 text-white font-medium'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Atur Cetak
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={`px-2.5 py-1 rounded whitespace-nowrap ${
                activeView === 'settings' ? 'bg-indigo-700 text-white font-medium' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Pengaturan
            </button>
          </>
        )}

        {/* Mobile Logout Quick Button */}
        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="px-2 py-1 rounded whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 shrink-0 ml-auto cursor-pointer"
          title="Keluar dari Akun"
        >
          <LogOut className="w-3 h-3" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Custom In-App Logout Confirmation Modal (Prevents iframe window.confirm blocking) */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">
              Keluar dari Portal?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Anda akan keluar dari sesi akun{' '}
              <strong className="text-slate-800 font-semibold">
                {currentUser?.name || 'Pengguna'}
              </strong>
              . Seluruh perubahan nilai dan data telah tersimpan. Anda dapat masuk kembali kapan saja melalui halaman login.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                }}
                className="flex-1 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
