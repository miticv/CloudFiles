# Facebook Export Photo/Video Extractor

Extracts all photos and videos from Facebook Messenger export zip files and fixes their timestamps to match when each file was actually sent in the conversation.

## What it does

1. Reads every `.zip` file from `facebookExports/`
2. Parses the JSON metadata inside each zip to find the message send timestamp for each photo/video
3. Extracts all images and videos into `extracted/`
4. Updates timestamps:
   - **JPEG files** — writes `DateTimeOriginal` into the EXIF metadata (visible in Windows as *Date taken* in file Properties → Details)
   - **All files** — sets Windows filesystem creation and modified times to the message send time

## Folder structure

```
localScript/facebook/
├── extract_photos.py       ← the script
├── README.md               ← this file
├── facebookExports/        ← place your Facebook export zips here
│   ├── facebook-*.zip
│   └── ...
└── extracted/              ← output folder (created automatically)
    ├── adaluo_12345__photo.jpg
    └── ...
```

Output filenames are prefixed with the conversation thread folder name (`<thread>__<filename>`) to avoid collisions between identically-named files from different conversations.

## Prerequisites

### 1. Install Python

If running `python` opens the Microsoft Store or says "Python was not found", install it first:

**Option A — via winget (recommended):**
```powershell
winget install Python.Python.3.12
```
Then close and reopen your terminal.

**Option B — manual installer:**
Go to https://www.python.org/downloads/, download the latest 3.x installer, run it, and **check "Add Python to PATH"** before clicking Install.

**If `python` still opens the Store after installing**, disable the Windows alias:
Settings → Apps → Advanced app settings → App execution aliases → turn off `python.exe` and `python3.exe`.

### 2. Install the required package

```powershell
pip install piexif
```

## How to run

From the repo root:

```powershell
pip install piexif
python localScript\facebook\extract_photos.py
```

The script prints one line per extracted file showing its name and resolved send date, then a summary at the end:

```
Found 2 zip file(s):
  facebook-miticv-2026-06-23-sooDwAuQ.zip  (2.5 GB)
  facebook-miticv-2026-06-23-ulfIaOpQ.zip  (0.9 GB)

============================================================
Processing: facebook-miticv-2026-06-23-sooDwAuQ.zip
  Timestamp entries found in JSON: 3842
  [facebook-miticv-2...] [IMG] adaluo_12345__photo.jpg  →  2021-03-14 18:42
  ...

Done.
  Images extracted : 4201
  Videos extracted : 318
  Timestamped      : 4489
  No timestamp     :  30
```

## Verifying the result

After running, right-click any extracted `.jpg` → **Properties → Details** → look for **Date taken** — it should match the original Facebook send date, not the date you ran the script.

## Notes

- The script is safe to re-run; it only writes to the `extracted/` folder and never modifies the original zip files.
- If a filename already exists in `extracted/`, the script appends `_1`, `_2`, etc. rather than overwriting.
- Files with no matching JSON timestamp (e.g. stickers, profile photos) are still extracted but their timestamps are left unchanged.
- PNG, GIF, and video files do not support embedded date metadata the same way JPEGs do; for those, only the filesystem timestamps are updated.
