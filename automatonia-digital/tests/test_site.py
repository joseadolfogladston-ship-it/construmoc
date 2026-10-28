"""Verificacoes sem dependencia externa do prototipo Automatonia Digital."""
import json
import pathlib
import unittest
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = []
    def handle_starttag(self, tag, attributes):
        d = dict(attributes)
        key = "src" if tag == "script" else "href"
        if tag in ("script", "a", "link"):
            target = d.get(key, "")
            if target and not target.startswith(("#", "https:", "http:", "mailto:")):
                self.targets.append(target.split("#")[0])

class PilotTests(unittest.TestCase):
    def test_all_local_assets_exist(self):
        for page in (ROOT / "site").glob("*.html"):
            parser = Links()
            parser.feed(page.read_text(encoding="utf-8"))
            for path in parser.targets:
                with self.subTest(page=page.name, target=path):
                    self.assertTrue((page.parent / path).is_file())

    def test_three_by_two_strategy(self):
        data = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
        self.assertEqual(len(data["businesses"]), 3)
        self.assertTrue(all(len(b["channels"]) == 2 for b in data["businesses"]))

    def test_transparent_offer(self):
        page = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
        self.assertIn("Ainda não existe checkout", page)
        self.assertIn("EXEMPLO FICTÍCIO", page)

    def test_local_storage_and_export_code(self):
        js = (ROOT / "site" / "caixa.js").read_text(encoding="utf-8")
        self.assertIn("localStorage", js)
        self.assertIn("csvCell", js)
        self.assertIn("validRow", js)
        self.assertNotIn("fetch(", js)
        self.assertNotIn("XMLHttpRequest", js)

if __name__ == "__main__":
    unittest.main()
