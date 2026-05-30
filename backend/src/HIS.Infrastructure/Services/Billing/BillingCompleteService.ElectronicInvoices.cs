using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K8 phien 2 (2026-05-30): tach 10.2.1 Electronic Invoices (~485 dong) khoi BillingCompleteService.
public partial class BillingCompleteService {
    #region 10.2.1 Electronic Invoices

    private static string GetEInvoiceStatusName(int status) => status switch
    {
        0 => "Nháp",
        1 => "Đã phát hành",
        2 => "Đã gửi",
        3 => "Đã hủy",
        4 => "Đã thay thế",
        _ => "Không xác định"
    };

    private ElectronicInvoiceDto MapToEInvoiceDto(ElectronicInvoice e) => new()
    {
        Id = e.Id,
        InvoiceId = e.InvoiceSummaryId ?? Guid.Empty,
        InvoiceCode = e.InvoiceSummary?.InvoiceCode ?? string.Empty,
        EInvoiceNumber = e.InvoiceNumber,
        EInvoiceSeries = e.InvoiceSeries,
        EInvoiceDate = e.InvoiceDate,
        Provider = e.ProviderName ?? "VNInvoice",
        ProviderInvoiceId = e.ProviderInvoiceId,
        PatientName = e.PatientName,
        BuyerName = e.BuyerName,
        BuyerTaxCode = e.TaxCode,
        BuyerAddress = e.PatientAddress,
        BuyerEmail = e.SentTo,
        PaymentMethod = e.PaymentMethod,
        SubTotal = e.SubTotal,
        Amount = e.SubTotal,
        VatRate = e.VatRate,
        VatAmount = e.VatAmount,
        DiscountAmount = e.DiscountAmount,
        TotalAmount = e.TotalAmount,
        ItemsJson = e.ItemsJson,
        Status = e.Status,
        StatusName = GetEInvoiceStatusName(e.Status),
        LookupUrl = e.LookupUrl,
        LookupCode = e.LookupCode,
        CancelReason = e.CancelReason,
        CancelledAt = e.CancelledAt,
        SentAt = e.SentAt,
        SentTo = e.SentTo,
        SignedBy = e.SignedBy,
        CreatedAt = e.CreatedAt,
        CreatedBy = e.CreatedBy
    };

    private async Task<string> GenerateEInvoiceNumberAsync()
    {
        var today = DateTime.Now;
        var prefix = $"HDDT-{today:yyyyMMdd}-";
        var todayStart = today.Date;
        var todayEnd = todayStart.AddDays(1);

        var count = await _context.ElectronicInvoices
            .Where(e => e.InvoiceDate >= todayStart && e.InvoiceDate < todayEnd)
            .CountAsync();

        return $"{prefix}{(count + 1):D4}";
    }

