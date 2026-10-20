#!/usr/bin/env node
// Crate loudness scanner. Measures integrated loudness (ITU-R BS.1770 style: K-weighted, gated)
// and sample peak for each project's audio file, and writes loudness.json.
//
// Read-only. It only reads your audio files. Non-WAV files are converted to a temporary WAV in
// your system temp folder (with macOS afconvert) and that temp file is removed afterwards.
//
// Usage:  node scan_loudness.mjs
//         CRATE_DEMO=1 node scan_loudness.mjs   (sample data)

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const DEMO = process.env.CRATE_DEMO === '1'   // measure the sample audio in demo/ instead
const DESKTOP = process.env.CRATE_AUDIO_DIR ?? path.join(os.homedir(), 'Desktop')

function remap(p) {
  if (!p) return null
  if (DEMO) { const f = path.join(HERE, 'demo', 'audio', p); return fs.existsSync(f) ? f : null }
  const m = p.match(/\/mnt\/Desktop(\/.*)$/)
  const resolved = path.resolve(m ? path.join(DESKTOP, m[1]) : p)
  return resolved.startsWith(DESKTOP + path.sep) && fs.existsSync(resolved) ? resolved : null
}

// ---- BS.1770 K-weighting biquads for a given sample rate ----
function kWeight(fs_) {
  const shelf = (() => {
    const G = 3.999843853973347, f0 = 1681.974450955533, Q = 0.7071752369554196
    const A = 10 ** (G / 40), w0 = (2 * Math.PI * f0) / fs_, al = Math.sin(w0) / (2 * Q), c = Math.cos(w0), sq = Math.sqrt(A)
    const a0 = (A + 1) - (A - 1) * c + 2 * sq * al
    return {
      b: [A * ((A + 1) + (A - 1) * c + 2 * sq * al) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - 2 * sq * al) / a0],
      a: [2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - 2 * sq * al) / a0],
    }
  })()
  const hp = (() => {
    const f0 = 38.13547087602444, Q = 0.5003270373238773
    const w0 = (2 * Math.PI * f0) / fs_, al = Math.sin(w0) / (2 * Q), c = Math.cos(w0)
    const a0 = 1 + al
    return { b: [((1 + c) / 2) / a0, -(1 + c) / a0, ((1 + c) / 2) / a0], a: [(-2 * c) / a0, (1 - al) / a0] }
  })()
  return [shelf, hp]
}

