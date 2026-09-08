"""Smoke test Phase 1 — BFF app ho tro nguoi benh (HIS.PatientApp.Api).

Chay:  PYTHONIOENCODING=utf-8 python smoke_phase1.py

Yeu cau:
  - BFF dang chay o localhost:5200 voi ASPNETCORE_ENVIRONMENT=Development
  - container his-patientapp-postgres dang song (dung de doc lai ma OTP)

Ve viec "doc lai ma OTP": OTP duoc luu BAM chu khong luu ma that, dung nhu thiet ke.
Test nay do nguoc SHA-256 cua 6 chu so (1 trieu kha nang, ~1 giay) de lay lai ma.
Viec do nguoc de dang chinh la ly do OTP BAT BUOC phai co gioi han tan suat va gioi
han so lan nhap sai — ca hai deu duoc kiem o TC-16.

Moi lan chay dung mot so dien thoai moi nen khong phu thuoc du lieu con lai tu lan truoc.
"""
import hashlib
import json
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:5200/api/v1/patient"
PG_CONTAINER = "his-patientapp-postgres"

# So dien thoai ngau nhien hop le (dau so 09) de moi lan chay la mot tai khoan moi.
PHONE = "09" + "".join(random.choice("0123456789") for _ in range(8))
PASSWORD = "MatKhau@123"
NEW_PASSWORD = "MatKhauMoi@456"

DEV_A = {"deviceKey": "smoke-android-a", "deviceName": "Pixel 6 test",
         "platform": "android", "osVersion": "13", "appVersion": "1.0.0"}
DEV_B = {"deviceKey": "smoke-ios-b", "deviceName": "iPhone 13 test",
         "platform": "ios", "osVersion": "16.4", "appVersion": "1.0.0"}

passed, failed = [], []