    public async Task<ElectronicInvoiceDto> IssueElectronicInvoiceAsync(IssueEInvoiceDto dto, Guid userId)
    {
        // Look up the invoice summary to get amount information
        var invoice = await _context.InvoiceSummaries
            .Include(i => i.MedicalRecord)
            .FirstOrDefaultAsync(i => i.Id == dto.InvoiceId);

        if (invoice == null)
            throw new Exception("Không tìm thấy bảng kê viện phí");

        // Get patient info
        Patient? patient = null;
        if (invoice.MedicalRecord != null)
        {
            patient = await _context.Patients.FindAsync(invoice.MedicalRecord.PatientId);
        }

        var subTotal = invoice.TotalAmount;
        var vatRate = 8m; // 8% VAT for medical services in Vietnam
        var vatAmount = Math.Round(subTotal * vatRate / 100, 0);
        var discountAmount = invoice.DiscountAmount;
        var totalAmount = subTotal + vatAmount - discountAmount;

        // Build line items JSON from receipt details
        var itemsJson = "[]";
        try
        {
            var receiptDetails = await _context.ReceiptDetails
                .Where(rd => rd.Receipt.MedicalRecordId == invoice.MedicalRecordId && rd.Receipt.Status == 1)
                .Select(rd => new { rd.ItemName, Unit = "Lần", Qty = rd.Quantity, Price = rd.UnitPrice, Amount = rd.FinalAmount })
                .ToListAsync();

            if (receiptDetails.Any())
            {
                itemsJson = System.Text.Json.JsonSerializer.Serialize(receiptDetails.Select(r => new
                {
                    name = r.ItemName ?? "Dịch vụ y tế",
                    unit = r.Unit,
                    qty = r.Qty,
                    price = r.Price,
                    amount = r.Amount
                }));
            }
        }
        catch { /* ignore - items are optional */ }

        var invoiceNumber = await GenerateEInvoiceNumberAsync();
        var series = $"1C{DateTime.Now:yy}TAA";
        var lookupCode = $"LK{DateTime.Now:yyyyMMddHHmmssfff}";

        var eInvoice = new ElectronicInvoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = invoiceNumber,
            InvoiceSeries = series,
            InvoiceDate = DateTime.Now,
            InvoiceSummaryId = dto.InvoiceId,
            PatientId = patient?.Id,
            MedicalRecordId = invoice.MedicalRecordId,
            PatientName = dto.BuyerName ?? patient?.FullName ?? string.Empty,
            PatientAddress = dto.BuyerAddress ?? patient?.Address,
            TaxCode = dto.BuyerTaxCode,
            BuyerName = dto.BuyerName ?? patient?.FullName,
            PaymentMethod = dto.PaymentMethod ?? "TM",
            SubTotal = subTotal,
            VatRate = vatRate,
            VatAmount = vatAmount,
            TotalAmount = totalAmount,
            DiscountAmount = discountAmount,
            ItemsJson = itemsJson,
            Status = 1, // Issued
            ProviderName = "VNInvoice",
            ProviderInvoiceId = Guid.NewGuid().ToString("N")[..16].ToUpper(),
            LookupCode = lookupCode,
            LookupUrl = $"https://einvoice.vn/lookup/{lookupCode}",
            SignedBy = userId.ToString(),
            CreatedBy = userId.ToString()
        };

        _context.ElectronicInvoices.Add(eInvoice);
        await _context.SaveChangesAsync();

        // Reload with navigation
        var saved = await _context.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .FirstOrDefaultAsync(e => e.Id == eInvoice.Id);

