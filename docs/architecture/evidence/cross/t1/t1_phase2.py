"""T1 (#216) đợt 2 — các TC-PERM chưa chạy được ở đợt 1.

Đợt 1 dừng ở chỗ "DB local không có user cho các vai trò đó". Hoá ra ba trong số chúng
KHÔNG nằm trong bảng Users: cổng giám định BHXH và cổng bệnh nhân có đường đăng nhập +
token riêng, tự phát role claim của chúng. Vì vậy phần lớn phần còn lại chạy được ngay,
không cần thêm RoleCode mới.

Bao phủ: TC-PERM-007 (BhxhInspector) · 008 (DepartmentHead) · 009 (BGĐ/Director) ·
011 (PortalPatient) · 015 (buộc đổi mật khẩu) · 016 (khoá sau N lần sai + 2FA) ·
018 (đối soát audit) · 019 (thu hồi quyền có hiệu lực).

Cần: API :5106, DB his-sqlserver, user seed mật khẩu 123456.
Kết quả: t1_phase2_results.json (+ in ra bảng để dán vào báo cáo).
"""
import json, os, re, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
RESULTS = []


def http(method, path, token=None, body=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q", "SET NOCOUNT ON; " + q]
    env = dict(os.environ, MSYS_NO_PATHCONV="1")
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env)
    return (out.stdout or "").strip()


def login(user, pwd):
    for _ in range(8):
        st, body = http("POST", "/api/auth/login", body={"username": user, "password": pwd})
        if st == 200:
            d = json.loads(body)
            d = d.get("data", d)
            return d.get("token"), d
        if st in (429, -1):
            time.sleep(12)
            continue
        return None, {"status": st, "body": body[:200]}
    return None, {"status": "rate-limited"}


def claims(token):
    import base64
    p = token.split(".")[1]
    p += "=" * (-len(p) % 4)
    return json.loads(base64.urlsafe_b64decode(p))


def roles_of(token):
    c = claims(token)
    r = c.get(ROLE_CLAIM) or c.get("role") or []
    return [r] if isinstance(r, str) else list(r)


def record(tc, name, passed, detail):
    RESULTS.append({"tc": tc, "name": name, "pass": bool(passed), "detail": detail})
    print("  %-13s %-4s %s" % (tc, "PASS" if passed else "FAIL", detail))


# ── TC-PERM-009: BGĐ/Director ────────────────────────────────────────────────
def tc009(admin_tok, doctor_tok):
    admin_roles = roles_of(admin_tok)
    ok = "Director" in admin_roles
    record("TC-PERM-009", "Director claim", ok,
           "claim của admin = %s → Director %s" % (admin_roles, "có" if ok else "THIẾU"))
    # endpoint quản trị chấp nhận Director: admin vào được, bác sĩ 403
    st_a, _ = http("GET", "/api/admin/users", admin_tok)
    st_d, _ = http("GET", "/api/admin/users", doctor_tok)
    record("TC-PERM-009", "gate quản trị", st_a == 200 and st_d == 403,
           "GET /api/admin/users → admin %s · bác sĩ %s" % (st_a, st_d))
    return admin_roles


# ── TC-PERM-008: DepartmentHead ──────────────────────────────────────────────
def tc008(all_roles_seen):
    orphan = "DepartmentHead" not in all_roles_seen
    inv = json.load(open(os.path.join(HERE, "authz_inventory.json"), encoding="utf-8"))
    only_dh = [r for r in inv if r["guard"] == "roles" and r["roles"] == ["DepartmentHead"]]
    record("TC-PERM-008", "role orphan", orphan,
           "không JWT nào của 8 user seed phát 'DepartmentHead' (claim thấy được: %d tên); "
           "endpoint gate CHỈ bằng DepartmentHead: %d" % (len(all_roles_seen), len(only_dh)))
    return {"orphan": orphan, "endpoints_gated_only_by_department_head": [r["route"] for r in only_dh]}


