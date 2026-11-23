import process from 'node:process';
import { randomBytes, scryptSync } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const DB_KEY = 'sinilai_uts:school_db:v1';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status?: (code: number) => VercelResponse;
  json?: (data: unknown) => void;
}

interface StoredTeacher {
  id: string;
  nip: string;
  name: string;
  email: string;
  role: 'admin' | 'guru';
  isHomeroom: boolean;
  homeroomClassId?: string;
  taughtSubjectIds: string[];
  password?: string;
  passwordHash?: string;
  phone?: string;
  gender?: 'L' | 'P';
}

function sendJson(res: VercelResponse, statusCode: number, payload: unknown) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    const statusFn = res.status.bind(res);
    const jsonFn = res.json.bind(res);
    statusFn(statusCode);
    jsonFn(payload);
    return;
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

function getRedisCredentials() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    '';
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    '';
  return {
    url: stripQuotes(url).replace(/\/+$/, ''),
    token: stripQuotes(token),
  };
}

function isValidHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function readRequestBody(req: VercelRequest): Promise<Record<string, unknown> | null> {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      const parsed: unknown = JSON.parse(req.body);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const maxBytes = 2 * 1024 * 1024;
    req.on('data', (chunk: Uint8Array) => {
      totalBytes += chunk.byteLength;
      if (totalBytes <= maxBytes) {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (totalBytes > maxBytes) {
        resolve(null);
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) {
          resolve(null);
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        resolve(
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null
        );
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function stripTeacherSecrets(teacher: StoredTeacher): Omit<StoredTeacher, 'passwordHash' | 'password'> {
  const { passwordHash: _ph, password: _pw, ...safe } = teacher;
  return safe;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, message: 'Method not allowed' });
  }

  const { url: redisUrl, token: redisToken } = getRedisCredentials();

  if (!redisUrl || !redisToken) {
    return sendJson(res, 200, {
      ok: true,
      configured: false,
      message: 'Database Upstash Redis / KV belum dihubungkan pada server.',
    });
  }

  if (!isValidHttpUrl(redisUrl)) {
    return sendJson(res, 500, {
      ok: false,
      configured: true,
      message: 'Konfigurasi URL database cloud tidak valid.',
    });
  }

  const body = await readRequestBody(req);
  if (!body) {
    return sendJson(res, 400, {
      ok: false,
      configured: true,
      message: 'Format data pendaftaran tidak valid.',
    });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const nip = typeof body.nip === 'string' ? body.nip.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 25) : '';
  const gender: 'L' | 'P' = body.gender === 'P' ? 'P' : 'L';
  const isHomeroom = Boolean(body.isHomeroom);
  const homeroomClassId =
    isHomeroom && typeof body.homeroomClassId === 'string' && body.homeroomClassId.trim()
      ? body.homeroomClassId.trim().slice(0, 40)
      : undefined;
  const taughtSubjectIds = Array.isArray(body.taughtSubjectIds)
    ? body.taughtSubjectIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id) => id.trim().slice(0, 50))
        .slice(0, 30)
    : [];

  if (name.length < 3 || name.length > 120) {
    return sendJson(res, 400, {
      ok: false,
      configured: true,
      message: 'Nama lengkap minimal 3 karakter dan maksimal 120 karakter.',
    });
  }

  if (nip.length < 4 || nip.length > 30) {
    return sendJson(res, 400, {
      ok: false,
      configured: true,
      message: 'NIP / NUPTK minimal 4 karakter dan maksimal 30 karakter.',
    });
  }

  if (!isValidEmail(email) || email.length > 120) {
    return sendJson(res, 400, {
      ok: false,
      configured: true,
      message: 'Format alamat email tidak valid.',
    });
  }

  if (password.length < 6 || password.length > 100) {
    return sendJson(res, 400, {
      ok: false,
      configured: true,
      message: 'Kata sandi minimal 6 karakter.',
    });
  }

  try {
    const getRes = await fetch(`${redisUrl}/get/${encodeURIComponent(DB_KEY)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
    });

    if (!getRes.ok) {
      return sendJson(res, 502, {
        ok: false,
        configured: true,
        message: `Gagal membaca data dari Redis (${getRes.status}).`,
      });
    }

    const getJson = (await getRes.json()) as { result?: string | Record<string, unknown> | null };
    let existingSnapshot: Record<string, unknown> = {};

    if (typeof getJson.result === 'string' && getJson.result.trim()) {
      existingSnapshot = JSON.parse(getJson.result) as Record<string, unknown>;
    } else if (getJson.result && typeof getJson.result === 'object') {
      existingSnapshot = getJson.result;
    }

    let currentTeachers: StoredTeacher[] = Array.isArray(existingSnapshot.teachers)
      ? (existingSnapshot.teachers as StoredTeacher[])
      : [];

    if (currentTeachers.length === 0 && Array.isArray(body.seedTeachers)) {
      currentTeachers = (body.seedTeachers as StoredTeacher[]).filter(
        (t) =>
          t &&
          typeof t === 'object' &&
          typeof t.id === 'string' &&
          typeof t.email === 'string' &&
          typeof t.name === 'string'
      );
    }

    const duplicate = currentTeachers.find(
      (t) =>
        t.email.trim().toLowerCase() === email ||
        t.nip.trim().toLowerCase() === nip.toLowerCase()
    );

    if (duplicate) {
      const conflictField =
        duplicate.email.trim().toLowerCase() === email ? 'Email' : 'NIP / NUPTK';
      return sendJson(res, 409, {
        ok: false,
        configured: true,
        message: `${conflictField} sudah terdaftar di sistem. Silakan masuk menggunakan akun yang ada.`,
      });
    }

    const newTeacher: StoredTeacher = {
      id: `t-${Date.now()}-${randomBytes(3).toString('hex')}`,
      nip,
      name,
      email,
      phone,
      gender,
      role: 'guru',
      isHomeroom,
      homeroomClassId,
      taughtSubjectIds,
      passwordHash: hashPassword(password),
    };

    const updatedTeachers = [...currentTeachers, newTeacher];
    const updatedAt = new Date().toISOString();
    const updatedSnapshot = {
      ...existingSnapshot,
      teachers: updatedTeachers,
      updatedAt,
    };

    const setRes = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', DB_KEY, JSON.stringify(updatedSnapshot)]),
    });

    if (!setRes.ok) {
      return sendJson(res, 502, {
        ok: false,
        configured: true,
        message: `Gagal menyimpan pendaftaran ke Redis (${setRes.status}).`,
      });
    }

    return sendJson(res, 201, {
      ok: true,
      configured: true,
      teacher: stripTeacherSecrets(newTeacher),
      teachers: updatedTeachers.map(stripTeacherSecrets),
      syncedAt: updatedAt,
      message: `Pendaftaran berhasil! Akun guru ${name} telah tersimpan di database cloud.`,
    });
  } catch (err: unknown) {
    console.error(
      '[api/register-teacher] Registration failed:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return sendJson(res, 500, {
      ok: false,
      configured: true,
      message: 'Terjadi kesalahan saat memproses pendaftaran guru.',
    });
  }
}
