import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Subject } from '../../types';
import {
  STANDARD_MTS_SUBJECTS,
  buildStandardMtsSubjects,
  groupSubjectsForRapor,
  getLetterLabel,
  sortSubjectsByCategoryOrder,
} from '../../utils/subjectOrder';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

function suggestSubjectCode(name: string): string {
  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export const SubjectManagementView: React.FC = () => {
  const {
    subjects,
    teachers,
    addSubject,
    updateSubject,
    deleteSubject,
    batchDeleteSubjects,
    moveSubject,
    replaceSubjects,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Agama' | 'Umum' | 'Muatan Lokal'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<Subject | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateMulokInput, setTemplateMulokInput] = useState('');
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    kkm: 75,
    category: 'Umum' as 'Umum' | 'Agama' | 'Muatan Lokal',
    teacherId: teachers[0]?.id || '',
  });

  const orderedSubjects = useMemo(() => sortSubjectsByCategoryOrder(subjects), [subjects]);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orderedSubjects.filter((sub) => {
      const matchSearch =
        !q ||
        sub.name.toLowerCase().includes(q) ||
        sub.code.toLowerCase().includes(q) ||
        sub.teacherName.toLowerCase().includes(q);
      const matchCategory = categoryFilter === 'all' || sub.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [orderedSubjects, searchQuery, categoryFilter]);

  const groupedAll = useMemo(() => groupSubjectsForRapor(orderedSubjects), [orderedSubjects]);
  const groupedFiltered = useMemo(() => groupSubjectsForRapor(filteredSubjects), [filteredSubjects]);

  // Numbering follows the full curriculum structure when showing all categories
  const isUnfiltered = categoryFilter === 'all' && !searchQuery.trim();

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredIds = useMemo(() => filteredSubjects.map((s) => s.id), [filteredSubjects]);
  const selectedFilteredCount = useMemo(
    () => filteredIds.filter((id) => selectedIdSet.has(id)).length,
    [filteredIds, selectedIdSet]
  );
  const isAllFilteredSelected =
    filteredSubjects.length > 0 && selectedFilteredCount === filteredSubjects.length;

  const toggleSelectAllFiltered = () => {
    if (filteredSubjects.length === 0) return;
    if (isAllFilteredSelected) {
      const filteredSet = new Set(filteredIds);
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectOne = (subjectId: string) => {
    setSelectedIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    batchDeleteSubjects(selectedIds);
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const handleConfirmSingleDelete = () => {
    if (!singleDeleteTarget) return;
    deleteSubject(singleDeleteTarget.id);
    setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteTarget.id));
    setSingleDeleteTarget(null);
  };

  const openAddModal = (presetCategory: 'Umum' | 'Agama' | 'Muatan Lokal' = 'Umum') => {
    setEditingSubject(null);
    setFormError(null);
    setCodeManuallyEdited(false);
    setFormData({
      code: '',
      name: '',
      kkm: 75,
      category: presetCategory,
      teacherId: teachers.find((t) => t.role === 'guru')?.id || teachers[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setFormError(null);
    setCodeManuallyEdited(true);
    setFormData({
      code: subject.code,
      name: subject.name,
      kkm: subject.kkm,
      category: subject.category,
      teacherId: subject.teacherId,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    const cleanCode = (formData.code.trim() || suggestSubjectCode(cleanName)).toUpperCase();

    if (!cleanName || !cleanCode) {
      setFormError('Nama mata pelajaran dan kode wajib diisi.');
      return;
    }

    const teacher = teachers.find((t) => t.id === formData.teacherId);
    const teacherName = teacher ? teacher.name : 'Guru Pengampu';

    if (editingSubject) {
      updateSubject({
        ...editingSubject,
        ...formData,
        code: cleanCode,
        name: cleanName,
        teacherName,
      });
    } else {
      addSubject({
        ...formData,
        code: cleanCode,
        name: cleanName,
        teacherName,
      });
    }

    setIsModalOpen(false);
  };

  const handleApplyStandardOrder = () => {
    const baseSubjects = buildStandardMtsSubjects(subjects, teachers, {
      preserveCustomUmum: false,
    });

    // Jika user menuliskan daftar Mulok tambahan di modal template, tambahkan ke kelompok 12. Muatan Lokal
    const customMulokLines = templateMulokInput
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    const fallbackTeacher = teachers.find((t) => t.role === 'guru') || teachers[0];
    const existingMulokNames = new Set(
      baseSubjects
        .filter((s) => s.category === 'Muatan Lokal')
        .map((s) => s.name.trim().toLowerCase())
    );

    const newMulokSubjects: Subject[] = customMulokLines
      .filter((name) => !existingMulokNames.has(name.toLowerCase()))
      .map((name, idx) => {
        existingMulokNames.add(name.toLowerCase());
        return {
          id: `sub-mulok-${Date.now()}-${idx}`,
          code: suggestSubjectCode(name) || `MLK${idx + 1}`,
          name,
          kkm: 75,
          category: 'Muatan Lokal',
          teacherId: fallbackTeacher?.id || '',
          teacherName: fallbackTeacher?.name || 'Guru Pengampu',
        };
      });

    replaceSubjects([...baseSubjects, ...newMulokSubjects]);
    setSelectedIds([]);
    setTemplateMulokInput('');
    setIsTemplateModalOpen(false);
    setTemplateNotice(
      'Urutan mata pelajaran standar MTs (1–11) berhasil diterapkan. Muatan Lokal (12) siap diisi atau disesuaikan.'
    );
    setTimeout(() => setTemplateNotice(null), 5000);
  };

  const renderSubjectRow = (
    sub: Subject,
    numberLabel: string,
    isSubItem: boolean,
    categoryList: Subject[],
    indexInCategory: number
  ) => {
    const isSelected = selectedIdSet.has(sub.id);
    const canMoveUp = indexInCategory > 0;
    const canMoveDown = indexInCategory < categoryList.length - 1;

    return (
      <tr
        key={sub.id}
        className={`transition-colors ${
          isSelected ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50/80'
        }`}
      >
        <td className="py-2.5 px-3 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectOne(sub.id)}
            aria-label={`Tandai ${sub.name}`}
            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
          />
        </td>
        <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-semibold">
          {isSubItem ? '' : numberLabel}
        </td>
        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{sub.code}</td>
        <td className="py-2.5 px-4 font-bold text-slate-900">
          {isSubItem ? (
            <span className="inline-flex items-center gap-1.5 pl-2">
              <span className="font-mono text-emerald-700">{numberLabel}.</span>
              <span>{sub.name}</span>
            </span>
          ) : (
            sub.name
          )}
        </td>
        <td className="py-2.5 px-3">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
              sub.category === 'Agama'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : sub.category === 'Muatan Lokal'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {sub.category === 'Agama' ? 'Pend. Agama' : sub.category}
          </span>
        </td>
        <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-slate-900 bg-slate-50">
          {sub.kkm}
        </td>
        <td className="py-2.5 px-4 text-slate-800 font-medium">{sub.teacherName}</td>
        <td className="py-2.5 px-2 text-center">
          <div className="inline-flex items-center gap-0.5">
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={() => moveSubject(sub.id, 'up')}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
              title="Naikkan urutan"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={() => moveSubject(sub.id, 'down')}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
              title="Turunkan urutan"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
        <td className="py-2.5 px-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => openEditModal(sub)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded cursor-pointer"
              title="Edit Mapel"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSingleDeleteTarget(sub)}
              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
              title="Hapus Mapel"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Mata Pelajaran &amp; Kriteria Ketuntasan Minimal (KKM / KKTP)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Susunan urutan rapor standar MTs (1. Pendidikan Agama Islam A–D, 2–11 Mapel Umum, 12. Muatan Lokal diisi sendiri)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <ListOrdered className="w-4 h-4 text-emerald-700" />
            <span>Urutan Standar MTs</span>
          </button>

          <button
            type="button"
            onClick={() => openAddModal('Muatan Lokal')}
            className="px-3.5 py-2 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Tambah Mulok</span>
          </button>

          <button
            type="button"
            onClick={() => openAddModal('Umum')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mapel Baru</span>
          </button>
        </div>
      </div>

      {templateNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{templateNotice}</span>
        </div>
      )}

      {/* Subjects Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kode, nama mapel, atau guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="all">Semua Kategori ({orderedSubjects.length})</option>
              <option value="Agama">1. Pendidikan Agama Islam ({groupedAll.agamaSubjects.length})</option>
              <option value="Umum">Mapel Umum ({groupedAll.umumSubjects.length})</option>
              <option value="Muatan Lokal">Muatan Lokal ({groupedAll.mulokSubjects.length})</option>
            </select>
          </div>
        </div>

        {/* Bulk Selection Bar (Di atas tabel, di bawah pencarian) */}
        <div
          className={`px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
            selectedIds.length > 0 ? 'bg-rose-50/70' : 'bg-white'
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
                      selectedFilteredCount > 0 && selectedFilteredCount < filteredSubjects.length;
                  }
                }}
                onChange={toggleSelectAllFiltered}
                disabled={filteredSubjects.length === 0}
                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:opacity-40"
              />
              <span>
                {isAllFilteredSelected
                  ? `Batalkan Tandai Semua (${filteredSubjects.length} mapel)`
                  : `Tandai Semua (${filteredSubjects.length} mapel)`}
              </span>
            </label>

            {selectedIds.length > 0 && (
              <>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[11px]">
                  {selectedIds.length} mapel ditandai
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
          </div>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              selectedIds.length > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {selectedIds.length > 0
                ? `Hapus Mapel Terpilih (${selectedIds.length})`
                : 'Hapus Mapel Terpilih'}
            </span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    disabled={filteredSubjects.length === 0}
                    aria-label="Tandai semua mata pelajaran"
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:opacity-40"
                  />
                </th>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-20">Kode</th>
                <th className="py-3 px-4 min-w-[220px]">Nama Mata Pelajaran</th>
                <th className="py-3 px-3 w-28">Kategori</th>
                <th className="py-3 px-3 w-20 text-center bg-slate-200/50">KKM Default</th>
                <th className="py-3 px-4 min-w-[180px]">Guru Pengampu</th>
                <th className="py-3 px-2 w-16 text-center">Urutan</th>
                <th className="py-3 px-3 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length === 0 && !isUnfiltered ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada mata pelajaran yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                <>
                  {/* 1. Pendidikan Agama Islam */}
                  {groupedFiltered.agamaSubjects.length > 0 && (
                    <>
                      <tr className="bg-emerald-50/60 border-b border-emerald-100">
                        <td className="py-2 px-3 text-center text-slate-400">—</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-emerald-900">
                          {isUnfiltered ? groupedAll.agamaNumber : 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-800">PAI</td>
                        <td colSpan={6} className="py-2 px-4 font-bold text-emerald-950">
                          Pendidikan Agama Islam
                        </td>
                      </tr>
                      {groupedFiltered.agamaSubjects.map((sub, idx) =>
                        renderSubjectRow(
                          sub,
                          getLetterLabel(idx),
                          true,
                          groupedFiltered.agamaSubjects,
                          idx
                        )
                      )}
                    </>
                  )}

                  {/* 2 - 11. Mata Pelajaran Umum */}
                  {groupedFiltered.umumSubjects.map((sub, idx) => {
                    const baseNum = isUnfiltered ? groupedAll.umumStartNumber : 1;
                    return renderSubjectRow(
                      sub,
                      String(baseNum + idx),
                      false,
                      groupedFiltered.umumSubjects,
                      idx
                    );
                  })}

                  {/* 12. Muatan Lokal */}
                  {(groupedFiltered.mulokSubjects.length > 0 || isUnfiltered) && (
                    <>
                      <tr className="bg-amber-50/60 border-b border-amber-100">
                        <td className="py-2 px-3 text-center text-slate-400">—</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-amber-900">
                          {isUnfiltered
                            ? groupedAll.mulokNumber
                            : (groupedFiltered.agamaSubjects.length > 0 ? 1 : 0) +
                              groupedFiltered.umumSubjects.length +
                              1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-amber-800">MULOK</td>
                        <td colSpan={6} className="py-2 px-4 font-bold text-amber-950">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>Muatan Lokal (Diisi Sendiri)</span>
                            <button
                              type="button"
                              onClick={() => openAddModal('Muatan Lokal')}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Isi Muatan Lokal
                            </button>
                          </div>
                        </td>
                      </tr>

                      {groupedFiltered.mulokSubjects.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-5 px-6 text-center text-slate-500 bg-amber-50/20">
                            Belum ada mata pelajaran Muatan Lokal. Klik{' '}
                            <button
                              type="button"
                              onClick={() => openAddModal('Muatan Lokal')}
                              className="font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                            >
                              Isi Muatan Lokal
                            </button>{' '}
                            untuk menambahkan sendiri (contoh: Tahfidz JUZ 30, Ahlusunnah Wal Jammah, Bahasa Jawa).
                          </td>
                        </tr>
                      ) : (
                        groupedFiltered.mulokSubjects.map((sub, idx) =>
                          renderSubjectRow(
                            sub,
                            getLetterLabel(idx),
                            true,
                            groupedFiltered.mulokSubjects,
                            idx
                          )
                        )
                      )}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingSubject
                  ? 'Edit Mata Pelajaran'
                  : formData.category === 'Muatan Lokal'
                  ? 'Tambah Muatan Lokal (Isi Sendiri)'
                  : 'Tambah Mata Pelajaran Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.category === 'Muatan Lokal'
                      ? 'Misal: Tahfidz JUZ 30 atau Ahlusunnah Wal Jammah'
                      : 'Misal: Matematika'
                  }
                  value={formData.name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name: nextName,
                      code: !codeManuallyEdited ? suggestSubjectCode(nextName) : prev.code,
                    }));
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Kode Mapel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MTK"
                    value={formData.code}
                    onChange={(e) => {
                      setCodeManuallyEdited(true);
                      setFormData({ ...formData, code: e.target.value.toUpperCase() });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-mono font-bold uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nilai KKM Minimal (KKTP)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={formData.kkm}
                    onChange={(e) => setFormData({ ...formData, kkm: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Kelompok Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as any })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Agama">1. Pendidikan Agama Islam</option>
                    <option value="Umum">2–11. Mapel Umum</option>
                    <option value="Muatan Lokal">12. Muatan Lokal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Guru Pengampu
                  </label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standard MTs Order Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-700" />
                Terapkan Urutan Mapel Standar MTs
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <p className="text-slate-600 leading-relaxed">
                Susunan mata pelajaran akan diatur mengikuti urutan resmi rapor berikut. Nilai siswa dan guru pengampu pada mapel yang sudah ada tetap dipertahankan.
              </p>

              <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                <div className="bg-emerald-50/70 px-3 py-1.5 font-bold text-emerald-950 border-b border-slate-200">
                  1. Pendidikan Agama Islam
                </div>
                <div className="px-4 py-2 space-y-0.5 bg-white border-b border-slate-200 text-slate-700">
                  {STANDARD_MTS_SUBJECTS.filter((s) => s.category === 'Agama').map((s, idx) => (
                    <div key={s.id}>
                      <span className="font-mono font-bold text-emerald-700 mr-1.5">
                        {getLetterLabel(idx)}.
                      </span>
                      {s.name}
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {STANDARD_MTS_SUBJECTS.filter((s) => s.category === 'Umum').map((s, idx) => (
                    <div key={s.id} className="px-3 py-1.5 flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-500 w-5">{idx + 2}.</span>
                      <span className="font-medium text-slate-800">{s.name}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50/70 px-3 py-1.5 font-bold text-amber-950 border-t border-slate-200">
                  12. Muatan Lokal (Diisi Sendiri)
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[11px] mb-1">
                  Tambahkan Muatan Lokal Sendiri (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={templateMulokInput}
                  onChange={(e) => setTemplateMulokInput(e.target.value)}
                  placeholder={'Contoh (1 per baris atau pisahkan koma):\nTahfidz JUZ 30\nAhlusunnah Wal Jammah'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Muatan Lokal yang sudah ada sebelumnya tetap tersimpan, atau Anda bisa mengisinya nanti lewat tombol <strong>Tambah Mulok</strong>.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyStandardOrder}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Terapkan Urutan Standar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {singleDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Hapus Mata Pelajaran?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Mata pelajaran <strong className="text-slate-800">{singleDeleteTarget.name}</strong> dan seluruh nilai UTS terkait akan dihapus permanen.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSingleDeleteTarget(null)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="flex-1 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base mb-1">
              Hapus {selectedIds.length} Mapel Terpilih?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Seluruh data nilai UTS pada{' '}
              <strong className="text-slate-800">{selectedIds.length} mata pelajaran</strong> yang
              ditandai juga akan ikut terhapus secara permanen.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="flex-1 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
