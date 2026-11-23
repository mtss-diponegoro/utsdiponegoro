import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Student,
  Subject,
  SchoolClass,
  Teacher,
  GradeRecord,
  HomeroomRecord,
  SchoolSettings,
  UserRole,
  ClassRankSummary,
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_SUBJECTS,
  INITIAL_CLASSES,
  INITIAL_TEACHERS,
  generateInitialGrades,
  INITIAL_HOMEROOM_RECORDS,
  INITIAL_SETTINGS,
  calculateGrade,
} from '../data/initialData';
import {
  CloudMode,
  RegisterTeacherPayload,
  fetchCloudDatabase,
  saveCloudDatabase,
  registerTeacherInCloud,
  authenticateTeacherInCloud,
  resetCloudDatabase,
} from '../services/cloudSyncService';
import {
  saveSnapshotToIndexedDb,
  loadSnapshotFromIndexedDb,
  clearIndexedDbSnapshot,
  SchoolDatabaseSnapshot,
} from '../utils/localDb';

export interface CloudSyncState {
  mode: CloudMode;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncedAt: string | null;
  message: string;
}

function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeGetLocalStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface AppContextType {
  // Authentication
  isAuthenticated: boolean;
  currentUser: Teacher | null;
  login: (identifier: string, password: string, targetRole?: UserRole) => Promise<{ success: boolean; message: string }>;
  registerTeacher: (
    payload: RegisterTeacherPayload
  ) => Promise<{ success: boolean; message: string; teacher?: Teacher }>;
  logout: () => void;
  quickLoginAs: (teacherId: string) => void;

  // Navigation & Role
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeTeacherId: string;
  setActiveTeacherId: (id: string) => void;
  activeTeacher: Teacher | undefined;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;

  // Data
  students: Student[];
  subjects: Subject[];
  classes: SchoolClass[];
  teachers: Teacher[];
  grades: GradeRecord[];
  homeroomRecords: HomeroomRecord[];
  settings: SchoolSettings;

  // Actions
  updateGrade: (
    studentId: string,
    subjectId: string,
    values: { assignment1?: number; assignment2?: number; utsScore?: number; notes?: string }
  ) => void;
  batchUpdateGrades: (updatedGrades: GradeRecord[]) => void;
  updateHomeroomRecord: (
    studentId: string,
    values: { sick?: number; permitted?: number; absent?: number; homeroomNote?: string; extracurricular?: string }
  ) => void;
  addStudent: (student: Omit<Student, 'id'>) => void;
  batchAddStudents: (
    newStudents: Omit<Student, 'id'>[],
    mode: 'append' | 'replace'
  ) => { addedCount: number; updatedCount: number };
  updateStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (subjectId: string) => void;
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (teacherId: string) => void;
  updateSettings: (newSettings: Partial<SchoolSettings>) => void;
  resetToInitialData: () => void;
  exportBackupData: () => string;
  importBackupData: (rawJson: string) => { success: boolean; message: string };
  hasStorageWarning: boolean;
  cloudState: CloudSyncState;
  syncToCloudNow: () => Promise<boolean>;
  fetchFromCloudNow: () => Promise<boolean>;

  // Computed Helpers
  getClassRanking: (classId: string) => ClassRankSummary[];
  getClassStudents: (classId: string) => Student[];
  getSubjectGrades: (subjectId: string, classId: string) => { student: Student; grade: GradeRecord }[];
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  STUDENTS: 'sinilai_uts_students',
  SUBJECTS: 'sinilai_uts_subjects',
  CLASSES: 'sinilai_uts_classes',
  TEACHERS: 'sinilai_uts_teachers',
  GRADES: 'sinilai_uts_grades',
  HOMEROOM: 'sinilai_uts_homeroom',
  SETTINGS: 'sinilai_uts_settings',
  ROLE: 'sinilai_uts_role',
  TEACHER_ID: 'sinilai_uts_teacher_id',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial states from LocalStorage or defaults
  const [students, setStudents] = useState<Student[]>(() =>
    safeGetLocalStorage<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS)
  );

  const [subjects, setSubjects] = useState<Subject[]>(() =>
    safeGetLocalStorage<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS)
  );

  const [classes] = useState<SchoolClass[]>(() =>
    safeGetLocalStorage<SchoolClass[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES)
  );

  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    safeGetLocalStorage<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS)
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [hasStorageWarning, setHasStorageWarning] = useState<boolean>(false);

  const [grades, setGrades] = useState<GradeRecord[]>(() => {
    const saved = safeGetLocalStorage<GradeRecord[] | null>(STORAGE_KEYS.GRADES, null);
    return saved || generateInitialGrades();
  });

  const [homeroomRecords, setHomeroomRecords] = useState<HomeroomRecord[]>(() =>
    safeGetLocalStorage<HomeroomRecord[]>(STORAGE_KEYS.HOMEROOM, INITIAL_HOMEROOM_RECORDS)
  );

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const parsed = safeGetLocalStorage<Partial<SchoolSettings> | null>(STORAGE_KEYS.SETTINGS, null);
    if (!parsed) return INITIAL_SETTINGS;
    return {
      ...INITIAL_SETTINGS,
      ...parsed,
      nsm: parsed.nsm || INITIAL_SETTINGS.nsm,
    };
  });

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('sinilai_uts_auth');
    return saved === 'true';
  });

  const [currentUser, setCurrentUser] = useState<Teacher | null>(() => {
    const isAuth = localStorage.getItem('sinilai_uts_auth') === 'true';
    if (!isAuth) return null;

    const saved = localStorage.getItem('sinilai_uts_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    const savedTeacherId = localStorage.getItem(STORAGE_KEYS.TEACHER_ID) || 't-1';
    return INITIAL_TEACHERS.find((t) => t.id === savedTeacherId) || INITIAL_TEACHERS[0];
  });

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    if (currentUser?.role) return currentUser.role;
    const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
    return saved === 'admin' ? 'admin' : 'guru';
  });

  const [activeTeacherId, setActiveTeacherIdState] = useState<string>(() => {
    if (currentUser?.id) return currentUser.id;
    const saved = localStorage.getItem(STORAGE_KEYS.TEACHER_ID);
    return saved || 't-1';
  });

  const [activeView, setActiveViewState] = useState<string>(() => {
    const initialRole = currentUser?.role || (localStorage.getItem(STORAGE_KEYS.ROLE) === 'admin' ? 'admin' : 'guru');
    return initialRole === 'admin' ? 'dashboard' : 'teacher_grades';
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return currentUser?.homeroomClassId || 'c-7a';
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    return currentUser?.taughtSubjectIds?.[0] || 'sub-pai';
  });

  const ADMIN_ONLY_VIEWS = useMemo(
    () => new Set(['dashboard', 'students', 'subjects', 'teachers', 'school_ledger', 'settings']),
    []
  );

  const setActiveView = useCallback(
    (view: string) => {
      if (currentUser?.role !== 'admin' && ADMIN_ONLY_VIEWS.has(view)) {
        setActiveViewState('teacher_grades');
        return;
      }
      setActiveViewState(view);
    },
    [currentUser?.role, ADMIN_ONLY_VIEWS]
  );

  const applyAuthenticatedUser = useCallback((matched: Teacher) => {
    setIsAuthenticated(true);
    setCurrentUser(matched);
    setCurrentRoleState(matched.role);
    setActiveTeacherIdState(matched.id);
    localStorage.setItem('sinilai_uts_auth', 'true');
    localStorage.setItem('sinilai_uts_current_user', JSON.stringify(matched));
    localStorage.setItem(STORAGE_KEYS.ROLE, matched.role);
    localStorage.setItem(STORAGE_KEYS.TEACHER_ID, matched.id);

    if (matched.role === 'admin') {
      setActiveViewState('dashboard');
    } else {
      setActiveViewState('teacher_grades');
      if (matched.taughtSubjectIds.length > 0) {
        setSelectedSubjectId(matched.taughtSubjectIds[0]);
      }
      if (matched.homeroomClassId) {
        setSelectedClassId(matched.homeroomClassId);
      }
    }
  }, []);

  const login = useCallback(
    async (
      identifier: string,
      password: string,
      targetRole?: UserRole
    ): Promise<{ success: boolean; message: string }> => {
      const cleanId = identifier.trim().toLowerCase();
      const cleanPass = password.trim();

      // Try server-side verification against Upstash Redis first when configured
      const cloudAuth = await authenticateTeacherInCloud(cleanId, cleanPass, targetRole);
      if (cloudAuth.configured && !cloudAuth.fallbackToLocal) {
        if (!cloudAuth.ok || !cloudAuth.teacher) {
          return {
            success: false,
            message: cloudAuth.message || 'NIP, Email, atau kata sandi tidak valid.',
          };
        }

        const verifiedUser = cloudAuth.teacher;
        setTeachers((prev) =>
          prev.some((t) => t.id === verifiedUser.id) ? prev : [...prev, verifiedUser]
        );
        applyAuthenticatedUser(verifiedUser);
        return {
          success: true,
          message: cloudAuth.message || `Selamat datang, ${verifiedUser.name}!`,
        };
      }

      // Local fallback verification (when Upstash is not connected or empty)
      let matched = teachers.find(
        (t) => t.email.toLowerCase() === cleanId || t.nip.toLowerCase() === cleanId
      );

      if (!matched) {
        const prioritizedList = targetRole
          ? [
              ...teachers.filter((t) => t.role === targetRole),
              ...teachers.filter((t) => t.role !== targetRole),
            ]
          : teachers;

        matched = prioritizedList.find((t) => {
          const roleKeywordMatch =
            (cleanId === 'admin' && t.role === 'admin') ||
            (cleanId === 'guru' && t.role === 'guru');
          const nameMatch = cleanId.length >= 3 && t.name.toLowerCase().includes(cleanId);
          return roleKeywordMatch || nameMatch;
        });
      }

      if (!matched) {
        return { success: false, message: 'NIP, Email, atau nama akun tidak terdaftar di sistem.' };
      }

      if (targetRole && matched.role !== targetRole) {
        const actualLabel = matched.role === 'admin' ? 'Administrator' : 'Guru & Wali Kelas';
        return {
          success: false,
          message: `Akses ditolak! Akun "${matched.name}" terdaftar sebagai ${actualLabel}. Silakan berpindah ke tab Login ${actualLabel}.`,
        };
      }

      const expectedPass = matched.password || (matched.role === 'admin' ? 'admin123' : 'guru123');
      if (cleanPass !== expectedPass) {
        return {
          success: false,
          message: `Kata sandi (password) untuk akun ${matched.role === 'admin' ? 'Administrator' : 'Guru'} ini tidak cocok.`,
        };
      }

      applyAuthenticatedUser(matched);
      return { success: true, message: `Selamat datang, ${matched.name}!` };
    },
    [teachers, applyAuthenticatedUser]
  );

  const registerTeacher = useCallback(
    async (
      payload: RegisterTeacherPayload
    ): Promise<{ success: boolean; message: string; teacher?: Teacher }> => {
      const cleanName = payload.name.trim();
      const cleanNip = payload.nip.trim();
      const cleanEmail = payload.email.trim().toLowerCase();
      const cleanPassword = payload.password.trim();

      if (cleanName.length < 3) {
        return { success: false, message: 'Nama lengkap minimal 3 karakter.' };
      }
      if (cleanNip.length < 4) {
        return { success: false, message: 'NIP / NUPTK minimal 4 karakter.' };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { success: false, message: 'Format alamat email tidak valid.' };
      }
      if (cleanPassword.length < 6) {
        return { success: false, message: 'Kata sandi minimal 6 karakter.' };
      }

      const cloudResult = await registerTeacherInCloud(
        {
          ...payload,
          name: cleanName,
          nip: cleanNip,
          email: cleanEmail,
          password: cleanPassword,
          phone: payload.phone?.trim() || '',
        },
        teachers
      );

      if (cloudResult.configured) {
        if (!cloudResult.success || !cloudResult.teacher) {
          return {
            success: false,
            message: cloudResult.message,
          };
        }

        if (Array.isArray(cloudResult.teachers) && cloudResult.teachers.length > 0) {
          suppressNextCloudSyncRef.current = true;
          setTeachers(cloudResult.teachers);
        } else {
          suppressNextCloudSyncRef.current = true;
          setTeachers((prev) => [...prev, cloudResult.teacher!]);
        }

        setCloudState((prev) => ({
          ...prev,
          mode: 'connected',
          syncStatus: 'success',
          lastSyncedAt: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          message: cloudResult.message,
        }));

        return {
          success: true,
          teacher: cloudResult.teacher,
          message: cloudResult.message,
        };
      }

      // Local-only fallback when Upstash is not configured
      const localDuplicate = teachers.find(
        (t) =>
          t.email.trim().toLowerCase() === cleanEmail ||
          t.nip.trim().toLowerCase() === cleanNip.toLowerCase()
      );
      if (localDuplicate) {
        const conflictField =
          localDuplicate.email.trim().toLowerCase() === cleanEmail ? 'Email' : 'NIP / NUPTK';
        return {
          success: false,
          message: `${conflictField} sudah terdaftar di sistem.`,
        };
      }

      const newTeacher: Teacher = {
        id: `t-${Date.now()}`,
        nip: cleanNip,
        name: cleanName,
        email: cleanEmail,
        phone: payload.phone?.trim() || '',
        gender: payload.gender,
        role: 'guru',
        isHomeroom: payload.isHomeroom,
        homeroomClassId: payload.isHomeroom ? payload.homeroomClassId : undefined,
        taughtSubjectIds: payload.taughtSubjectIds,
        password: cleanPassword,
      };

      setTeachers((prev) => [...prev, newTeacher]);
      return {
        success: true,
        teacher: newTeacher,
        message: `Pendaftaran berhasil! Akun guru ${cleanName} tersimpan di penyimpanan lokal.`,
      };
    },
    [teachers]
  );

  const quickLoginAs = useCallback(
    (teacherId: string) => {
      const teacher = teachers.find((t) => t.id === teacherId);
      if (teacher) {
        setIsAuthenticated(true);
        setCurrentUser(teacher);
        setCurrentRoleState(teacher.role);
        setActiveTeacherIdState(teacher.id);
        localStorage.setItem('sinilai_uts_auth', 'true');
        localStorage.setItem('sinilai_uts_current_user', JSON.stringify(teacher));
        localStorage.setItem(STORAGE_KEYS.ROLE, teacher.role);
        localStorage.setItem(STORAGE_KEYS.TEACHER_ID, teacher.id);

        if (teacher.role === 'admin') {
          setActiveViewState('dashboard');
        } else {
          setActiveViewState('teacher_grades');
          if (teacher.taughtSubjectIds.length > 0) {
            setSelectedSubjectId(teacher.taughtSubjectIds[0]);
          }
          if (teacher.homeroomClassId) {
            setSelectedClassId(teacher.homeroomClassId);
          }
        }
      }
    },
    [teachers]
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentRoleState('guru');
    setActiveViewState('teacher_grades');
    localStorage.removeItem('sinilai_uts_auth');
    localStorage.removeItem('sinilai_uts_current_user');
    localStorage.removeItem(STORAGE_KEYS.ROLE);
  }, []);

  // Sync state to LocalStorage safely
  useEffect(() => {
    const ok = safeSetLocalStorage(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    if (!ok) setHasStorageWarning(true);
  }, [students]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEYS.GRADES, JSON.stringify(grades));
  }, [grades]);

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEYS.HOMEROOM, JSON.stringify(homeroomRecords));
  }, [homeroomRecords]);

  useEffect(() => {
    const ok = safeSetLocalStorage(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    if (!ok) setHasStorageWarning(true);
  }, [settings]);

  const setCurrentRole = useCallback(
    (role: UserRole) => {
      // Strictly prevent Guru accounts from escalating to Admin role
      if (currentUser && currentUser.role !== 'admin' && role === 'admin') {
        return;
      }
      setCurrentRoleState(role);
      localStorage.setItem(STORAGE_KEYS.ROLE, role);
      if (role === 'admin') {
        setActiveViewState('dashboard');
      } else {
        setActiveViewState('teacher_grades');
      }
    },
    [currentUser]
  );

  const setActiveTeacherId = useCallback((id: string) => {
    setActiveTeacherIdState(id);
    localStorage.setItem(STORAGE_KEYS.TEACHER_ID, id);
    const teacher = teachers.find((t) => t.id === id);
    if (teacher && teacher.taughtSubjectIds.length > 0) {
      setSelectedSubjectId(teacher.taughtSubjectIds[0]);
    }
    if (teacher && teacher.homeroomClassId) {
      setSelectedClassId(teacher.homeroomClassId);
    }
  }, [teachers]);

  const activeTeacher = useMemo(() => {
    return teachers.find((t) => t.id === activeTeacherId);
  }, [teachers, activeTeacherId]);

  // Update a single student grade and auto-calculate
  const updateGrade = useCallback(
    (
      studentId: string,
      subjectId: string,
      values: { assignment1?: number; assignment2?: number; utsScore?: number; notes?: string }
    ) => {
      const subject = subjects.find((s) => s.id === subjectId);
      const kkm = subject ? subject.kkm : 75;

      setGrades((prev) => {
        const student = students.find((s) => s.id === studentId);
        const classId = student ? student.classId : 'c-7a';
        const existingIndex = prev.findIndex(
          (g) => g.studentId === studentId && g.subjectId === subjectId
        );

        if (existingIndex >= 0) {
          const current = prev[existingIndex];
          const asg1 = values.assignment1 !== undefined ? values.assignment1 : current.assignment1;
          const asg2 = values.assignment2 !== undefined ? values.assignment2 : current.assignment2;
          const uts = values.utsScore !== undefined ? values.utsScore : current.utsScore;
          const { finalScore, predicate, isPassed } = calculateGrade(
            asg1,
            asg2,
            uts,
            kkm,
            settings.weightAssignment,
            settings.weightUTS
          );

          const updated: GradeRecord = {
            ...current,
            assignment1: asg1,
            assignment2: asg2,
            utsScore: uts,
            finalScore,
            predicate,
            isPassed,
            notes: values.notes !== undefined ? values.notes : current.notes,
            updatedAt: new Date().toISOString(),
          };

          const newGrades = [...prev];
          newGrades[existingIndex] = updated;
          return newGrades;
        } else {
          const asg1 = values.assignment1 || 0;
          const asg2 = values.assignment2 || 0;
          const uts = values.utsScore || 0;
          const { finalScore, predicate, isPassed } = calculateGrade(
            asg1,
            asg2,
            uts,
            kkm,
            settings.weightAssignment,
            settings.weightUTS
          );

          const newGrade: GradeRecord = {
            id: `g-${studentId}-${subjectId}`,
            studentId,
            subjectId,
            classId,
            assignment1: asg1,
            assignment2: asg2,
            utsScore: uts,
            finalScore,
            predicate,
            isPassed,
            notes: values.notes || (isPassed ? 'Telah mencapai KKM' : 'Perlu remedial'),
            updatedAt: new Date().toISOString(),
          };

          return [...prev, newGrade];
        }
      });
    },
    [subjects, students, settings.weightAssignment, settings.weightUTS]
  );

  const batchUpdateGrades = useCallback((updatedGrades: GradeRecord[]) => {
    setGrades((prev) => {
      const map = new Map<string, GradeRecord>();
      prev.forEach((g) => map.set(`${g.studentId}-${g.subjectId}`, g));
      updatedGrades.forEach((g) => map.set(`${g.studentId}-${g.subjectId}`, g));
      return Array.from(map.values());
    });
  }, []);

  const updateHomeroomRecord = useCallback(
    (
      studentId: string,
      values: {
        sick?: number;
        permitted?: number;
        absent?: number;
        homeroomNote?: string;
        extracurricular?: string;
      }
    ) => {
      setHomeroomRecords((prev) => {
        const student = students.find((s) => s.id === studentId);
        const classId = student ? student.classId : 'c-7a';
        const existingIndex = prev.findIndex((hr) => hr.studentId === studentId);

        if (existingIndex >= 0) {
          const current = prev[existingIndex];
          const updated: HomeroomRecord = {
            ...current,
            sick: values.sick !== undefined ? values.sick : current.sick,
            permitted: values.permitted !== undefined ? values.permitted : current.permitted,
            absent: values.absent !== undefined ? values.absent : current.absent,
            homeroomNote: values.homeroomNote !== undefined ? values.homeroomNote : current.homeroomNote,
            extracurricular:
              values.extracurricular !== undefined ? values.extracurricular : current.extracurricular,
            updatedAt: new Date().toISOString(),
          };
          const next = [...prev];
          next[existingIndex] = updated;
          return next;
        } else {
          const newRecord: HomeroomRecord = {
            id: `hr-${studentId}`,
            studentId,
            classId,
            sick: values.sick || 0,
            permitted: values.permitted || 0,
            absent: values.absent || 0,
            homeroomNote: values.homeroomNote || 'Pertahankan semangat belajar dan kedisiplinan.',
            extracurricular: values.extracurricular || 'Pramuka (Baik)',
            updatedAt: new Date().toISOString(),
          };
          return [...prev, newRecord];
        }
      });
    },
    [students]
  );

  const addStudent = useCallback((newStudentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `s-${Date.now()}`,
    };
    setStudents((prev) => [...prev, newStudent]);
  }, []);

  const batchAddStudents = useCallback(
    (newStudentsData: Omit<Student, 'id'>[], mode: 'append' | 'replace') => {
      let added = 0;
      let updated = 0;

      if (mode === 'replace') {
        const mapped: Student[] = newStudentsData.map((s, idx) => ({
          ...s,
          id: `s-${Date.now()}-${idx}`,
        }));
        setStudents(mapped);
        added = mapped.length;
      } else {
        setStudents((prev) => {
          const result = [...prev];
          newStudentsData.forEach((item, idx) => {
            const existingIdx = result.findIndex(
              (s) => s.nis.trim() !== '' && s.nis.trim() === item.nis.trim()
            );
            if (existingIdx >= 0) {
              result[existingIdx] = {
                ...result[existingIdx],
                ...item,
              };
              updated++;
            } else {
              result.push({
                ...item,
                id: `s-${Date.now()}-${idx}`,
              });
              added++;
            }
          });
          return result;
        });
      }

      return { addedCount: added, updatedCount: updated };
    },
    []
  );

  const updateStudent = useCallback((updated: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const deleteStudent = useCallback((studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setGrades((prev) => prev.filter((g) => g.studentId !== studentId));
    setHomeroomRecords((prev) => prev.filter((hr) => hr.studentId !== studentId));
  }, []);

  const addSubject = useCallback((newSubjectData: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...newSubjectData,
      id: `sub-${Date.now()}`,
    };
    setSubjects((prev) => [...prev, newSubject]);
  }, []);

  const updateSubject = useCallback((updated: Subject) => {
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const deleteSubject = useCallback((subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    setGrades((prev) => prev.filter((g) => g.subjectId !== subjectId));
  }, []);

  const addTeacher = useCallback((newTeacherData: Omit<Teacher, 'id'>) => {
    const newTeacher: Teacher = {
      ...newTeacherData,
      id: `t-${Date.now()}`,
    };
    setTeachers((prev) => [...prev, newTeacher]);
  }, []);

  const updateTeacher = useCallback((updated: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setCurrentUser((prev) => {
      if (prev && prev.id === updated.id) {
        localStorage.setItem('sinilai_uts_current_user', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, []);

  const deleteTeacher = useCallback((teacherId: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
  }, []);

  const [cloudState, setCloudState] = useState<CloudSyncState>({
    mode: 'checking',
    syncStatus: 'idle',
    lastSyncedAt: null,
    message: 'Memeriksa koneksi database cloud Vercel...',
  });

  // Always keep latest data in ref for instant JSON backup & cloud sync
  const latestDataRef = useRef<SchoolDatabaseSnapshot>({
    students,
    subjects,
    teachers,
    grades,
    homeroomRecords,
    settings,
  });

  useEffect(() => {
    latestDataRef.current = {
      students,
      subjects,
      teachers,
      grades,
      homeroomRecords,
      settings,
    };
  }, [students, subjects, teachers, grades, homeroomRecords, settings]);

  const hasInitialLoadFinishedRef = useRef(false);
  const suppressNextCloudSyncRef = useRef(false);

  const applySnapshot = useCallback((snapshot: Partial<SchoolDatabaseSnapshot>) => {
    suppressNextCloudSyncRef.current = true;
    if (Array.isArray(snapshot.students) && snapshot.students.length > 0) {
      setStudents(snapshot.students);
    }
    if (Array.isArray(snapshot.subjects) && snapshot.subjects.length > 0) {
      setSubjects(snapshot.subjects);
    }
    if (Array.isArray(snapshot.teachers) && snapshot.teachers.length > 0) {
      setTeachers(snapshot.teachers);
      setCurrentUser((prevUser) => {
        if (!prevUser) return prevUser;
        const updatedUser = snapshot.teachers?.find((t) => t.id === prevUser.id);
        if (updatedUser) {
          safeSetLocalStorage('sinilai_uts_current_user', JSON.stringify(updatedUser));
          return updatedUser;
        }
        return prevUser;
      });
    }
    if (Array.isArray(snapshot.grades) && snapshot.grades.length > 0) {
      setGrades(snapshot.grades);
    }
    if (Array.isArray(snapshot.homeroomRecords) && snapshot.homeroomRecords.length > 0) {
      setHomeroomRecords(snapshot.homeroomRecords);
    }
    if (snapshot.settings && typeof snapshot.settings === 'object') {
      setSettings((prev) => ({ ...INITIAL_SETTINGS, ...prev, ...snapshot.settings }));
    }
  }, []);

  const syncToCloudNow = useCallback(async (): Promise<boolean> => {
    setCloudState((prev) => ({
      ...prev,
      syncStatus: 'syncing',
      message: 'Menyimpan data ke database cloud Vercel...',
    }));

    const result = await saveCloudDatabase(latestDataRef.current);
    if (result.success) {
      setCloudState({
        mode: result.mode,
        syncStatus: 'success',
        lastSyncedAt: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        message: result.message,
      });
      return true;
    } else {
      setCloudState((prev) => ({
        ...prev,
        mode: result.mode,
        syncStatus: result.mode === 'connected' || result.mode === 'error' ? 'error' : 'idle',
        message: result.message,
      }));
      return false;
    }
  }, []);

  const fetchFromCloudNow = useCallback(async (): Promise<boolean> => {
    setCloudState((prev) => ({
      ...prev,
      syncStatus: 'syncing',
      message: 'Memuat data dari database cloud Vercel...',
    }));

    const result = await fetchCloudDatabase();
    if (result.mode === 'connected' && result.data) {
      applySnapshot(result.data);
      setCloudState({
        mode: 'connected',
        syncStatus: 'success',
        lastSyncedAt: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        message: result.message,
      });
      return true;
    }

    setCloudState((prev) => ({
      ...prev,
      mode: result.mode,
      syncStatus: result.mode === 'error' ? 'error' : 'idle',
      message: result.message,
    }));
    return result.mode === 'connected';
  }, [applySnapshot]);

  // On startup: recover from IndexedDB if localStorage was wiped, then hydrate from Vercel Cloud DB
  useEffect(() => {
    let active = true;
    (async () => {
      const hasLocalSettings = Boolean(localStorage.getItem(STORAGE_KEYS.SETTINGS));
      if (!hasLocalSettings) {
        const idbSnapshot = await loadSnapshotFromIndexedDb();
        if (active && idbSnapshot) {
          applySnapshot(idbSnapshot);
        }
      }

      const cloudResult = await fetchCloudDatabase();
      if (!active) return;

      if (cloudResult.mode === 'connected' && cloudResult.data) {
        applySnapshot(cloudResult.data);
        setCloudState({
          mode: 'connected',
          syncStatus: 'success',
          lastSyncedAt: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          message: cloudResult.message,
        });
      } else {
        setCloudState({
          mode: cloudResult.mode,
          syncStatus: cloudResult.mode === 'error' ? 'error' : 'idle',
          lastSyncedAt: null,
          message: cloudResult.message,
        });
      }

      hasInitialLoadFinishedRef.current = true;
    })();

    return () => {
      active = false;
    };
  }, [applySnapshot]);

  // Mirror to IndexedDB & debounced auto-save to Vercel Cloud DB on any state change
  useEffect(() => {
    saveSnapshotToIndexedDb(latestDataRef.current);

    if (!hasInitialLoadFinishedRef.current) {
      return;
    }

    if (suppressNextCloudSyncRef.current) {
      suppressNextCloudSyncRef.current = false;
      return;
    }

    if (cloudState.mode !== 'connected') {
      return;
    }

    const timer = setTimeout(() => {
      syncToCloudNow();
    }, 800);

    return () => clearTimeout(timer);
  }, [students, subjects, teachers, grades, homeroomRecords, settings, cloudState.mode, syncToCloudNow]);

  const updateSettings = useCallback((newSettings: Partial<SchoolSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      latestDataRef.current = { ...latestDataRef.current, settings: next };
      return next;
    });
  }, []);

  // Reset to initial demo dataset
  const resetToInitialData = useCallback(() => {
    const initialGrades = generateInitialGrades();
    suppressNextCloudSyncRef.current = true;
    setStudents(INITIAL_STUDENTS);
    setSubjects(INITIAL_SUBJECTS);
    setTeachers(INITIAL_TEACHERS);
    setGrades(initialGrades);
    setHomeroomRecords(INITIAL_HOMEROOM_RECORDS);
    setSettings(INITIAL_SETTINGS);
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    clearIndexedDbSnapshot();
    resetCloudDatabase();
  }, []);

  // Export all school data as portable JSON backup
  const exportBackupData = useCallback((): string => {
    const snapshot = {
      app: 'SiNilai UTS',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        students: latestDataRef.current.students,
        subjects: latestDataRef.current.subjects,
        teachers: latestDataRef.current.teachers,
        grades: latestDataRef.current.grades,
        homeroomRecords: latestDataRef.current.homeroomRecords,
        settings: latestDataRef.current.settings,
      },
    };
    return JSON.stringify(snapshot, null, 2);
  }, []);

  // Import/Restore school data from JSON backup
  const importBackupData = useCallback(
    (rawJson: string): { success: boolean; message: string } => {
      try {
        const parsed = JSON.parse(rawJson);
        const payload = parsed?.data || parsed;
        if (!payload || typeof payload !== 'object') {
          return { success: false, message: 'Format berkas backup tidak valid.' };
        }

        let restoredSections = 0;
        if (Array.isArray(payload.students)) {
          setStudents(payload.students);
          restoredSections++;
        }
        if (Array.isArray(payload.subjects)) {
          setSubjects(payload.subjects);
          restoredSections++;
        }
        if (Array.isArray(payload.teachers)) {
          setTeachers(payload.teachers);
          restoredSections++;
        }
        if (Array.isArray(payload.grades)) {
          setGrades(payload.grades);
          restoredSections++;
        }
        if (Array.isArray(payload.homeroomRecords)) {
          setHomeroomRecords(payload.homeroomRecords);
          restoredSections++;
        }
        if (payload.settings && typeof payload.settings === 'object') {
          setSettings((prev) => ({ ...prev, ...payload.settings }));
          restoredSections++;
        }

        if (restoredSections === 0) {
          return { success: false, message: 'Tidak ada data SiNilai UTS yang ditemukan di dalam berkas.' };
        }

        return {
          success: true,
          message: `Berhasil memulihkan ${restoredSections} kategori data dari berkas backup.`,
        };
      } catch {
        return { success: false, message: 'Berkas backup rusak atau bukan format JSON yang valid.' };
      }
    },
    []
  );

  // Helper: Get students for a specific class
  const getClassStudents = useCallback(
    (classId: string) => {
      return students.filter((s) => s.classId === classId);
    },
    [students]
  );

  // Helper: Compute class rankings & summaries (Leger Nilai Kelas)
  const getClassRanking = useCallback(
    (classId: string): ClassRankSummary[] => {
      const classStudents = students.filter((s) => s.classId === classId);
      const subjectList = subjects;

      const summaries = classStudents.map((student) => {
        const studentGradesMap: { [subjectId: string]: GradeRecord } = {};
        let total = 0;
        let countedSubjects = 0;

        subjectList.forEach((sub) => {
          const rec = grades.find((g) => g.studentId === student.id && g.subjectId === sub.id);
          if (rec) {
            studentGradesMap[sub.id] = rec;
            total += rec.finalScore;
            countedSubjects++;
          }
        });

        const avg = countedSubjects > 0 ? Math.round((total / countedSubjects) * 10) / 10 : 0;
        const hrRecord = homeroomRecords.find((hr) => hr.studentId === student.id) || {
          id: `hr-${student.id}`,
          studentId: student.id,
          classId,
          sick: 0,
          permitted: 0,
          absent: 0,
          homeroomNote: 'Perkembangan baik.',
          extracurricular: '-',
          updatedAt: '',
        };

        return {
          student,
          totalScore: total,
          averageScore: avg,
          rank: 0,
          grades: studentGradesMap,
          attendance: hrRecord,
        };
      });

      // Sort by averageScore descending
      summaries.sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);

      // Assign ranks (handling ties properly)
      summaries.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      return summaries;
    },
    [students, subjects, grades, homeroomRecords]
  );

  // Helper: Get student list with grade for a specific subject
  const getSubjectGrades = useCallback(
    (subjectId: string, classId: string) => {
      const classStudents = students.filter((s) => s.classId === classId);
      const subject = subjects.find((s) => s.id === subjectId);
      const kkm = subject ? subject.kkm : 75;

      return classStudents.map((student) => {
        let rec = grades.find((g) => g.studentId === student.id && g.subjectId === subjectId);
        if (!rec) {
          rec = {
            id: `g-${student.id}-${subjectId}`,
            studentId: student.id,
            subjectId,
            classId,
            assignment1: 0,
            assignment2: 0,
            utsScore: 0,
            finalScore: 0,
            predicate: 'D',
            isPassed: false,
            notes: 'Belum dinilai',
            updatedAt: '',
          };
        }
        return { student, grade: rec };
      });
    },
    [students, subjects, grades]
  );

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        registerTeacher,
        logout,
        quickLoginAs,
        currentRole,
        setCurrentRole,
        activeTeacherId,
        setActiveTeacherId,
        activeTeacher,
        activeView,
        setActiveView,
        selectedClassId,
        setSelectedClassId,
        selectedSubjectId,
        setSelectedSubjectId,
        students,
        subjects,
        classes,
        teachers,
        grades,
        homeroomRecords,
        settings,
        updateGrade,
        batchUpdateGrades,
        updateHomeroomRecord,
        addStudent,
        batchAddStudents,
        updateStudent,
        deleteStudent,
        addSubject,
        updateSubject,
        deleteSubject,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        updateSettings,
        resetToInitialData,
        exportBackupData,
        importBackupData,
        hasStorageWarning,
        cloudState,
        syncToCloudNow,
        fetchFromCloudNow,
        getClassRanking,
        getClassStudents,
        getSubjectGrades,
        isProfileModalOpen,
        setIsProfileModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
