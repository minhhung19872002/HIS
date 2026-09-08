"""Kiem tra logic STT uu tien qua app (HSMT app mobile I.2 #3, migration 184).

Chay khi HIS Core dang chay o localhost:5106.
"""
import json
import random
import sys
import urllib.error
import urllib.request
from datetime import date

BASE = "http://localhost:5106/api"
passed, failed = [], []


def call(method, path, body=None, token=None):
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


def check(name, condition, detail=""):
    (passed if condition else failed).append(name)
    print(("  PASS  " if condition else "  FAIL  ") + name + (" | " + detail if detail else ""))


def unwrap(payload):
    """HIS Core boc trong {success, data}."""
    return payload.get("data") if isinstance(payload, dict) and "data" in payload else payload


print("=== dang nhap tai khoan nhan vien ===")
st, r = call("POST", "/auth/login", {"username": "admin", "password": "Admin@123"})
token = (unwrap(r) or {}).get("token")
check("dang nhap HIS thanh cong", bool(token), f"status={st}")
if not token:
    sys.exit(1)

print("=== tim mot phong kham de xep hang ===")
st, r = call("GET", "/reception/rooms/overview", token=token)
rooms = unwrap(r) or []
room_id = rooms[0]["roomId"] if rooms and "roomId" in rooms[0] else (rooms[0].get("id") if rooms else None)
check("co it nhat mot phong", bool(room_id), f"status={st} so phong={len(rooms)}")
if not room_id:
    print("  (bo qua phan con lai vi khong co phong)")
    sys.exit(1)


def create_patient(full_name, birth_year, phone):
    """Tao benh nhan voi ngay sinh va so dien thoai xac dinh."""
    st, r = call("POST", "/patients", {
        "fullName": full_name,
        "dateOfBirth": f"{birth_year}-06-15T00:00:00",
        "gender": 1,
        "phoneNumber": phone,
    }, token=token)
    return st, unwrap(r)


suffix = "".join(random.choice("0123456789") for _ in range(6))
this_year = date.today().year

print("=== TC-Q1 nguoi cao tuoi: tu suy ra uu tien du KHONG khai ===")
phone_elder = "0977" + suffix
st, patient = create_patient("Cu Nguyen Van Test", this_year - 72, phone_elder)
check("TC-Q1 tao duoc ho so nguoi 72 tuoi", st in (200, 201) and bool(patient), f"status={st}")

st, r = call("POST", "/reception/queue/issue-mobile", {
    "patientPhone": phone_elder, "roomId": room_id, "queueType": 2})
ticket = unwrap(r) or {}
check("TC-Q1 cap so thanh cong", st == 200, f"status={st} {r if st != 200 else ''}")
check("TC-Q1 duoc uu tien du khong khai", ticket.get("priority") == 1,
      f"priority={ticket.get('priority')} reason={ticket.get('priorityReasonName')}")
check("TC-Q1 ly do = nguoi cao tuoi", ticket.get("priorityReason") == 1,
      f"reason={ticket.get('priorityReason')}")
check("TC-Q1 danh dau DA XAC MINH (suy ra tu ngay sinh)", ticket.get("priorityVerified") is True,
      f"verified={ticket.get('priorityVerified')}")
elder_ticket_id = ticket.get("id")

print("=== TC-Q2 nguoi 30 tuoi khai 'cao tuoi': bi tu choi vi doi chieu duoc ===")
phone_adult = "0966" + suffix
st, _ = create_patient("Nguyen Van Ba Muoi", this_year - 30, phone_adult)
st, r = call("POST", "/reception/queue/issue-mobile", {
    "patientPhone": phone_adult, "roomId": room_id, "queueType": 2, "priorityReason": 1})
ticket2 = unwrap(r) or {}
check("TC-Q2 cap so thanh cong", st == 200, f"status={st}")
check("TC-Q2 KHONG duoc uu tien (ngay sinh noi khac)", ticket2.get("priority") == 0,
      f"priority={ticket2.get('priority')}")

print("=== TC-Q3 khai 'co thai': duoc uu tien nhung CHUA xac minh ===")
phone_preg = "0955" + suffix
st, _ = create_patient("Tran Thi Test", this_year - 28, phone_preg)
st, r = call("POST", "/reception/queue/issue-mobile", {
    "patientPhone": phone_preg, "roomId": room_id, "queueType": 2, "priorityReason": 3})
ticket3 = unwrap(r) or {}
check("TC-Q3 duoc uu tien", ticket3.get("priority") == 1, f"priority={ticket3.get('priority')}")
check("TC-Q3 ly do = phu nu co thai", ticket3.get("priorityReason") == 3)
check("TC-Q3 danh dau CHUA xac minh de le tan kiem", ticket3.get("priorityVerified") is False,
      f"verified={ticket3.get('priorityVerified')}")

print("=== TC-Q4 khong khai gi, tuoi binh thuong: so thuong ===")
phone_normal = "0944" + suffix
st, _ = create_patient("Le Van Thuong", this_year - 35, phone_normal)
st, r = call("POST", "/reception/queue/issue-mobile", {
    "patientPhone": phone_normal, "roomId": room_id, "queueType": 2})
ticket4 = unwrap(r) or {}
check("TC-Q4 la so thuong", ticket4.get("priority") == 0, f"priority={ticket4.get('priority')}")

print("=== TC-Q5 khai cap cuu qua app: khong duoc ===")
phone_er = "0933" + suffix
st, _ = create_patient("Pham Van Cap Cuu", this_year - 40, phone_er)
st, r = call("POST", "/reception/queue/issue-mobile", {
    "patientPhone": phone_er, "roomId": room_id, "queueType": 2, "priorityReason": 6})
ticket5 = unwrap(r) or {}
check("TC-Q5 cap cuu KHONG cap qua app", ticket5.get("priority") == 0,
      f"priority={ticket5.get('priority')} (nguoi cap cuu vao thang khoa cap cuu)")

print("=== TC-Q6 tra trang thai ve (GAP 15) ===")
if elder_ticket_id:
    st, r = call("GET", f"/reception/queue/ticket/{elder_ticket_id}/status")
    status = unwrap(r) or {}
    check("TC-Q6 doc duoc trang thai ve, khong can dang nhap", st == 200, f"status={st}")
    check("TC-Q6 co ma ve", bool(status.get("ticketCode")), status.get("ticketCode"))
    check("TC-Q6 co so nguoi cho truoc", "peopleAhead" in status,
          f"peopleAhead={status.get('peopleAhead')}")
    check("TC-Q6 KHONG lo thong tin dinh danh benh nhan",
          not any(k in status for k in ("patientName", "patientCode", "patientId")),
          f"cac khoa tra ve={sorted(status.keys())}")

st, _ = call("GET", "/reception/queue/ticket/00000000-0000-0000-0000-000000000000/status")
check("TC-Q6 ve khong ton tai tra 404", st == 404, f"status={st}")

print()
print(f"KET QUA: {len(passed)} PASS / {len(failed)} FAIL")
for name in failed:
    print("  - " + name)
sys.exit(1 if failed else 0)
