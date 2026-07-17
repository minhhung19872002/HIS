using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services.DevData;

public partial class DailySeedServiceImpl
{
    // Split out of RunDailySeedAsync (task #364 wave-6): module-workflow daily seed
    // data — Quality (IncidentReport), Emergency (ObservationStay), RehabReferral,
    // Signing (SigningRequest), Survey (SatisfactionSurveyResult),
    // ProcurementRequest, MedicalRecordArchive. Cut verbatim; the shared `new*`
    // counters were localized and are now returned as a tuple.
    private async Task<(int incidents, int rehab, int signing, int survey, int proc, int archive, int observation)> SeedModuleWorkflowAsync(
        DateTime today, DateTime now,
        List<Guid> docIdsAll, List<Guid> deptIdsAll,
        List<Guid> todayPatientIds, List<SeedTodayRecord> todayRecords)
    {
        int newIncidents = 0, newRehab = 0, newSigning = 0, newSurvey = 0, newProc = 0, newArchive = 0, newObservation = 0;

        // IncidentReport - Quality page
        if (await _db.IncidentReports.CountAsync(i => i.ReportCode.StartsWith($"INC{today:yyyyMMdd}SEED")) == 0
            && docIdsAll.Count > 0 && deptIdsAll.Count > 0)
        {
            var incTypes = new[] { "Medication", "Fall", "Infection", "Equipment", "Process" };
            var severity = new[] { "Minor", "Moderate", "Minor", "Near-miss", "Minor" };
            for (int i = 0; i < 5; i++)
            {
                _db.IncidentReports.Add(new IncidentReport
                {
                    Id = Guid.NewGuid(),
                    ReportCode = $"INC{today:yyyyMMdd}SEED{(i + 1):D3}",
                    IncidentDate = today.AddHours(-i),
                    ReportDate = today,
                    ReportedById = docIdsAll[i % docIdsAll.Count],
                    DepartmentId = deptIdsAll[i % deptIdsAll.Count],
                    PatientId = todayPatientIds.Count > 0 ? todayPatientIds[i % todayPatientIds.Count] : (Guid?)null,
                    IncidentType = incTypes[i % incTypes.Length],
                    Severity = severity[i % severity.Length],
                    HarmLevel = "None",
                    Description = $"Báo cáo sự cố thử nghiệm #{i + 1}: {incTypes[i % incTypes.Length]}",
                    ImmediateActions = "Đã xử lý theo quy trình",
                    Status = i < 2 ? "Reported" : "UnderInvestigation",
                    CreatedAt = now, UpdatedAt = now
                });
                newIncidents++;
            }
        }

        // ObservationStay - màn Cấp cứu / phòng lưu (F3: demo trước đây luôn rỗng khi không có MCI)
        if (await _db.ObservationStays.CountAsync(o => o.StayCode.StartsWith($"OBS{today:yyyyMMdd}SEED")) == 0
            && todayPatientIds.Count >= 4 && docIdsAll.Count > 0)
        {
            var complaints = new[] { "Đau ngực trái", "Khó thở", "Sốt cao co giật", "Đau bụng cấp", "Chấn thương đầu nhẹ" };
            var obsDiag = new[] { "TD hội chứng vành cấp", "TD hen phế quản", "Sốt cao chưa rõ nguyên nhân", "TD viêm ruột thừa", "TD chấn động não" };
            for (int i = 0; i < 4; i++)
            {
                var discharged = i == 3; // 3 đang lưu + 1 đã cho về trong ngày
                _db.ObservationStays.Add(new ObservationStay
                {
                    Id = Guid.NewGuid(),
                    StayCode = $"OBS{today:yyyyMMdd}SEED{(i + 1):D3}",
                    PatientId = todayPatientIds[i % todayPatientIds.Count],
                    DepartmentId = deptIdsAll.Count > 0 ? deptIdsAll[i % deptIdsAll.Count] : (Guid?)null,
                    DoctorId = docIdsAll[i % docIdsAll.Count],
                    AdmittedAt = now.AddHours(-(i + 2)),
                    DischargedAt = discharged ? now.AddMinutes(-30) : (DateTime?)null,
                    ChiefComplaint = complaints[i % complaints.Length],
                    InitialDiagnosis = obsDiag[i % obsDiag.Length],
                    FinalDiagnosis = discharged ? "Ổn định, loại trừ nguyên nhân cấp" : null,
                    DischargeReason = discharged ? "Theo dõi đủ giờ, sinh hiệu ổn" : null,
                    TriageLevel = 2 + (i % 3), // 2-4
                    EwsScore = i % 3,
                    Status = discharged ? 2 : 1,
                    CreatedAt = now, UpdatedAt = now
                });
                newObservation++;
            }
        }

        // RehabReferral
        if (await _db.RehabReferrals.CountAsync(r => r.ReferralCode.StartsWith($"REH{today:yyyyMMdd}SEED")) == 0
            && docIdsAll.Count > 0 && todayPatientIds.Count > 0)
        {
            var rehabTypes = new[] { "PT", "OT", "ST" };
            var rehabDiag = new[] { "Thoái hoá cột sống", "Đột quỵ", "Thoát vị đĩa đệm", "Liệt nửa người", "Viêm khớp" };
            for (int i = 0; i < 5; i++)
            {
                _db.RehabReferrals.Add(new RehabReferral
                {
                    Id = Guid.NewGuid(),
                    ReferralCode = $"REH{today:yyyyMMdd}SEED{(i + 1):D3}",
                    PatientId = todayPatientIds[i % todayPatientIds.Count],
                    ReferredById = docIdsAll[i % docIdsAll.Count],
                    RehabType = rehabTypes[i % rehabTypes.Length],
                    Diagnosis = rehabDiag[i % rehabDiag.Length],
                    IcdCode = "M54",
                    Reason = "Chỉ định phục hồi chức năng sau điều trị cấp",
                    Goals = "Phục hồi vận động, giảm đau",
                    Status = i < 2 ? "Pending" : "Accepted",
                    CreatedAt = now, UpdatedAt = now
                });
                newRehab++;
            }
        }

        // SigningRequest - Signing Workflow page
        if (await _db.SigningRequests.CountAsync(s => s.DocumentTitle.Contains($"SEED-{today:yyyyMMdd}")) == 0
            && docIdsAll.Count >= 2)
        {
            var docTypes = new[] { "TreatmentSheet", "NursingCare", "Prescription", "LabResult", "DischargeNote" };
            for (int i = 0; i < 6; i++)
            {
                _db.SigningRequests.Add(new SigningRequest
                {
                    Id = Guid.NewGuid(),
                    DocumentType = docTypes[i % docTypes.Length],
                    DocumentId = Guid.NewGuid(),
                    DocumentTitle = $"{docTypes[i % docTypes.Length]} SEED-{today:yyyyMMdd}-{(i + 1):D3}",
                    DocumentContent = $"<p>Nội dung tài liệu cần ký số {i + 1}</p>",
                    SubmittedById = docIdsAll[i % docIdsAll.Count],
                    SubmittedByName = "Bác sĩ điều trị",
                    AssignedToId = docIdsAll[(i + 1) % docIdsAll.Count],
                    AssignedToName = "Trưởng khoa",
                    Status = i < 4 ? 0 : 1,
                    SignedAt = i >= 4 ? now : (DateTime?)null,
                    PatientId = todayPatientIds.Count > 0 ? todayPatientIds[i % todayPatientIds.Count] : (Guid?)null,
                    PatientName = "BN thử nghiệm",
                    DepartmentName = "Nội tổng quát",
                    CreatedAt = now, UpdatedAt = now
                });
                newSigning++;
            }
        }

        // SatisfactionSurveyResult - page reads this
        if (await _db.SatisfactionSurveyResults.CountAsync() == 0 && todayPatientIds.Count > 0)
        {
            var feedback = new[]
            {
                "Bác sĩ tận tình, nhân viên thân thiện",
                "Thời gian chờ hơi lâu nhưng chất lượng tốt",
                "Phòng khám sạch sẽ, trang thiết bị hiện đại",
                "Rất hài lòng với dịch vụ",
                "Nhân viên hướng dẫn chu đáo",
                "Giá cả hợp lý, minh bạch",
                "Cần cải thiện nhà vệ sinh",
                "Chất lượng điều trị tốt"
            };
            for (int i = 0; i < 10; i++)
            {
                _db.SatisfactionSurveyResults.Add(new SatisfactionSurveyResult
                {
                    Id = Guid.NewGuid(),
                    TemplateName = i % 3 == 0 ? "Khảo sát ngoại trú" : (i % 3 == 1 ? "Khảo sát nội trú" : "Khảo sát cấp cứu"),
                    PatientId = todayPatientIds[i % todayPatientIds.Count],
                    PatientName = $"Bệnh nhân {(i + 1):D3}",
                    PatientCode = $"BN{today:yyyyMMdd}SEED{((i % todayPatientIds.Count) + 1):D3}",
                    DepartmentId = deptIdsAll.Count > 0 ? deptIdsAll[i % deptIdsAll.Count] : null,
                    DepartmentName = "Nội tổng quát",
                    OverallScore = 4.0 + (i % 2) * 0.5,
                    Answers = "{\"q1\":5,\"q2\":4,\"q3\":4,\"q4\":5}",
                    Comment = feedback[i % feedback.Length],
                    CreatedAt = now, UpdatedAt = now
                });
                newSurvey++;
            }
        }

        // ProcurementRequest
        if (await _db.ProcurementRequests.CountAsync(p => p.RequestCode.StartsWith($"PR{today:yyyyMMdd}SEED")) == 0
            && deptIdsAll.Count > 0 && docIdsAll.Count > 0)
        {
            for (int i = 0; i < 4; i++)
            {
                _db.ProcurementRequests.Add(new ProcurementRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = $"PR{today:yyyyMMdd}SEED{(i + 1):D3}",
                    RequestDate = today,
                    DepartmentId = deptIdsAll[i % deptIdsAll.Count],
                    RequestedById = docIdsAll[i % docIdsAll.Count],
                    Status = i % 4,
                    TotalAmount = 5_000_000m * (i + 1),
                    Notes = "Đề xuất mua sắm vật tư/thuốc",
                    CreatedAt = now, UpdatedAt = now
                });
                newProc++;
            }
        }

