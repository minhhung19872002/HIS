"""T3 (#218) — ma trận chuyển trạng thái, đo bằng API thật.

Câu hỏi của #218 là "chuyển trạng thái BẤT HỢP LỆ có bị chặn không". Đọc code trước đã thấy
dấu hiệu xấu: cả codebase chỉ có MỘT bảng luật chuyển trạng thái (MedicalRecordStatus.CanTransition
trong HIS.Core/Constants/StatusConstants.cs) và `git grep` cho thấy nó KHÔNG được gọi ở đâu cả.
PrescriptionStatus / LabRequestStatus / RadiologyRequestStatus thì không có luật nào.

Script này không tin vào việc đọc code: nó dựng đơn thuốc ở từng trạng thái xuất phát, gọi đúng
endpoint đổi trạng thái, rồi đọc lại trạng thái trong DB. Kết quả là ma trận "chuyển được / bị chặn"
đo trên hệ thống đang chạy.

Đơn thuốc được dựng thẳng bằng SQL (mã có tiền tố T3PROBE) rồi xoá sạch ở cuối, để không phải chạy
cả luồng khám ngoại trú chỉ để có một bản ghi.

Cần: API :5106, DB his-sqlserver, tài khoản admin.
Kết quả: t3_transition_matrix.json + in bảng.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
TAG = "T3PROBE"

# PrescriptionStatus (HIS.Core/Constants/StatusConstants.cs)
NAMES = {0: "Chờ duyệt", 1: "Đã duyệt", 2: "Đã cấp phát", 3: "Hoàn trả", 4: "Hủy", 6: "Cấp một phần"}

# Chuyển trạng thái HỢP LỆ theo nghiệp vụ nhà thuốc. Không có trong code — đây là bảng luật
# mà #218 yêu cầu dựng, dùng làm mốc để đối chiếu với hành vi đo được.
LEGAL = {
    0: {1, 4},        # Chờ duyệt  → duyệt | hủy
    1: {2, 6, 4},     # Đã duyệt   → cấp đủ | cấp một phần | hủy
    6: {2, 3, 4},     # Cấp một phần → cấp nốt | hoàn trả | hủy
    2: {3},           # Đã cấp phát → chỉ còn đường hoàn trả
    3: set(),         # Hoàn trả  → kết thúc
    4: set(),         # Hủy       → kết thúc
}

# endpoint đổi trạng thái → trạng thái đích mà nó đặt
ACTIONS = [
    ("accept", "POST", "/api/pharmacy/prescriptions/{id}/accept", 1),
    ("reject", "POST", "/api/pharmacy/prescriptions/{id}/reject", 4),
    ("dispense", "POST", "/api/pharmacy/prescriptions/{id}/dispense", 2),
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
           "-f", "65001", "-h", "-1", "-W", "-s", "|", "-Q", "SET NOCOUNT ON; " + q]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                         env=dict(os.environ, MSYS_NO_PATHCONV="1"), timeout=60)
    return (out.stdout or "").strip()


def login():
    st, body = http("POST", "/api/auth/login", body={"username": "admin", "password": "Admin@123"})
    if st != 200:
        raise SystemExit("đăng nhập admin thất bại: %s %s" % (st, body[:200]))
    d = json.loads(body)
    return (d.get("data", d))["token"]


def seed(status):
    """Tạo 1 đơn thuốc ở trạng thái `status`, trả về Id."""
    code = "%s-%d-%d" % (TAG, status, int(time.time() * 1000) % 100000)
    sql("""
