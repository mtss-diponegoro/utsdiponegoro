import { SchoolDatabaseSnapshot } from '../utils/localDb';
import { Gender, Teacher, UserRole } from '../types';

export type CloudMode = 'checking' | 'connected' | 'not-configured' | 'local-only' | 'error';

export interface CloudFetchResult {
  mode: CloudMode;
  data: Partial<SchoolDatabaseSnapshot> | null;
  message: string;
}

export interface CloudSaveResult {
  success: boolean;
  mode: CloudMode;
  syncedAt?: string;
  message: string;
}

export interface RegisterTeacherPayload {
  nip: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  gender: Gender;
  isHomeroom: boolean;
  homeroomClassId?: string;
  taughtSubjectIds: string[];
}

export interface CloudRegisterTeacherResult {
  success: boolean;
  configured: boolean;
  teacher?: Teacher;
  teachers?: Teacher[];
  syncedAt?: string;
  message: string;
}

export interface CloudAuthResult {
  configured: boolean;
  fallbackToLocal?: boolean;
  ok: boolean;
  teacher?: Teacher;
  message?: string;
}

export async function fetchCloudDatabase(): Promise<CloudFetchResult> {
  try {
    const response = await fetch(`/api/store?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      return {
        mode: 'local-only',
        data: null,
        message: 'Penyimpanan lokal browser & IndexedDB aktif.',
      };
    }

    const json = (await response.json()) as {
      ok?: boolean;
      configured?: boolean;
      data?: Partial<SchoolDatabaseSnapshot> | null;
      message?: string;
    };

    if (!json.configured) {
      return {
        mode: 'not-configured',
        data: null,
        message:
          json.message ||
          'Database Upstash Redis / KV belum dihubungkan pada Environment Variables proyek ini.',
      };
    }

    if (!json.ok) {
      return {
        mode: 'error',
        data: null,
        message: json.message || 'Gagal mengambil data dari database cloud.',
      };
    }

    return {
      mode: 'connected',
      data: json.data || null,
      message: json.data
        ? 'Data berhasil dimuat dari database cloud Upstash.'
        : 'Terhubung ke database cloud Upstash (siap menyimpan data pertama).',
    };
  } catch {
    return {
      mode: 'local-only',
      data: null,
      message: 'Penyimpanan lokal browser & IndexedDB aktif.',
    };
  }
}

export async function saveCloudDatabase(snapshot: SchoolDatabaseSnapshot): Promise<CloudSaveResult> {
  try {
    const response = await fetch('/api/store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ data: snapshot }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      return {
        success: false,
        mode: 'local-only',
        message: 'Tersimpan di browser lokal.',
      };
    }

    const json = (await response.json()) as {
      ok?: boolean;
      configured?: boolean;
      syncedAt?: string;
      message?: string;
    };

    if (!json.configured) {
      return {
        success: false,
        mode: 'not-configured',
        message: json.message || 'Database cloud belum terpasang.',
      };
    }

    if (!json.ok) {
      return {
        success: false,
        mode: 'error',
        message: json.message || 'Gagal menyimpan ke database cloud.',
      };
    }

    return {
      success: true,
      mode: 'connected',
      syncedAt: json.syncedAt,
      message: json.message || 'Tersimpan permanen di database cloud Upstash.',
    };
  } catch {
    return {
      success: false,
      mode: 'error',
      message: 'Gagal terhubung ke API database cloud.',
    };
  }
}

export async function registerTeacherInCloud(
  payload: RegisterTeacherPayload,
  seedTeachers: Teacher[]
): Promise<CloudRegisterTeacherResult> {
  try {
    const response = await fetch('/api/register-teacher', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        seedTeachers,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        configured: false,
        message: 'Endpoint server tidak tersedia; menggunakan penyimpanan lokal.',
      };
    }

    const json = (await response.json()) as {
      ok?: boolean;
      configured?: boolean;
      teacher?: Teacher;
      teachers?: Teacher[];
      syncedAt?: string;
      message?: string;
    };

    if (!json.configured) {
      return {
        success: false,
        configured: false,
        message: json.message || 'Database cloud belum terpasang.',
      };
    }

    if (!response.ok || !json.ok) {
      return {
        success: false,
        configured: true,
        message: json.message || 'Gagal mendaftarkan akun guru.',
      };
    }

    return {
      success: true,
      configured: true,
      teacher: json.teacher,
      teachers: json.teachers,
      syncedAt: json.syncedAt,
      message: json.message || 'Pendaftaran akun guru berhasil disimpan ke database cloud.',
    };
  } catch {
    return {
      success: false,
      configured: false,
      message: 'Gagal terhubung ke server pendaftaran.',
    };
  }
}

export async function authenticateTeacherInCloud(
  identifier: string,
  password: string,
  targetRole?: UserRole
): Promise<CloudAuthResult> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ identifier, password, targetRole }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { configured: false, ok: false };
    }

    const json = (await response.json()) as {
      ok?: boolean;
      configured?: boolean;
      fallbackToLocal?: boolean;
      teacher?: Teacher;
      message?: string;
    };

    if (!json.configured) {
      return { configured: false, ok: false };
    }

    if (json.fallbackToLocal) {
      return { configured: true, fallbackToLocal: true, ok: false };
    }

    return {
      configured: true,
      ok: Boolean(response.ok && json.ok && json.teacher),
      teacher: json.teacher,
      message: json.message,
    };
  } catch {
    return { configured: false, ok: false };
  }
}

export async function resetCloudDatabase(): Promise<void> {
  try {
    await fetch('/api/store', { method: 'DELETE' });
  } catch {
    // ignore if running locally without /api/store
  }
}