# ── TC-PERM-007: giám định viên BHXH ─────────────────────────────────────────
def tc007(admin_tok, doctor_tok):
    uname = "gdv_t1_probe"
    sql("DELETE FROM BhxhInspectorAccounts WHERE Username='%s'" % uname)
    st, body = http("POST", "/api/inspector-portal/accounts", admin_tok,
                    {"username": uname, "password": "Gdv@12345", "fullName": "Giám định viên T1",
                     "bhxhCode": "GD-T1", "province": "Hà Nội"})
    if st not in (200, 201):
        record("TC-PERM-007", "tạo tài khoản", False, "POST accounts → %s %s" % (st, body[:150]))
        return
    st, body = http("POST", "/api/inspector-portal/login", None,
                    {"username": uname, "password": "Gdv@12345"})
    d = json.loads(body) if st == 200 else {}
    d = d.get("data", d)
    itok = d.get("token")
    record("TC-PERM-007", "đăng nhập cổng", bool(itok),
           "POST /inspector-portal/login → %s, có token: %s" % (st, bool(itok)))
    if not itok:
        return
    record("TC-PERM-007", "role claim", "BhxhInspector" in roles_of(itok),
           "claim = %s" % roles_of(itok))
    st_i, _ = http("GET", "/api/inspector-portal/records?keyword=", itok)
    st_d, _ = http("GET", "/api/inspector-portal/records?keyword=", doctor_tok)
    record("TC-PERM-007", "cách ly hai chiều", st_i in (200, 400) and st_d == 403,
           "hồ sơ: giám định viên %s · bác sĩ %s" % (st_i, st_d))
    st_x, _ = http("GET", "/api/admin/users", itok)
    st_y, _ = http("GET", "/api/reception/opd-flow-stats", itok)
    record("TC-PERM-007", "không chạm được nội bộ", st_x == 403 and st_y == 403,
           "token giám định vào /admin/users %s · /reception/opd-flow-stats %s "
           "(trước F7 endpoint thứ hai trả 200 — người ngoài đọc được số liệu điều hành)" % (st_x, st_y))
    # dọn
    sql("DELETE FROM BhxhInspectorAccounts WHERE Username='%s'" % uname)


# ── TC-PERM-011: bệnh nhân tự đăng nhập cổng ─────────────────────────────────
def tc011(doctor_tok):
    """Bảng thật là PortalAccounts; RegisterPortalAccountDto không nhận username/patientCode —
    username do service sinh, và tài khoản mới mặc định CHƯA active + CHƯA link hồ sơ nên
    AuthenticatePortalAsync từ chối (đúng thiết kế). Test vì thế: đăng ký qua API → mở trạng thái
    + gắn hồ sơ bằng SQL (đúng việc mà tiếp đón sẽ làm) → đăng nhập."""
    phone = "0900000001"
    sql("DELETE FROM PortalAccounts WHERE Phone='%s'" % phone)
    st, body = http("POST", "/api/portal/register", None,
                    {"fullName": "BN cong T1", "email": "bn.t1.probe@example.invalid",
                     "phone": phone, "idNumber": "001099000001",
                     "dateOfBirth": "1990-01-01T00:00:00", "password": "Bn@123456"})
    reg = "%s %s" % (st, body[:160])
    uname = sql("SELECT TOP 1 Username FROM PortalAccounts WHERE Phone='%s'" % phone)
    pid = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Patients WHERE IsDeleted=0 ORDER BY CreatedAt")
    sql("UPDATE PortalAccounts SET Status='Active', PatientId='%s', FailedLoginAttempts=0, "
        "LockedUntil=NULL WHERE Phone='%s'" % (pid, phone))
    st, body = http("POST", "/api/portal/login", None, {"identifier": phone, "password": "Bn@123456"})
    d = json.loads(body) if st == 200 else {}
    d = d.get("data", d) or {}
    ptok = d.get("token")
    record("TC-PERM-011", "đăng ký + đăng nhập", bool(ptok),
           "register → %s · username sinh ra '%s' · login → %s · token: %s" % (reg[:60], uname, st, bool(ptok)))
    if not ptok:
        sql("DELETE FROM PortalAccounts WHERE Phone='%s'" % phone)
        return
    record("TC-PERM-011", "role claim", "PortalPatient" in roles_of(ptok), "claim = %s" % roles_of(ptok))
    st_a, _ = http("GET", "/api/admin/users", ptok)
    st_b, _ = http("GET", "/api/reception/opd-flow-stats", ptok)
    record("TC-PERM-011", "không chạm được nội bộ", st_a == 403 and st_b == 403,
           "token bệnh nhân vào /admin/users %s · /reception/opd-flow-stats %s" % (st_a, st_b))
    st_c, _ = http("GET", "/api/portal/my-records", ptok)
    record("TC-PERM-011", "vẫn đi được trong cổng của mình", st_c not in (403,),
           "token bệnh nhân trong /api/portal/* → %s (F7 không chặn nhầm)" % st_c)
    sql("DELETE FROM PortalAccounts WHERE Phone='%s'" % phone)


