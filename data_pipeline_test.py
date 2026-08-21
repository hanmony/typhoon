# -*- coding: utf-8 -*-
import unittest

import pandas as pd

import clean_data
import import_cases_to_mongo as mongo_import


class CleanDataTests(unittest.TestCase):
    def setUp(self):
        clean_data.warnings_log.clear()
        clean_data._unmapped_columns.clear()

    def test_unheaded_note_does_not_become_empty_action(self):
        headers = ["开始时间", ""]
        frame = pd.DataFrame([headers, ["", "（在车站图标显示）"]])
        self.assertEqual(clean_data.rows_as_dicts(frame, 0, headers), [])

    def test_media_text_in_date_column_moves_to_content(self):
        text = "台风影响期间，调度指挥中心安排电视直播连线1次，官方微博发布相关信息10条"
        headers = ["日期", "发布方式", "内容", "阅读量", "评论数"]
        frame = pd.DataFrame([headers, [text, "", "", "", ""]])
        rows = clean_data.parse_action_sheet(frame, "媒体宣传", "2022")
        self.assertEqual(rows[0]["content"], text)
        self.assertEqual(rows[0]["start_time"], "")

    def test_reverse_end_time_becomes_unknown(self):
        headers = ["开始时间", "结束时间"]
        frame = pd.DataFrame([headers, ["2024-09-18 14:39:00", "2022-09-14 07:00:00"]])
        rows = clean_data.parse_action_sheet(frame, "天气预警发布", "2024")
        self.assertEqual(rows[0]["end_time"], "")
        self.assertTrue(any(w["category"] == "time_order" for w in clean_data.warnings_log))

    def test_authoritative_metadata_is_added_or_corrected(self):
        case = {
            "case_id": "202414普拉桑", "year": "2024", "code": "202414",
            "overview": {"英文名称": {"value": "Bebinca"}},
        }
        clean_data.ensure_authoritative_overview(case)
        self.assertEqual(case["overview"]["台风编号"]["value"], "202414")
        self.assertEqual(case["overview"]["英文名称"]["value"], "Pulasan")


class MongoImportTests(unittest.TestCase):
    def test_uri_credentials_are_masked(self):
        masked = mongo_import.mask_mongo_uri(
            "mongodb://admin:secret@127.0.0.1:27017/schooltyphoon?authSource=admin")
        self.assertNotIn("admin:secret", masked)
        self.assertIn("***:***@", masked)


if __name__ == "__main__":
    unittest.main()
