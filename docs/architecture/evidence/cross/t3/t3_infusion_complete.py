"""T3 (#218) — KẾT THÚC TRUYỀN DỊCH: kết thúc TRƯỚC khi bắt đầu, và kết thúc lại lần hai.

`CompleteInfusionAsync` (`POST /api/inpatient/infusion-records/{id}/complete`) nhận thẳng `endTime`
từ người gọi rồi ghi xuống, không kiểm gì:

    entity.EndTime = endTime;
    entity.DurationMinutes = (int)Math.Max(0, (endTime - entity.StartTime).TotalMinutes);
    entity.CompletedBy = userId;
    entity.Status = 1; // Hoàn thành

Dấu hiệu nằm ngay trong `Math.Max(0, …)`: người viết **biết** hiệu số có thể âm, nhưng chọn kẹp
triệu chứng thay vì từ chối dữ liệu vào. Kết quả là một phiếu truyền dịch có thể mang `EndTime` sớm
hơn `StartTime` với thời lượng 0 phút — một y lệnh truyền dịch kết thúc trước khi bắt đầu, nằm trong
hồ sơ chăm sóc người bệnh.

Và không có gác chống gọi lại: kết thúc một phiếu **đã kết thúc** sẽ ghi đè `EndTime` lẫn
`CompletedBy` — tức xoá mất ai là người thật sự kết thúc lượt truyền và vào lúc nào.

Bài đo dựng phiếu truyền dịch riêng của mình, dọn ở cuối.
Tiền tố dữ liệu T3INF.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3INF"
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
    print("  %-56s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))
    return ok


def main():
    global TOKEN
    req = urllib.request.Request(BASE + "/api/auth/login",
                                 data=json.dumps({"username": "admin", "password": "Admin@123"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        TOKEN = json.loads(r.read().decode())["data"]["token"]

    inf_id = str(uuid.uuid4())
    try:
        adm = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Admissions WHERE IsDeleted=0")
        uid = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")
        if len(adm) != 36:
            raise SystemExit("không tìm được lượt nội trú: %r" % adm)

        def seed(status=0):
            """Phiếu truyền dịch bắt đầu lúc 10:00 HÔM NAY."""
            sql("DELETE FROM InfusionRecords WHERE Id='%s'; "
                "INSERT INTO InfusionRecords (Id, AdmissionId, FluidName, Volume, DropRate, "
                " StartTime, StartedBy, Status, CreatedAt, IsDeleted) VALUES "
                "('%s','%s', N'%s-NaCl 0.9%%', 500, 40, "
                " DATEADD(hour, 10, CAST(CAST(GETDATE() AS date) AS datetime2)), '%s', %d, GETUTCDATE(), 0);"
                % (inf_id, inf_id, adm, TAG, uid, status))

        def state():
            return sql("SELECT CASE WHEN EndTime IS NULL THEN 'chua-ket-thuc' "
                       " WHEN EndTime < StartTime THEN 'KET-THUC-TRUOC-KHI-BAT-DAU' "
                       " ELSE 'hop-le' END + '|' + ISNULL(CAST(DurationMinutes AS varchar(9)),'?') "
                       " + '|' + CAST(Status AS varchar(3)) "
                       "FROM InfusionRecords WHERE Id='%s'" % inf_id)

        # ── 1. Kết thúc TRƯỚC giờ bắt đầu ──────────────────────────────────
        print("── Kết thúc truyền dịch vào lúc 08:00, trong khi bắt đầu lúc 10:00 ──")
        seed()
        som = datetime.now().strftime("%Y-%m-%dT08:00:00")
        st, b = http("POST", "/api/inpatient/infusion-records/%s/complete" % inf_id, som)
        s1 = state()
        case("KHÔNG nhận giờ kết thúc sớm hơn giờ bắt đầu", True,
             "KET-THUC-TRUOC" not in s1,
             "HTTP %s · %s · %s" % (st, s1, b[:45]))

        # ── 2. Kết thúc lại một phiếu đã kết thúc ──────────────────────────
        print("\n── Kết thúc lại một phiếu ĐÃ kết thúc ──")
        seed()
        ok_time = datetime.now().strftime("%Y-%m-%dT12:00:00")
        http("POST", "/api/inpatient/infusion-records/%s/complete" % inf_id, ok_time)
        first = sql("SELECT CONVERT(varchar(19), EndTime, 120) FROM InfusionRecords WHERE Id='%s'" % inf_id)
        st, b = http("POST", "/api/inpatient/infusion-records/%s/complete" % inf_id,
                     datetime.now().strftime("%Y-%m-%dT15:00:00"))
        second = sql("SELECT CONVERT(varchar(19), EndTime, 120) FROM InfusionRecords WHERE Id='%s'" % inf_id)
        case("KHÔNG ghi đè giờ kết thúc đã ghi nhận", True, first == second,
             "HTTP %s · giờ kết thúc: %r → %r" % (st, first, second))

        # ── 3. ĐỐI CHỨNG ÂM ────────────────────────────────────────────────
        print("\n── Đối chứng âm: kết thúc hợp lệ vẫn phải chạy ──")
        seed()
        st, b = http("POST", "/api/inpatient/infusion-records/%s/complete" % inf_id, ok_time)
        s3 = state()
        case("kết thúc hợp lệ (12:00) ĐƯỢC chạy, tính đúng 120 phút", False,
             s3 != "hop-le|120|1",
             "HTTP %s · trạng-thái|số-phút|Status = %s" % (st, s3))

    finally:
        try:
            sql("DELETE FROM InfusionRecords WHERE Id='%s';" % inf_id)
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
                  open(os.path.join(HERE, "t3_infusion_complete.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_infusion_complete.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
