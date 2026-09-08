#!/usr/bin/env python3
"""Smoke test Phase 7 — cau hinh phat hanh va xoa tai khoan.

Chay:  PYTHONIOENCODING=utf-8 python scripts/smoke-patient-app-phase7.py

Yeu cau: HIS 5106, BFF 5200 (Development), postgres.
"""
import hashlib
import io
import json
import os
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

BFF = "http://localhost:5200/api/v1/patient"
# /app-config nam NGOAI nhanh /patient vi app phai doc duoc truoc khi dang nhap.
ROOT = "http://localhost:5200/api/v1"
PG_CONTAINER = "his-patientapp-postgres"
HIS = "http://localhost:5106"
PASSWORD = "MatKhau@123"

passed, failed = [], []


def _request(method, path, body=None, token=None, raw_body=None, content_type=None):
    # /app-config va /admin/* nam NGOAI nhanh /patient: mot cai app phai doc duoc truoc khi dang
    # nhap, cai kia la cong cua nhan vien chu khong phai cua nguoi benh.
    base = ROOT if path.startswith(("/app-config", "/admin/")) else BFF
    req = urllib.request.Request(base + path, method=method)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    if raw_body is not None:
        req.add_header("Content-Type", content_type)
        data = raw_body
    else:
        req.add_header("Content-Type", "application/json")
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


def call(method, path, body=None, token=None, wait_seconds=62, **kw):
    st, payload = _request(method, path, body, token, **kw)
    if st == 429:
        print(f"  ... bi gioi han tan suat (dung nhu thiet ke), cho {wait_seconds}s")
        time.sleep(wait_seconds)
        st, payload = _request(method, path, body, token, **kw)
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


def latest_otp(purpose="register"):
    digest = psql(f"SELECT \"CodeHash\" FROM otp_challenges WHERE \"Purpose\" = '{purpose}' "
                  'ORDER BY "CreatedAt" DESC LIMIT 1')
    for i in range(1_000_000):
        code = "%06d" % i
        if hashlib.sha256(code.encode()).hexdigest() == digest:
            return code
    raise RuntimeError("Khong do nguoc duoc ma OTP.")


def his_call(method, path, body=None, token=None):
    """Goi THANG HIS Core (khong qua BFF) — dung cho cac ca kiem tra pham vi token."""
    req = urllib.request.Request(HIS + path, method=method)
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


def sqlcmd(sql):
    out = subprocess.run(
        ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
         "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
         "-h", "-1", "-W", "-s", "|", "-Q", "SET NOCOUNT ON; " + sql],
        capture_output=True, text=True, env={"MSYS_NO_PATHCONV": "1", "PATH": os.environ["PATH"]})
    return out.stdout.strip()


def register(phone, device_key="smoke-phase7"):
    st, _ = call("POST", "/auth/request-otp", {"phoneNumber": phone, "purpose": "register"},
                 wait_seconds=610)
    if st != 200:
        return None, f"request-otp status={st}"
    st, r = call("POST", "/auth/register", {
        "phoneNumber": phone, "otpCode": latest_otp(), "password": PASSWORD,
        "fullName": "Nguoi dung Phase7",
        "device": {"deviceKey": device_key, "deviceName": "Phase7", "platform": "android"},
    })
    return (r.get("data") or {}).get("token"), f"status={st} {r.get('message')}"


def multipart(fields, file_name, file_bytes, file_type):
    boundary = "----smoke" + uuid.uuid4().hex
    buf = io.BytesIO()
    for key, value in fields.items():
        buf.write(f"--{boundary}\r\n".encode())
        buf.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        buf.write(f"{value}\r\n".encode())
    buf.write(f"--{boundary}\r\n".encode())
    buf.write(f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'.encode())
    buf.write(f"Content-Type: {file_type}\r\n\r\n".encode())
    buf.write(file_bytes)
    buf.write(b"\r\n")
    buf.write(f"--{boundary}--\r\n".encode())
    return buf.getvalue(), f"multipart/form-data; boundary={boundary}"


PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000100ffff03000006000557bfabd400"
    "00000049454e44ae426082")

