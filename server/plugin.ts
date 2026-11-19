import type { Plugin } from 'vite'
import { createApi } from './app'

// Mounts the API on the dev server and the preview server, so the web and the API share one process and one origin (ADR-009).
export function chatApi(): Plugin {
  return {
    name: 'chat-api',
    configureServer(server) {
      server.middlewares.use(createApi())
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApi())
    },
  }
}
