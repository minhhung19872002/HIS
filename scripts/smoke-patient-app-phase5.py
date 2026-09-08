#!/usr/bin/env python3
"""Smoke test Phase 5 — quan ly gia dinh va vi giay to (HSMT I.2 #7, #8).

Chay:  PYTHONIOENCODING=utf-8 python scripts/smoke-patient-app-phase5.py

Yeu cau: HIS 5106, BFF 5200 (Development), postgres, da chay seed demo.
"""
import hashlib
import io
import json
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

BFF = "http://localhost:5200/api/v1/patient"
PG_CONTAINER = "his-patientapp-postgres"

DEMO_PATIENT_CODE = "BN-DEMO-APP"
DEMO_PHONE = "0900000001"
DEMO_IDENTITY = "001075000001"       # so CCCD tren ho so demo
DEMO_DOB = "1975-04-12"
PASSWORD = "MatKhau@123"

passed, failed = [], []


def _request(method, path, body=None, token=None, raw_body=None, content_type=None):
    req = urllib.request.Request(BFF + path, method=method)
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
            payload = r.read()
            ctype = r.headers.get("Content-Type", "")
            if "application/json" in ctype:
                return r.status, json.loads(payload.decode()), payload
            return r.status, {}, payload
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            return e.status, json.loads(payload.decode()), payload
        except (json.JSONDecodeError, UnicodeDecodeError):
            return e.status, {}, payload


# Chinh sach Otp cua may chu la 5 lan / 10 phut / IP. Cho 62s khong du de qua cua so do,
# nen moi loi goi di qua chinh sach nay phai cho het cua so.
OTP_POLICY_PATHS = ("/auth/request-otp", "/family/members")


def call(method, path, body=None, token=None, wait_seconds=None, **kw):
    if wait_seconds is None:
        wait_seconds = 610 if any(p in path for p in OTP_POLICY_PATHS) else 62
    st, js, raw = _request(method, path, body, token, **kw)
    if st == 429:
        print(f"  ... bi gioi han tan suat (dung nhu thiet ke), cho {wait_seconds}s")
        time.sleep(wait_seconds)
        st, js, raw = _request(method, path, body, token, **kw)
    return st, js, raw


def check(name, condition, detail=""):
    (passed if condition else failed).append(name)
    print(("  PASS  " if condition else "  FAIL  ") + name + (" | " + detail if detail else ""))


def psql(sql):
    out = subprocess.run(
        ["docker", "exec", PG_CONTAINER, "psql", "-U", "patientapp", "-d", "his_patientapp",
         "-t", "-A", "-c", sql],
        capture_output=True, text=True, check=True)
    return out.stdout.strip()


def latest_otp(purpose=None):
    where = f" WHERE \"Purpose\" = '{purpose}'" if purpose else ""
    digest = psql(f'SELECT "CodeHash" FROM otp_challenges{where} ORDER BY "CreatedAt" DESC LIMIT 1')
    for i in range(1_000_000):
        code = "%06d" % i
        if hashlib.sha256(code.encode()).hexdigest() == digest:
            return code
    raise RuntimeError("Khong do nguoc duoc ma OTP.")


def register(phone, patient_code=None, device_key="smoke-phase5"):
    st, _, _ = call("POST", "/auth/request-otp", {"phoneNumber": phone, "purpose": "register"})
    if st != 200:
        return None, f"request-otp status={st}"

    body = {
        "phoneNumber": phone, "otpCode": latest_otp("register"), "password": PASSWORD,
        "fullName": "Nguoi dung Phase5",
        "device": {"deviceKey": device_key, "deviceName": "Phase5", "platform": "android"},
    }
    if patient_code:
        body["patientCode"] = patient_code

    st, r, _ = call("POST", "/auth/register", body)
    return (r.get("data") or {}).get("token"), f"status={st} {r.get('message')}"


def multipart(fields, file_field, file_name, file_bytes, file_type):
    """Dung than yeu cau multipart bang tay — bo test khong phu thuoc thu vien ngoai."""
    boundary = "----smoke" + uuid.uuid4().hex
    buf = io.BytesIO()

    for key, value in fields.items():
        buf.write(f"--{boundary}\r\n".encode())
        buf.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        buf.write(f"{value}\r\n".encode())

    buf.write(f"--{boundary}\r\n".encode())
    buf.write(
        f'Content-Disposition: form-data; name="{file_field}"; filename="{file_name}"\r\n'.encode())
    buf.write(f"Content-Type: {file_type}\r\n\r\n".encode())
    buf.write(file_bytes)
    buf.write(b"\r\n")
    buf.write(f"--{boundary}--\r\n".encode())

    return buf.getvalue(), f"multipart/form-data; boundary={boundary}"


