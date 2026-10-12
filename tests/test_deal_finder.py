import csv, os, sys, tempfile, unittest
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

    def test_messy_money_and_alias_headers(self):
        self.assertEqual(df.to_num("$1,250,000"), 1250000)
        self.assertEqual(df.map_columns(["Close Price", "LivingArea", "MlsStatus", "StreetAddress"]),
                         {"address": "StreetAddress", "status": "MlsStatus", "sold_price": "Close Price", "sqft": "LivingArea"})

if __name__ == "__main__":
    unittest.main()
