import type { IncomingMessage, ServerResponse } from 'node:http'

export type Next = (error?: unknown) => void
export type ApiHandler = (req: IncomingMessage, res: ServerResponse, next: Next) => void

// Step 02 skeleton. Step 05 fills in the request pipeline (DESIGN 6.1).
export function createApi(): ApiHandler {
  return (req, res, next) => {
    const path = (req.url ?? '/').split('?')[0] ?? '/'
    if (path !== '/api' && !path.startsWith('/api/')) {
      next()
      return
    }
    if (req.method === 'GET' && path === '/api/health') {
      sendJson(res, 200, { status: 'ok' })
      return
    }
    sendJson(res, 404, { error: { code: 'not_found', message: `No route for ${req.method ?? 'GET'} ${path}` } })
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(text))
  res.end(text)
}
