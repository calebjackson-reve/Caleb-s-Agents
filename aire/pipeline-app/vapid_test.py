"""VAPID signer checks. Run: python3 aire/pipeline-app/vapid_test.py"""
import base64
import json
import unittest

import vapid as V


class Vapid(unittest.TestCase):
    def test_rfc6979_p256_sha256_sample(self):
        # RFC 6979 appendix A.2.5, P-256, SHA-256, message "sample"
        d = 0xC9AFA9D845BA75166B5C215767B1D6934E50C3DB36E89B127B8A622B120F6721
        r, s = V.sign(d, b"sample")
        self.assertEqual(r, 0xEFD48B2AACB6A8FD1140DD9CD45E81D69D2C877B56AAF991C34D0EA84EAF3716)
        self.assertEqual(s, 0xF7CB1C942D657C41D436C7A1B6E29F65F3E900DBB9AFF4064DC4AB2F843ACDA8)
        pub = V._mul(d)
        self.assertEqual(pub[0], 0x60FED4BA255A9D31C961EB74C6356D68C049B8923B61FA6CE669622E60F29FB6)
        self.assertTrue(V.verify(pub, b"sample", r, s))
        self.assertFalse(V.verify(pub, b"other", r, s))

    def test_keys_and_jwt(self):
        k = V.new_keys()
        raw = base64.urlsafe_b64decode(k["public"] + "==")
        self.assertEqual((len(raw), raw[0]), (65, 4))
        t = V.jwt(k["private"], "https://web.push.apple.com")
        h, b, sig = t.split(".")
        self.assertEqual(json.loads(base64.urlsafe_b64decode(b + "==="))["aud"], "https://web.push.apple.com")
        sg = base64.urlsafe_b64decode(sig + "==")
        pub = (int.from_bytes(raw[1:33], "big"), int.from_bytes(raw[33:], "big"))
        self.assertTrue(V.verify(pub, f"{h}.{b}".encode(), int.from_bytes(sg[:32], "big"), int.from_bytes(sg[32:], "big")))


if __name__ == "__main__":
    unittest.main(verbosity=1)
