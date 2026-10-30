#!/usr/bin/env python3
"""Extract a user-supplied PDF/text into cited passages for human fact inventory work.

No medical claims are generated. PDF reading order, tables and every OCR reading
require comparison with the original. Keep the output outside the git repository.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]


def extract(path, ocr=False):
    if path.stat().st_size > 100 * 1024 * 1024:
        raise ValueError("Source exceeds the 100 MiB authoring limit; split it first")
    if path.suffix.lower() in (".txt", ".md"):
        text = path.read_text(encoding="utf-8")
        passages = {f"passage {i+1}": p.strip() for i, p in enumerate(re.split(r"\n\s*\n", text)) if p.strip()}
        if not passages:
            raise ValueError("Source text is empty")
        return passages, "UTF-8 text", []
    if path.suffix.lower() != ".pdf":
        raise ValueError("Use a PDF, .txt or .md file")
    required = ("pdfinfo", "pdftoppm", "tesseract") if ocr else ("pdfinfo", "pdftotext")
    for tool in required:
        if not shutil.which(tool):
            raise ValueError(f"Install {tool} before extracting this source")
    info = subprocess.run(["pdfinfo", str(path)], check=True, capture_output=True, text=True, timeout=60).stdout
    pages = int(re.search(r"^Pages:\s+(\d+)", info, re.M).group(1))
    if not 1 <= pages <= 500:
        raise ValueError("Split PDFs longer than 500 pages before authoring")
    passages = {}
    uncertainties = []
    with tempfile.TemporaryDirectory(prefix="sketcy-source-") as work:
        work = Path(work)
        if not ocr:
            text_path = work / "source.txt"
            subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(path), str(text_path)], check=True, timeout=180)
            if text_path.stat().st_size > 32 * 1024 * 1024:
                raise ValueError("Extracted text exceeds 32 MiB; split the source")
            extracted = text_path.read_text().split("\f")
            for index in range(pages):
                text = extracted[index].strip() if index < len(extracted) else ""
                if text:
                    passages[f"page {index+1}"] = text
                else:
                    uncertainties.append(f"page {index+1}: no readable text; inspect and use --ocr if scanned")
        else:
            for page in range(1, pages+1):
                base = work / "page"
                subprocess.run(["pdftoppm", "-f", str(page), "-l", str(page), "-scale-to", "2400", "-singlefile", "-png", str(path), str(base)], check=True, timeout=120)
                result = subprocess.run(["tesseract", str(base.with_suffix(".png")), "stdout", "-l", "eng", "--psm", "3", "tsv"], check=True, capture_output=True, text=True, timeout=120)
                lines = []
                group = None
                words = []
                for row in result.stdout.splitlines()[1:]:
                    fields = row.split("\t", 11)
                    if len(fields) != 12 or fields[0] != "5" or not fields[11].strip():
                        continue
                    key = tuple(fields[1:5])
                    if key != group and words:
                        lines.append(" ".join(words)); words = []
                    group = key
                    words.append(fields[11])
                    if float(fields[10]) < 85:
                        uncertainties.append(f"page {page}: low-confidence OCR word {fields[11]!r} ({fields[10]})")
                if words:
                    lines.append(" ".join(words))
                if lines:
                    passages[f"page {page}"] = "\n".join(lines)
                else:
                    uncertainties.append(f"page {page}: OCR found no words")
    if not passages:
        raise ValueError("No text was extracted; inspect the PDF and try OCR for scans")
    uncertainties.insert(0, "Inspect every page, table, figure label and reading order against the original. OCR confidence is not proof of correctness.")
    return passages, "Tesseract English OCR" if ocr else "Poppler layout text", uncertainties


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--user-provided", action="store_true", required=True,
                        help="Explicitly attest that the learner supplied this source")
    parser.add_argument("--ocr", action="store_true")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", args.source_id):
        parser.error("Use a stable ASCII source ID")
    output = args.output.resolve()
    if output.is_relative_to(ROOT):
        parser.error("Private source passages must stay outside the repository")
    passages, method, uncertain = extract(args.source.resolve(), args.ocr)
    data = {"source": {"id": args.source_id, "title": args.title,
                      "sha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
                      "userProvided": True, "excerpts": passages},
            "extractionMethod": method, "needsHumanReview": True,
            "uncertainties": uncertain, "facts": [], "coverageReview": None}
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, indent=2); out.write("\n")
    print(f"Extracted {len(passages)} passages. Build and check a complete fact inventory before narration.")


if __name__ == "__main__":
    main()