# PNG 1x1 hop le, du de may chu nhan la anh that.
PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000100ffff03000006000557bfabd400"
    "00000049454e44ae426082")

# =========================================================== chuan bi
print("=== chuan bi: hai tai khoan ===")
owner_phone = "09" + "".join(random.choice("0123456789") for _ in range(8))
owner_token, detail = register(owner_phone, None, "smoke-p5-owner")
check("dang ky tai khoan chu ho", bool(owner_token), detail)
if not owner_token:
    sys.exit(1)

# =========================================================== VI GIAY TO
print("=== TC-V01 vi giay to luc dau rong ===")
st, r, _ = call("GET", "/documents", token=owner_token)
wallet = r.get("data") or {}
check("TC-V01 doc duoc vi", st == 200, f"status={st}")
check("TC-V01 vi rong", (wallet.get("items") or []) == [], f"so giay to={len(wallet.get('items') or [])}")
check("TC-V01 co han muc dung luong", (wallet.get("quotaBytes") or 0) > 0,
      f"quota={wallet.get('quotaBytes')} maxFile={wallet.get('maxFileBytes')}")

print("=== TC-V02 them mot giay to ===")
body, ctype = multipart(
    {"category": "InsuranceCard", "title": "The BHYT cua toi", "note": "Han 31/12/2026"},
    "file", "bhyt.png", PNG_1PX, "image/png")
st, r, _ = call("POST", "/documents", token=owner_token, raw_body=body, content_type=ctype)
doc = r.get("data") or {}
check("TC-V02 luu duoc giay to", st == 200 and bool(doc.get("id")), f"status={st} {r.get('message')}")
check("TC-V02 giu dung loai va ten", doc.get("category") == "InsuranceCard"
      and doc.get("title") == "The BHYT cua toi",
      f"{doc.get('category')} / {doc.get('title')}")

document_id = doc.get("id")

if document_id:
    print("=== TC-V03 noi dung khong nam tho tren dia ===")
    stored = psql(f"SELECT \"StoragePath\" FROM app_documents WHERE \"Id\" = '{document_id}'")
    check("TC-V03 CSDL chi giu duong dan, khong giu noi dung", bool(stored), f"path={stored}")

    # Doc thang tep tren dia: phai KHONG ra byte goc cua anh PNG.
    on_disk = subprocess.run(
        ["python", "-c",
         "import sys,pathlib;p=pathlib.Path(sys.argv[1]);"
         "sys.stdout.write(p.read_bytes().hex() if p.exists() else '')",
         f"backend/src/HIS.PatientApp.Api/vault/{stored}"],
        capture_output=True, text=True).stdout

    check("TC-V03 tep tren dia da duoc ma hoa",
          on_disk != "" and not on_disk.startswith("89504e47"),
          f"12 byte dau={on_disk[:24] or '(khong doc duoc tep)'}")

    print("=== TC-V04 tai lai noi dung qua API thi ra dung anh goc ===")
    st, _, raw = call("GET", f"/documents/{document_id}/content", token=owner_token)
    check("TC-V04 giai ma dung", st == 200 and raw == PNG_1PX,
          f"status={st} {len(raw)} byte")

    print("=== TC-V05 giay to cua nguoi khac ===")
    other_phone = "09" + "".join(random.choice("0123456789") for _ in range(8))
    other_token, detail = register(other_phone, None, "smoke-p5-other")
    check("dang ky tai khoan thu hai", bool(other_token), detail)

    if other_token:
        st, _, _ = call("GET", f"/documents/{document_id}/content", token=other_token)
        check("TC-V05 khong doc duoc giay to cua nguoi khac", st == 404, f"status={st}")

        st, _, _ = call("DELETE", f"/documents/{document_id}", token=other_token)
        check("TC-V05 khong xoa duoc giay to cua nguoi khac", st == 404, f"status={st}")

        st, r, _ = call("GET", "/documents", token=other_token)
        check("TC-V05 vi nguoi khac van rong", (r.get("data") or {}).get("items") == [])

