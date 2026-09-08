#!/usr/bin/env python3
"""Smoke test Phase 3 — xem ket qua kham ngoai tru qua BFF (HSMT I.2 #5).

Chay:  PYTHONIOENCODING=utf-8 python scripts/smoke-patient-app-phase3.py

Yeu cau:
  - HIS Core o localhost:5106, BFF o localhost:5200 (Development)
  - container his-patientapp-postgres dang song (doc lai ma OTP)
  - da chay scripts/seed-patient-app-demo.sql (tao benh nhan BN-DEMO-APP / 0900000001)

Bo test dang ky MOT tai khoan moi lien ket voi ho so demo, va MOT tai khoan
khong lien ket ho so nao — de kiem ca duong hop le lan duong bi tu choi.
"""
import hashlib
import json
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request

BFF = "http://localhost:5200/api/v1/patient"
PG_CONTAINER = "his-patientapp-postgres"

DEMO_PATIENT_CODE = "BN-DEMO-APP"
DEMO_PHONE = "0900000001"
PASSWORD = "MatKhau@123"

passed, failed = [], []


def _once(method, path, body=None, token=None, raw=False):
    req = urllib.request.Request(BFF + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            payload = r.read()
            if raw:
                return r.status, payload, r.headers.get("Content-Type", "")
            return r.status, json.loads(payload.decode())
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        if raw:
            return e.status, body_bytes, e.headers.get("Content-Type", "")
        try:
            return e.status, json.loads(body_bytes.decode())
        except json.JSONDecodeError:
            return e.status, {"raw": body_bytes.decode(errors="replace")}


def call(method, path, body=None, token=None, wait_seconds=62, raw=False):
    result = _once(method, path, body, token, raw)
    if result[0] == 429:
        print(f"  ... bi gioi han tan suat (dung nhu thiet ke), cho {wait_seconds}s")
        time.sleep(wait_seconds)
        result = _once(method, path, body, token, raw)
    return result


def check(name, condition, detail=""):
    (passed if condition else failed).append(name)
    print(("  PASS  " if condition else "  FAIL  ") + name + (" | " + detail if detail else ""))


def psql(sql):
    out = subprocess.run(
        ["docker", "exec", PG_CONTAINER, "psql", "-U", "patientapp", "-d", "his_patientapp",
         "-t", "-A", "-c", sql],
        capture_output=True, text=True, check=True)
    return out.stdout.strip()


def latest_otp():
    digest = psql('SELECT "CodeHash" FROM otp_challenges ORDER BY "CreatedAt" DESC LIMIT 1')
    for i in range(1_000_000):
        code = "%06d" % i
        if hashlib.sha256(code.encode()).hexdigest() == digest:
            return code
    raise RuntimeError("Khong do nguoc duoc ma OTP.")


def register(phone, patient_code=None, device_key="smoke-phase3"):
    st, _ = call("POST", "/auth/request-otp", {"phoneNumber": phone, "purpose": "register"},
                 wait_seconds=610)
    if st != 200:
        return None, f"request-otp status={st}"

    body = {
        "phoneNumber": phone, "otpCode": latest_otp(), "password": PASSWORD,
        "fullName": "Nguoi dung Phase3",
        "device": {"deviceKey": device_key, "deviceName": "Phase3", "platform": "android"},
    }
    if patient_code:
        body["patientCode"] = patient_code

    st, r = call("POST", "/auth/register", body)
    return (r.get("data") or {}).get("token"), f"status={st} {r.get('message')}"


# ---------------------------------------------------- tai khoan da lien ket
print(f"=== chuan bi: tai khoan lien ket ho so {DEMO_PATIENT_CODE} ===")

# Xoa tai khoan cu cua so demo neu con, de moi lan chay deu tu dau.
psql("DELETE FROM app_accounts WHERE \"PhoneNumber\" = '+84900000001'")

token, detail = register(DEMO_PHONE, DEMO_PATIENT_CODE, "smoke-phase3-linked")
check("dang ky va lien ket ho so benh an", bool(token), detail)
if not token:
    sys.exit(1)

linked = psql("SELECT \"HisPatientId\" FROM app_accounts WHERE \"PhoneNumber\" = '+84900000001'")
check("tai khoan da gan voi ho so HIS", len(linked) > 10, f"HisPatientId={linked}")

# ------------------------------------------------------------- luot kham
print("=== TC-R01 danh sach luot kham ===")
st, r = call("GET", "/results/visits", token=token)
visits = r.get("data") or []
check("TC-R01 doc duoc luot kham", st == 200 and len(visits) >= 1, f"status={st} so luot={len(visits)}")
check("TC-R01 co chan doan", any(v.get("diagnosis") for v in visits),
      visits[0].get("diagnosis") if visits else "")

visit_id = visits[0]["visitId"] if visits else None

# ------------------------------------------------------------ xet nghiem
print("=== TC-R02 danh sach xet nghiem ===")
st, r = call("GET", "/results/lab", token=token)
labs = r.get("data") or []
check("TC-R02 doc duoc xet nghiem", st == 200 and len(labs) >= 1, f"status={st} so phieu={len(labs)}")
check("TC-R02 co ten dich vu", any(l.get("serviceName") for l in labs),
      labs[0].get("serviceName") if labs else "")
check("TC-R02 co co bat thuong", any(l.get("hasAbnormal") for l in labs),
      f"hasAbnormal={labs[0].get('hasAbnormal') if labs else None}")
check("TC-R02 co bac si chi dinh", any(l.get("orderingDoctor") for l in labs),
      labs[0].get("orderingDoctor") if labs else "")

lab_id = labs[0]["id"] if labs else None

if lab_id:
    print("=== TC-R03 chi tiet xet nghiem: tung chi so ===")
    st, r = call("GET", f"/results/lab/{lab_id}", token=token)
    detail_lab = r.get("data") or {}
    items = detail_lab.get("testItems") or []
    check("TC-R03 doc duoc chi tiet", st == 200, f"status={st}")
    check("TC-R03 co it nhat 3 chi so", len(items) >= 3, f"so chi so={len(items)}")
    check("TC-R03 chi so co don vi va khoang tham chieu",
          all(i.get("unit") is not None and i.get("normalRange") is not None for i in items))
    check("TC-R03 co dung mot chi so gan co bat thuong",
          sum(1 for i in items if i.get("flag") in ("High", "Low", "Critical")) == 1,
          str([i.get("flag") for i in items]))
    ast = next((i for i in items if "AST" in (i.get("testName") or "")), None)
    check("TC-R03 AST duoc danh dau cao", ast is not None and ast.get("flag") == "High",
          f"{ast.get('result') if ast else '?'} {ast.get('unit') if ast else ''}")

if visit_id:
    print("=== TC-R04 loc ket qua theo lan kham ===")
    st, r = call("GET", f"/results/lab?visitId={visit_id}", token=token)
    filtered = r.get("data") or []
    check("TC-R04 loc theo lan kham co ket qua", st == 200 and len(filtered) >= 1,
          f"status={st} so phieu={len(filtered)}")

    st, r = call("GET", "/results/lab?visitId=11111111-1111-1111-1111-111111111111", token=token)
    check("TC-R04 lan kham khac tra rong", (r.get("data") or []) == [],
          f"so phieu={len(r.get('data') or [])}")

# ------------------------------------------------------ chan doan hinh anh
print("=== TC-R05 chan doan hinh anh ===")
st, r = call("GET", "/results/imaging", token=token)
imaging = r.get("data") or []
check("TC-R05 doc duoc CDHA", st == 200 and len(imaging) >= 1, f"status={st} so phieu={len(imaging)}")
check("TC-R05 co ket luan", any(i.get("impression") for i in imaging),
      imaging[0].get("impression") if imaging else "")
check("TC-R05 co bac si doc phim", any(i.get("reportingDoctor") for i in imaging),
      imaging[0].get("reportingDoctor") if imaging else "")

img_id = imaging[0]["id"] if imaging else None

if img_id:
    print("=== TC-R06 chi tiet CDHA ===")
    st, r = call("GET", f"/results/imaging/{img_id}", token=token)
    img = r.get("data") or {}
    check("TC-R06 doc duoc chi tiet", st == 200, f"status={st}")
    check("TC-R06 co mo ta hinh anh", bool(img.get("findings")))
    check("TC-R06 noi ro co anh hay khong", "hasImages" in img,
          f"hasImages={img.get('hasImages')} imageCount={img.get('imageCount')}")

    print("=== TC-R07 danh sach anh PACS ===")
    st, r = call("GET", f"/results/imaging/{img_id}/images", token=token)
    images = r.get("data")
    check("TC-R07 tra ve danh sach anh", st == 200 and isinstance(images, list), f"status={st}")
    # Ca chup demo chua co anh trong PACS. Danh sach phai RONG chu khong duoc bia ra o anh hong.
    check("TC-R07 ca chup chua co anh thi danh sach rong", images == [],
          f"so anh={len(images or [])}")

# --------------------------------------------------- tham do chuc nang
print("=== TC-R08 tham do chuc nang ===")
st, r = call("GET", "/results/functional", token=token)
functional = r.get("data") or []
check("TC-R08 doc duoc TDCN", st == 200 and len(functional) >= 1,
      f"status={st} so phieu={len(functional)}")
check("TC-R08 ten loai da dich sang tieng Viet",
      any(f.get("testTypeName") == "Điện tim thường quy" for f in functional),
      functional[0].get("testTypeName") if functional else "")
check("TC-R08 co so do tach tu JSON",
      any(len(f.get("measurements") or []) >= 3 for f in functional),
      str(len(functional[0].get("measurements") or []) if functional else 0))

fdt_id = functional[0]["id"] if functional else None
if fdt_id:
    st, r = call("GET", f"/results/functional/{fdt_id}", token=token)
    check("TC-R08 doc duoc chi tiet TDCN", st == 200 and bool((r.get("data") or {}).get("conclusion")),
          f"status={st}")

# ------------------------------------------- kham suc khoe hop dong
print("=== TC-R09 kham suc khoe hop dong ===")
st, r = call("GET", "/results/health-checkups", token=token)
checkups = r.get("data") or []
check("TC-R09 doc duoc dot KSK", st == 200 and len(checkups) >= 1,
      f"status={st} so dot={len(checkups)}")
check("TC-R09 co phan loai suc khoe dang chu",
      any((c.get("healthClassification") or "").startswith("Loại") for c in checkups),
      checkups[0].get("healthClassification") if checkups else "")
check("TC-R09 co so giay chung nhan",
      any(c.get("certificateIssued") and c.get("certificateNumber") for c in checkups),
      checkups[0].get("certificateNumber") if checkups else "")

# ------------------------------------------------------------ don thuoc
print("=== TC-R10 don thuoc ===")
st, r = call("GET", "/results/prescriptions?activeOnly=false", token=token)
prescriptions = r.get("data") or []
check("TC-R10 doc duoc don thuoc", st == 200 and len(prescriptions) >= 1,
      f"status={st} so don={len(prescriptions)}")
items = (prescriptions[0].get("items") or []) if prescriptions else []
check("TC-R10 co thuoc trong don", len(items) >= 1, f"so thuoc={len(items)}")
check("TC-R10 thuoc co lieu va cach dung",
      all(i.get("dosage") and i.get("frequency") and i.get("instructions") for i in items),
      str(items[0]) if items else "")

# ------------------------------------------- tai khoan chua lien ket
print("=== TC-R11 tai khoan chua lien ket ho so ===")
other_phone = "09" + "".join(random.choice("0123456789") for _ in range(8))
other_token, detail = register(other_phone, None, "smoke-phase3-unlinked")
check("dang ky tai khoan chua lien ket", bool(other_token), detail)

if other_token:
    st, r = call("GET", "/results/lab", token=other_token)
    check("TC-R11 tra 409 chu khong tra danh sach rong", st == 409, f"status={st}")
    check("TC-R11 noi ro can lien ket ho so",
          "liên kết" in (r.get("message") or "").lower(), r.get("message"))
    check("TC-R11 co ma loi de app xu ly", r.get("errorCode") == "PATIENT_NOT_LINKED"
          or (r.get("errors") or {}) != {} or "PATIENT_NOT_LINKED" in json.dumps(r),
          json.dumps(r, ensure_ascii=False)[:120])

    if lab_id:
        print("=== TC-R12 khong doc duoc ket qua cua nguoi khac ===")
        st, _ = call("GET", f"/results/lab/{lab_id}", token=other_token)
        check("TC-R12 tai khoan chua lien ket bi chan", st in (404, 409), f"status={st}")

print("=== TC-R13 goi khi chua dang nhap ===")
st, _ = call("GET", "/results/lab")
check("TC-R13 khong token tra 401", st == 401, f"status={st}")

# ---------------------------------------------------- nhat ky truy cap
print("=== TC-R14 moi lan xem deu ghi nhat ky ===")
count = psql("SELECT COUNT(*) FROM access_audit_logs WHERE \"Action\" LIKE 'view_%'")
check("TC-R14 co ban ghi nhat ky truy cap", int(count or 0) >= 5, f"so ban ghi={count}")

print()
print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
for name in failed:
    print("  - " + name)
sys.exit(1 if failed else 0)
