import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { createMiddleware } from 'hono/factory'
import { Manifest } from './utils/manifest'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const app = new Hono()

type Bindings = {
  API_KEYS: string
}

const apiKeyMiddleware = createMiddleware<{ Bindings: Bindings }>(
  async (c, next) => {
    const validKeys = c.env.API_KEYS.split(',')
    const key = c.req.query('key')

    if (!key || !validKeys.includes(key)) {
      return c.json({ error: 'Invalid API key' }, 401)
    }

    await next()
  }
)

app.use('v1/*', apiKeyMiddleware)

app.use(
  'v1/*',
  cache({
    cacheName: 'manifest-api',
    cacheControl: `max-age=${60 * 24 * 30}`, // 30 days
  })
)

app.get('v1/status', (c) => {
  return c.json({ status: 'ok' })
})

app.get(
  'v1/webmanif',
  zValidator(
    'query',
    z.object({
      name: z.string(),
      color: z.string().optional(),
      'bg-color': z.string().optional(),
      icon: z.string().optional(),
    })
  ),
  (c) => {
    const query = c.req.valid('query')

    const manifest: Manifest = {
      name: query.name,
      short_name: query.name,
      display: 'standalone',
      icons: query.icon
        ? [
            {
              src: query.icon,
              purpose: 'maskable',
            },
          ]
        : undefined,
      background_color: query['bg-color'] ?? query.color ?? undefined,
      theme_color: query.color ?? undefined,
    }

    return c.json(manifest)
  }
)

export default app
