import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { sortSubjectsByCategoryOrder } from '../../utils/subjectOrder';
import {
  FileSpreadsheet,
  Download,
  Search,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const SchoolLedgerView: React.FC = () => {
  const { classes, subjects, settings, getClassRanking, resetStudentGrades } = useApp();
  const orderedSubjects = useMemo(() => sortSubjectsByCategoryOrder(subjects), [subjects]);

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [alsoResetHomeroom, setAlsoResetHomeroom] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  // Collect rankings for all classes
  const allRankings = useMemo(() => {
    let list: any[] = [];
    classes.forEach((cls) => {
      const clsRank = getClassRanking(cls.id).map((r) => ({
        ...r,
        className: cls.name,
        classLevel: cls.level,
      }));
      list = [...list, ...clsRank];
    });

    // Global sorting by average score descending
    list.sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);

    // Assign school-wide rank
    list.forEach((item, index) => {
      item.schoolRank = index + 1;
    });

    return list;
  }, [classes, getClassRanking]);

  const filteredData = useMemo(() => {
    return allRankings.filter((r) => {
      const matchSearch =
        r.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.student.nis.includes(searchQuery);
      const matchClass = selectedClassId === 'all' || r.student.classId === selectedClassId;
      return matchSearch && matchClass;
    });
  }, [allRankings, searchQuery, selectedClassId]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredIds = useMemo(() => filteredData.map((r) => r.student.id), [filteredData]);
  const selectedFilteredCount = useMemo(
    () => filteredIds.filter((id) => selectedIdSet.has(id)).length,
    [filteredIds, selectedIdSet]
  );
  const isAllFilteredSelected =
    filteredData.length > 0 && selectedFilteredCount === filteredData.length;

  const toggleSelectAllFiltered = () => {
    if (filteredData.length === 0) return;
    if (isAllFilteredSelected) {
      const filteredSet = new Set(filteredIds);
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectOne = (studentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleConfirmReset = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    resetStudentGrades(selectedIds, alsoResetHomeroom);
    setSelectedIds([]);
    setIsResetModalOpen(false);
    setAlsoResetHomeroom(false);
    setResetNotice(`Nilai UTS untuk ${count} siswa terpilih berhasil direset.`);
    setTimeout(() => setResetNotice(null), 4000);
  };

  const exportSchoolCsv = () => {
    const headers = [
      'Peringkat Sekolah',
      'Peringkat Kelas',
      'Kelas',
      'NIS',
      'NISN',
      'Nama Siswa',
      'L/P',
      ...orderedSubjects.map((s) => s.code),
      'Total Nilai',
      'Rata-rata',
    ];

    const rows = filteredData.map((r) => [
      r.schoolRank,
      r.rank,
      r.className,
      r.student.nis,
      r.student.nisn,
      `"${r.student.name}"`,
      r.student.gender,
      ...orderedSubjects.map((s) => r.grades[s.id]?.finalScore || 0),
      r.totalScore,
      r.averageScore,
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'Leger_Nilai_UTS_Sekolah.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Leger Nilai Ujian Tengah Semester Seluruh Sekolah
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi nilai dan pemeringkatan paralel seluruh rombel {settings.schoolName}
          </p>
        </div>

        <button
          onClick={exportSchoolCsv}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Ekspor Leger Sekolah (CSV)
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari siswa atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter Rombel:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="all">Seluruh Rombel ({classes.length} Kelas)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Selection & Reset Bar (Above Table, Below Search) */}
        <div
          className={`px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
            selectedIds.length > 0 ? 'bg-amber-50/70' : 'bg-white'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate =
                      selectedFilteredCount > 0 && selectedFilteredCount < filteredData.length;
                  }
                }}
                onChange={toggleSelectAllFiltered}
                disabled={filteredData.length === 0}
                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:opacity-40"
              />
              <span>
                {isAllFilteredSelected
                  ? `Batalkan Tandai Semua (${filteredData.length} siswa)`
                  : `Tandai Semua (${filteredData.length} siswa)`}
              </span>
            </label>

            {selectedIds.length > 0 && (
              <>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px]">
                  {selectedIds.length} siswa ditandai
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
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
            disabled={selectedIds.length === 0}
            onClick={() => setIsResetModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              selectedIds.length > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {selectedIds.length > 0
                ? `Reset Nilai Terpilih (${selectedIds.length})`
                : 'Reset Nilai Terpilih'}
            </span>
          </button>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    disabled={filteredData.length === 0}
                    aria-label="Tandai semua siswa"
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:opacity-40"
                  />
                </th>
                <th className="py-3 px-2 w-12 text-center">Peringkat Paralel</th>
                <th className="py-3 px-2 w-20">Kelas</th>
                <th className="py-3 px-2 w-16">NIS</th>
                <th className="py-3 px-3 min-w-[180px]">Nama Siswa</th>
                <th className="py-3 px-1 w-8 text-center">L/P</th>
                {orderedSubjects.map((sub) => (
                  <th key={sub.id} className="py-3 px-1.5 w-14 text-center border-l border-slate-200">
                    {sub.code}
                  </th>
                ))}
                <th className="py-3 px-2 w-16 text-center bg-slate-200/70 border-l border-slate-300">
                  Total
                </th>
                <th className="py-3 px-2 w-16 text-center bg-emerald-100/50 text-emerald-900 border-l border-emerald-200 font-bold">
                  Rata-rata
                </th>
                <th className="py-3 px-2 w-16 text-center border-l border-slate-200">Rank Rombel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9 + orderedSubjects.length} className="py-8 text-center text-slate-400">
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isSelected = selectedIdSet.has(item.student.id);
                  return (
                  <tr
                    key={item.student.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(item.student.id)}
                        aria-label={`Tandai ${item.student.name}`}
                        className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                      #{item.schoolRank}
                    </td>
                    <td className="py-2.5 px-2 font-medium text-emerald-800">{item.className}</td>
                    <td className="py-2.5 px-2 font-mono text-slate-600">{item.student.nis}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.student.name}</td>
                    <td className="py-2.5 px-1 text-center font-mono text-slate-500">{item.student.gender}</td>
                    {orderedSubjects.map((sub) => {
                      const grade = item.grades[sub.id];
                      const score = grade?.finalScore || 0;
                      return (
                        <td
                          key={sub.id}
                          className={`py-2.5 px-1.5 text-center font-mono border-l border-slate-100 ${
                            score < sub.kkm && score > 0 ? 'text-rose-600 bg-rose-50/40 font-bold' : ''
                          }`}
                        >
                          {score > 0 ? score : '-'}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                      {item.totalScore}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-900 bg-emerald-50/30 border-l border-emerald-100">
                      {item.averageScore}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-600 border-l border-slate-200">
                      #{item.rank}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">
              Reset Nilai {selectedIds.length} Siswa Terpilih?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Seluruh nilai tugas dan UTS milik{' '}
              <strong className="text-slate-800">{selectedIds.length} siswa</strong> yang ditandai
              akan dikosongkan untuk penilaian ulang. Data profil siswa tidak terhapus.
            </p>

            <label className="flex items-start gap-2 text-left text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={alsoResetHomeroom}
                onChange={(e) => setAlsoResetHomeroom(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Sekaligus reset presensi (S/I/A), ekstrakurikuler, &amp; catatan wali kelas</span>
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
                onClick={handleConfirmReset}
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
