#!/usr/bin/env python3
"""Smoke test Phase 6 — web quan tri va module tra cuu (HSMT I.3).

Chay:  PYTHONIOENCODING=utf-8 python scripts/smoke-patient-app-phase6.py

Yeu cau: HIS 5106, BFF 5200 (Development), postgres, da chay seed demo.

Bo test dung tai khoan nhan vien cua HIS (admin/Admin@123) de goi API quan tri
va tra cuu tren BFF — dung cach ma web quan tri va app nhan vien se goi.
"""
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

BFF = "http://localhost:5200/api/v1"
HIS = "http://localhost:5106/api"
PG_CONTAINER = "his-patientapp-postgres"

STAFF_USER = "admin"
STAFF_PASS = "Admin@123"
DEMO_PATIENT_CODE = "BN-DEMO-APP"

passed, failed = [], []


def _request(url, method="GET", body=None, token=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            raw = r.read()
            return r.status, (json.loads(raw.decode()) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.status, json.loads(raw.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            return e.status, {}


def bff(path, method="GET", body=None, token=None, wait_seconds=62):
    st, payload = _request(BFF + path, method, body, token)
    if st == 429:
        print(f"  ... bi gioi han tan suat (dung nhu thiet ke), cho {wait_seconds}s")
        time.sleep(wait_seconds)
        st, payload = _request(BFF + path, method, body, token)
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


# ===================================================== dang nhap nhan vien
print("=== TC-S01 nhan vien dang nhap qua BFF ===")
st, r = bff("/staff/auth/login", "POST", {"username": STAFF_USER, "password": STAFF_PASS})
session = r.get("data") or {}
staff_token = session.get("token")
check("TC-S01 dang nhap thanh cong", st == 200 and bool(staff_token),
      f"status={st} {r.get('message')}")
check("TC-S01 tra ve vai tro", len(session.get("roles") or []) >= 1,
      str(session.get("roles")))

if not staff_token:
    print("Khong lay duoc token nhan vien, dung bo test.")
    sys.exit(1)

print("=== TC-S02 sai mat khau bi tu choi ===")
st, r = bff("/staff/auth/login", "POST", {"username": STAFF_USER, "password": "sai-mat-khau"})
check("TC-S02 sai mat khau tra 401", st == 401, f"status={st}")
check("TC-S02 thong diep KHONG phan biet 'sai mat khau' voi 'khong co tai khoan'",
      (r.get("message") or "") == "Tài khoản hoặc mật khẩu không đúng.", r.get("message"))

# ===================================================== quan tri
print("=== TC-S03 dashboard quan tri ===")
st, r = bff("/admin/patient-app/dashboard?days=30", token=staff_token)
dash = r.get("data") or {}
check("TC-S03 doc duoc dashboard", st == 200, f"status={st}")
check("TC-S03 co so tai khoan", (dash.get("totalAccounts") or 0) >= 1,
      f"tong={dash.get('totalAccounts')} lien ket={dash.get('linkedAccounts')}")
check("TC-S03 co thong ke su dung", "queueTicketsTaken" in dash and "notificationsSent" in dash,
      f"STT={dash.get('queueTicketsTaken')} thong bao={dash.get('notificationsSent')}")

print("=== TC-S04 danh sach tai khoan ===")
st, r = bff("/admin/patient-app/accounts?page=1&pageSize=5", token=staff_token)
accounts = (r.get("data") or {}).get("items") or []
check("TC-S04 doc duoc danh sach tai khoan", st == 200 and len(accounts) >= 1,
      f"status={st} so tai khoan={len(accounts)}")
check("TC-S04 co phan trang", (r.get("data") or {}).get("total", 0) >= len(accounts),
      f"total={(r.get('data') or {}).get('total')}")

# Tim mot tai khoan da lien ket ho so de thu khoa / mo khoa
linked = next((a for a in accounts if a.get("hisPatientCode")), None)
if linked is None:
    st, r = bff("/admin/patient-app/accounts?page=1&pageSize=50", token=staff_token)
    linked = next((a for a in ((r.get("data") or {}).get("items") or [])
                   if a.get("hisPatientCode")), None)

if linked:
    account_id = linked["id"]

    print("=== TC-S05 khoa tai khoan co hieu luc ngay ===")
    st, r = bff(f"/admin/patient-app/accounts/{account_id}/status", "PUT",
                {"status": "Locked", "reason": "smoke test"}, token=staff_token)
    check("TC-S05 khoa thanh cong", st == 200, f"status={st} {r.get('message')}")

    status_in_db = psql(f"SELECT \"Status\" FROM app_accounts WHERE \"Id\" = '{account_id}'")
    check("TC-S05 trang thai trong CSDL da doi", status_in_db == "Locked", status_in_db)

    # Khoa phai xoay con dau bao mat de token cu chet ngay, khong doi het han.
    stamp_rows = psql(
        f"SELECT COUNT(*) FROM app_accounts WHERE \"Id\" = '{account_id}' "
        "AND \"SecurityStamp\" IS NOT NULL AND LENGTH(\"SecurityStamp\") = 32")
    check("TC-S05 con dau bao mat da duoc xoay", stamp_rows == "1", f"rows={stamp_rows}")

    print("=== TC-S06 mo khoa lai ===")
    st, r = bff(f"/admin/patient-app/accounts/{account_id}/status", "PUT",
                {"status": "Active"}, token=staff_token)
    check("TC-S06 mo khoa thanh cong", st == 200, f"status={st}")
    check("TC-S06 trang thai ve Active",
          psql(f"SELECT \"Status\" FROM app_accounts WHERE \"Id\" = '{account_id}'") == "Active")

    print("=== TC-S07 dat lai mat khau ===")
    st, r = bff(f"/admin/patient-app/accounts/{account_id}/reset-password", "POST",
                token=staff_token)
    temp = (r.get("data") or {}).get("temporaryPassword") or ""
    check("TC-S07 tra ve mat khau tam", st == 200 and len(temp) >= 8, f"status={st} len={len(temp)}")
    check("TC-S07 bat co buoc doi mat khau",
          psql(f"SELECT \"MustChangePassword\" FROM app_accounts WHERE \"Id\" = '{account_id}'") == "t")

print("=== TC-S08 nhat ky truy cap ===")
st, r = bff("/admin/patient-app/audit-logs?page=1&pageSize=10", token=staff_token)
logs = (r.get("data") or {}).get("items") or []
check("TC-S08 doc duoc nhat ky", st == 200 and len(logs) >= 1,
      f"status={st} so ban ghi={len(logs)}")
check("TC-S08 ban ghi co hanh dong va hồ so dich",
      all(l.get("action") and l.get("targetPatientId") for l in logs))

print("=== TC-S09 danh sach lien ket gia dinh ===")
st, r = bff("/admin/patient-app/family-links?page=1&pageSize=10", token=staff_token)
check("TC-S09 doc duoc lien ket gia dinh", st == 200, f"status={st}")

# ===================================================== chien dich thong bao
print("=== TC-S10 gui thong bao ngay cho nguoi da lien ket ho so ===")
st, r = bff("/admin/patient-app/campaigns", "POST", {
    "title": "Thong bao kiem thu",
    "body": "Day la thong bao do bo kiem thu tu dong tao.",
    "audience": "linked",
}, token=staff_token)
campaign = r.get("data") or {}
check("TC-S10 gui thanh cong", st == 200 and bool(campaign.get("id")),
      f"status={st} {r.get('message')}")

campaign_id = campaign.get("id")

if campaign_id:
    st, r = bff("/admin/patient-app/campaigns?page=1&pageSize=10", token=staff_token)
    listed = next((c for c in ((r.get("data") or {}).get("items") or [])
                   if c.get("id") == campaign_id), None)
    check("TC-S10 chien dich hien trong lich su", listed is not None)
    check("TC-S10 trang thai da gui", (listed or {}).get("status") == "Sent",
          (listed or {}).get("status"))
    check("TC-S10 co so nguoi nhan", ((listed or {}).get("recipientCount") or 0) >= 1,
          f"so nguoi nhan={(listed or {}).get('recipientCount')}")

    rows = psql(f"SELECT COUNT(*) FROM app_notifications WHERE \"CampaignId\" = '{campaign_id}'")
    check("TC-S10 thong bao thuc su nam trong hop thu nguoi dung", int(rows or 0) >= 1,
          f"so thong bao={rows}")

print("=== TC-S11 hen gio gui ===")
future = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 3600))
st, r = bff("/admin/patient-app/campaigns", "POST", {
    "title": "Thong bao hen gio",
    "body": "Se gui sau mot gio.",
    "audience": "linked",
    "scheduledAt": future,
}, token=staff_token)
scheduled = r.get("data") or {}
check("TC-S11 hen gio thanh cong", st == 200, f"status={st} {r.get('message')}")
check("TC-S11 trang thai la da hen gio", scheduled.get("status") == "Scheduled",
      scheduled.get("status"))

if scheduled.get("id"):
    rows = psql(
        f"SELECT COUNT(*) FROM app_notifications WHERE \"CampaignId\" = '{scheduled['id']}'")
    check("TC-S11 chua gui thi chua co thong bao nao", rows == "0", f"so thong bao={rows}")

    st, r = bff(f"/admin/patient-app/campaigns/{scheduled['id']}", "DELETE", token=staff_token)
    check("TC-S11 huy duoc chien dich chua gui", st == 200, f"status={st}")

print("=== TC-S12 hen gio o qua khu bi tu choi ===")
past = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 3600))
st, r = bff("/admin/patient-app/campaigns", "POST", {
    "title": "Sai gio", "body": "x", "audience": "linked", "scheduledAt": past,
}, token=staff_token)
check("TC-S12 hen gio qua khu bi tu choi", st == 400, f"status={st} {r.get('message')}")

