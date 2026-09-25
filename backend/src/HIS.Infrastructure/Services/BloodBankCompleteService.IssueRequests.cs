using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using HIS.Application.DTOs.BloodBank;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services
{
    public partial class BloodBankCompleteService
    {
        #region 3. Issue Requests

        public async Task<List<BloodIssueRequestDto>> GetIssueRequestsAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null, string status = null)
        {
            // Clamp into SQL Server's valid datetime range (1753-01-01 .. 9999-12-31).
            // Callers that omit fromDate/toDate send DateTime.MinValue (0001-01-01),
            // which overflows SqlDateTime -> 500. An empty upper bound means "no limit".
            var sqlMin = (DateTime)System.Data.SqlTypes.SqlDateTime.MinValue;
            var sqlMax = (DateTime)System.Data.SqlTypes.SqlDateTime.MaxValue;
            if (fromDate < sqlMin) fromDate = sqlMin;
            if (toDate < sqlMin) toDate = sqlMax;
            else if (toDate > sqlMax) toDate = sqlMax;
            // Date-only upper bound (FE sends "YYYY-MM-DD") = whole day inclusive: `<= 00:00` hid
            // every request created today, including the one the user had just submitted.
            if (toDate.TimeOfDay == TimeSpan.Zero && toDate < sqlMax.AddDays(-1))
                toDate = toDate.AddDays(1).AddMilliseconds(-3); // datetime precision: 23:59:59.997

            var results = new List<BloodIssueRequestDto>();
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT r.Id, r.RequestCode, r.RequestDate, r.DepartmentId,
                r.RequestedById, r.PatientId,
                COALESCE(NULLIF(r.PatientCode, ''), p.PatientCode COLLATE DATABASE_DEFAULT) AS PatientCode,
                COALESCE(NULLIF(r.PatientName, ''), p.FullName COLLATE DATABASE_DEFAULT) AS PatientName,
                d.DepartmentName,
                r.BloodType, r.RhFactor, r.ProductTypeId, pt.Name AS ProductTypeName,
                r.RequestedQuantity, r.IssuedQuantity, r.Urgency, r.Status,
                r.ClinicalIndication, r.Note, r.CreatedAt
                FROM BloodIssueRequests r
                LEFT JOIN BloodProductTypes pt ON r.ProductTypeId = pt.Id
                LEFT JOIN Patients p ON p.Id = r.PatientId
                LEFT JOIN Departments d ON d.Id = r.DepartmentId
                WHERE r.RequestDate >= @fromDate AND r.RequestDate <= @toDate";

            if (departmentId.HasValue)
                sql += " AND r.DepartmentId = @departmentId";
            if (!string.IsNullOrEmpty(status))
                sql += " AND r.Status = @status";
            sql += " ORDER BY r.RequestDate DESC";

            command.CommandText = sql;
            command.Parameters.Add(new SqlParameter("@fromDate", fromDate));
            command.Parameters.Add(new SqlParameter("@toDate", toDate));
            if (departmentId.HasValue)
                command.Parameters.Add(new SqlParameter("@departmentId", departmentId.Value));
            if (!string.IsNullOrEmpty(status))
                command.Parameters.Add(new SqlParameter("@status", status));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(ReadIssueRequestFromReader(reader));
            }
            return results;
        }

        public async Task<BloodIssueRequestDto> GetIssueRequestAsync(Guid requestId)
        {
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var command = connection.CreateCommand();

            command.CommandText = @"SELECT r.Id, r.RequestCode, r.RequestDate, r.DepartmentId,
                r.RequestedById, r.PatientId,
                COALESCE(NULLIF(r.PatientCode, ''), p.PatientCode COLLATE DATABASE_DEFAULT) AS PatientCode,
                COALESCE(NULLIF(r.PatientName, ''), p.FullName COLLATE DATABASE_DEFAULT) AS PatientName,
                d.DepartmentName,
                r.BloodType, r.RhFactor, r.ProductTypeId, pt.Name AS ProductTypeName,
                r.RequestedQuantity, r.IssuedQuantity, r.Urgency, r.Status,
                r.ClinicalIndication, r.Note, r.CreatedAt
                FROM BloodIssueRequests r
                LEFT JOIN BloodProductTypes pt ON r.ProductTypeId = pt.Id
                LEFT JOIN Patients p ON p.Id = r.PatientId
                LEFT JOIN Departments d ON d.Id = r.DepartmentId
                WHERE r.Id = @requestId";
            command.Parameters.Add(new SqlParameter("@requestId", requestId));

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
                return ReadIssueRequestFromReader(reader);
            return null;
        }

        public async Task<BloodIssueRequestDto> CreateIssueRequestAsync(CreateBloodIssueRequestDto dto)
        {
            // QA round 4: a request for -1 / 0 units was accepted (the v2 form already blocks qty <= 0)
            if (dto.RequestedQuantity <= 0)
                throw new ArgumentException("Số lượng túi máu yêu cầu phải lớn hơn 0.", nameof(dto.RequestedQuantity));
            await EnsureRequestRecipientAsync(dto);
            var id = Guid.NewGuid();
            var code = $"REQ{DateTime.Now:yyyyMMddHHmmss}";

            // #218/T3 (2026-09-04): trước đây các giá trị rỗng truyền thẳng `DBNull.Value` làm đối
            // số cho `ExecuteSqlRawAsync`. EF Core không ánh xạ được kiểu `DBNull` nên ném
            // "The current provider doesn't have a store type mapping for properties of type
            // 'DBNull'" — và vì `PatientCode`/`PatientName` LUÔN là DBNull ở đây, tạo phiếu lĩnh máu
            // hỏng 100%, không phải thỉnh thoảng. Truyền `SqlParameter` có tên thì EF không phải
            // đoán kiểu nữa.
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodIssueRequests (Id, RequestCode, RequestDate, DepartmentId, RequestedById, PatientId, PatientCode, PatientName, BloodType, RhFactor, ProductTypeId, RequestedQuantity, IssuedQuantity, Urgency, Status, ClinicalIndication, Note, CreatedAt)
                VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, 0, @p12, 'Pending', @p13, @p14, @p15)",
                P("@p0", id), P("@p1", code), P("@p2", DateTime.Now), P("@p3", dto.DepartmentId),
                P("@p4", dto.DepartmentId),
                P("@p5", dto.PatientId),
                P("@p6", null), P("@p7", null),
                P("@p8", dto.BloodType),
                P("@p9", dto.RhFactor),
                P("@p10", dto.ProductTypeId),
                P("@p11", dto.RequestedQuantity),
                P("@p12", dto.Urgency ?? "Normal"),
                P("@p13", dto.ClinicalIndication),
                P("@p14", dto.Note),
                P("@p15", DateTime.UtcNow)); // CreatedAt = UTC audit column (serialized with "Z")

            return await GetIssueRequestAsync(id);
        }

        /// <summary>
        /// Patient safety (QA round 3): an issue request must name the recipient, and the requested group must be
        /// ABO/Rh-compatible with the patient's RECORDED group. Before, the v2 form had no patient field: the only
        /// ABO check at issue time fell back to the group typed on the request, i.e. compared the bag with itself.
        /// Unknown patient group or non-red-cell product → no verdict → allowed (never block on missing data).
        /// </summary>
        private async Task EnsureRequestRecipientAsync(CreateBloodIssueRequestDto dto)
        {
            if (dto.PatientId is not Guid patientId || patientId == Guid.Empty)
                throw new ArgumentException("Chọn bệnh nhân nhận máu trước khi tạo phiếu yêu cầu xuất máu.");
            var patient = await _context.Patients.AsNoTracking()
                .Where(p => p.Id == patientId)
                .Select(p => new { p.FullName, p.BloodType, p.RhFactor })
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy bệnh nhân nhận máu.");

            var productCode = await _context.Database
                .SqlQueryRaw<string>("SELECT ISNULL(Code, '') AS Value FROM BloodProductTypes WHERE Id = {0}", dto.ProductTypeId)
                .FirstOrDefaultAsync();
            if (productCode == null)
                throw new KeyNotFoundException("Không tìm thấy loại chế phẩm máu của phiếu yêu cầu.");
            if (BloodCompatibility.Check(productCode, patient.BloodType, patient.RhFactor, dto.BloodType, dto.RhFactor)
                == BloodCompatibility.BloodMatch.Incompatible)
                throw new InvalidOperationException(
                    $"KHÔNG TƯƠNG THÍCH NHÓM MÁU với bệnh nhân {patient.FullName}. "
                    + BloodCompatibility.Describe(patient.BloodType, patient.RhFactor, dto.BloodType, dto.RhFactor)
                    + " Kiểm tra lại nhóm máu yêu cầu hoặc kết quả định nhóm của người bệnh.");
        }

        /// <summary>
        /// QA round 4: approve/reject on an unknown id or a request no longer 'Pending' answered 200 while
        /// writing nothing (reject after FullyIssued looked like it worked). 404 / 400 with the real state.
        /// </summary>
        private async Task EnsureRequestPendingAsync(Guid requestId, string verb)
        {
            var status = await _context.Database
                .SqlQueryRaw<string>("SELECT ISNULL(Status, '') AS Value FROM BloodIssueRequests WHERE Id = {0}", requestId)
                .FirstOrDefaultAsync();
            if (status == null)
                throw new KeyNotFoundException("Không tìm thấy phiếu lĩnh máu.");
            if (!string.Equals(status, "Pending", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Phiếu lĩnh máu đang ở trạng thái \"{status}\", không {verb} được.");
        }

        public async Task<bool> ApproveIssueRequestAsync(Guid requestId)
        {
            await EnsureRequestPendingAsync(requestId, "duyệt");
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodIssueRequests SET Status='Approved' WHERE Id=@p0 AND Status='Pending'",
                requestId);
            return rows > 0;
        }

        public async Task<bool> RejectIssueRequestAsync(Guid requestId, string reason)
        {
            await EnsureRequestPendingAsync(requestId, "từ chối");
            var rows = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE BloodIssueRequests SET Status='Cancelled', Note=@p0 WHERE Id=@p1 AND Status='Pending'",
                reason ?? "", requestId);
            return rows > 0;
        }

        public async Task<BloodIssueReceiptDto> IssueBloodAsync(IssueBloodDto dto)
        {
            // #218/T3 (2026-09-04): trước đây đường này không đọc trạng thái của PHIẾU LĨNH lẫn của
            // TÚI MÁU. Hệ quả: xuất được máu theo một phiếu đã bị từ chối, và xuất lại được một túi
            // đã xuất/đã truyền (câu `UPDATE BloodBags SET Status='Issued'` không có điều kiện nào).
            await EnsureIssuableAsync(dto.RequestId, dto.BloodBagIds);

            var receiptId = Guid.NewGuid();
            var receiptCode = $"ISS{DateTime.Now:yyyyMMddHHmmss}";

            // One unit of work: a failure mid-loop used to leave a receipt with half its bags issued
            await using (var tx = await _context.Database.BeginTransactionAsync())
            {
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO BloodIssueReceipts (Id, ReceiptCode, IssueDate, DepartmentId, RequestedBy, IssuedBy, Status, TotalBags, Note, CreatedAt)
                VALUES (@p0, @p1, @p2, (SELECT DepartmentId FROM BloodIssueRequests WHERE Id=@p3), 'System', @p7, 'Issued', @p4, @p5, @p6)",
                P("@p0", receiptId), P("@p1", receiptCode), P("@p2", DateTime.Now), P("@p3", dto.RequestId),
                P("@p4", dto.BloodBagIds?.Count ?? 0), P("@p5", dto.Note), P("@p6", DateTime.UtcNow), // CreatedAt UTC
                P("@p7", CurrentUserName)); // QA round 4: IssuedBy was the literal 'System' — no audit of who handed the bag out

            if (dto.BloodBagIds != null)
            {
                foreach (var bagId in dto.BloodBagIds)
                {
                    var itemId = Guid.NewGuid();
                    await _context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO BloodIssueItems (Id, ReceiptId, BloodBagId, BagCode, BloodType, RhFactor, ProductTypeName, Volume, ExpiryDate, PatientId, PatientCode, PatientName)
                        SELECT @p0, @p1, b.Id, b.BagCode, b.BloodType, b.RhFactor,
                            pt.Name, b.Volume, b.ExpiryDate,
                            r.PatientId,
                            -- QA round 4: the request stores PatientCode/PatientName as NULL, so every issue line
                            -- (and the printed issue slip) showed no recipient. Same fallback as the request list.
                            COALESCE(NULLIF(r.PatientCode, ''), p.PatientCode COLLATE DATABASE_DEFAULT),
                            COALESCE(NULLIF(r.PatientName, ''), p.FullName COLLATE DATABASE_DEFAULT)
                        FROM BloodBags b
                        LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                        LEFT JOIN BloodIssueRequests r ON r.Id = @p3
                        LEFT JOIN Patients p ON p.Id = r.PatientId
                        WHERE b.Id = @p2",
                        itemId, receiptId, bagId, dto.RequestId);

                    // Conditional update: a concurrent issue of the same bag (both passed the pre-check) must fail
                    var bagRows = await _context.Database.ExecuteSqlRawAsync(
                        "UPDATE BloodBags SET Status='Issued' WHERE Id=@p0 AND Status='Available'", bagId);
                    if (bagRows == 0)
                        throw new InvalidOperationException("Túi máu vừa được xuất/giữ bởi thao tác khác, không xuất được.");
                }
            }

            await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE BloodIssueRequests SET IssuedQuantity = IssuedQuantity + @p0,
                Status = CASE WHEN IssuedQuantity + @p0 >= RequestedQuantity THEN 'FullyIssued' ELSE 'PartiallyIssued' END
                WHERE Id=@p1",
                dto.BloodBagIds?.Count ?? 0, dto.RequestId);
            await tx.CommitAsync();
            }

            return await GetIssueReceiptByIdAsync(receiptId);
        }

        /// <summary>
        /// #218/T3: phiếu lĩnh phải đang ở trạng thái phát được, và từng túi máu phải còn trong kho
        /// và còn hạn. Kiểm TẤT CẢ trước khi ghi dòng nào, để không xuất được nửa phiếu rồi mới hỏng.
        /// </summary>
        private async Task EnsureIssuableAsync(Guid requestId, List<Guid> bagIds)
        {
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

            string? recipientAbo = null, recipientRh = null;
            Guid? requestedProductTypeId = null;
            int remaining = int.MaxValue;
            using (var cmd = connection.CreateCommand())
            {
                // Recipient group: the patient's recorded group first, the group written on the request as fallback
                cmd.CommandText = @"SELECT r.Status, COALESCE(NULLIF(p.BloodType, ''), r.BloodType),
                        COALESCE(NULLIF(p.RhFactor, ''), r.RhFactor), r.ProductTypeId,
                        r.RequestedQuantity - r.IssuedQuantity
                    FROM BloodIssueRequests r LEFT JOIN Patients p ON p.Id = r.PatientId
                    WHERE r.Id=@id";
                cmd.Parameters.Add(new SqlParameter("@id", requestId));
                using var rr = await cmd.ExecuteReaderAsync();
                if (!await rr.ReadAsync())
                    throw new KeyNotFoundException("Không tìm thấy phiếu lĩnh máu.");
                var status = rr.IsDBNull(0) ? "" : rr.GetValue(0).ToString() ?? "";
                recipientAbo = rr.IsDBNull(1) ? null : rr.GetValue(1).ToString();
                recipientRh = rr.IsDBNull(2) ? null : rr.GetValue(2).ToString();
                requestedProductTypeId = rr.IsDBNull(3) ? null : rr.GetGuid(3);
                if (!rr.IsDBNull(4)) remaining = Convert.ToInt32(rr.GetValue(4));
                // 'Approved' và 'PartiallyIssued' là hai trạng thái còn phát tiếp được.
                // 'Pending' chưa duyệt, 'Cancelled' đã từ chối, 'FullyIssued' đã phát đủ.
                if (!string.Equals(status, "Approved", StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(status, "PartiallyIssued", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException(
                        $"Phiếu lĩnh máu đang ở trạng thái \"{status}\", chưa xuất máu được.");
            }

            var distinctBags = (bagIds ?? new List<Guid>()).Distinct().ToList();
            if (distinctBags.Count != (bagIds?.Count ?? 0))
                throw new InvalidOperationException("Danh sách túi máu bị trùng.");
            if (distinctBags.Count > remaining)
                throw new InvalidOperationException(
                    $"Số túi xuất ({distinctBags.Count}) vượt số lượng còn lại của phiếu lĩnh ({Math.Max(remaining, 0)}).");

            foreach (var bagId in distinctBags)
            {
                using var cmd = connection.CreateCommand();
                cmd.CommandText = @"SELECT b.BagCode, b.Status, b.ExpiryDate, b.BloodType, b.RhFactor, pt.Code, b.ProductTypeId
                    FROM BloodBags b LEFT JOIN BloodProductTypes pt ON pt.Id = b.ProductTypeId WHERE b.Id=@id";
                cmd.Parameters.Add(new SqlParameter("@id", bagId));
                using var r = await cmd.ExecuteReaderAsync();
                if (!await r.ReadAsync())
                    throw new KeyNotFoundException($"Không tìm thấy túi máu {bagId}.");
                var code = r.IsDBNull(0) ? bagId.ToString() : r.GetString(0);
                var st = r.IsDBNull(1) ? "" : r.GetString(1);
                var exp = r.IsDBNull(2) ? (DateTime?)null : r.GetDateTime(2);
                if (exp.HasValue && exp.Value.Date < DateTime.Now.Date)
                    throw new InvalidOperationException(
                        $"Túi máu {code} đã hết hạn ngày {exp.Value:dd/MM/yyyy}, không xuất được.");
                if (!string.Equals(st, "Available", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException(
                        $"Túi máu {code} đang ở trạng thái \"{st}\", không xuất được.");

                // Patient safety: this path issued a B+ red-cell bag against an A+ patient's request — the
                // #218/T3 ABO guard only covered assign/start-transfusion. Same rule, same "unknown → allow".
                var bagAbo = r.IsDBNull(3) ? null : r.GetString(3);
                var bagRh = r.IsDBNull(4) ? null : r.GetString(4);
                var productCode = r.IsDBNull(5) ? null : r.GetString(5);
                var bagProductTypeId = r.IsDBNull(6) ? (Guid?)null : r.GetGuid(6);
                if (requestedProductTypeId.HasValue && requestedProductTypeId.Value != Guid.Empty
                    && bagProductTypeId.HasValue && bagProductTypeId.Value != requestedProductTypeId.Value)
                    throw new InvalidOperationException(
                        $"Túi máu {code} không đúng loại chế phẩm của phiếu lĩnh, không xuất được.");
                if (BloodCompatibility.Check(productCode, recipientAbo, recipientRh, bagAbo, bagRh)
                    == BloodCompatibility.BloodMatch.Incompatible)
                    throw new InvalidOperationException(
                        $"KHÔNG TƯƠNG THÍCH NHÓM MÁU (túi {code}). "
                        + BloodCompatibility.Describe(recipientAbo, recipientRh, bagAbo, bagRh));
            }
        }

        public async Task<List<BloodIssueReceiptDto>> GetIssueReceiptsAsync(
            DateTime fromDate, DateTime toDate, Guid? departmentId = null)
        {
            var results = new List<BloodIssueReceiptDto>();
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var command = connection.CreateCommand();

            var sql = @"SELECT r.Id, r.ReceiptCode, r.IssueDate, r.DepartmentId,
                r.RequestedBy, r.IssuedBy, r.Status, r.TotalBags, r.Note, r.CreatedAt
                FROM BloodIssueReceipts r
                WHERE r.IssueDate >= @fromDate AND r.IssueDate <= @toDate";

            if (departmentId.HasValue)
                sql += " AND r.DepartmentId = @departmentId";
            sql += " ORDER BY r.IssueDate DESC";

            command.CommandText = sql;
            command.Parameters.Add(new SqlParameter("@fromDate", fromDate));
            command.Parameters.Add(new SqlParameter("@toDate", InclusiveEndOfDay(toDate))); // QA-R11: whole day
            if (departmentId.HasValue)
                command.Parameters.Add(new SqlParameter("@departmentId", departmentId.Value));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new BloodIssueReceiptDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    ReceiptCode = reader["ReceiptCode"]?.ToString(),
                    IssueDate = reader.GetDateTime(reader.GetOrdinal("IssueDate")),
                    DepartmentId = reader.IsDBNull(reader.GetOrdinal("DepartmentId")) ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DepartmentId")),
                    RequestedBy = reader["RequestedBy"]?.ToString(),
                    IssuedBy = reader["IssuedBy"]?.ToString(),
                    Status = reader["Status"]?.ToString(),
                    TotalBags = reader.IsDBNull(reader.GetOrdinal("TotalBags")) ? 0 : reader.GetInt32(reader.GetOrdinal("TotalBags")),
                    Note = reader["Note"]?.ToString(),
                    CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                    Items = new List<BloodIssueItemDto>()
                });
            }
            return results;
        }

        public async Task<byte[]> PrintIssueReceiptAsync(Guid receiptId)
        {
            var receipt = await GetIssueReceiptByIdAsync(receiptId);
            if (receipt == null) throw new KeyNotFoundException("Không tìm thấy phiếu xuất máu."); // QA-R11: was 200 "Not found" page

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Phieu xuat mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>PHIEU XUAT KHO MAU</h2>");
            sb.AppendLine($"<p><strong>Ma phieu:</strong> {Esc(receipt.ReceiptCode)}</p>");
            sb.AppendLine($"<p><strong>Ngay xuat:</strong> {receipt.IssueDate:dd/MM/yyyy}</p>");
            sb.AppendLine($"<p><strong>Nguoi yeu cau:</strong> {Esc(receipt.RequestedBy)}</p>");
            sb.AppendLine($"<p><strong>Nguoi xuat:</strong> {Esc(receipt.IssuedBy)}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ma tui</th><th>Nhom mau</th><th>Rh</th><th>Loai CP</th><th>The tich</th><th>Han dung</th><th>Benh nhan</th></tr>");
            int stt = 1;
            foreach (var item in receipt.Items)
            {
                sb.AppendLine($"<tr><td>{stt++}</td><td>{Esc(item.BagCode)}</td><td>{Esc(item.BloodType)}</td><td>{Esc(item.RhFactor)}</td><td>{Esc(item.ProductTypeName)}</td><td>{item.Volume}</td><td>{item.ExpiryDate:dd/MM/yyyy}</td><td>{Esc(item.PatientName)}</td></tr>");
            }
            sb.AppendLine($"</table><p><strong>Tong so tui:</strong> {receipt.TotalBags}</p>");
            sb.AppendLine($"<p><strong>Ghi chu:</strong> {Esc(receipt.Note)}</p>");
            sb.AppendLine("<div style='margin-top:40px;display:flex;justify-content:space-around'><div style='text-align:center'><p><strong>Nguoi xuat</strong></p></div><div style='text-align:center'><p><strong>Nguoi nhan</strong></p></div></div>");
            sb.AppendLine("</body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        #endregion
    }
}