function wavInfo(fd, size) {
  const head = Buffer.alloc(Math.min(size, 1 << 20))
  fs.readSync(fd, head, 0, head.length, 0)
  if (head.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not RIFF')
  let pos = 12, fmt = null
  while (pos + 8 <= head.length) {
    const id = head.toString('ascii', pos, pos + 4)
    let sz = head.readUInt32LE(pos + 4)
    if (id === 'fmt ') {
      let code = head.readUInt16LE(pos + 8)
      if (code === 0xfffe) code = head.readUInt16LE(pos + 8 + 24)
      fmt = { code, ch: head.readUInt16LE(pos + 10), rate: head.readUInt32LE(pos + 12), bits: head.readUInt16LE(pos + 22) }
    } else if (id === 'data') {
      const start = pos + 8
      if (sz === 0 || sz === 0xffffffff || start + sz > size) sz = size - start
      if (!fmt) throw new Error('no fmt before data')
      return { ...fmt, start, bytes: sz }
    }
    pos += 8 + sz + (sz % 2)
  }
  throw new Error('no data chunk')
}

function measure(file) {
  const fd = fs.openSync(file, 'r')
  try {
    const info = wavInfo(fd, fs.fstatSync(fd).size)
    const bps = info.bits / 8, frameBytes = bps * info.ch
    const filt = kWeight(info.rate)
    const nCh = Math.min(2, info.ch)
    const z = Array.from({ length: nCh }, () => [0, 0, 0, 0])   // two biquads x two states
    const sub = Math.round(info.rate * 0.1)
    let subN = 0, sumsq = new Float64Array(nCh), peak = 0
    const subPow = []
    const CH = 1 << 16
    const buf = Buffer.alloc(CH * frameBytes)
    let left = Math.floor(info.bytes / frameBytes), at = info.start
    while (left > 0) {
      const n = Math.min(left, CH)
      fs.readSync(fd, buf, 0, n * frameBytes, at)
      at += n * frameBytes; left -= n
      for (let i = 0; i < n; i++) {
        for (let c = 0; c < nCh; c++) {
          const o = i * frameBytes + c * bps
          let x
          if (info.code === 3) x = bps === 4 ? buf.readFloatLE(o) : buf.readDoubleLE(o)
          else if (bps === 2) x = buf.readInt16LE(o) / 32768
          else if (bps === 3) x = (buf.readIntLE(o, 3)) / 8388608
          else x = buf.readInt32LE(o) / 2147483648
          const ax = Math.abs(x); if (ax > peak) peak = ax
          const st = z[c]
          let y = filt[0].b[0] * x + st[0]
          st[0] = filt[0].b[1] * x - filt[0].a[0] * y + st[1]
          st[1] = filt[0].b[2] * x - filt[0].a[1] * y
          const x2 = y
          y = filt[1].b[0] * x2 + st[2]
          st[2] = filt[1].b[1] * x2 - filt[1].a[0] * y + st[3]
          st[3] = filt[1].b[2] * x2 - filt[1].a[1] * y
          sumsq[c] += y * y
        }
        if (++subN === sub) {
          let p = 0
          for (let c = 0; c < nCh; c++) { p += sumsq[c] / sub; sumsq[c] = 0 }
          subPow.push(p); subN = 0
        }
      }
    }
    // 400 ms blocks with 75% overlap = 4 sub-blocks, hopping by 1
    const blocks = []
    for (let i = 0; i + 4 <= subPow.length; i++) blocks.push((subPow[i] + subPow[i + 1] + subPow[i + 2] + subPow[i + 3]) / 4)
    const lu = (p) => -0.691 + 10 * Math.log10(p)
    const abs = blocks.filter((p) => p > 0 && lu(p) > -70)
    if (!abs.length) return { lufs: -70, peak }
    const rel = lu(abs.reduce((a, b) => a + b, 0) / abs.length) - 10
    const gated = abs.filter((p) => lu(p) > rel)
    return { lufs: lu(gated.reduce((a, b) => a + b, 0) / gated.length), peak }
  } finally { fs.closeSync(fd) }
}

const crate = JSON.parse(fs.readFileSync(DEMO ? path.join(HERE, 'demo', 'crate.demo.json') : path.join(HERE, 'crate.json'), 'utf8'))
const out = {}
let done = 0
for (const p of crate.projects) {
  if (!p.playable) continue
  const file = remap(p.bounce)
  if (!file) continue
  let wav = file, tmp = null
  try {
    if (path.extname(file).toLowerCase() !== '.wav') {
      tmp = path.join(os.tmpdir(), `crate-loud-${process.pid}-${done}.wav`)
      execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', file, tmp])
      wav = tmp
    }
    const m = measure(wav)
    out[p.folder] = { lufs: Math.round(m.lufs * 10) / 10, peak: Math.round(m.peak * 1000) / 1000 }
    console.log(`${String(m.lufs.toFixed(1)).padStart(6)} LUFS  peak ${m.peak.toFixed(2)}  ${p.name}`)
    done++
  } catch (e) {
    console.log(`skipped ${p.name}: ${e.message}`)
  } finally {
    if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp)
  }
}
const dest = DEMO ? path.join(HERE, 'demo', 'loudness.demo.json') : path.join(HERE, 'loudness.json')
fs.writeFileSync(dest, JSON.stringify(out, null, 1))
console.log(`loudness for ${done} files -> ${path.relative(HERE, dest)}`)