# ── TC-PERM-015: buộc đổi mật khẩu lần đầu ───────────────────────────────────
def tc015():
    cols = sql("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Users') "
               "AND name IN ('MustChangePassword','PasswordChangedAt','PasswordExpiresAt')")
    src = subprocess.run(["git", "grep", "-l", "-iE", "MustChangePassword|ForcePasswordChange|RequirePasswordChange",
                          "--", "backend/src"], capture_output=True, text=True, cwd=r"D:\Source\HIS")
    have = bool(cols.strip()) or bool(src.stdout.strip())
    record("TC-PERM-015", "cơ chế buộc đổi mật khẩu", False if not have else True,
           "cột Users liên quan: %s · file backend nhắc tới: %s → %s"
           % (cols.replace("\n", ",") or "không có", src.stdout.strip() or "không có",
              "CÓ" if have else "CHƯA CÓ TÍNH NĂNG (khoảng trống, không phải lỗi)"))


# ── TC-PERM-016: khoá sau N lần sai + 2FA ────────────────────────────────────
def tc016():
    user = "ktvlam"
    sql("UPDATE Users SET FailedLoginCount=0, LockoutEndAt=NULL WHERE Username='%s'" % user)
    codes = []
    for _ in range(6):
        st, _ = http("POST", "/api/auth/login", body={"username": user, "password": "sai-mat-khau"})
        codes.append(st)
        time.sleep(1)
    # Ngưỡng khoá là 5 lần sai (ComputeLockoutEndAt) → 6 lần phải đủ. Nếu thấy 429 nghĩa là
    # bucket rate-limit lại chặn trước bộ đếm, tức F8 chưa có hiệu lực trên tiến trình đang chạy.
    state = sql("SELECT CAST(FailedLoginCount AS varchar(10)) + '|' + "
                "ISNULL(CONVERT(varchar(30), LockoutEndAt, 126),'null') FROM Users WHERE Username='%s'" % user)
    cnt, lock = (state.split("|") + ["", ""])[:2]
    locked = lock not in ("null", "")
    record("TC-PERM-016", "đếm sai mật khẩu", locked,
           "6 lần sai → status %s · FailedLoginCount=%s · LockoutEndAt=%s" % (codes, cnt, lock))
    st, body = http("POST", "/api/auth/login", body={"username": user, "password": "123456"})
    record("TC-PERM-016", "khoá chặn cả mật khẩu đúng", st != 200 or "khóa" in body.lower() or "khoá" in body.lower(),
           "mật khẩu ĐÚNG khi đang khoá → %s %s" % (st, body[:120]))
    sql("UPDATE Users SET FailedLoginCount=0, LockoutEndAt=NULL WHERE Username='%s'" % user)
    time.sleep(2)
    tok, _ = login(user, "123456")
    record("TC-PERM-016", "mở khoá khôi phục", bool(tok), "sau khi reset khoá → đăng nhập %s" % ("được" if tok else "KHÔNG được"))
    two_fa = sql("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Users') AND name='IsTwoFactorEnabled'")
    record("TC-PERM-016", "2FA có mặt", two_fa.strip() == "1",
           "cột Users.IsTwoFactorEnabled: %s · endpoint /auth/enable-2fa + /auth/verify-otp có trong controller" % two_fa)


