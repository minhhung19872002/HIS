# Temp script - extract text from competitor PDFs (not committed)
import os, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from PyPDF2 import PdfReader

BASE = r"C:\Source\HIS\TaiLieuDoiThu"
FOLDERS = ["HDSD_EMR", "HDSD_HIS_LIS"]

for folder in FOLDERS:
    src = os.path.join(BASE, folder)
    out_dir = os.path.join(src, "_extracted")
    os.makedirs(out_dir, exist_ok=True)
    for fn in os.listdir(src):
        if not fn.lower().endswith(".pdf"):
            continue
        out_name = re.sub(r"[^\w\-]+", "_", os.path.splitext(fn)[0]).strip("_") + ".txt"
        out_path = os.path.join(out_dir, out_name)
        if os.path.exists(out_path):
            print(f"SKIP (exists): {folder}/{out_name}")
            continue
        try:
            reader = PdfReader(os.path.join(src, fn))
            parts = []
            for i, page in enumerate(reader.pages, 1):
                try:
                    txt = page.extract_text() or ""
                except Exception as e:
                    txt = f"[extract error: {e}]"
                parts.append(f"===== PAGE {i} ===== (chars={len(txt)})\n{txt}")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write("\n".join(parts))
            print(f"OK: {folder}/{fn} -> {out_name} ({len(reader.pages)} pages)")
        except Exception as e:
            print(f"FAIL: {folder}/{fn}: {e}")
print("DONE")
