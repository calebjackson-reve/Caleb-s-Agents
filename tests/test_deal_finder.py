import csv, os, sys, tempfile, unittest
import contextlib
import io
from pathlib import Path
from datetime import date
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools", "deal_finder"))
import deal_finder as df

HEADER = ["Address", "Subdivision", "Zip", "Status", "List Price", "Sold Price", "SqFt", "Close Date"]

def write(rows):
    f = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, newline="")
    w = csv.writer(f); w.writerow(HEADER); w.writerows(rows); f.close()
    return f.name

class DealFinderTest(unittest.TestCase):
    today = date(2026, 10, 12)

    def test_flags_underpriced_active(self):
        rows = [[f"{i} A", "Oak", "70791", "Sold", "", 200000, 1000, "2026-08-01"] for i in range(4)]
        rows += [["Cheap", "Oak", "70791", "Active", 160000, "", 1000, ""],
                 ["Pricey", "Oak", "70791", "Active", 240000, "", 1000, ""]]
        res, _ = df.analyze(df.load(write(rows)), today=self.today)
        self.assertEqual(res[0]["address"], "Cheap")
        self.assertEqual(res[0]["discount_pct"], 20.0)
        self.assertEqual(res[0]["gap_dollars"], 40000)
        self.assertEqual(res[1]["discount_pct"], -20.0)

    def test_old_sales_excluded_and_zip_fallback(self):
        rows = [[f"{i} Old", "Oak", "70791", "Sold", "", 500000, 1000, "2024-01-01"] for i in range(4)]
        rows += [[f"{i} Z", "Elm", "70791", "Sold", "", 150000, 1000, "2026-09-01"] for i in range(3)]
        rows += [["T", "Oak", "70791", "Active", 140000, "", 1000, ""]]
        res, n = df.analyze(df.load(write(rows)), today=self.today)
        self.assertEqual(n, 3)
        self.assertEqual(res[0]["comp_basis"], "zip")
        self.assertEqual(res[0]["comp_median_ppsf"], 150.0)

    def test_too_few_comps_skipped(self):
        rows = [["S", "Oak", "", "Sold", "", 200000, 1000, "2026-09-01"],
                ["T", "Oak", "", "Active", 100000, "", 1000, ""]]
        res, _ = df.analyze(df.load(write(rows)), today=self.today)
        self.assertEqual(res, [])

    def test_sold_asking_price_never_becomes_sale_evidence(self):
        rows = [[f"{i} S", "Oak", "70791", "Sold", 900000, "", 1000, "2026-09-01"] for i in range(3)]
        rows += [["T", "Oak", "70791", "Active", 100000, "", 1000, ""]]
        loaded = df.load(write(rows))
        self.assertIsNone(df.ppsf(loaded[0]))
        self.assertEqual(df.analyze(loaded, today=self.today), ([], 0))
        self.assertEqual(df.neighborhood_summary(loaded, today=self.today), [])

    def test_invalid_or_out_of_window_sales_are_excluded_everywhere(self):
        rows = [[f"{i} S", "Oak", "70791", "Sold", "", 200000, 1000, d]
                for i, d in enumerate(["", "bad-date", "2026-10-13", "2024-01-01"])]
        loaded = df.load(write(rows))
        self.assertEqual(df.analyze(loaded, today=self.today), ([], 0))
        self.assertEqual(df.neighborhood_summary(loaded, today=self.today), [])

    def test_nonfinite_numbers_are_missing_evidence(self):
        for value in ["inf", "Infinity", "NaN", "-inf", "0", "-10", "oops"]:
            with self.subTest(value=value):
                self.assertIsNone(df.to_num(value))

    def test_missing_fields_are_excluded_with_visible_reasons(self):
        rows = [["", "Oak", "70791", "Sold", "", 200000, 1000, "2026-09-01"],
                ["No size", "Oak", "70791", "Sold", "", 200000, "", "2026-09-01"],
                ["No area", "", "", "Sold", "", 200000, 1000, "2026-09-01"],
                ["No ask", "Oak", "70791", "Active", "", "", 1000, ""],
                ["Pending", "Oak", "70791", "Active Under Contract", 150000, "", 1000, ""]]
        path = write(rows)
        self.assertEqual(df.analyze(df.load(path), today=self.today), ([], 0))
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            df.main([path, "--today", self.today.isoformat()])
        for reason in ["missing_address", "missing_location", "missing_or_invalid_sqft",
                       "missing_or_invalid_list_price", "unsupported_status", "INSUFFICIENT_SOLD_EVIDENCE"]:
            self.assertIn(reason, output.getvalue())

    def test_explicit_sale_price_wins_and_valid_window_edges_count(self):
        rows = [[f"{i} S", "Oak", "70791", "Recently_Sold", 900000, 200000, 1000, d]
                for i, d in enumerate(["2026-04-13", "2026-10-12", "2026-09-01"])]
        rows += [["T", "Oak", "70791", "For_Sale", 160000, "", 1000, ""]]
        loaded = df.load(write(rows))
        result, count = df.analyze(loaded, today=self.today)
        self.assertEqual(count, 3)
        self.assertEqual(result[0]["comp_median_ppsf"], 200)
        self.assertEqual(result[0]["discount_pct"], 20)
        self.assertEqual(df.neighborhood_summary(loaded, today=self.today)[0]["median_sold"], 200000)

    def test_invalid_run_options_fail_instead_of_using_defaults(self):
        for options in [["--today", "oops"], ["--months", "nan"], ["--months", "0"],
                        ["--size-band", "inf"], ["--top", "0"]]:
            with self.subTest(options=options), contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    df.main(["unused.csv"] + options)
                self.assertEqual(error.exception.code, 2)

    def test_empty_results_replace_previous_output(self):
        path = write([["S", "Oak", "70791", "Sold", 900000, "", 1000, "2026-09-01"]])
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "deals.csv"
            output.write_text("stale deal")
            with contextlib.redirect_stdout(io.StringIO()):
                df.main([path, "--today", self.today.isoformat(), "--out", str(output)])
            self.assertNotIn("stale deal", output.read_text())
            with output.open() as handle:
                self.assertEqual(list(csv.DictReader(handle)), [])

    def test_messy_money_and_alias_headers(self):
        self.assertEqual(df.to_num("$1,250,000"), 1250000)
        self.assertEqual(df.map_columns(["Close Price", "LivingArea", "MlsStatus", "StreetAddress"]),
                         {"address": "StreetAddress", "status": "MlsStatus", "sold_price": "Close Price", "sqft": "LivingArea"})

if __name__ == "__main__":
    unittest.main()
