using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services.DevData;

public partial class PopulateDataServiceImpl
{
    // ==========================================================================
    // FINISHING — remaining tables not covered by any module-specific seeder
    // (certificates, lab analyzers, appointments, endpoint security, outbreak flag)
    // ==========================================================================
    public async Task<object> PopulateFinishingAsync()
    {
        var ctx = await LoadCtxAsync();
        var summary = new Dictionary<string, int>();
        var errors = new Dictionary<string, string>();
        var rng = new Random(77);

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

        // IVF — couples + cycles
        try {
        if (!await _db.IvfPatientCouples.AnyAsync() && ctx.PatientIds.Count >= 20)
        {
            var couples = new List<IvfPatientCouple>();
            var causes = new[] { "Nam giới: tinh trùng yếu", "Nữ: tắc vòi trứng",
                "Rối loạn phóng noãn (PCOS)", "Lạc nội mạc tử cung",
                "Vô sinh không rõ nguyên nhân", "Nam: không có tinh trùng (azoospermia)" };
            for (int i = 0; i < 10; i++)
            {
                couples.Add(new IvfPatientCouple
                {
                    Id = Guid.NewGuid(),
                    WifePatientId = ctx.PatientIds[i * 2],
                    HusbandPatientId = ctx.PatientIds[i * 2 + 1],
                    InfertilityDurationMonths = 12 + rng.Next(0, 60),
                    InfertilityCause = causes[i % causes.Length],
                    MarriageDate = ctx.Now.AddYears(-rng.Next(2, 10)).AddDays(-rng.Next(1, 365)),
                    Notes = "Đã làm đầy đủ XN tiền phẫu",
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(1, 18)), UpdatedAt = ctx.Now
                });
            }
            _db.IvfPatientCouples.AddRange(couples);
            await _db.SaveChangesAsync();
            summary["IvfPatientCouples"] = couples.Count;

            var cycles = new List<IvfCycle>();
            var protocols = new[] { "Long protocol (GnRH agonist)", "Antagonist protocol", "Mild stimulation", "Natural cycle" };
            for (int i = 0; i < couples.Count; i++)
            {
                int nc = rng.Next(1, 4);
                for (int n = 1; n <= nc; n++)
                {
                    var start = ctx.Now.AddMonths(-rng.Next(0, 12));
                    cycles.Add(new IvfCycle
                    {
                        Id = Guid.NewGuid(),
                        CoupleId = couples[i].Id,
                        CycleNumber = n,
                        StartDate = start,
                        Status = n == nc ? rng.Next(1, 8) : 6, // latest = active, older = completed
                        Protocol = protocols[(i + n) % protocols.Length],
                        DoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                        Notes = "Chu kỳ kích thích buồng trứng theo phác đồ chuẩn",
                        CreatedAt = start, UpdatedAt = ctx.Now
                    });
                }
            }
            _db.IvfCycles.AddRange(cycles);
            await _db.SaveChangesAsync();
            summary["IvfCycles"] = cycles.Count;
        }
        } catch (Exception ex) { errors["IvfLab"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // FixedAssets — asset management
        try {
        if (!await _db.FixedAssets.AnyAsync() && ctx.DepartmentIds.Count > 0)
        {
            var catalog = new (string Name, decimal Value, int Life)[] {
                ("Máy in laser đa năng Canon", 15_000_000m, 60),
                ("Máy chiếu Epson EB-X41", 18_000_000m, 60),
                ("Điều hoà Daikin 18000BTU", 12_000_000m, 96),
                ("Bàn làm việc văn phòng", 3_500_000m, 120),
                ("Tủ đựng hồ sơ sắt 5 ngăn", 5_200_000m, 120),
                ("Máy tính để bàn Dell Optiplex", 20_000_000m, 60),
                ("Màn hình LG 27 inch", 5_800_000m, 60),
                ("Ghế xoay nhân viên", 2_100_000m, 60),
                ("Máy photocopy Ricoh", 65_000_000m, 84),
                ("Ô tô tải chuyên dụng Hyundai", 750_000_000m, 120),
                ("Xe cấp cứu Ford Transit", 1_200_000_000m, 120),
                ("Bàn khám Ng­oại (thép không gỉ)", 22_000_000m, 120),
                ("Tủ thuốc di động 3 tầng", 8_500_000m, 96),
                ("Máy lọc nước công nghiệp", 35_000_000m, 84),
                ("Máy giặt công nghiệp 30kg", 120_000_000m, 96),
                ("Tủ lạnh bảo quản vắc-xin", 45_000_000m, 120),
                ("Đèn cấp cứu âm trần", 8_000_000m, 120),
                ("Hệ thống camera giám sát 16ch", 65_000_000m, 84),
                ("Server Dell PowerEdge R740", 350_000_000m, 84),
                ("Switch mạng Cisco 48-port", 45_000_000m, 84),
            };
            var assets = new List<FixedAsset>();
            for (int i = 0; i < catalog.Length; i++)
            {
                var c = catalog[i];
                var purchase = ctx.Now.AddMonths(-rng.Next(3, 72));
                int monthsUsed = (int)((ctx.Now - purchase).TotalDays / 30);
                decimal monthly = c.Value / c.Life;
                decimal accum = Math.Min(c.Value, monthly * monthsUsed);
                assets.Add(new FixedAsset
                {
                    Id = Guid.NewGuid(),
                    AssetCode = NextCode("TS", i + 1, 4),
                    AssetName = c.Name,
                    AssetGroupId = null,
                    OriginalValue = c.Value,
                    CurrentValue = c.Value - accum,
                    PurchaseDate = purchase,
                    DepreciationMethod = 1,
                    UsefulLifeMonths = c.Life,
                    MonthlyDepreciation = monthly,
                    AccumulatedDepreciation = accum,
                    DepartmentId = ctx.DepartmentIds[i % ctx.DepartmentIds.Count],
                    LocationDescription = $"Phòng {rng.Next(101, 599)}, Tầng {rng.Next(1, 6)}",
                    Status = i % 15 == 14 ? 3 : 1, // 1=InUse, 3=WaitingDisposal
                    SerialNumber = $"SN{rng.Next(10000, 99999):D5}",
                    QrCode = Guid.NewGuid().ToString("N")[..12],
                    Notes = null,
                    CreatedAt = purchase, UpdatedAt = ctx.Now
                });
            }
            _db.FixedAssets.AddRange(assets);
            await _db.SaveChangesAsync();
            summary["FixedAssets"] = assets.Count;
        }
        } catch (Exception ex) { errors["FixedAssets"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // Training classes
        try {
        if (!await _db.TrainingClasses.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var courses = new (string Code, string Name, int Type, decimal Hours, decimal Fee)[] {
                ("CME-2026-01", "Cập nhật điều trị đái tháo đường type 2", 3, 8m, 500_000m),
                ("CME-2026-02", "Kháng sinh đồ và kháng thuốc — hướng dẫn mới", 3, 16m, 1_200_000m),
                ("INT-2026-01", "Đào tạo hồi sức tích cực căn bản", 1, 40m, 0m),
                ("INT-2026-02", "Thực hành quy trình kiểm soát nhiễm khuẩn", 1, 24m, 0m),
                ("EXT-2026-01", "Hội nghị Tim mạch học Việt Nam 2026", 2, 16m, 2_000_000m),
                ("EXT-2026-02", "Đào tạo HL7-FHIR cho nhân viên CNTT y tế", 2, 40m, 3_500_000m),
                ("DIR-2026-01", "Chỉ đạo tuyến: Siêu âm sản khoa cơ bản", 4, 40m, 0m),
                ("DIR-2026-02", "Chỉ đạo tuyến: Cấp cứu chấn thương", 4, 32m, 0m),
                ("CME-2026-03", "Điều trị đích ung thư phổi không tế bào nhỏ", 3, 12m, 1_500_000m),
                ("INT-2026-03", "Kỹ năng giao tiếp với người bệnh", 1, 16m, 0m),
            };
            var classes = new List<TrainingClass>();
            for (int i = 0; i < courses.Length; i++)
            {
                var c = courses[i];
                var start = ctx.Now.AddDays(rng.Next(-120, 60));
                classes.Add(new TrainingClass
                {
                    Id = Guid.NewGuid(),
                    ClassCode = c.Code,
                    ClassName = c.Name,
                    TrainingType = c.Type,
                    StartDate = start,
                    EndDate = start.AddHours((double)c.Hours + rng.Next(0, 5) * 24),
                    MaxStudents = c.Type == 1 ? 30 : c.Type == 2 ? 100 : 50,
                    Location = c.Type == 2 ? "Khách sạn Daewoo HN" : "Hội trường tầng 5, BV",
                    InstructorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    Description = $"Khoá đào tạo {c.Name}",
                    CreditHours = c.Hours,
                    Status = start < ctx.Now.AddDays(-7) ? 3 : start < ctx.Now ? 2 : 1,
                    Fee = c.Fee,
                    CreatedAt = start.AddMonths(-1), UpdatedAt = ctx.Now
                });
            }
            _db.TrainingClasses.AddRange(classes);
            await _db.SaveChangesAsync();
            summary["TrainingClasses"] = classes.Count;
        }
        } catch (Exception ex) { errors["TrainingClasses"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // RadiologyRequests — CDHA today orders for /radiology waiting list
        try {
        if (await _db.RadiologyRequests.CountAsync() < 15 && ctx.PatientIds.Count > 0 && ctx.DoctorIds.Count > 0)
        {
            // Pick radiology-type services (ServiceType 3 or 4 typically); fallback: any active service
            var radioSvcs = await _db.Services
                .Where(s => s.IsActive && (s.ServiceType == 3 || s.ServiceType == 4 || s.ServiceName!.Contains("X-quang") ||
                            s.ServiceName!.Contains("Siêu âm") || s.ServiceName!.Contains("CT") || s.ServiceName!.Contains("MRI")))
                .Select(s => new { s.Id, s.ServiceCode, s.ServiceName, s.UnitPrice })
                .Take(20).ToListAsync();
            if (radioSvcs.Count == 0)
                radioSvcs = await _db.Services.Where(s => s.IsActive)
                    .Select(s => new { s.Id, s.ServiceCode, s.ServiceName, s.UnitPrice })
                    .Take(10).ToListAsync();
            if (radioSvcs.Count > 0)
            {
                var clinical = new[] {
                    "Đau ngực trái, khó thở, cần chẩn đoán tim mạch",
                    "Sốt + ho kéo dài, nghi viêm phổi",
                    "Đau bụng vùng mạng sườn phải, nghi sỏi thận",
                    "Chấn thương đầu do TNGT, cần đánh giá sọ não",
                    "Đau khớp gối sau chấn thương, đánh giá dây chằng",
                    "Đau lưng cấp, cần loại trừ thoát vị đĩa đệm",
                    "Theo dõi khối u gan đã phát hiện",
                    "Khám sức khoẻ định kỳ, X-quang phổi",
                    "Đau bụng kinh kéo dài, siêu âm tiểu khung",
                    "Ho kéo dài > 3 tuần, chẩn đoán lao phổi?",
                };
                var reqs = new List<RadiologyRequest>();
                int seq = 0;
                for (int i = 0; i < 20 && i < ctx.PatientIds.Count; i++)
                {
                    seq++;
                    var svc = radioSvcs[i % radioSvcs.Count];
                    var when = DateTime.Today.AddHours(7 + (i % 10)).AddMinutes(rng.Next(0, 59));
                    reqs.Add(new RadiologyRequest
                    {
                        Id = Guid.NewGuid(),
                        RequestCode = NextCode("RIS", seq, 5),
                        PatientId = ctx.PatientIds[i],
                        ServiceId = svc.Id,
                        RequestingDoctorId = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                        RequestDate = when,
                        Priority = i % 7 == 0 ? 3 : i % 5 == 0 ? 2 : 1,
                        Status = i % 4 switch { 0 => 0, 1 => 1, 2 => 2, _ => 3 },
                        ClinicalInfo = clinical[i % clinical.Length],
                        BodyPart = svc.ServiceName,
                        Contrast = i % 5 == 0,
                        ScheduledDate = when.AddHours(rng.Next(1, 4)),
                        PatientType = i % 3 == 0 ? 2 : 1,
                        TotalAmount = svc.UnitPrice,
                        InsuranceAmount = i % 3 == 0 ? 0 : svc.UnitPrice * 0.8m,
                        PatientAmount = i % 3 == 0 ? svc.UnitPrice : svc.UnitPrice * 0.2m,
                        CreatedAt = when, UpdatedAt = ctx.Now
                    });
                }
                _db.RadiologyRequests.AddRange(reqs);
                await _db.SaveChangesAsync();
                summary["RadiologyRequests"] = reqs.Count;
            }
        }
        } catch (Exception ex) { errors["RadiologyRequests"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // #14e: populate LabRequests (model 2) đã gỡ — danh sách chờ /laboratory dùng ServiceRequests (model 1, seed ở DailySeed)

        // ProcurementRequests — /procurement page
        try {
        if (!await _db.ProcurementRequests.AnyAsync() && ctx.DoctorIds.Count > 0)
        {
            var reqs = new List<ProcurementRequest>();
            var notes = new[] {
                "Yêu cầu bổ sung thuốc cấp cứu định kỳ quý",
                "Đề xuất mua vật tư tiêu hao cho phòng mổ",
                "Bổ sung hoá chất xét nghiệm sinh hoá",
                "Mua bổ sung găng tay y tế, khẩu trang",
                "Đề xuất nhập thuốc BHYT thiếu tháng này",
                "Mua dụng cụ tiệt khuẩn, vật tư buồng bệnh",
                "Bổ sung phim X-quang, thuốc cản quang",
                "Mua thay thế pin monitor, cáp ECG",
                "Yêu cầu mua thêm cồn sát khuẩn 70°",
                "Đề xuất bổ sung bơm tiêm 5ml, 10ml, kim luồn",
            };
            for (int i = 0; i < notes.Length; i++)
            {
                int status = i % 5;
                var requestDate = ctx.Now.AddDays(-rng.Next(1, 90));
                reqs.Add(new ProcurementRequest
                {
                    Id = Guid.NewGuid(),
                    RequestCode = NextCode("DX", i + 1, 4),
                    RequestDate = requestDate,
                    DepartmentId = ctx.DepartmentIds.Count > 0 ? ctx.DepartmentIds[i % ctx.DepartmentIds.Count] : null,
                    RequestedById = ctx.DoctorIds[i % ctx.DoctorIds.Count],
                    Status = status,
                    TotalAmount = rng.Next(5_000_000, 50_000_000),
                    Notes = notes[i],
                    ApprovedById = status >= 2 ? ctx.DoctorIds[(i + 1) % ctx.DoctorIds.Count] : null,
                    ApprovedDate = status >= 2 ? requestDate.AddDays(rng.Next(1, 5)) : null,
                    RejectReason = status == 3 ? "Chưa phù hợp với ngân sách quý" : null,
                    CreatedAt = requestDate, UpdatedAt = ctx.Now
                });
            }
            _db.ProcurementRequests.AddRange(reqs);
            await _db.SaveChangesAsync();
            summary["ProcurementRequests"] = reqs.Count;
        }
        } catch (Exception ex) { errors["ProcurementRequests"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

        // HIE Connections — /health-exchange
        try {
        if (!await _db.HIEConnections.AnyAsync())
        {
            var conns = new (string Name, string Type, string Url, string AuthType, string Status)[] {
                ("Cổng giám định BHXH Việt Nam", "BHXH", "https://api.bhxh.gov.vn/gd/v2", "Certificate", "Active"),
                ("Cổng Y tế điện tử - Bộ Y Tế", "BYT", "https://dqgvn.byt.gov.vn/api", "OAuth2", "Active"),
                ("Sở Y tế TP. Hồ Chí Minh", "SYT", "https://syt.hcm.gov.vn/hie", "APIKey", "Active"),
                ("Bệnh viện Chợ Rẫy - Chuyển tuyến", "Hospital", "https://choray.hcm.gov.vn/referral-api", "OAuth2", "Active"),
                ("Bệnh viện Bạch Mai - Hội chẩn", "Hospital", "https://bachmai.vn/tele-api", "OAuth2", "Inactive"),
                ("Trung tâm Giám định BHXH TP.HCM", "BHXH", "https://bhxh-hcm.gov.vn/gd", "Certificate", "Active"),
                ("Đơn thuốc điện tử quốc gia", "BYT", "https://donthuocquocgia.kcb.vn/api", "OAuth2", "Active"),
            };
            var list = new List<HIEConnection>();
            for (int i = 0; i < conns.Length; i++)
            {
                var c = conns[i];
                bool active = c.Status == "Active";
                list.Add(new HIEConnection
                {
                    Id = Guid.NewGuid(),
                    ConnectionName = c.Name,
                    ConnectionType = c.Type,
                    EndpointUrl = c.Url,
                    AuthType = c.AuthType,
                    ClientId = c.AuthType == "OAuth2" ? $"his-bv-{rng.Next(1000, 9999)}" : null,
                    ClientSecretEncrypted = c.AuthType == "OAuth2" ? "***encrypted***" : null,
                    CertificatePath = c.AuthType == "Certificate" ? $"/certs/his-{i+1}.pfx" : null,
                    Status = c.Status,
                    LastSuccessfulConnection = active ? ctx.Now.AddHours(-rng.Next(1, 48)) : ctx.Now.AddDays(-rng.Next(7, 90)),
                    LastFailedConnection = active ? null : ctx.Now.AddHours(-rng.Next(1, 24)),
                    LastErrorMessage = active ? null : "Connection timeout after 30s",
                    IsActive = active,
                    CreatedAt = ctx.Now.AddMonths(-rng.Next(3, 24)),
                    UpdatedAt = ctx.Now
                });
            }
            _db.HIEConnections.AddRange(list);
            await _db.SaveChangesAsync();
            summary["HIEConnections"] = list.Count;
        }
        } catch (Exception ex) { errors["HIEConnections"] = ex.GetBaseException().Message; _db.ChangeTracker.Clear(); }

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

        return Ok(new { module = "finishing", inserted = summary, errors });
    }

}