# ================================================ cau hinh phat hanh
print("=== TC-P01 app doc duoc cau hinh phat hanh khi CHUA dang nhap ===")
st, r = call("GET", "/app-config?platform=android&version=1.0.0")
config = r.get("data") or {}
check("TC-P01 doc duoc khi chua dang nhap", st == 200, f"status={st}")
check("TC-P01 co phien ban toi thieu va moi nhat",
      bool(config.get("minimumVersion")) and bool(config.get("latestVersion")),
      f"min={config.get('minimumVersion')} latest={config.get('latestVersion')}")
check("TC-P01 co duong toi kho ung dung", bool(config.get("storeUrl")), config.get("storeUrl"))

print("=== TC-P02 ban dung phien ban toi thieu thi KHONG bi chan ===")
minimum = config.get("minimumVersion") or "1.0.0"
st, r = call("GET", f"/app-config?platform=android&version={minimum}")
check("TC-P02 khong buoc cap nhat", (r.get("data") or {}).get("updateRequired") is False,
      f"updateRequired={(r.get('data') or {}).get('updateRequired')}")

print("=== TC-P03 ban cu hon phien ban toi thieu thi BI chan ===")
st, r = call("GET", "/app-config?platform=android&version=0.0.1")
check("TC-P03 buoc cap nhat", (r.get("data") or {}).get("updateRequired") is True,
      f"updateRequired={(r.get('data') or {}).get('updateRequired')}")

print("=== TC-P04 phien ban sai dinh dang thi KHONG chan ai ===")
st, r = call("GET", "/app-config?platform=android&version=khong-phai-phien-ban")
check("TC-P04 khong chan khi khong doc duoc phien ban",
      (r.get("data") or {}).get("updateRequired") is False,
      f"updateRequired={(r.get('data') or {}).get('updateRequired')}")

st, r = call("GET", "/app-config?platform=android")
check("TC-P04 khong gui phien ban cung khong bi chan",
      (r.get("data") or {}).get("updateRequired") is False)

print("=== TC-P05 iOS va Android doc rieng ===")
st, r = call("GET", "/app-config?platform=ios&version=1.0.0")
check("TC-P05 iOS tra ve duong App Store",
      "apple.com" in ((r.get("data") or {}).get("storeUrl") or ""),
      (r.get("data") or {}).get("storeUrl"))

# ==================================================== xoa tai khoan
print("=== chuan bi: tai khoan de xoa ===")
phone = "09" + "".join(random.choice("0123456789") for _ in range(8))
token, detail = register(phone, "smoke-p7-delete")
check("dang ky tai khoan", bool(token), detail)

if not token:
    print()
    print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
    sys.exit(1)

normalized = "+84" + phone[1:]

# Them mot giay to de kiem tep tren dia cung bi don
body, ctype = multipart({"category": "Other", "title": "Anh thu"}, "a.png", PNG_1PX, "image/png")
st, r = call("POST", "/documents", token=token, raw_body=body, content_type=ctype)
document_id = (r.get("data") or {}).get("id")
stored_path = psql(f"SELECT \"StoragePath\" FROM app_documents WHERE \"Id\" = '{document_id}'") \
    if document_id else ""

print("=== TC-P06 xem truoc nhung gi se mat ===")
st, r = call("GET", "/account/deletion-preview", token=token)
preview = r.get("data") or {}
check("TC-P06 doc duoc ban xem truoc", st == 200, f"status={st}")
check("TC-P06 dem dung so thiet bi", (preview.get("devices") or 0) >= 1,
      f"devices={preview.get('devices')}")
check("TC-P06 dem dung so giay to", (preview.get("documents") or 0) >= 1,
      f"documents={preview.get('documents')}")

print("=== TC-P07 sai mat khau thi khong xoa duoc ===")
st, r = call("DELETE", "/account", {"password": "sai-mat-khau"}, token=token)
check("TC-P07 sai mat khau bi tu choi", st == 400, f"status={st} {r.get('message')}")
check("TC-P07 tai khoan van con",
      psql(f"SELECT COUNT(*) FROM app_accounts WHERE \"PhoneNumber\" = '{normalized}'") == "1")

print("=== TC-P08 xoa tai khoan ===")
st, r = call("DELETE", "/account", {"password": PASSWORD}, token=token)
check("TC-P08 xoa thanh cong", st == 200, f"status={st} {r.get('message')}")
check("TC-P08 thong diep noi ro ho so benh an duoc giu",
      "hồ sơ bệnh án" in (r.get("message") or "").lower(), r.get("message"))

