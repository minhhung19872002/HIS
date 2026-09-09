#!/usr/bin/env python3
"""Doi chieu MOT lich kham giua app nguoi benh va HIS, tren ban PROD dang chay.

Cau hoi can tra loi: nguoi benh dat lich tren app xong, nhan vien mo HIS ra co
THAY dung lich do voi dung du lieu khong?

Hai he thong, hai duong doc khac nhau:
    app  ->  BFF  /api/v1/patient/appointments        (BFF hoi HIS bang SO DIEN THOAI)
    HIS  ->  HIS  /api/booking-management/bookings    (nhan vien mo man Quan ly dat lich)

Bo smoke cu chi kiem dau app: dat xong doc lai bang chinh BFF thi tat nhien thay.
Cho do KHONG chung minh duoc gi ve phia HIS — va do dung la cho chu dau tu bao hong.

Chay:
    PYTHONIOENCODING=utf-8 python scripts/smoke-booking-app-vs-his.py
"""
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

APP = "https://patient.bluestar.com.vn/api/v1"
HIS = "https://his.bluestar.com.vn/api"
VM = "hung@14.225.83.93"
PASSWORD = "MatKhau@123"
HIS_USER, HIS_PASS = "admin", "Admin@123"

passed, failed = [], []


def call(base, method, path, body=None, token=None, timeout=45):
    req = urllib.request.Request(base + path, method=method)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    req.add_header("Content-Type", "application/json; charset=utf-8")
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=timeout) as r:
            raw = r.read()
            return r.status, (json.loads(raw.decode("utf-8")) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.status, json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return e.status, {}
    except Exception as e:  # noqa: BLE001
        return 0, {"error": str(e)}


def check(name, ok, detail=""):
    (passed if ok else failed).append(name)
    print(("  DAT   " if ok else "  HONG  ") + name + (" | " + detail if detail else ""))
    return ok


def section(title):
    print()
    print("=" * 78)
    print("  " + title)
    print("=" * 78)


def data_of(payload):
    return (payload or {}).get("data")


def latest_otp():
    try:
        out = subprocess.run(
            ["ssh", "-o", "BatchMode=yes", VM,
             "docker logs patientapp-api 2>&1 | grep '\\[DEV\\] OTP' | tail -1"],
            capture_output=True, text=True, timeout=60)
        found = re.findall(r"\b(\d{6})\b", out.stdout)
        return found[-1] if found else None
    except Exception:  # noqa: BLE001
        return None


def new_phone():
    import random
    return "09" + "".join(random.choice("0123456789") for _ in range(8))


# ======================================================== phia app: dat mot lich
section("PHIA APP — dang ky va dat mot lich kham")

phone = new_phone()
st, _ = call(APP, "POST", "/patient/auth/request-otp",
             {"phoneNumber": phone, "purpose": "register"})
check("Xin ma OTP", st == 200, f"HTTP {st}")

otp = latest_otp()
if otp is None:
    print("\n>>> Khong doc duoc OTP (can SSH toi VM). Dung.")
    sys.exit(1)

full_name = "Doi Chieu HIS"
st, body = call(APP, "POST", "/patient/auth/register", {
    "phoneNumber": phone, "otpCode": otp, "password": PASSWORD, "fullName": full_name,
    "device": {"deviceKey": "cmp-" + uuid.uuid4().hex[:8],
               "deviceName": "So sanh", "platform": "android"},
})
token = (data_of(body) or {}).get("token")
check("Dang ky tai khoan app", st == 200 and bool(token), f"HTTP {st}")
if not token:
    sys.exit(1)

st, body = call(APP, "GET", "/patient/appointments/departments", token=token)
deps = data_of(body) or []
check("Doc duoc danh muc khoa", st == 200 and len(deps) > 0, f"{len(deps)} khoa")
if not deps:
    sys.exit(1)
dep = deps[0]

import datetime
# Mac dinh dat cach 3 ngay; truyen so ngay o dong lenh de kiem dung ngay chu dau tu bao hong
# (vd `1` = ngay mai, dung mac dinh cua man dat lich tren app).
offset = int(sys.argv[1]) if len(sys.argv) > 1 else 3
day = (datetime.date.today() + datetime.timedelta(days=offset)).isoformat()
st, body = call(APP, "GET",
                f"/patient/appointments/slots?departmentId={dep['id']}&date={day}", token=token)
slots = (data_of(body) or {}).get("morningSlots") or []
check("Doc duoc khung gio", st == 200 and len(slots) > 0, f"{len(slots)} khung ngay {day}")
if not slots:
    sys.exit(1)
slot = slots[0]

reason = "Doi chieu app-HIS " + uuid.uuid4().hex[:6]
st, body = call(APP, "POST", "/patient/appointments", {
    "departmentId": dep["id"], "appointmentDate": day,
    "appointmentTime": slot["startTime"], "reason": reason}, token=token)
booked = data_of(body) or {}
code = booked.get("appointmentCode")
check("Dat lich kham", st == 200 and bool(code), f"HTTP {st} ma={code}")
if not code:
    sys.exit(1)

print(f"\n  >>> Ma lich: {code} · SDT: {phone} · Ten: {full_name}")
print(f"  >>> Khoa: {dep['name']} · Ngay: {day} · Gio: {slot['startTime']}")

st, body = call(APP, "GET", "/patient/appointments", token=token)
app_list = data_of(body) or []
app_item = next((a for a in app_list if a.get("appointmentCode") == code), None)
check("APP thay lich vua dat", app_item is not None, f"{len(app_list)} lich")

# ================================================== phia HIS: nhan vien co thay?
section("PHIA HIS — nhan vien mo man Quan ly dat lich co thay khong")

st, body = call(HIS, "POST", "/auth/login", {"username": HIS_USER, "password": HIS_PASS})
his_token = (data_of(body) or {}).get("token")
check("Dang nhap HIS", st == 200 and bool(his_token), f"HTTP {st}")
if not his_token:
    sys.exit(1)

st, body = call(HIS, "GET",
                f"/booking-management/bookings?fromDate={day}&toDate={day}", token=his_token)
his_list = data_of(body)
if isinstance(his_list, dict):
    his_list = his_list.get("items") or his_list.get("data") or []
his_list = his_list or []
check("HIS tra ve danh sach dat lich cua ngay do", st == 200, f"HTTP {st} · {len(his_list)} lich")

his_item = next((b for b in his_list
                 if (b.get("appointmentCode") or b.get("bookingCode") or b.get("code")) == code),
                None)
found = check("HIS THAY dung lich vua dat tren app", his_item is not None,
              f"tim ma {code} trong {len(his_list)} lich")

if not found and his_list:
    print("\n  Vai ma HIS dang tra ve (de so):")
    for b in his_list[:5]:
        print("   -", b.get("appointmentCode") or b.get("bookingCode") or b.get("code"),
              "|", b.get("patientName"), "|", b.get("phoneNumber") or b.get("phone"))

# ============================================== du lieu hai ben co khop nhau khong
if his_item:
    section("DOI CHIEU TUNG TRUONG")

    def his_get(*names):
        for n in names:
            if his_item.get(n) not in (None, ""):
                return his_item[n]
        return None

    check("Ten nguoi benh khop",
          (his_get("patientName", "fullName") or "").strip() == full_name,
          f"HIS='{his_get('patientName', 'fullName')}' app='{full_name}'")

    check("So dien thoai khop",
          (his_get("phoneNumber", "phone") or "").replace("+84", "0") == phone,
          f"HIS='{his_get('phoneNumber', 'phone')}' app='{phone}'")

    his_day = (his_get("appointmentDate", "bookingDate") or "")[:10]
    check("Ngay kham khop", his_day == day, f"HIS='{his_day}' app='{day}'")

    his_dep = his_get("departmentName", "department") or ""
    check("Khoa khop", his_dep.strip() == dep["name"].strip(),
          f"HIS='{his_dep}' app='{dep['name']}'")

    his_reason = his_get("reason", "note", "symptoms") or ""
    check("Ly do kham khop", his_reason.strip() == reason,
          f"HIS='{his_reason}' app='{reason}'")

print()
print("=" * 78)
print(f"  {len(passed)} DAT / {len(failed)} HONG")
if failed:
    print()
    for name in failed:
        print("  HONG: " + name)
print("=" * 78)
sys.exit(1 if failed else 0)
