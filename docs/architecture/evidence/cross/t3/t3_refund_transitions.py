"""T3 (#218) — chuyển trạng thái PHIẾU HOÀN TIỀN, đo bằng API thật.

Cùng câu hỏi như đơn thuốc, nhưng ở miền tiền. Đọc code trước đã thấy dấu hiệu: trong
BillingCompleteService.Refunds, `ApproveRefundAsync` và `ConfirmRefundAsync` chỉ kiểm phiếu có tồn
tại rồi gán thẳng trạng thái — không có một guard nào. Chỉ `CancelRefundAsync` chặn việc hủy lại
phiếu đã hủy.

Hệ quả cần đo:
  - xác nhận CHI TIỀN cho phiếu chưa từng được duyệt (0 → 4);
  - duyệt / chi tiền cho phiếu đã TỪ CHỐI (2 → 1, 2 → 4);
  - chi tiền cho phiếu đã HỦY (5 → 4).

Phiếu hoàn nằm trong bảng Receipts với ReceiptType = 3. Script dựng phiếu ở từng trạng thái xuất
phát (mã có tiền tố T3REFUND), gọi endpoint, rồi đọc lại trạng thái trong DB; dọn sạch ở cuối.

Cần: API :5106, DB his-sqlserver, tài khoản admin.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3REFUND"

NAMES = {0: "Chờ duyệt", 1: "Đã duyệt", 2: "Từ chối", 4: "Đã chi hoàn", 5: "Đã hủy"}

# Luật nghiệp vụ của phiếu hoàn: tiền chỉ ra khỏi quỹ sau khi ĐÃ DUYỆT.
LEGAL = {
    0: {1, 2, 5},   # chờ duyệt → duyệt | từ chối | hủy
    1: {4, 5},      # đã duyệt  → chi hoàn | hủy
    2: set(),       # từ chối   → kết thúc
    4: set(),       # đã chi    → kết thúc
    5: set(),       # đã hủy    → kết thúc
}

ACTIONS = [
    ("approve", "POST", "/api/BillingComplete/refunds/approve", 1, lambda i: {"refundId": i, "isApproved": True}),
    ("reject",  "POST", "/api/BillingComplete/refunds/approve", 2, lambda i: {"refundId": i, "isApproved": False, "rejectReason": "T3"}),
    ("confirm", "POST", "/api/BillingComplete/refunds/confirm", 4, lambda i: {"refundId": i, "notes": "T3", "transactionNumber": "T3"}),
    ("cancel",  "POST", "/api/BillingComplete/refunds/{id}/cancel", 5, lambda i: {"reason": "T3"}),
]


def http(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           # Receipts có index đòi QUOTED_IDENTIFIER ON; sqlcmd -Q mặc định tắt nên INSERT bị từ chối.
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    return (out.stdout or "").strip()


def login():
    st, b = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, b[:200]))
    d = json.loads(b)
    return (d.get("data", d))["token"]


def seed(status):
    code = "%s-%d-%d" % (TAG, status, int(time.time() * 1000) % 100000)
    sql("""
DECLARE @p uniqueidentifier = (SELECT TOP 1 Id FROM Patients WHERE IsDeleted=0 ORDER BY CreatedAt);
DECLARE @u uniqueidentifier = (SELECT TOP 1 Id FROM Users WHERE IsDeleted=0 ORDER BY CreatedAt);
INSERT INTO Receipts (Id, ReceiptCode, ReceiptDate, PatientId, ReceiptType, PaymentMethod,
  Amount, Discount, FinalAmount, Status, CashierId, CreatedAt, IsDeleted, DiscountReasonCode)
VALUES (NEWID(), '%s', SYSUTCDATETIME(), @p, 3, 1, 100000, 0, 100000, %d, @u, SYSUTCDATETIME(), 0, '');
""" % (code, status))
    return sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Receipts WHERE ReceiptCode='%s'" % code)


def status_of(rid):
    v = sql("SELECT CAST(Status AS varchar(10)) FROM Receipts WHERE Id='%s'" % rid)
    return int(v) if v.strip().lstrip("-").isdigit() else -1


def main():
    tok = login()
    sql("DELETE FROM Receipts WHERE ReceiptCode LIKE '%s%%'" % TAG)

    rows = []
    for frm in sorted(LEGAL):
        for name, method, tmpl, to, body in ACTIONS:
            if to == frm:
                continue
            rid = seed(frm)
            if not rid:
                print("  không dựng được phiếu hoàn ở trạng thái %s" % frm)
                continue
            st, resp = http(method, tmpl.replace("{id}", rid), tok, body(rid))
            after = status_of(rid)
            legal = to in LEGAL.get(frm, set())
            changed = after == to
            verdict = "OK" if changed == legal else ("KHÔNG-CHẶN" if changed else "CHẶN-NHẦM")
            rows.append({"from": frm, "fromName": NAMES[frm], "action": name, "to": to,
                         "toName": NAMES.get(to, str(to)), "legal": legal, "http": st,
                         "statusAfter": after, "changed": changed, "verdict": verdict,
                         "body": resp[:120].replace(chr(10), " ")})
            sql("DELETE FROM Receipts WHERE Id='%s'" % rid)

    sql("DELETE FROM Receipts WHERE ReceiptCode LIKE '%s%%'" % TAG)

    print("\n== Phiếu hoàn tiền: chuyển trạng thái đo trên API đang chạy ==")
    print("%-12s %-9s %-12s %-9s %-6s %s" % ("Từ", "Hành động", "Đến", "Hợp lệ?", "HTTP", "Kết quả"))
    for r in rows:
        print("%-12s %-9s %-12s %-9s %-6s %s"
              % (r["fromName"], r["action"], r["toName"],
                 "có" if r["legal"] else "KHÔNG", r["http"], r["verdict"]))

    bad = [r for r in rows if r["verdict"] == "KHÔNG-CHẶN"]
    print("\nchuyển BẤT HỢP LỆ mà hệ thống vẫn cho: %d/%d" % (len(bad), len(rows)))
    for r in bad:
        print("   %s --%s--> %s (HTTP %s)" % (r["fromName"], r["action"], r["toName"], r["http"]))

    json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "entity": "Refund (Receipts.ReceiptType=3)",
               "legalTransitions": {str(k): sorted(v) for k, v in LEGAL.items()}, "probes": rows},
              open(os.path.join(HERE, "t3_refund_matrix.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("\nghi t3_refund_matrix.json")


if __name__ == "__main__":
    main()
