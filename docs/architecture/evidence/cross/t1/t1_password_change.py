"""T1 (#216) TC-PERM-015 — buộc đổi mật khẩu lần đầu / khi hết hạn, đo ở SERVER.

Đợt 2 ghi nhận "CHƯA CÓ TÍNH NĂNG". User chốt: làm. Bài đo này chạy được TRƯỚC khi vá (mọi ca
hỏng, trừ hai đối chứng) để có số nền trung thực, rồi chạy lại sau khi vá.

Đo đúng theo acceptance của #216: "ẩn nút ≠ chặn API — phải chặn cả server". Nên mọi ca đều gọi
API thẳng bằng token, không qua giao diện.

Có một ca KHÔNG nằm trong TC-015 mà nằm ra trong lúc đọc mã để làm TC-015:
`POST /api/admin/users/{userId}/change-password` chỉ có `[Authorize]` trần, được miễn gate quyền
với chú thích "đổi mật khẩu của chính mình", nhưng route nhận {userId} BẤT KỲ và service bỏ qua
`CurrentPassword`. Tức ai đã đăng nhập cũng đặt được mật khẩu mới cho bất kỳ tài khoản nào. Ca 9
đo nó — nhắm vào một tài khoản "nạn nhân" tạm, KHÔNG nhắm admin, để lần đo nền không tự phá mật
khẩu admin của máy local.

Tài khoản tạo ra mang tiền tố t1pw_ và được xoá mềm ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
CASES = []
# GET chỉ cần đăng nhập (auth-only) — T1 đợt 2 dùng đúng đường này để chứng minh token cổng ngoài lọt.
BUSINESS_GET = "/api/reception/opd-flow-stats"


def http(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def sql(q, fatal=True):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    text = (out.stdout or "").strip()
    if text.startswith("Msg ") or "Invalid column name" in text or "Invalid object name" in text:
        if fatal:
            raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:150], text[:250]))
        return None
    return text


def data_of(b):
    try:
        d = json.loads(b)
        return d.get("data", d) if isinstance(d, dict) else d
    except Exception:
        return {}


def login(user, pwd):
    for _ in range(6):
        st, b = http("POST", "/api/auth/login", body={"username": user, "password": pwd})
        if st == 429:
            time.sleep(12); continue
        return st, data_of(b) if st == 200 else {}
    return 429, {}


def case(name, ok, detail):
    CASES.append({"case": name, "pass": bool(ok), "detail": detail})
    print("  %-60s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    st, adm = login("admin", "Admin@123")
    if st != 200:
        raise SystemExit("khong login duoc admin: %s" % st)
    A = adm["token"]

    roles = data_of(http("GET", "/api/admin/roles", A)[1]) or []
    doctor = next((r for r in roles if (r.get("code") or r.get("roleCode")) == "DOCTOR"), None) or (roles[0] if roles else None)
    if not doctor:
        raise SystemExit("khong co role nao de gan cho user thu")

    suffix = uuid.uuid4().hex[:6]
    U1, P1 = "t1pw_%s" % suffix, "Tam@12345"
    U2, P2 = "t1pwv_%s" % suffix, "Nan@12345"
    ids = {}
    try:
        for u, p in ((U1, P1), (U2, P2)):
            st, b = http("POST", "/api/admin/users", A,
                         {"username": u, "fullName": "T1 PW %s" % u, "roleIds": [doctor["id"]],
                          "initialPassword": p})
            d = data_of(b)
            ids[u] = (d or {}).get("id")
            if st != 200 or not ids[u]:
                raise SystemExit("khong tao duoc user %s: %s %s" % (u, st, b[:160]))

        print("── Tài khoản mới tạo (mật khẩu do admin đặt) ──")
        st, d = login(U1, P1)
        flag = (d.get("user") or {}).get("mustChangePassword")
        T1 = d.get("token")
        case("đăng nhập lần đầu → cờ mustChangePassword = true", st == 200 and flag is True,
             "HTTP %s · mustChangePassword=%r · reason=%r" % (st, flag, (d.get("user") or {}).get("mustChangePasswordReason")))

        st2, b2 = http("GET", BUSINESS_GET, T1)
        case("token bị buộc đổi gọi API nghiệp vụ → 403 PASSWORD_CHANGE_REQUIRED",
             st2 == 403 and "PASSWORD_CHANGE_REQUIRED" in b2, "HTTP %s · %s" % (st2, b2[:70]))

        # ĐỐI CHỨNG 1: đường tự đọc hồ sơ mình phải còn mở, không thì màn đổi mật khẩu không dựng được.
        st3, b3 = http("GET", "/api/auth/me", T1)
        case("ĐỐI CHỨNG: /auth/me vẫn đọc được khi đang bị buộc đổi", st3 == 200, "HTTP %s" % st3)

        print("\n── Chính sách mật khẩu mới ──")
        st4, b4 = http("POST", "/api/auth/change-password", T1,
                       {"currentPassword": P1, "newPassword": "abc", "confirmPassword": "abc"})
        case("mật khẩu yếu ('abc') bị từ chối kèm lý do", st4 == 400 and "message" in b4,
             "HTTP %s · %s" % (st4, b4[:80]))
        # Bám theo mật khẩu server THỰC SỰ đang giữ: trên mã cũ, ca trên thành công và đổi mất mật
        # khẩu thành 'abc'. Không bám thì hai ca dưới nhận 400 "Current password is incorrect" và
        # được chấm đạt vì lý do sai — lần đo nền đầu đã dính đúng cái bẫy này (PASS giả).
        cur = "abc" if st4 == 200 else P1

        st5, b5 = http("POST", "/api/auth/change-password", T1,
                       {"currentPassword": cur, "newPassword": cur, "confirmPassword": cur})
        # Phải là câu từ chối của CHÍNH SÁCH, không phải "sai mật khẩu hiện tại".
        case("mật khẩu mới TRÙNG mật khẩu cũ bị từ chối (đúng lý do)",
             st5 == 400 and "khác mật khẩu hiện tại" in b5, "HTTP %s · %s" % (st5, b5[:80]))

        P1b = "Benhvien2026x"
        st6, b6 = http("POST", "/api/auth/change-password", T1,
                       {"currentPassword": cur, "newPassword": P1b, "confirmPassword": P1b})
        st7, d7 = login(U1, P1b)
        flag7 = (d7.get("user") or {}).get("mustChangePassword")
        T1b = d7.get("token")
        st8, _ = http("GET", BUSINESS_GET, T1b)
        case("đổi hợp lệ → đăng nhập lại KHÔNG còn bị buộc, API nghiệp vụ 200",
             st6 == 200 and st7 == 200 and flag7 is False and st8 == 200,
             "đổi HTTP %s · login %s · cờ=%r · nghiệp vụ %s" % (st6, st7, flag7, st8))

        print("\n── Admin reset → buộc đổi lại ──")
        st9, _ = http("POST", "/api/admin/users/%s/reset-password" % ids[U1], A)
        st10, d10 = login(U1, "123456")
        case("admin reset mật khẩu → lần đăng nhập tới bị buộc đổi",
             st9 == 200 and st10 == 200 and (d10.get("user") or {}).get("mustChangePassword") is True,
             "reset %s · login %s · cờ=%r" % (st9, st10, (d10.get("user") or {}).get("mustChangePassword")))

        print("\n── Mật khẩu quá hạn ──")
        r = sql("UPDATE Users SET PasswordChangedAt = DATEADD(day, -100, GETUTCDATE()), "
                "MustChangePassword = 0 WHERE Username = N'%s'" % U1, fatal=False)
        st11, d11 = login(U1, "123456")
        u11 = d11.get("user") or {}
        case("mật khẩu 100 ngày tuổi → bị buộc đổi với lý do 'expired'",
             r is not None and st11 == 200 and u11.get("mustChangePassword") is True
             and u11.get("mustChangePasswordReason") == "expired",
             "cột có=%s · login %s · cờ=%r · lý do=%r"
             % (r is not None, st11, u11.get("mustChangePassword"), u11.get("mustChangePasswordReason")))

        print("\n── Lỗ hổng tìm ra khi đọc mã: đổi hộ mật khẩu người khác ──")
        # Dùng token KHÔNG bị buộc đổi (đổi lại cho U1 rồi đăng nhập), để middleware buộc-đổi không
        # che mất câu hỏi thật: "người thường có đặt được mật khẩu cho người khác không?"
        sql("UPDATE Users SET PasswordChangedAt = GETUTCDATE(), MustChangePassword = 0 "
            "WHERE Username = N'%s'" % U1, fatal=False)
        st12, d12 = login(U1, "123456")
        T1c = d12.get("token")
        st13, b13 = http("POST", "/api/admin/users/%s/change-password" % ids[U2], T1c,
                         {"currentPassword": "khong-biet", "newPassword": "Hack@12345",
                          "confirmPassword": "Hack@12345"})
        st14, _ = login(U2, P2)
        case("user thường KHÔNG đặt được mật khẩu cho tài khoản khác",
             st13 >= 400 and st14 == 200,
             "đổi hộ HTTP %s · nạn nhân vẫn đăng nhập được bằng mật khẩu cũ=%s" % (st13, st14 == 200))

        # ĐỐI CHỨNG 2: tài khoản đang dùng thật (backfill migration) KHÔNG bị buộc đổi sau khi deploy.
        print("\n── Đối chứng ──")
        st15, d15 = login("admin", "Admin@123")
        f15 = (d15.get("user") or {}).get("mustChangePassword")
        st16, _ = http("GET", BUSINESS_GET, d15.get("token"))
        case("ĐỐI CHỨNG: tài khoản sẵn có không bị buộc đổi, nghiệp vụ vẫn 200",
             st15 == 200 and not f15 and st16 == 200, "login %s · cờ=%r · nghiệp vụ %s" % (st15, f15, st16))

    finally:
        for u, i in ids.items():
            if i:
                http("DELETE", "/api/admin/users/%s" % i, A)
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t1_password_change.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t1_password_change.json · đã xoá mềm tài khoản thử")


if __name__ == "__main__":
    main()
