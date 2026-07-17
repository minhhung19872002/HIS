using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // Split out of PopulateFinishingAsync (task #364 wave-6): SigningTransactions,
    // SigningRequests, RadiologyConsultationSessions (+Cases/Participants),
    // IncidentReports, TeleAppointments/MCIEvents top-up, MedicalRecordArchives,
    // and the final Shift-to-today raw-SQL block. Cut verbatim; each block already
    // owns its own try/catch so no behavior change — only moved into its own
    // method taking the same shared ctx/summary/errors/rng references.
    private async Task SeedFinishingOpsAsync(Ctx ctx, Dictionary<string, int> summary, Dictionary<string, string> errors, Random rng)
    {
        // SigningTransactions — /signing-workflow, audit log of signing operations
        try {
        if (!await _db.SigningTransactions.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var actions = new[] { "SignPdf", "SignPdfVisible", "SignPdf", "SignHash", "SignXml", "VerifyPdf" };
            var caProviders = new[] { "VNPT-CA", "FPT-CA", "Viettel-CA", "BKAV-CA" };
            var list = new List<SigningTransaction>();
            for (int i = 0; i < 40; i++)
            {
                bool success = i % 8 != 7;
                var when = ctx.Now.AddDays(-rng.Next(0, 30)).AddHours(-rng.Next(0, 23)).AddMinutes(-rng.Next(0, 59));
                list.Add(new SigningTransaction
                {
                    Id = Guid.NewGuid(),
                    UserId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    Action = actions[i % actions.Length],
                    DataType = actions[i % actions.Length].Contains("Pdf") ? "pdf" : actions[i % actions.Length].Contains("Xml") ? "xml" : "hash",
                    Success = success,
                    ErrorMessage = success ? null : "USB Token PIN required or cert expired",
                    CertificateSerial = $"{rng.Next(10000000, 99999999):X8}",
                    CaProvider = caProviders[i % caProviders.Length],
                    HashAlgorithm = "SHA-256",
                    DataSizeBytes = rng.Next(2048, 2048 * 1024),
                    DurationMs = rng.Next(200, 3500),
                    IpAddress = $"10.10.{rng.Next(1, 20)}.{rng.Next(10, 250)}",
                    Timestamp = when,
                    CreatedAt = when, UpdatedAt = when
                });
            }
            _db.SigningTransactions.AddRange(list);
            await _db.SaveChangesAsync();
            summary["SigningTransactions"] = list.Count;
        }
        } catch (Exception ex) { errors["SigningTransactions"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // SigningRequests — /signing-workflow pending/submitted/history
        // One of these must be assigned to the admin user so pending tab renders.
        try {
        if (!await _db.SigningRequests.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            // Find the admin user (or first user) to use as AssignedTo / SubmittedBy
            var adminUser = await _db.Users.FirstOrDefaultAsync(u => u.Username == "admin");
            var adminId = adminUser?.Id ?? ctx.DoctorIds[0];
            var adminName = adminUser?.FullName ?? "Administrator";
            var users = await _db.Users.Where(u => u.IsActive)
                .Select(u => new { u.Id, u.FullName }).Take(10).ToListAsync();

            var docTypes = new (string Type, string Title)[] {
                ("Prescription", "Đơn thuốc ngoại trú BN Nguyễn Văn A"),
                ("TreatmentSheet", "Phiếu điều trị IPD ngày 3 - BN Trần Thị B"),
                ("NursingCare", "Phiếu chăm sóc điều dưỡng ca đêm"),
                ("LabResult", "Kết quả xét nghiệm sinh hóa"),
                ("RadiologyResult", "Kết quả X-quang phổi thẳng"),
                ("DischargeSummary", "Tóm tắt ra viện BN Lê Văn C"),
                ("ConsultationMinutes", "Biên bản hội chẩn chuyên khoa"),
                ("SurgicalConsent", "Cam kết phẫu thuật - nội soi cắt túi mật"),
                ("Prescription", "Đơn thuốc BHYT dài ngày"),
                ("TreatmentSheet", "Phiếu điều trị hậu phẫu ngày 1"),
            };
            var reqs = new List<SigningRequest>();
            for (int i = 0; i < 25 && users.Count > 0; i++)
            {
                var t = docTypes[i % docTypes.Length];
                var submitted = users[i % users.Count];
                // First 8 assigned to admin = pending; rest mixed status
                var status = i < 8 ? 0 : (i % 4 switch { 0 => 0, 1 => 1, 2 => 2, _ => 3 });
                var created = ctx.Now.AddDays(-rng.Next(0, 14)).AddHours(-rng.Next(0, 23));
                reqs.Add(new SigningRequest
                {
                    Id = Guid.NewGuid(),
                    DocumentType = t.Type,
                    DocumentId = Guid.NewGuid(),
                    DocumentTitle = t.Title,
                    DocumentContent = $"Tóm tắt: {t.Title}. Vui lòng ký xác nhận.",
                    SubmittedById = submitted.Id,
                    SubmittedByName = submitted.FullName,
                    AssignedToId = i < 10 ? adminId : users[(i + 1) % users.Count].Id,
                    AssignedToName = i < 10 ? adminName : users[(i + 1) % users.Count].FullName,
                    Status = status,
                    RejectReason = status == 2 ? "Thông tin chưa đầy đủ, cần bổ sung chẩn đoán" : null,
                    SignedAt = status == 1 ? created.AddHours(rng.Next(1, 12)) : null,
                    SignatureData = status == 1 ? "{\"cert\":\"VNPT-CA\",\"serial\":\"XYZ1234\"}" : null,
                    DepartmentName = ctx.DepartmentIds.Count > 0 ? "Khoa Nội tổng hợp" : null,
                    CreatedAt = created, UpdatedAt = ctx.Now
                });
            }
            _db.SigningRequests.AddRange(reqs);
            await _db.SaveChangesAsync();
            summary["SigningRequests"] = reqs.Count;
        }
        } catch (Exception ex) { errors["SigningRequests"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // RadiologyConsultationSessions + Cases — /consultation page
        try {
        if (!await _db.RadiologyConsultationSessions.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var radReqIds = await _db.RadiologyRequests.OrderByDescending(r => r.CreatedAt)
                .Select(r => r.Id).Take(15).ToListAsync();
            if (radReqIds.Count > 0)
            {
                var sessions = new List<RadiologyConsultationSession>();
                var titles = new[] {
                    "Hội chẩn CĐHA - Khối u trung thất",
                    "Hội chẩn phức tạp CT sọ não",
                    "Hội chẩn siêu âm tim bệnh nhân suy tim",
                    "Hội chẩn MRI cột sống cổ - thoát vị đĩa đệm",
                    "Hội chẩn XN + CĐHA - nghi ngờ ung thư phổi",
                };
                for (int i = 0; i < titles.Length; i++)
                {
                    var when = ctx.Now.AddDays(-rng.Next(0, 14)).AddHours(-rng.Next(0, 8));
                    int status = i % 4 switch { 0 => 3, 1 => 2, 2 => 1, _ => 3 };
                    sessions.Add(new RadiologyConsultationSession
                    {
                        Id = Guid.NewGuid(),
                        SessionCode = NextCode("HC", i + 1, 4),
                        Title = titles[i],
                        Description = "Hội chẩn đa chuyên khoa về chẩn đoán hình ảnh",
                        ScheduledStartTime = when,
                        ScheduledEndTime = when.AddHours(1),
                        ActualStartTime = status >= 2 ? when : null,
                        ActualEndTime = status >= 3 ? when.AddHours(1) : null,
                        OrganizerId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                        LeaderId = ctx.DoctorIds[(i + 1) % ctx.DoctorIds.Count],
                        SecretaryId = ctx.NurseIds.Count > 0 ? ctx.NurseIds[i % ctx.NurseIds.Count] : ctx.DoctorIds[i % ctx.DoctorIds.Count],
                        Status = status,
                        MeetingUrl = status <= 2 ? $"https://meet.his.local/hc-{i+1}" : null,
                        Notes = status == 3 ? "Đã họp xong, chờ biên bản kết luận" : null,
                        CreatedAt = when.AddDays(-1), UpdatedAt = ctx.Now
                    });
                }
                _db.RadiologyConsultationSessions.AddRange(sessions);
                await _db.SaveChangesAsync();
                summary["RadiologyConsultationSessions"] = sessions.Count;

                // Seed cases for each session
                var cases = new List<RadiologyConsultationCase>();
                var reasons = new[] {
                    "Hình ảnh khối u trung thất phức tạp, cần ý kiến nhiều chuyên gia",
                    "Tổn thương sọ não sau chấn thương, cần phân tích kỹ",
                    "Dị dạng tim mạch cần chuẩn bị phẫu thuật",
                    "Thoát vị đĩa đệm đa tầng, đánh giá phẫu thuật",
                    "Nốt mờ phổi nghi ung thư, phân giai đoạn",
                };
                int caseSeq = 0;
                for (int si = 0; si < sessions.Count; si++)
                {
                    int numCases = rng.Next(2, 4);
                    for (int c = 0; c < numCases && caseSeq < radReqIds.Count; c++)
                    {
                        int caseStatus = sessions[si].Status >= 3 ? 2 : 0;
                        cases.Add(new RadiologyConsultationCase
                        {
                            Id = Guid.NewGuid(),
                            SessionId = sessions[si].Id,
                            RadiologyRequestId = radReqIds[caseSeq % radReqIds.Count],
                            OrderNumber = c + 1,
                            Reason = reasons[si % reasons.Length],
                            PreliminaryDiagnosis = "Chẩn đoán sơ bộ trên hình ảnh",
                            Status = caseStatus,
                            Conclusion = caseStatus == 2 ? "Thống nhất chẩn đoán, đề nghị PT" : null,
                            Recommendation = caseStatus == 2 ? "Hội chẩn PT ngoại khoa trước 48h" : null,
                            CreatedAt = sessions[si].CreatedAt,
                            UpdatedAt = ctx.Now
                        });
                        caseSeq++;
                    }
                }
                _db.RadiologyConsultationCases.AddRange(cases);
                await _db.SaveChangesAsync();
                summary["RadiologyConsultationCases"] = cases.Count;

                // Participants (organizer + leader + secretary + 2 doctors)
                var participants = new List<RadiologyConsultationParticipant>();
                foreach (var s in sessions)
                {
                    var uids = new[] { s.OrganizerId, s.LeaderId ?? ctx.DoctorIds[0], s.SecretaryId ?? ctx.NurseIds.FirstOrDefault() }
                        .Where(id => id != Guid.Empty).Distinct().Take(3).ToList();
                    foreach (var uid in uids)
                    {
                        participants.Add(new RadiologyConsultationParticipant
                        {
                            Id = Guid.NewGuid(),
                            SessionId = s.Id,
                            UserId = uid,
                            Role = uid == s.LeaderId ? "Leader" : uid == s.SecretaryId ? "Secretary" : "Participant",
                            Status = s.Status >= 3 ? 4 : s.Status == 2 ? 3 : 1,
                            InvitedAt = s.CreatedAt,
                            JoinedAt = s.ActualStartTime,
                            LeftAt = s.ActualEndTime,
                            CreatedAt = s.CreatedAt, UpdatedAt = ctx.Now
                        });
                    }
                }
                if (participants.Count > 0)
                {
                    _db.RadiologyConsultationParticipants.AddRange(participants);
                    await _db.SaveChangesAsync();
                    summary["RadiologyConsultationParticipants"] = participants.Count;
                }
            }
        }
        } catch (Exception ex) { errors["RadiologyConsultations"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // IncidentReports — /quality incidents tab
        try {
        if (!await _db.IncidentReports.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var incidents = new (string Type, string Severity, string Harm, string Desc, string Status)[] {
                ("Medication", "Minor", "None", "Nhầm liều thuốc Paracetamol, phát hiện kịp thời", "Closed"),
                ("Fall", "Moderate", "Temporary", "Bệnh nhân té ngã khi đi vệ sinh, trầy xước nhẹ", "Closed"),
                ("Infection", "Major", "Permanent", "Nhiễm khuẩn vết mổ sau PT cắt ruột thừa", "UnderInvestigation"),
                ("Equipment", "Minor", "None", "Máy đo huyết áp hiển thị sai, đổi máy khác", "Closed"),
                ("Process", "Near-miss", "None", "Phát hiện nhầm chỉ định XN trước khi lấy mẫu", "RCAComplete"),
                ("Medication", "Major", "Temporary", "Dị ứng nặng sau tiêm kháng sinh, xử trí kịp thời", "ActionPlan"),
                ("Fall", "Minor", "None", "BN trượt ngã khi tắm, không thương tích", "Closed"),
                ("Process", "Moderate", "Temporary", "Chậm chuyển BN cấp cứu lên HSTC", "RCAComplete"),
                ("Equipment", "Moderate", "None", "Máy thở báo lỗi khi đang sử dụng, chuyển máy dự phòng", "Closed"),
                ("Other", "Near-miss", "None", "Phát hiện thiếu oxy y tế buồng bệnh trước khi BN vào", "Closed"),
                ("Medication", "Minor", "None", "Ghi sai tên thuốc trên phiếu ra thuốc, sửa kịp", "Closed"),
                ("Infection", "Moderate", "Temporary", "Viêm phổi bệnh viện ở BN nằm ICU 10 ngày", "ActionPlan"),
                ("Fall", "Major", "Temporary", "BN cao tuổi té gãy xương cổ tay", "UnderInvestigation"),
                ("Process", "Minor", "None", "Quên ghi chép theo dõi dấu hiệu sinh tồn 1 ca", "Closed"),
                ("Other", "Near-miss", "None", "Phát hiện ống thông NTM lỏng trước khi sử dụng", "Closed"),
            };
            var reports = new List<IncidentReport>();
            for (int i = 0; i < incidents.Length; i++)
            {
                var inc = incidents[i];
                var incDate = ctx.Now.AddDays(-rng.Next(1, 120));
                reports.Add(new IncidentReport
                {
                    Id = Guid.NewGuid(),
                    ReportCode = NextCode("IC", i + 1, 4),
                    IncidentDate = incDate,
                    ReportDate = incDate.AddHours(rng.Next(1, 48)),
                    ReportedById = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    IncidentType = inc.Type,
                    Severity = inc.Severity,
                    HarmLevel = inc.Harm,
                    Description = inc.Desc,
                    ImmediateActions = "Xử trí tại chỗ, báo cáo lãnh đạo khoa, theo dõi BN",
                    Status = inc.Status,
                    InvestigatorId = inc.Status != "Reported" ? ctx.DoctorIds[(i + 1) % ctx.DoctorIds.Count] : null,
                    InvestigationStartDate = inc.Status != "Reported" ? incDate.AddDays(1) : null,
                    InvestigationEndDate = inc.Status == "Closed" ? incDate.AddDays(7) : null,
                    RootCause = inc.Status == "Closed" || inc.Status == "RCAComplete"
                        ? "Do thao tác con người, đề xuất đào tạo lại"
                        : null,
                    RCAMethod = inc.Status == "RCAComplete" || inc.Status == "Closed" ? "5 Whys" : null,
                    IsAnonymous = i % 10 == 9,
                    CreatedAt = incDate.AddHours(rng.Next(1, 24)), UpdatedAt = ctx.Now
                });
            }
            _db.IncidentReports.AddRange(reports);
            await _db.SaveChangesAsync();
            summary["IncidentReports"] = reports.Count;
        }
        } catch (Exception ex) { errors["IncidentReports"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Boost thin tables so sparse pages (/telemedicine, /emergency-disaster)
        // go from 4 rows to 20+.
        try {
        // TeleAppointments: top up to 25 rows (entity lives in ExtendedWorkflowEntities)
        var teleCount = await _db.TeleAppointments.CountAsync();
        if (teleCount < 25 && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            var specCodes = ctx.DepartmentIds.Take(5).ToList();
            var complaints = new[] {
                "Đau đầu, chóng mặt, khó ngủ kéo dài 1 tuần",
                "Ho kéo dài, đờm trắng, không sốt",
                "Đau bụng vùng thượng vị sau ăn",
                "Đái tháo đường — xin tư vấn điều chỉnh liều",
                "Tăng huyết áp — tái khám định kỳ",
                "Con bị sốt cao 3 ngày, sợ tay chân miệng",
                "Đau lưng mạn, xin tư vấn vật lý trị liệu",
                "Đau khớp gối khi đi bộ",
                "Tiền sử viêm gan B, xin tư vấn theo dõi",
                "Kiểm tra kết quả xét nghiệm máu tổng quát",
            };
            var statuses = new[] { "Completed", "Completed", "Completed", "Confirmed", "Pending", "Cancelled" };
            var list = new List<TeleAppointment>();
            int need = 25 - teleCount;
            for (int i = 0; i < need && i < ctx.PatientIds.Count; i++)
            {
                var status = statuses[i % statuses.Length];
                var apptDate = ctx.Now.AddDays(-rng.Next(1, 25)).Date;
                var start = new TimeSpan(rng.Next(7, 17), rng.Next(0, 4) * 15, 0);
                list.Add(new TeleAppointment
                {
                    Id = Guid.NewGuid(),
                    AppointmentCode = NextCode("TELE", teleCount + i + 1, 5),
                    PatientId = ctx.PatientIds[i % ctx.PatientIds.Count],
                    DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    SpecialityId = specCodes.Count > 0 ? specCodes[i % specCodes.Count] : null,
                    AppointmentDate = apptDate,
                    StartTime = start,
                    EndTime = start.Add(TimeSpan.FromMinutes(15 + rng.Next(0, 4) * 5)),
                    DurationMinutes = 15 + rng.Next(0, 4) * 5,
                    Status = status,
                    ChiefComplaint = complaints[i % complaints.Length],
                    ConfirmedAt = status != "Pending" ? apptDate.AddDays(-1) : null,
                    CancellationReason = status == "Cancelled" ? "Bệnh nhân báo bận, dời lịch" : null,
                    CreatedAt = apptDate.AddDays(-2), UpdatedAt = ctx.Now
                });
            }
            if (list.Count > 0)
            {
                _db.TeleAppointments.AddRange(list);
                await _db.SaveChangesAsync();
                summary["TeleAppointments+"] = list.Count;
            }
        }
        } catch (Exception ex) { errors["TeleAppointmentsBoost"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        try {
        // MCIEvents: top up to 15 rows
        var mciCount = await _db.MCIEvents.CountAsync();
        if (mciCount < 15 && ctx.DoctorIds.Count > 0)
        {
            var scenarios = new (string Name, string Type, string Location, string Level, int Victims)[] {
                ("TNGT xe khách QL1 đoạn Cẩm Mỹ", "Accident", "QL1 KM 1872, Đồng Nai", "Orange", 18),
                ("Cháy chợ đêm Phan Thiết", "Fire", "Chợ đêm Phan Thiết", "Orange", 12),
                ("Ngộ độc thực phẩm tập thể tại trường tiểu học", "Chemical", "Trường TH An Phú", "Yellow", 45),
                ("Sự cố tràn hoá chất nhà máy", "Chemical", "KCN Biên Hoà", "Red", 8),
                ("Bão số 7 - sập nhà tại huyện ven biển", "NaturalDisaster", "Huyện Long Điền", "Red", 22),
                ("TNGT xe container - xe máy trên cao tốc", "Accident", "Cao tốc TPHCM-LT", "Yellow", 6),
                ("Lũ quét Huyện Bắc Trà My", "NaturalDisaster", "Huyện Bắc Trà My", "Red", 35),
                ("Sập giàn giáo công trình xây dựng", "Accident", "Quận 2, TPHCM", "Orange", 14),
                ("Ngộ độc CO hầm mỏ", "Chemical", "Mỏ than Cẩm Phả", "Orange", 9),
                ("Cháy chung cư mini", "Fire", "Quận Thanh Xuân HN", "Red", 28),
                ("Đâm dao tập thể tại quán nhậu", "Violence", "Quận Tân Bình", "Yellow", 7),
            };
            var list = new List<MCIEvent>();
            int need = Math.Min(scenarios.Length, 15 - mciCount);
            for (int i = 0; i < need; i++)
            {
                var s = scenarios[i];
                var alert = ctx.Now.AddDays(-rng.Next(1, 120)).AddHours(-rng.Next(0, 23));
                bool active = i < 2;
                bool deactivated = !active;
                list.Add(new MCIEvent
                {
                    Id = Guid.NewGuid(),
                    EventCode = NextCode("MCI", mciCount + i + 1, 4),
                    EventName = s.Name,
                    EventType = s.Type,
                    EventLocation = s.Location,
                    AlertReceivedAt = alert,
                    ActivatedAt = alert.AddMinutes(rng.Next(5, 30)),
                    DeactivatedAt = deactivated ? alert.AddHours(rng.Next(4, 24)) : null,
                    AlertLevel = s.Level,
                    EstimatedVictims = s.Victims,
                    ActualVictims = s.Victims + rng.Next(-3, 4),
                    Status = deactivated ? "Deactivated" : "Active",
                    IncidentCommanderId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    BedsActivated = s.Victims,
                    StaffMobilized = (int)(s.Victims * 1.5),
                    BloodBankAlerted = s.Level == "Red" || s.Level == "Orange",
                    ORsCleared = s.Level == "Red",
                    ReportedToAuthority = true,
                    ReportedAt = alert.AddHours(1),
                    AfterActionReport = deactivated ? "AAR đã hoàn tất, rút kinh nghiệm chuyển cấp" : null,
                    CreatedAt = alert, UpdatedAt = ctx.Now
                });
            }
            if (list.Count > 0)
            {
                _db.MCIEvents.AddRange(list);
                await _db.SaveChangesAsync();
                summary["MCIEvents+"] = list.Count;
            }
        }
        } catch (Exception ex) { errors["MCIEventsBoost"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // MedicalRecordArchives — /medical-record-archive page
        try {
        if (!await _db.MedicalRecordArchives.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var mrs = await _db.MedicalRecords
                .Where(m => m.DischargeDate != null || m.Status == 2)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new { m.Id, m.PatientId, m.DepartmentId, m.MainDiagnosis, m.AdmissionDate, m.DischargeDate, m.CreatedAt })
                .Take(30)
                .ToListAsync();
            if (mrs.Count == 0)
            {
                // Fallback: take any 30 medical records
                mrs = await _db.MedicalRecords
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => new { m.Id, m.PatientId, m.DepartmentId, m.MainDiagnosis, m.AdmissionDate, m.DischargeDate, m.CreatedAt })
                    .Take(30)
                    .ToListAsync();
            }
            var locations = new[] { "Kho A tầng 1", "Kho A tầng 2", "Kho B hầm", "Kho trung tâm" };
            var outcomes = new[] { "Khỏi ra viện", "Đỡ giảm ra viện", "Không thay đổi", "Chuyển viện", "Xin về" };
            var archives = new List<MedicalRecordArchive>();
            for (int i = 0; i < mrs.Count; i++)
            {
                var mr = mrs[i];
                var archDate = (mr.DischargeDate ?? mr.CreatedAt).AddDays(rng.Next(1, 30));
                var status = i % 10 == 9 ? 2 : 1; // 10% on loan
                archives.Add(new MedicalRecordArchive
                {
                    Id = Guid.NewGuid(),
                    ArchiveCode = NextCode("LT", i + 1, 5),
                    MedicalRecordId = mr.Id,
                    PatientId = mr.PatientId,
                    DepartmentId = mr.DepartmentId,
                    Diagnosis = mr.MainDiagnosis,
                    TreatmentResult = outcomes[i % outcomes.Length],
                    AdmissionDate = mr.AdmissionDate,
                    DischargeDate = mr.DischargeDate,
                    StorageLocation = locations[i % locations.Length],
                    ShelfNumber = $"K{rng.Next(1, 30):D2}",
                    BoxNumber = $"H{rng.Next(1, 120):D3}",
                    Status = status,
                    ArchivedDate = archDate,
                    ArchivedById = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    ArchiveYear = archDate.Year,
                    CreatedAt = archDate, UpdatedAt = ctx.Now
                });
            }
            if (archives.Count > 0)
            {
                _db.MedicalRecordArchives.AddRange(archives);
                await _db.SaveChangesAsync();
                summary["MedicalRecordArchives"] = archives.Count;
            }
        }
        } catch (Exception ex) { errors["MedicalRecordArchives"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Shift-to-today: many list pages (reception queue, OPD, radiology, lab,
        // prescription, service requests) filter `CreatedAt.Date == today`. The
        // restored BAK is past-dated so those pages render empty. Bulk-update a
        // slice of the newest rows in each table to today's date so the demo
        // renders a busy day. Raw SQL keeps it idempotent and cheap.
        try {
            // Wrap each UPDATE in a dynamic-SQL + column-exists guard so
            // schema drift in any single table doesn't abort the whole block.
            await _db.Database.ExecuteSqlRawAsync(@"
DECLARE @today datetime2 = CAST(CAST(SYSDATETIME() AS date) AS datetime2);

-- MedicalRecords: 30 newest to today (CreatedAt + AdmissionDate because
-- several search endpoints filter on AdmissionDate, not CreatedAt)
UPDATE m SET
    CreatedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM MedicalRecords m
WHERE CreatedAt < @today
  AND m.Id IN (SELECT TOP 30 Id FROM MedicalRecords ORDER BY CreatedAt DESC);

-- Separate update for AdmissionDate so we catch rows whose CreatedAt was
-- shifted in a previous run but AdmissionDate stayed in the past.
-- Important: target MedicalRecords that ACTUALLY have Examinations
-- attached so the /examination/search date filter returns rows.
UPDATE m SET
    AdmissionDate = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM MedicalRecords m
WHERE (AdmissionDate IS NOT NULL AND CAST(AdmissionDate AS date) < @today)
  AND m.Id IN (
    SELECT TOP 30 e.MedicalRecordId
    FROM Examinations e
    WHERE e.MedicalRecordId IS NOT NULL
    ORDER BY e.CreatedAt DESC
  );

-- Examinations: only CreatedAt (ScheduledDateTime may or may not exist)
UPDATE e SET CreatedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM Examinations e
WHERE CreatedAt < @today
  AND e.Id IN (SELECT TOP 30 Id FROM Examinations ORDER BY CreatedAt DESC);

IF COL_LENGTH('Examinations','ScheduledDateTime') IS NOT NULL
BEGIN
  EXEC('UPDATE e SET ScheduledDateTime = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), CAST(CAST(SYSDATETIME() AS date) AS datetime2))
        FROM Examinations e
        WHERE ScheduledDateTime IS NOT NULL AND CAST(ScheduledDateTime AS date) < CAST(CAST(SYSDATETIME() AS date) AS datetime2)
          AND e.Id IN (SELECT TOP 30 Id FROM Examinations ORDER BY CreatedAt DESC)');
END

-- ServiceRequests: 40 newest
UPDATE s SET CreatedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM ServiceRequests s
WHERE CreatedAt < @today
  AND s.Id IN (SELECT TOP 40 Id FROM ServiceRequests ORDER BY CreatedAt DESC);

IF COL_LENGTH('ServiceRequests','RequestDate') IS NOT NULL
BEGIN
  EXEC('UPDATE s SET RequestDate = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), CAST(CAST(SYSDATETIME() AS date) AS datetime2))
        FROM ServiceRequests s
        WHERE CAST(RequestDate AS date) < CAST(CAST(SYSDATETIME() AS date) AS datetime2)
          AND s.Id IN (SELECT TOP 40 Id FROM ServiceRequests ORDER BY CreatedAt DESC)');
END

-- Prescriptions: 20 newest
UPDATE p SET CreatedAt = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), @today)
FROM Prescriptions p
WHERE CreatedAt < @today
  AND p.Id IN (SELECT TOP 20 Id FROM Prescriptions ORDER BY CreatedAt DESC);

IF COL_LENGTH('Prescriptions','PrescriptionDate') IS NOT NULL
BEGIN
  EXEC('UPDATE p SET PrescriptionDate = CAST(CAST(SYSDATETIME() AS date) AS datetime2)
        FROM Prescriptions p
        WHERE CAST(PrescriptionDate AS date) < CAST(CAST(SYSDATETIME() AS date) AS datetime2)
          AND p.Id IN (SELECT TOP 20 Id FROM Prescriptions ORDER BY CreatedAt DESC)');
END

-- Appointments: shift 5 appointments to today for the today-queue
IF OBJECT_ID('Appointments','U') IS NOT NULL
BEGIN
  EXEC('UPDATE a SET AppointmentDate = CAST(CAST(SYSDATETIME() AS date) AS datetime2)
        FROM Appointments a
        WHERE a.Id IN (SELECT TOP 5 Id FROM Appointments WHERE AppointmentDate < CAST(CAST(SYSDATETIME() AS date) AS datetime2) ORDER BY AppointmentDate DESC)');
END

-- QueueTickets: shift some to today so queue display works
IF OBJECT_ID('QueueTickets','U') IS NOT NULL AND COL_LENGTH('QueueTickets','IssueDate') IS NOT NULL
BEGIN
  EXEC('UPDATE q SET IssueDate = DATEADD(minute, ABS(CHECKSUM(NEWID()) % 600), CAST(CAST(SYSDATETIME() AS date) AS datetime2))
        FROM QueueTickets q
        WHERE CAST(IssueDate AS date) < CAST(CAST(SYSDATETIME() AS date) AS datetime2)
          AND q.Id IN (SELECT TOP 20 Id FROM QueueTickets ORDER BY IssueDate DESC)');
END

-- #14e-B: block shift LabOrders đã gỡ (bảng model 3 drop ở mig 92; /orders/pending giờ đọc ServiceRequests)

-- Receipts: shift 30 paid receipts to last 7 days so dashboard revenue-by-department lights up
IF OBJECT_ID('Receipts','U') IS NOT NULL AND COL_LENGTH('Receipts','ReceiptDate') IS NOT NULL
BEGIN
  EXEC('UPDATE r SET
          CreatedAt = DATEADD(hour, -ABS(CHECKSUM(NEWID()) % 168), CAST(CAST(SYSDATETIME() AS date) AS datetime2)),
          ReceiptDate = DATEADD(hour, -ABS(CHECKSUM(NEWID()) % 168), CAST(CAST(SYSDATETIME() AS date) AS datetime2))
        FROM Receipts r
        WHERE r.Status = 1
          AND r.Id IN (SELECT TOP 30 Id FROM Receipts WHERE Status = 1 ORDER BY ReceiptDate DESC)');
END
");
            summary["ShiftedToToday"] = 125;
        } catch (Exception ex) { errors["ShiftToToday"] = ex.GetBaseException().Message; }
    }
}