print("=== TC-V06 tu choi loai tep khong hop le ===")
body, ctype = multipart({"category": "Other"}, "file", "virus.exe", b"MZ\x90\x00", "application/x-msdownload")
st, r, _ = call("POST", "/documents", token=owner_token, raw_body=body, content_type=ctype)
check("TC-V06 chan tep khong phai anh/PDF", st == 400, f"status={st} {r.get('message')}")

print("=== TC-V07 xoa giay to ===")
if document_id:
    st, r, _ = call("DELETE", f"/documents/{document_id}", token=owner_token)
    check("TC-V07 xoa thanh cong", st == 200, f"status={st} {r.get('message')}")

    st, r, _ = call("GET", "/documents", token=owner_token)
    check("TC-V07 vi rong tro lai", (r.get("data") or {}).get("items") == [])

print("=== TC-V08 goi khi chua dang nhap ===")
st, _, _ = call("GET", "/documents")
check("TC-V08 khong token tra 401", st == 401, f"status={st}")

# =========================================================== GIA DINH
print("=== TC-G01 danh sach gia dinh luc dau ===")
st, r, _ = call("GET", "/family/members", token=owner_token)
family = r.get("data") or {}
check("TC-G01 doc duoc danh sach", st == 200, f"status={st}")
check("TC-G01 tran 20 thanh vien", family.get("maxMembers") == 20, f"max={family.get('maxMembers')}")
check("TC-G01 chua co thanh vien nao", (family.get("items") or []) == [])

print("=== TC-G02 them nguoi than chua co tai khoan app ===")
# Xoa tai khoan gan voi ho so demo de no khong co tai khoan app -> di duong xac minh CCCD.
psql("DELETE FROM app_accounts WHERE \"PhoneNumber\" = '+84900000001'")

st, r, _ = call("POST", "/family/members",
                {"patientCode": DEMO_PATIENT_CODE, "relationship": "Cha"}, token=owner_token)
add_result = r.get("data") or {}
check("TC-G02 tao duoc yeu cau ket noi", st == 200 and bool(add_result.get("linkId")),
      f"status={st} {r.get('message')}")
check("TC-G02 chon dung cach xac minh bang giay to",
      add_result.get("verificationMethod") == "identity_data",
      add_result.get("verificationMethod"))

link_id = add_result.get("linkId")

