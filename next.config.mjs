// Política de conteúdo (CSP) em modo "somente relatório": o navegador NÃO
// bloqueia nada, apenas registra no console o que seria bloqueado. Depois
// de confirmar que o site inteiro funciona sem violações, troque a chave
// para "Content-Security-Policy" para passar a bloquear de verdade.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://alfaengenhariama.com.br https://*.alfaengenhariama.com.br https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@next/swc-*/**',
      'node_modules/typescript/**',
      'node_modules/@swc/**',
    ],
  },
  serverExternalPackages: ['sharp', 'heic-convert', 'libheif-js'],
  experimental: {
    cpus: 1,
    workerThreads: false,
    // A Vercel recusa requisições acima de ~4,5 MB; o envio de fotos manda uma por vez.
    serverActions: { bodySizeLimit: '4.5mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    // Os nomes dos arquivos de foto são únicos (nunca mudam), então podem ficar 30 dias em cache.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'alfaengenhariama.com.br' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