check("TC-P08 tai khoan da bien mat",
      psql(f"SELECT COUNT(*) FROM app_accounts WHERE \"PhoneNumber\" = '{normalized}'") == "0")

print("=== TC-P09 du lieu keo theo cung bi xoa ===")
check("TC-P09 giay to trong CSDL da xoa",
      document_id is None
      or psql(f"SELECT COUNT(*) FROM app_documents WHERE \"Id\" = '{document_id}'") == "0")

if stored_path:
    on_disk = subprocess.run(
        ["python", "-c",
         "import sys,pathlib;print('CON' if pathlib.Path(sys.argv[1]).exists() else 'DA XOA')",
         f"backend/src/HIS.PatientApp.Api/vault/{stored_path}"],
        capture_output=True, text=True).stdout.strip()
    check("TC-P09 tep tren dia cung da bi don", on_disk == "DA XOA", on_disk)

print("=== TC-P10 token cu chet ngay sau khi xoa ===")
st, _ = call("GET", "/documents", token=token)
check("TC-P10 token cu khong dung duoc nua", st in (401, 404), f"status={st}")

print("=== TC-P11 nhat ky truy cap KHONG bi xoa theo ===")
rows = psql("SELECT COUNT(*) FROM access_audit_logs")
check("TC-P11 nhat ky van con", int(rows or 0) >= 1, f"so ban ghi={rows}")

# ===================================== Q3: nhot token cong ngoai (README Sec 6.1)
# Ba controller ExaminationComplete/LISComplete/Pdf chi khai [Authorize] tran, khong kiem id thuoc
# ve benh nhan nao. Rao chan la ExternalActorScopeMiddleware: token mang role cong ngoai chi di duoc
# trong tien to route cua cong do. Kiem lai bang chinh token that, khong tin vao doc ma.
print("=== TC-S01 chuan bi token nguoi benh that tu HIS ===")
patient = sqlcmd("SELECT TOP 1 CAST(p.Id AS varchar(40)), p.PatientCode, p.IdentityNumber, "
                 "CONVERT(varchar(10), p.DateOfBirth, 120) FROM Patients p "
                 "WHERE p.PatientCode = 'BN-DEMO-APP'").split("|")
portal_token = None
if len(patient) == 4:
    patient_id, patient_code, id_number, dob = (x.strip() for x in patient)
    email = f"scope-{uuid.uuid4().hex[:8]}@example.com"
    st, r = his_call("POST", "/api/portal/register", {
        "fullName": "Kiem tra pham vi", "email": email, "phone": "09" + uuid.uuid4().hex[:8].translate(
            str.maketrans("abcdef", "012345")),
        "idNumber": id_number, "dateOfBirth": dob + "T00:00:00", "password": PASSWORD})
    account_id = ((r.get("data") or {}).get("id"))
    if account_id:
        his_call("POST", "/api/portal/account/link-record", {
            "accountId": account_id, "patientCode": patient_code, "verificationData": id_number})
    st, r = his_call("POST", "/api/portal/login", {"identifier": email, "password": PASSWORD})
    portal_token = ((r.get("data") or {}).get("token"))

check("TC-S01 dang nhap duoc bang tai khoan nguoi benh", bool(portal_token))

if portal_token:
    exam_id = sqlcmd("SELECT TOP 1 CAST(e.Id AS varchar(40)) FROM Examinations e "
                     "JOIN MedicalRecords m ON m.Id = e.MedicalRecordId "
                     f"WHERE m.PatientId = '{patient_id}'").strip()

    print("=== TC-S02 token nguoi benh KHONG voi duoc sang route nhan vien ===")
    # Deu la nhung route giau du lieu, deu nhan id tu ben goi va deu khong tu kiem chu so huu.
    staff_routes = [
        f"/api/examination/{exam_id}/medical-record",
        f"/api/examination/{exam_id}/lab-results",
        f"/api/LISComplete/patients/{patient_id}/history",
        f"/api/pdf/lab-result/{exam_id}",
        "/api/reception/opd-flow-stats",
    ]
    for path in staff_routes:
        st, r = his_call("GET", path, token=portal_token)
        check(f"TC-S02 bi chan: {path.split('?')[0]}",
              st == 403 and r.get("error") == "OUT_OF_PORTAL_SCOPE",
              f"status={st} error={r.get('error')}")

    print("=== TC-S03 nhung van dung duoc cong cua chinh minh ===")
    st, _ = his_call("GET", f"/api/portal/visits?patientId={patient_id}", token=portal_token)
    check("TC-S03 vao duoc /api/portal", st == 200, f"status={st}")

    print("=== TC-S04 doi patientId sang nguoi khac thi bi tu choi ===")
    other = sqlcmd("SELECT TOP 1 CAST(Id AS varchar(40)) FROM Patients "
                   f"WHERE Id <> '{patient_id}'").strip()
    st, _ = his_call("GET", f"/api/portal/visits?patientId={other}", token=portal_token)
    check("TC-S04 hoi ho so nguoi khac bi tu choi", st == 403, f"status={st}")

