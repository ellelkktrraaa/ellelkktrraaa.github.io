import { defineConfig } from 'vite'
import { addSample, flush, getCount, init } from './store.js'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  plugins: [
    {
      name: 'mnist-collector',
      async configureServer(server) {
        await init()
        server.middlewares.use(async (req, res, next) => {
          if (req.method === 'POST' && req.url === '/api/submit') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', async () => {
              try {
                const { lable, img } = JSON.parse(body)
                await addSample(lable, img)
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true }))
              } catch (err) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: false, error: err.message }))
              }
            })
            return
          }
          if (req.method === 'POST' && req.url === '/api/flush') {
            const result = await flush()
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
            return
          }
          if (req.method === 'GET' && req.url === '/api/count') {
            const count = getCount()
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ count }))
            return
          }
          next()
        })
      }
    }
  ]
})
