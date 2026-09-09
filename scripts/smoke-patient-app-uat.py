#!/usr/bin/env python3
"""Kiem TOAN BO chuc nang app nguoi benh tren BAN DANG CHAY THAT (UAT).

Khac moi bo smoke khac trong thu muc nay o mot diem quan trong: no khong dung may chu giat tren
may dev, ma ban tha ng vao he thong that qua HTTPS cong khai — dung duong ma app tren dien thoai
cua nguoi benh di. Nho vay no bat duoc nhung thu chi hong o moi truong that: proxy dinh tuyen sai,
chung chi, CORS, cau hinh khac giua may dev va may chu.

Chay:
    PYTHONIOENCODING=utf-8 python scripts/smoke-patient-app-uat.py
    PYTHONIOENCODING=utf-8 python scripts/smoke-patient-app-uat.py https://mot-ban-khac/api/v1

Can quyen SSH toi VM de doc ma OTP trong log (ban UAT chua co cong SMS). Khong co SSH thi bo test
tu bo qua phan can dang ky va noi ro.
"""
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://patient.bluestar.com.vn/api/v1").rstrip("/")
VM = "hung@14.225.83.93"
PASSWORD = "MatKhau@123"

passed, failed, skipped = [], [], []


def call(method, path, body=None, token=None, raw=None, content_type=None, timeout=45):
    url = BASE + path
    req = urllib.request.Request(url, method=method)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    if raw is not None:
        req.add_header("Content-Type", content_type)
        data = raw
    else:
        req.add_header("Content-Type", "application/json; charset=utf-8")
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=timeout) as r:
            payload = r.read()
            return r.status, (json.loads(payload.decode("utf-8")) if payload else {})
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            return e.status, json.loads(payload.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return e.status, {}
    except Exception as e:  # noqa: BLE001 — mang hong cung la mot ket qua can bao
        return 0, {"error": str(e)}


def check(name, ok, detail=""):
    (passed if ok else failed).append(name)
    print(("  DAT   " if ok else "  HONG  ") + name + (" | " + detail if detail else ""))
    return ok


def skip(name, why):
    skipped.append(name)
    print(f"  BO QUA {name} | {why}")


def section(title):
    print()
    print("=" * 78)
    print("  " + title)
    print("=" * 78)


def data_of(payload):
    return (payload or {}).get("data")


def latest_otp():
    """Doc ma OTP tu log container — ban UAT chay che do in-log vi chua co cong SMS."""
    try:
        out = subprocess.run(
            ["ssh", "-o", "BatchMode=yes", VM,
             "docker logs patientapp-api 2>&1 | grep '\\[DEV\\] OTP' | tail -1"],
            capture_output=True, text=True, timeout=60)
        import re
        found = re.findall(r"\b(\d{6})\b", out.stdout)
        return found[-1] if found else None
    except Exception:
        return None


def new_phone():
    import random
    return "09" + "".join(random.choice("0123456789") for _ in range(8))


# =============================================================== ha tang
section("HA TANG — duong cong khai, chung chi, dinh tuyen")

st, body = call("GET", "/app-config?platform=android&version=1.0.0")
check("Doc duoc cau hinh phat hanh khi CHUA dang nhap", st == 200, f"HTTP {st}")
cfg = data_of(body) or {}
check("Cau hinh co phien ban toi thieu va duong toi kho ung dung",
      bool(cfg.get("minimumVersion")) and bool(cfg.get("storeUrl")))

st, _ = call("GET", "/patient/results/lab")
check("Goi API can dang nhap ma khong co token -> 401", st == 401, f"HTTP {st}")

st, _ = call("GET", "/patient/results/lab", token="khong-phai-token-that")
check("Token rac -> 401", st == 401, f"HTTP {st}")

# =============================================================== dang ky
section("I.2 #2 — DANG KY VA DANG NHAP")

phone = new_phone()
st, _ = call("POST", "/patient/auth/request-otp", {"phoneNumber": phone, "purpose": "register"})
have_otp = check("Xin ma OTP", st == 200, f"HTTP {st}")

otp = latest_otp() if have_otp else None
token = None
if otp is None:
    skip("Dang ky", "khong doc duoc ma OTP (can SSH toi VM)")
else:
    st, body = call("POST", "/patient/auth/register", {
        "phoneNumber": phone, "otpCode": otp, "password": PASSWORD,
        "fullName": "Kiem thu UAT",
        "device": {"deviceKey": "uat-" + uuid.uuid4().hex[:8],
                   "deviceName": "Smoke UAT", "platform": "android"},
    })
    token = (data_of(body) or {}).get("token")
    check("Dang ky tai khoan moi", st == 200 and bool(token), f"HTTP {st}")

    st, _ = call("POST", "/patient/auth/register", {
        "phoneNumber": phone, "otpCode": otp, "password": PASSWORD, "fullName": "Trung",
        "device": {"deviceKey": "x", "deviceName": "x", "platform": "android"}})
    check("Dung lai ma OTP cu -> bi tu choi", st != 200, f"HTTP {st}")

if token:
    st, body = call("POST", "/patient/auth/login", {
        "phoneNumber": phone, "password": PASSWORD,
        "device": {"deviceKey": "uat-login", "deviceName": "Smoke", "platform": "android"}})
    check("Dang nhap bang mat khau vua dat", st == 200, f"HTTP {st}")
    login = data_of(body) or {}
    check("Dang nhap tra ve token va refresh token",
          bool(login.get("token")) and bool(login.get("refreshToken")))

    st, _ = call("POST", "/patient/auth/login", {
        "phoneNumber": phone, "password": "SaiMatKhau@1",
        "device": {"deviceKey": "uat-login", "deviceName": "Smoke", "platform": "android"}})
    check("Sai mat khau -> 401", st == 401, f"HTTP {st}")

    st, body = call("GET", "/patient/auth/me", token=token)
    me = data_of(body) or {}
    check("Doc duoc thong tin tai khoan", st == 200, f"HTTP {st}")
    check("Tai khoan moi CHUA lien ket ho so benh nhan",
          me.get("isLinked") is False, f"isLinked={me.get('isLinked')}")

    if login.get("refreshToken"):
        st, body = call("POST", "/patient/auth/refresh", {"refreshToken": login["refreshToken"]})
        check("Lam moi phien bang refresh token", st == 200 and bool((data_of(body) or {}).get("token")),
              f"HTTP {st}")

if not token:
    print("\n>>> Khong co token — bo qua toan bo phan can dang nhap.")
else:
    # =========================================================== lay so thu tu
    section("I.2 #3 — LAY SO THU TU")

    st, body = call("GET", "/patient/queue/departments", token=token)
    deps = data_of(body) or []
    check("Danh muc khoa lay tu HIS", st == 200 and len(deps) > 0, f"{len(deps)} khoa")

    dep_id = deps[0]["id"] if deps else None
    if dep_id:
        st, body = call("GET", f"/patient/queue/rooms?departmentId={dep_id}", token=token)
        rooms = data_of(body) or []
        check("Danh sach phong kham kem so nguoi cho", st == 200, f"{len(rooms)} phong")

        if rooms:
            room_id = rooms[0]["roomId"]
            st, body = call("POST", "/patient/queue/take-number",
                            {"roomId": room_id, "priorityReason": 1}, token=token)
            ticket = data_of(body) or {}
            took = check("Lay so thu tu uu tien", st == 200 and bool(ticket.get("ticketCode")),
                         f"HTTP {st} {body.get('message') or ''}")

            if took:
                check("Ve mang so va phong", bool(ticket.get("queueNumber") is not None))
                check("Ve uu tien CHUA xac minh (quay se kiem)",
                      ticket.get("priorityVerified") is False)

                st, body = call("GET", "/patient/queue/tickets", token=token)
                tickets = data_of(body) or []
                check("Doc lai duoc so da lay trong ngay", st == 200 and len(tickets) > 0,
                      f"{len(tickets)} ve")

                tid = ticket.get("id")
                if tid:
                    st, body = call("GET", f"/patient/queue/tickets/{tid}/status", token=token)
                    stt = data_of(body) or {}
                    check("Xem trang thai ve: dang goi so nao, con bao nhieu nguoi",
                          st == 200 and "peopleAhead" in stt,
                          f"con truoc: {stt.get('peopleAhead')}, uoc {stt.get('estimatedWaitMinutes')} phut")

                st, _ = call("POST", "/patient/queue/take-number",
                             {"roomId": room_id, "priorityReason": 1}, token=token)
                check("Lay so lan hai cung phong trong ngay -> bi chan", st != 200, f"HTTP {st}")

    # ============================================================== dat kham
    section("I.2 #4 — DAT KHAM")

    st, body = call("GET", "/patient/appointments/departments", token=token)
    adeps = data_of(body) or []
    check("Danh muc khoa de dat kham", st == 200 and len(adeps) > 0, f"{len(adeps)} khoa")

    st, body = call("GET", "/patient/appointments", token=token)
    check("Danh sach lich hen (ban dau rong)", st == 200 and data_of(body) == [], f"HTTP {st}")

    if adeps:
        adep = adeps[0]["id"]
        from datetime import date, timedelta
        day = (date.today() + timedelta(days=3)).isoformat()

        st, body = call("GET", f"/patient/appointments/slots?departmentId={adep}&date={day}",
                        token=token)
        slots = data_of(body) or {}
        morning = slots.get("morningSlots") or []
        check("Khung gio doc tu lich truc bac si", st == 200 and len(morning) > 0,
              f"{len(morning)} khung buoi sang ngay {day}")

        if morning:
            st, body = call("POST", "/patient/appointments", {
                "departmentId": adep, "appointmentDate": day,
                "appointmentTime": morning[0]["startTime"], "reason": "Kiem thu UAT"}, token=token)
            booked = data_of(body) or {}
            code = booked.get("appointmentCode")
            ok = check("Dat lich kham", st == 200 and bool(code), f"HTTP {st} ma={code}")

            if ok:
                # DAY LA LOI CHU DAU TU BAO: dat xong nhung app khong thay lich.
                st, body = call("GET", "/patient/appointments", token=token)
                lst = data_of(body) or []
                check("Lich vua dat HIEN NGAY trong danh sach",
                      st == 200 and any(a.get("appointmentCode") == code for a in lst),
                      f"{len(lst)} lich")

                if lst:
                    a = lst[0]
                    check("Lich co du truong app can hien",
                          all(a.get(k) for k in ("appointmentCode", "appointmentDate")) and "status" in a,
                          ", ".join(k for k in ("appointmentCode", "appointmentDate", "appointmentTime",
                                                "departmentName", "statusName") if a.get(k)))

                st, body = call("PUT", f"/patient/appointments/{code}/cancel",
                                {"reason": "Kiem thu huy"}, token=token)
                check("Huy lich da dat", st == 200, f"HTTP {st} {body.get('message') or ''}")

    # =========================================================== ket qua kham
    section("I.2 #5, #6 — KET QUA KHAM (tai khoan chua lien ket ho so)")

    for label, path in [
        ("Lan kham", "/patient/results/visits"),
        ("Xet nghiem", "/patient/results/lab"),
        ("Chan doan hinh anh", "/patient/results/imaging"),
        ("Tham do chuc nang", "/patient/results/functional"),
        ("Don thuoc", "/patient/results/prescriptions"),
        ("Kham suc khoe hop dong", "/patient/results/health-checkups"),
        ("Dot dieu tri noi tru", "/patient/results/admissions"),
    ]:
        st, body = call("GET", path, token=token)
        # Tai khoan chua lien ket ho so thi 409 PATIENT_NOT_LINKED la hanh vi DUNG: app doc ma do de
        # hien "chua lien ket ho so" kem huong dan ra quay, thay vi mot danh sach trong vo nghia.
        # Dieu KHONG duoc phep la 500 — loi may chu thi app chi biet noi "khong tai duoc".
        ok = st in (200, 409) and st != 500
        detail = f"HTTP {st}"
        if st == 409:
            detail += f" {body.get('error')}"
            ok = body.get("error") == "PATIENT_NOT_LINKED"
        check(f"{label}: bao dung trang thai, khong loi may chu", ok, detail)

    # ============================================================== gia dinh
    section("I.2 #7 — QUAN LY GIA DINH")

    st, body = call("GET", "/patient/family/members", token=token)
    fam = data_of(body) or {}
    check("Danh sach nguoi than", st == 200, f"HTTP {st}")
    check("Muc tran 20 thanh vien theo HSMT", (fam.get("maxMembers") or 0) == 20,
          f"maxMembers={fam.get('maxMembers')}")

    st, body = call("POST", "/patient/family/members",
                    {"patientCode": "KHONG-CO-THAT", "relationship": "Me"}, token=token)
    check("Them nguoi than bang ma khong co that -> bi tu choi", st != 200, f"HTTP {st}")

    # =========================================================== vi giay to
    section("I.2 #8 — VI GIAY TO")

    st, body = call("GET", "/patient/documents", token=token)
    wallet = data_of(body) or {}
    check("Mo duoc vi giay to", st == 200, f"HTTP {st}")
    check("Vi co han muc dung luong", (wallet.get("quotaBytes") or 0) > 0,
          f"{(wallet.get('quotaBytes') or 0) // (1024*1024)} MB")

    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000a49444154789c6360000002000100ffff03000006000557bfabd400"
        "00000049454e44ae426082")
    boundary = "----uat" + uuid.uuid4().hex
    parts = []
    for k, v in {"category": "IdentityCard", "title": "Anh kiem thu"}.items():
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.png\"\r\n"
                 f"Content-Type: image/png\r\n\r\n".encode())
    parts.append(png)
    parts.append(f"\r\n--{boundary}--\r\n".encode())

    st, body = call("POST", "/patient/documents", token=token, raw=b"".join(parts),
                    content_type=f"multipart/form-data; boundary={boundary}")
    doc = data_of(body) or {}
    up = check("Tai giay to len vi", st == 200 and bool(doc.get("id")), f"HTTP {st}")

    if up:
        st, body = call("GET", "/patient/documents", token=token)
        items = (data_of(body) or {}).get("items") or []
        check("Giay to vua tai hien trong vi", any(d.get("id") == doc["id"] for d in items),
              f"{len(items)} giay to")

        st, _ = call("DELETE", f"/patient/documents/{doc['id']}", token=token)
        check("Xoa duoc giay to", st in (200, 204), f"HTTP {st}")

    # ============================================================= thong bao
    section("I.2 #2 — HOP THU THONG BAO")

    st, body = call("GET", "/patient/notifications", token=token)
    inbox = data_of(body)
    check("Mo duoc hop thu", st == 200 and isinstance(inbox, list),
          f"HTTP {st}, {len(inbox) if isinstance(inbox, list) else '?'} thong bao")

    st, body = call("GET", "/patient/notifications/unread-count", token=token)
    check("Dem duoc so thong bao chua doc", st == 200 and isinstance(data_of(body), int),
          f"HTTP {st} = {data_of(body)}")

    # =============================================================== bao mat
    section("I.2 #9 — BAO MAT")

    # Dat PIN phai kem mat khau: PIN 6 so yeu hon mat khau nhieu nen server bat xac thuc lai.
    st, _ = call("POST", "/patient/auth/pin",
                 {"password": PASSWORD, "pin": "111111"}, token=token)
    check("Tu choi ma PIN de doan (sau so giong nhau)", st != 200, f"HTTP {st}")

    st, _ = call("POST", "/patient/auth/pin",
                 {"password": PASSWORD, "pin": "123456"}, token=token)
    check("Tu choi ma PIN day lien tiep", st != 200, f"HTTP {st}")

    st, _ = call("POST", "/patient/auth/pin",
                 {"password": "sai-mat-khau", "pin": "284917"}, token=token)
    check("Sai mat khau thi KHONG dat duoc PIN", st != 200, f"HTTP {st}")

    st, _ = call("POST", "/patient/auth/pin",
                 {"password": PASSWORD, "pin": "284917"}, token=token)
    check("Dat duoc ma PIN kho doan", st == 200, f"HTTP {st}")

    st, body = call("GET", "/patient/devices", token=token)
    devices = data_of(body) or []
    check("Danh sach thiet bi dang nhap", st == 200 and len(devices) > 0, f"{len(devices)} may")

    other = next((d for d in devices if not d.get("isCurrent")), None)
    if other is None:
        skip("Dang xuat may khac tu xa", "chi co mot thiet bi trong danh sach")
    else:
        st, body = call("DELETE", f"/patient/devices/{other['id']}", token=token)
        check("Dang xuat may khac tu xa", st == 200, f"HTTP {st}")

        # Thu hoi xoay con dau bao mat cua CA tai khoan. Neu server khong cap lai token cho may
        # dang thao tac thi chinh nguoi vua bam nut bi da ra dang nhap lai — dung luc ho dang don
        # dep vi nghi bi lo tai khoan. Bat buoc phai co token moi trong phan hoi.
        fresh = (data_of(body) or {}).get("token")
        check("Thu hoi tra ve token moi cho may dang thao tac", bool(fresh),
              "co token" if fresh else "KHONG co token -> app se nhan 401")
        if fresh:
            token = fresh

        st, _ = call("GET", "/patient/devices", token=token)
        check("May dang thao tac VAN dung duoc sau khi thu hoi may khac", st == 200, f"HTTP {st}")

        st, body = call("DELETE", "/patient/devices/others", token=token)
        check("Dang xuat TAT CA may khac", st == 200, f"HTTP {st}")
        fresh = (data_of(body) or {}).get("token")
        if fresh:
            token = fresh
        st, _ = call("GET", "/patient/devices", token=token)
        check("May dang thao tac VAN dung duoc sau khi dang xuat tat ca may khac",
              st == 200, f"HTTP {st}")

    st, body = call("GET", "/patient/account/deletion-preview", token=token)
    prev = data_of(body) or {}
    check("Xem truoc nhung gi mat khi xoa tai khoan", st == 200, f"HTTP {st}")
    check("Ban xem truoc dem duoc so thiet bi", (prev.get("devices") or 0) >= 1,
          f"{prev.get('devices')} may")

    st, _ = call("DELETE", "/patient/account", {"password": "sai-mat-khau"}, token=token)
    check("Sai mat khau thi KHONG xoa duoc tai khoan", st == 400, f"HTTP {st}")

    # ============================================================ don dep
    section("DON DEP")
    st, _ = call("DELETE", "/patient/account", {"password": PASSWORD}, token=token)
    check("Xoa tai khoan kiem thu", st == 200, f"HTTP {st}")

    st, _ = call("GET", "/patient/documents", token=token)
    check("Token chet ngay sau khi xoa tai khoan", st in (401, 404), f"HTTP {st}")


print()
print("=" * 78)
print(f"  {len(passed)} DAT / {len(failed)} HONG / {len(skipped)} BO QUA")
if failed:
    print()
    for name in failed:
        print("  HONG: " + name)
print("=" * 78)
sys.exit(1 if failed else 0)
