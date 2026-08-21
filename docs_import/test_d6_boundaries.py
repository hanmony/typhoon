#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""D6 虚构边界测试；不读取真实资料或敏感源文件。"""

import os
import tempfile
import unittest
from types import SimpleNamespace

from docs_import.index_docs import (
    copy_text_to_permanent,
    permanent_file_key,
    permanent_relpath,
    redact_sensitive_content,
    resolve_config,
)


class D6BoundaryTests(unittest.TestCase):
    def test_env_loads_embedding_keys_without_defaults(self):
        with tempfile.TemporaryDirectory() as td:
            env_path = os.path.join(td, ".env")
            with open(env_path, "w", encoding="utf-8") as f:
                f.write("EMBEDDING_BASE_URL=https://embedding.example/v1\n")
                f.write("EMBEDDING_API_KEY=test-key\n")
            args = SimpleNamespace(
                env=env_path,
                embedding_base_url=None,
                embedding_api_key=None,
                embedding_model=None,
                embedding_dimension=None,
                qdrant_url=None,
                qdrant_collection=None,
                database_uri=None,
            )

            config = resolve_config(args)

            self.assertEqual(config["EMBEDDING_BASE_URL"], "https://embedding.example/v1")
            self.assertEqual(config["EMBEDDING_API_KEY"], "test-key")

    def test_original_extension_maps_to_permanent_txt(self):
        self.assertEqual(permanent_relpath("folder/report.pdf"), "folder/report.txt")
        self.assertEqual(permanent_relpath(r"folder\report.docx"), "folder/report.txt")

    def test_file_path_identity_is_stable_across_worktrees(self):
        first = permanent_file_key(r"C:\worktree-a\docs_import\text_permanent\folder\report.txt")
        second = permanent_file_key("D:/worktree-b/docs_import/text_permanent/folder/report.txt")
        self.assertEqual(first, "folder/report.txt")
        self.assertEqual(first, second)
        self.assertIsNone(permanent_file_key(r"C:\uploads\report.txt"))

    def test_contact_values_are_redacted_but_duty_language_is_preserved(self):
        original = (
            "现场负责人负责处置。联系人：张三、电话：13800138000；"
            "Correspondence:test@example.com; Tel.:+86-150-5329-5106"
        )

        safe, count = redact_sensitive_content(original)

        self.assertIn("现场负责人", safe)
        self.assertIn("联系人：[已脱敏联系人]", safe)
        self.assertIn("电话：[已脱敏电话]", safe)
        self.assertIn("[已脱敏邮箱]", safe)
        self.assertNotIn("13800138000", safe)
        self.assertNotIn("test@example.com", safe)
        self.assertEqual(count, 4)

    def test_unlabelled_numeric_table_is_not_mistaken_for_a_phone(self):
        table = "5 0 28 78 66 167 102 96 536"
        self.assertEqual(redact_sensitive_content(table), (table, 0))

    def test_permanent_copy_is_sanitized_and_repeatable(self):
        with tempfile.TemporaryDirectory() as td:
            source = os.path.join(td, "source")
            target = os.path.join(td, "target")
            os.makedirs(os.path.join(source, "folder"))
            source_file = os.path.join(source, "folder", "paper.txt")
            with open(source_file, "w", encoding="utf-8") as f:
                f.write("Contact: author@example.com")

            first_mapping, first_redactions = copy_text_to_permanent(source, target)
            second_mapping, second_redactions = copy_text_to_permanent(source, target)

            with open(first_mapping["folder/paper.txt"], "r", encoding="utf-8") as f:
                content = f.read()
            self.assertEqual(content, "Contact: [已脱敏邮箱]")
            self.assertEqual(first_mapping, second_mapping)
            self.assertEqual(first_redactions, 1)
            self.assertEqual(second_redactions, 1)


if __name__ == "__main__":
    unittest.main()