DECLARE @mr uniqueidentifier = (SELECT TOP 1 Id FROM MedicalRecords WHERE IsDeleted=0 ORDER BY CreatedAt);
DECLARE @doc uniqueidentifier = (SELECT TOP 1 Id FROM Users WHERE IsDeleted=0 ORDER BY CreatedAt);
DECLARE @dep uniqueidentifier = (SELECT TOP 1 Id FROM Departments WHERE IsDeleted=0 ORDER BY CreatedAt);
INSERT INTO Prescriptions (Id, PrescriptionCode, PrescriptionDate, MedicalRecordId, DoctorId, DepartmentId,
  PrescriptionType, TotalDays, TotalTangs, TotalAmount, InsuranceAmount, PatientAmount, Status,
  IsDispensed, CreatedAt, IsDeleted, PaymentCategory, DrugOrderType)
VALUES (NEWID(), '%s', SYSUTCDATETIME(), @mr, @doc, @dep, 1, 1, 0, 0, 0, 0, %d, 0, SYSUTCDATETIME(), 0, 2, 1);
""" % (code, status))
    return sql("SELECT TOP 1 CAST(Id AS varchar(50)) FROM Prescriptions WHERE PrescriptionCode='%s'" % code), code


def status_of(pid):
    v = sql("SELECT CAST(Status AS varchar(10)) FROM Prescriptions WHERE Id='%s'" % pid)
    return int(v) if v.strip().isdigit() else -1


def main():
    tok = login()
    sql("DELETE FROM Prescriptions WHERE PrescriptionCode LIKE '%s%%'" % TAG)

    rows = []
    for frm in sorted(LEGAL):
        for name, method, tmpl, to in ACTIONS:
            if to == frm:
                continue
            pid, code = seed(frm)
            if not pid:
                print("  không dựng được đơn ở trạng thái %s" % frm)
                continue
            st, body = http(method, tmpl.replace("{id}", pid), tok, {})
            after = status_of(pid)
            legal = to in LEGAL.get(frm, set())
            changed = after == to
            # Đúng = chuyển hợp lệ thì đổi được, chuyển bất hợp lệ thì KHÔNG đổi.
            verdict = "OK" if changed == legal else ("KHÔNG-CHẶN" if changed else "CHẶN-NHẦM")
            rows.append({"from": frm, "fromName": NAMES[frm], "action": name, "to": to,
                         "toName": NAMES.get(to, str(to)), "legal": legal, "http": st,
                         "statusAfter": after, "changed": changed, "verdict": verdict,
                         "body": body[:120].replace("\n", " ")})
            sql("DELETE FROM Prescriptions WHERE Id='%s'" % pid)

    sql("DELETE FROM Prescriptions WHERE PrescriptionCode LIKE '%s%%'" % TAG)

    print("\n== Đơn thuốc: chuyển trạng thái đo trên API đang chạy ==")
    print("%-14s %-10s %-14s %-9s %-6s %s" % ("Từ", "Hành động", "Đến", "Hợp lệ?", "HTTP", "Kết quả"))
    for r in rows:
        print("%-14s %-10s %-14s %-9s %-6s %s"
              % (r["fromName"], r["action"], r["toName"],
                 "có" if r["legal"] else "KHÔNG", r["http"], r["verdict"]))

    bad = [r for r in rows if r["verdict"] == "KHÔNG-CHẶN"]
    blocked_wrongly = [r for r in rows if r["verdict"] == "CHẶN-NHẦM"]
    print("\nchuyển BẤT HỢP LỆ mà hệ thống vẫn cho: %d/%d" % (len(bad), len(rows)))
    for r in bad:
        print("   %s --%s--> %s (HTTP %s)" % (r["fromName"], r["action"], r["toName"], r["http"]))
    if blocked_wrongly:
        print("chuyển hợp lệ bị chặn nhầm: %d" % len(blocked_wrongly))

    out = {"ranAt": datetime.now().isoformat(timespec="seconds"), "entity": "Prescription",
           "legalTransitions": {str(k): sorted(v) for k, v in LEGAL.items()}, "probes": rows}
    os.makedirs(HERE, exist_ok=True)
    json.dump(out, open(os.path.join(HERE, "t3_transition_matrix.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("\nghi t3_transition_matrix.json")


if __name__ == "__main__":
    main()
