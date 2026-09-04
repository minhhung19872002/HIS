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
                    sb.AppendLine($"<tr><td>{item.ProductTypeName}</td><td>{item.Quantity}</td><td>{item.Volume}</td></tr>");
            }
            sb.AppendLine("</table><h3>Theo khoa</h3><table><tr><th>Khoa</th><th>So luong</th><th>The tich (mL)</th></tr>");
            if (summary.ByDepartment != null)
            {
                foreach (var item in summary.ByDepartment)
                    sb.AppendLine($"<tr><td>{item.DepartmentName}</td><td>{item.Quantity}</td><td>{item.Volume}</td></tr>");
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
                var sql2 = @"SELECT ISNULL(r.DepartmentId, '00000000-0000-0000-0000-000000000000') AS DeptId,
                    COUNT(*) AS Quantity, SUM(i.Volume) AS Volume
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    WHERE r.IssueDate >= @from AND r.IssueDate <= @to";
                if (departmentId.HasValue)
                    sql2 += " AND r.DepartmentId = @deptId";
                sql2 += " GROUP BY r.DepartmentId";

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
                        DepartmentName = reader2["DeptId"]?.ToString(),
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
            var data = await GetBloodIssueByPatientAsync(patientId, fromDate, toDate);
            if (data == null) return Encoding.UTF8.GetBytes("<html><body>Not found</body></html>");

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Phieu linh mau benh nhan</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>PHIEU LINH MAU THEO BENH NHAN</h2>");
            sb.AppendLine($"<p><strong>Ho ten:</strong> {data.PatientName} | <strong>Ma BN:</strong> {data.PatientCode}</p>");
            sb.AppendLine($"<p><strong>Tuoi:</strong> {data.Age} | <strong>Gioi tinh:</strong> {data.Gender} | <strong>Nhom mau:</strong> {data.BloodType} {data.RhFactor}</p>");
            sb.AppendLine($"<p><strong>Chan doan:</strong> {data.Diagnosis} | <strong>Khoa:</strong> {data.DepartmentName}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ngay cap</th><th>Ma tui</th><th>Loai CP</th><th>The tich</th><th>Trang thai</th></tr>");
            int stt = 1;
            if (data.Items != null)
            {
                foreach (var item in data.Items)
                    sb.AppendLine($"<tr><td>{stt++}</td><td>{item.IssueDate:dd/MM/yyyy}</td><td>{item.BagCode}</td><td>{item.ProductTypeName}</td><td>{item.Volume}</td><td>{item.TransfusionStatus}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<BloodIssueByPatientDto> GetBloodIssueByPatientAsync(Guid patientId, DateTime fromDate, DateTime toDate)
        {
            var result = new BloodIssueByPatientDto
            {
                PatientId = patientId,
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
                    i.PatientCode, i.PatientName
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    WHERE i.PatientId = @patientId AND r.IssueDate >= @from AND r.IssueDate <= @to
                    ORDER BY r.IssueDate DESC";
                cmd.Parameters.Add(new SqlParameter("@patientId", patientId));
                cmd.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd.Parameters.Add(new SqlParameter("@to", toDate));

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    if (string.IsNullOrEmpty(result.PatientCode))
                    {
                        result.PatientCode = reader["PatientCode"]?.ToString();
                        result.PatientName = reader["PatientName"]?.ToString();
                    }
                    result.Items.Add(new BloodIssueByPatientItemDto
                    {
                        IssueDate = reader.GetDateTime(reader.GetOrdinal("IssueDate")),
                        BagCode = reader["BagCode"]?.ToString(),
                        ProductTypeName = reader["ProductTypeName"]?.ToString(),
                        Volume = reader.IsDBNull(reader.GetOrdinal("Volume")) ? 0 : reader.GetDecimal(reader.GetOrdinal("Volume")),
                        TransfusionStatus = "Issued",
                        TransfusionDate = null
                    });
                }
            }
            return result;
        }

        #endregion
    }
}
