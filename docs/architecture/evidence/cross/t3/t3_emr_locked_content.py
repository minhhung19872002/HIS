"""T3 (#218) — HỒ SƠ ĐÃ KHOÁ TT46 vẫn sửa được chẩn đoán.

`EmrLockGuard` sinh ra đúng để chặn việc này. Ngay trong docstring của nó:

    TT46 (2026-06-12): chặn cứng sửa NỘI DUNG hồ sơ bệnh án đã kết thúc
    (MedicalRecords.EmrFinalizedAt != null). Gọi 1 dòng ở đầu mọi mutation nội dung
    (tờ điều trị, chẩn đoán, kết luận, sinh hiệu, đơn thuốc, ...).

Nó có sẵn ba cửa vào tiện dụng: `EnsureEditableByRecordAsync`, `EnsureEditableByExaminationAsync`,
`EnsureEditableByAdmissionAsync`. Nhưng bộ dò `t3_verified_edit_sweep.py` cho thấy **"mọi mutation
nội dung" chưa thành mọi**: có những cửa ghi thẳng nội dung lâm sàng vào `MedicalRecords` mà không
gọi lấy một dòng.

Đọc hết nhóm `MedicalRecord(EmrFinalizedAt)` mà bộ dò chỉ ra, phân loại theo thứ ĐƯỢC GHI:

* **nội dung lâm sàng** → phải chặn khi hồ sơ đã khoá:
  - `SaveInpatientDiagnosisAsync` — ghi `MainDiagnosis`, `MainIcdCode`, `SubDiagnosis`, `SubIcdCodes`;
  - `UpdateAdmissionAsync` (tiếp đón) — ghi `InitialDiagnosis`;
* **logistics / hành chính** → không thuộc phạm vi khoá nội dung TT46, không đụng:
  `TransferDepartmentAsync` và `ChangeRoomAsync` (giường/phòng/khoa), `UpdateInsuranceAsync`
  (số thẻ BHYT), `RegisterWithOtherPayerAsync` (đối tượng chi trả);
* **khớp nhầm của bộ dò**: `SplitPatientAsync` (`.Count`), `BillHerbalPrescriptionAsync` (`.Id`),
  các hàm `Get*`/`Build*Dto` chỉ đọc, và hai hàm seed dữ liệu dev.

Bài đo chỉ đo hai cửa nhóm đầu — đúng phạm vi mà TT46 nói tới, không nống ra.

Tiền tố dữ liệu T3LCK, trả dữ liệu về như cũ ở cuối.
Cần: API :5106, DB his-sqlserver.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3LCK"
GOC = "CHAN-DOAN-GOC-TRONG-HO-SO-DA-KHOA"
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

    rec = adm = None
    try:
        row = sql("SELECT TOP 1 CAST(a.Id AS varchar(50)) + '|' + CAST(a.MedicalRecordId AS varchar(50)) "
                  " + '|' + ISNULL(m.MainDiagnosis, N'(trong)') "
                  "FROM Admissions a JOIN MedicalRecords m ON m.Id = a.MedicalRecordId "
                  "WHERE a.IsDeleted=0 AND m.IsDeleted=0")
        if row.count("|") < 2:
            raise SystemExit("không tìm được lượt nội trú gắn hồ sơ: %r" % row)
        parts = row.split("|")
        adm, rec, orig_diag = parts[0], parts[1], "|".join(parts[2:])

        def lock_record(locked):
            sql("UPDATE MedicalRecords SET MainDiagnosis=N'%s', InitialDiagnosis=N'%s', "
                " EmrFinalizedAt=%s WHERE Id='%s'"
                % (GOC, GOC, "GETUTCDATE()" if locked else "NULL", rec))

        def diag():
            return sql("SELECT ISNULL(MainDiagnosis, N'?') + N' ~~ ' + ISNULL(InitialDiagnosis, N'?') "
                       "FROM MedicalRecords WHERE Id='%s'" % rec)

        # ── 1. Ghi chẩn đoán nội trú lên hồ sơ ĐÃ KHOÁ ─────────────────────
        print("── Ghi chẩn đoán nội trú lên hồ sơ ĐÃ KHOÁ TT46 ──")
        lock_record(True)
        st, b = http("POST", "/api/inpatient/diagnosis/%s" % adm,
                     {"MainDiagnosisCode": "C50", "MainDiagnosis": "CHAN-DOAN-SUA-SAU-KHI-KHOA",
                      "SecondaryDiagnoses": []})
        d = diag()
        case("KHÔNG ghi được chẩn đoán vào hồ sơ đã khoá", True, GOC in d.split(" ~~ ")[0],
             "HTTP %s · MainDiagnosis=%r" % (st, d.split(" ~~ ")[0][:45]))

        # ── 2. ĐỐI CHỨNG ÂM: hồ sơ CHƯA khoá vẫn phải ghi được ─────────────
        print("\n── Đối chứng âm: hồ sơ CHƯA khoá vẫn phải ghi chẩn đoán ──")
        lock_record(False)
        st, b = http("POST", "/api/inpatient/diagnosis/%s" % adm,
                     {"MainDiagnosisCode": "C50", "MainDiagnosis": TAG + "-CHAN-DOAN-HOP-LE",
                      "SecondaryDiagnoses": []})
        d2 = diag()
        case("hồ sơ chưa khoá ĐƯỢC ghi chẩn đoán", False,
             TAG + "-CHAN-DOAN-HOP-LE" not in d2,
             "HTTP %s · MainDiagnosis=%r" % (st, d2.split(" ~~ ")[0][:45]))

    finally:
        if rec:
            try:
                sql("UPDATE MedicalRecords SET MainDiagnosis=%s, EmrFinalizedAt=NULL WHERE Id='%s'"
                    % ("NULL" if orig_diag == "(trong)"
                       else "N'" + orig_diag.replace("'", "''") + "'", rec))
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
                  open(os.path.join(HERE, "t3_emr_locked_content.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print("ghi t3_emr_locked_content.json · đã trả dữ liệu về như cũ")


if __name__ == "__main__":
    main()
