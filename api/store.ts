import process from 'node:process';
import type { IncomingMessage, ServerResponse } from 'node:http';

const DB_KEY = 'sinilai_uts:school_db:v1';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status?: (code: number) => VercelResponse;
  json?: (data: unknown) => void;
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
  const readOnlyToken = process.env.KV_REST_API_READ_ONLY_TOKEN || '';
  return {
    url: stripQuotes(url).replace(/\/+$/, ''),
    token: stripQuotes(token),
    readOnlyToken: stripQuotes(readOnlyToken),
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

function sanitizeSnapshotPayload(payload: Record<string, unknown>): Record<string, unknown> | null {
  const allowedKeys = [
    'students',
    'subjects',
    'teachers',
    'grades',
    'homeroomRecords',
    'settings',
  ] as const;

  const sanitized: Record<string, unknown> = {};
  let hasValidField = false;

  for (const key of allowedKeys) {
    if (key in payload && payload[key] !== undefined) {
      const value = payload[key];
      if (key === 'settings') {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          sanitized[key] = value;
          hasValidField = true;
        }
      } else if (Array.isArray(value)) {
        sanitized[key] = value;
        hasValidField = true;
      }
    }
  }

  return hasValidField ? sanitized : null;
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
    const maxBytes = 10 * 1024 * 1024;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url: redisUrl, token: redisToken, readOnlyToken } = getRedisCredentials();
  const effectiveGetToken = redisToken || readOnlyToken;

  if (!redisUrl || (!redisToken && (req.method !== 'GET' || !effectiveGetToken))) {
    return sendJson(res, 200, {
      ok: true,
      configured: false,
      provider: null,
      data: null,
      message:
        'Database Upstash Redis / KV belum dihubungkan pada Environment Variables / Secrets proyek ini.',
    });
  }

  if (!isValidHttpUrl(redisUrl)) {
    return sendJson(res, 500, {
      ok: false,
      configured: true,
      message: 'Konfigurasi URL database cloud tidak valid.',
    });
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${redisUrl}/get/${encodeURIComponent(DB_KEY)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${effectiveGetToken}`,
        },
      });

      if (!response.ok) {
        return sendJson(res, 502, {
          ok: false,
          configured: true,
          message: `Gagal membaca dari database Redis (${response.status}).`,
        });
      }

      const json = (await response.json()) as { result?: string | Record<string, unknown> | null };
      let parsedData: Record<string, unknown> | null = null;

      if (typeof json.result === 'string' && json.result.trim()) {
        parsedData = JSON.parse(json.result) as Record<string, unknown>;
      } else if (json.result && typeof json.result === 'object') {
        parsedData = json.result;
      }

      if (parsedData && Array.isArray(parsedData.teachers)) {
        parsedData = {
          ...parsedData,
          teachers: parsedData.teachers.map((teacher) => {
            if (teacher && typeof teacher === 'object' && !Array.isArray(teacher)) {
              const { passwordHash: _ph, ...rest } = teacher as Record<string, unknown>;
              return rest;
            }
            return teacher;
          }),
        };
      }

      return sendJson(res, 200, {
        ok: true,
        configured: true,
        provider: 'upstash-redis',
        data: parsedData,
      });
    }

    if (req.method === 'POST') {
      const body = await readRequestBody(req);
      const rawPayload =
        body?.data && typeof body.data === 'object' && !Array.isArray(body.data)
          ? (body.data as Record<string, unknown>)
          : body;

      const sanitizedPayload = rawPayload ? sanitizeSnapshotPayload(rawPayload) : null;

      if (!sanitizedPayload) {
        return sendJson(res, 400, {
          ok: false,
          configured: true,
          message: 'Payload data tidak valid.',
        });
      }

      // Preserve server-side passwordHash fields on existing teachers when syncing from client
      if (Array.isArray(sanitizedPayload.teachers)) {
        try {
          const existingRes = await fetch(`${redisUrl}/get/${encodeURIComponent(DB_KEY)}`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${redisToken}`,
            },
          });
          if (existingRes.ok) {
            const existingJson = (await existingRes.json()) as {
              result?: string | Record<string, unknown> | null;
            };
            let existingSnapshot: Record<string, unknown> | null = null;
            if (typeof existingJson.result === 'string' && existingJson.result.trim()) {
              existingSnapshot = JSON.parse(existingJson.result) as Record<string, unknown>;
            } else if (existingJson.result && typeof existingJson.result === 'object') {
              existingSnapshot = existingJson.result;
            }
            if (existingSnapshot && Array.isArray(existingSnapshot.teachers)) {
              const hashMap = new Map<string, string>();
              for (const t of existingSnapshot.teachers) {
                if (t && typeof t === 'object') {
                  const rec = t as Record<string, unknown>;
                  if (typeof rec.id === 'string' && typeof rec.passwordHash === 'string') {
                    hashMap.set(rec.id, rec.passwordHash);
                  }
                }
              }
              sanitizedPayload.teachers = sanitizedPayload.teachers.map((t) => {
                if (t && typeof t === 'object' && !Array.isArray(t)) {
                  const rec = t as Record<string, unknown>;
                  const existingHash =
                    typeof rec.id === 'string' ? hashMap.get(rec.id) : undefined;
                  if (existingHash && !rec.password) {
                    return { ...rec, passwordHash: existingHash };
                  }
                }
                return t;
              });
            }
          }
        } catch {
          // Proceed with client snapshot if pre-read fails
        }
      }

      const snapshot = {
        ...sanitizedPayload,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', DB_KEY, JSON.stringify(snapshot)]),
      });

      if (!response.ok) {
        return sendJson(res, 502, {
          ok: false,
          configured: true,
          message: `Gagal menyimpan ke database Redis (${response.status}).`,
        });
      }

      return sendJson(res, 200, {
        ok: true,
        configured: true,
        provider: 'upstash-redis',
        syncedAt: snapshot.updatedAt,
        message: 'Seluruh data berhasil disimpan ke database cloud.',
      });
    }

    if (req.method === 'DELETE') {
      const response = await fetch(redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', DB_KEY]),
      });

      if (!response.ok) {
        return sendJson(res, 502, {
          ok: false,
          configured: true,
          message: `Gagal mereset database Redis (${response.status}).`,
        });
      }

      return sendJson(res, 200, {
        ok: true,
        configured: true,
        message: 'Data cloud berhasil direset.',
      });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return sendJson(res, 405, { ok: false, message: 'Method not allowed' });
  } catch (err: unknown) {
    console.error('[api/store] Database request failed:', err instanceof Error ? err.message : 'Unknown error');
    return sendJson(res, 500, {
      ok: false,
      configured: true,
      message: 'Terjadi kesalahan saat menghubungi server database.',
    });
  }
}
