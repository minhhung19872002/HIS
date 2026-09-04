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
        #region 6. Reports

        public async Task<BloodStockCardDto> GetStockCardAsync(
            string bloodType, string rhFactor, Guid productTypeId, DateTime fromDate, DateTime toDate)
        {
            var ptName = await GetProductTypeNameAsync(productTypeId);
            var transactions = new List<BloodStockCardTransactionDto>();

            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();

            // Get imports
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"SELECT r.ReceiptDate AS TransactionDate, r.ReceiptCode AS DocumentCode, COUNT(*) AS Quantity
                    FROM BloodImportItems i
                    INNER JOIN BloodImportReceipts r ON i.ReceiptId = r.Id
                    WHERE i.BloodType = @bt AND i.RhFactor = @rh AND i.ProductTypeId = @pt
                    AND r.ReceiptDate >= @from AND r.ReceiptDate <= @to AND r.Status = 'Confirmed'
                    GROUP BY r.ReceiptDate, r.ReceiptCode ORDER BY r.ReceiptDate";
                cmd.Parameters.Add(new SqlParameter("@bt", bloodType));
                cmd.Parameters.Add(new SqlParameter("@rh", rhFactor));
                cmd.Parameters.Add(new SqlParameter("@pt", productTypeId));
                cmd.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd.Parameters.Add(new SqlParameter("@to", toDate));

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    transactions.Add(new BloodStockCardTransactionDto
                    {
                        TransactionDate = reader.GetDateTime(reader.GetOrdinal("TransactionDate")),
                        TransactionType = "Import",
                        DocumentCode = reader["DocumentCode"]?.ToString(),
                        Description = "Nhap mau tu NCC",
                        Quantity = reader.GetInt32(reader.GetOrdinal("Quantity")),
                        Balance = 0
                    });
                }
            }

            // Get exports
            using (var cmd2 = connection.CreateCommand())
            {
                cmd2.CommandText = @"SELECT r.IssueDate AS TransactionDate, r.ReceiptCode AS DocumentCode, COUNT(*) AS Quantity
                    FROM BloodIssueItems i
                    INNER JOIN BloodIssueReceipts r ON i.ReceiptId = r.Id
                    WHERE i.BloodType = @bt AND i.RhFactor = @rh AND i.ProductTypeName = @ptName
                    AND r.IssueDate >= @from AND r.IssueDate <= @to
                    GROUP BY r.IssueDate, r.ReceiptCode ORDER BY r.IssueDate";
                cmd2.Parameters.Add(new SqlParameter("@bt", bloodType));
                cmd2.Parameters.Add(new SqlParameter("@rh", rhFactor));
                cmd2.Parameters.Add(new SqlParameter("@ptName", ptName));
                cmd2.Parameters.Add(new SqlParameter("@from", fromDate));
                cmd2.Parameters.Add(new SqlParameter("@to", toDate));

                using var reader2 = await cmd2.ExecuteReaderAsync();
                while (await reader2.ReadAsync())
                {
                    transactions.Add(new BloodStockCardTransactionDto
                    {
                        TransactionDate = reader2.GetDateTime(reader2.GetOrdinal("TransactionDate")),
                        TransactionType = "Export",
                        DocumentCode = reader2["DocumentCode"]?.ToString(),
                        Description = "Xuat mau cho khoa",
                        Quantity = reader2.GetInt32(reader2.GetOrdinal("Quantity")),
                        Balance = 0
                    });
                }
            }

            transactions = transactions.OrderBy(t => t.TransactionDate).ToList();
            int totalImport = transactions.Where(t => t.TransactionType == "Import").Sum(t => t.Quantity);
            int totalExport = transactions.Where(t => t.TransactionType == "Export").Sum(t => t.Quantity);

            // Calculate running balance
            int balance = 0;
            foreach (var t in transactions)
            {
                balance += t.TransactionType == "Import" ? t.Quantity : -t.Quantity;
                t.Balance = balance;
            }

            return new BloodStockCardDto
            {
                BloodType = bloodType,
                RhFactor = rhFactor,
                ProductTypeName = ptName,
                FromDate = fromDate,
                ToDate = toDate,
                OpeningBalance = 0,
                TotalImport = totalImport,
                TotalExport = totalExport,
                ClosingBalance = totalImport - totalExport,
                Transactions = transactions
            };
        }

        public async Task<BloodInventoryReportDto> GetInventoryReportAsync(DateTime fromDate, DateTime toDate)
        {
            var items = new List<BloodInventoryReportItemDto>();
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var command = connection.CreateCommand();

            command.CommandText = @"SELECT b.BloodType, b.RhFactor, pt.Name AS ProductTypeName,
                SUM(CASE WHEN b.CreatedAt < @from AND b.Status NOT IN ('Destroyed','Transfused') THEN 1 ELSE 0 END) AS OpeningStock,
                SUM(CASE WHEN b.CreatedAt >= @from AND b.CreatedAt <= @to THEN 1 ELSE 0 END) AS ImportQuantity,
                SUM(CASE WHEN b.Status = 'Issued' THEN 1 ELSE 0 END) AS ExportQuantity,
                SUM(CASE WHEN b.Status = 'Expired' THEN 1 ELSE 0 END) AS ExpiredQuantity,
                SUM(CASE WHEN b.Status = 'Destroyed' THEN 1 ELSE 0 END) AS DestroyedQuantity,
                SUM(CASE WHEN b.Status IN ('Available','Reserved') THEN 1 ELSE 0 END) AS ClosingStock
                FROM BloodBags b
                LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                GROUP BY b.BloodType, b.RhFactor, pt.Name
                ORDER BY b.BloodType, b.RhFactor";
            command.Parameters.Add(new SqlParameter("@from", fromDate));
            command.Parameters.Add(new SqlParameter("@to", toDate));

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                items.Add(new BloodInventoryReportItemDto
                {
                    BloodType = reader["BloodType"]?.ToString(),
                    RhFactor = reader["RhFactor"]?.ToString(),
                    ProductTypeName = reader["ProductTypeName"]?.ToString(),
                    OpeningStock = reader.IsDBNull(reader.GetOrdinal("OpeningStock")) ? 0 : reader.GetInt32(reader.GetOrdinal("OpeningStock")),
                    ImportQuantity = reader.IsDBNull(reader.GetOrdinal("ImportQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("ImportQuantity")),
                    ExportQuantity = reader.IsDBNull(reader.GetOrdinal("ExportQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("ExportQuantity")),
                    ExpiredQuantity = reader.IsDBNull(reader.GetOrdinal("ExpiredQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("ExpiredQuantity")),
                    DestroyedQuantity = reader.IsDBNull(reader.GetOrdinal("DestroyedQuantity")) ? 0 : reader.GetInt32(reader.GetOrdinal("DestroyedQuantity")),
                    ClosingStock = reader.IsDBNull(reader.GetOrdinal("ClosingStock")) ? 0 : reader.GetInt32(reader.GetOrdinal("ClosingStock"))
                });
            }

            return new BloodInventoryReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                Items = items
            };
        }

        public async Task<byte[]> PrintImportReportAsync(DateTime fromDate, DateTime toDate, Guid? supplierId = null)
        {
            var receipts = await GetImportReceiptsAsync(fromDate, toDate, supplierId);
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Bao cao nhap mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>BAO CAO NHAP MAU</h2>");
            sb.AppendLine($"<p>Tu ngay: {fromDate:dd/MM/yyyy} - Den ngay: {toDate:dd/MM/yyyy}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ma phieu</th><th>Ngay nhap</th><th>NCC</th><th>So tui</th><th>Tong tien</th><th>Trang thai</th></tr>");
            int stt = 1;
            foreach (var r in receipts)
            {
                sb.AppendLine($"<tr><td>{stt++}</td><td>{r.ReceiptCode}</td><td>{r.ReceiptDate:dd/MM/yyyy}</td><td>{r.SupplierName}</td><td>{r.TotalBags}</td><td>{r.TotalAmount:N0}</td><td>{r.Status}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> PrintExportReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
        {
            var receipts = await GetIssueReceiptsAsync(fromDate, toDate, departmentId);
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Bao cao xuat mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>BAO CAO XUAT MAU</h2>");
            sb.AppendLine($"<p>Tu ngay: {fromDate:dd/MM/yyyy} - Den ngay: {toDate:dd/MM/yyyy}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Ma phieu</th><th>Ngay xuat</th><th>So tui</th><th>Trang thai</th></tr>");
            int stt = 1;
            foreach (var r in receipts)
            {
                sb.AppendLine($"<tr><td>{stt++}</td><td>{r.ReceiptCode}</td><td>{r.IssueDate:dd/MM/yyyy}</td><td>{r.TotalBags}</td><td>{r.Status}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> PrintInventoryReportAsync(Guid inventoryId)
        {
            var inv = await GetInventoryAsync(inventoryId);
            if (inv == null) return Encoding.UTF8.GetBytes("<html><body>Not found</body></html>");

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Bien ban kiem ke</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>BIEN BAN KIEM KE KHO MAU</h2>");
            sb.AppendLine($"<p><strong>Ma phieu:</strong> {inv.InventoryCode}</p>");
            sb.AppendLine($"<p><strong>Ngay kiem ke:</strong> {inv.InventoryDate:dd/MM/yyyy}</p>");
            sb.AppendLine($"<p><strong>Nguoi thuc hien:</strong> {inv.ConductedBy}</p>");
            sb.AppendLine("<table><tr><th>STT</th><th>Nhom mau</th><th>Rh</th><th>Loai CP</th><th>Ton he thong</th><th>Ton thuc te</th><th>Chenh lech</th><th>Ghi chu</th></tr>");
            int stt = 1;
            if (inv.Items != null)
            {
                foreach (var item in inv.Items)
                {
                    sb.AppendLine($"<tr><td>{stt++}</td><td>{item.BloodType}</td><td>{item.RhFactor}</td><td>{item.ProductTypeName}</td><td>{item.SystemQuantity}</td><td>{item.ActualQuantity}</td><td>{item.Variance}</td><td>{item.Note}</td></tr>");
                }
            }
            sb.AppendLine($"</table><p><strong>Tong he thong:</strong> {inv.TotalBagsSystem} | <strong>Tong thuc te:</strong> {inv.TotalBagsActual} | <strong>Chenh lech:</strong> {inv.Variance}</p>");
            sb.AppendLine("<div style='margin-top:40px;display:flex;justify-content:space-around'><div style='text-align:center'><p><strong>Nguoi kiem ke</strong></p></div><div style='text-align:center'><p><strong>Nguoi duyet</strong></p></div></div>");
            sb.AppendLine("</body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> PrintStockReportAsync(DateTime fromDate, DateTime toDate)
        {
            var report = await GetInventoryReportAsync(fromDate, toDate);
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Bao cao nhap xuat ton</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body>");
            sb.AppendLine("<h2 style='text-align:center'>BAO CAO NHAP XUAT TON KHO MAU</h2>");
            sb.AppendLine($"<p>Tu ngay: {fromDate:dd/MM/yyyy} - Den ngay: {toDate:dd/MM/yyyy}</p>");
            sb.AppendLine("<table><tr><th>Nhom mau</th><th>Rh</th><th>Loai CP</th><th>Ton dau</th><th>Nhap</th><th>Xuat</th><th>Het han</th><th>Huy</th><th>Ton cuoi</th></tr>");
            foreach (var item in report.Items)
            {
                sb.AppendLine($"<tr><td>{item.BloodType}</td><td>{item.RhFactor}</td><td>{item.ProductTypeName}</td><td>{item.OpeningStock}</td><td>{item.ImportQuantity}</td><td>{item.ExportQuantity}</td><td>{item.ExpiredQuantity}</td><td>{item.DestroyedQuantity}</td><td>{item.ClosingStock}</td></tr>");
            }
            sb.AppendLine("</table></body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        #endregion
    }
}
