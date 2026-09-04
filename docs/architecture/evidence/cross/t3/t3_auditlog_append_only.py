"""T3 (#218) — nhật ký kiểm toán có thật sự bất biến không (AUTHZ-5 / #371).

Script `150_authz5_auditlogs_append_only.sql` tạo hai trigger chặn UPDATE/DELETE trên `AuditLogs`,
theo yêu cầu bất biến của TT 54/2017 và NĐ 13/2023. Nhưng nó **chưa bao giờ chạy được**: hai câu
`RAISERROR` viết

    RAISERROR(N'câu một ' N'câu hai', 16, 1)      -- nối chuỗi kiểu C/Python, T-SQL không có

`CREATE TRIGGER` nằm trong batch riêng nên bộ chạy migration chỉ ghi warning rồi đi tiếp — lỗi cú
pháp 102 này lặp ở **mọi lần khởi động máy chủ** mà không ai để ý. Đo trước khi sửa:
**0 trigger trên `AuditLogs`**, tức nhật ký kiểm toán sửa/xoá được thoải mái.

Sửa xong mới lộ thêm một tầng nữa: `RAISERROR` **không nhận biểu thức**, chỉ nhận chuỗi hằng hoặc
biến — viết `N'a' + N'b'` vào tham số vẫn là lỗi 102 ("Incorrect syntax near '+'"). Phải gom vào
biến rồi mới gọi.

Bài đo này không hỏi "trigger có tồn tại không" mà hỏi "dữ liệu có bị sửa được không": ghi một dòng
audit thật, rồi thử sửa và thử xoá, và đọc lại xem dòng đó có đổi hay biến mất.

Cần: DB his-sqlserver.
"""
import json, os, subprocess, sys
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
CASES = []

CHECK_SQL = r"""
SET NOCOUNT ON;
DECLARE @id uniqueidentifier = NEWID();
DECLARE @act nvarchar(200), @n int;

INSERT INTO AuditLogs (Id, TableName, RecordId, Action, [Timestamp])
VALUES (@id, N'T3AUDIT', NEWID(), N'T3AUDIT-GOC', GETUTCDATE());
SELECT @n = COUNT(*) FROM AuditLogs WHERE Id = @id;
SELECT 'ghi' AS b, CAST(@n AS varchar(3)) AS v;

BEGIN TRY UPDATE AuditLogs SET Action = N'DA-BI-SUA' WHERE Id = @id; END TRY BEGIN CATCH END CATCH
SELECT @act = Action FROM AuditLogs WHERE Id = @id;
SELECT 'sua' AS b, ISNULL(@act, '(mat dong)') AS v;

BEGIN TRY DELETE FROM AuditLogs WHERE Id = @id; END TRY BEGIN CATCH END CATCH
SELECT @n = COUNT(*) FROM AuditLogs WHERE Id = @id;
SELECT 'xoa' AS b, CAST(@n AS varchar(3)) AS v;

SET CONTEXT_INFO 0x52455445000000000000000000000000;
BEGIN TRY DELETE FROM AuditLogs WHERE Id = @id; END TRY BEGIN CATCH END CATCH
SELECT @n = COUNT(*) FROM AuditLogs WHERE Id = @id;
SELECT 'retention' AS b, CAST(@n AS varchar(3)) AS v;
-- Dọn nốt dữ liệu thử NGAY KHI CÒN CỜ retention. Lượt đầu để câu dọn sau khi đã reset cờ,
-- nên chính trigger chặn nó và batch dừng giữa chừng — dòng đếm trigger phía dưới không bao giờ
-- chạy, làm ca cuối báo FAIL vì bài đo hỏng chứ không phải sản phẩm hỏng.
DELETE FROM AuditLogs WHERE TableName = N'T3AUDIT';
SET CONTEXT_INFO 0x00000000000000000000000000000000;

SELECT 'trigger' AS b, CAST(COUNT(*) AS varchar(3)) AS v
FROM sys.triggers WHERE parent_id = OBJECT_ID('dbo.AuditLogs');
"""


def run_sql(script):
    path = os.path.join(HERE, "_t3audit.sql")
    with open(path, "w", encoding="utf-8") as f:
        f.write(script)
    env = dict(os.environ, MSYS_NO_PATHCONV="1")
    subprocess.run(["docker", "cp", path, "his-sqlserver:/tmp/_t3audit.sql"],
                   capture_output=True, env=env, timeout=60)
    out = subprocess.run(
        ["docker", "exec", "his-sqlserver", "/opt/mssql-tools18/bin/sqlcmd",
         "-S", "localhost", "-U", "sa", "-P", "HisDocker2024Pass#", "-C", "-d", "HIS",
         "-h", "-1", "-W", "-s", "|", "-i", "/tmp/_t3audit.sql"],
        capture_output=True, text=True, encoding="utf-8", env=env, timeout=90)
    os.remove(path)
    rows = {}
    for line in (out.stdout or "").split("\n"):
        if "|" in line:
            k, _, v = line.partition("|")
            rows[k.strip()] = v.strip()
    return rows


def case(name, ok, detail):
    CASES.append({"case": name, "pass": bool(ok), "detail": detail})
    print("  %-46s %-4s %s" % (name, "PASS" if ok else "FAIL", detail))


def main():
    r = run_sql(CHECK_SQL)
    if not r:
        raise SystemExit("không đọc được kết quả từ sqlcmd — dừng để không đo mù")

    case("hai trigger bất biến tồn tại", r.get("trigger") == "2",
         "số trigger trên AuditLogs=%s" % r.get("trigger"))
    case("ghi được một dòng nhật ký", r.get("ghi") == "1",
         "số dòng vừa ghi=%s" % r.get("ghi"))
    # Điều thật sự quan trọng: KHÔNG phải "câu lệnh bị từ chối" mà là "dữ liệu KHÔNG đổi".
    case("SỬA nhật ký: giá trị gốc còn nguyên", r.get("sua") == "T3AUDIT-GOC",
         "Action sau khi thử sửa=%r" % r.get("sua"))
    case("XOÁ nhật ký: dòng vẫn còn", r.get("xoa") == "1",
         "số dòng còn lại=%s" % r.get("xoa"))
    case("job retention (có cờ RETE) vẫn xoá được", r.get("retention") == "0",
         "số dòng còn lại=%s" % r.get("retention"))

    ok = sum(1 for c in CASES if c["pass"])
    print("\n%d/%d ca đạt" % (ok, len(CASES)))
    json.dump({"ranAt": datetime.now().isoformat(timespec="seconds"), "cases": CASES},
              open(os.path.join(HERE, "t3_auditlog_append_only.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("ghi t3_auditlog_append_only.json")


if __name__ == "__main__":
    main()
