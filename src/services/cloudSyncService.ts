import { SchoolDatabaseSnapshot } from '../utils/localDb';

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
          'Database Vercel Storage belum dihubungkan. Hubungkan Upstash Redis / KV di Vercel Dashboard.',
      };
    }

    if (!json.ok) {
      return {
        mode: 'error',
        data: null,
        message: json.message || 'Gagal mengambil data dari database cloud Vercel.',
      };
    }

    return {
      mode: 'connected',
      data: json.data || null,
      message: json.data
        ? 'Data berhasil dimuat dari database cloud Vercel.'
        : 'Terhubung ke database cloud Vercel (siap menyimpan data pertama).',
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
        message: json.message || 'Database cloud Vercel belum terpasang.',
      };
    }

    if (!json.ok) {
      return {
        success: false,
        mode: 'error',
        message: json.message || 'Gagal menyimpan ke database cloud Vercel.',
      };
    }

    return {
      success: true,
      mode: 'connected',
      syncedAt: json.syncedAt,
      message: json.message || 'Tersimpan permanen di database cloud Vercel.',
    };
  } catch {
    return {
      success: false,
      mode: 'error',
      message: 'Gagal terhubung ke API database cloud Vercel.',
    };
  }
}

export async function resetCloudDatabase(): Promise<void> {
  try {
    await fetch('/api/store', { method: 'DELETE' });
  } catch {
    // ignore if running locally without /api/store
  }
}
