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

    private async Task FillOpdIpdCostByFee(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Receipts.AsNoTracking()
            .Where(r => r.CreatedAt >= from && r.CreatedAt < to && !r.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == deptId);

        var data = await query
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Department)
            .GroupBy(r => new { r.MedicalRecord.DepartmentId, DeptName = r.MedicalRecord.Department.DepartmentName })
            .Select(g => new
            {
                g.Key.DeptName,
                OutpatientRevenue = g.Where(r => r.MedicalRecord.PatientType <= 2).Sum(r => r.FinalAmount),
                InpatientRevenue = g.Where(r => r.MedicalRecord.PatientType > 2).Sum(r => r.FinalAmount),
                TransactionCount = g.Count()
            }).ToListAsync();

        decimal totalOp = 0, totalIp = 0;
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["outpatientRevenue"] = d.OutpatientRevenue,
                ["inpatientRevenue"] = d.InpatientRevenue,
                ["totalRevenue"] = d.OutpatientRevenue + d.InpatientRevenue,
                ["transactionCount"] = d.TransactionCount
            });
            totalOp += d.OutpatientRevenue;
            totalIp += d.InpatientRevenue;
        }
        result.Summary["totalOutpatientRevenue"] = totalOp;
        result.Summary["totalInpatientRevenue"] = totalIp;
        result.Summary["grandTotal"] = totalOp + totalIp;
    }

    private async Task FillExaminationActivity(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var data = await query
            .Include(e => e.Department)
            .GroupBy(e => new { e.CreatedAt.Date, e.DepartmentId, DeptName = e.Department.DepartmentName })
            .Select(g => new
            {
                Date = g.Key.Date,
                g.Key.DeptName,
                TotalExams = g.Count(),
                Completed = g.Count(e => e.Status >= 3),
                Pending = g.Count(e => e.Status < 3),
                BhytCount = g.Count(e => e.MedicalRecord.PatientType == 1),
                FeeCount = g.Count(e => e.MedicalRecord.PatientType != 1)
            })
            .OrderBy(x => x.Date).ThenBy(x => x.DeptName)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.Date.ToString("dd/MM/yyyy"),
                ["departmentName"] = d.DeptName ?? "",
                ["totalExaminations"] = d.TotalExams,
                ["completed"] = d.Completed,
                ["pending"] = d.Pending,
                ["bhytCount"] = d.BhytCount,
                ["feePayingCount"] = d.FeeCount
            });
        }
        result.Summary["totalExaminations"] = data.Sum(d => d.TotalExams);
        result.Summary["totalCompleted"] = data.Sum(d => d.Completed);
    }

    private async Task FillDailyPatientCount(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var data = await query
            .GroupBy(e => e.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.Date.ToString("dd/MM/yyyy"),
                ["patientCount"] = d.Count
            });
        }
        result.Summary["totalDays"] = data.Count;
        result.Summary["totalPatients"] = data.Sum(d => d.Count);
        result.Summary["averagePerDay"] = data.Count > 0 ? Math.Round((decimal)data.Sum(d => d.Count) / data.Count, 1) : 0;
    }

    private async Task FillExaminationRegister(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(e => e.DepartmentId == deptId);

        var data = await query
            .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(e => e.Department)
            .Include(e => e.Doctor)
            .OrderBy(e => e.CreatedAt)
            .Take(2000)
            .Select(e => new
            {
                e.CreatedAt,
                PatientCode = e.MedicalRecord.Patient.PatientCode,
                PatientName = e.MedicalRecord.Patient.FullName,
                DeptName = e.Department.DepartmentName,
                DoctorName = e.Doctor.FullName,
                e.MainIcdCode,
                MainIcdName = e.MainIcdCode, // MainIcdName not in entity, use code as fallback
                e.Status
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["date"] = d.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.PatientName ?? "",
                ["departmentName"] = d.DeptName ?? "",
                ["doctorName"] = d.DoctorName ?? "",
                ["icdCode"] = d.MainIcdCode ?? "",
                ["diagnosis"] = d.MainIcdName ?? "",
                ["status"] = d.Status
            });
        }
        result.Summary["totalRecords"] = data.Count;
    }

    private async Task FillServiceTimeAndWait(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.QueueTickets.AsNoTracking()
            .Where(q => q.CreatedAt >= from && q.CreatedAt < to && !q.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(q => q.Room != null && q.Room.DepartmentId == deptId);

        var data = await query
            .Include(q => q.Room).ThenInclude(r => r.Department)
            .Where(q => q.CalledTime.HasValue && q.CompletedTime.HasValue)
            .GroupBy(q => new { q.Room.DepartmentId, DeptName = q.Room.Department.DepartmentName })
            .Select(g => new
            {
                g.Key.DeptName,
                TicketCount = g.Count(),
                AvgWaitMinutes = g.Average(q => EF.Functions.DateDiffMinute(q.CreatedAt, q.CalledTime!.Value)),
                AvgServiceMinutes = g.Average(q => EF.Functions.DateDiffMinute(q.CalledTime!.Value, q.CompletedTime!.Value)),
                MaxWaitMinutes = g.Max(q => EF.Functions.DateDiffMinute(q.CreatedAt, q.CalledTime!.Value))
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["ticketCount"] = d.TicketCount,
                ["avgWaitMinutes"] = Math.Round(d.AvgWaitMinutes, 1),
                ["avgServiceMinutes"] = Math.Round(d.AvgServiceMinutes, 1),
                ["maxWaitMinutes"] = d.MaxWaitMinutes
            });
        }
        result.Summary["totalTickets"] = data.Sum(d => d.TicketCount);
    }

    private async Task FillServiceRevenueDetail(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.ReceiptDetails.AsNoTracking()
            .Where(rd => rd.Receipt.CreatedAt >= from && rd.Receipt.CreatedAt < to && !rd.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(rd => rd.Receipt.MedicalRecord != null && rd.Receipt.MedicalRecord.DepartmentId == deptId);

        var data = await query
            .GroupBy(rd => new { rd.ItemCode, rd.ItemName, rd.ItemType })
            .Select(g => new
            {
                ItemCode = g.Key.ItemCode ?? "",
                ItemName = g.Key.ItemName ?? "",
                ItemType = g.Key.ItemType,
                Quantity = g.Sum(rd => rd.Quantity),
                TotalAmount = g.Sum(rd => rd.FinalAmount),
                DiscountAmount = g.Sum(rd => rd.Discount)
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToListAsync();

        var typeNames = new Dictionary<int, string> { { 1, "Dich vu" }, { 2, "Thuoc" }, { 3, "Vat tu" } };
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["itemCode"] = d.ItemCode,
                ["itemName"] = d.ItemName,
                ["itemType"] = typeNames.TryGetValue(d.ItemType, out var t) ? t : $"Loai {d.ItemType}",
                ["quantity"] = d.Quantity,
                ["totalAmount"] = d.TotalAmount,
                ["discountAmount"] = d.DiscountAmount
            });
        }
        result.Summary["totalRevenue"] = data.Sum(d => d.TotalAmount);
        result.Summary["totalDiscount"] = data.Sum(d => d.DiscountAmount);
    }

    private async Task FillReceptionByRoom(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.QueueTickets.AsNoTracking()
            .Where(q => q.CreatedAt >= from && q.CreatedAt < to && !q.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(q => q.Room != null && q.Room.DepartmentId == deptId);

        var data = await query
            .Include(q => q.Room)
            .GroupBy(q => new { q.RoomId, RoomName = q.Room.RoomName })
            .Select(g => new
            {
                g.Key.RoomName,
                TotalTickets = g.Count(),
                CompletedTickets = g.Count(q => q.Status >= 3),
                CancelledTickets = g.Count(q => q.Status == 4)
            })
            .OrderByDescending(x => x.TotalTickets)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["roomName"] = d.RoomName ?? "",
                ["totalTickets"] = d.TotalTickets,
                ["completedTickets"] = d.CompletedTickets,
                ["cancelledTickets"] = d.CancelledTickets,
                ["completionRate"] = d.TotalTickets > 0 ? Math.Round((decimal)d.CompletedTickets / d.TotalTickets * 100, 1) : 0
            });
        }
        result.Summary["totalRooms"] = data.Count;
        result.Summary["totalTickets"] = data.Sum(d => d.TotalTickets);
    }

    private async Task FillVisitAndAdmissionCount(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var examQuery = _context.Examinations.AsNoTracking()
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to && !e.IsDeleted);
        var admQuery = _context.Admissions.AsNoTracking()
            .Where(a => a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted);
        if (deptId.HasValue)
        {
            examQuery = examQuery.Where(e => e.DepartmentId == deptId);
            admQuery = admQuery.Where(a => a.DepartmentId == deptId);
        }

        var examCount = await examQuery.CountAsync();
        var admCount = await admQuery.CountAsync();

        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Ngoai tru",
            ["count"] = examCount
        });
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Nhap vien",
            ["count"] = admCount
        });
        result.Summary["totalVisits"] = examCount;
        result.Summary["totalAdmissions"] = admCount;
        result.Summary["grandTotal"] = examCount + admCount;
    }

    private async Task FillExaminationDiary(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        // Same as ExaminationRegister but includes more detail
        await FillExaminationRegister(result, from, to, deptId);
    }



    private async Task FillBedCapacity(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Beds.AsNoTracking()
            .Include(b => b.Room).ThenInclude(r => r.Department)
            .Where(b => !b.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(b => b.Room.DepartmentId == deptId);

        var beds = await query.ToListAsync();
        var grouped = beds.GroupBy(b => new { b.Room?.DepartmentId, DeptName = b.Room?.Department?.DepartmentName });

        foreach (var g in grouped)
        {
            var total = g.Count();
            var occupied = g.Count(b => b.Status == 1); // 1 = Occupied
            var available = total - occupied;

            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = g.Key.DeptName ?? "",
                ["totalBeds"] = total,
                ["occupiedBeds"] = occupied,
                ["availableBeds"] = available,
                ["occupancyRate"] = total > 0 ? Math.Round((decimal)occupied / total * 100, 1) : 0
            });
        }
        result.Summary["totalBeds"] = beds.Count;
        result.Summary["totalOccupied"] = beds.Count(b => b.Status == 1);
        result.Summary["totalAvailable"] = beds.Count - beds.Count(b => b.Status == 1);
    }

    private async Task FillCareLevelClassification(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Admissions.AsNoTracking()
            .Where(a => a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted && a.Status == 0);
        if (deptId.HasValue)
            query = query.Where(a => a.DepartmentId == deptId);

        var data = await query
            .Include(a => a.Department)
            .GroupBy(a => new { a.DepartmentId, DeptName = a.Department!.DepartmentName, a.AdmissionType })
            .Select(g => new { g.Key.DeptName, AdmissionType = g.Key.AdmissionType, Count = g.Count() })
            .ToListAsync();

        var typeNames = new Dictionary<int, string> { { 1, "Cap cuu" }, { 2, "Chuyen tuyen" }, { 3, "Dieu tri" }, { 4, "Khac" } };
        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["admissionType"] = d.AdmissionType,
                ["admissionTypeName"] = typeNames.TryGetValue(d.AdmissionType, out var n) ? n : "Khac",
                ["patientCount"] = d.Count
            });
        }
        result.Summary["totalPatients"] = data.Sum(d => d.Count);
    }

    private async Task FillActiveInpatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Admissions.AsNoTracking()
            .Where(a => !a.IsDeleted && a.Status == 0); // Active
        if (deptId.HasValue)
            query = query.Where(a => a.DepartmentId == deptId);

        var data = await query
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .OrderBy(a => a.Department.DepartmentName).ThenBy(a => a.AdmissionDate)
            .Take(1000)
            .Select(a => new
            {
                a.Patient.PatientCode,
                a.Patient.FullName,
                a.Patient.Gender,
                a.Patient.DateOfBirth,
                DeptName = a.Department.DepartmentName,
                a.AdmissionDate,
                a.DiagnosisOnAdmission,
                DaysStayed = EF.Functions.DateDiffDay(a.AdmissionDate, DateTime.Now)
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.FullName ?? "",
                ["gender"] = d.Gender == 1 ? "Nam" : d.Gender == 2 ? "Nu" : "Khac",
                ["dateOfBirth"] = d.DateOfBirth?.ToString("dd/MM/yyyy") ?? "",
                ["departmentName"] = d.DeptName ?? "",
                ["admissionDate"] = d.AdmissionDate.ToString("dd/MM/yyyy"),
                ["diagnosis"] = d.DiagnosisOnAdmission ?? "",
                ["daysStayed"] = (object?)d.DaysStayed ?? 0
            });
        }
        result.Summary["totalActivePatients"] = data.Count;
    }

    private async Task FillDischargeByDept(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Discharges.AsNoTracking()
            .Where(d => d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(d => d.Admission.DepartmentId == deptId);

        var data = await query
            .Include(d => d.Admission).ThenInclude(a => a.Department)
            .GroupBy(d => new { d.Admission.DepartmentId, DeptName = d.Admission.Department.DepartmentName })
            .Select(g => new
            {
                g.Key.DeptName,
                TotalDischarges = g.Count(),
                Recovered = g.Count(d => d.DischargeCondition == 1),
                Improved = g.Count(d => d.DischargeCondition == 2),
                Unchanged = g.Count(d => d.DischargeCondition == 3),
                Worse = g.Count(d => d.DischargeCondition == 4),
                Died = g.Count(d => d.DischargeCondition == 5)
            })
            .OrderByDescending(x => x.TotalDischarges)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = d.DeptName ?? "",
                ["totalDischarges"] = d.TotalDischarges,
                ["recovered"] = d.Recovered,
                ["improved"] = d.Improved,
                ["unchanged"] = d.Unchanged,
                ["worse"] = d.Worse,
                ["died"] = d.Died
            });
        }
        result.Summary["totalDischarges"] = data.Sum(d => d.TotalDischarges);
        result.Summary["totalDeaths"] = data.Sum(d => d.Died);
    }

    private async Task FillPatientsByRoom(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.BedAssignments.AsNoTracking()
            .Where(ba => ba.CreatedAt >= from && ba.CreatedAt < to && !ba.IsDeleted && ba.Status == 0);
        if (deptId.HasValue)
            query = query.Where(ba => ba.Bed.Room.DepartmentId == deptId);

        var data = await query
            .Include(ba => ba.Bed).ThenInclude(b => b.Room)
            .Include(ba => ba.Admission).ThenInclude(a => a.Patient)
            .GroupBy(ba => new { ba.Bed.RoomId, RoomName = ba.Bed.Room.RoomName })
            .Select(g => new
            {
                g.Key.RoomName,
                PatientCount = g.Count()
            })
            .OrderByDescending(x => x.PatientCount)
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["roomName"] = d.RoomName ?? "",
                ["patientCount"] = d.PatientCount
            });
        }
        result.Summary["totalRooms"] = data.Count;
        result.Summary["totalPatients"] = data.Sum(d => d.PatientCount);
    }

    private async Task FillAdmitTransferDischarge(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var admQuery = _context.Admissions.AsNoTracking()
            .Where(a => a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted);
        var disQuery = _context.Discharges.AsNoTracking()
            .Where(d => d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted);
        if (deptId.HasValue)
        {
            admQuery = admQuery.Where(a => a.DepartmentId == deptId);
            disQuery = disQuery.Where(d => d.Admission.DepartmentId == deptId);
        }

        var admissions = await admQuery
            .Include(a => a.Department)
            .GroupBy(a => new { a.DepartmentId, DeptName = a.Department.DepartmentName })
            .Select(g => new { g.Key.DeptName, g.Key.DepartmentId, AdmCount = g.Count(), TransferIn = g.Count(a => a.AdmissionType == 2) })
            .ToListAsync();

        var discharges = await disQuery
            .Include(d => d.Admission).ThenInclude(a => a.Department)
            .GroupBy(d => new { d.Admission.DepartmentId, DeptName = d.Admission.Department.DepartmentName })
            .Select(g => new { g.Key.DeptName, g.Key.DepartmentId, DisCount = g.Count(), TransferOut = g.Count(d => d.DischargeType == 2) })
            .ToListAsync();

        var deptIds = admissions.Select(a => a.DepartmentId).Union(discharges.Select(d => d.DepartmentId)).Distinct();
        foreach (var id in deptIds)
        {
            var adm = admissions.FirstOrDefault(a => a.DepartmentId == id);
            var dis = discharges.FirstOrDefault(d => d.DepartmentId == id);
            result.Data.Add(new Dictionary<string, object>
            {
                ["departmentName"] = adm?.DeptName ?? dis?.DeptName ?? "",
                ["admissions"] = adm?.AdmCount ?? 0,
                ["transferIn"] = adm?.TransferIn ?? 0,
                ["discharges"] = dis?.DisCount ?? 0,
                ["transferOut"] = dis?.TransferOut ?? 0
            });
        }
        result.Summary["totalAdmissions"] = admissions.Sum(a => a.AdmCount);
        result.Summary["totalDischarges"] = discharges.Sum(d => d.DisCount);
    }

    private async Task FillAdmissionByDept(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Admissions.AsNoTracking()
            .Where(a => a.AdmissionDate >= from && a.AdmissionDate < to && !a.IsDeleted);
        if (deptId.HasValue)
            query = query.Where(a => a.DepartmentId == deptId);

        var data = await query
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .OrderBy(a => a.AdmissionDate)
            .Take(2000)
            .Select(a => new
            {
                a.AdmissionDate,
                a.Patient.PatientCode,
                a.Patient.FullName,
                a.Patient.Gender,
                DeptName = a.Department.DepartmentName,
                a.DiagnosisOnAdmission,
                a.AdmissionType
            })
            .ToListAsync();

        foreach (var d in data)
        {
            result.Data.Add(new Dictionary<string, object>
            {
                ["admissionDate"] = d.AdmissionDate.ToString("dd/MM/yyyy"),
                ["patientCode"] = d.PatientCode ?? "",
                ["patientName"] = d.FullName ?? "",
                ["gender"] = d.Gender == 1 ? "Nam" : d.Gender == 2 ? "Nu" : "Khac",
                ["departmentName"] = d.DeptName ?? "",
                ["diagnosis"] = d.DiagnosisOnAdmission ?? "",
                ["admissionType"] = d.AdmissionType
            });
        }
        result.Summary["totalAdmissions"] = data.Count;
    }

    private async Task FillTransferOutPatients(HospitalReportResult result, DateTime from, DateTime to, Guid? deptId)
    {
        var query = _context.Discharges.AsNoTracking()
            .Where(d => d.DischargeDate >= from && d.DischargeDate < to && !d.IsDeleted && d.DischargeType == 2);
        if (deptId.HasValue)
            query = query.Where(d => d.Admission.DepartmentId == deptId);

        var count = await query.CountAsync();
        result.Data.Add(new Dictionary<string, object>
        {
            ["type"] = "Chuyen tuyen",
            ["count"] = count
        });
        result.Summary["totalTransferOut"] = count;
    }


}
