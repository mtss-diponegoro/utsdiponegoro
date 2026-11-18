import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  GraduationCap,
  Shield,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Cloud,
  RefreshCw,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickLoginAs, teachers, classes, settings, cloudState } = useApp();

  const [roleTab, setRoleTab] = useState<UserRole>('guru');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAdminTab = roleTab === 'admin';

  const roleAccounts = useMemo(
    () => teachers.filter((t) => t.role === roleTab),
    [teachers, roleTab]
  );

  const handleTabChange = (role: UserRole) => {
    setRoleTab(role);
    setErrorMessage(null);
    setIdentifier('');
    setPassword('');
    setShowPassword(false);
  };

  const handleFillDemoCredentials = () => {
    setErrorMessage(null);
    if (roleTab === 'admin') {
      const adminAcc = teachers.find((t) => t.role === 'admin');
      setIdentifier(adminAcc?.email || 'admin.kurikulum@sekolah.sch.id');
      setPassword(adminAcc?.password || 'admin123');
    } else {
      const guruAcc = teachers.find((t) => t.role === 'guru');
      setIdentifier(guruAcc?.email || 'ahmad.dahlan@sekolah.sch.id');
      setPassword(guruAcc?.password || 'guru123');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage(
        isAdminTab
          ? 'Silakan masukkan Email atau NIP Administrator.'
          : 'Silakan masukkan NIP atau Email Guru.'
      );
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Silakan masukkan kata sandi.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login(identifier, password, roleTab);
      setIsLoading(false);
      if (!result.success) {
        setErrorMessage(result.message);
      }
    }, 220);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 ${
        isAdminTab
          ? 'bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200/60'
          : 'bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/40'
      }`}
    >
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand & Logos Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-4">
            {settings.showLogoInstansi && settings.logoInstansiUrl && (
              <div className="w-14 h-14 bg-white p-1 rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
                <img
                  src={settings.logoInstansiUrl}
                  alt="Logo Instansi"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            {settings.showLogoLembaga && settings.logoLembagaUrl && (
              <div className="w-14 h-14 bg-white p-1 rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
                <img
                  src={settings.logoLembagaUrl}
                  alt="Logo Lembaga"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
          </div>

          <div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold mb-1 border transition-colors ${
                isAdminTab
                  ? 'bg-indigo-100/80 text-indigo-900 border-indigo-200'
                  : 'bg-emerald-100/70 text-emerald-800 border-emerald-200'
              }`}
            >
              {isAdminTab ? (
                <Shield className="w-3.5 h-3.5 text-indigo-700" />
              ) : (
                <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span>
                {isAdminTab
                  ? 'Portal Khusus Administrator Madrasah'
                  : 'Portal Khusus Guru & Wali Kelas'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
              {settings.schoolName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tahun Ajaran {settings.academicYear} · Semester {settings.semester}
            </p>
          </div>
        </div>

        {/* Main Login Card */}
        <div
          className={`bg-white rounded-2xl border shadow-lg overflow-hidden transition-colors ${
            isAdminTab
              ? 'border-indigo-200/80 shadow-indigo-100/60'
              : 'border-slate-200 shadow-slate-200/50'
          }`}
        >
          {/* Role Segmented Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleTabChange('guru')}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isAdminTab
                  ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className={`w-4 h-4 ${!isAdminTab ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Login Guru &amp; Wali</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isAdminTab
                  ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className={`w-4 h-4 ${isAdminTab ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Login Administrator</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Role Header & Scope Banner */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {isAdminTab ? 'Masuk sebagai Administrator' : 'Masuk sebagai Guru / Wali Kelas'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAdminTab
                      ? 'Gunakan akun Administrator untuk mengelola sistem & master data.'
                      : 'Gunakan akun Guru untuk input nilai mapel dan menu Wali Kelas.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemoCredentials}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors shrink-0 cursor-pointer ${
                    isAdminTab
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Isi Demo
                </button>
              </div>

              {/* Explicit Role Permission Scope Box */}
              <div
                className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                  isAdminTab
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isAdminTab ? 'text-indigo-600' : 'text-emerald-600'
                    }`}
                  />
                  <span>
                    {isAdminTab
                      ? 'Hak Akses Mode Administrator:'
                      : 'Hak Akses Mode Guru & Wali Kelas:'}
                  </span>
                </p>
                <p className="text-slate-600 leading-relaxed pl-5">
                  {isAdminTab
                    ? 'Ringkasan sekolah, Kelola & Upload Data Siswa, Atur Mapel & KKM, Tambah/Edit Guru, Leger Sekolah, serta Pengaturan NSM & GAS.'
                    : 'Input Nilai Tugas & UTS per mapel, Statistik Nilai, Leger Kelas Binaan, Presensi & Catatan Wali Kelas, serta Menu Cetak Rapor.'}
                </p>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">
                  {isAdminTab ? 'Email atau NIP Administrator' : 'NIP atau Email Guru'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    {isAdminTab ? <Mail className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      isAdminTab
                        ? 'Contoh: admin.kurikulum@sekolah.sch.id'
                        : 'Contoh: ahmad.dahlan@sekolah.sch.id / NIP'
                    }
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-xs font-medium text-slate-900 ${
                      isAdminTab ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Kata Sandi ({isAdminTab ? 'Admin' : 'Guru'})
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Demo: {isAdminTab ? 'admin123' : 'guru123'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-xs font-medium text-slate-900 ${
                      isAdminTab ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 text-xs">
                  <input
                    type="checkbox"
                    defaultChecked
                    className={`rounded ${
                      isAdminTab
                        ? 'text-indigo-600 focus:ring-indigo-500'
                        : 'text-emerald-600 focus:ring-emerald-500'
                    }`}
                  />
                  <span>Ingat sesi masuk di perangkat ini</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isAdminTab
                    ? 'bg-indigo-700 hover:bg-indigo-800'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isLoading ? (
                  <span>Memverifikasi Akun {isAdminTab ? 'Administrator' : 'Guru'}...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>
                      {isAdminTab ? 'Masuk ke Dashboard Admin' : 'Masuk ke Portal Guru'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick 1-Click Login Shortcuts Card */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-700 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Masuk Cepat Akun {isAdminTab ? 'Administrator' : 'Guru'} (1-Klik):
              </span>
              <span className="text-[10px] font-normal text-slate-400">
                {roleAccounts.length} akun terdaftar
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
              {roleAccounts.map((acc) => {
                const homeroomCls = classes.find((c) => c.id === acc.homeroomClassId);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => quickLoginAs(acc.id)}
                    className={`w-full p-2.5 bg-white border border-slate-200 rounded-lg text-left transition-colors flex items-center justify-between text-xs cursor-pointer ${
                      isAdminTab
                        ? 'hover:bg-indigo-50 hover:border-indigo-300'
                        : 'hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-900 truncate">{acc.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {acc.role === 'admin'
                          ? `Administrator · ${acc.email}`
                          : `${
                              acc.isHomeroom
                                ? `Wali ${homeroomCls?.name || 'Kelas'}`
                                : 'Guru Mapel'
                            } · ${acc.email}`}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1 shrink-0 ${
                        isAdminTab ? 'text-indigo-700' : 'text-emerald-700'
                      }`}
                    >
                      Masuk <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Info Footnote */}
        <div className="text-center text-[11px] text-slate-500 space-y-1.5">
          {cloudState.mode === 'connected' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-emerald-50 border-emerald-200 text-emerald-800 text-[11px] font-medium">
              {cloudState.syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Memuat data tersimpan dari database Vercel...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3" />
                  <span>
                    Database Cloud Vercel Aktif
                    {cloudState.lastSyncedAt ? ` · Sinkron ${cloudState.lastSyncedAt}` : ''}
                  </span>
                </>
              )}
            </div>
          )}
          <p className="text-slate-500 font-medium">
            {settings.schoolName} · Sistem Penilaian Ujian Tengah Semester &amp; Leger Terpadu
          </p>
        </div>
      </div>
    </div>
  );
};
