import { Subject, Teacher } from '../types';

export interface StandardSubjectSpec {
  id: string;
  code: string;
  name: string;
  kkm: number;
  category: 'Agama' | 'Umum';
  matchCodes: string[];
  matchNames: string[];
}

/**
 * Urutan baku Mata Pelajaran MTs sesuai struktur Rapor (1 s.d. 11).
 * Bagian 12 (Muatan Lokal) diisi sendiri oleh masing-masing madrasah.
 */
export const STANDARD_MTS_SUBJECTS: StandardSubjectSpec[] = [
  // 1. Pendidikan Agama Islam (A - D)
  {
    id: 'sub-qh',
    code: 'QH',
    name: "Al Qur'an Hadis",
    kkm: 75,
    category: 'Agama',
    matchCodes: ['QH', 'QURDIS', 'AQH'],
    matchNames: ["al qur'an hadis", 'al-quran hadis', 'quran hadis', "qur'an hadis"],
  },
  {
    id: 'sub-aa',
    code: 'AA',
    name: 'Akidah Akhlak',
    kkm: 75,
    category: 'Agama',
    matchCodes: ['AA', 'AKD'],
    matchNames: ['akidah akhlak', 'aqidah akhlak'],
  },
  {
    id: 'sub-fik',
    code: 'FIK',
    name: 'Fikih',
    kkm: 75,
    category: 'Agama',
    matchCodes: ['FIK', 'FQH'],
    matchNames: ['fikih', 'fiqih'],
  },
  {
    id: 'sub-ski',
    code: 'SKI',
    name: 'Sejarah Kebudayaan Islam',
    kkm: 75,
    category: 'Agama',
    matchCodes: ['SKI'],
    matchNames: ['sejarah kebudayaan islam'],
  },
  // 2 - 11. Mata Pelajaran Umum
  {
    id: 'sub-arb',
    code: 'ARB',
    name: 'Bahasa Arab',
    kkm: 75,
    category: 'Umum',
    matchCodes: ['ARB', 'BAR'],
    matchNames: ['bahasa arab'],
  },
  {
    id: 'sub-pkn',
    code: 'PKN',
    name: 'Pendidikan Pancasila',
    kkm: 75,
    category: 'Umum',
    matchCodes: ['PKN', 'PPKN'],
    matchNames: ['pendidikan pancasila', 'pkn', 'ppkn', 'pendidikan pancasila dan kewarganegaraan'],
  },
  {
    id: 'sub-ind',
    code: 'BIND',
    name: 'Bahasa Indonesia',
    kkm: 75,
    category: 'Umum',
    matchCodes: ['BIND', 'IND'],
    matchNames: ['bahasa indonesia'],
  },
  {
    id: 'sub-mat',
    code: 'MTK',
    name: 'Matematika',
    kkm: 70,
    category: 'Umum',
    matchCodes: ['MTK', 'MAT'],
    matchNames: ['matematika'],
  },
  {
    id: 'sub-ipa',
    code: 'IPA',
    name: 'Ilmu Pengetahuan Alam',
    kkm: 72,
    category: 'Umum',
    matchCodes: ['IPA'],
    matchNames: ['ilmu pengetahuan alam', 'ipa'],
  },
  {
    id: 'sub-ips',
    code: 'IPS',
    name: 'Ilmu Pengetahuan Sosial',
    kkm: 75,
    category: 'Umum',
    matchCodes: ['IPS'],
    matchNames: ['ilmu pengetahuan sosial', 'ips'],
  },
  {
    id: 'sub-ing',
    code: 'BING',
    name: 'Bahasa Inggris',
    kkm: 72,
    category: 'Umum',
    matchCodes: ['BING', 'ING'],
    matchNames: ['bahasa inggris'],
  },
  {
    id: 'sub-pjok',
    code: 'PJOK',
    name: 'Pendidikan Jasmani, Olahraga dan Kesehatan',
    kkm: 75,
    category: 'Umum',
    matchCodes: ['PJOK', 'PJK'],
    matchNames: [
      'pendidikan jasmani, olahraga dan kesehatan',
      'pendidikan jasmani & or',
      'penjasorkes',
      'pjok',
    ],
  },
  {
    id: 'sub-inf',
    code: 'INF',
    name: 'Informatika',
    kkm: 75,
    category: 'Umum',
    matchCodes: ['INF', 'TIK'],
    matchNames: ['informatika', 'tik'],
  },
  {
    id: 'sub-sbk',
    code: 'SBK',
    name: 'Seni dan Budaya',
    kkm: 75,
    category: 'Umum',
    matchCodes: ['SBK', 'SBD', 'SENI'],
    matchNames: ['seni dan budaya', 'seni budaya'],
  },
];