        return MapToEInvoiceDto(saved ?? eInvoice);
    }

    public async Task<bool> CancelElectronicInvoiceAsync(Guid eInvoiceId, string reason, Guid userId)
    {
        var eInvoice = await _context.ElectronicInvoices.FindAsync(eInvoiceId);
        if (eInvoice == null)
            throw new Exception("Không tìm thấy hóa đơn điện tử");

        if (eInvoice.Status == 3)
            throw new Exception("Hóa đơn đã bị hủy trước đó");

        eInvoice.Status = 3; // Cancelled
        eInvoice.CancelReason = reason;
        eInvoice.CancelledAt = DateTime.Now;
        eInvoice.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PagedResultDto<ElectronicInvoiceDto>> SearchElectronicInvoicesAsync(ElectronicInvoiceSearchDto dto)
    {
        var query = _context.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim().ToLower();
            query = query.Where(e =>
                e.InvoiceNumber.ToLower().Contains(kw) ||
                e.PatientName.ToLower().Contains(kw) ||
                (e.BuyerName != null && e.BuyerName.ToLower().Contains(kw)) ||
                (e.TaxCode != null && e.TaxCode.Contains(kw)) ||
                (e.LookupCode != null && e.LookupCode.ToLower().Contains(kw)));
        }

        if (dto.Status.HasValue)
            query = query.Where(e => e.Status == dto.Status.Value);

        if (dto.FromDate.HasValue)
            query = query.Where(e => e.InvoiceDate >= dto.FromDate.Value.Date);

        if (dto.ToDate.HasValue)
            query = query.Where(e => e.InvoiceDate < dto.ToDate.Value.Date.AddDays(1));

        if (dto.PatientId.HasValue)
            query = query.Where(e => e.PatientId == dto.PatientId.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(e => e.InvoiceDate)
            .Skip(dto.PageIndex * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        return new PagedResultDto<ElectronicInvoiceDto>
        {
            Items = items.Select(MapToEInvoiceDto).ToList(),
            TotalCount = totalCount,
            Page = dto.PageIndex + 1,
            PageSize = dto.PageSize
        };
    }

    public async Task<List<ElectronicInvoiceDto>> GetElectronicInvoicesAsync(Guid? invoiceId, DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .AsNoTracking()
            .AsQueryable();

        if (invoiceId.HasValue)
            query = query.Where(e => e.InvoiceSummaryId == invoiceId.Value);

        if (fromDate.HasValue)
            query = query.Where(e => e.InvoiceDate >= fromDate.Value.Date);

        if (toDate.HasValue)
            query = query.Where(e => e.InvoiceDate < toDate.Value.Date.AddDays(1));

        var items = await query.OrderByDescending(e => e.InvoiceDate).Take(200).ToListAsync();
        return items.Select(MapToEInvoiceDto).ToList();
    }

    public async Task<ElectronicInvoiceDto?> GetElectronicInvoiceByIdAsync(Guid id)
    {
        var eInvoice = await _context.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id);

        return eInvoice != null ? MapToEInvoiceDto(eInvoice) : null;
    }

    public async Task<bool> ResendElectronicInvoiceAsync(Guid eInvoiceId, string email)
    {
        var eInvoice = await _context.ElectronicInvoices.FindAsync(eInvoiceId);
        if (eInvoice == null)
            throw new Exception("Không tìm thấy hóa đơn điện tử");

        if (eInvoice.Status == 3)
            throw new Exception("Không thể gửi hóa đơn đã hủy");

        // Update sent status
        eInvoice.SentAt = DateTime.Now;
        eInvoice.SentTo = email;
        if (eInvoice.Status == 1) // If issued, mark as sent
            eInvoice.Status = 2;

        await _context.SaveChangesAsync();

        // Note: actual email sending depends on SMTP config via IEmailService
        // The sent status is tracked in the DB record
        return true;
    }

    public async Task<ElectronicInvoiceDto> ExportElectronicInvoiceAsync(Guid eInvoiceId, Guid userId)
    {
        var eInvoice = await _context.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .FirstOrDefaultAsync(e => e.Id == eInvoiceId);

        if (eInvoice == null)
            throw new Exception("Không tìm thấy hóa đơn điện tử");

        if (eInvoice.Status == 3)
            throw new Exception("Không thể xuất hóa đơn đã hủy");

        // Simulate export to provider (VNInvoice/Misa)
        // In production, this would call the provider's API
        eInvoice.ProviderInvoiceId ??= Guid.NewGuid().ToString("N")[..16].ToUpper();
        eInvoice.LookupCode ??= $"LK{DateTime.Now:yyyyMMddHHmmssfff}";
        eInvoice.LookupUrl ??= $"https://einvoice.vn/lookup/{eInvoice.LookupCode}";

        if (eInvoice.Status == 0) // Draft -> Issued
            eInvoice.Status = 1;

        eInvoice.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        return MapToEInvoiceDto(eInvoice);
    }

    public async Task<ElectronicInvoiceStatsDto> GetElectronicInvoiceStatsAsync(DateTime? fromDate, DateTime? toDate)
    {
        var from = fromDate?.Date ?? DateTime.Now.Date.AddDays(-30);
        var to = toDate?.Date.AddDays(1) ?? DateTime.Now.Date.AddDays(1);

        var query = _context.ElectronicInvoices
            .AsNoTracking()
            .Where(e => e.InvoiceDate >= from && e.InvoiceDate < to);

        var all = await query.Select(e => new { e.Status, e.SubTotal, e.VatAmount, e.TotalAmount, e.InvoiceDate }).ToListAsync();

        var dailyStats = all
            .GroupBy(e => e.InvoiceDate.Date)
            .Select(g => new ElectronicInvoiceDailyStatDto
            {
                Date = g.Key,
                Count = g.Count(),
                Amount = g.Sum(x => x.TotalAmount)
            })
            .OrderBy(d => d.Date)
            .ToList();

        return new ElectronicInvoiceStatsDto
        {
            TotalInvoices = all.Count,
            DraftCount = all.Count(e => e.Status == 0),
            IssuedCount = all.Count(e => e.Status == 1),
            SentCount = all.Count(e => e.Status == 2),
            CancelledCount = all.Count(e => e.Status == 3),
            ReplacedCount = all.Count(e => e.Status == 4),
            TotalAmount = all.Where(e => e.Status != 3).Sum(e => e.SubTotal),
            TotalVatAmount = all.Where(e => e.Status != 3).Sum(e => e.VatAmount),
            TotalWithVat = all.Where(e => e.Status != 3).Sum(e => e.TotalAmount),
            FromDate = from,
            ToDate = to.AddDays(-1),
            DailyStats = dailyStats
        };
    }

    public async Task<byte[]> PrintRepresentativeInvoiceAsync(Guid eInvoiceId)
    {
        var eInvoice = await _context.ElectronicInvoices
            .Include(e => e.InvoiceSummary)
            .Include(e => e.Patient)
            .FirstOrDefaultAsync(e => e.Id == eInvoiceId);

        if (eInvoice == null) return Array.Empty<byte>();

        // Parse line items
        var itemRows = "";
        try
        {
            if (!string.IsNullOrWhiteSpace(eInvoice.ItemsJson))
            {
                var items = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, System.Text.Json.JsonElement>>>(eInvoice.ItemsJson);
                if (items != null)
                {
                    var idx = 0;
                    foreach (var item in items)
                    {
                        idx++;
                        var name = item.ContainsKey("name") ? item["name"].GetString() : "Dịch vụ y tế";
                        var unit = item.ContainsKey("unit") ? item["unit"].GetString() : "Lần";
                        var qty = item.ContainsKey("qty") ? item["qty"].GetDecimal() : 1;
                        var price = item.ContainsKey("price") ? item["price"].GetDecimal() : 0;
                        var amount = item.ContainsKey("amount") ? item["amount"].GetDecimal() : 0;
                        itemRows += $"<tr><td class='text-center'>{idx}</td><td>{name}</td><td class='text-center'>{unit}</td><td class='text-right'>{qty:N0}</td><td class='text-right'>{price:N0}</td><td class='text-right'>{amount:N0}</td></tr>";
                    }
                }
            }
        }
        catch { /* fallback to single row */ }

        if (string.IsNullOrEmpty(itemRows))
        {
            itemRows = $"<tr><td class='text-center'>1</td><td>Dịch vụ y tế</td><td class='text-center'>Lần</td><td class='text-right'>1</td><td class='text-right'>{eInvoice.SubTotal:N0}</td><td class='text-right'>{eInvoice.SubTotal:N0}</td></tr>";
        }

        var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <title>HOA DON GIA TRI GIA TANG (DAI DIEN)</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 30px; max-width: 210mm; margin: 0 auto; }}
        .header {{ text-align: center; margin-bottom: 20px; }}
        .header h2 {{ font-size: 18px; margin-bottom: 5px; }}
        .header h3 {{ font-size: 14px; font-weight: normal; }}
        .invoice-title {{ text-align: center; margin: 20px 0; }}
        .invoice-title h1 {{ font-size: 22px; color: #000; }}
        .invoice-title .subtitle {{ font-size: 13px; font-style: italic; }}
        .info-section {{ margin: 15px 0; }}
        .info-row {{ margin: 4px 0; display: flex; }}
        .info-label {{ width: 180px; font-weight: bold; }}
        .info-value {{ flex: 1; }}
        table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        table th, table td {{ border: 1px solid #000; padding: 5px 8px; }}
        table th {{ background-color: #f0f0f0; font-weight: bold; }}
        .text-right {{ text-align: right; }}
        .text-center {{ text-align: center; }}
        .total-section {{ margin: 15px 0; }}
        .total-row {{ display: flex; justify-content: flex-end; margin: 3px 0; }}
        .total-label {{ width: 200px; text-align: right; padding-right: 20px; }}
        .total-value {{ width: 150px; text-align: right; font-weight: bold; }}
        .grand-total {{ font-size: 16px; color: #c00; border-top: 2px solid #000; padding-top: 5px; }}
        .footer {{ display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }}
        .footer-col {{ width: 45%; }}
        .footer-col .name {{ font-weight: bold; margin-top: 60px; }}
        .stamp {{ color: #999; font-style: italic; font-size: 11px; text-align: center; margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px; }}
        .lookup {{ text-align: center; margin: 20px 0; padding: 10px; border: 1px dashed #666; }}
        @media print {{ body {{ padding: 15px; }} }}
    </style>
</head>
<body>
    <div class='header'>
        <h2>HOA DON GIA TRI GIA TANG</h2>
        <h3>(Ban the hien cua hoa don dien tu)</h3>
        <div>Ngay {eInvoice.InvoiceDate:dd} thang {eInvoice.InvoiceDate:MM} nam {eInvoice.InvoiceDate:yyyy}</div>
    </div>

    <div class='invoice-title'>
        <div>Ky hieu: <strong>{eInvoice.InvoiceSeries}</strong> &nbsp;&nbsp; So: <strong>{eInvoice.InvoiceNumber}</strong></div>
    </div>

    <div class='info-section'>
        <div class='info-row'><span class='info-label'>Don vi ban hang:</span><span class='info-value'>BENH VIEN DA KHOA ABC</span></div>
        <div class='info-row'><span class='info-label'>Ma so thue:</span><span class='info-value'>0100000000</span></div>
        <div class='info-row'><span class='info-label'>Dia chi:</span><span class='info-value'>123 Nguyen Trai, Thanh Xuan, Ha Noi</span></div>
        <div class='info-row'><span class='info-label'>Dien thoai:</span><span class='info-value'>024 1234 5678</span></div>
    </div>

    <div class='info-section'>
        <div class='info-row'><span class='info-label'>Ho ten nguoi mua:</span><span class='info-value'>{eInvoice.BuyerName ?? eInvoice.PatientName}</span></div>
        <div class='info-row'><span class='info-label'>Ten don vi:</span><span class='info-value'>{eInvoice.BuyerName ?? "-"}</span></div>
        <div class='info-row'><span class='info-label'>Ma so thue:</span><span class='info-value'>{eInvoice.TaxCode ?? "-"}</span></div>
        <div class='info-row'><span class='info-label'>Dia chi:</span><span class='info-value'>{eInvoice.PatientAddress ?? "-"}</span></div>
        <div class='info-row'><span class='info-label'>Hinh thuc thanh toan:</span><span class='info-value'>{eInvoice.PaymentMethod ?? "TM"}</span></div>
    </div>

    <table>
        <thead>
            <tr>
                <th style='width:40px'>STT</th>
                <th>Ten hang hoa, dich vu</th>
                <th style='width:60px'>DVT</th>
                <th style='width:60px'>So luong</th>
                <th style='width:100px'>Don gia</th>
                <th style='width:120px'>Thanh tien</th>
            </tr>
        </thead>
        <tbody>
            {itemRows}
        </tbody>
    </table>

    <div class='total-section'>
        <div class='total-row'><span class='total-label'>Cong tien hang:</span><span class='total-value'>{eInvoice.SubTotal:N0}</span></div>
        <div class='total-row'><span class='total-label'>Thue suat GTGT:</span><span class='total-value'>{eInvoice.VatRate}%</span></div>
        <div class='total-row'><span class='total-label'>Tien thue GTGT:</span><span class='total-value'>{eInvoice.VatAmount:N0}</span></div>
        {(eInvoice.DiscountAmount > 0 ? $"<div class='total-row'><span class='total-label'>Giam gia:</span><span class='total-value'>-{eInvoice.DiscountAmount:N0}</span></div>" : "")}
        <div class='total-row grand-total'><span class='total-label'>Tong tien thanh toan:</span><span class='total-value'>{eInvoice.TotalAmount:N0} VND</span></div>
    </div>

    <div class='lookup'>
        <strong>Tra cuu hoa don dien tu tai:</strong> {eInvoice.LookupUrl}<br/>
        <strong>Ma tra cuu:</strong> {eInvoice.LookupCode}
    </div>

    <div class='footer'>
        <div class='footer-col'>
            <div>Nguoi mua hang</div>
            <div class='name'>{eInvoice.BuyerName ?? eInvoice.PatientName}</div>
        </div>
        <div class='footer-col'>
            <div>Nguoi ban hang</div>
            <div class='name'>(Ky dien tu)</div>
        </div>
    </div>

    <div class='stamp'>Can cu Nghi dinh 123/2020/ND-CP va Thong tu 78/2021/TT-BTC.<br/>
    Hoa don dien tu co gia tri phap ly nhu hoa don giay.</div>
</body>
</html>";
        return Encoding.UTF8.GetBytes(html);
    }

    #endregion
}
