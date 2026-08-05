import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import type { PreviewServer, ViteDevServer } from 'vite';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// Bots that scan the public interface (e.g. probing for /.git/config) routinely
// reset connections mid-request. A raw socket emitting ECONNRESET with no
// 'error' listener is re-thrown by Node as an unhandled 'error' event, which
// kills the whole dev/preview process. Attaching handlers keeps the server up.
function hardenAgainstSocketErrors() {
  const harden = (server: ViteDevServer | PreviewServer) => {
    const httpServer = server.httpServer;
    if (!httpServer) return;
    httpServer.on('connection', (socket) => {
      socket.on('error', () => socket.destroy());
    });
    httpServer.on('clientError', (_err, socket) => {
      if (!socket.destroyed) socket.destroy();
    });
  };
  return {
    name: 'harden-against-socket-errors',
    configureServer: harden,
    configurePreviewServer: harden
  };
}

export default defineConfig({
  plugins: [react(), hardenAgainstSocketErrors()],
  server: {
    port: 5173,
    // Reachable through nginx as dev.annoq.org; Vite rejects unknown Host
    // headers (DNS-rebinding guard). Leading dot allows annoq.org subdomains.
    allowedHosts: ['.annoq.org'],
    fs: {
      // Reject requests for files outside the allowed directories.
      strict: true,
      // Only serve files from this project (app source, public assets, and the
      // dependencies it imports). Nothing above the project root is reachable.
      allow: [projectRoot],
      // Belt-and-suspenders: never serve VCS metadata or secrets, even if a
      // request somehow resolves inside an allowed directory.
      deny: ['**/.git/**', '**/.env', '**/.env.*']
    }
  }
});