const CATEGORY_RANK: Record<Subject['category'], number> = {
  Agama: 0,
  Umum: 1,
  'Muatan Lokal': 2,
};

/**
 * Mengelompokkan mapel sesuai struktur Rapor: Agama -> Umum -> Muatan Lokal,
 * dengan mempertahankan urutan di dalam tiap kelompok.
 */
export function sortSubjectsByCategoryOrder(list: Subject[]): Subject[] {
  return [...list].sort((a, b) => CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category]);
}

export function getLetterLabel(index: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < alphabet.length) {
    return alphabet[index];
  }
  return String(index + 1);
}

/**
 * Menyusun ulang daftar mapel agar mengikuti urutan standar MTs (1..11) + Muatan Lokal (12),
 * sambil mempertahankan ID, KKM, guru pengampu, dan nilai siswa pada mapel yang sudah ada.
 */
export function buildStandardMtsSubjects(
  existingSubjects: Subject[],
  teachers: Teacher[],
  options?: { preserveCustomUmum?: boolean }
): Subject[] {
  const fallbackTeacher = teachers.find((t) => t.role === 'guru') || teachers[0];
  const usedIds = new Set<string>();

  const standardized: Subject[] = STANDARD_MTS_SUBJECTS.map((spec) => {
    const matched = existingSubjects.find((s) => {
      if (usedIds.has(s.id)) return false;
      const codeNorm = s.code.trim().toUpperCase();
      const nameNorm = s.name.trim().toLowerCase();
      return (
        s.id === spec.id ||
        spec.matchCodes.includes(codeNorm) ||
        spec.matchNames.includes(nameNorm)
      );
    });

    if (matched) {
      usedIds.add(matched.id);
      return {
        ...matched,
        name: spec.name,
        category: spec.category,
      };
    }

    return {
      id: spec.id,
      code: spec.code,
      name: spec.name,
      kkm: spec.kkm,
      category: spec.category,
      teacherId: fallbackTeacher?.id || '',
      teacherName: fallbackTeacher?.name || 'Guru Pengampu',
    };
  });

  // Pertahankan seluruh mapel Muatan Lokal milik sekolah (user mengisi sendiri)
  const existingMulok = existingSubjects.filter(
    (s) => s.category === 'Muatan Lokal' && !usedIds.has(s.id)
  );
  existingMulok.forEach((s) => usedIds.add(s.id));

  // Opsional: pertahankan mapel tambahan lain di luar PAI lama ('sub-pai')
  const extraUmum = options?.preserveCustomUmum
    ? existingSubjects.filter(
        (s) =>
          !usedIds.has(s.id) &&
          s.id !== 'sub-pai' &&
          s.code.trim().toUpperCase() !== 'PAI' &&
          s.category !== 'Muatan Lokal'
      )
    : [];

  return sortSubjectsByCategoryOrder([...standardized, ...extraUmum, ...existingMulok]);
}

export interface GroupedSubjectsStructure {
  agamaSubjects: Subject[];
  umumSubjects: Subject[];
  mulokSubjects: Subject[];
  agamaNumber: number | null;
  umumStartNumber: number;
  mulokNumber: number;
}

export function groupSubjectsForRapor(subjects: Subject[]): GroupedSubjectsStructure {
  const agamaSubjects = subjects.filter((s) => s.category === 'Agama');
  const umumSubjects = subjects.filter((s) => s.category === 'Umum');
  const mulokSubjects = subjects.filter((s) => s.category === 'Muatan Lokal');

  const agamaNumber = agamaSubjects.length > 0 ? 1 : null;
  const umumStartNumber = agamaSubjects.length > 0 ? 2 : 1;
  const mulokNumber = umumStartNumber + umumSubjects.length;

  return {
    agamaSubjects,
    umumSubjects,
    mulokSubjects,
    agamaNumber,
    umumStartNumber,
    mulokNumber,
  };
}
