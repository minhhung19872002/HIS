"""T3 (#218) — GỬI ĐƠN THUỐC LÊN CỔNG QUỐC GIA: ghi trạng thái gửi vào ô trạng thái CẤP PHÁT.

`Prescriptions.Status` là trạng thái **duyệt và cấp phát thuốc**, ghi rõ ngay trên entity:

    0-Chờ duyệt · 1-Đã duyệt · 2-Đã cấp phát · 3-Hoàn trả · 4-Hủy

`NationalPrescriptionService` lại dùng đúng ô đó để ghi trạng thái **gửi lên Cổng đơn thuốc quốc
gia** — một chuyện hoàn toàn khác:

* `SubmitAsync` → `prescription.Status = 1`;
* `RetrySubmissionAsync` → `Status = 1`;
* `CancelSubmissionAsync` → `Status = 4`.

Ba hậu quả, không phải lý thuyết:

1. **Gửi lên cổng = tự duyệt đơn.** Một đơn đang `0 Chờ duyệt` (chờ dược sĩ) sau khi gửi lên cổng
   thành `1 Đã duyệt`, bỏ qua hẳn bước duyệt của dược sĩ.
2. **Gửi lại một đơn ĐÃ CẤP PHÁT là kéo nó lùi về "đã duyệt"** — thuốc đã phát ra khỏi quầy mà hệ
   thống lại bảo chưa phát.
3. **Hủy GỬI = hủy ĐƠN THUỐC.** `Status = 4` là "Hủy" của chính đơn thuốc. Bấm "hủy gửi lên cổng"
   là voiding đơn thuốc của bệnh nhân.

Đây là lần thứ ba trong đợt gặp đúng kiểu này: một tính năng mượn ô trạng thái của tính năng khác
(§20 đóng hồ sơ ghi `Status=5` = "đã hủy"; §24 chú thích `Admissions.Status` nói ngược). Ở đây còn
thấy rõ hơn: `SearchAsync` của chính màn hình Cổng ĐTQG lọc theo `p.Status`, tức cả màn hình đang
đọc trạng thái cấp phát và tưởng đó là trạng thái gửi.

Bài đo nhìn thẳng vào `Prescriptions.Status` trước và sau mỗi lệnh.

Tiền tố dữ liệu T3NRX, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3NRX"
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


def case(name, must_block, blocked, detail):
    ok = bool(blocked) == bool(must_block)
    CASES.append({"case": name, "mustBlock": must_block, "blocked": bool(blocked),
                  "pass": ok, "detail": detail})
    print("  %-58s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


NAMES = {"0": "Chờ duyệt", "1": "Đã duyệt", "2": "Đã cấp phát", "3": "Hoàn trả", "4": "Hủy"}


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    rx_id = None
    try:
        row = sql("SELECT TOP 1 CAST(Id AS varchar(50)) + '|' + CAST(Status AS varchar(3)) "
                  "FROM Prescriptions WHERE IsDeleted=0")
        if "|" not in row:
            raise SystemExit("không tìm được đơn thuốc: %r" % row)
        rx_id, orig_status = row.split("|")

        def set_status(s):
            sql("UPDATE Prescriptions SET Status=%d WHERE Id='%s'" % (s, rx_id))

        def status():
            return sql("SELECT CAST(Status AS varchar(3)) FROM Prescriptions WHERE Id='%s'" % rx_id)

        def label():
            return NAMES.get(status(), status())

        # ── 1. Gửi lên cổng có tự duyệt đơn không ──────────────────────────
        print("── Gửi một đơn ĐANG CHỜ DƯỢC SĨ DUYỆT lên cổng ──")
        set_status(0)
        st, b = http("POST", "/api/national-prescription/submit/%s" % rx_id)
        case("gửi lên cổng KHÔNG tự duyệt đơn thuốc", True, status() == "0",
             "HTTP %s · trạng thái cấp phát: Chờ duyệt → %s" % (st, label()))

        # ── 2. Gửi lại một đơn ĐÃ CẤP PHÁT ─────────────────────────────────
        print("\n── Gửi lại một đơn ĐÃ CẤP PHÁT cho bệnh nhân ──")
        set_status(2)
        st, b = http("POST", "/api/national-prescription/retry/%s" % rx_id)
        case("gửi lại KHÔNG kéo đơn đã cấp phát lùi lại", True, status() == "2",
             "HTTP %s · trạng thái cấp phát: Đã cấp phát → %s" % (st, label()))

        # ── 3. Hủy GỬI có hủy luôn ĐƠN THUỐC không ─────────────────────────
        print("\n── Hủy gửi lên cổng (đơn đang đã duyệt) ──")
        set_status(1)
        st, b = http("POST", "/api/national-prescription/cancel/%s" % rx_id)
        case("hủy GỬI KHÔNG hủy luôn đơn thuốc", True, status() != "4",
             "HTTP %s · trạng thái cấp phát: Đã duyệt → %s" % (st, label()))

        # ── ĐỐI CHỨNG ÂM: việc gửi vẫn phải được GHI NHẬN ở đâu đó ─────────
        # Ba ca trên đều dạng "không được đụng vào Status". Một bản vá gỡ sạch mọi lệnh ghi cũng
        # đạt 3/3 — tức tính năng gửi cổng biến mất mà bài đo vẫn báo xanh. Hai ca dưới bắt buộc
        # trạng thái gửi phải nằm ở ô RIÊNG của cổng và đọc lại được.
        print("\n── Đối chứng âm: trạng thái GỬI phải được ghi vào ô riêng ──")
        sql("UPDATE Prescriptions SET Status=0, NationalPortalStatus=NULL, "
            " NationalPortalTransactionId=NULL, NationalPortalSubmittedAt=NULL WHERE Id='%s'" % rx_id)
        st, b = http("POST", "/api/national-prescription/submit/%s" % rx_id)
        portal = sql("SELECT ISNULL(CAST(NationalPortalStatus AS varchar(3)), '(trong)') + '|' "
                     " + ISNULL(NationalPortalTransactionId, N'(trong)') + '|' "
                     " + CASE WHEN NationalPortalSubmittedAt IS NULL THEN 'khong' ELSE 'co' END "
                     "FROM Prescriptions WHERE Id='%s'" % rx_id)
        p_status, p_txn, p_at = portal.split("|")
        case("gửi lên cổng ĐƯỢC ghi vào ô riêng của cổng", False,
             not (p_status == "1" and p_txn.startswith("CQLKCB-") and p_at == "co"),
             "HTTP %s · NationalPortalStatus|TransactionId|SubmittedAt = %s" % (st, portal[:70]))

        st, b = http("POST", "/api/national-prescription/cancel/%s" % rx_id)
        p2 = sql("SELECT ISNULL(CAST(NationalPortalStatus AS varchar(3)), '(trong)') + '|' "
                 " + CAST(Status AS varchar(3)) FROM Prescriptions WHERE Id='%s'" % rx_id)
        case("hủy gửi ghi vào ô cổng, đơn thuốc vẫn nguyên", False,
             p2 != "3|0",
             "HTTP %s · NationalPortalStatus|Status = %r (mong đợi '3|0')" % (st, p2))

    finally:
        if rx_id:
            try:
                sql("UPDATE Prescriptions SET Status=%s, NationalPortalStatus=NULL, "
                    " NationalPortalTransactionId=NULL, NationalPortalSubmittedAt=NULL "
                    "WHERE Id='%s'" % (orig_status, rx_id))
            except Exception as e:
                print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s" % c["case"])
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_national_prescription.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_national_prescription.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
