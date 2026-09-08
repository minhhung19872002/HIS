#!/usr/bin/env python3
"""Smoke test Phase 2 — lay so thu tu va dat kham qua BFF (HSMT I.2 #3, #4).

Chay:  PYTHONIOENCODING=utf-8 python scripts/smoke-patient-app-phase2.py

Yeu cau:
  - HIS Core chay o localhost:5106
  - BFF chay o localhost:5200 voi ASPNETCORE_ENVIRONMENT=Development
  - container his-patientapp-postgres dang song (de doc lai ma OTP)

Bo test tu tao mot tai khoan moi moi lan chay nen khong phu thuoc du lieu cu.
"""
import hashlib
import json
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta

BFF = "http://localhost:5200/api/v1/patient"
PG_CONTAINER = "his-patientapp-postgres"

PHONE = "09" + "".join(random.choice("0123456789") for _ in range(8))
PASSWORD = "MatKhau@123"
DEVICE = {"deviceKey": "smoke-phase2", "deviceName": "Phase2 test", "platform": "android"}

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
        raw = e.read().decode()
        try:
            return e.status, json.loads(raw)
        except json.JSONDecodeError:
            return e.status, {"raw": raw}


def call(method, path, body=None, token=None, wait_seconds=62):
    status, payload = _once(method, path, body, token)
    if status == 429:
        print(f"  ... bi gioi han tan suat (dung nhu thiet ke), cho {wait_seconds}s")
        time.sleep(wait_seconds)
        status, payload = _once(method, path, body, token)
    return status, payload


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


# ------------------------------------------------------------------ dang ky
print(f"=== chuan bi: tao tai khoan {PHONE} ===")
st, _ = call("POST", "/auth/request-otp", {"phoneNumber": PHONE, "purpose": "register"},
             wait_seconds=610)
check("gui OTP", st == 200, f"status={st}")
st, r = call("POST", "/auth/register", {
    "phoneNumber": PHONE, "otpCode": latest_otp(), "password": PASSWORD,
    "fullName": "Nguyen Van Phase2", "device": DEVICE})
token = (r.get("data") or {}).get("token")
check("dang ky va co token", bool(token), f"status={st}")
if not token:
    sys.exit(1)

# ------------------------------------------------------------- so thu tu
print("=== TC-Q10 danh muc phong kham ===")
st, r = call("GET", "/queue/rooms", token=token)
rooms = r.get("data") or []
check("TC-Q10 doc duoc danh sach phong", st == 200, f"status={st} so phong={len(rooms)}")

room_id = rooms[0].get("roomId") if rooms else None
ticket_id = None
if room_id:
    print("=== TC-Q11 lay so thu tu ===")
    st, r = call("POST", "/queue/take-number", {"roomId": room_id, "queueType": 2}, token=token)
    ticket = r.get("data") or {}
    check("TC-Q11 lay so thanh cong", st == 200, f"status={st} {r.get('message')}")
    check("TC-Q11 co ma ve", bool(ticket.get("ticketCode")), ticket.get("ticketCode"))

    ticket_id = ticket.get("id")
    if ticket_id:
        print("=== TC-Q12 trang thai ve ===")
        st, r = call("GET", f"/queue/tickets/{ticket_id}/status", token=token)
        status = r.get("data") or {}
        check("TC-Q12 doc duoc trang thai", st == 200, f"status={st}")
        check("TC-Q12 co so nguoi cho truoc", "peopleAhead" in status,
              f"peopleAhead={status.get('peopleAhead')}")
        check("TC-Q12 KHONG lo thong tin dinh danh",
              not any(k in status for k in ("patientName", "patientCode", "patientId")))

    print("=== TC-Q13 lay so lan hai cung phong trong ngay bi chan ===")
    st, r = call("POST", "/queue/take-number", {"roomId": room_id, "queueType": 2}, token=token)
    check("TC-Q13 bi chan lay trung", st == 400, f"status={st} {r.get('message')}")
    check("TC-Q13 loi bao ra ma so da lay",
          isinstance(r.get("message"), str) and (ticket.get("ticketCode") or "@") in r["message"],
          r.get("message"))

    print("=== TC-Q15 danh sach so cua toi hom nay ===")
    st, r = call("GET", "/queue/tickets", token=token)
    mine = r.get("data") or []
    check("TC-Q15 thay dung mot so vua lay",
          st == 200 and len(mine) == 1 and mine[0].get("ticketCode") == ticket.get("ticketCode"),
          f"status={st} so ve={len(mine)}")

print("=== TC-Q14 goi API khi chua dang nhap ===")
st, _ = call("GET", "/queue/rooms")
check("TC-Q14 khong token tra 401", st == 401, f"status={st}")

# --------------------------------------------------------------- dat kham
print("=== TC-A01 danh muc chuyen khoa ===")
st, r = call("GET", "/appointments/departments", token=token)
departments = r.get("data") or []
check("TC-A01 doc duoc chuyen khoa", st == 200, f"status={st} so khoa={len(departments)}")

dept_id = departments[0]["id"] if departments else None

print("=== TC-A02 khung gio theo lich truc that ===")
target = (date.today() + timedelta(days=1)).isoformat()
st, r = call("GET", f"/appointments/slots?date={target}"
             + (f"&departmentId={dept_id}" if dept_id else ""), token=token)
slots = r.get("data") or {}
morning = slots.get("morningSlots") or []
afternoon = slots.get("afternoonSlots") or []
check("TC-A02 doc duoc khung gio", st == 200, f"status={st} sang={len(morning)} chieu={len(afternoon)}")
check("TC-A02 moi khung deu co suc chua",
      all("maxBookings" in s for s in morning + afternoon))

