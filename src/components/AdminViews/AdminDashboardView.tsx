import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  BookOpen,
  Settings,
  Award,
  TrendingUp,
  ArrowRight,
  HardDrive,
  Cloud,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const {
    students,
    subjects,
    classes,
    teachers,
    grades,
    settings,
    cloudState,
    setActiveView,
    resetClassGrades,
  } = useApp();

  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [alsoResetHomeroom, setAlsoResetHomeroom] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const analytics = useMemo(() => {
    const totalStudents = students.length;
    const totalSubjects = subjects.length;
    const totalTeachers = teachers.length;
    const totalClasses = classes.length;

    const scoredGrades = grades.filter((g) => g.finalScore > 0);
    const passedGrades = scoredGrades.filter((g) => g.isPassed);

    const overallPassRate =
      scoredGrades.length > 0 ? Math.round((passedGrades.length / scoredGrades.length) * 100) : 0;

    const schoolAvg =
      scoredGrades.length > 0
        ? Math.round((scoredGrades.reduce((a, b) => a + b.finalScore, 0) / scoredGrades.length) * 10) / 10
        : 0;

    // Per-class stats
    const classStats = classes.map((cls) => {
      const clsStudents = students.filter((s) => s.classId === cls.id);
      const studentIds = clsStudents.map((s) => s.id);
      const clsGrades = grades.filter((g) => studentIds.includes(g.studentId) && g.finalScore > 0);
      const clsPassed = clsGrades.filter((g) => g.isPassed);

      const avg =
        clsGrades.length > 0
          ? Math.round((clsGrades.reduce((a, b) => a + b.finalScore, 0) / clsGrades.length) * 10) / 10
          : 0;

      const rate = clsGrades.length > 0 ? Math.round((clsPassed.length / clsGrades.length) * 100) : 0;

      return {
        cls,
        studentCount: clsStudents.length,
        avg,
        passRate: rate,
      };
    });

    return {
      totalStudents,
      totalSubjects,
      totalTeachers,
      totalClasses,
      overallPassRate,
      schoolAvg,
      classStats,
    };
  }, [students, subjects, teachers, classes, grades]);

  const selectedClassIdSet = useMemo(() => new Set(selectedClassIds), [selectedClassIds]);
  const allClassIds = useMemo(() => classes.map((c) => c.id), [classes]);
  const isAllClassesSelected =
    allClassIds.length > 0 && selectedClassIds.length === allClassIds.length;

  const toggleSelectAllClasses = () => {
    if (allClassIds.length === 0) return;
    if (isAllClassesSelected) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(allClassIds);
    }
  };

  const toggleSelectClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleConfirmResetClasses = () => {
    if (selectedClassIds.length === 0) return;
    const count = selectedClassIds.length;
    resetClassGrades(selectedClassIds, alsoResetHomeroom);
    setSelectedClassIds([]);
    setIsResetModalOpen(false);
    setAlsoResetHomeroom(false);
    setResetNotice(`Nilai UTS pada ${count} kelas terpilih berhasil direset.`);
    setTimeout(() => setResetNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
              Panel Administrator & Kurikulum
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-500">{settings.schoolName}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Dashboard Penilaian Tengah Semester (UTS)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahun Pelajaran {settings.academicYear} · Semester {settings.semester} · Kepala Madrasah:{' '}
            <strong className="text-slate-700">{settings.headmasterName}</strong>
          </p>
        </div>

        {/* Quick Settings Shortcut */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('settings')}
            className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-xs"
          >
            <Settings className="w-4 h-4" />
            Pengaturan &amp; Backup Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveView('students')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
          title="Klik untuk membuka Pengelolaan & Upload Data Siswa"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Peserta Didik</span>
            <Users className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {analytics.totalStudents} <span className="text-xs font-normal text-slate-500">Siswa</span>
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center justify-between">
            <span>Tersebar di {analytics.totalClasses} Rombel</span>
            <span className="underline group-hover:text-emerald-800">Kelola &amp; Upload &rarr;</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Rata-rata Nilai UTS Sekolah</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-2 font-mono">
            {analytics.schoolAvg}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Skala 0 - 100 dari seluruh mata pelajaran
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tingkat Ketuntasan UTS</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-2 font-mono">
            {analytics.overallPassRate}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Capaian nilai di atas KKM/KKTP</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Mata Pelajaran & Guru</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {analytics.totalSubjects}{' '}
            <span className="text-xs font-normal text-slate-500">Mapel / {analytics.totalTeachers} Guru</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Agama, Umum & Muatan Lokal</p>
        </div>
      </div>

      {/* Class Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Rekapitulasi Capaian Nilai UTS per Rombongan Belajar
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Monitoring rata-rata nilai dan persentase ketuntasan tiap kelas
            </p>
          </div>
          <button
            onClick={() => setActiveView('school_ledger')}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            Buka Leger Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bulk Selection & Reset Bar */}
        <div
          className={`px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
            selectedClassIds.length > 0 ? 'bg-amber-50/70' : 'bg-white'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={isAllClassesSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate =
                      selectedClassIds.length > 0 && selectedClassIds.length < allClassIds.length;
                  }
                }}
                onChange={toggleSelectAllClasses}
                disabled={allClassIds.length === 0}
                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:opacity-40"
              />
              <span>
                {isAllClassesSelected
                  ? `Batalkan Tandai Semua (${allClassIds.length} kelas)`
                  : `Tandai Semua (${allClassIds.length} kelas)`}
              </span>
            </label>

            {selectedClassIds.length > 0 && (
              <>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px]">
                  {selectedClassIds.length} kelas ditandai
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedClassIds([])}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Bersihkan Pilihan
                </button>
              </>
            )}

            {resetNotice && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {resetNotice}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={selectedClassIds.length === 0}
            onClick={() => setIsResetModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              selectedClassIds.length > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {selectedClassIds.length > 0
                ? `Reset Nilai Terpilih (${selectedClassIds.length})`
                : 'Reset Nilai Terpilih'}
            </span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllClassesSelected}
                    onChange={toggleSelectAllClasses}
                    disabled={allClassIds.length === 0}
                    aria-label="Tandai semua kelas untuk reset"
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:opacity-40"
                  />
                </th>
                <th className="py-3 px-4">Nama Kelas</th>
                <th className="py-3 px-4">Tingkat</th>
                <th className="py-3 px-4">Wali Kelas</th>
                <th className="py-3 px-4 text-center">Jumlah Siswa</th>
                <th className="py-3 px-4 text-center">Rata-rata UTS</th>
                <th className="py-3 px-4 text-center">Persentase Ketuntasan</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.classStats.map(({ cls, studentCount, avg, passRate }) => {
                const isSelected = selectedClassIdSet.has(cls.id);
                return (
                <tr
                  key={cls.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectClass(cls.id)}
                      aria-label={`Tandai ${cls.name}`}
                      className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{cls.name}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{cls.level}</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{cls.homeroomTeacherName}</td>
                  <td className="py-3 px-4 text-center font-mono font-medium">{studentCount}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{avg}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{passRate}%</span>
                      <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden hidden sm:block">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{ width: `${passRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {passRate >= 75 ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        Baik
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                        Pendampingan
                      </span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vercel Cloud & Local Storage Info Strip */}
      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
            {cloudState.mode === 'connected' ? (
              <Cloud className="w-5 h-5" />
            ) : (
              <HardDrive className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">
              {cloudState.mode === 'connected'
                ? 'Database Cloud Vercel Aktif (Upstash Redis / KV)'
                : 'Penyimpanan Lokal & Panduan Database Vercel'}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {cloudState.mode === 'connected'
                ? `Seluruh data siswa, guru, nilai UTS, dan pengaturan sekolah tersimpan permanen di Vercel Cloud${cloudState.lastSyncedAt ? ` (Sinkron: ${cloudState.lastSyncedAt})` : ''}.`
                : 'Hubungkan Upstash Redis di Vercel Storage agar data Admin tersimpan permanen lintas hari & perangkat.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveView('settings')}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold border border-slate-700 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          Buka Backup &amp; Pengaturan
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">
              Reset Nilai {selectedClassIds.length} Kelas Terpilih?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Seluruh nilai tugas dan UTS siswa pada{' '}
              <strong className="text-slate-800">{selectedClassIds.length} kelas</strong> yang
              ditandai akan dikosongkan ke status awal (belum dinilai). Data siswa dan mapel tidak ikut terhapus.
            </p>

            <label className="flex items-start gap-2 text-left text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={alsoResetHomeroom}
                onChange={(e) => setAlsoResetHomeroom(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Sekaligus reset data presensi (S/I/A), ekstrakurikuler, dan catatan wali kelas</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetClasses}
                className="flex-1 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ya, Reset Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