if link_id:
    print("=== TC-G03 chua xac minh thi CHUA xem duoc gi ===")
    st, r, _ = call("GET", f"/results/lab?memberId={link_id}", token=owner_token)
    check("TC-G03 lien ket chua xac minh bi chan", st == 404, f"status={st} {r.get('message')}")

    print("=== TC-G04 xac minh sai thong tin ===")
    st, r, _ = call("POST", f"/family/members/{link_id}/verify",
                    {"identityData": "000000000000"}, token=owner_token)
    check("TC-G04 thong tin sai bi tu choi", st == 400, f"status={st} {r.get('message')}")

    print("=== TC-G05 xac minh dung so CCCD ===")
    st, r, _ = call("POST", f"/family/members/{link_id}/verify",
                    {"identityData": DEMO_IDENTITY}, token=owner_token)
    check("TC-G05 xac minh thanh cong", st == 200, f"status={st} {r.get('message')}")

    st, r, _ = call("GET", "/family/members", token=owner_token)
    member = ((r.get("data") or {}).get("items") or [{}])[0]
    check("TC-G05 trang thai da xac minh", member.get("status") == "Verified", member.get("status"))
    check("TC-G05 co ten nguoi than tu HIS", bool(member.get("name")), member.get("name"))

    print("=== TC-G06 xem duoc ket qua cua nguoi than ===")
    st, r, _ = call("GET", f"/results/lab?memberId={link_id}", token=owner_token)
    member_labs = r.get("data") or []
    check("TC-G06 doc duoc xet nghiem cua nguoi than", st == 200 and len(member_labs) >= 1,
          f"status={st} so phieu={len(member_labs)}")

    st, r, _ = call("GET", f"/results/admissions?memberId={link_id}", token=owner_token)
    check("TC-G06 doc duoc dot nam vien cua nguoi than",
          st == 200 and len(r.get("data") or []) >= 1, f"status={st}")

    print("=== TC-G07 nhat ky ghi dung ai xem ho so cua ai ===")
    rows = psql(
        "SELECT COUNT(*) FROM access_audit_logs a "
        "JOIN app_family_links f ON f.\"MemberPatientId\" = a.\"TargetPatientId\" "
        f"WHERE f.\"Id\" = '{link_id}' AND a.\"ActorAccountId\" = f.\"OwnerAccountId\" "
        "AND a.\"Action\" LIKE 'view_%'")
    check("TC-G07 co ban ghi nguoi nha xem ho so nguoi than", int(rows or 0) >= 1,
          f"so ban ghi={rows}")

    print("=== TC-G08 tat quyen xem thi mat quyen ngay ===")
    st, _, _ = call("PUT", f"/family/members/{link_id}/permissions",
                    {"canViewResults": False, "canBookAppointments": True,
                     "canTakeQueueNumber": True}, token=owner_token)
    st, _, _ = call("GET", f"/results/lab?memberId={link_id}", token=owner_token)
    check("TC-G08 tat quyen xem la chan ngay", st == 404, f"status={st}")

    # Bat lai de kiem buoc go
    call("PUT", f"/family/members/{link_id}/permissions",
         {"canViewResults": True, "canBookAppointments": True, "canTakeQueueNumber": True},
         token=owner_token)

    print("=== TC-G09 go ket noi thi mat quyen ngay ===")
    st, r, _ = call("DELETE", f"/family/members/{link_id}", token=owner_token)
    check("TC-G09 go thanh cong", st == 200, f"status={st} {r.get('message')}")

    st, _, _ = call("GET", f"/results/lab?memberId={link_id}", token=owner_token)
    check("TC-G09 go xong la khong xem duoc nua", st == 404, f"status={st}")

    st, r, _ = call("GET", "/family/members", token=owner_token)
    check("TC-G09 khong con trong danh sach", (r.get("data") or {}).get("items") == [])

print("=== TC-G10 memberId cua nguoi khac ===")
if link_id:
    other2_phone = "09" + "".join(random.choice("0123456789") for _ in range(8))
    other2_token, detail = register(other2_phone, None, "smoke-p5-third")
    if other2_token:
        st, _, _ = call("GET", f"/results/lab?memberId={link_id}", token=other2_token)
        check("TC-G10 khong dung duoc lien ket cua nguoi khac", st == 404, f"status={st}")

print("=== TC-G11 khong tu ket noi voi chinh minh ===")
linked_phone = "09" + "".join(random.choice("0123456789") for _ in range(8))
psql(f"DELETE FROM app_accounts WHERE \"PhoneNumber\" = '+84900000001'")
self_token, detail = register(DEMO_PHONE, DEMO_PATIENT_CODE, "smoke-p5-self")
if self_token:
    st, r, _ = call("POST", "/family/members", {"patientCode": DEMO_PATIENT_CODE}, token=self_token)
    check("TC-G11 tu ket noi voi chinh minh bi chan", st == 400, f"status={st} {r.get('message')}")

print("=== TC-G12 nguoi than CO tai khoan app thi phai co OTP cua ho ===")
if self_token:
    st, r, _ = call("POST", "/family/members",
                    {"patientCode": DEMO_PATIENT_CODE, "relationship": "Cha"}, token=owner_token)
    result = r.get("data") or {}
    check("TC-G12 chon dung duong xac minh bang OTP",
          result.get("verificationMethod") == "member_otp", result.get("verificationMethod"))
    check("TC-G12 co che so dien thoai", bool(result.get("maskedPhone")), result.get("maskedPhone"))

    otp_link = result.get("linkId")
    if otp_link:
        st, r, _ = call("POST", f"/family/members/{otp_link}/verify",
                        {"otpCode": "000000"}, token=owner_token)
        check("TC-G12 ma sai bi tu choi", st == 400, f"status={st} {r.get('message')}")

        st, r, _ = call("POST", f"/family/members/{otp_link}/verify",
                        {"otpCode": latest_otp("family_link")}, token=owner_token)
        check("TC-G12 ma dung thi ket noi duoc", st == 200, f"status={st} {r.get('message')}")

print()
print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
for name in failed:
    print("  - " + name)
sys.exit(1 if failed else 0)
