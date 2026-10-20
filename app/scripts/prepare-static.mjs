// Prepares the hosted demo: turns the sample library in ../demo into plain files that the app
// can load without a server (public/demo/*.json and the audio clips).
import fs from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const DEMO = path.resolve(HERE, '../../demo')
const OUT = path.resolve(HERE, '../public/demo')

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true })

const crate = JSON.parse(fs.readFileSync(path.join(DEMO, 'crate.demo.json'), 'utf8'))
const projects = crate.projects.map((p, id) => {
  const { bounce, flp: _flp, ...rest } = p
  const has = p.playable && bounce && fs.existsSync(path.join(DEMO, 'audio', bounce))
  if (has) fs.copyFileSync(path.join(DEMO, 'audio', bounce), path.join(OUT, 'audio', bounce))
  return { ...rest, id, audio: has ? `demo/audio/${encodeURIComponent(bounce)}` : null, canReveal: false }
})
fs.writeFileSync(path.join(OUT, 'crate.json'), JSON.stringify({ summary: { ...crate.summary, demo: true }, projects }))
fs.copyFileSync(path.join(DEMO, 'details.demo.json'), path.join(OUT, 'details.json'))
fs.copyFileSync(path.join(DEMO, 'loudness.demo.json'), path.join(OUT, 'loudness.json'))
console.log(`static demo: ${projects.length} projects, ${projects.filter((p) => p.audio).length} with audio -> public/demo`)
