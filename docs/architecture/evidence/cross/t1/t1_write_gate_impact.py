"""T1 (#216/F2) — bán kính ảnh hưởng của việc siết đường GHI.

Trước F2, MỌI vai trò đã đăng nhập đều gọi được 887 action ghi chỉ có [Authorize] trần.
Sau F2 chúng được gate bằng permission, nên câu hỏi phải trả lời KHÔNG phải "còn hở không"
(kiểm kê tĩnh đã trả lời) mà là "vai trò nào MẤT thứ họ đang thực sự dùng".

Script đăng nhập từng user seed, đọc permission-set thật từ API, rồi với mỗi action ghi đã
gate cho biết vai trò đó còn gọi được hay không — nhóm theo controller để soi bằng mắt xem
có cái nào thuộc đúng công việc hằng ngày của vai trò đó bị mất.

Đây là phân tích TĨNH có chủ đích: không bắn thử mutation mà vai trò được phép chạy, vì làm
vậy sẽ ghi dữ liệu thật vào DB.
"""
import json, os, sys, urllib.error, urllib.request
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"

USERS = [
    ("admin",    "Admin@123", "Quản trị hệ thống"),
    ("bsannn",   "123456",    "Bác sĩ"),
    ("ddgiang",  "123456",    "Điều dưỡng"),
    ("ktvkhanh", "123456",    "KTV XN"),
    ("ktvlam",   "123456",    "KTV CĐHA"),
    ("dsoanh",   "123456",    "Dược sĩ"),
    ("lthung",   "123456",    "Tiếp đón"),
    ("tnmai",    "123456",    "Thu ngân"),
]


def http(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def main():
    inv = json.load(open(os.path.join(HERE, "authz_inventory.json"), encoding="utf-8"))
    gated = [r for r in inv
             if r["method"] not in ("GET", "HEAD", "OPTIONS")
             and r["guard"] == "permission" and r["permissions"]]
    print("action ghi đã gate bằng permission: %d trên %d controller"
          % (len(gated), len({r["controller"] for r in gated})))

    report = {}
    for user, pwd, label in USERS:
        st, body = http("POST", "/api/auth/login", body={"username": user, "password": pwd})
        if st != 200:
            print("  LOGIN FAILED %s -> %s %s" % (user, st, body[:120]))
            continue
        d = json.loads(body)
        token = (d.get("data") or d)["token"]
        st, body = http("GET", "/api/me/permissions", token)
        perms = json.loads(body) if st == 200 else []
        if isinstance(perms, dict):
            perms = perms.get("data", [])
        held = {p if isinstance(p, str) else (p.get("permissionCode") or p.get("code")) for p in perms}
        held = {h for h in held if h}

        denied = defaultdict(list)
        allowed = 0
        for r in gated:
            need = r["permissions"][0]
            if need in held:
                allowed += 1
            else:
                denied[r["controller"]].append("%s %s (%s)" % (r["method"], r["route"], need))

        report[user] = {"role": label, "permissions": sorted(held), "allowed": allowed,
                        "denied": {k: v for k, v in sorted(denied.items())}}
        print("\n== %-9s %-18s quyền=%d · ghi được %d/%d ==" % (user, label, len(held), allowed, len(gated)))
        for ctrl, items in sorted(denied.items(), key=lambda kv: -len(kv[1]))[:12]:
            print("   -%3d %s" % (len(items), ctrl))

    out = os.path.join(HERE, "t1_write_gate_impact.json")
    json.dump(report, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\nghi %s" % out)


if __name__ == "__main__":
    main()
