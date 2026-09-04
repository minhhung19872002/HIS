"""T3 (#218) — HỦY CHỈ ĐỊNH DỊCH VỤ ghi sai số: bệnh nhân vẫn bị tính tiền dịch vụ đã hủy.

Tìm ra bằng `t3_status_vocabulary_sweep.py` chứ không phải tình cờ — đúng mục đích của bộ dò đó.

`ServiceRequests.Status`: **4 = đã hủy**. Toàn bộ phần còn lại của hệ thống đồng thuận chuyện này:

* `BillingCompleteService.Printing` (3 chỗ) lọc `d.ServiceRequest.Status != 4` để **loại chỉ định đã
  hủy khỏi hóa đơn**;
* `BillingCompleteService.Refunds` cũng `Status != 4`;
* `InpatientCompleteService.NutritionReports` ném lỗi khi `sr.Status == 4`
  ("Cannot update cancelled ServiceRequest");
* `InpatientCompleteService.OrdersReports` ghi `Status = 4` kèm chú thích nói thẳng
  *"ServiceRequest.Status: 4=hủy; SRD.Status: 3=hủy"*;
* `LabCancelChainService` coi 3 là một trạng thái đang-làm-việc (`if (sr.Status == 3) sr.Status = 2`).

Nhưng `ExaminationCompleteService.CancelServiceOrderAsync`
(`POST /api/examination/service-orders/{id}/cancel`) lại viết:

    request.Status = 3; // Cancelled

Tên hàm, chú thích, tham số `reason` — tất cả đều nói đây là hủy. Chỉ con số là sai.

Hậu quả không nằm ở màn hình mà nằm ở **hóa đơn**: chỉ định đã hủy có `Status = 3`, tức `!= 4`, nên
mọi câu lọc của bên viện phí vẫn tính nó vào. **Bệnh nhân bị thu tiền một dịch vụ đã bị hủy.**

Bài đo vì thế không hỏi "trạng thái sau khi hủy là mấy" — nó hỏi **"bên viện phí có còn tính tiền
dịch vụ đó không"**, đúng cái câu mà người bệnh quan tâm.

Tiền tố dữ liệu T3SOC, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3SOC"
CASES = []
TOKEN = None


def http(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json",
                                          "Authorization": "Bearer %s" % TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def sql(q):
    cmd = ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
           "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q",
           "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    text = (out.stdout or "").strip()
    if text.startswith("Msg ") or "Invalid column name" in text or "Invalid object name" in text:
        raise SystemExit("cau SQL hong, dung de khong do mu:\n  %s\n  %s" % (q[:120], text[:200]))
    return text


def case(name, ok, detail):
    CASES.append({"case": name, "pass": bool(ok), "detail": detail})
    print("  %-56s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    sr_id = None
    try:
        row = sql("SELECT TOP 1 CAST(sr.Id AS varchar(50)) + '|' + CAST(sr.Status AS varchar(3)) "
                  "FROM ServiceRequests sr WHERE sr.IsDeleted=0 AND sr.MedicalRecordId IS NOT NULL")
        if "|" not in row:
            raise SystemExit("không tìm được chỉ định dịch vụ: %r" % row)
        sr_id, orig_status = row.split("|")

        def status():
            return sql("SELECT CAST(Status AS varchar(3)) FROM ServiceRequests WHERE Id='%s'" % sr_id)

        def billing_counts_it():
            """Đúng câu lọc mà bên viện phí đang dùng: Status != 4 thì VẪN TÍNH TIỀN."""
            return sql("SELECT CAST(COUNT(*) AS varchar(5)) FROM ServiceRequests "
                       "WHERE Id='%s' AND Status <> 4" % sr_id) != "0"

        # Chỉ hủy được khi đang ở trạng thái 0 (theo chính guard của hàm).
        sql("UPDATE ServiceRequests SET Status=0 WHERE Id='%s'" % sr_id)

        print("── Hủy một chỉ định dịch vụ ──")
        st, b = http("POST", "/api/examination/service-orders/%s/cancel" % sr_id,
                     {"Reason": TAG + " ly do huy"})
        after = status()
        case("chỉ định sau khi hủy mang đúng số 'đã hủy' (4)", after == "4",
             "HTTP %s · trạng thái=%s (4=đã hủy theo cả phần còn lại của hệ thống)" % (st, after))

        # Đây mới là câu hỏi thật sự quan trọng, và là thứ người bệnh nhìn thấy.
        case("bên VIỆN PHÍ thôi tính tiền dịch vụ đã hủy", not billing_counts_it(),
             "câu lọc `Status <> 4` của hóa đơn còn khớp chỉ định này: %s"
             % ("CÒN — vẫn bị tính tiền" if billing_counts_it() else "không"))

        # Đối chứng âm: hủy một chỉ định KHÔNG ở trạng thái chờ thì hàm vốn đã từ chối, giữ nguyên.
        print("\n── Đối chứng âm: chỉ định đang thực hiện thì không hủy kiểu này ──")
        sql("UPDATE ServiceRequests SET Status=1 WHERE Id='%s'" % sr_id)
        st, b = http("POST", "/api/examination/service-orders/%s/cancel" % sr_id,
                     {"Reason": TAG + " khong duoc huy"})
        case("chỉ định đang thực hiện KHÔNG bị hủy nhầm", status() == "1",
             "HTTP %s · trạng thái=%s (giữ nguyên 1)" % (st, status()))

    finally:
        if sr_id:
            try:
                sql("UPDATE ServiceRequests SET Status=%s, Notes=NULL WHERE Id='%s'" % (orig_status, sr_id))
            except Exception as e:
                print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_service_order_cancel.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_service_order_cancel.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
