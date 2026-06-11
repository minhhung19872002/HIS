#!/usr/bin/env python3
"""
Convert tai lieu (PDF/Office/txt...) trong 1 thu muc goc -> <ten>.<ext>.md (cung vi tri).

Chien luoc BEN (may RAM han che, Docling full-pipeline OOM tren PDF lon):
- PDF <= BIG_MB  -> Docling pipeline NHE (do_ocr=False, do_table_structure=False): nhanh, giu cau truc text-layer.
- PDF >  BIG_MB  -> pdftotext -layout (PDF lon co lop text -> tranh OOM Docling).
- Docling loi/rong -> fallback pdftotext.
- Van rong (PDF scan khong co text) -> ghi ro "can OCR" vao .md (khong de trong).
- Office/HTML/EPUB -> Docling. txt -> wrap thang.
BO QUA: file .md, thu muc trong SKIP_DIRS (anh trang phai sinh). KHONG ghi de .md da co. Re-runnable.
"""
import sys, json, subprocess
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("docs/requirements")
SKIP_DIRS = {"3-anh-trang"}
DOCLING_EXTS = {".pdf", ".docx", ".xlsx", ".pptx", ".html", ".htm", ".epub", ".rtf",
                ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}
TEXT_EXTS = {".txt"}
PDFTOTEXT = r"C:\Program Files\Git\mingw64\bin\pdftotext.exe"
BIG_MB = 6.0

_converter = None
def get_converter():
    global _converter
    if _converter is None:
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.base_models import InputFormat
        opts = PdfPipelineOptions(do_ocr=False, do_table_structure=False)
        _converter = DocumentConverter(
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=opts)})
        print("[init] Docling converter (light: no OCR, no table) loaded", flush=True)
    return _converter

def pdftotext_md(p: Path) -> str:
    r = subprocess.run([PDFTOTEXT, "-layout", str(p), "-"],
                       capture_output=True, timeout=240)
    return r.stdout.decode("utf-8", "replace")

def iter_targets(root: Path):
    for p in sorted(root.rglob("*")):
        if p.is_dir() or any(part in SKIP_DIRS for part in p.parts):
            continue
        ext = p.suffix.lower()
        if ext == ".md":
            continue
        if ext in DOCLING_EXTS or ext in TEXT_EXTS:
            yield p

def main():
    targets = list(iter_targets(ROOT))
    total = len(targets)
    print(f"[init] root={ROOT}  targets={total}", flush=True)
    report = {"ok": [], "skip": [], "err": []}

    for i, p in enumerate(targets, 1):
        out = p.with_name(p.name + ".md")
        rel = p.as_posix()
        if out.exists():
            report["skip"].append({"file": rel, "reason": ".md da ton tai"})
            print(f"[{i}/{total}] SKIP {p.name}", flush=True)
            continue
        ext = p.suffix.lower()
        method = "?"
        try:
            if ext in TEXT_EXTS:
                md = f"# {p.name}\n\n```\n{p.read_text(encoding='utf-8', errors='replace')}\n```\n"
                method = "txt"
            elif ext == ".pdf" and p.stat().st_size > BIG_MB * 1024 * 1024:
                md = pdftotext_md(p); method = "pdftotext(big)"
            else:
                try:
                    doc = get_converter().convert(str(p)).document
                    md = doc.export_to_markdown(); method = "docling"
                    if not md.strip():
                        raise RuntimeError("docling empty")
                except Exception as de:
                    md = pdftotext_md(p); method = f"pdftotext(fallback: {type(de).__name__})"
            if not md.strip():
                raise RuntimeError("noi dung rong (co the PDF scan khong co lop text -> can OCR)")
            out.write_text(md, encoding="utf-8")
            report["ok"].append({"file": rel, "method": method, "chars": len(md)})
            print(f"[{i}/{total}] OK [{method}] {p.name} ({len(md)}c)", flush=True)
        except Exception as e:
            reason = f"{type(e).__name__}: {e}"
            out.write_text(
                f"# Khong chuyen doi duoc\n\n- **File goc:** `{p.name}`\n- **Ly do:** {reason}\n\n"
                f"> Can xu ly lai (vd OCR ngon ngu phu hop).\n", encoding="utf-8")
            report["err"].append({"file": rel, "reason": reason})
            print(f"[{i}/{total}] ERR {p.name} -> {reason}", flush=True)

    print("\n===== BAO CAO =====", flush=True)
    print(f"Thanh cong: {len(report['ok'])}  |  Bo qua: {len(report['skip'])}  |  Loi: {len(report['err'])}", flush=True)
    for e in report["err"]:
        print(f"  LOI - {e['file']}: {e['reason']}", flush=True)
    (ROOT / "_docling_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] report -> {(ROOT / '_docling_report.json').as_posix()}", flush=True)

if __name__ == "__main__":
    main()
