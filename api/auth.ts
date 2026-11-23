import process from 'node:process';
import { scryptSync, timingSafeEqual } from 'node:crypto';
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
    process.env.KV_REST_API_READ_ONLY_TOKEN ||
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
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed: unknown = raw ? JSON.parse(raw) : null;
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

function verifyPassword(password: string, teacher: StoredTeacher): boolean {
  if (typeof teacher.passwordHash === 'string' && teacher.passwordHash.startsWith('scrypt:')) {
    const parts = teacher.passwordHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  }

  const expectedPass = teacher.password || (teacher.role === 'admin' ? 'admin123' : 'guru123');
  return password === expectedPass;
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
  const identifier = typeof body?.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password.trim() : '';
  const targetRole = body?.targetRole === 'admin' || body?.targetRole === 'guru' ? body.targetRole : undefined;

  if (!identifier || !password) {
    return sendJson(res, 400, {
      ok: false,
      configured: true,
      message: 'Email/NIP dan kata sandi wajib diisi.',
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
        message: `Gagal membaca data akun dari Redis (${getRes.status}).`,
      });
    }

    const getJson = (await getRes.json()) as { result?: string | Record<string, unknown> | null };
    let snapshot: Record<string, unknown> | null = null;

    if (typeof getJson.result === 'string' && getJson.result.trim()) {
      snapshot = JSON.parse(getJson.result) as Record<string, unknown>;
    } else if (getJson.result && typeof getJson.result === 'object') {
      snapshot = getJson.result;
    }

    const teachers = Array.isArray(snapshot?.teachers)
      ? (snapshot.teachers as StoredTeacher[])
      : [];

    if (teachers.length === 0) {
      return sendJson(res, 200, {
        ok: true,
        configured: true,
        fallbackToLocal: true,
      });
    }

    let matched = teachers.find(
      (t) => t.email.toLowerCase() === identifier || t.nip.toLowerCase() === identifier
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
          (identifier === 'admin' && t.role === 'admin') ||
          (identifier === 'guru' && t.role === 'guru');
        const nameMatch = identifier.length >= 3 && t.name.toLowerCase().includes(identifier);
        return roleKeywordMatch || nameMatch;
      });
    }

    if (!matched) {
      return sendJson(res, 401, {
        ok: false,
        configured: true,
        message: 'NIP, Email, atau nama akun tidak terdaftar di sistem.',
      });
    }

    if (targetRole && matched.role !== targetRole) {
      const actualLabel = matched.role === 'admin' ? 'Administrator' : 'Guru & Wali Kelas';
      return sendJson(res, 403, {
        ok: false,
        configured: true,
        message: `Akses ditolak! Akun "${matched.name}" terdaftar sebagai ${actualLabel}. Silakan berpindah ke tab Login ${actualLabel}.`,
      });
    }

    if (!verifyPassword(password, matched)) {
      return sendJson(res, 401, {
        ok: false,
        configured: true,
        message: `Kata sandi (password) untuk akun ${matched.role === 'admin' ? 'Administrator' : 'Guru'} ini tidak cocok.`,
      });
    }

    const { passwordHash: _ph, password: _pw, ...safeTeacher } = matched;
    return sendJson(res, 200, {
      ok: true,
      configured: true,
      teacher: safeTeacher,
      message: `Selamat datang, ${matched.name}!`,
    });
  } catch (err: unknown) {
    console.error(
      '[api/auth] Login verification failed:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return sendJson(res, 500, {
      ok: false,
      configured: true,
      message: 'Terjadi kesalahan saat memverifikasi akun.',
    });
  }
}