def _once(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.status, json.loads(raw)
        except json.JSONDecodeError:
            return e.status, {"raw": raw}


def call(method, path, body=None, token=None, wait_seconds=62):
    """Gap 429 thi cho het cua so roi thu lai MOT lan.

    BFF gioi han 10 lenh auth/phut/IP va 5 lan xin OTP/10 phut/IP. Bo test nay goi
    nhieu hon the nen chinh no se bi chan. Day la hanh vi DUNG cua san pham — cho roi
    thu lai, chu khong noi long gioi han cho test de qua.
    """
    status, payload = _once(method, path, body, token)
    if status == 429:
        print(f"  ... bi gioi han tan suat (dung nhu thiet ke), cho {wait_seconds}s roi thu lai")
        time.sleep(wait_seconds)
        status, payload = _once(method, path, body, token)
    return status, payload


def check(name, condition, detail=""):
    (passed if condition else failed).append(name)
    print(("  PASS  " if condition else "  FAIL  ") + name + (" | " + detail if detail else ""))


def latest_otp():
    """Doc ban ghi OTP moi nhat tu CSDL roi do nguoc ma 6 so tu ban bam."""
    out = subprocess.run(
        ["docker", "exec", PG_CONTAINER, "psql", "-U", "patientapp", "-d", "his_patientapp",
         "-t", "-A", "-c", 'SELECT "CodeHash" FROM otp_challenges ORDER BY "CreatedAt" DESC LIMIT 1'],
        capture_output=True, text=True, check=True)
    digest = out.stdout.strip()
    for i in range(1_000_000):
        code = "%06d" % i
        if hashlib.sha256(code.encode()).hexdigest() == digest:
            return code
    raise RuntimeError("Khong do nguoc duoc ma OTP tu ban bam.")


# ---------------------------------------------------------------- kiem dau vao
# Dat trước phần đăng ký để chưa tiêu vào hạn mức OTP.
print("=== TC-15 OTP: tu choi dau vao khong hop le ===")
st, _ = call("POST", "/auth/request-otp", {"phoneNumber": PHONE, "purpose": "khong_ton_tai"},
             wait_seconds=610)
check("TC-15 tu choi purpose la", st == 400, f"status={st}")
st, _ = call("POST", "/auth/request-otp", {"phoneNumber": "123", "purpose": "register"},
             wait_seconds=610)
check("TC-15 tu choi so dien thoai sai dinh dang", st == 400, f"status={st}")

# ------------------------------------------------------------------- dang ky
print(f"=== TC-00 dang ky tai khoan moi ({PHONE}) ===")
st, _ = call("POST", "/auth/request-otp", {"phoneNumber": PHONE, "purpose": "register"},
             wait_seconds=610)
check("TC-00 gui OTP thanh cong", st == 200, f"status={st}")
otp = latest_otp()

st, r = call("POST", "/auth/register", {
    "phoneNumber": PHONE, "otpCode": otp, "password": PASSWORD,
    "fullName": "Nguyen Van Test", "device": DEV_A})
check("TC-00 dang ky 200", st == 200, f"status={st} {r.get('message')}")
account = (r.get("data") or {}).get("account") or {}
check("TC-00 so dien thoai duoc chuan hoa ve +84",
      account.get("phoneNumber", "").startswith("+84"), account.get("phoneNumber"))
check("TC-00 tai khoan chua lien ket ho so HIS", account.get("isLinked") is False)

print("=== TC-00b dung lai ma OTP da tieu ===")
st, _ = call("POST", "/auth/register", {
    "phoneNumber": PHONE, "otpCode": otp, "password": PASSWORD,
    "fullName": "Ke gia mao", "device": DEV_A})
check("TC-00b OTP chi dung duoc mot lan", st == 400, f"status={st}")

# ---------------------------------------------------------------- dang nhap
print("=== TC-01 dang nhap dung mat khau ===")
st, r = call("POST", "/auth/login", {"phoneNumber": PHONE, "password": PASSWORD, "device": DEV_A})
check("TC-01 login 200", st == 200, f"status={st}")
token_a = (r.get("data") or {}).get("token")
refresh_a = (r.get("data") or {}).get("refreshToken")
check("TC-01 co access token", bool(token_a))
check("TC-01 co refresh token", bool(refresh_a))

print("=== TC-02 sai mat khau khong tiet lo tai khoan co ton tai hay khong ===")
st_bad, r_bad = call("POST", "/auth/login",
                     {"phoneNumber": PHONE, "password": "SaiRoi@999", "device": DEV_A})
st_nouser, r_nouser = call("POST", "/auth/login",
                           {"phoneNumber": "0988777666", "password": "SaiRoi@999", "device": DEV_A})
check("TC-02 sai mat khau tra 401", st_bad == 401, f"status={st_bad}")
check("TC-02 thong diep giong het nhau",
      r_bad.get("message") == r_nouser.get("message"),
      f"{r_bad.get('message')!r} vs {r_nouser.get('message')!r}")

print("=== TC-03 goi API can dang nhap ma khong co token ===")
st, _ = call("GET", "/devices")
check("TC-03 khong token tra 401", st == 401, f"status={st}")

# ----------------------------------------------------------------- thiet bi
print("=== TC-04 danh sach thiet bi ===")
st, r = call("GET", "/devices", token=token_a)
devices = r.get("data") or []
check("TC-04 tra ve 200", st == 200, f"status={st}")
check("TC-04 co dung 1 thiet bi", len(devices) == 1, f"so thiet bi={len(devices)}")
check("TC-04 danh dau may hien tai", any(d["isCurrent"] for d in devices))

print("=== TC-05 dang nhap may thu hai ===")
st, r = call("POST", "/auth/login", {"phoneNumber": PHONE, "password": PASSWORD, "device": DEV_B})
token_b = (r.get("data") or {}).get("token")
check("TC-05 login may 2 thanh cong", st == 200 and bool(token_b), f"status={st}")
st, r = call("GET", "/devices", token=token_b)
check("TC-05 danh sach co 2 thiet bi", len(r.get("data") or []) == 2,
      f"so thiet bi={len(r.get('data') or [])}")

print("=== TC-06 dang nhap lai cung may KHONG de them dong moi ===")
call("POST", "/auth/login", {"phoneNumber": PHONE, "password": PASSWORD, "device": DEV_A})
st, r = call("GET", "/devices", token=token_b)
check("TC-06 van chi 2 thiet bi", len(r.get("data") or []) == 2,
      f"so thiet bi={len(r.get('data') or [])}")

# ------------------------------------------------------------------- phien
print("=== TC-07 lam moi token (nen cua 'giu dang nhap') ===")
st, r = call("POST", "/auth/refresh", {"refreshToken": refresh_a})
new_token_a = (r.get("data") or {}).get("token")
new_refresh_a = (r.get("data") or {}).get("refreshToken")
check("TC-07 refresh 200", st == 200, f"status={st}")
check("TC-07 tra token moi khac token cu", bool(new_token_a) and new_token_a != token_a)

print("=== TC-08 dung lai refresh token cu ===")
st, _ = call("POST", "/auth/refresh", {"refreshToken": refresh_a})
check("TC-08 refresh token cu bi tu choi", st == 401, f"status={st}")
st, _ = call("POST", "/auth/refresh", {"refreshToken": new_refresh_a})
check("TC-08 phat hien dung lai -> thu hoi ca token moi", st == 401,
      f"status={st} (dung lai token da thu hoi phai lam chet toan bo phien)")

print("=== TC-09 sau thu hoi, access token cu chet ngay ===")
st, _ = call("GET", "/devices", token=token_b)
check("TC-09 access token cu tra 401", st == 401, f"status={st}")

print("=== TC-10 dang nhap lai sau su co ===")
st, r = call("POST", "/auth/login", {"phoneNumber": PHONE, "password": PASSWORD, "device": DEV_A})
token_a = (r.get("data") or {}).get("token")
check("TC-10 dang nhap lai duoc", st == 200 and bool(token_a), f"status={st}")

# --------------------------------------------------------------------- PIN
print("=== TC-11 dat ma PIN ===")
st, r = call("POST", "/auth/pin", {"password": PASSWORD, "pin": "246813"}, token=token_a)
check("TC-11 dat PIN thanh cong", st == 200, f"status={st} {r.get('message')}")
st, _ = call("POST", "/auth/pin", {"password": PASSWORD, "pin": "111111"}, token=token_a)
check("TC-11 tu choi PIN sau so giong nhau", st == 400, f"status={st}")
st, _ = call("POST", "/auth/pin", {"password": PASSWORD, "pin": "123456"}, token=token_a)
check("TC-11 tu choi PIN day lien tiep", st == 400, f"status={st}")
st, _ = call("POST", "/auth/pin", {"password": "SaiMatKhau@1", "pin": "246813"}, token=token_a)
check("TC-11 doi mat khau dung moi cho dat PIN", st == 400, f"status={st}")

print("=== TC-12 kiem tra PIN ===")
st, _ = call("POST", "/auth/pin/verify", {"pin": "246813"}, token=token_a)
check("TC-12 PIN dung", st == 200, f"status={st}")
st, _ = call("POST", "/auth/pin/verify", {"pin": "999999"}, token=token_a)
check("TC-12 PIN sai bi tu choi", st == 400, f"status={st}")

# ------------------------------------------------------- dang xuat tu xa
print("=== TC-13 dang xuat tu xa may khac ===")
st, r = call("POST", "/auth/login", {"phoneNumber": PHONE, "password": PASSWORD, "device": DEV_B})
token_b = (r.get("data") or {}).get("token")
st, r = call("GET", "/devices", token=token_b)
other = next((d for d in (r.get("data") or []) if not d["isCurrent"]), None)
check("TC-13 tim thay may khac", other is not None)
if other:
    st, _ = call("DELETE", "/devices/" + other["id"], token=token_b)
    check("TC-13 thu hoi may khac 200", st == 200, f"status={st}")
    st, _ = call("GET", "/devices", token=token_a)
    check("TC-13 may bi thu hoi mat quyen NGAY", st == 401,
          f"status={st} (phai 401 tuc thi, khong doi access token het han)")

# --------------------------------------------------------------- mat khau
print("=== TC-14 doi mat khau ===")
st, r = call("POST", "/auth/login", {"phoneNumber": PHONE, "password": PASSWORD, "device": DEV_B})
token_b = (r.get("data") or {}).get("token")
st, _ = call("POST", "/auth/change-password",
             {"currentPassword": "SaiMatKhau@1", "newPassword": NEW_PASSWORD}, token=token_b)
check("TC-14 sai mat khau hien tai bi tu choi", st == 400, f"status={st}")
st, _ = call("POST", "/auth/change-password",
             {"currentPassword": PASSWORD, "newPassword": PASSWORD}, token=token_b)
check("TC-14 tu choi mat khau moi trung mat khau cu", st == 400, f"status={st}")
st, r = call("POST", "/auth/change-password",
             {"currentPassword": PASSWORD, "newPassword": NEW_PASSWORD}, token=token_b)
check("TC-14 doi mat khau thanh cong", st == 200, f"status={st} {r.get('message')}")
check("TC-14 cap lai token cho may dang thao tac", bool((r.get("data") or {}).get("token")))
st, _ = call("POST", "/auth/login", {"phoneNumber": PHONE, "password": PASSWORD, "device": DEV_B})
check("TC-14 mat khau cu khong dung duoc nua", st == 401, f"status={st}")
st, _ = call("POST", "/auth/login", {"phoneNumber": PHONE, "password": NEW_PASSWORD, "device": DEV_B})
check("TC-14 mat khau moi dung duoc", st == 200, f"status={st}")

# ---------------------------------------------------------------- ket qua
print()
print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
if failed:
    print("Cac muc that bai:")
    for name in failed:
        print("  - " + name)
sys.exit(1 if failed else 0)
