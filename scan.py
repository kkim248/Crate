#!/usr/bin/env python3
"""
Crate scanner — reads FL Studio projects and emits crate.json.

Read-only. Never writes, moves, renames, or deletes anything in the source folders.

Usage:
    pip install pyflp --break-system-packages
    python3 scan.py [PROJECTS_DIR] [BOUNCES_DIR] [-o crate.json]

Defaults:
    PROJECTS_DIR  ~/Documents/Image-Line/FL Studio/Projects
    BOUNCES_DIR   ~/Desktop
"""

import os, re, sys, json, warnings, datetime, collections

warnings.filterwarnings("ignore")          # PyFLP is noisy on FL 25 files

try:
    import pyflp
except ImportError:
    sys.exit("pyflp missing:  pip install pyflp --break-system-packages")

# --------------------------------------------------------------------------
# config
# --------------------------------------------------------------------------
HOME          = os.path.expanduser("~")
PROJECTS_DIR  = os.path.join(HOME, "Documents/Image-Line/FL Studio/Projects")
BOUNCES_DIR   = os.path.join(HOME, "Desktop")

AUDIO_EXT     = (".wav", ".mp3", ".flac", ".m4a", ".aiff")
# third-party sample packs on the Desktop — not his bounces
PACK_MARKERS  = ("luigi", "drum kit", "soundkit", "loopkit", "samples", "pack",
                 "one shot", "oneshot", "preset")
SESSION_GAP   = 45 * 60                    # seconds; > this starts a new session

STAGES = [(0.12, "Skeleton"), (0.35, "Loop"), (0.62, "Arranging"),
          (0.85, "Mixing"), (1.01, "Review")]

# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def is_pack(path):
    low = path.lower()
    return any(m in low for m in PACK_MARKERS)


def norm(name):
    """Normalise a filename for fuzzy matching between projects and bounces."""
    s = os.path.splitext(name)[0].lower()
    s = re.sub(r"\b(final|master|mixdown|bounce|export|v\d+)\b", " ", s)
    return re.sub(r"[^a-z0-9]", "", s)


VERSION_SUFFIX = re.compile(r"[\s_\-]*(final\d*|fin|v\d+|copy|\(\d+\))$", re.I)

def family_key(name):
    """
    Collapse version variants onto one idea.

    Strips ONLY version markers. A bare trailing number is part of the name —
    'idea 4' and 'idea 7' are different ideas, not versions of each other.
    """
    k, prev = name.lower().strip(), None
    while k != prev:
        prev = k
        k = VERSION_SUFFIX.sub("", k).strip()
        k = re.sub(r"_\d+$", "", k).strip()      # trailing "_2" only
    return k or name.lower()


BPM_RE   = re.compile(r"\b(\d{2,3})\s?bpm\b", re.I)
BPM_BARE = re.compile(r"\b(\d{2,3})\b")
KEY_RE   = re.compile(r"\b([A-G][#b]?)\s?(minor|major|min|maj|m)\b")

def tempo_key_from_text(strings):
    """
    PyFLP returns tempo=None on FL 25, so recover BPM and key from the sample
    and loop filenames, which reliably carry them:
        'GLADIATOR - 142 d# wick cloud'
        '91V_NS_110_vocal_hook_..._Fm_145bpm'
    """
    bpms, keys = [], []
    for s in strings:
        found = BPM_RE.findall(s)
        if found:
            bpms += [int(b) for b in found]
        else:
            bpms += [int(b) for b in BPM_BARE.findall(s) if 60 <= int(b) <= 200]
        for root, mode in KEY_RE.findall(s):
            keys.append(root.upper() + (" maj" if mode.lower().startswith("maj") else " min"))
    bpm = collections.Counter(bpms).most_common(1)[0][0] if bpms else None
    key = collections.Counter(keys).most_common(1)[0][0] if keys else None
    return bpm, key


def sessions_from_backups(backup_dir):
    """
    FL writes autosaves while you are actively working. `time_spent` inside the
    .flp counts time the project was merely OPEN (it reports 10 days for one of
    these), so reconstruct real sessions from autosave timestamps instead.
    """
    if not os.path.isdir(backup_dir):
        return 0, 0.0, None, None
    ts = sorted(
        os.path.getmtime(os.path.join(backup_dir, f))
        for f in os.listdir(backup_dir) if f.lower().endswith(".flp")
    )
    if not ts:
        return 0, 0.0, None, None

    spans, start, last = [], ts[0], ts[0]
    for t in ts[1:]:
        if t - last > SESSION_GAP:
            spans.append((start, last))
            start = t
        last = t
    spans.append((start, last))

    active = sum(b - a for a, b in spans) / 3600.0
    return len(spans), active, ts[0], ts[-1]


def stage_for(ratio):
    for cutoff, name in STAGES:
        if ratio < cutoff:
            return name
    return "Review"


# --------------------------------------------------------------------------
# index bounces
# --------------------------------------------------------------------------
def index_bounces(root):
    idx = collections.defaultdict(list)
    for dirpath, _dirs, files in os.walk(root):
        if is_pack(dirpath):
            continue
        for f in files:
            if f.lower().endswith(AUDIO_EXT) and not is_pack(f):
                idx[norm(f)].append(os.path.join(dirpath, f))
    return idx