        // MedicalRecordArchive
        if (await _db.MedicalRecordArchives.CountAsync(a => a.ArchiveCode.StartsWith($"ARC{today:yyyyMMdd}SEED")) == 0
            && todayRecords.Count > 0)
        {
            for (int i = 0; i < Math.Min(8, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                _db.MedicalRecordArchives.Add(new MedicalRecordArchive
                {
                    Id = Guid.NewGuid(),
                    ArchiveCode = $"ARC{today:yyyyMMdd}SEED{(i + 1):D3}",
                    MedicalRecordId = r.Id,
                    PatientId = r.PatientId,
                    DepartmentId = r.DepartmentId,
                    Diagnosis = r.InitialDiagnosis,
                    TreatmentResult = "Khỏi",
                    AdmissionDate = today,
                    DischargeDate = today,
                    StorageLocation = "Kho A",
                    ShelfNumber = $"Kệ {(i / 3) + 1}",
                    BoxNumber = $"Hộp {i + 1}",
                    Status = 1,
                    ArchivedDate = today,
                    ArchiveYear = today.Year,
                    CreatedAt = now, UpdatedAt = now
                });
                newArchive++;
            }
        }

        return (newIncidents, newRehab, newSigning, newSurvey, newProc, newArchive, newObservation);
    }
}
