"""#219/T4 — lỗi trên ĐƯỜNG GHI có cùng một hình dạng không.

#219 yêu cầu "lỗi cùng shape {success:false, message, errors}" để giao diện chỉ phải viết MỘT
error-handler. Bài đo này gọi các endpoint ghi tới hạn (tiền, đơn thuốc, tiếp đón, nội trú) bằng
payload sai hoặc id không tồn tại, rồi ghi lại **tập khóa ở tầng ngoài cùng** của phần thân trả về.

Không sửa gì — chỉ chụp lại hiện trạng để biết FE đang phải xử lý bao nhiêu hình dạng.

Cần: API :5106, tài khoản admin.
"""
import json, os, sys, urllib.error, urllib.request
from collections import Counter
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
GHOST = "00000000-0000-0000-0000-0000000000ff"

CASES = [
    ("thu tiền: số tiền <= 0",       "POST", "/api/BillingComplete/payments",
     {"patientId": GHOST, "amount": 0, "paymentMethod": "1"}),
    ("tạm ứng: số tiền <= 0",        "POST", "/api/BillingComplete/deposits",
     {"patientId": GHOST, "amount": 0, "paymentMethod": 1}),
    ("hoàn tiền: thiếu chứng từ gốc", "POST", "/api/BillingComplete/refunds",
     {"patientId": GHOST, "refundAmount": 1000, "reason": "T4"}),
    ("duyệt hoàn tiền: id không có",  "POST", "/api/BillingComplete/refunds/approve",
     {"refundId": GHOST, "isApproved": True}),
    ("hủy phiếu thu: id không có",    "POST", "/api/BillingComplete/payments/%s/cancel" % GHOST,
     {"paymentId": GHOST, "reason": "T4"}),
    ("dược duyệt đơn: id không có",   "POST", "/api/pharmacy/prescriptions/%s/accept" % GHOST, {}),
    ("kê đơn: lượt khám không có",    "POST", "/api/examination/prescriptions",
     {"examinationId": GHOST, "prescriptionType": 1, "paymentCategory": 2, "totalDays": 1, "items": []}),
    ("kê đơn: sai kiểu dữ liệu",      "POST", "/api/examination/prescriptions",
     {"examinationId": "không-phải-guid", "totalDays": "nhiều"}),
    ("tiếp đón: thiếu phòng khám",    "POST", "/api/reception/register/fee",
     {"patientId": GHOST, "serviceType": 2}),
    ("nhập viện: hồ sơ không có",     "POST", "/api/inpatient/admit-from-opd",
     {"medicalRecordId": GHOST, "departmentId": GHOST, "roomId": GHOST,
      "admissionType": 1, "attendingDoctorId": GHOST}),
    ("xuất viện: lượt không có",      "POST", "/api/inpatient/discharge",
     {"admissionId": GHOST, "dischargeDate": "2026-09-04T00:00:00", "dischargeType": 1,
      "dischargeCondition": 1}),
]


def http(method, path, token, body):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(body).encode(), method=method,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def shape(body):
    try:
        d = json.loads(body)
    except Exception:
        return "(không phải JSON)"
    if not isinstance(d, dict):
        return "(không phải object)"
    return "{" + ", ".join(sorted(d.keys())) + "}"


def main():
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=b'{"username":"admin","password":"Admin@123"}', method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        tok = (json.loads(r.read().decode()).get("data") or {})["token"]

    rows = []
    print("%-34s %-6s %s" % ("tình huống", "HTTP", "khóa ở tầng ngoài cùng"))
    for label, method, path, body in CASES:
        code, resp = http(method, path, tok, body)
        sh = shape(resp)
        rows.append({"case": label, "method": method, "path": path, "status": code,
                     "shape": sh, "body": resp[:180].replace(chr(10), " ")})
        print("%-34s %-6s %s" % (label, code, sh))

    shapes = Counter(r["shape"] for r in rows)
    print("\n== %d hình dạng khác nhau trên %d lượt gọi ==" % (len(shapes), len(rows)))
    for sh, n in shapes.most_common():
        print("   %2d lượt  %s" % (n, sh))

    json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"),
               "distinctShapes": len(shapes), "shapes": dict(shapes), "cases": rows},
              open(os.path.join(HERE, "t4_error_envelope.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("\nghi t4_error_envelope.json")


if __name__ == "__main__":
    main()
