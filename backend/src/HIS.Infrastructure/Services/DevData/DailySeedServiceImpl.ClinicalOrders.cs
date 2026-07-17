using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services.DevData;

public partial class DailySeedServiceImpl
{
    // Split out of RunDailySeedAsync (task #364 wave-6): today's clinical-order
    // seed data — cashier Receipts, ServiceRequests (lab/radiology/surgery),
    // RadiologyRequests, SurgeryRequests, QueueTickets. Cut verbatim; the shared
    // `new*` counters were localized and are now returned as a tuple.
    private async Task<(int receipts, int svcRequests, int radRequests, int surgRequests, int queueTickets)> SeedClinicalOrdersAsync(
        DateTime today, DateTime now,
        List<Guid> docIdsAll, List<Guid> deptIdsAll,
        List<SeedTodayRecord> todayRecords, List<Guid> todayPatientIds)
    {
        int newReceipts = 0, newSvcRequests = 0, newRadRequests = 0, newSurgRequests = 0, newQueueTickets = 0;

        // ==== Receipts - today's cashier revenue + service/Rx payments ====
        var receiptCode = $"PT{today:yyyyMMdd}SEED";
        if (await _db.Receipts.CountAsync(r => r.ReceiptCode.StartsWith(receiptCode)) == 0
            && docIdsAll.Count > 0 && todayRecords.Count > 0)
        {
            var cashier = docIdsAll[0];
            var rxForReceipts = await _db.Prescriptions
                .Where(p => p.PrescriptionCode.StartsWith($"RX{today:yyyyMMdd}SEED"))
                .Select(p => new { p.MedicalRecordId, p.PatientAmount })
                .ToListAsync();
            var rxReceipts = new List<Receipt>();
            for (int i = 0; i < rxForReceipts.Count; i++)
            {
                var mr = todayRecords.FirstOrDefault(r => r.Id == rxForReceipts[i].MedicalRecordId);
                if (mr == null) continue;
                rxReceipts.Add(new Receipt
                {
                    Id = Guid.NewGuid(),
                    ReceiptCode = $"{receiptCode}RX{(i + 1):D3}",
                    ReceiptDate = today.AddHours(8 + i),
                    PatientId = mr.PatientId,
                    MedicalRecordId = mr.Id,
                    ReceiptType = 2,
                    PaymentMethod = 1 + (i % 3),
                    Amount = rxForReceipts[i].PatientAmount,
                    Discount = 0,
                    FinalAmount = rxForReceipts[i].PatientAmount,
                    Note = "Thanh toán đơn thuốc",
                    Status = 1,
                    CashierId = cashier,
                    CreatedAt = now, UpdatedAt = now
                });
                newReceipts++;
            }
            for (int i = 0; i < Math.Min(8, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                var amt = 200_000m + (i * 50_000m);
                rxReceipts.Add(new Receipt
                {
                    Id = Guid.NewGuid(),
                    ReceiptCode = $"{receiptCode}SVC{(i + 1):D3}",
                    ReceiptDate = today.AddHours(9 + i),
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    ReceiptType = 2,
                    PaymentMethod = 1,
                    Amount = amt,
                    Discount = 0,
                    FinalAmount = amt,
                    Note = "Thanh toán dịch vụ khám bệnh",
                    Status = 1,
                    CashierId = cashier,
                    CreatedAt = now, UpdatedAt = now
                });
                newReceipts++;
            }
            if (rxReceipts.Count > 0)
            {
                _db.Receipts.AddRange(rxReceipts);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE Receipts SET CreatedAt = {now}, UpdatedAt = {now} WHERE ReceiptCode LIKE {receiptCode + "%"}");
            }
        }

        // ==== ServiceRequests + Details - Lab/Radiology/Surgery orders tracked on dashboard ====
        var svcReqCode = $"SR{today:yyyyMMdd}SEED";
        if (await _db.ServiceRequests.CountAsync(sr => sr.RequestCode.StartsWith(svcReqCode)) == 0
            && docIdsAll.Count > 0 && todayRecords.Count > 0)
        {
            var labServices = await _db.Services.Where(s => s.IsActive && s.ServiceType == 2).Take(10).ToListAsync();
            var radServicesDb = await _db.Services.Where(s => s.IsActive && s.ServiceType == 3).Take(8).ToListAsync();
            var surgServicesDb = await _db.Services.Where(s => s.IsActive && s.ServiceType == 5).Take(3).ToListAsync();

            var toInsert = new List<ServiceRequest>();

            void AddSvc(char tag, int type, List<Service> services, int baseHour)
            {
                for (int i = 0; i < services.Count && i < todayRecords.Count; i++)
                {
                    var r = todayRecords[i];
                    var svc = services[i];
                    var deptId = r.DepartmentId ?? (deptIdsAll.Count > 0 ? deptIdsAll[0] : Guid.Empty);
                    if (deptId == Guid.Empty) continue;
                    var sr = new ServiceRequest
                    {
                        Id = Guid.NewGuid(),
                        RequestCode = $"{svcReqCode}{tag}{(i + 1):D3}",
                        RequestDate = today.AddHours(baseHour + (i % 6)),
                        MedicalRecordId = r.Id,
                        DoctorId = docIdsAll[i % docIdsAll.Count],
                        DepartmentId = deptId,
                        RequestType = type,
                        IsPriority = i % 5 == 0,
                        IsEmergency = false,
                        Diagnosis = r.InitialDiagnosis,
                        IcdCode = r.MainIcdCode,
                        ServiceId = svc.Id,
                        Quantity = 1,
                        UnitPrice = svc.UnitPrice,
                        TotalPrice = svc.UnitPrice,
                        TotalAmount = svc.UnitPrice,
                        PatientAmount = svc.UnitPrice,
                        InsuranceAmount = 0,
                        Status = i < 3 ? 0 : (i < 6 ? 2 : 3),
                        IsPaid = i >= 6,
                        CreatedAt = now, UpdatedAt = now
                    };
                    sr.Details.Add(new ServiceRequestDetail
                    {
                        Id = Guid.NewGuid(),
                        ServiceRequestId = sr.Id,
                        ServiceId = svc.Id,
                        Quantity = 1,
                        UnitPrice = svc.UnitPrice,
                        Amount = svc.UnitPrice,
                        PatientAmount = svc.UnitPrice,
                        InsuranceAmount = 0,
                        PatientType = 1,
                        Status = sr.Status,
                        CreatedAt = now, UpdatedAt = now
                    });
                    toInsert.Add(sr);
                    newSvcRequests++;
                }
            }
            AddSvc('L', 1, labServices, 8);
            AddSvc('R', 2, radServicesDb, 9);
            AddSvc('S', 4, surgServicesDb, 10);

            if (toInsert.Count > 0)
            {
                _db.ServiceRequests.AddRange(toInsert);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE ServiceRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE RequestCode LIKE {svcReqCode + "%"}");
            }
        }

        // ==== RadiologyRequests - Radiology page ====
        var radReqCode = $"RAD{today:yyyyMMdd}SEED";
        if (await _db.RadiologyRequests.CountAsync(r => r.RequestCode.StartsWith(radReqCode)) == 0
            && docIdsAll.Count > 0 && todayRecords.Count > 0)
        {
            var radSvcs = await _db.Services.Where(s => s.IsActive && s.ServiceType == 3).Take(8).ToListAsync();
            var bodyParts = new[] { "Ngực", "Bụng", "Đầu", "Chi trên", "Chi dưới", "Cột sống", "Khung chậu", "Tim" };
            var newRadList = new List<RadiologyRequest>();
            for (int i = 0; i < Math.Min(8, Math.Min(radSvcs.Count, todayRecords.Count)); i++)
            {
                var r = todayRecords[i];
                var svc = radSvcs[i];
                newRadList.Add(new RadiologyRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"{radReqCode}{(i + 1):D3}",
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    RequestDate = today.AddHours(8 + i),
                    ServiceId = svc.Id,
                    RequestingDoctorId = docIdsAll[i % docIdsAll.Count],
                    Priority = i % 5 == 0 ? 2 : 1,
                    Status = i < 3 ? 0 : (i < 5 ? 2 : 4),
                    ClinicalInfo = r.InitialDiagnosis ?? "Chỉ định theo chỉ định lâm sàng",
                    BodyPart = bodyParts[i % bodyParts.Length],
                    Contrast = i % 4 == 0,
                    PatientType = 1,
                    TotalAmount = svc.UnitPrice,
                    InsuranceAmount = 0,
                    PatientAmount = svc.UnitPrice,
                    IsPaid = i >= 5,
                    CreatedAt = now, UpdatedAt = now
                });
                newRadRequests++;
            }
            if (newRadList.Count > 0)
            {
                _db.RadiologyRequests.AddRange(newRadList);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE RadiologyRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE RequestCode LIKE {radReqCode + "%"}");
            }
        }

        // ==== SurgeryRequests - Surgery page ====
        var surgReqCode = $"SURG{today:yyyyMMdd}SEED";
        if (await _db.SurgeryRequests.CountAsync(s => s.RequestCode.StartsWith(surgReqCode)) == 0
            && docIdsAll.Count > 0 && todayRecords.Count > 0)
        {
            var surgTypes = new[] { "Phẫu thuật nhỏ", "Phẫu thuật trung bình", "Phẫu thuật lớn" };
            var procedures = new[] { "Cắt ruột thừa", "Mổ thoát vị bẹn", "Thay khớp háng" };
            var newSurgList = new List<SurgeryRequest>();
            for (int i = 0; i < Math.Min(3, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                newSurgList.Add(new SurgeryRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"{surgReqCode}{(i + 1):D3}",
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    RequestDate = today.AddHours(7 + i),
                    SurgeryType = surgTypes[i % surgTypes.Length],
                    RequestingDoctorId = docIdsAll[i % docIdsAll.Count],
                    Priority = i == 0 ? 3 : 1,
                    Status = i == 0 ? 1 : 0,
                    PreOpDiagnosis = r.InitialDiagnosis,
                    PreOpIcdCode = r.MainIcdCode,
                    PlannedProcedure = procedures[i % procedures.Length],
                    EstimatedDuration = 60 + (i * 30),
                    AnesthesiaType = i == 2 ? 1 : 2,
                    Notes = "Bệnh nhân ổn định, chuẩn bị phẫu thuật",
                    CreatedAt = now, UpdatedAt = now
                });
                newSurgRequests++;
            }
            if (newSurgList.Count > 0)
            {
                _db.SurgeryRequests.AddRange(newSurgList);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE SurgeryRequests SET CreatedAt = {now}, UpdatedAt = {now} WHERE RequestCode LIKE {surgReqCode + "%"}");
            }
        }

        // ==== QueueTickets - reception counters + emergency ====
        if (await _db.QueueTickets.CountAsync(q => q.IssueDate >= today && q.IssueDate < today.AddDays(1)) < 5
            && todayRecords.Count > 0)
        {
            var newQ = new List<QueueTicket>();
            for (int i = 0; i < Math.Min(40, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                newQ.Add(new QueueTicket
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = $"R{(i + 1):D4}",
                    QueueNumber = i + 1,
                    IssueDate = today.AddMinutes(i * 5),
                    QueueType = 1,
                    Priority = 0,
                    Status = i < 30 ? 3 : 0,
                    PatientId = r.PatientId,
                    MedicalRecordId = r.Id,
                    CreatedAt = now, UpdatedAt = now
                });
                newQueueTickets++;
            }
            for (int i = 0; i < Math.Min(5, todayPatientIds.Count); i++)
            {
                newQ.Add(new QueueTicket
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = $"CC{(i + 1):D3}",
                    QueueNumber = 900 + i,
                    IssueDate = today.AddHours(6 + i),
                    QueueType = 3,
                    Priority = 2,
                    Status = 2,
                    PatientId = todayPatientIds[i],
                    CreatedAt = now, UpdatedAt = now
                });
                newQueueTickets++;
            }
            if (newQ.Count > 0)
            {
                _db.QueueTickets.AddRange(newQ);
                await _db.SaveChangesAsync();
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE QueueTickets SET CreatedAt = {now}, UpdatedAt = {now} WHERE IssueDate >= {today} AND IssueDate < {today.AddDays(1)}");
            }
        }

        return (newReceipts, newSvcRequests, newRadRequests, newSurgRequests, newQueueTickets);
    }
}
