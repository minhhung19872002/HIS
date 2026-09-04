"""T3 (#218) — BA CỬA NỮA sửa được nội dung phiếu CĐHA đã ký số.

§5 đã vá `EnterRadiologyResultAsync`: có chữ ký số còn hiệu lực thì cấm sửa `Findings` / `Impression`
/ `Recommendations`. Nhưng đó chỉ là **một** trong bốn cửa ghi vào đúng ba trường ấy. Ba cửa còn lại
không có một lượt kiểm nào:

* `UpdateRadiologyResultAsync` (`PUT /api/RISComplete/results/{id}`) — ghi cả ba trường, nằm cách
  hàm đã vá đúng **120 dòng** trong cùng file;
* `CopyReportResultAsync` (`POST /api/RISComplete/coreaders/copy-from`) — **chép đè** cả ba trường
  từ một phiếu khác sang;
* `MergeCoReaderOpinionsAsync` (`POST /api/RISComplete/coreaders/merge`) — ghi đè `Impression` bằng
  ý kiến hội chẩn gộp lại.

Cả ba đều chạy được trên một phiếu **đã duyệt và đã ký số**, và chữ ký vẫn giữ nguyên `Status = 1`.
Tức chữ ký của bác sĩ bảo chứng cho một nội dung khác hẳn nội dung người đó đã đọc và ký.

**Ba cửa này không phải tìm bằng tay.** Chúng ra từ bộ dò `t3_verified_edit_sweep.py`: liệt kê các
thực thể có "cổng tác xác nhận" (`VerifiedAt` / `ApprovedAt` / `SignedAt` / `LockedAt` /
`EmrFinalizedAt`), rồi tìm những hàm **sửa nội dung** thực thể đó mà **không tra tới cổng ấy**. Viết
bộ dò sau khi §33 (giải phẫu bệnh) là lần thứ **mười** gặp cùng một hình dạng — và ngay lượt chạy
đầu nó chỉ thẳng vào cửa nằm ngay dưới cái tôi đã vá.

Tiền tố dữ liệu T3EDG, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request, uuid
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3EDG"
KY = "NOI-DUNG-BAC-SI-DA-KY"
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

    rep = src = None
    try:
        rows = sql("SELECT TOP 2 CAST(Id AS varchar(50)) FROM RadiologyReports WHERE IsDeleted=0")
        ids = [x.strip() for x in rows.split("\n") if len(x.strip()) == 36]
        if len(ids) < 2:
            raise SystemExit("cần ít nhất 2 phiếu đọc kết quả để đo ca chép đè: %r" % rows)
        rep, src = ids[0], ids[1]
        uid = sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Users WHERE IsDeleted=0")

        def arm():
            """Phiếu ĐÍCH: đã duyệt (2), có chữ ký còn hiệu lực, nội dung là KY."""
            sql("DELETE FROM RadiologySignatureHistories WHERE RadiologyReportId='%s'; "
                "UPDATE RadiologyReports SET Status=2, Findings=N'%s', Impression=N'%s', "
                " Recommendations=N'%s' WHERE Id='%s'; "
                "UPDATE RadiologyReports SET Findings=N'%s-NGUON', Impression=N'%s-NGUON' WHERE Id='%s'; "
                "INSERT INTO RadiologySignatureHistories (Id, RadiologyReportId, SignedByUserId, "
                " SignatureType, SignedAt, Status, CreatedAt, IsDeleted) "
                "VALUES ('%s','%s','%s', 1, GETUTCDATE(), 1, GETUTCDATE(), 0);"
                % (rep, KY, KY, KY, rep, TAG, TAG, src, uuid.uuid4(), rep, uid))

        def content():
            return sql("SELECT ISNULL(Findings,N'?') + N' ~~ ' + ISNULL(Impression,N'?') "
                       "FROM RadiologyReports WHERE Id='%s'" % rep)

        print("── Cửa 1: PUT /results/{id} (nằm cách hàm đã vá 120 dòng) ──")
        arm()
        # `TechnicianNote` là trường BẮT BUỘC của DTO. Lượt đo đầu quên nó nên nhận 400
        # "The TechnicianNote field is required" — request chưa hề tới service, mà bài đo lại chấm
        # ca này ĐẠT vì "nội dung không đổi". Lần thứ năm trong đợt gặp đúng bẫy này: **bị từ chối
        # vì lý do KHÁC cũng để lại dấu vết y hệt bị chặn đúng luật**.
        st, b = http("PUT", "/api/RISComplete/results/%s" % rep,
                     {"Description": "SUA-QUA-CUA-1", "Conclusion": "SUA-QUA-CUA-1",
                      "Note": "x", "TechnicianNote": "x"})
        if "TechnicianNote" in b:
            raise SystemExit("payload van thieu truong bat buoc, dung de khong do mu: %s" % b[:150])
        c = content()
        case("sửa phiếu ĐÃ KÝ qua PUT /results/{id} bị chặn", True, KY in c,
             "HTTP %s · nội dung=%r" % (st, c[:55]))

        print("\n── Cửa 2: POST /coreaders/copy-from (chép đè từ phiếu khác) ──")
        arm()
        st, b = http("POST", "/api/RISComplete/coreaders/copy-from",
                     {"SourceReportId": src, "TargetReportId": rep, "TrackAsCoReader": False})
        c = content()
        case("chép đè nội dung sang phiếu ĐÃ KÝ bị chặn", True, KY in c,
             "HTTP %s · nội dung=%r" % (st, c[:55]))

        print("\n── Cửa 3: POST /coreaders/merge (gộp ý kiến hội chẩn) ──")
        arm()
        sql("DELETE FROM RadiologyReportCoReaders WHERE RadiologyReportId='%s'; "
            "INSERT INTO RadiologyReportCoReaders (Id, RadiologyReportId, ReaderId, ReaderName, "
            " Role, Opinion, CreatedAt, IsDeleted) VALUES "
            "('%s','%s','%s', N'BS Hoi chan', N'CoReader', N'%s-Y-KIEN', GETUTCDATE(), 0);"
            % (rep, uuid.uuid4(), rep, uid, TAG))
        st, b = http("POST", "/api/RISComplete/coreaders/merge",
                     {"RadiologyReportId": rep, "AppendMode": True})
        c = content()
        case("gộp ý kiến vào phiếu ĐÃ KÝ bị chặn", True, TAG + "-Y-KIEN" not in c,
             "HTTP %s · nội dung=%r" % (st, c[:55]))

        # ── ĐỐI CHỨNG ÂM: phiếu CHƯA ký thì cả ba cửa vẫn phải dùng được ──
        print("\n── Đối chứng âm: phiếu CHƯA ký thì vẫn sửa được ──")
        sql("DELETE FROM RadiologySignatureHistories WHERE RadiologyReportId='%s'; "
            "UPDATE RadiologyReports SET Status=0, Findings=N'%s' WHERE Id='%s'" % (rep, KY, rep))
        st, b = http("PUT", "/api/RISComplete/results/%s" % rep,
                     {"Description": TAG + "-SUA-HOP-LE", "Conclusion": "ok", "Note": "x",
                      "TechnicianNote": "x"})
        c = content()
        case("phiếu chưa ký ĐƯỢC sửa bình thường", False, TAG + "-SUA-HOP-LE" not in c,
             "HTTP %s · nội dung=%r" % (st, c[:45]))

    finally:
        try:
            if rep:
                sql("DELETE FROM RadiologySignatureHistories WHERE RadiologyReportId='%s'; "
                    "DELETE FROM RadiologyReportCoReaders WHERE RadiologyReportId='%s';" % (rep, rep))
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
                  open(os.path.join(HERE, "t3_radiology_edit_doors.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_radiology_edit_doors.json · đã dọn dữ liệu %s" % TAG)


if __name__ == "__main__":
    main()
