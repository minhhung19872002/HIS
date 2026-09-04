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
        #region 10. Barcode/QRCode

        public async Task<ScanBloodBagResultDto> ScanBloodBagAsync(ScanBloodBagDto dto)
        {
            if (string.IsNullOrEmpty(dto?.BarcodeOrQRCode))
            {
                return new ScanBloodBagResultDto
                {
                    Found = false,
                    Message = "Ma vach khong hop le",
                    Warnings = new List<string>()
                };
            }

            var bag = await GetBloodBagByBarcodeAsync(dto.BarcodeOrQRCode);
            if (bag == null)
            {
                return new ScanBloodBagResultDto
                {
                    Found = false,
                    Message = $"Khong tim thay tui mau voi ma: {dto.BarcodeOrQRCode}",
                    Warnings = new List<string>()
                };
            }

            var warnings = new List<string>();
            if (bag.ExpiryDate <= DateTime.Now)
                warnings.Add("Tui mau da het han su dung!");
            else if (bag.ExpiryDate <= DateTime.Now.AddDays(7))
                warnings.Add($"Tui mau sap het han ({bag.ExpiryDate:dd/MM/yyyy})");
            if (bag.Status == "Destroyed")
                warnings.Add("Tui mau da bi huy!");
            if (bag.Status == "Issued")
                warnings.Add("Tui mau da duoc xuat kho");

            return new ScanBloodBagResultDto
            {
                Found = true,
                BloodBag = bag,
                Message = "Tim thay tui mau",
                Warnings = warnings
            };
        }

        public async Task<byte[]> PrintBloodBagBarcodesAsync(PrintBloodBagBarcodeDto dto)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Ma vach tui mau</title>");
            sb.AppendLine("<style>body{font-family:Arial;margin:10px}.label{border:1px solid #333;padding:10px;margin:5px;display:inline-block;width:280px;text-align:center}.barcode{font-family:'Libre Barcode 39',monospace;font-size:40px}</style></head><body>");

            if (dto?.BloodBagIds != null)
            {
                foreach (var bagId in dto.BloodBagIds)
                {
                    var bag = await GetBloodBagAsync(bagId);
                    if (bag != null)
                    {
                        sb.AppendLine("<div class='label'>");
                        sb.AppendLine($"<p class='barcode'>*{bag.Barcode}*</p>");
                        sb.AppendLine($"<p><strong>{bag.BagCode}</strong></p>");
                        sb.AppendLine($"<p>{bag.BloodType} {bag.RhFactor} | {bag.ProductTypeName}</p>");
                        sb.AppendLine($"<p>Vol: {bag.Volume} mL | Exp: {bag.ExpiryDate:dd/MM/yyyy}</p>");
                        sb.AppendLine("</div>");
                    }
                }
            }
            sb.AppendLine("</body></html>");
            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<BloodBagDto> GetBloodBagByBarcodeAsync(string barcode)
        {
            // #218/T3 (2026-09-04): KHÔNG `using` kết nối này — nó thuộc về DbContext.
            // `using` sẽ Dispose kết nối của EF, nên lệnh kế tiếp trên cùng context ném
            // "The ConnectionString property has not been initialized". Gặp thật khi tạo
            // phiếu chỉ định máu: hàm tra tên chế phẩm đóng kết nối, câu INSERT sau đó hỏng.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open) await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = @"SELECT b.*, pt.Name AS ProductTypeName, s.Name AS SupplierName
                FROM BloodBags b
                LEFT JOIN BloodProductTypes pt ON b.ProductTypeId = pt.Id
                LEFT JOIN BloodSuppliers s ON b.SupplierId = s.Id
                WHERE b.Barcode = @barcode OR b.BagCode = @barcode";
            command.Parameters.Add(new SqlParameter("@barcode", barcode));

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
                return ReadBloodBagFromReader(reader);
            return null;
        }

        #endregion
    }
}