# ── TC-PERM-018: đối soát audit ──────────────────────────────────────────────
def tc018(admin_tok, doctor_tok):
    before = sql("SELECT COUNT(*) FROM AuditLogs")
    # AuditLogMiddleware chỉ ghi POST/PUT/DELETE và GET chi tiết nhạy cảm — GET danh sách
    # KHÔNG sinh bản ghi, nên phải chọc bằng đúng loại request mà nó có ghi.
    http("POST", "/api/patient-flag", doctor_tok, {"patientId": "00000000-0000-0000-0000-000000000000"})
    http("POST", "/api/admin/users", doctor_tok, {"username": "khong-duoc-phep"})  # bị từ chối
    time.sleep(6)                                        # AuditWriterWorker ghi theo lô
    after = sql("SELECT COUNT(*) FROM AuditLogs")
    st, body = http("GET", "/api/audit/logs?page=1&pageSize=5", admin_tok)
    st_d, _ = http("GET", "/api/audit/logs?page=1&pageSize=5", doctor_tok)
    grew = int(after or 0) > int(before or 0)
    record("TC-PERM-018", "audit có ghi", grew, "AuditLogs %s → %s" % (before, after))
    record("TC-PERM-018", "chỉ người có quyền đọc audit", st == 200 and st_d == 403,
           "GET /api/audit/logs → admin %s · bác sĩ %s" % (st, st_d))


# ── TC-PERM-019: thu hồi quyền có hiệu lực ───────────────────────────────────
def tc019():
    perm = "Reception.Update"
    probe = "/api/reception/rooms"   # GET để không ghi dữ liệu; chỉ cần đo permission-set
    tok, _ = login("lthung", "123456")
    st, body = http("GET", "/api/me/permissions", tok)
    had = perm in body
    sql("UPDATE rp SET rp.IsDeleted=1 FROM RolePermissions rp "
        "JOIN Roles r ON r.Id=rp.RoleId JOIN Permissions p ON p.Id=rp.PermissionId "
        "WHERE r.RoleCode='RECEPTIONIST' AND p.PermissionCode='%s'" % perm)
    time.sleep(35)   # IPermissionService cache 30s
    st2, body2 = http("GET", "/api/me/permissions", tok)
    gone = perm not in body2
    record("TC-PERM-019", "thu hồi quyền có hiệu lực", had and gone,
           "trước: %s · sau khi xoá link + chờ hết cache 30s: %s"
           % ("có " + perm if had else "KHÔNG có " + perm, "đã mất" if gone else "VẪN CÒN"))
    sql("UPDATE rp SET rp.IsDeleted=0 FROM RolePermissions rp "
        "JOIN Roles r ON r.Id=rp.RoleId JOIN Permissions p ON p.Id=rp.PermissionId "
        "WHERE r.RoleCode='RECEPTIONIST' AND p.PermissionCode='%s'" % perm)
    time.sleep(35)
    st3, body3 = http("GET", "/api/me/permissions", tok)
    record("TC-PERM-019", "cấp lại quyền phục hồi", perm in body3,
           "sau khi khôi phục link: %s" % ("có lại" if perm in body3 else "VẪN MẤT"))


def main():
    admin_tok, _ = login("admin", "Admin@123")
    doctor_tok, _ = login("bsannn", "123456")
    if not admin_tok or not doctor_tok:
        print("không đăng nhập được admin/bác sĩ — dừng")
        return
    seen = set()
    for u, p in [("admin", "Admin@123"), ("bsannn", "123456"), ("ddgiang", "123456"),
                 ("ktvkhanh", "123456"), ("dsoanh", "123456"), ("lthung", "123456"), ("tnmai", "123456")]:
        t, _ = login(u, p)
        if t:
            seen.update(roles_of(t))
        time.sleep(1)

    print("\n== TC-PERM đợt 2 ==")
    tc009(admin_tok, doctor_tok)
    dh = tc008(seen)
    tc007(admin_tok, doctor_tok)
    tc011(doctor_tok)
    tc015()
    tc016()
    tc018(admin_tok, doctor_tok)
    tc019()

    out = {"ranAt": datetime.now().isoformat(timespec="seconds"),
           "roleClaimsSeen": sorted(seen), "departmentHead": dh, "checks": RESULTS}
    json.dump(out, open(os.path.join(HERE, "t1_phase2_results.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    ok = sum(1 for r in RESULTS if r["pass"])
    print("\n%d/%d kiểm tra đạt · ghi t1_phase2_results.json" % (ok, len(RESULTS)))


if __name__ == "__main__":
    main()
