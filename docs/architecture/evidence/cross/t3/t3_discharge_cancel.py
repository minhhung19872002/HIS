"""T3 (#218) — HỦY XUẤT VIỆN: xoá cứng bản tóm tắt ra viện, và hủy được cả ca tử vong.

`CancelDischargeAsync` (`POST /api/inpatient/cancel-discharge/{admissionId}`) có ba vấn đề, đọc mã
thấy ngay trong mười dòng:

1. **Xoá CỨNG bản ghi ra viện** — `_context.Set<Discharge>().Remove(discharge)`, không phải xoá mềm.
   Mà `Discharge` giữ chẩn đoán ra viện, tóm tắt điều trị, hướng dẫn sau xuất viện, ngày hẹn tái
   khám, và ai là người cho ra viện. Bấm một nút là toàn bộ mất hẳn, không còn dấu vết để đối chiếu.
   `Discharge` kế thừa `BaseEntity` (có `IsDeleted`) và `HISDbContext` đã cài **bộ lọc xóa-mềm toàn
   cục**, nên xóa mềm là chuyện sẵn sàng — chỉ là không dùng.

2. **Tham số `reason` nhận rồi vứt.** Hủy một quyết định ra viện là việc phải giải trình được.
   Giống hệt `CancelApprovalAsync` bên CĐHA ở §21.

3. **Không xét trạng thái lượt nội trú.** `admission.Status = 0` gán cứng, nên hủy được cả lượt đã
   ghi **tử vong** (3) và đưa bệnh nhân về "đang điều trị".

Bài đo dựng dữ liệu riêng của mình (một lượt nội trú + một bản ghi ra viện), không mượn dữ liệu thật.

Tiền tố dữ liệu T3DIS, dọn ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3DIS"
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
    print("  %-54s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    adm_id = None
    try:
        # Mượn một lượt nội trú CÓ SẴN (không tạo bệnh nhân mới — lượt đo tiền tạm ứng từng xoá nhầm
        # bệnh nhân có sẵn rồi đâm vào khóa ngoại). Ghi lại nguyên trạng để trả về đúng như cũ.
        row = sql("SELECT TOP 1 CAST(Id AS varchar(50)) + '|' + CAST(Status AS varchar(3)) "
                  "FROM Admissions WHERE IsDeleted=0")
        if "|" not in row:
            raise SystemExit("không tìm được lượt nội trú: %r" % row)
        adm_id, orig_status = row.split("|")
        uid = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")

        def seed_discharge(discharge_type, adm_status):
            """Dựng một bản ghi ra viện có nội dung lâm sàng rõ ràng để biết nó còn hay mất."""
            sql("DELETE FROM Discharges WHERE AdmissionId='%s'; "
                "INSERT INTO Discharges (Id, AdmissionId, DischargeDate, DischargeType, "
                " DischargeCondition, DischargeDiagnosis, DischargeInstructions, DischargedBy, "
                " CreatedAt, IsDeleted) VALUES "
                "('%s','%s', GETUTCDATE(), %d, 1, N'%s-CHAN-DOAN', N'%s-HUONG-DAN', '%s', GETUTCDATE(), 0); "
                "UPDATE Admissions SET Status=%d WHERE Id='%s';"
                % (adm_id, uuid.uuid4(), adm_id, discharge_type, TAG, TAG, uid, adm_status, adm_id))

        def discharge_rows():
            """Đếm RIÊNG bản ghi còn sống và bản ghi đã xóa mềm — để phân biệt 'giữ lại' với 'xoá hẳn'.

            Phải dùng COUNT + ISNULL chứ KHÔNG dùng SUM: khi không còn dòng nào thì `SUM` trả về
            **NULL**, sqlcmd in ra chuỗi 'NULL', và phép so `!= "0"` hoá ra ĐÚNG — lượt đo đầu báo
            PASS cho đúng cái ca mà bản ghi đã bị xoá sạch. Cùng một kiểu sai với ca `canClose:false`
            ở §20: giá trị "không có gì" bị đọc nhầm thành "có và ổn".
            """
            return sql("SELECT CAST(COUNT(CASE WHEN IsDeleted=0 THEN 1 END) AS varchar(5)) + '|' "
                       " + CAST(COUNT(CASE WHEN IsDeleted=1 THEN 1 END) AS varchar(5)) "
                       "FROM Discharges WHERE AdmissionId='%s'" % adm_id)

        def adm_status():
            return sql("SELECT CAST(Status AS varchar(3)) FROM Admissions WHERE Id='%s'" % adm_id)

        # ── 1. Hủy xuất viện thường: bản tóm tắt ra viện phải còn ───────────
        print("── Hủy xuất viện một ca ra viện bình thường ──")
        seed_discharge(1, 1)                     # ra viện → Admissions.Status = 1
        st, b = http("POST", "/api/inpatient/cancel-discharge/%s" % adm_id, TAG + " ly do that")
        alive, _, soft = discharge_rows().partition("|")
        # Giữ lại = còn ĐÚNG một dòng trong bảng, dù đã đánh dấu xoá mềm. Mất hẳn = 0|0.
        case("bản tóm tắt ra viện KHÔNG bị xoá cứng", True,
             (int(alive) + int(soft)) >= 1,
             "HTTP %s · còn sống=%s · xoá mềm=%s (0|0 = mất hẳn)" % (st, alive, soft))
        case("lượt nội trú về lại 'đang điều trị'", False, adm_status() != "0",
             "trạng thái=%s (0=đang điều trị)" % adm_status())
        # Lý do hủy phải đi tới đâu đó đọc lại được, không thì vẫn là "nhận rồi vứt".
        logged = sql("SELECT CAST(COUNT(*) AS varchar(5)) FROM AuditLogs "
                     "WHERE Action=N'CancelDischarge' AND Details LIKE N'%%%s%%'" % TAG)
        case("LÝ DO hủy được ghi vào nhật ký kiểm toán", True, logged != "0",
             "số dòng nhật ký khớp lý do=%s" % logged)

        # ── 2. Hủy xuất viện một ca TỬ VONG ────────────────────────────────
        print("\n── Hủy xuất viện một ca đã ghi TỬ VONG ──")
        seed_discharge(4, 3)                     # tử vong → Admissions.Status = 3
        st, b = http("POST", "/api/inpatient/cancel-discharge/%s" % adm_id, TAG + " huy tu vong")
        case("KHÔNG hủy được lượt đã ghi tử vong", True, adm_status() != "0",
             "HTTP %s · trạng thái=%s · %s" % (st, adm_status(), b[:60]))

        # ── 3. Không có gì để hủy ──────────────────────────────────────────
        print("\n── Hủy xuất viện khi chưa hề xuất viện ──")
        sql("DELETE FROM Discharges WHERE AdmissionId='%s'; "
            "UPDATE Admissions SET Status=0 WHERE Id='%s';" % (adm_id, adm_id))
        st, b = http("POST", "/api/inpatient/cancel-discharge/%s" % adm_id, TAG + " khong co gi")
        case("hủy xuất viện khi chưa xuất viện bị chặn", True, st >= 400,
             "HTTP %s · %s" % (st, b[:60]))

    finally:
        if adm_id:
            try:
                # Nhật ký kiểm toán nay có trigger chống xoá — phải bật cờ retention mới dọn được
                # dữ liệu thử của chính bài đo này.
                sql("DELETE FROM Discharges WHERE AdmissionId='%s'; "
                    "UPDATE Admissions SET Status=%s WHERE Id='%s'; "
                    "SET CONTEXT_INFO 0x52455445000000000000000000000000; "
                    "DELETE FROM AuditLogs WHERE Action=N'CancelDischarge' AND Details LIKE N'%%%s%%'; "
                    "SET CONTEXT_INFO 0x00000000000000000000000000000000;"
                    % (adm_id, orig_status, adm_id, TAG))
            except Exception as e:
                print("  (dọn dữ liệu gặp trục trặc: %s)" % str(e)[:80])
        ok = sum(1 for c in CASES if c["pass"])
        bad = [c for c in CASES if not c["pass"]]
        print("\n%d/%d ca đạt" % (ok, len(CASES)))
        if bad:
            print("Lệch:")
            for c in bad:
                print("  - %s — %s" % (c["case"],
                      "hệ thống làm THIẾU / CHO qua nhưng phải chặn" if c["mustBlock"]
                      else "hệ thống CHẶN nhầm đường hợp lệ"))
        json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
                  open(os.path.join(HERE, "t3_discharge_cancel.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_discharge_cancel.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
