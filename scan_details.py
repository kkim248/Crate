#!/usr/bin/env python3
"""
Crate detail scanner. Reads each .flp listed in crate.json and writes details.json:
instruments and VSTs, mixer effects, samples and where they came from, patterns,
arrangement length.

Read-only. Never writes, moves, renames or deletes anything in the source folders.

Usage:
    pip install pyflp
    python3 scan_details.py [-o details.json]
"""

import os, re, sys, json, warnings, collections

warnings.filterwarnings("ignore")
try:
    import pyflp
except ImportError:
    sys.exit("pyflp missing:  pip install pyflp")

HERE = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.expanduser("~")
PROJECTS = os.environ.get("CRATE_PROJECTS_DIR", os.path.join(HOME, "Documents/Image-Line/FL Studio/Projects"))


def local_flp(p):
    """crate.json may carry paths from the machine that scanned it; map them home."""
    m = re.search(r"/mnt/Projects(/.*)$", p)
    path = os.path.join(PROJECTS, m.group(1).lstrip("/")) if m else p
    path = os.path.realpath(path)
    return path if path.startswith(os.path.realpath(PROJECTS) + os.sep) and os.path.exists(path) else None


def sample_source(path):
    if not path:
        return "Unknown"
    if "splice" in path.lower():
        return "Splice"
    parent = os.path.basename(os.path.dirname(path))
    return parent or "Unknown"


def plugin_name(pl, fallback=None):
    n = getattr(pl, "name", None)
    return n or fallback or type(pl).__name__


def safe_iter(seq):
    """Yield items until PyFLP trips on an unreadable one; report whether we got them all."""
    it, got, whole = iter(seq), [], True
    while True:
        try:
            got.append(next(it))
        except StopIteration:
            break
        except Exception:
            whole = False
            break
    return got, whole


def detail(path):
    p = pyflp.parse(path)
    partial = False
    inst = collections.Counter()
    kinds = {}
    samples, other = [], 0

    chans, whole = safe_iter(p.channels)
    partial |= not whole
    for c in chans:
        try:
            t = type(c).__name__
            pl = getattr(c, "plugin", None)
            if t == "Instrument":
                name = plugin_name(pl, c.name) if pl else (c.name or "Instrument")
                inst[name] += 1
                kinds[name] = "VST" if type(pl).__name__ == "VSTPlugin" else "Native"
            elif t == "Sampler":
                sp = getattr(c, "sample_path", None)
                samples.append({"name": c.name or os.path.basename(str(sp or "")) or "Sample", "source": sample_source(str(sp) if sp else None)})
            else:
                other += 1
        except Exception:
            partial = True

    fx = collections.Counter()
    fxkind = {}
    inserts = 0
    mix, whole = safe_iter(p.mixer)
    partial |= not whole
    for ins in mix:
        used = 0
        slots, ok = safe_iter(ins)
        partial |= not ok
        for s in slots:
            try:
                pl = getattr(s, "plugin", None)
                name = plugin_name(pl, s.internal_name) if pl else s.internal_name
                if name:
                    fx[name] += 1
                    fxkind[name] = "VST" if pl is not None and type(pl).__name__ == "VSTPlugin" else "Native"
                    used += 1
            except Exception:
                partial = True
        if used:
            inserts += 1

    bars, items_n = None, 0
    try:
        end = 0
        tracks, _ = safe_iter(next(iter(p.arrangements)).tracks)
        for tr in tracks:
            items, _ = safe_iter(tr)
            for it in items:
                items_n += 1
                pos, ln = int(it.position), int(it.length)
                # FL writes sentinel values (billions of ticks) on some clips; ignore those for length
                if pos < 1_000_000 and ln < 1_000_000:
                    end = max(end, pos + ln)
        if end:
            bars = round(end / (p.ppq * 4), 1)
    except Exception:
        pass

    named = 0
    try:
        named = sum(1 for ins in mix if getattr(ins, "name", None))
    except Exception:
        pass

    try:
        patterns = len(safe_iter(p.patterns)[0])
    except Exception:
        patterns = None

    src = collections.Counter(s["source"] for s in samples)
    return {
        "readable": True,
        "partial": partial,
        "fl_version": str(p.version),
        "instruments": [{"name": n, "count": c, "kind": kinds[n]} for n, c in inst.most_common()],
        "effects": [{"name": n, "count": c, "kind": fxkind[n]} for n, c in fx.most_common()],
        "inserts_used": inserts,
        "channels_other": other,
        "samples": samples,
        "sample_sources": [{"name": n, "count": c} for n, c in src.most_common()],
        "patterns": patterns,
        "arrangement_bars": bars,
        "playlist_items": items_n,
        "inserts_named": named,
        "inserts_total": len(mix),
    }


def main():
    out = os.path.join(HERE, "details.json")
    if "-o" in sys.argv:
        out = sys.argv[sys.argv.index("-o") + 1]
    crate = json.load(open(os.path.join(HERE, "crate.json")))
    result, ok, bad = {}, 0, 0
    for proj in crate["projects"]:
        path = local_flp(proj["flp"])
        entry = {"readable": False}
        if path:
            try:
                entry = detail(path)
                entry["file_kb"] = round(os.path.getsize(path) / 1024, 1)
                ok += 1
            except Exception as e:
                entry = {"readable": False, "reason": type(e).__name__}
                bad += 1
        else:
            bad += 1
        result[proj["folder"]] = entry
    with open(out, "w") as f:
        json.dump(result, f, indent=1, ensure_ascii=False)
    print(f"details for {ok} projects, {bad} unreadable -> {out}")


if __name__ == "__main__":
    main()