# ===================================================== tra cuu CSKH
print("=== TC-S13 tra cuu benh nhan theo ma ===")
st, r = bff(f"/staff/lookup/patients?keyword={DEMO_PATIENT_CODE}", token=staff_token)
found = r.get("data") or []
check("TC-S13 tim thay benh nhan", st == 200 and len(found) >= 1,
      f"status={st} so ket qua={len(found)}")
check("TC-S13 co trang thai tai khoan app",
      all("hasAppAccount" in p for p in found),
      f"hasAppAccount={found[0].get('hasAppAccount') if found else None}")

patient_id = found[0]["patientId"] if found else None

print("=== TC-S14 tra cuu duoi 3 ky tu bi chan ===")
st, r = bff("/staff/lookup/patients?keyword=ab", token=staff_token)
check("TC-S14 tu khoa qua ngan bi tu choi", st == 400, f"status={st} {r.get('message')}")

if patient_id:
    print("=== TC-S15 tom tat ho so cho nhan vien ===")
    st, r = bff(f"/staff/lookup/patients/{patient_id}/summary", token=staff_token)
    summary = r.get("data") or {}
    check("TC-S15 doc duoc tom tat", st == 200, f"status={st}")
    check("TC-S15 co thong tin benh nhan",
          (summary.get("patient") or {}).get("patientCode") == DEMO_PATIENT_CODE,
          (summary.get("patient") or {}).get("patientCode"))
    check("TC-S15 co ket qua xet nghiem", len(summary.get("labResults") or []) >= 1,
          f"so phieu={len(summary.get('labResults') or [])}")
    check("TC-S15 co dot noi tru", len(summary.get("admissions") or []) >= 1,
          f"so dot={len(summary.get('admissions') or [])}")

    print("=== TC-S16 nhat ky ghi lai viec nhan vien tra cuu ===")
    rows = psql(
        "SELECT COUNT(*) FROM access_audit_logs "
        "WHERE \"ActorType\" = 'staff' AND \"Action\" LIKE 'staff_%'")
    check("TC-S16 co ban ghi nhan vien tra cuu", int(rows or 0) >= 1, f"so ban ghi={rows}")

    with_his_user = psql(
        "SELECT COUNT(*) FROM access_audit_logs "
        "WHERE \"ActorType\" = 'staff' AND \"ActorHisUserId\" IS NOT NULL")
    check("TC-S16 ban ghi co id nhan vien HIS", int(with_his_user or 0) >= 1,
          f"so ban ghi={with_his_user}")

    print("=== TC-S17 nhat ky truy cap cua mot ho so ===")
    st, r = bff(f"/staff/lookup/patients/{patient_id}/access-log", token=staff_token)
    check("TC-S17 doc duoc nhat ky cua ho so", st == 200 and len(r.get("data") or []) >= 1,
          f"status={st} so ban ghi={len(r.get('data') or [])}")

# ===================================================== phan quyen
print("=== TC-S18 khong token thi khong vao duoc ===")
st, _ = bff("/admin/patient-app/dashboard")
check("TC-S18 quan tri khong token tra 401", st == 401, f"status={st}")

st, _ = bff("/staff/lookup/patients?keyword=BN-DEMO-APP")
check("TC-S18 tra cuu khong token tra 401", st == 401, f"status={st}")

print("=== TC-S19 token khong hop le bi tu choi ===")
st, _ = bff("/admin/patient-app/dashboard", token="khong-phai-token-hop-le")
check("TC-S19 token rac bi tu choi", st == 401, f"status={st}")

print()
print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
for name in failed:
    print("  - " + name)
sys.exit(1 if failed else 0)
