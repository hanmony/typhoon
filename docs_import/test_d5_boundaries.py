#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""D5 虚构边界测试；不读取真实资料或敏感源文件。"""
import contextlib
import io
import json
import math
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import chunk_docs as d5


class ChunkAlgorithmTests(unittest.TestCase):
    def test_presets_match_platform(self):
        self.assertEqual(d5.CATEGORY_CHUNK_PRESETS, {
            "typhoon_case": {"strategy": "paragraph", "chunkSize": 800, "overlap": 80},
            "regulation": {"strategy": "paragraph", "chunkSize": 500, "overlap": 50},
            "emergency_plan": {"strategy": "paragraph", "chunkSize": 600, "overlap": 60},
            "other": {"strategy": "sliding_window", "chunkSize": 500, "overlap": 50},
        })

    def test_find_break_point_skips_end_equal_to_length(self):
        text = "甲乙。"
        self.assertEqual(d5.find_break_point(text, len(text), 1), len(text))

    def test_find_break_point_uses_floor_semantics(self):
        self.assertEqual(math.floor(4.8), 4)
        self.assertEqual(d5.find_break_point("甲。乙丁戊", 4, 0.8), 4)

    def test_sliding_window_aligns_break_and_overlaps(self):
        text = "甲乙丙丁戊己庚。辛壬癸子丑寅。"
        chunks = d5.chunk_text(text, 8, 2)
        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(chunks[0].endswith("。"))
        self.assertTrue(chunks[1].startswith(chunks[0][-2:]))

    def test_paragraph_split_requires_two_newlines(self):
        chunks = d5.chunk_by_paragraph("甲\n乙\n\n丙", 4, 1)
        self.assertEqual(chunks, ["甲\n乙", "乙\n\n丙"])

    def test_long_paragraph_falls_back_to_sliding_window(self):
        text = "甲" * 30
        self.assertEqual(d5.chunk_by_paragraph(text, 10, 2), d5.chunk_text(text, 10, 2))

    def test_non_bmp_characters_are_preserved(self):
        text = "甲😀乙。" * 10
        chunks = d5.chunk_text(text, 9, 2)
        self.assertEqual(len(d5.NON_BMP_RE.findall(text)), 10)
        self.assertFalse(any(0xD800 <= ord(ch) <= 0xDFFF
                             for chunk in chunks for ch in chunk))
        self.assertTrue(any("😀" in chunk for chunk in chunks))


class PipelineContractTests(unittest.TestCase):
    def run_main(self, meta, in_dir, out):
        argv = ["chunk_docs.py", str(meta), str(in_dir), str(out)]
        output = io.StringIO()
        with mock.patch.object(sys, "argv", argv), contextlib.redirect_stdout(output):
            d5.main()
        return output.getvalue()

    def test_jsonl_has_unambiguous_d6_source_mapping(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            in_dir = root / "text_clean" / "folder"
            in_dir.mkdir(parents=True)
            (in_dir / "doc.txt").write_text("甲😀乙。", encoding="utf-8")
            meta = root / "extract_metadata.json"
            meta.write_text(json.dumps({"documents": [{
                "relpath": "folder/doc.pdf", "status": "ok", "category": "other"
            }]}, ensure_ascii=False), encoding="utf-8")
            out = root / "chunks.jsonl"

            stdout = self.run_main(meta, root / "text_clean", out)

            row = json.loads(out.read_text(encoding="utf-8").splitlines()[0])
            self.assertEqual(row["documentId"], "folder/doc")
            self.assertEqual(row["sourceRelpath"], "folder/doc.pdf")
            self.assertEqual(row["documentName"], "doc.pdf")
            report = json.loads((root / "chunk_report.json").read_text(encoding="utf-8"))
            self.assertEqual(report["summary"]["non_bmp_chars"], 1)
            self.assertIn("非 BMP", stdout)

    def test_duplicate_temporary_document_id_fails_loudly(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            in_dir = root / "text_clean" / "folder"
            in_dir.mkdir(parents=True)
            (in_dir / "doc.txt").write_text("正文。", encoding="utf-8")
            meta = root / "extract_metadata.json"
            meta.write_text(json.dumps({"documents": [
                {"relpath": "folder/doc.pdf", "status": "ok", "category": "other"},
                {"relpath": "folder/doc.docx", "status": "ok", "category": "other"},
            ]}, ensure_ascii=False), encoding="utf-8")
            argv = ["chunk_docs.py", str(meta), str(root / "text_clean"),
                    str(root / "chunks.jsonl")]
            output = io.StringIO()
            with mock.patch.object(sys, "argv", argv), contextlib.redirect_stdout(output):
                with self.assertRaises(SystemExit) as raised:
                    d5.main()
            self.assertEqual(raised.exception.code, 1)
            self.assertIn("documentId 冲突", output.getvalue())

    def test_sensitive_metadata_is_rejected_before_reading(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "text_clean").mkdir()
            meta = root / "extract_metadata.json"
            meta.write_text(json.dumps({"documents": [{
                "relpath": "内部/值班表.pdf", "status": "ok", "category": "other"
            }]}, ensure_ascii=False), encoding="utf-8")
            argv = ["chunk_docs.py", str(meta), str(root / "text_clean"),
                    str(root / "chunks.jsonl")]
            output = io.StringIO()
            with mock.patch.object(sys, "argv", argv), contextlib.redirect_stdout(output):
                with self.assertRaises(SystemExit) as raised:
                    d5.main()
            self.assertEqual(raised.exception.code, 1)
            self.assertIn("敏感文件", output.getvalue())


if __name__ == "__main__":
    unittest.main()