print("=== TC-A03 tu choi xem lich ngay da qua ===")
past = (date.today() - timedelta(days=1)).isoformat()
st, _ = call("GET", f"/appointments/slots?date={past}", token=token)
check("TC-A03 ngay qua bi tu choi", st == 400, f"status={st}")

available = [s for s in morning + afternoon if s.get("isAvailable")]
code = None

if available and dept_id:
    print("=== TC-A04 dat lich kham ===")
    st, r = call("POST", "/appointments", {
        "appointmentDate": target + "T00:00:00",
        "appointmentTime": available[0]["startTime"],
        "departmentId": dept_id,
        "appointmentType": 2,
        "reason": "Kiem tra suc khoe",
    }, token=token)
    booking = r.get("data") or {}
    code = booking.get("appointmentCode")
    check("TC-A04 dat lich thanh cong", st == 200 and bool(code), f"status={st} {r.get('message')}")

    print("=== TC-A05 lich hen hien trong danh sach cua toi ===")
    st, r = call("GET", "/appointments", token=token)
    mine = r.get("data") or []
    check("TC-A05 thay lich vua dat", any(a.get("appointmentCode") == code for a in mine),
          f"so lich={len(mine)}")

    print("=== TC-A06 dat lich sinh thong bao trong hop thu ===")
    st, r = call("GET", "/notifications", token=token)
    items = r.get("data") or []
    check("TC-A06 co thong bao lich hen",
          any(n.get("category") == "appointment" for n in items),
          f"so thong bao={len(items)}")

if code:
    print("=== TC-A07 doi lich ===")
    new_day = (date.today() + timedelta(days=2)).isoformat()
    st, r = call("GET", f"/appointments/slots?date={new_day}"
                 + (f"&departmentId={dept_id}" if dept_id else ""), token=token)
    new_slots = (r.get("data") or {})
    new_available = [s for s in (new_slots.get("morningSlots") or [])
                     + (new_slots.get("afternoonSlots") or []) if s.get("isAvailable")]

    if new_available:
        st, r = call("PUT", f"/appointments/{code}/reschedule", {
            "newAppointmentDate": new_day + "T00:00:00",
            "newAppointmentTime": new_available[0]["startTime"],
            "reason": "Ban viec",
        }, token=token)
        check("TC-A07 doi lich thanh cong", st == 200, f"status={st} {r.get('message')}")

        st, r = call("GET", "/appointments", token=token)
        moved = next((a for a in (r.get("data") or []) if a.get("appointmentCode") == code), None)
        check("TC-A07 ngay hen da doi",
              moved is not None and moved.get("appointmentDate", "").startswith(new_day),
              f"ngay hien tai={None if not moved else moved.get('appointmentDate')}")
        check("TC-A07 trang thai quay ve cho xac nhan",
              moved is not None and moved.get("status") == 0,
              f"status={None if not moved else moved.get('status')}")

    print("=== TC-A08 doi sang ngay da qua bi tu choi ===")
    st, _ = call("PUT", f"/appointments/{code}/reschedule", {
        "newAppointmentDate": past + "T00:00:00"}, token=token)
    check("TC-A08 ngay qua bi tu choi", st == 400, f"status={st}")

    print("=== TC-A09 huy lich ===")
    st, r = call("PUT", f"/appointments/{code}/cancel", {"reason": "Khong di duoc"}, token=token)
    check("TC-A09 huy thanh cong", st == 200, f"status={st} {r.get('message')}")

    st, r = call("GET", "/appointments", token=token)
    cancelled = next((a for a in (r.get("data") or []) if a.get("appointmentCode") == code), None)
    check("TC-A09 trang thai la da huy",
          cancelled is not None and cancelled.get("status") == 4,
          f"status={None if not cancelled else cancelled.get('status')}")

print("=== TC-A10 lich hen cua nguoi nay khong lo sang nguoi khac ===")
other_phone = "09" + "".join(random.choice("0123456789") for _ in range(8))
st, _ = call("POST", "/auth/request-otp", {"phoneNumber": other_phone, "purpose": "register"},
             wait_seconds=610)
st, r = call("POST", "/auth/register", {
    "phoneNumber": other_phone, "otpCode": latest_otp(), "password": PASSWORD,
    "fullName": "Nguoi khac", "device": {"deviceKey": "smoke-other",
                                         "deviceName": "Other", "platform": "ios"}})
other_token = (r.get("data") or {}).get("token")
if other_token:
    st, r = call("GET", "/appointments", token=other_token)
    others = r.get("data") or []
    check("TC-A10 khong thay lich cua nguoi khac",
          all(a.get("appointmentCode") != code for a in others),
          f"so lich thay duoc={len(others)}")

    if ticket_id:
        print("=== TC-Q16 khong doc duoc trang thai ve cua nguoi khac ===")
        st, _ = call("GET", f"/queue/tickets/{ticket_id}/status", token=other_token)
        check("TC-Q16 ve nguoi khac tra 404", st == 404, f"status={st}")

        st, r = call("GET", "/queue/tickets", token=other_token)
        check("TC-Q16 danh sach so cua nguoi khac rong", (r.get("data") or []) == [],
              f"so ve={len(r.get('data') or [])}")

    if room_id:
        print("=== TC-Q17 nguoi moi van lay duoc so o phong da co nguoi lay ===")
        st, r = call("POST", "/queue/take-number", {"roomId": room_id, "queueType": 2},
                     token=other_token)
        check("TC-Q17 khong bi ve vo danh cua nguoi khac chan", st == 200,
              f"status={st} {r.get('message')}")

print()
print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
for name in failed:
    print("  - " + name)
sys.exit(1 if failed else 0)
