using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class HospitalReportService
{

    private async Task FillCashierSummary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Receipts.AsNoTracking()
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted);

        var data = await query
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                ReceiptCount = g.Count(r => r.ReceiptType != 3),
                RefundCount = g.Count(r => r.ReceiptType == 3),
                TotalRevenue = g.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount),
                TotalRefund = g.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount)
            })
            .OrderBy(x => x.Date)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.Date.ToString("dd/MM/yyyy"),
                ["receiptCount"] = d.ReceiptCount,
                ["refundCount"] = d.RefundCount,
                ["totalRevenue"] = d.TotalRevenue,
                ["totalRefund"] = d.TotalRefund,
                ["netRevenue"] = d.TotalRevenue - d.TotalRefund
            });
        }
        result.Summary["totalRevenue"] = data.Sum(d => d.TotalRevenue);
        result.Summary["totalRefund"] = data.Sum(d => d.TotalRefund);
        result.Summary["netRevenue"] = data.Sum(d => d.TotalRevenue - d.TotalRefund);
    }

    private async Task FillRevenueByService(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillServiceRevenueDetail(result, from, to, deptId);
    }

    private async Task FillCashBookUsage(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // CashBooks query
        try
        {
            var data = await _context.Set<CashBook>().AsNoTracking()
                .Where(c => c.CreatedAt >= from && c.CreatedAt < to && !c.IsDeleted)
                .OrderByDescending(c => c.CreatedAt)
                .Take(500)
                .ToListAsync();

            foreach (var d in data)
            {
                result.Data.Add(new Dictionary<string, object>
                {
                    ["date"] = d.CreatedAt.ToString("dd/MM/yyyy"),
                    ["cashBookCode"] = d.BookCode ?? "",
                    ["isClosed"] = d.IsClosed,
                    ["openingBalance"] = d.OpeningBalance,
                    ["closingBalance"] = d.ClosingBalance,
                    ["totalReceipt"] = d.TotalReceipt,
                    ["totalRefund"] = d.TotalRefund
                });
            }
            result.Summary["totalCashBooks"] = data.Count;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            result.Summary["note"] = "Bang CashBooks chua tao";
        }
    }

    private async Task FillHospitalFeeSummary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Receipts.AsNoTracking()
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted && r.ReceiptType != 3);
        if (deptId.HasValue)
            query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == deptId);

        var data = await query
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Department)
            .GroupBy(r => new { r.MedicalRecord.DepartmentId, DeptName = r.MedicalRecord.Department.DepartmentName })
            .Select(g => new
            {
                g.Key.DeptName,
                TotalAmount = g.Sum(r => r.FinalAmount),
                DiscountAmount = g.Sum(r => r.Discount),
                PatientCount = g.Select(r => r.MedicalRecord.PatientId).Distinct().Count()
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["totalAmount"] = d.TotalAmount,
                ["discountAmount"] = d.DiscountAmount,
                ["netAmount"] = d.TotalAmount - d.DiscountAmount,
                ["patientCount"] = d.PatientCount
            });
        }
        result.Summary["totalRevenue"] = data.Sum(d => d.TotalAmount);
        result.Summary["totalDiscount"] = data.Sum(d => d.DiscountAmount);
        result.Summary["netRevenue"] = data.Sum(d => d.TotalAmount - d.DiscountAmount);
    }

    private async Task FillOtherPayerPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted)
            .Where(e => e.MedicalRecord.PatientType == 3); // Other payer
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Doi tuong khac", ["count"] = count });
        result.Summary["totalOtherPayer"] = count;
    }

    private async Task FillRevenueByOrderingDept(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillHospitalFeeSummary(result, from, to, deptId);
    }

    private async Task FillCancelledTransactions(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Receipts.AsNoTracking()
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted && r.ReceiptType == 3);

        var count = await query.CountAsync();
        var total = await query.SumAsync(r => r.FinalAmount);
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Giao dich huy / hoan",
            ["count"] = count,
            ["totalAmount"] = total
        });
        result.Summary["totalCancelled"] = count;
        result.Summary["totalCancelledAmount"] = total;
    }

    private async Task FillApprovedExcessDeficit(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // Placeholder - requires specialized accounting tables
        result.Data.Add(new Dictionary<string, object> { ["message"] = "Chua co du lieu thua/thieu" });
        result.Summary["totalExcess"] = 0;
        result.Summary["totalDeficit"] = 0;
    }

    private async Task FillSurgeryFinance(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgeryRequests.AsNoTracking()
            .Where(s => s.CreatedAt >= from && s.CreatedAt < to && !s.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(s => s.Examination != null && s.Examination.DepartmentId == deptId);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Phau thuat",
            ["count"] = count
        });
        result.Summary["totalSurgeries"] = count;
    }

    private async Task FillDischargePayment(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Discharges.AsNoTracking()
            .Where(d => d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(d => d.Admission.DepartmentId == deptId);

        var data = await query
            .Include(d => d.Admission).ThenInclude(a => a.Patient)
            .Include(d => d.Admission).ThenInclude(a => a.Department)
            .OrderBy(d => d.DischargeDate)
            .Take(1000)
            .Select(d => new
            {
                d.DischargeDate,
                d.Admission.Patient.PatientCode,
                d.Admission.Patient.FullName,
                DeptName = d.Admission.Department.DepartmentName,
                d.DischargeDiagnosis,
                d.DischargeCondition,
                d.DischargeType
            })
            .ToListAsync();

        var conditionNames = new Dictionary<int, string> { { 1, "Khoi" }, { 2, "Do" }, { 3, "Khong doi" }, { 4, "Nang hon" }, { 5, "Tu vong" } };
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["dischargeDate"] = d.DischargeDate.ToString("dd/MM/yyyy"),
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.FullName ?? "",
                ["departmentName"] = d.DeptName ?? "",
                ["diagnosis"] = d.DischargeDiagnosis ?? "",
                ["dischargeCondition"] = conditionNames.TryGetValue(d.DischargeCondition, out var c) ? c : $"{d.DischargeCondition}",
                ["dischargeType"] = d.DischargeType
            });
        }
        result.Summary["totalDischarges"] = data.Count;
    }



    private async Task FillStockMovement(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var importQuery = _context.ImportReceipts.AsNoTracking()
            .Where(i => i.ReceiptDate >= from && i.ReceiptDate < to && !i.IsDeleted);
        var exportQuery = _context.ExportReceipts.AsNoTracking()
            .Where(e => e.ReceiptDate >= from && e.ReceiptDate < to && !e.IsDeleted);
        if (warehouseId.HasValue)
        {
            importQuery = importQuery.Where(i => i.WarehouseId == warehouseId);
            exportQuery = exportQuery.Where(e => e.WarehouseId == warehouseId);
        }

        var importTotal = await importQuery.Include(i => i.Details).SelectMany(i => i.Details).SumAsync(d => d.Amount);
        var exportTotal = await exportQuery.Include(e => e.Details).SelectMany(e => e.Details).SumAsync(d => d.Amount);

        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Nhap",
            ["totalAmount"] = importTotal,
            ["transactionCount"] = await importQuery.CountAsync()
        });
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Xuat",
            ["totalAmount"] = exportTotal,
            ["transactionCount"] = await exportQuery.CountAsync()
        });
        result.Summary["totalImport"] = importTotal;
        result.Summary["totalExport"] = exportTotal;
        result.Summary["balance"] = importTotal - exportTotal;
    }

    private async Task FillPharmacyProfit(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var exports = _context.ExportReceipts.AsNoTracking()
            .Where(e => e.ReceiptDate >= from && e.ReceiptDate < to && !e.IsDeleted && e.ExportType == 6); // RetailSale
        if (warehouseId.HasValue)
            exports = exports.Where(e => e.WarehouseId == warehouseId);

        var totalSale = await exports.Include(e => e.Details).SelectMany(e => e.Details).SumAsync(d => d.Amount);
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Ban le",
            ["totalRevenue"] = totalSale
        });
        result.Summary["totalRetailRevenue"] = totalSale;
    }

    private async Task FillEmergencyCabinetNXT(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        // Emergency cabinet stock movement - filter by emergency warehouse type
        await FillStockMovement(result, from, to, warehouseId);
        result.ReportName = "NXT tu thuoc cap cuu";
    }

    private async Task FillIssueToDept(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId, Guid? deptId)
    {
        var query = _context.ExportReceipts.AsNoTracking()
            .Where(e => e.ReceiptDate >= from && e.ReceiptDate < to && !e.IsDeleted);
        if (warehouseId.HasValue)
            query = query.Where(e => e.WarehouseId == warehouseId);

        var data = await query
            .Include(e => e.Warehouse)
            .Include(e => e.Details).ThenInclude(d => d.Medicine)
            .GroupBy(e => new { e.WarehouseId, WHName = e.Warehouse.WarehouseName })
            .Select(g => new
            {
                g.Key.WHName,
                ExportCount = g.Count(),
                TotalAmount = g.SelectMany(e => e.Details).Sum(d => d.Amount)
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["warehouseName"] = d.WHName ?? "",
                ["exportCount"] = d.ExportCount,
                ["totalAmount"] = d.TotalAmount
            });
        }
        result.Summary["totalExports"] = data.Sum(d => d.ExportCount);
        result.Summary["totalAmount"] = data.Sum(d => d.TotalAmount);
    }

    private async Task FillDeptDispensingSheet(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillIssueToDept(result, from, to, null, deptId);
        result.ReportName = "Phieu cap phat khoa";
    }

    private async Task FillProcurementImport(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var query = _context.ImportReceipts.AsNoTracking()
            .Where(i => i.ReceiptDate >= from && i.ReceiptDate < to && !i.IsDeleted);
        if (warehouseId.HasValue)
            query = query.Where(i => i.WarehouseId == warehouseId);

        var data = await query
            .Include(i => i.Warehouse)
            .OrderByDescending(i => i.ReceiptDate)
            .Take(1000)
            .Select(i => new
            {
                i.ReceiptDate,
                i.ReceiptCode,
                i.SupplierName,
                WHName = i.Warehouse.WarehouseName,
                i.TotalAmount,
                i.Status
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["receiptDate"] = d.ReceiptDate.ToString("dd/MM/yyyy"),
                ["receiptCode"] = d.ReceiptCode ?? "",
                ["supplierName"] = d.SupplierName ?? "",
                ["warehouseName"] = d.WHName ?? "",
                ["totalAmount"] = d.TotalAmount,
                ["status"] = d.Status
            });
        }
        result.Summary["totalImports"] = data.Count;
        result.Summary["totalAmount"] = data.Sum(d => d.TotalAmount);
    }

    private async Task FillPrescriptionByDoctor(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Prescriptions.AsNoTracking()
            .Where(p => p.CreatedAt >= from && p.CreatedAt < to && !p.IsDeleted);

        var data = await query
            .Include(p => p.Doctor)
            .GroupBy(p => new { p.DoctorId, DoctorName = p.Doctor.FullName })
            .Select(g => new
            {
                g.Key.DoctorName,
                PrescriptionCount = g.Count(),
                TotalAmount = g.Sum(p => p.TotalAmount)
            })
            .OrderByDescending(x => x.PrescriptionCount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["doctorName"] = d.DoctorName ?? "",
                ["prescriptionCount"] = d.PrescriptionCount,
                ["totalAmount"] = d.TotalAmount
            });
        }
        result.Summary["totalPrescriptions"] = data.Sum(d => d.PrescriptionCount);
        result.Summary["totalAmount"] = data.Sum(d => d.TotalAmount);
    }

    private async Task FillStockCardDetail(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        await FillStockMovement(result, from, to, warehouseId);
        result.ReportName = "The kho chi tiet";
    }

    private async Task FillIssueByPatientType(HospitalReportResult result, DateTime from, DateTime to, Guid? warehouseId)
    {
        var query = _context.Prescriptions.AsNoTracking()
            .Where(p => p.CreatedAt >= from && p.CreatedAt < to && !p.IsDeleted);

        var data = await query
            .Include(p => p.MedicalRecord)
            .GroupBy(p => p.MedicalRecord.PatientType)
            .Select(g => new
            {
                PatientType = g.Key,
                Count = g.Count(),
                TotalAmount = g.Sum(p => p.TotalAmount)
            })
            .ToListAsync();

        var ptNames = new Dictionary<int, string> { { 1, "BHYT" }, { 2, "Vien phi" }, { 3, "Dich vu" }, { 4, "Kham suc khoe" } };
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["patientType"] = ptNames.TryGetValue(d.PatientType, out var n) ? n : $"Loai {d.PatientType}",
                ["prescriptionCount"] = d.Count,
                ["totalAmount"] = d.TotalAmount
            });
        }
        result.Summary["totalPrescriptions"] = data.Sum(d => d.Count);
    }



    private async Task FillParaclinicalSummary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // #14b: đếm phiếu/chỉ định XN từ model 1 (ServiceRequest/Detail RequestType=1) — bảng
        // LabRequest(Item) (model 2) chết trong luồng thật nên báo cáo trước đây đếm = 0.
        var labCount = await _context.ServiceRequests.AsNoTracking()
            .Where(r => r.RequestType == 1 && r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted && r.Status != 4)
            .CountAsync();
        var labItemCount = await _context.ServiceRequestDetails.AsNoTracking()
            .Where(d => d.ServiceRequest.RequestType == 1 && d.CreatedAt >= from && d.CreatedAt < to && !d.IsDeleted && d.Status != 3)
            .CountAsync();

        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Xet nghiem",
            ["requestCount"] = labCount,
            ["testCount"] = labItemCount
        });

        var srQuery = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.RequestType == 2); // Imaging
        var imgCount = await srQuery.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "CDHA",
            ["requestCount"] = imgCount,
            ["testCount"] = imgCount
        });

        result.Summary["totalLabRequests"] = labCount;
        result.Summary["totalLabTests"] = labItemCount;
        result.Summary["totalImagingRequests"] = imgCount;
    }

    private async Task FillMicrobiologyRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // #14b: model 1 — SRD XN thuộc nhóm dịch vụ vi sinh (LabRequests model 2 chết; filter PatientType==2 cũ là hack)
        var query = _context.ServiceRequestDetails.AsNoTracking()
            .Where(d => d.CreatedAt >= from && d.CreatedAt < to && !d.IsDeleted
                && d.ServiceRequest.RequestType == 1 && d.Status != 3
                && d.Service.ServiceGroup.GroupName.Contains("Vi sinh"));
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Vi sinh", ["count"] = count });
        result.Summary["totalMicrobiologyRequests"] = count;
    }

    private async Task FillLabRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // #14b: model 1 ServiceRequests (RequestType=1 XN, loại hủy) thay LabRequests (model 2 chết)
        var query = _context.ServiceRequests.AsNoTracking()
            .Where(l => l.CreatedAt >= from && l.CreatedAt < to && !l.IsDeleted && l.RequestType == 1 && l.Status != 4);

        var data = await query
            .OrderBy(l => l.CreatedAt)
            .Take(1000)
            .Select(l => new
            {
                l.CreatedAt,
                l.RequestCode,
                SampleCode = l.RequestCode, // phiếu model 1 dùng RequestCode làm mã tham chiếu
                l.Status,
                TestCount = l.Details.Count(d => !d.IsDeleted && d.Status != 3)
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                ["requestCode"] = d.RequestCode ?? "",
                ["sampleCode"] = d.SampleCode ?? "",
                ["status"] = d.Status,
                ["testCount"] = d.TestCount
            });
        }
        result.Summary["totalRequests"] = data.Count;
        result.Summary["totalTests"] = data.Sum(d => d.TestCount);
    }

    private async Task FillUltrasoundRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.RequestType == 2);
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Sieu am", ["count"] = count });
        result.Summary["totalUltrasound"] = count;
    }

    private async Task FillEndoscopyRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.RequestType == 2);
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "Noi soi / TDCN", ["count"] = count });
        result.Summary["totalEndoscopy"] = count;
    }

    private async Task FillImagingRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.RequestType == 2);
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object> { ["type"] = "CDHA", ["count"] = count });
        result.Summary["totalImaging"] = count;
    }

    private async Task FillImagingRevenue(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ReceiptDetails.AsNoTracking()
            .Where(rd => rd.Receipt.CreatedAt >= from && rd.Receipt.CreatedAt < to && !rd.IsDeleted)
            .Where(rd => rd.ItemType == 1); // Services related to imaging

        var total = await query.SumAsync(rd => rd.Amount);
        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Doanh thu CDHA",
            ["revenue"] = total,
            ["serviceCount"] = count
        });
        result.Summary["totalImagingRevenue"] = total;
    }

    private async Task FillDoctorByMachine(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        result.Data.Add(new Dictionary<string, object> { ["message"] = "Bao cao BS theo may - can du lieu may" });
        result.Summary["note"] = "Can cau hinh may CDHA";
    }

    private async Task FillOrderedVsPerformedCLS(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var ordered = await _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted)
            .CountAsync();
        var performed = await _context.ServiceRequests.AsNoTracking()
            .Where(sr => sr.CreatedAt >= from && sr.CreatedAt < to && !sr.IsDeleted && sr.Status >= 2)
            .CountAsync();

        result.Data.Add(new Dictionary<string, object>
        {
            ["ordered"] = ordered,
            ["performed"] = performed,
            ["notPerformed"] = ordered - performed,
            ["completionRate"] = ordered > 0 ? Math.Round((decimal)performed / ordered * 100, 1) : 0
        });
        result.Summary["totalOrdered"] = ordered;
        result.Summary["totalPerformed"] = performed;
    }



    private async Task FillProcedureRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgeryRequests.AsNoTracking()
            .Where(s => s.CreatedAt >= from && s.CreatedAt < to && !s.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(s => s.Examination != null && s.Examination.DepartmentId == deptId);

        var data = await query
            .Include(s => s.Patient)
            .Include(s => s.Examination).ThenInclude(e => e.Department)
            .OrderBy(s => s.CreatedAt)
            .Take(1000)
            .Select(s => new
            {
                s.CreatedAt,
                s.Patient.PatientCode,
                s.Patient.FullName,
                DeptName = s.Examination != null ? s.Examination.Department.DepartmentName : "",
                SurgeryName = s.PlannedProcedure,
                s.SurgeryType,
                s.Status
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.CreatedAt.ToString("dd/MM/yyyy"),
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.FullName ?? "",
                ["departmentName"] = d.DeptName ?? "",
                ["surgeryName"] = d.SurgeryName ?? "",
                ["surgeryType"] = d.SurgeryType ?? "",
                ["status"] = d.Status
            });
        }
        result.Summary["totalProcedures"] = data.Count;
    }

    private async Task FillSurgeryRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillProcedureRegister(result, from, to, deptId);
    }

    private async Task FillORCost(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgeryRequests.AsNoTracking()
            .Where(s => s.CreatedAt >= from && s.CreatedAt < to && !s.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(s => s.Examination != null && s.Examination.DepartmentId == deptId);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Chi phi phong mo",
            ["surgeryCount"] = count
        });
        result.Summary["totalSurgeries"] = count;
    }

    private async Task FillProcedureByDept(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.SurgeryRequests.AsNoTracking()
            .Where(s => s.CreatedAt >= from && s.CreatedAt < to && !s.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(s => s.Examination != null && s.Examination.DepartmentId == deptId);

        var data = await query
            .Include(s => s.Examination).ThenInclude(e => e.Department)
            .GroupBy(s => s.Examination != null ? s.Examination.Department.DepartmentName : "N/A")
            .Select(g => new
            {
                DeptName = g.Key,
                SurgeryCount = g.Count(),
                Emergency = g.Count(s => s.SurgeryType == "Cap cuu"),
                Elective = g.Count(s => s.SurgeryType != "Cap cuu")
            })
            .OrderByDescending(x => x.SurgeryCount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["surgeryCount"] = d.SurgeryCount,
                ["emergency"] = d.Emergency,
                ["elective"] = d.Elective
            });
        }
        result.Summary["totalSurgeries"] = data.Sum(d => d.SurgeryCount);
    }

    private async Task FillSurgeryPathologyBonus(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        await FillProcedureByDept(result, from, to, deptId);
        result.ReportName = "Thuong PTTT + GPB";
    }


}
