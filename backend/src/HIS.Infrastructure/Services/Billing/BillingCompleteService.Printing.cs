using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K8 phien 1 (2026-05-30): tach 10.2 Printing (~516 dong) khoi BillingCompleteService.
public partial class BillingCompleteService {
    #region 10.2 Printing

    /// <summary>
    /// In bang ke 6556 - tong hop dich vu + thuoc theo ho so benh an
    /// </summary>
    public async Task<byte[]> Print6556StatementAsync(Print6556RequestDto dto)
    {
        try
        {
            var record = await _context.MedicalRecords.AsNoTracking()
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId);
            if (record == null) return Array.Empty<byte>();

            var patient = record.Patient;

            // Query service requests for this medical record
            var serviceDetails = await _context.ServiceRequestDetails.AsNoTracking()
                .Include(d => d.Service)
                .Include(d => d.ServiceRequest)
                .Where(d => d.ServiceRequest.MedicalRecordId == dto.MedicalRecordId && d.ServiceRequest.Status != 4)
                .ToListAsync();

            // Query prescription details for this medical record
            var rxDetails = await _context.PrescriptionDetails.AsNoTracking()
                .Include(d => d.Medicine)
                .Include(d => d.Prescription)
                .Where(d => d.Prescription.MedicalRecordId == dto.MedicalRecordId && d.Prescription.Status != 4)
                .ToListAsync();

            var headers = new[] { "Ma DV/Thuoc", "Ten DV/Thuoc", "DVT", "SL", "Don gia", "Thanh tien", "BHYT", "BN tra" };
            var rows = new List<string[]>();

            foreach (var sd in serviceDetails)
            {
                rows.Add(new[]
                {
                    sd.Service?.ServiceCode ?? "",
                    sd.Service?.ServiceName ?? "",
                    sd.Service?.Unit ?? "",
                    sd.Quantity.ToString(),
                    sd.UnitPrice.ToString("#,##0"),
                    sd.Amount.ToString("#,##0"),
                    sd.InsuranceAmount.ToString("#,##0"),
                    sd.PatientAmount.ToString("#,##0")
                });
            }
            foreach (var rd in rxDetails)
            {
                rows.Add(new[]
                {
                    rd.Medicine?.MedicineCode ?? "",
                    rd.Medicine?.MedicineName ?? "",
                    rd.Unit ?? "",
                    rd.Quantity.ToString("#,##0"),
                    rd.UnitPrice.ToString("#,##0"),
                    rd.Amount.ToString("#,##0"),
                    rd.InsuranceAmount.ToString("#,##0"),
                    rd.PatientAmount.ToString("#,##0")
                });
            }

            var subtitle = $"Ho so: {record.MedicalRecordCode} - BN: {patient.FullName}";
            var html = BuildTableReport("BANG KE CHI PHI KHAM CHUA BENH", subtitle, DateTime.Now, headers, rows, "Thu ngan");
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Print6556StatementAsync failed for record {MedicalRecordId}", dto.MedicalRecordId);
            throw;
        }
    }

    /// <summary>
    /// In bang ke 6556 tach theo doi tuong thanh toan (BHYT / Vien phi / Dich vu)
    /// </summary>
    public async Task<byte[]> Print6556ByObjectAsync(Print6556RequestDto dto)
    {
        try
        {
            var record = await _context.MedicalRecords.AsNoTracking()
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId);
            if (record == null) return Array.Empty<byte>();

            var patient = record.Patient;

            var serviceDetails = await _context.ServiceRequestDetails.AsNoTracking()
                .Include(d => d.Service)
                .Include(d => d.ServiceRequest)
                .Where(d => d.ServiceRequest.MedicalRecordId == dto.MedicalRecordId && d.ServiceRequest.Status != 4)
                .ToListAsync();

            var rxDetails = await _context.PrescriptionDetails.AsNoTracking()
                .Include(d => d.Medicine)
                .Include(d => d.Prescription)
                .Where(d => d.Prescription.MedicalRecordId == dto.MedicalRecordId && d.Prescription.Status != 4)
                .ToListAsync();

            // Filter by payment object if specified
            if (dto.PaymentObject.HasValue)
            {
                serviceDetails = serviceDetails.Where(d => d.PatientType == dto.PaymentObject.Value).ToList();
                rxDetails = rxDetails.Where(d => d.PatientType == dto.PaymentObject.Value).ToList();
            }

            var sb = new StringBuilder();
            sb.AppendLine(GetHospitalHeader());
            sb.AppendLine(@"<div class=""form-title"">BANG KE CHI PHI KHAM CHUA BENH</div>");
            sb.AppendLine($@"<div class=""form-number"">Tach theo doi tuong - Ho so: {Esc(record.MedicalRecordCode)}</div>");
            sb.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">BN: {Esc(patient.FullName)}</div>");

            // Group by PatientType
            var objectTypes = new Dictionary<int, string> { { 1, "BHYT" }, { 2, "Vien phi" }, { 3, "Dich vu" } };
            foreach (var objType in objectTypes)
            {
                var svcGroup = serviceDetails.Where(d => d.PatientType == objType.Key).ToList();
                var rxGroup = rxDetails.Where(d => d.PatientType == objType.Key).ToList();
                if (svcGroup.Count == 0 && rxGroup.Count == 0) continue;

                sb.AppendLine($@"<div class=""section-title"">{Esc(objType.Value)}</div>");
                sb.AppendLine(@"<table class=""bordered""><thead><tr><th>STT</th><th>Ten DV/Thuoc</th><th>SL</th><th>Don gia</th><th>Thanh tien</th><th>BHYT</th><th>BN tra</th></tr></thead><tbody>");

                int idx = 1;
                foreach (var sd in svcGroup)
                {
                    sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(sd.Service?.ServiceName)}</td><td class=\"text-center\">{sd.Quantity}</td><td class=\"text-right\">{sd.UnitPrice:#,##0}</td><td class=\"text-right\">{sd.Amount:#,##0}</td><td class=\"text-right\">{sd.InsuranceAmount:#,##0}</td><td class=\"text-right\">{sd.PatientAmount:#,##0}</td></tr>");
                }
                foreach (var rd in rxGroup)
                {
                    sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(rd.Medicine?.MedicineName)}</td><td class=\"text-center\">{rd.Quantity:#,##0}</td><td class=\"text-right\">{rd.UnitPrice:#,##0}</td><td class=\"text-right\">{rd.Amount:#,##0}</td><td class=\"text-right\">{rd.InsuranceAmount:#,##0}</td><td class=\"text-right\">{rd.PatientAmount:#,##0}</td></tr>");
                }

                var totalAmount = svcGroup.Sum(s => s.Amount) + rxGroup.Sum(r => r.Amount);
                var totalIns = svcGroup.Sum(s => s.InsuranceAmount) + rxGroup.Sum(r => r.InsuranceAmount);
                var totalPat = svcGroup.Sum(s => s.PatientAmount) + rxGroup.Sum(r => r.PatientAmount);
                sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Cong {Esc(objType.Value)}:</b></td><td class=\"text-right\"><b>{totalAmount:#,##0}</b></td><td class=\"text-right\"><b>{totalIns:#,##0}</b></td><td class=\"text-right\"><b>{totalPat:#,##0}</b></td></tr>");
                sb.AppendLine("</tbody></table>");
            }

            sb.AppendLine(GetSignatureBlock("Thu ngan"));

            var html = WrapHtmlPage("Bang ke chi phi - Tach doi tuong", sb.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Print6556ByObjectAsync failed for record {MedicalRecordId}", dto.MedicalRecordId);
            throw;
        }
    }

    /// <summary>
    /// In bang ke 6556 tach theo khoa dieu tri
    /// </summary>
    public async Task<byte[]> Print6556ByDepartmentAsync(Print6556RequestDto dto)
    {
        try
        {
            var record = await _context.MedicalRecords.AsNoTracking()
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId);
            if (record == null) return Array.Empty<byte>();

            var patient = record.Patient;

            var serviceRequests = await _context.ServiceRequests.AsNoTracking()
                .Include(r => r.Department)
                .Include(r => r.Details).ThenInclude(d => d.Service)
                .Where(r => r.MedicalRecordId == dto.MedicalRecordId && r.Status != 4)
                .ToListAsync();

            var prescriptions = await _context.Prescriptions.AsNoTracking()
                .Include(p => p.Department)
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Where(p => p.MedicalRecordId == dto.MedicalRecordId && p.Status != 4)
                .ToListAsync();

            // Filter by department if specified
            if (dto.DepartmentId.HasValue)
            {
                serviceRequests = serviceRequests.Where(r => r.DepartmentId == dto.DepartmentId.Value).ToList();
                prescriptions = prescriptions.Where(p => p.DepartmentId == dto.DepartmentId.Value).ToList();
            }

            var sb = new StringBuilder();
            sb.AppendLine(GetHospitalHeader());
            sb.AppendLine(@"<div class=""form-title"">BANG KE CHI PHI KHAM CHUA BENH</div>");
            sb.AppendLine($@"<div class=""form-number"">Tach theo khoa - Ho so: {Esc(record.MedicalRecordCode)}</div>");
            sb.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">BN: {Esc(patient.FullName)}</div>");

            // Group by department
            var deptGroups = serviceRequests.GroupBy(r => new { r.DepartmentId, DeptName = r.Department?.DepartmentName ?? "Khac" });
            foreach (var deptGroup in deptGroups)
            {
                sb.AppendLine($@"<div class=""section-title"">Khoa: {Esc(deptGroup.Key.DeptName)}</div>");
                sb.AppendLine(@"<table class=""bordered""><thead><tr><th>STT</th><th>Ten dich vu</th><th>SL</th><th>Don gia</th><th>Thanh tien</th></tr></thead><tbody>");
                int idx = 1;
                decimal deptTotal = 0;
                foreach (var req in deptGroup)
                {
                    foreach (var detail in req.Details)
                    {
                        deptTotal += detail.Amount;
                        sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(detail.Service?.ServiceName)}</td><td class=\"text-center\">{detail.Quantity}</td><td class=\"text-right\">{detail.UnitPrice:#,##0}</td><td class=\"text-right\">{detail.Amount:#,##0}</td></tr>");
                    }
                }
                sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Cong khoa:</b></td><td class=\"text-right\"><b>{deptTotal:#,##0}</b></td></tr>");
                sb.AppendLine("</tbody></table>");
            }

            // Prescriptions by department
            var rxDeptGroups = prescriptions.GroupBy(p => new { p.DepartmentId, DeptName = p.Department?.DepartmentName ?? "Khac" });
            foreach (var deptGroup in rxDeptGroups)
            {
                sb.AppendLine($@"<div class=""section-title"">Thuoc - Khoa: {Esc(deptGroup.Key.DeptName)}</div>");
                sb.AppendLine(@"<table class=""bordered""><thead><tr><th>STT</th><th>Ten thuoc</th><th>SL</th><th>Don gia</th><th>Thanh tien</th></tr></thead><tbody>");
                int idx = 1;
                decimal deptTotal = 0;
                foreach (var rx in deptGroup)
                {
                    foreach (var detail in rx.Details)
                    {
                        deptTotal += detail.Amount;
                        sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(detail.Medicine?.MedicineName)}</td><td class=\"text-center\">{detail.Quantity:#,##0}</td><td class=\"text-right\">{detail.UnitPrice:#,##0}</td><td class=\"text-right\">{detail.Amount:#,##0}</td></tr>");
                    }
                }
                sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Cong thuoc khoa:</b></td><td class=\"text-right\"><b>{deptTotal:#,##0}</b></td></tr>");
                sb.AppendLine("</tbody></table>");
            }

            sb.AppendLine(GetSignatureBlock("Thu ngan"));

            var html = WrapHtmlPage("Bang ke chi phi - Tach theo khoa", sb.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Print6556ByDepartmentAsync failed for record {MedicalRecordId}", dto.MedicalRecordId);
            throw;
        }
    }

    /// <summary>
    /// In phieu tam ung theo dich vu da chi dinh
    /// </summary>
    public async Task<byte[]> PrintDepositByServiceAsync(PrintByServiceRequestDto dto)
    {
        try
        {
            var patient = await _context.Patients.FindAsync(dto.PatientId);
            if (patient == null) return Array.Empty<byte>();

            var query = _context.ServiceRequestDetails.AsNoTracking()
                .Include(d => d.Service)
                .Include(d => d.ServiceRequest)
                .Where(d => d.ServiceRequest.MedicalRecord.PatientId == dto.PatientId && d.ServiceRequest.Status != 4);

            if (dto.ServiceIds != null && dto.ServiceIds.Count > 0)
                query = query.Where(d => dto.ServiceIds.Contains(d.ServiceId));
            if (dto.FromDate.HasValue)
                query = query.Where(d => d.ServiceRequest.RequestDate >= dto.FromDate.Value);
            if (dto.ToDate.HasValue)
                query = query.Where(d => d.ServiceRequest.RequestDate <= dto.ToDate.Value);

            var details = await query.ToListAsync();

            var deposits = await _context.Deposits.AsNoTracking()
                .Where(d => d.PatientId == dto.PatientId && d.Status == 1)
                .OrderByDescending(d => d.ReceiptDate)
                .ToListAsync();

            var totalServiceAmount = details.Sum(d => d.PatientAmount);
            var totalDeposit = deposits.Sum(d => d.RemainingAmount);

            var sb = new StringBuilder();
            sb.AppendLine(GetHospitalHeader());
            sb.AppendLine(@"<div class=""form-title"">PHIEU TAM UNG THEO DICH VU</div>");
            sb.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngay {DateTime.Now:dd} thang {DateTime.Now:MM} nam {DateTime.Now:yyyy}</div>");

            sb.AppendLine($@"<div class=""field""><span class=""field-label"">Ho ten BN:</span><span class=""field-value"">{Esc(patient.FullName)}</span></div>");
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">Ma BN:</span><span class=""field-value"">{Esc(patient.PatientCode)}</span></div>");

            sb.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr><th>STT</th><th>Ten dich vu</th><th>SL</th><th>Don gia</th><th>BN phai tra</th></tr></thead><tbody>");
            int idx = 1;
            foreach (var d in details)
            {
                sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(d.Service?.ServiceName)}</td><td class=\"text-center\">{d.Quantity}</td><td class=\"text-right\">{d.UnitPrice:#,##0}</td><td class=\"text-right\">{d.PatientAmount:#,##0}</td></tr>");
            }
            sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Tong chi phi BN:</b></td><td class=\"text-right\"><b>{totalServiceAmount:#,##0}</b></td></tr>");
            sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Da tam ung:</b></td><td class=\"text-right\"><b>{totalDeposit:#,##0}</b></td></tr>");

            var remaining = totalServiceAmount - totalDeposit;
            sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Con phai nop:</b></td><td class=\"text-right\"><b>{(remaining > 0 ? remaining : 0):#,##0}</b></td></tr>");
            sb.AppendLine("</tbody></table>");

            // NangCap25 II.2 — còn phải nộp → nhúng QR động đóng tạm ứng (gắn hồ sơ mới nhất của BN)
            if (remaining > 0)
            {
                var latestMrId = await _context.MedicalRecords.AsNoTracking()
                    .Where(m => m.PatientId == dto.PatientId && !m.IsDeleted)
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => (Guid?)m.Id)
                    .FirstOrDefaultAsync();
                if (latestMrId.HasValue)
                    sb.AppendLine(await _paymentGateway.BuildPrintQrBlockHtmlAsync(
                        new HIS.Application.DTOs.Payment.DynamicQrRequestDto
                        {
                            ReferenceType = "deposit",
                            ReferenceId = latestMrId.Value,
                            Amount = remaining,
                            OrderInfo = "Tam ung theo phieu dich vu"
                        }, Guid.Empty));
            }

            sb.AppendLine(GetSignatureBlock("Thu ngan"));

            var html = WrapHtmlPage("Phieu tam ung theo dich vu", sb.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintDepositByServiceAsync failed for patient {PatientId}", dto.PatientId);
            throw;
        }
    }

    /// <summary>
    /// In phieu tam ung (bien lai tam ung)
    /// </summary>
    public async Task<byte[]> PrintDepositReceiptAsync(Guid depositId)
    {
        try
        {
            var deposit = await _context.Deposits.AsNoTracking()
                .Include(d => d.Patient)
                .Include(d => d.ReceivedBy)
                .FirstOrDefaultAsync(d => d.Id == depositId);
            if (deposit == null) return Array.Empty<byte>();

            var paymentMethodText = deposit.PaymentMethod switch
            {
                1 => "Tien mat",
                2 => "Chuyen khoan",
                3 => "The",
                4 => "QR Code",
                _ => "Khac"
            };

            var labels = new[] { "Ho ten benh nhan", "Ma benh nhan", "So tien tam ung", "Phuong thuc thanh toan", "So giao dich", "Ghi chu", "Nguoi thu" };
            var values = new[]
            {
                deposit.Patient?.FullName ?? "",
                deposit.Patient?.PatientCode ?? "",
                deposit.Amount.ToString("#,##0") + " VND",
                paymentMethodText,
                deposit.TransactionReference ?? "",
                deposit.Notes ?? "",
                deposit.ReceivedBy?.FullName ?? ""
            };

            var html = BuildVoucherReport("PHIEU TAM UNG", deposit.ReceiptNumber, deposit.ReceiptDate, labels, values, deposit.ReceivedBy?.FullName);
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintDepositReceiptAsync failed for deposit {DepositId}", depositId);
            throw;
        }
    }

    /// <summary>
    /// In phieu thu (bien lai thanh toan)
    /// </summary>
    public async Task<byte[]> PrintPaymentReceiptAsync(Guid paymentId)
    {
        try
        {
            var receipt = await _context.Receipts.AsNoTracking()
                .Include(r => r.Patient)
                .Include(r => r.Cashier)
                .Include(r => r.Details)
                .FirstOrDefaultAsync(r => r.Id == paymentId);
            if (receipt == null) return Array.Empty<byte>();

            var paymentMethodText = receipt.PaymentMethod switch
            {
                1 => "Tien mat",
                2 => "Chuyen khoan",
                3 => "The",
                4 => "Vi dien tu",
                _ => "Khac"
            };

            if (receipt.Details.Count > 0)
            {
                // Itemized receipt
                var metaLabels = new[] { "Ho ten benh nhan", "Ma benh nhan", "Phuong thuc TT", "Ghi chu" };
                var metaValues = new[]
                {
                    receipt.Patient?.FullName ?? "",
                    receipt.Patient?.PatientCode ?? "",
                    paymentMethodText,
                    receipt.Note ?? ""
                };

                var items = receipt.Details.Select(d => new ReportItemRow
                {
                    Name = d.ItemName ?? "",
                    Unit = d.ItemType switch { 1 => "DV", 2 => "Thuoc", 3 => "VT", _ => "" },
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    Amount = d.FinalAmount,
                    Note = ""
                }).ToList();

                var html = BuildItemizedReport("PHIEU THU TIEN", receipt.ReceiptCode, receipt.ReceiptDate, metaLabels, metaValues, items, receipt.Cashier?.FullName);
                return Encoding.UTF8.GetBytes(html);
            }
            else
            {
                // Simple receipt
                var labels = new[] { "Ho ten benh nhan", "Ma benh nhan", "Tong tien", "Giam gia", "Thanh toan", "Phuong thuc TT", "Ghi chu", "Thu ngan" };
                var values = new[]
                {
                    receipt.Patient?.FullName ?? "",
                    receipt.Patient?.PatientCode ?? "",
                    receipt.Amount.ToString("#,##0") + " VND",
                    receipt.Discount.ToString("#,##0") + " VND",
                    receipt.FinalAmount.ToString("#,##0") + " VND",
                    paymentMethodText,
                    receipt.Note ?? "",
                    receipt.Cashier?.FullName ?? ""
                };

                var html = BuildVoucherReport("PHIEU THU TIEN", receipt.ReceiptCode, receipt.ReceiptDate, labels, values, receipt.Cashier?.FullName);
                return Encoding.UTF8.GetBytes(html);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintPaymentReceiptAsync failed for payment {PaymentId}", paymentId);
            throw;
        }
    }

    /// <summary>
    /// In bang ke vien phi (invoice summary)
    /// </summary>
    public async Task<byte[]> PrintInvoiceAsync(Guid invoiceId)
    {
        try
        {
            var invoice = await _context.InvoiceSummaries.AsNoTracking()
                .Include(i => i.MedicalRecord).ThenInclude(r => r.Patient)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null) return Array.Empty<byte>();

            var patient = invoice.MedicalRecord?.Patient;
            var record = invoice.MedicalRecord;

            // Get receipt details associated with this medical record
            var receiptDetails = await _context.ReceiptDetails.AsNoTracking()
                .Include(d => d.Receipt)
                .Where(d => d.Receipt.MedicalRecordId == invoice.MedicalRecordId && d.Receipt.Status == 1)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine(GetHospitalHeader());
            sb.AppendLine(@"<div class=""form-title"">BANG KE VIEN PHI</div>");
            sb.AppendLine($@"<div class=""form-number"">So: {Esc(invoice.InvoiceCode)}</div>");
            sb.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngay {invoice.InvoiceDate:dd} thang {invoice.InvoiceDate:MM} nam {invoice.InvoiceDate:yyyy}</div>");

            // Patient info
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">Ho ten BN:</span><span class=""field-value"">{Esc(patient?.FullName)}</span></div>");
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">Ma BN:</span><span class=""field-value"">{Esc(patient?.PatientCode)}</span></div>");
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">So ho so:</span><span class=""field-value"">{Esc(record?.MedicalRecordCode)}</span></div>");
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">So the BHYT:</span><span class=""field-value"">{Esc(record?.InsuranceNumber)}</span></div>");

            // Detail items table
            if (receiptDetails.Count > 0)
            {
                sb.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr><th>STT</th><th>Ten DV/Thuoc</th><th>Loai</th><th>SL</th><th>Don gia</th><th>Thanh tien</th><th>Giam gia</th><th>BN tra</th></tr></thead><tbody>");
                int idx = 1;
                foreach (var d in receiptDetails)
                {
                    var itemTypeText = d.ItemType switch { 1 => "DV", 2 => "Thuoc", 3 => "VT", _ => "" };
                    sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(d.ItemName)}</td><td class=\"text-center\">{itemTypeText}</td><td class=\"text-center\">{d.Quantity:#,##0}</td><td class=\"text-right\">{d.UnitPrice:#,##0}</td><td class=\"text-right\">{d.Amount:#,##0}</td><td class=\"text-right\">{d.Discount:#,##0}</td><td class=\"text-right\">{d.FinalAmount:#,##0}</td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }

            // Summary section
            sb.AppendLine(@"<div class=""section-title"">TONG HOP CHI PHI</div>");
            sb.AppendLine(@"<table class=""bordered"">");
            sb.AppendLine($"<tr><td><b>Tong chi phi dich vu:</b></td><td class=\"text-right\">{invoice.TotalServiceAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Tong chi phi thuoc:</b></td><td class=\"text-right\">{invoice.TotalMedicineAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Tong chi phi vat tu:</b></td><td class=\"text-right\">{invoice.TotalSupplyAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Tong chi phi giuong:</b></td><td class=\"text-right\">{invoice.TotalBedAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>TONG CONG:</b></td><td class=\"text-right\"><b>{invoice.TotalAmount:#,##0}</b></td></tr>");
            sb.AppendLine($"<tr><td><b>BHYT chi tra:</b></td><td class=\"text-right\">{invoice.InsuranceAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Dong chi tra:</b></td><td class=\"text-right\">{invoice.PatientCoPayment:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Ngoai BHYT:</b></td><td class=\"text-right\">{invoice.OutOfPocket:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Da tam ung:</b></td><td class=\"text-right\">{invoice.DepositAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Da thanh toan:</b></td><td class=\"text-right\">{invoice.PaidAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Hoan tra:</b></td><td class=\"text-right\">{invoice.RefundAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Mien giam:</b></td><td class=\"text-right\">{invoice.DiscountAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>CON NO:</b></td><td class=\"text-right\"><b>{invoice.RemainingAmount:#,##0}</b></td></tr>");
            sb.AppendLine("</table>");

            sb.AppendLine(GetSignatureBlock("Thu ngan"));

            var html = WrapHtmlPage("Bang ke vien phi", sb.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintInvoiceAsync failed for invoice {InvoiceId}", invoiceId);
            throw;
        }
    }

    /// <summary>
    /// In phieu hoan tien
    /// </summary>
    public async Task<byte[]> PrintRefundReceiptAsync(Guid refundId)
    {
        try
        {
            // Refunds are stored as receipts with ReceiptType=3
            var receipt = await _context.Receipts.AsNoTracking()
                .Include(r => r.Patient)
                .Include(r => r.Cashier)
                .FirstOrDefaultAsync(r => r.Id == refundId);
            if (receipt == null) return Array.Empty<byte>();

            var paymentMethodText = receipt.PaymentMethod switch
            {
                1 => "Tien mat",
                2 => "Chuyen khoan",
                3 => "The",
                4 => "Vi dien tu",
                _ => "Khac"
            };

            var labels = new[] { "Ho ten benh nhan", "Ma benh nhan", "So tien hoan tra", "Phuong thuc hoan tra", "Ly do hoan tra", "Thu ngan" };
            var values = new[]
            {
                receipt.Patient?.FullName ?? "",
                receipt.Patient?.PatientCode ?? "",
                receipt.FinalAmount.ToString("#,##0") + " VND",
                paymentMethodText,
                receipt.Note ?? "",
                receipt.Cashier?.FullName ?? ""
            };

            var html = BuildVoucherReport("PHIEU HOAN TIEN", receipt.ReceiptCode, receipt.ReceiptDate, labels, values, receipt.Cashier?.FullName);
            return Encoding.UTF8.GetBytes(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintRefundReceiptAsync failed for refund {RefundId}", refundId);
            throw;
        }
    }

    #endregion
}