# ============================ buoc doi mat khau lan dau — CHAN O SERVER (HSMT I.2.9.1)
# Cai dang kiem o day KHONG phai man hinh doi mat khau, ma la: app bi sua de bo qua man do thi
# server co con chan khong. An nut khong phai la chan.
print("=== TC-S05 tai khoan bi buoc doi mat khau thi khong goi duoc API nao khac ===")
phone2 = "09" + "".join(random.choice("0123456789") for _ in range(8))
token2, detail2 = register(phone2, "smoke-p7-forcepwd")
check("TC-S05 dang ky tai khoan thu hai", bool(token2), detail2)

if token2:
    normalized2 = "+84" + phone2[1:]
    account2 = psql(f"SELECT \"Id\" FROM app_accounts WHERE \"PhoneNumber\" = '{normalized2}'")

    st, r = his_call("POST", "/api/auth/login", {"username": "admin", "password": "Admin@123"})
    staff_token = ((r.get("data") or {}).get("token")) or r.get("token")
    check("TC-S05 nhan vien dang nhap duoc HIS", bool(staff_token), f"status={st}")

    st, r = call("POST", f"/admin/patient-app/accounts/{account2}/reset-password",
                 {"reason": "Kiem tra buoc doi mat khau"}, token=staff_token)
    temporary = (r.get("data") or {}).get("temporaryPassword")
    check("TC-S05 quan tri dat lai duoc mat khau", st == 200 and bool(temporary),
          f"status={st} {r.get('message')}")

    if temporary:
        st, r = call("POST", "/auth/login", {
            "phoneNumber": phone2, "password": temporary,
            "device": {"deviceKey": "smoke-p7-forcepwd", "deviceName": "Phase7",
                       "platform": "android"}})
        temp_token = (r.get("data") or {}).get("token")
        check("TC-S05 dang nhap duoc bang mat khau tam", bool(temp_token), f"status={st}")
        account_block = ((r.get("data") or {}).get("account") or {})
        check("TC-S05 server bao ro dang bi buoc doi mat khau",
              account_block.get("mustChangePassword") is True,
              f"mustChangePassword={account_block.get('mustChangePassword')}")

        if temp_token:
            # Duong nao cung phai bi chan, khong chi rieng man hinh chinh.
            for path in ["/documents", "/results/lab", "/queue/tickets", "/notifications"]:
                st, r = call("GET", path, token=temp_token)
                check(f"TC-S05 bi chan: {path}",
                      st == 403 and r.get("error") == "PASSWORD_CHANGE_REQUIRED",
                      f"status={st} error={r.get('error')}")

            # ... tru dung ba duong can de thoat ra khoi trang thai do.
            st, _ = call("GET", "/auth/me", token=temp_token)
            check("TC-S05 van xem duoc thong tin tai khoan de biet minh la ai", st == 200,
                  f"status={st}")

            st, r = call("POST", "/auth/change-password",
                         {"currentPassword": temporary, "newPassword": PASSWORD},
                         token=temp_token)
            new_token = (r.get("data") or {}).get("token")
            check("TC-S05 doi duoc mat khau", st == 200 and bool(new_token),
                  f"status={st} {r.get('message')}")

            if new_token:
                st, _ = call("GET", "/documents", token=new_token)
                check("TC-S05 doi xong thi di lai binh thuong", st == 200, f"status={st}")

print()
print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
for name in failed:
    print("  - " + name)
sys.exit(1 if failed else 0)
