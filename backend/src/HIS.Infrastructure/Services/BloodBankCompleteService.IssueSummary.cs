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
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services
{
    public partial class BloodBankCompleteService
    {
        #region 8-9. Issue Summary / Patient

        public async Task<byte[]> PrintBloodIssueSummaryAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
        {
            var summary = await GetBloodIssueSummaryAsync(fromDate, toDate, departmentId);
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Phieu linh mau tong hop</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>PHIEU LINH MAU TONG HOP</h2>");
            sb.AppendLine($"<p>Tu ngay: {fromDate:dd/MM/yyyy} - Den ngay: {toDate:dd/MM/yyyy}</p>");
            sb.AppendLine($"<p><strong>Tong so tui:</strong> {summary.TotalBags} | <strong>Tong the tich:</strong> {summary.TotalVolume} mL</p>");
            sb.AppendLine("<h3>Theo loai che pham</h3><table><tr><th>Loai CP</th><th>So luong</th><th>The tich (mL)</th></tr>");
            if (summary.ByProductType != null)
            {
                foreach (var item in summary.ByProductType)
                    sb.AppendLine($"<tr><td>{Esc(item.ProductTypeName)}</td><td>{item.Quantity}</td><td>{item.Volume}</td></tr>");
            }
            sb.AppendLine("</table><h3>Theo khoa</h3><table><tr><th>Khoa</th><th>So luong</th><th>The tich (mL)</th></tr>");
            if (summary.ByDepartment != null)
            {
                foreach (var item in summary.ByDepartment)
                    sb.AppendLine($"<tr><td>{Esc(item.DepartmentName)}</td><td>{item.Quantity}</td><td>{item.Volume}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<BloodIssueSummaryDto> GetBloodIssueSummaryAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
        {
            var result = new BloodIssueSummaryDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                DepartmentId = departmentId,
                ByProductType = new List<BloodIssueSummaryByTypeDto>(),
                ByDepartment = new List<BloodIssueSummaryByDeptDto>()
            };

            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

            // By product type
            using (var cmd = connection.CreateCommand())
            {
                var sql = @"SELECT i.ProductTypeName, COUNT(*) AS Quantity, SUM(i.Volume) AS Volume
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    WHERE r.IssueDate >= @from AND r.IssueDate <= @to";
                if (departmentId.HasValue)
                    sql += " AND r.DepartmentId = @deptId";
                sql += " GROUP BY i.ProductTypeName";

                cmd.CommandText = sql;
                cmd.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd.Parameters.Add(new SqlParameter("@to", toDate));
                if (departmentId.HasValue)
                    cmd.Parameters.Add(new SqlParameter("@deptId", departmentId.Value));

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    result.ByProductType.Add(new BloodIssueSummaryByTypeDto
                    {
                        ProductTypeName = reader["ProductTypeName"]?.ToString(),
                        Quantity = reader.GetInt32(reader.GetOrdinal("Quantity")),
                        Volume = reader.GetDecimal(reader.GetOrdinal("Volume"))
                    });
                }
            }

            // By department
            using (var cmd2 = connection.CreateCommand())
            {
                // Report the department NAME (the GUID used to be shown as the name).
                var sql2 = @"SELECT ISNULL(d.DepartmentName, N'Không rõ khoa') AS DeptName,
                    COUNT(*) AS Quantity, SUM(i.Volume) AS Volume
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    LEFT JOIN Departments d ON d.Id = r.DepartmentId
                    WHERE r.IssueDate >= @from AND r.IssueDate <= @to";
                if (departmentId.HasValue)
                    sql2 += " AND r.DepartmentId = @deptId";
                sql2 += " GROUP BY d.DepartmentName";

                cmd2.CommandText = sql2;
                cmd2.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd2.Parameters.Add(new SqlParameter("@to", toDate));
                if (departmentId.HasValue)
                    cmd2.Parameters.Add(new SqlParameter("@deptId", departmentId.Value));

                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    result.ByDepartment.Add(new BloodIssueSummaryByDeptDto
                    {
                        DepartmentName = reader2["DeptName"]?.ToString(),
                        Quantity = reader2.GetInt32(reader2.GetOrdinal("Quantity")),
                        Volume = reader2.GetDecimal(reader2.GetOrdinal("Volume"))
                    });
                }
            }

            result.TotalBags = result.ByProductType.Sum(x => x.Quantity);
            result.TotalVolume = result.ByProductType.Sum(x => x.Volume);
            return result;
        }

        public async Task<byte[]> PrintBloodIssueByPatientAsync(Guid patientId, DateTime fromDate, DateTime toDate)
        {
            var data = await GetBloodIssueByPatientAsync(patientId, fromDate, toDate); // throws for unknown/deleted patient

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Phieu linh mau benh nhan</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>PHIEU LINH MAU THEO BENH NHAN</h2>");
            sb.AppendLine($"<p><strong>Ho ten:</strong> {Esc(data.PatientName)} | <strong>Ma BN:</strong> {Esc(data.PatientCode)}</p>");
            sb.AppendLine($"<p><strong>Tuoi:</strong> {data.Age} | <strong>Gioi tinh:</strong> {Esc(data.Gender)} | <strong>Nhom mau:</strong> {Esc(data.BloodType)} {Esc(data.RhFactor)}</p>");
            sb.AppendLine($"<p><strong>Chan doan:</strong> {Esc(data.Diagnosis)} | <strong>Khoa:</strong> {Esc(data.DepartmentName)}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ngay cap</th><th>Ma tui</th><th>Loai CP</th><th>The tich</th><th>Trang thai</th></tr>");
            int stt = 1;
            if (data.Items != null)
            {
                foreach (var item in data.Items)
                    sb.AppendLine($"<tr><td>{stt++}</td><td>{item.IssueDate:dd/MM/yyyy}</td><td>{Esc(item.BagCode)}</td><td>{Esc(item.ProductTypeName)}</td><td>{item.Volume}</td><td>{Esc(item.TransfusionStatus)}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<BloodIssueByPatientDto> GetBloodIssueByPatientAsync(Guid patientId, DateTime fromDate, DateTime toDate)
        {
            // QA-R11: an unknown/deleted patient answered 200 with an empty sheet, and the demographics (group, age,
            // gender) were never filled; bags transfused through a blood ORDER (not an issue receipt) were missing and
            // every row said "Issued" whatever happened to the bag afterwards.
            var patient = await _context.Patients.AsNoTracking()
                .Where(p => p.Id == patientId && !p.IsDeleted)
                .Select(p => new { p.PatientCode, p.FullName, p.DateOfBirth, p.Gender, p.BloodType, p.RhFactor })
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy bệnh nhân.");
            toDate = InclusiveEndOfDay(toDate);
            var result = new BloodIssueByPatientDto
            {
                PatientId = patientId,
                PatientCode = patient.PatientCode,
                PatientName = patient.FullName,
                Age = patient.DateOfBirth.HasValue ? Math.Max(0, (int)((DateTime.Today - patient.DateOfBirth.Value.Date).TotalDays / 365.25)) : 0,
                Gender = patient.Gender == 1 ? "Nam" : patient.Gender == 2 ? "Nữ" : "",
                BloodType = patient.BloodType,
                RhFactor = patient.RhFactor,
                Items = new List<BloodIssueByPatientItemDto>()
            };

            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"SELECT i.BagCode, i.ProductTypeName, i.Volume, r.IssueDate,
                    i.PatientCode, i.PatientName, b.Status AS BagStatus, CAST(NULL AS datetime2) AS TransfusionDate
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    LEFT JOIN BloodBags b ON b.BagCode = i.BagCode
                    WHERE i.PatientId = @patientId AND r.IssueDate >= @from AND r.IssueDate <= @to
                    UNION ALL
                    SELECT a.BagCode, oi.ProductTypeName, a.Volume, o.OrderDate,
                    o.PatientCode, o.PatientName, a.TransfusionStatus, a.TransfusionStartTime
                    FROM BloodBagAssignments a
                    INNER JOIN BloodOrderItems oi ON oi.Id = a.OrderItemId
                    INNER JOIN BloodOrders o ON o.Id = oi.OrderId
                    WHERE o.PatientId = @patientId AND a.TransfusionStatus IN ('Transfusing','Completed','Returned')
                      AND COALESCE(a.TransfusionStartTime, o.OrderDate) >= @from
                      AND COALESCE(a.TransfusionStartTime, o.OrderDate) <= @to
                    ORDER BY IssueDate DESC";
                cmd.Parameters.Add(new SqlParameter("@patientId", patientId));
                cmd.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd.Parameters.Add(new SqlParameter("@to", toDate));

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var tdOrd = reader.GetOrdinal("TransfusionDate");
                    result.Items.Add(new BloodIssueByPatientItemDto
                    {
                        IssueDate = reader.GetDateTime(reader.GetOrdinal("IssueDate")),
                        BagCode = reader["BagCode"]?.ToString(),
                        ProductTypeName = reader["ProductTypeName"]?.ToString(),
                        Volume = reader.IsDBNull(reader.GetOrdinal("Volume")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Volume")),
                        TransfusionStatus = reader.IsDBNull(reader.GetOrdinal("BagStatus")) ? "Issued" : reader["BagStatus"].ToString(),
                        TransfusionDate = reader.IsDBNull(tdOrd) ? null : reader.GetDateTime(tdOrd)
                    });
                }
            }
            return result;
        }

        #endregion
    }
}