def find_bounce(project_name, idx):
    n = norm(project_name)
    if n in idx:
        return idx[n][0]
    for k, paths in idx.items():
        if k and abs(len(k) - len(n)) < 8 and (n in k or k in n):
            return paths[0]
    return None


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    projects_dir = args[0] if len(args) > 0 else PROJECTS_DIR
    bounces_dir  = args[1] if len(args) > 1 else BOUNCES_DIR
    out_path     = "crate.json"
    if "-o" in sys.argv:
        out_path = sys.argv[sys.argv.index("-o") + 1]

    if not os.path.isdir(projects_dir):
        sys.exit(f"projects dir not found: {projects_dir}")

    bounce_idx = index_bounces(bounces_dir) if os.path.isdir(bounces_dir) else {}

    projects, failed = [], 0
    folders = sorted(
        d for d in os.listdir(projects_dir)
        if os.path.isdir(os.path.join(projects_dir, d))
        and d not in ("Backup", "Templates")
    )

    for folder in folders:
        pdir = os.path.join(projects_dir, folder)
        flps = [f for f in os.listdir(pdir) if f.lower().endswith(".flp")]
        if not flps:
            continue
        flps.sort(key=lambda f: os.path.getmtime(os.path.join(pdir, f)), reverse=True)
        flp = os.path.join(pdir, flps[0])

        rec = {
            "name":        os.path.splitext(flps[0])[0],
            "folder":      folder,
            "flp":         flp,
            "family":      family_key(os.path.splitext(flps[0])[0]),
            "variants":    len(flps),
            "parsed":      False,
            "channels":    None,
            "patterns":    None,
            "created_on":  None,
            "bpm":         None,
            "key":         None,
            "samples":     [],
        }

        # ---- filesystem facts (always available, even if parsing fails) ----
        rec["modified"] = datetime.datetime.fromtimestamp(
            os.path.getmtime(flp)).isoformat()
        rec["size_kb"] = round(os.path.getsize(flp) / 1024, 1)

        # ---- sessions ----
        n_sess, active_h, first_t, last_t = sessions_from_backups(
            os.path.join(pdir, "Backup"))
        rec["sessions"]      = n_sess
        rec["active_hours"]  = round(active_h, 2)
        rec["first_session"] = datetime.datetime.fromtimestamp(first_t).isoformat() if first_t else None
        rec["last_session"]  = datetime.datetime.fromtimestamp(last_t).isoformat() if last_t else None

        # ---- sample names (for BPM/key recovery and genre inference) ----
        audio_dir = os.path.join(pdir, "Audio")
        if os.path.isdir(audio_dir):
            rec["samples"] = [f for f in os.listdir(audio_dir)
                              if f.lower().endswith(AUDIO_EXT)][:200]

        # ---- parse (gracefully) ----
        def safe(fn, default=None):
            """Every PyFLP accessor can throw independently on FL 25 files."""
            try:
                return fn()
            except Exception:
                return default

        p = None
        try:
            p = pyflp.parse(flp)
            rec["parsed"]     = True
            rec["channels"]   = safe(lambda: len(p.channels), 0)
            rec["patterns"]   = safe(lambda: len(p.patterns), 0)
            rec["created_on"] = safe(lambda: p.created_on.isoformat())
            rec["fl_version"] = safe(lambda: str(p.version))
        except Exception as e:
            failed += 1
            rec["parse_error"] = type(e).__name__

        # Channel iteration throws independently of parse() on FL 25 files, so
        # it gets its own guard — otherwise a project counts as both parsed and
        # failed, and silently loses the sample names genre inference needs.
        if rec["parsed"]:
            try:
                for ch in (p.channels or []):
                    nm = getattr(ch, "name", None)
                    if nm:
                        rec["samples"].append(str(nm))
                    sp = getattr(ch, "sample_path", None)
                    if sp:
                        rec["samples"].append(os.path.basename(str(sp)))
            except Exception as e:
                rec["channel_error"] = type(e).__name__

        rec["samples"] = list(dict.fromkeys(rec["samples"]))[:200]

        # ---- tempo / key from filenames (PyFLP tempo is None on FL 25) ----
        rec["bpm"], rec["key"] = tempo_key_from_text(rec["samples"] + [rec["name"]])

        # ---- bounce ----
        bounce = find_bounce(rec["name"], bounce_idx) or find_bounce(folder, bounce_idx)
        rec["bounce"]   = bounce
        rec["playable"] = bool(bounce)

        # ---- stage (rough: pattern density vs. the busiest project) ----
        rec["_density"] = (rec["patterns"] or 0) + (rec["channels"] or 0) * 0.25

        projects.append(rec)

    # stage is relative to the crate, so compute after the sweep
    peak = max((p["_density"] for p in projects), default=1) or 1
    for p in projects:
        p["stage"] = stage_for(p.pop("_density") / peak)

    fams = {p["family"] for p in projects}
    summary = {
        "generated":      datetime.datetime.now().isoformat(),
        "projects":       len(projects),
        "ideas":          len(fams),
        "playable":       sum(1 for p in projects if p["playable"]),
        "parsed":         sum(1 for p in projects if p["parsed"]),
        "parse_failed":   failed,
        "active_hours":   round(sum(p["active_hours"] for p in projects), 1),
        "total_sessions": sum(p["sessions"] for p in projects),
        "unheard_hours":  round(sum(p["active_hours"] for p in projects
                                    if not p["playable"]), 1),
    }

    with open(out_path, "w") as fh:
        json.dump({"summary": summary, "projects": projects}, fh, indent=2)

    print(json.dumps(summary, indent=2))
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main()
