import { Equalizer, SpeakerHigh, SpeakerLow, SpeakerSimpleX } from '@phosphor-icons/react'
import { setLeveling, setVolume, toggleMute, usePlayer } from './player'

// Volume, mute and "Match levels", which evens out loud and quiet tracks.
export function VolumeControl({ dark = false, showDb = false }: { dark?: boolean; showDb?: boolean }) {
  const { volume, muted, leveling, levelDb, id } = usePlayer()
  const shown = muted ? 0 : volume
  const Icon = shown === 0 ? SpeakerSimpleX : shown < 0.5 ? SpeakerLow : SpeakerHigh
  const db = id !== null && leveling && levelDb !== 0 ? `${levelDb > 0 ? '+' : ''}${levelDb.toFixed(1)} dB` : ''
  return (
    <div className={`vol${dark ? ' dark' : ''}`}>
      <button className="vbtn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted}>
        <Icon size={20} weight="light" aria-hidden />
      </button>
      <input
        type="range" min={0} max={100} value={Math.round(shown * 100)} aria-label="Volume"
        style={{ ['--p' as string]: `${shown * 100}%` }}
        onChange={(e) => setVolume(Number(e.target.value) / 100)}
      />
      <button
        className="chip level"
        aria-pressed={leveling}
        onClick={() => setLeveling(!leveling)}
        title="Match levels evens out loud and quiet tracks, so you do not have to reach for the volume."
      >
        <Equalizer size={16} weight="bold" aria-hidden /> Match levels{showDb && db ? <span className="mono">{db}</span> : null}
      </button>
    </div>
  )
}
