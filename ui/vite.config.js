import { defineConfig } from 'vite'
import path from 'path'

const uiDir = path.resolve(__dirname)

export default defineConfig({
  root: uiDir,
  base: './',
  resolve: {
    alias: {
      '@': path.join(uiDir, 'src'),
    },
  },
  build: {
    outDir: path.join(uiDir, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(uiDir, '..')],
    },
  },
  plugins: [
    {
      name: 'svg-packer-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/config' && req.method === 'GET') {
            const { getConfig } = await import('./src/server/generate.js')
            const config = getConfig()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(config))
            return
          }

          if (req.url === '/api/generate' && req.method === 'POST') {
            try {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                const { pack, outputDir, returnContent } = JSON.parse(body)
                const { generatePack, saveConfig, getConfig } = await import('./src/server/generate.js')

                const result = await generatePack(pack, outputDir || 'output', returnContent)

                if (result.ok) {
                  const config = getConfig()
                  const history = config.output_history || []
                  const entry = outputDir || 'output'
                  config.output_history = [entry, ...history.filter(d => d !== entry)].slice(0, 5)
                  config.last_used = pack
                  saveConfig(config)
                }

                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(result))
              })
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: err.message }))
            }
            return
          }

          next()
        })
      },
    },
  ],
})
