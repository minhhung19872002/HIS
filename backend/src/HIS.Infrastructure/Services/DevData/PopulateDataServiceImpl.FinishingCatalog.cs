using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // Split out of PopulateFinishingAsync (task #364 wave-6): schema-drift fix +
    // catalog/security data — ManagedCertificates, LisAnalyzers, Appointments,
    // EndpointDevices (+ SecurityIncidents/InstalledSoftware), outbreak tagging,
    // TbHivRecords. Cut verbatim; each block already owns its own try/catch so no
    // behavior change — only moved into its own method taking the same shared
    // ctx/summary/errors/rng references.
    private async Task SeedFinishingCatalogAsync(Ctx ctx, Dictionary<string, int> summary, Dictionary<string, string> errors, Random rng)
    {
        // Schema-drift fix: MethadonePatients.Phase + OccupationalHealthExams.Classification
        // are `int` in the DB but `string` on the entity → SqlDataReader throws
        // InvalidCastException on read. Widen the columns to nvarchar(20) so both
        // the entity and the existing data (numeric IDs 1-4) co-exist. Wrapped
        // in DYNAMIC-SQL because we can't reference the column in the query
        // context if its type changes under us.
        try {
            // Drop any default constraints on the two affected columns first so the
            // ALTER COLUMN is not blocked, then widen to nvarchar(20).
            await _db.Database.ExecuteSqlRawAsync(@"
DECLARE @sql nvarchar(max);
SELECT @sql = STRING_AGG('ALTER TABLE ' + QUOTENAME(OBJECT_NAME(dc.parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(dc.name) + ';', ' ')
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
WHERE (OBJECT_NAME(dc.parent_object_id)='MethadonePatients' AND c.name='Phase')
   OR (OBJECT_NAME(dc.parent_object_id)='OccupationalHealthExams' AND c.name='Classification');
IF @sql IS NOT NULL EXEC(@sql);

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='MethadonePatients' AND COLUMN_NAME='Phase' AND DATA_TYPE='int')
BEGIN
  EXEC('ALTER TABLE MethadonePatients ALTER COLUMN Phase nvarchar(20) NULL');
END
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='OccupationalHealthExams' AND COLUMN_NAME='Classification' AND DATA_TYPE='int')
BEGIN
  EXEC('ALTER TABLE OccupationalHealthExams ALTER COLUMN Classification nvarchar(20) NULL');
END
");
            summary["SchemaDriftFixed"] = 2;
        } catch (Exception ex) { errors["SchemaDrift"] = ex.GetBaseException().Message; }

        // ManagedCertificates — digital signature catalogue
        try {
        if (!await _db.ManagedCertificates.AnyAsync())
        {
            var caProviders = new[] { "VNPT-CA", "FPT-CA", "Viettel-CA", "BKAV-CA", "NewTel-CA" };
            var storageTypes = new[] { "Token", "Token", "HSM", "Server", "Token" };
            var users = await _db.Users.Where(u => u.IsActive && u.FullName != "")
                .Take(10).Select(u => new { u.Id, u.FullName, u.Email }).ToListAsync();
            var certs = new List<ManagedCertificate>();
            for (int i = 0; i < Math.Min(users.Count, 8); i++)
            {
                var u = users[i];
                var issued = ctx.Now.AddMonths(-rng.Next(3, 18));
                certs.Add(new ManagedCertificate
                {
                    Id = Guid.NewGuid(),
                    SerialNumber = $"{rng.Next(1000_0000, 9999_9999):X8}{rng.Next(1000, 9999):X4}",
                    SubjectName = $"CN={u.FullName}, O=Bệnh viện Đa khoa, C=VN",
                    IssuerName = $"CN={caProviders[i % caProviders.Length]} Root CA, O=CA Provider, C=VN",
                    CaProvider = caProviders[i % caProviders.Length],
                    ValidFrom = issued,
                    ValidTo = issued.AddYears(3),
                    IsActive = i % 8 != 7, // last one inactive
                    OwnerUserId = u.Id,
                    Cccd = $"0{rng.Next(80, 99)}{rng.Next(100000000, 999999999)}",
                    StorageType = storageTypes[i % storageTypes.Length],
                    StorageIdentifier = storageTypes[i % storageTypes.Length] == "Token"
                        ? $"USB{rng.Next(100000, 999999)}"
                        : $"HSM-slot-{i + 1}",
                    CreatedAt = issued, UpdatedAt = ctx.Now
                });
            }
            if (certs.Count > 0)
            {
                _db.ManagedCertificates.AddRange(certs);
                await _db.SaveChangesAsync();
                summary["ManagedCertificates"] = certs.Count;
            }
        }
        } catch (Exception ex) { errors["ManagedCertificates"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // LisAnalyzers — laboratory analyzer catalogue
        try {
        if (!await _db.LisAnalyzers.AnyAsync())
        {
            var analyzers = new (string Name, string Model, string Mfr, string Protocol, string IP, int Port, string Status)[] {
                ("Máy sinh hóa Roche Cobas c501", "Cobas c501", "Roche", "HL7", "192.168.10.11", 5100, "Connected"),
                ("Máy huyết học Sysmex XN-1000", "XN-1000", "Sysmex", "HL7", "192.168.10.12", 5101, "Connected"),
                ("Máy nước tiểu Siemens Clinitek", "Clinitek Atlas", "Siemens", "ASTM", "192.168.10.13", 5102, "Connected"),
                ("Máy đông máu Stago STA-R", "STA-R Max", "Stago", "ASTM", "192.168.10.14", 5103, "Connected"),
                ("Máy miễn dịch Abbott Architect", "Architect i2000", "Abbott", "HL7", "192.168.10.15", 5104, "Disconnected"),
                ("Máy khí máu Radiometer ABL90", "ABL90 FLEX", "Radiometer", "HL7", "192.168.10.16", 5105, "Connected"),
                ("Máy cấy máu BacT/ALERT 3D", "BacT/ALERT 3D", "BioMerieux", "Serial", null!, 0, "Unknown"),
            };
            var list = new List<LisAnalyzer>();
            foreach (var a in analyzers)
            {
                list.Add(new LisAnalyzer
                {
                    Id = Guid.NewGuid(),
                    Name = a.Name,
                    Model = a.Model,
                    Manufacturer = a.Mfr,
                    ConnectionType = a.Protocol,
                    IpAddress = a.IP,
                    Port = a.Port > 0 ? a.Port : null,
                    ComPort = a.Protocol == "Serial" ? "COM3" : null,
                    BaudRate = a.Protocol == "Serial" ? 9600 : null,
                    ProtocolVersion = a.Protocol == "HL7" ? "2.5.1" : "E1394-97",
                    IsActive = true,
                    LastConnectionTime = a.Status == "Connected" ? ctx.Now.AddMinutes(-rng.Next(1, 60)) : ctx.Now.AddDays(-rng.Next(1, 10)),
                    ConnectionStatus = a.Status,
                    Description = $"Kết nối qua {a.Protocol}, phòng XN trung tâm",
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(3, 24)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.LisAnalyzers.AddRange(list);
            await _db.SaveChangesAsync();
            summary["LisAnalyzers"] = list.Count;
        }
        } catch (Exception ex) { errors["LisAnalyzers"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Appointments — follow-up calendar (mix of upcoming, today, overdue)
        try {
        // Appointments — seed if fewer than 20 rows so /follow-up page has variety
        var apptCount = await _db.Appointments.CountAsync();
        if (apptCount < 20 && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            var deptIds = ctx.DepartmentIds;
            var reasons = new[] {
                "Tái khám định kỳ sau xuất viện",
                "Tái khám THA + điều chỉnh thuốc",
                "Tái khám ĐTĐ + kết quả HbA1c",
                "Khám lại đau thắt lưng sau vật lý trị liệu",
                "Tái khám hậu phẫu — cắt chỉ",
                "Đánh giá kết quả điều trị ung thư",
                "Khám sức khỏe định kỳ theo BHYT",
                "Tái khám nhi — theo dõi sốt co giật",
                "Khám lại sản phụ khoa",
                "Kiểm tra mắt sau phẫu thuật"
            };
            var appts = new List<Appointment>();
            int seq = 0;
            for (int i = 0; i < 45 && i < ctx.PatientIds.Count; i++)
            {
                seq++;
                // 40% overdue within the last 7 days (what /follow-up/overdue shows),
                // 30% upcoming, 20% today, 10% attended months ago
                int bucket = rng.Next(0, 10);
                DateTime apptDate;
                int status;
                if (bucket < 4) {
                    apptDate = ctx.Now.Date.AddDays(-rng.Next(1, 7));
                    status = rng.Next(0, 2); // Pending or Confirmed but missed
                } else if (bucket < 7) {
                    apptDate = ctx.Now.Date.AddDays(rng.Next(1, 21));
                    status = rng.Next(0, 2); // Pending or Confirmed
                } else if (bucket < 9) {
                    apptDate = ctx.Now.Date;
                    status = 1; // Confirmed today
                } else {
                    apptDate = ctx.Now.Date.AddDays(-rng.Next(30, 90));
                    status = 2; // Attended
                }
                appts.Add(new Appointment
                {
                    Id = Guid.NewGuid(),
                    AppointmentCode = NextCode("APT", seq, 5),
                    AppointmentDate = apptDate,
                    AppointmentTime = new TimeSpan(rng.Next(7, 17), rng.Next(0, 4) * 15, 0),
                    PatientId = ctx.PatientIds[i],
                    DepartmentId = deptIds.Count > 0 ? deptIds[i % deptIds.Count] : null,
                    DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    AppointmentType = rng.Next(1, 4),
                    Reason = reasons[i % reasons.Length],
                    Note = i % 5 == 0 ? "Mang theo phim, kết quả XN lần trước" : null,
                    Status = status,
                    IsReminderSent = status == 1 || status == 2,
                    ReminderSentAt = (status == 1 || status == 2) ? apptDate.AddDays(-1) : null,
                    CreatedAt = apptDate.AddDays(-rng.Next(3, 30)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.Appointments.AddRange(appts);
            await _db.SaveChangesAsync();
            summary["Appointments"] = appts.Count;
        }
        } catch (Exception ex) { errors["Appointments"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // EndpointDevices — ATTT / Security
        try {
        // BaseEntity adds IsDeleted but these tables predate the global filter;
        // add the column on the fly if missing so INSERT / query filter both work.
        await _db.Database.ExecuteSqlRawAsync(@"
IF COL_LENGTH('EndpointDevices','IsDeleted') IS NULL ALTER TABLE EndpointDevices ADD IsDeleted bit NOT NULL CONSTRAINT DF_EndpointDevices_IsDeleted DEFAULT 0;
IF COL_LENGTH('SecurityIncidents','IsDeleted') IS NULL ALTER TABLE SecurityIncidents ADD IsDeleted bit NOT NULL CONSTRAINT DF_SecurityIncidents_IsDeleted DEFAULT 0;
IF COL_LENGTH('InstalledSoftwareItems','IsDeleted') IS NULL ALTER TABLE InstalledSoftwareItems ADD IsDeleted bit NOT NULL CONSTRAINT DF_InstalledSoftwareItems_IsDeleted DEFAULT 0;
");
        if (!await _db.EndpointDevices.AnyAsync())
        {
            var hostPrefixes = new[] { "PC-RECEP", "PC-DOCTOR", "PC-NURSE", "PC-LAB", "PC-PHARM", "PC-ADMIN" };
            var oses = new[] { "Windows 10 Pro", "Windows 11 Pro", "Windows 10 Enterprise", "Windows Server 2022" };
            var avNames = new[] { "Windows Defender", "Kaspersky Endpoint Security", "Symantec Endpoint Protection", "Bitdefender GravityZone" };
            var avStatus = new[] { "Active", "Active", "Active", "Outdated", "Active", "Disabled" };
            var deptNames = new[] { "Tiếp đón", "Khám bệnh", "Nội tổng hợp", "Ngoại tổng quát", "Xét nghiệm", "Nhà thuốc", "Cấp cứu", "Hành chính" };
            var devices = new List<EndpointDevice>();
            for (int i = 0; i < 24; i++)
            {
                var lastSeen = ctx.Now.AddMinutes(-rng.Next(1, 60 * 48));
                var status = lastSeen > ctx.Now.AddHours(-2) ? 1 : 0;
                devices.Add(new EndpointDevice
                {
                    Id = Guid.NewGuid(),
                    Hostname = $"{hostPrefixes[i % hostPrefixes.Length]}-{(i + 1):D2}",
                    IpAddress = $"10.10.{rng.Next(1, 20)}.{rng.Next(10, 250)}",
                    MacAddress = string.Join(":", Enumerable.Range(0, 6).Select(_ => rng.Next(0, 256).ToString("X2"))),
                    OperatingSystem = oses[i % oses.Length],
                    OsVersion = oses[i % oses.Length].Contains("11") ? "22H2" : oses[i % oses.Length].Contains("Server") ? "21H2" : "22H2",
                    AntivirusName = avNames[i % avNames.Length],
                    AntivirusStatus = avStatus[i % avStatus.Length],
                    AntivirusLastUpdate = ctx.Now.AddDays(-rng.Next(0, 14)),
                    DepartmentName = deptNames[i % deptNames.Length],
                    AssignedUser = $"nhanvien{i + 1:D3}",
                    Status = status,
                    LastSeenAt = lastSeen,
                    AgentVersion = $"v{rng.Next(4, 8)}.{rng.Next(0, 10)}.{rng.Next(0, 100)}",
                    IsCompliant = i % 5 != 4,
                    ComplianceNotes = i % 5 == 4 ? "Chưa cập nhật patch Windows tháng mới nhất" : null,
                    IsActive = true,
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(3, 36)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.EndpointDevices.AddRange(devices);
            await _db.SaveChangesAsync();
            summary["EndpointDevices"] = devices.Count;

            // Seed incidents and installed software tied to these devices
            if (!await _db.SecurityIncidents.AnyAsync())
            {
                var titles = new[] {
                    ("Phát hiện mã độc trên máy tiếp đón", 2, "Malware"),
                    ("Email lừa đảo (phishing) gửi tới nhiều tài khoản", 2, "Phishing"),
                    ("Đăng nhập thất bại nhiều lần từ IP lạ", 3, "Unauthorized"),
                    ("USB trái phép kết nối vào máy nội bộ", 3, "Unauthorized"),
                    ("Windows Update bị tắt trên 3 máy", 4, "Other"),
                    ("Cảnh báo DDoS lên cổng thông tin tuyển dụng", 1, "DDoS"),
                    ("Rò rỉ tài khoản nhân viên phòng HR", 1, "DataBreach")
                };
                var incList = new List<SecurityIncident>();
                for (int i = 0; i < titles.Length; i++)
                {
                    var created = ctx.Now.AddDays(-rng.Next(1, 60));
                    var resolved = i < 4 ? (DateTime?)created.AddDays(rng.Next(1, 5)) : null;
                    incList.Add(new SecurityIncident
                    {
                        Id = Guid.NewGuid(),
                        IncidentCode = NextCode("INC", i + 1, 4),
                        Title = titles[i].Item1,
                        Description = "Ghi nhận từ hệ thống EDR / SIEM, đã triển khai biện pháp ứng phó ban đầu",
                        Severity = titles[i].Item2,
                        Status = resolved != null ? 3 : i % 3,
                        Category = titles[i].Item3,
                        DeviceId = devices[i % devices.Count].Id,
                        DeviceHostname = devices[i % devices.Count].Hostname,
                        AffectedSystem = i % 2 == 0 ? "HIS Production" : "Email Server",
                        ReportedByName = "Trực SOC",
                        AssignedToName = "Quản trị hệ thống",
                        Resolution = resolved != null ? "Cô lập máy, quét sạch mã độc, cài lại AV, khôi phục dịch vụ" : null,
                        ResolvedAt = resolved,
                        ContainedAt = resolved?.AddHours(-rng.Next(1, 6)),
                        RootCause = resolved != null ? "Người dùng nhấn vào link phishing trong email" : null,
                        CorrectiveAction = resolved != null ? "Tăng cường đào tạo nhận thức ATTT + cập nhật bộ lọc email" : null,
                        CreatedAt = created, UpdatedAt = resolved ?? ctx.Now
                    });
                }
                _db.SecurityIncidents.AddRange(incList);
                await _db.SaveChangesAsync();
                summary["SecurityIncidents"] = incList.Count;
            }

            if (!await _db.InstalledSoftwareItems.AnyAsync())
            {
                var softwares = new (string Name, string Pub, string Cat)[] {
                    ("Microsoft Office 365", "Microsoft", "Office"),
                    ("Google Chrome", "Google", "Browser"),
                    ("Mozilla Firefox", "Mozilla", "Browser"),
                    ("Adobe Reader DC", "Adobe", "Office"),
                    ("Zalo PC", "VNG Corporation", "Other"),
                    ("Kaspersky Endpoint Security", "Kaspersky", "Security"),
                    ("UltraVNC Viewer", "UltraVNC Team", "System"),
                    ("7-Zip", "Igor Pavlov", "System"),
                    ("Foxit Reader", "Foxit Software", "Office"),
                    ("Team Viewer", "TeamViewer Germany GmbH", "System"),
                };
                var swList = new List<InstalledSoftware>();
                foreach (var d in devices.Take(12))
                {
                    int count = rng.Next(4, 9);
                    for (int i = 0; i < count; i++)
                    {
                        var sw = softwares[i % softwares.Length];
                        swList.Add(new InstalledSoftware
                        {
                            Id = Guid.NewGuid(),
                            DeviceId = d.Id,
                            SoftwareName = sw.Name,
                            Version = $"{rng.Next(10, 120)}.{rng.Next(0, 10)}.{rng.Next(0, 100)}",
                            Publisher = sw.Pub,
                            InstallDate = ctx.Now.AddDays(-rng.Next(30, 720)),
                            IsAuthorized = !(sw.Name.Contains("TeamViewer") && rng.Next(0, 3) == 0),
                            Category = sw.Cat,
                            Notes = null,
                            CreatedAt = ctx.Now.AddMonths(-rng.Next(1, 24)),
                            UpdatedAt = ctx.Now
                        });
                    }
                }
                _db.InstalledSoftwareItems.AddRange(swList);
                await _db.SaveChangesAsync();
                summary["InstalledSoftware"] = swList.Count;
            }
        }
        } catch (Exception ex) { errors["EndpointSecurity"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Mark ~6 disease cases as outbreak so /epidemiology/outbreaks renders
        try {
        var unmarkedOutbreaks = await _db.DiseaseCases
            .Where(d => !d.IsOutbreak || d.OutbreakId == null)
            .OrderByDescending(d => d.ReportDate)
            .Take(6)
            .ToListAsync();
        if (unmarkedOutbreaks.Count > 0 &&
            !await _db.DiseaseCases.AnyAsync(d => d.IsOutbreak && d.OutbreakId != null))
        {
            // Group them by disease name so we get a couple of outbreaks, not 6 singletons
            var grouped = unmarkedOutbreaks.GroupBy(d => d.DiseaseName ?? "Bệnh khác").ToList();
            int outbreakSeq = 0;
            foreach (var g in grouped)
            {
                outbreakSeq++;
                var obId = NextCode("OB", outbreakSeq, 3);
                foreach (var c in g)
                {
                    c.IsOutbreak = true;
                    c.OutbreakId = obId;
                    c.UpdatedAt = ctx.Now;
                }
            }
            await _db.SaveChangesAsync();
            summary["OutbreakCasesTagged"] = unmarkedOutbreaks.Count;
        }
        } catch (Exception ex) { errors["OutbreakTagging"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // TbHivRecords — TB / HIV patient registry (top up to at least 20 real rows)
        try {
        // Delete orphan rows where PatientId is empty (happens when old test data had Guid.Empty)
        var orphans = await _db.TbHivRecords.Where(r => r.PatientId == Guid.Empty).ToListAsync();
        if (orphans.Count > 0) { _db.TbHivRecords.RemoveRange(orphans); await _db.SaveChangesAsync(); }
        if (await _db.TbHivRecords.CountAsync() < 15 && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            var records = new List<TbHivRecord>();
            var types = new[] { "TB", "TB", "HIV", "HIV", "TB_HIV" };
            var cats = new[] { "New", "New", "Relapse", "TransferIn", "ReturnAfterDefault" };
            var regimensTb = new[] { "2RHZE/4RH", "2RHZE/4R3H3", "2HRZE/4HR" };
            var regimensHiv = new[] { "TDF+3TC+DTG", "AZT+3TC+NVP", "TDF+FTC+EFV" };
            for (int i = 0; i < 20 && i < ctx.PatientIds.Count; i++)
            {
                var tp = types[i % types.Length];
                var start = ctx.Now.AddDays(-rng.Next(30, 365));
                bool isTb = tp != "HIV";
                records.Add(new TbHivRecord
                {
                    Id = Guid.NewGuid(),
                    PatientId = ctx.PatientIds[i],
                    RecordType = tp,
                    RegistrationDate = start,
                    RegistrationCode = NextCode(tp == "HIV" ? "HIV" : "TB", i + 1, 4),
                    TreatmentCategory = cats[i % cats.Length],
                    TreatmentRegimen = isTb ? regimensTb[i % regimensTb.Length] : regimensHiv[i % regimensHiv.Length],
                    TreatmentStartDate = start.AddDays(rng.Next(3, 14)),
                    ExpectedEndDate = start.AddMonths(isTb ? 6 : 24),
                    Status = i % 6 == 5 ? "Completed" : i % 6 == 4 ? "DefaultedLostToFollowUp" : "OnTreatment",
                    SmearResult = isTb ? (i % 3 == 0 ? "Positive" : "Negative") : null,
                    GeneXpertResult = isTb ? (i % 5 == 0 ? "RifResistant" : "Detected") : null,
                    TbSite = isTb ? (i % 2 == 0 ? "Pulmonary" : "ExtraPulmonary") : null,
                    IsMdr = isTb && i % 7 == 0,
                    Cd4Count = !isTb ? 200 + rng.Next(0, 600) : null,
                    ViralLoad = !isTb ? rng.Next(40, 1000) : null,
                    ArtRegimen = !isTb ? regimensHiv[i % regimensHiv.Length] : null,
                    ArtStartDate = !isTb ? start : null,
                    WhoStage = !isTb ? new[] { "I", "II", "III", "IV" }[i % 4] : null,
                    DotProvider = isTb ? (i % 2 == 0 ? "Cán bộ y tế xã" : "Người nhà") : null,
                    DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    CreatedAt = start, UpdatedAt = ctx.Now
                });
            }
            _db.TbHivRecords.AddRange(records);
            await _db.SaveChangesAsync();
            summary["TbHivRecords"] = records.Count;
        }
        } catch (Exception ex) { errors["TbHivRecords"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }
    }
}
