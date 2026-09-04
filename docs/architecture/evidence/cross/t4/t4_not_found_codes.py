"""#219/T4 — quy tắc nghiệp vụ có còn hiện ra như sự cố máy chủ nữa không.

DomainExceptionFilter map KeyNotFoundException → 404 và InvalidOperationException → 400 kèm
message; `Exception` trần rơi vào nhánh cuối → 500. Trước đợt sửa, 226 guard trong tầng service
dùng `Exception` trần, nên hỏi một bản ghi không tồn tại trả về **500** — người dùng thấy "lỗi máy
chủ" cho một việc hoàn toàn bình thường, và giao diện không phân biệt được với sự cố thật.

Bài đo: gọi các endpoint nhận id trên những controller ĐÃ gắn filter, truyền một GUID không tồn
tại, rồi xem mã trả về. Kỳ vọng 404 (hoặc 400 nếu endpoint đó coi là lỗi tham số). **Không được có
500** — 500 nghĩa là còn guard nào đó chưa đổi kiểu.

Cần: API :5106, tài khoản admin.
"""
import json, os, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
GHOST = "00000000-0000-0000-0000-0000000000ff"   # chắc chắn không có trong DB

PROBES = [
    ("GET",  "/api/BillingComplete/invoices/%s" % GHOST,                 "hóa đơn"),
    ("GET",  "/api/BillingComplete/cash-books/%s" % GHOST,               "sổ quỹ"),
    ("GET",  "/api/BillingComplete/e-invoices/%s" % GHOST,               "hóa đơn điện tử"),
    ("POST", "/api/BillingComplete/e-invoices/%s/cancel" % GHOST,        "hủy hóa đơn điện tử"),
    ("GET",  "/api/BillingComplete/records/%s/lock-status" % GHOST,      "trạng thái khóa hồ sơ"),
    ("GET",  "/api/BillingComplete/discounts/history/%s" % GHOST,        "lịch sử miễn giảm"),
    ("GET",  "/api/warehouse/stock-receipts/%s" % GHOST,                 "phiếu nhập kho"),
    ("GET",  "/api/warehouse/stock-issues/%s" % GHOST,                   "phiếu xuất kho"),
    ("GET",  "/api/medical-record-archive/borrows/%s" % GHOST,           "phiếu mượn hồ sơ"),
    ("GET",  "/api/reception/admissions/%s" % GHOST,                     "lượt tiếp đón"),
    ("GET",  "/api/Patients/%s" % GHOST,                                 "bệnh nhân"),
    ("GET",  "/api/examination/%s" % GHOST,                              "lượt khám"),
    ("GET",  "/api/inpatient/admissions/%s" % GHOST,                     "lượt nội trú"),
    ("GET",  "/api/SurgeryComplete/requests/%s" % GHOST,                 "yêu cầu phẫu thuật"),
    ("GET",  "/api/procurement/%s" % GHOST,                              "gói mua sắm"),
    ("GET",  "/api/ivf-lab/cycles/%s" % GHOST,                           "chu kỳ IVF"),
]


def http(method, path, token):
    req = urllib.request.Request(BASE + path, method=method,
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer " + token})
    if method == "POST":
        req.data = b"{}"
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def main():
    st, b = http("POST", "/api/auth/login", "")
    req = urllib.request.Request(BASE + "/api/auth/login", data=b'{"username":"admin","password":"Admin@123"}',
                                 method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())
    tok = (d.get("data", d))["token"]

    rows, bad = [], []
    print("gọi %d endpoint bằng một id không tồn tại\n" % len(PROBES))
    print("%-6s %-52s %-22s %s" % ("HTTP", "endpoint", "nghiệp vụ", "kết luận"))
    for method, path, label in PROBES:
        code, body = http(method, path, tok)
        if code == 500:
            verdict = "VẪN 500 — còn guard chưa đổi kiểu"
            bad.append((path, body[:120]))
        elif code == 404:
            verdict = "OK (không tìm thấy)"
        elif code == 400:
            verdict = "OK (lỗi tham số)"
        elif code in (200, 204):
            verdict = "endpoint trả rỗng, không ném guard"
        else:
            verdict = "khác"
        rows.append({"method": method, "path": path, "label": label, "status": code,
                     "verdict": verdict, "body": body[:160].replace("\n", " ")})
        print("%-6s %-52s %-22s %s" % (code, path.replace(GHOST, "<id-lạ>")[:52], label, verdict))

    print("\nsố endpoint còn trả 500: %d/%d" % (len(bad), len(rows)))
    for p, b in bad:
        print("   %s → %s" % (p, b))
    json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "probes": rows},
              open(os.path.join(HERE, "t4_not_found_codes.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("\nghi t4_not_found_codes.json")


if __name__ == "__main__":
    main()
