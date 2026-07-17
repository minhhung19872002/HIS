using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// #364 wave-8b (2026-07-17): tach nhom in-an (Print*) khoi WarehouseCompleteService.StockOut.cs
public partial class WarehouseCompleteService {
    #region 5.2 Xuat kho - In an

    public async Task<byte[]> PrintSaleInvoiceAsync(Guid saleId)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .Include(e => e.Details).ThenInclude(d => d.Supply)
                .FirstOrDefaultAsync(e => e.Id == saleId);

            if (export == null) return Array.Empty<byte>();

            var patient = export.PatientId.HasValue ? await _context.Patients.FindAsync(export.PatientId.Value) : null;

            var metaLabels = new[] { "Nha thuoc", "Khach hang", "SĐT", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                patient?.FullName ?? "Khach le",
                patient?.PhoneNumber ?? "",
                export.Note ?? ""
            };

            var items = export.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber ?? ""
            }).ToList();

            var html = BuildItemizedReport(
                "HOA DON BAN THUOC",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues!,
                items);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintUsageInstructionsAsync(Guid issueId)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(e => e.Id == issueId);

            if (export == null) return Array.Empty<byte>();

            var patient = export.PatientId.HasValue ? await _context.Patients.FindAsync(export.PatientId.Value) : null;

            Prescription? prescription = null;
            if (export.PrescriptionId.HasValue)
                prescription = await _context.Prescriptions
                    .Include(p => p.Details)
                    .FirstOrDefaultAsync(p => p.Id == export.PrescriptionId.Value);

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">HUONG DAN SU DUNG THUOC</div>");
            body.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngay {export.ReceiptDate:dd/MM/yyyy}</div>");

            if (patient != null)
            {
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Ho ten:</span><span class=""field-value"">{Esc(patient.FullName)}</span></div>");
            }
            if (prescription != null)
            {
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(prescription.Diagnosis)}</span></div>");
            }

            body.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr>
                <th style=""width:30px"">STT</th><th>Ten thuoc</th><th>Lieu dung</th><th>Cach dung</th><th>Ghi chu</th>
            </tr></thead><tbody>");

            var prescDetails = prescription?.Details.ToList() ?? new List<PrescriptionDetail>();
            int idx = 1;
            foreach (var d in export.Details)
            {
                var matchDetail = prescDetails.FirstOrDefault(pd => pd.MedicineId == d.MedicineId);
                var dosage = matchDetail?.Dosage ?? "";
                var usage = matchDetail?.Usage ?? matchDetail?.UsageInstructions ?? "";
                var frequency = matchDetail?.Frequency ?? "";
                body.AppendLine($@"<tr>
                    <td class=""text-center"">{idx++}</td>
                    <td><b>{Esc(d.Medicine?.MedicineName)}</b><br/>{Esc(d.Medicine?.Concentration)}</td>
                    <td>{Esc(dosage)}{(string.IsNullOrEmpty(frequency) ? "" : $" - {Esc(frequency)}")}</td>
                    <td>{Esc(usage)}</td>
                    <td>{Esc(matchDetail?.Note)}</td>
                </tr>");
            }

            body.AppendLine("</tbody></table>");

            if (prescription?.Note != null)
                body.AppendLine($@"<div class=""mt-10""><b>Loi dan:</b> {Esc(prescription.Note)}</div>");

            body.AppendLine(GetSignatureBlock(null, null, null, false));

            var html = WrapHtmlPage("Huong dan su dung thuoc", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintOutpatientPrescriptionAsync(Guid prescriptionId)
    {
        try
        {
            var prescription = await _context.Prescriptions
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.MedicalRecord)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId);

            if (prescription == null) return Array.Empty<byte>();

            var patient = await _context.Patients.FindAsync(prescription.MedicalRecord?.PatientId ?? Guid.Empty);

            var prescriptionRows = prescription.Details.Select(d => new PrescriptionRow
            {
                MedicineName = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit ?? d.Medicine?.Unit,
                Quantity = d.Quantity,
                Dosage = d.Dosage,
                Frequency = d.Frequency,
                Route = d.Route,
                Usage = d.Usage ?? d.UsageInstructions
            }).ToList();

            var html = GetPrescription(
                patient?.PatientCode,
                patient?.FullName,
                patient?.Gender ?? 0,
                patient?.DateOfBirth,
                patient?.Address,
                patient?.PhoneNumber,
                patient?.InsuranceNumber,
                prescription.Diagnosis ?? prescription.DiagnosisName,
                prescription.IcdCode ?? prescription.DiagnosisCode,
                prescription.PrescriptionDate,
                prescription.TotalDays,
                prescriptionRows,
                prescription.Note,
                prescription.Doctor?.FullName,
                prescription.Department?.DepartmentName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintInpatientOrderAsync(Guid orderSummaryId)
    {
        try
        {
            var prescription = await _context.Prescriptions
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Include(p => p.Doctor)
                .Include(p => p.Department)
                .Include(p => p.MedicalRecord)
                .FirstOrDefaultAsync(p => p.Id == orderSummaryId);

            if (prescription == null) return Array.Empty<byte>();

            var patient = await _context.Patients.FindAsync(prescription.MedicalRecord?.PatientId ?? Guid.Empty);

            var metaLabels = new[] { "Benh nhan", "Ma BN", "Khoa", "Chan doan", "BS ke don", "So ngay" };
            var metaValues = new[]
            {
                patient?.FullName ?? "",
                patient?.PatientCode ?? "",
                prescription.Department?.DepartmentName ?? "",
                prescription.Diagnosis ?? prescription.DiagnosisName ?? "",
                prescription.Doctor?.FullName ?? "",
                prescription.TotalDays.ToString()
            };

            var items = prescription.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit ?? d.Medicine?.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.Dosage != null ? $"{d.Dosage} - {d.Frequency}" : d.Note
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU LINH THUOC NOI TRU",
                prescription.PrescriptionCode,
                prescription.PrescriptionDate,
                metaLabels, metaValues,
                items,
                prescription.Doctor?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintStockIssueAsync(Guid id)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .Include(e => e.Details).ThenInclude(d => d.Supply)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (export == null) return Array.Empty<byte>();

            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(export.CreatedBy, out var uid) ? uid : Guid.Empty);

            var exportTypeName = export.ExportType switch
            {
                1 => "Xuat BN ngoai tru",
                2 => "Xuat BN noi tru",
                3 => "Xuat chuyen kho",
                4 => "Xuat tra NCC",
                5 => "Xuat huy",
                6 => "Xuat kiem ke giam",
                _ => ""
            };

            var metaLabels = new[] { "Kho xuat", "Loai xuat", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                exportTypeName,
                export.Note ?? ""
            };

            var items = export.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" : ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU XUAT KHO",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintNarcoticIssueAsync(Guid id)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (export == null) return Array.Empty<byte>();

            var patient = export.PatientId.HasValue ? await _context.Patients.FindAsync(export.PatientId.Value) : null;
            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(export.CreatedBy, out var uid) ? uid : Guid.Empty);

            var narcoticDetails = export.Details
                .Where(d => d.Medicine != null && d.Medicine.IsNarcotic)
                .ToList();
            if (!narcoticDetails.Any())
                narcoticDetails = export.Details.ToList();

            var metaLabels = new[] { "Kho xuat", "Benh nhan", "Ma BN", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                patient?.FullName ?? "",
                patient?.PatientCode ?? "",
                export.Note ?? ""
            };

            var items = narcoticDetails.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" : ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU XUAT THUOC GAY NGHIEN",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintToxicIssueAsync(Guid id)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (export == null) return Array.Empty<byte>();

            var patient = export.PatientId.HasValue ? await _context.Patients.FindAsync(export.PatientId.Value) : null;
            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(export.CreatedBy, out var uid) ? uid : Guid.Empty);

            var toxicDetails = export.Details
                .Where(d => d.Medicine != null && d.Medicine.IsPsychotropic)
                .ToList();
            if (!toxicDetails.Any())
                toxicDetails = export.Details.ToList();

            var metaLabels = new[] { "Kho xuat", "Benh nhan", "Ma BN", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                patient?.FullName ?? "",
                patient?.PatientCode ?? "",
                export.Note ?? ""
            };

            var items = toxicDetails.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" : ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU XUAT THUOC HUONG THAN",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintTransferIssueAsync(Guid id)
    {
        try
        {
            var export = await _context.ExportReceipts
                .Include(e => e.Warehouse)
                .Include(e => e.Details).ThenInclude(d => d.Medicine)
                .Include(e => e.Details).ThenInclude(d => d.Supply)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (export == null) return Array.Empty<byte>();

            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(export.CreatedBy, out var uid) ? uid : Guid.Empty);
            var targetWarehouse = export.ToWarehouseId.HasValue ? await _context.Warehouses.FindAsync(export.ToWarehouseId.Value) : null;

            var metaLabels = new[] { "Kho xuat", "Kho nhan", "Ly do chuyen", "Ghi chu" };
            var metaValues = new[]
            {
                export.Warehouse?.WarehouseName ?? "",
                targetWarehouse?.WarehouseName ?? "",
                "Chuyen kho noi bo",
                export.Note ?? ""
            };

            var items = export.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = d.BatchNumber != null ? $"Lo: {d.BatchNumber}" + (d.ExpiryDate.HasValue ? $" - HSD: {d.ExpiryDate:dd/MM/yyyy}" : "") : ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU XUAT CHUYEN KHO",
                export.ReceiptCode,
                export.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }
    #endregion
}
