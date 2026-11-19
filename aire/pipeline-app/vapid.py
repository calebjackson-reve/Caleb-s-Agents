"""VAPID for Web Push, standard library only: P-256 keys, ES256 signatures (RFC 6979 deterministic k), the JWT.

Pipeline sends push messages with no body, so no payload encryption is needed: the phone wakes, and the service
worker fetches the alert text from Pipeline over the private, logged-in connection. The only secret is the VAPID
private key, kept outside the repo. Checked against the RFC 6979 A.2.5 test vector in vapid_test.py.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

P = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF
A = P - 3
B = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
G = (0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
     0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5)


def _add(p, q):
    if p is None:
        return q
    if q is None:
        return p
    if p[0] == q[0] and (p[1] + q[1]) % P == 0:
        return None
    if p == q:
        lam = (3 * p[0] * p[0] + A) * pow(2 * p[1], -1, P) % P
    else:
        lam = (q[1] - p[1]) * pow(q[0] - p[0], -1, P) % P
    x = (lam * lam - p[0] - q[0]) % P
    return x, (lam * (p[0] - x) - p[1]) % P


def _mul(k: int, pt=G):
    out = None
    while k:
        if k & 1:
            out = _add(out, pt)
        pt = _add(pt, pt)
        k >>= 1
    return out


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def new_keys() -> dict:
    d = secrets.randbelow(N - 1) + 1
    return {"private": d.to_bytes(32, "big").hex(), "public": public_b64(d)}


def public_b64(d: int) -> str:
    x, y = _mul(d)
    return b64u(b"\x04" + x.to_bytes(32, "big") + y.to_bytes(32, "big"))


def _rfc6979_k(d: int, h: bytes) -> int:
    x, h1 = d.to_bytes(32, "big"), (int.from_bytes(h, "big") % N).to_bytes(32, "big")
    v, k = b"\x01" * 32, b"\x00" * 32
    k = hmac.new(k, v + b"\x00" + x + h1, hashlib.sha256).digest()
    v = hmac.new(k, v, hashlib.sha256).digest()
    k = hmac.new(k, v + b"\x01" + x + h1, hashlib.sha256).digest()
    v = hmac.new(k, v, hashlib.sha256).digest()
    while True:
        v = hmac.new(k, v, hashlib.sha256).digest()
        t = int.from_bytes(v, "big")
        if 1 <= t < N:
            return t
        k = hmac.new(k, v + b"\x00", hashlib.sha256).digest()
        v = hmac.new(k, v, hashlib.sha256).digest()


def sign(d: int, msg: bytes) -> tuple[int, int]:
    h = hashlib.sha256(msg).digest()
    e = int.from_bytes(h, "big")
    k = _rfc6979_k(d, h)
    r = _mul(k)[0] % N
    s = pow(k, -1, N) * (e + r * d) % N
    return r, s


def verify(pub: tuple[int, int], msg: bytes, r: int, s: int) -> bool:
    if not (1 <= r < N and 1 <= s < N):
        return False
    e = int.from_bytes(hashlib.sha256(msg).digest(), "big")
    w = pow(s, -1, N)
    pt = _add(_mul(e * w % N), _mul(r * w % N, pub))
    return pt is not None and pt[0] % N == r


def jwt(private_hex: str, audience: str, subject: str = "mailto:aire@calebjackson.org", ttl: int = 12 * 3600) -> str:
    head = b64u(json.dumps({"typ": "JWT", "alg": "ES256"}, separators=(",", ":")).encode())
    body = b64u(json.dumps({"aud": audience, "exp": int(time.time()) + ttl, "sub": subject}, separators=(",", ":")).encode())
    r, s = sign(int(private_hex, 16), f"{head}.{body}".encode())
    return f"{head}.{body}.{b64u(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))}"
