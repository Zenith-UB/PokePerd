// Service worker: intercepts .wasm fetch and serves assembled parts instead
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = decodeURIComponent(event.request.url);
  if (url.includes('.wasm') && !url.includes('.wasm.part')) {
    console.log('[SW] Intercepting wasm fetch:', url);
    event.respondWith(assembleAndRespond(event.request.url));
  }
});

async function assembleAndRespond(requestUrl) {
  const base = requestUrl.split('?')[0]; // strip query string if any
  const parts = [];
  for (let i = 1; i <= 2; i++) {
    const partUrl = `${base}.part${i}`;
    console.log('[SW] Fetching part:', partUrl);
    const res = await fetch(partUrl);
    if (!res.ok) throw new Error(`Failed to fetch wasm part ${i}: ${res.status}`);
    parts.push(await res.arrayBuffer());
  }
  const totalSize = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const part of parts) {
    combined.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  console.log('[SW] Wasm assembled, total bytes:', totalSize);
  return new Response(combined.buffer, {
    status: 200,
    headers: { 'Content-Type': 'application/wasm' },
  });
}