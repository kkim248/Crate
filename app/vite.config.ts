import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Crate never writes to your music folders. This plugin reads crate.json and details.json,
// streams audio files that crate.json names, and can ask macOS to reveal a project or audio
// file in Finder (`open -R`, which only selects the file).
//
// Demo mode (CRATE_DEMO=1) serves the sample data in ../demo instead, so the app runs
// without any FL Studio files.
const DEMO = process.env.CRATE_DEMO === '1' || process.argv.includes('demo')   // `vite --mode demo` works on every OS
const ROOT = path.resolve(__dirname, '..')
const DEMO_DIR = path.join(ROOT, 'demo')
const CRATE_JSON = DEMO ? path.join(DEMO_DIR, 'crate.demo.json') : path.join(ROOT, 'crate.json')
const DETAILS_JSON = DEMO ? path.join(DEMO_DIR, 'details.demo.json') : path.join(ROOT, 'details.json')
const LOUDNESS_JSON = DEMO ? path.join(DEMO_DIR, 'loudness.demo.json') : path.join(ROOT, 'loudness.json')
const DESKTOP = process.env.CRATE_AUDIO_DIR ?? path.join(os.homedir(), 'Desktop')
const PROJECTS = process.env.CRATE_PROJECTS_DIR ?? path.join(os.homedir(), 'Documents/Image-Line/FL Studio/Projects')

type Raw = { bounce: string | null; flp: string; playable: boolean } & Record<string, unknown>

function remap(p: string | null, marker: string, root: string): string | null {
  if (!p) return null
  const m = p.match(new RegExp(`/mnt/${marker}(/.*)$`))
  const resolved = path.resolve(m ? path.join(root, m[1]) : p)
  if (!resolved.startsWith(root + path.sep)) return null
  return fs.existsSync(resolved) ? resolved : null
}

function demoAudio(p: string | null): string | null {
  if (!p) return null
  const resolved = path.resolve(DEMO_DIR, 'audio', p)
  return resolved.startsWith(path.join(DEMO_DIR, 'audio') + path.sep) && fs.existsSync(resolved) ? resolved : null
}

function loadCrate() {
  const raw = JSON.parse(fs.readFileSync(CRATE_JSON, 'utf8'))
  const audio: (string | null)[] = []
  const flp: (string | null)[] = []
  const projects = (raw.projects as Raw[]).map((p, id) => {
    audio[id] = p.playable ? (DEMO ? demoAudio(p.bounce) : remap(p.bounce, 'Desktop', DESKTOP)) : null
    flp[id] = DEMO ? null : remap(p.flp, 'Projects', PROJECTS)
    const { bounce: _b, flp: _f, ...rest } = p
    return { ...rest, id, audio: audio[id] ? `/api/audio/${id}` : null, canReveal: !!flp[id] }
  })
  return { summary: { ...raw.summary, demo: DEMO }, projects, audio, flp }
}

const MIME: Record<string, string> = {
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.flac': 'audio/flac',
  '.m4a': 'audio/mp4', '.aiff': 'audio/aiff',
}

function cratePlugin(): Plugin {
  return {
    name: 'crate-local-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''

        // Reveal in Finder: POST only, ids only, never a path from the client.
        const rv = url.match(/^\/api\/reveal\/(\d+)\/(project|audio)$/)
        if (rv) {
          if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
          const c = loadCrate()
          const file = (rv[2] === 'project' ? c.flp : c.audio)[Number(rv[1])]
          if (!file) { res.statusCode = 404; return res.end('not found') }
          if (process.platform !== 'darwin') { res.statusCode = 501; return res.end('macOS only') }
          return execFile('open', ['-R', file], (err) => { res.statusCode = err ? 500 : 204; res.end() })
        }

        if (req.method !== 'GET' && req.method !== 'HEAD' && url.startsWith('/api/')) {
          res.statusCode = 405
          return res.end('read-only')
        }
        if (url === '/api/crate') {
          const { summary, projects } = loadCrate()
          res.setHeader('content-type', 'application/json')
          return res.end(JSON.stringify({ summary, projects }))
        }
        if (url === '/api/details') {
          res.setHeader('content-type', 'application/json')
          return res.end(fs.existsSync(DETAILS_JSON) ? fs.readFileSync(DETAILS_JSON) : '{}')
        }
        if (url === '/api/loudness') {
          res.setHeader('content-type', 'application/json')
          return res.end(fs.existsSync(LOUDNESS_JSON) ? fs.readFileSync(LOUDNESS_JSON) : '{}')
        }
        const m = url.match(/^\/api\/audio\/(\d+)/)
        if (!m) return next()
        const file = loadCrate().audio[Number(m[1])]
        if (!file) { res.statusCode = 404; return res.end() }
        const { size } = fs.statSync(file)
        const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
        const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/)
        res.setHeader('accept-ranges', 'bytes')
        res.setHeader('content-type', type)
        if (range) {
          const start = range[1] ? Number(range[1]) : 0
          const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
          res.statusCode = 206
          res.setHeader('content-range', `bytes ${start}-${end}/${size}`)
          res.setHeader('content-length', end - start + 1)
          fs.createReadStream(file, { start, end }).pipe(res)
        } else {
          res.setHeader('content-length', size)
          fs.createReadStream(file).pipe(res)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: mode === 'static' ? './' : '/',   // the hosted demo lives under a sub-path
  plugins: [react(), cratePlugin()],
}))
