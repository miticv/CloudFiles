#!/usr/bin/env python3
"""
Extract photos and videos from Facebook Messenger export zips and fix their timestamps.

Source:  localScript/facebook/facebookExports/*.zip
Output:  localScript/facebook/extracted/

Each image/video is named  <thread_folder>__<original_filename>
to avoid collisions across different conversations.

JPEG files get EXIF DateTimeOriginal updated (visible in Windows Properties > Details
as "Date taken"). All files (images + videos) also get Windows filesystem creation,
access, and modified times updated to the message send time.

Requires: pip install piexif
"""

import ctypes
import ctypes.wintypes
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

try:
    import piexif
except ImportError:
    print("ERROR: piexif is not installed. Run:  pip install piexif")
    raise SystemExit(1)

SCRIPT_DIR = Path(__file__).parent
INPUT_DIR  = SCRIPT_DIR / "facebookExports"
OUTPUT_DIR = SCRIPT_DIR / "extracted"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".3gp"}


# ── Timestamp helpers ──────────────────────────────────────────────────────────

# Seconds between Windows epoch (1601-01-01) and Unix epoch (1970-01-01)
_WINDOWS_EPOCH_DIFF = 11_644_473_600

def _to_windows_filetime(unix_ts: float) -> ctypes.wintypes.FILETIME:
    win_ts = int((unix_ts + _WINDOWS_EPOCH_DIFF) * 10_000_000)
    return ctypes.wintypes.FILETIME(win_ts & 0xFFFFFFFF, win_ts >> 32)


def set_file_times_windows(path: str, unix_ts: float) -> bool:
    """Set Windows creation, access, and modification times for a file."""
    ft = _to_windows_filetime(unix_ts)
    handle = ctypes.windll.kernel32.CreateFileW(
        path,
        0x100,   # FILE_WRITE_ATTRIBUTES
        0,
        None,
        3,       # OPEN_EXISTING
        0x80,    # FILE_ATTRIBUTE_NORMAL
        None,
    )
    INVALID = ctypes.wintypes.HANDLE(-1).value
    if handle == INVALID:
        return False
    try:
        ok = ctypes.windll.kernel32.SetFileTime(
            handle,
            ctypes.byref(ft),  # creation time
            ctypes.byref(ft),  # last access time
            ctypes.byref(ft),  # last write time
        )
        return bool(ok)
    finally:
        ctypes.windll.kernel32.CloseHandle(handle)


def _exif_datetime(unix_ts: float) -> bytes:
    """Return EXIF datetime string b'YYYY:MM:DD HH:MM:SS' from a Unix timestamp."""
    dt = datetime.fromtimestamp(unix_ts, tz=timezone.utc)
    return dt.strftime("%Y:%m:%d %H:%M:%S").encode()


def update_jpeg_exif(path: str, unix_ts: float) -> None:
    """Embed send timestamp into JPEG EXIF metadata (DateTimeOriginal etc.)."""
    dt_str = _exif_datetime(unix_ts)
    try:
        try:
            exif = piexif.load(path)
        except Exception:
            exif = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}}

        exif["Exif"][piexif.ExifIFD.DateTimeOriginal]  = dt_str
        exif["Exif"][piexif.ExifIFD.DateTimeDigitized] = dt_str
        exif["0th"][piexif.ImageIFD.DateTime]           = dt_str

        exif_bytes = piexif.dump(exif)
        piexif.insert(exif_bytes, path)
    except Exception as exc:
        print(f"    [WARN] Could not write EXIF to {path}: {exc}")


# ── ZIP processing ─────────────────────────────────────────────────────────────

