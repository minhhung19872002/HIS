export const config = {
  runtime: 'edge',
};

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
];

function normalizeBaseUrl(value) {
  return value ? value.replace(/\/+$/, '') : '';
}

function resolveBackendBaseUrl() {
  const configured =
    process.env.HIS_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    '';

  if (!configured) {
    return '';
  }

  const normalized = normalizeBaseUrl(configured);
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

export default async function handler(request) {
  const backendBaseUrl = resolveBackendBaseUrl();

  if (!backendBaseUrl) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Vercel proxy is missing HIS_BACKEND_URL',
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      }
    );
  }

  const incomingUrl = new URL(request.url);
  const upstreamPath = incomingUrl.pathname.replace(/^\/api(?:\/|$)/, '');
  const upstreamUrl = `${backendBaseUrl}/${upstreamPath}${incomingUrl.search}`;
  const upstreamHeaders = new Headers(request.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    upstreamHeaders.delete(header);
  }

  upstreamHeaders.set('x-forwarded-host', incomingUrl.host);
  upstreamHeaders.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: upstreamHeaders,
    body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : request.body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    responseHeaders.delete(header);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
