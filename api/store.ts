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
    url: url.trim().replace(/\/+$/, ''),
    token: token.trim(),
  };
}

async function readRequestBody(req: VercelRequest): Promise<Record<string, unknown> | null> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
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
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : null);
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url: redisUrl, token: redisToken } = getRedisCredentials();

  if (!redisUrl || !redisToken) {
    return sendJson(res, 200, {
      ok: true,
      configured: false,
      provider: null,
      data: null,
      message:
        'Database Vercel Storage (Upstash Redis / KV) belum dihubungkan pada Environment Variables proyek ini.',
    });
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${redisUrl}/get/${encodeURIComponent(DB_KEY)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${redisToken}`,
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

      return sendJson(res, 200, {
        ok: true,
        configured: true,
        provider: 'upstash-redis',
        data: parsedData,
      });
    }

    if (req.method === 'POST') {
      const body = await readRequestBody(req);
      const dataPayload = body?.data && typeof body.data === 'object' ? body.data : body;

      if (!dataPayload || typeof dataPayload !== 'object') {
        return sendJson(res, 400, {
          ok: false,
          configured: true,
          message: 'Payload data tidak valid.',
        });
      }

      const snapshot = {
        ...(dataPayload as Record<string, unknown>),
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
        message: 'Seluruh data berhasil disimpan ke database cloud Vercel.',
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    return sendJson(res, 500, {
      ok: false,
      configured: true,
      message: `Kesalahan server database: ${errorMsg}`,
    });
  }
}