def build_timestamp_map(zf: zipfile.ZipFile) -> dict[str, float]:
    """
    Parse every message JSON inside the zip and return:
        { uri_string_from_json → Unix timestamp (seconds) }
    using the message's timestamp_ms as the authoritative send time.
    """
    ts_map: dict[str, float] = {}
    for name in zf.namelist():
        if not (name.endswith(".json") and "/messages/" in name):
            continue
        try:
            data = json.loads(zf.read(name))
        except Exception:
            continue

        if not isinstance(data, dict):
            continue

        for msg in data.get("messages", []):
            msg_ts = msg.get("timestamp_ms", 0) / 1000.0
            if not msg_ts:
                continue
            for photo in msg.get("photos", []):
                uri = photo.get("uri", "")
                if uri:
                    ts_map[uri] = msg_ts
            for video in msg.get("videos", []):
                uri = video.get("uri", "")
                if uri:
                    ts_map[uri] = msg_ts

    return ts_map


def _make_output_path(entry_name: str) -> Path:
    """
    Derive an output filename that includes the thread folder prefix to avoid
    collisions between identically-named files in different conversations.

    e.g.  your_facebook_activity/messages/inbox/adaluo_12345/photos/img.jpg
          → adaluo_12345__img.jpg
    """
    parts = Path(entry_name).parts
    filename = parts[-1]
    thread_prefix = parts[-3] if len(parts) >= 3 else ""
    out_name = f"{thread_prefix}__{filename}" if thread_prefix else filename

    out_path = OUTPUT_DIR / out_name
    if out_path.exists():
        stem, suffix = out_path.stem, out_path.suffix
        counter = 1
        while out_path.exists():
            out_path = OUTPUT_DIR / f"{stem}_{counter}{suffix}"
            counter += 1
    return out_path


def extract_and_stamp(zf: zipfile.ZipFile, ts_map: dict[str, float], zip_label: str) -> tuple[int, int, int]:
    """Extract images and videos; stamp with metadata timestamps. Returns (images, videos, stamped)."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    n_images = n_videos = n_stamped = 0

    for entry in zf.infolist():
        if entry.is_dir():
            continue

        ext = Path(entry.filename).suffix.lower()
        is_image = ext in IMAGE_EXTENSIONS
        is_video = ext in VIDEO_EXTENSIONS
        if not (is_image or is_video):
            continue

        out_path = _make_output_path(entry.filename)

        # Extract
        with zf.open(entry) as src, open(out_path, "wb") as dst:
            dst.write(src.read())

        if is_image:
            n_images += 1
        else:
            n_videos += 1

        # Look up timestamp
        ts = ts_map.get(entry.filename)
        if ts:
            if ext in {".jpg", ".jpeg"}:
                update_jpeg_exif(str(out_path), ts)
            set_file_times_windows(str(out_path), ts)
            n_stamped += 1
            date_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")
        else:
            date_str = "no timestamp in JSON"

        kind = "IMG" if is_image else "VID"
        print(f"  [{zip_label}] [{kind}] {out_path.name}  →  {date_str}")

    return n_images, n_videos, n_stamped


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    zip_files = sorted(INPUT_DIR.glob("*.zip"))
    if not zip_files:
        print(f"No zip files found in: {INPUT_DIR}")
        return

    print(f"Found {len(zip_files)} zip file(s):")
    for zp in zip_files:
        print(f"  {zp.name}  ({zp.stat().st_size / 1_073_741_824:.1f} GB)")
    print(f"\nOutput folder: {OUTPUT_DIR}\n")

    total_images = total_videos = total_stamped = 0

    for zip_path in zip_files:
        label = zip_path.name[:20]
        print(f"{'=' * 60}")
        print(f"Processing: {zip_path.name}")
        with zipfile.ZipFile(zip_path) as zf:
            ts_map = build_timestamp_map(zf)
            print(f"  Timestamp entries found in JSON: {len(ts_map)}")
            imgs, vids, stamped = extract_and_stamp(zf, ts_map, label)
            total_images  += imgs
            total_videos  += vids
            total_stamped += stamped
        print()

    print("=" * 60)
    print(f"Done.")
    print(f"  Images extracted : {total_images}")
    print(f"  Videos extracted : {total_videos}")
    print(f"  Timestamped      : {total_stamped}")
    print(f"  No timestamp     : {total_images + total_videos - total_stamped}")


if __name__ == "__main__":
    main()
