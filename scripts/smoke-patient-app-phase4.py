#!/usr/bin/env python3
"""Smoke test Phase 4 — ket qua kham noi tru qua BFF (HSMT I.2 #6).

Chay:  PYTHONIOENCODING=utf-8 python scripts/smoke-patient-app-phase4.py

Yeu cau: giong Phase 3 (HIS 5106, BFF 5200, postgres, da chay seed demo).
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


def _once(method, path, body=None, token=None):
    req = urllib.request.Request(BFF + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.status, json.loads(raw)
        except json.JSONDecodeError:
            return e.status, {"raw": raw}


def call(method, path, body=None, token=None, wait_seconds=62):
    st, payload = _once(method, path, body, token)
    if st == 429:
        print(f"  ... bi gioi han tan suat (dung nhu thiet ke), cho {wait_seconds}s")
        time.sleep(wait_seconds)
        st, payload = _once(method, path, body, token)
    return st, payload


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


def register(phone, patient_code=None, device_key="smoke-phase4"):
    st, _ = call("POST", "/auth/request-otp", {"phoneNumber": phone, "purpose": "register"},
                 wait_seconds=610)
    if st != 200:
        return None, f"request-otp status={st}"

    body = {
        "phoneNumber": phone, "otpCode": latest_otp(), "password": PASSWORD,
        "fullName": "Nguoi dung Phase4",
        "device": {"deviceKey": device_key, "deviceName": "Phase4", "platform": "android"},
    }
    if patient_code:
        body["patientCode"] = patient_code

    st, r = call("POST", "/auth/register", body)
    return (r.get("data") or {}).get("token"), f"status={st} {r.get('message')}"


print(f"=== chuan bi: tai khoan lien ket ho so {DEMO_PATIENT_CODE} ===")
psql("DELETE FROM app_accounts WHERE \"PhoneNumber\" = '+84900000001'")

token, detail = register(DEMO_PHONE, DEMO_PATIENT_CODE, "smoke-phase4-linked")
check("dang ky va lien ket ho so benh an", bool(token), detail)
if not token:
    sys.exit(1)

# ------------------------------------------------------ dot nam vien
print("=== TC-N01 danh sach dot nam vien ===")
st, r = call("GET", "/results/admissions", token=token)
admissions = r.get("data") or []
check("TC-N01 doc duoc dot nam vien", st == 200 and len(admissions) >= 1,
      f"status={st} so dot={len(admissions)}")

adm = admissions[0] if admissions else {}
check("TC-N01 co khoa, phong, giuong",
      all(adm.get(k) for k in ("departmentName", "roomName", "bedName")),
      f"{adm.get('departmentName')} / {adm.get('roomName')} / {adm.get('bedName')}")
check("TC-N01 co so ngay nam vien", (adm.get("daysOfStay") or 0) >= 1,
      f"daysOfStay={adm.get('daysOfStay')}")
check("TC-N01 trang thai bang chu", (adm.get("statusName") or "") == "Đang điều trị",
      adm.get("statusName"))
check("TC-N01 co chan doan luc vao vien", bool(adm.get("diagnosisOnAdmission")),
      adm.get("diagnosisOnAdmission"))

admission_id = adm.get("id")

if admission_id:
    # --------------------------------------------- cong khai thuoc
    print("=== TC-N02 bang cong khai thuoc ===")
    st, r = call("GET", f"/results/admissions/{admission_id}/medicine-disclosure", token=token)
    disclosure = r.get("data") or {}
    items = disclosure.get("items") or []
    check("TC-N02 doc duoc bang cong khai thuoc", st == 200, f"status={st}")
    check("TC-N02 co dong thuoc", len(items) >= 1, f"so dong={len(items)}")

    if items:
        first = items[0]
        check("TC-N02 dong thuoc du ngay, ten, DVT, SL, don gia, thanh tien",
              all(first.get(k) not in (None, "") for k in
                  ("prescriptionDate", "medicineName", "unit", "quantity", "unitPrice", "amount")),
              json.dumps(first, ensure_ascii=False)[:140])
        check("TC-N02 co nguon chi tra", first.get("paymentSourceName") in ("BHYT", "Viện phí", "Khác"),
              first.get("paymentSourceName"))
        check("TC-N02 co cach dung", bool(first.get("usageInstructions")),
              first.get("usageInstructions"))

    check("TC-N02 tong tien = tong cac dong",
          abs((disclosure.get("totalAmount") or 0) - sum(i.get("amount") or 0 for i in items)) < 1,
          f"total={disclosure.get('totalAmount')}")
    check("TC-N02 BHYT + benh nhan = tong tien",
          abs((disclosure.get("insuranceAmount") or 0) + (disclosure.get("patientAmount") or 0)
              - (disclosure.get("totalAmount") or 0)) < 1,
          f"bhyt={disclosure.get('insuranceAmount')} bn={disclosure.get('patientAmount')}")

    # ---------------------------------------- chi dinh CLS + STT
    print("=== TC-N03 chi dinh can lam sang kem so thu tu ===")
    st, r = call("GET", f"/results/admissions/{admission_id}/service-orders", token=token)
    orders = r.get("data") or []
    check("TC-N03 doc duoc chi dinh CLS", st == 200 and len(orders) >= 1,
          f"status={st} so chi dinh={len(orders)}")

    if orders:
        order = orders[0]
        check("TC-N03 co ten dich vu va phong thuc hien",
              bool(order.get("serviceName")) and bool(order.get("executeRoomName")),
              f"{order.get('serviceName')} @ {order.get('executeRoomName')}")
        check("TC-N03 co trang thai bang chu", bool(order.get("statusName")),
              order.get("statusName"))
        check("TC-N03 co so thu tu thuc hien", (order.get("queueNumber") or "") == "C042",
              f"queueNumber={order.get('queueNumber')}")
        # 0 la gia tri hop le (khong ai cho truoc); -1 nghia la khong xac dinh duoc.
        check("TC-N03 co so nguoi cho truoc", order.get("peopleAhead") is not None
              and order["peopleAhead"] >= 0,
              f"peopleAhead={order.get('peopleAhead')}")

    # ------------------------------- ket qua loc theo dot nam vien
    print("=== TC-N04 ket qua loc theo dot nam vien ===")
    st, r = call("GET", f"/results/lab?admissionId={admission_id}", token=token)
    ip_labs = r.get("data") or []
    check("TC-N04 xet nghiem loc theo dot tra ve dung 200", st == 200, f"status={st}")

    st, r = call("GET", "/results/lab", token=token)
    all_labs = r.get("data") or []
    check("TC-N04 loc theo dot KHONG lay nham phieu ngoai tru",
          all(l["id"] not in [x["id"] for x in ip_labs]
              for l in all_labs if l.get("orderCode") == "XN-DEMO-APP"),
          f"noi tru={len(ip_labs)} tat ca={len(all_labs)}")

    st, r = call("GET", f"/results/imaging?admissionId={admission_id}", token=token)
    check("TC-N04 CDHA loc theo dot: dot nay chua co nen rong",
          st == 200 and (r.get("data") or []) == [], f"status={st}")

    st, r = call("GET", f"/results/functional?admissionId={admission_id}", token=token)
    check("TC-N04 TDCN loc theo dot: dot nay chua co nen rong",
          st == 200 and (r.get("data") or []) == [], f"status={st}")

# --------------------------- dot nam vien cua nguoi khac
print("=== TC-N05 khong xem duoc dot nam vien cua nguoi khac ===")
other_phone = "09" + "".join(random.choice("0123456789") for _ in range(8))
other_token, detail = register(other_phone, None, "smoke-phase4-unlinked")
check("dang ky tai khoan chua lien ket", bool(other_token), detail)

if other_token:
    st, _ = call("GET", "/results/admissions", token=other_token)
    check("TC-N05 tai khoan chua lien ket tra 409", st == 409, f"status={st}")

if admission_id:
    print("=== TC-N06 doi admissionId sang dot khong phai cua minh ===")
    fake = "99999999-9999-9999-9999-999999999999"
    st, _ = call("GET", f"/results/admissions/{fake}/medicine-disclosure", token=token)
    check("TC-N06 dot khong ton tai tra 404", st == 404, f"status={st}")

    st, r = call("GET", f"/results/admissions/{fake}/service-orders", token=token)
    check("TC-N06 chi dinh cua dot la cua nguoi khac tra rong",
          (r.get("data") or []) == [], f"so chi dinh={len(r.get('data') or [])}")

print("=== TC-N07 goi khi chua dang nhap ===")
st, _ = call("GET", "/results/admissions")
check("TC-N07 khong token tra 401", st == 401, f"status={st}")

print()
print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
for name in failed:
    print("  - " + name)
sys.exit(1 if failed else 0)
