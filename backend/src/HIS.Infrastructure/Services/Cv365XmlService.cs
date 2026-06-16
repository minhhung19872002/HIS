using System.Globalization;
using System.Text;
using System.Xml;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Interface xuất/nhập XML HSBA theo Công văn 365/KCB-CNTT
/// (chuẩn trao đổi hồ sơ bệnh án điện tử liên cơ sở).
/// </summary>
public interface ICv365XmlService
{
    /// <summary>
    /// Xuất XML HSBA theo chuẩn CV365 cho một MedicalRecord.
    /// </summary>
    /// <param name="medicalRecordId">Id hồ sơ bệnh án.</param>
    /// <returns>Chuỗi XML UTF-8 theo cấu trúc CV365.</returns>
    /// <exception cref="KeyNotFoundException">Khi không tìm thấy hồ sơ.</exception>
    Task<string> ExportRecordXmlAsync(Guid medicalRecordId);
}

/// <summary>
/// Triển khai xuất XML HSBA theo cấu trúc CV365.
///
/// Cấu trúc XML 6 nhóm:
///   1. HanhChinh     — thông tin hành chính bệnh nhân + hồ sơ
///   2. ChanDoan      — chẩn đoán chính/phụ, ICD-10, kết quả điều trị
///   3. DienBien      — diễn biến lâm sàng (từ Examinations)
///   4. Thuoc         — đơn thuốc (Prescriptions + PrescriptionDetails)
///   5. CLS           — cận lâm sàng — chỉ ghi nhận ServiceRequests đã hoàn thành
///   6. ThongTinThem  — số bảo hiểm, loại điều trị, tuyến chuyển viện
///
/// Import: defer — CV365 import cần thêm entity mapping + merge-logic phức tạp hơn;
/// ghi nhận trong Issue #88 để làm tiếp phiên sau khi có yêu cầu thực tế.
/// </summary>
public class Cv365XmlService : ICv365XmlService
{
    private readonly HISDbContext _db;
    private readonly ILogger<Cv365XmlService> _logger;

    // Namespace CV365 (placeholder — thay bằng namespace chính thức của Bộ Y tế khi có văn bản)
    private const string Cv365Ns = "urn:vn:gov:moh:cv365:hsba:1.0";
    private const string SchemaVersion = "1.0";

    public Cv365XmlService(HISDbContext db, ILogger<Cv365XmlService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<string> ExportRecordXmlAsync(Guid medicalRecordId)
    {
        // Load hồ sơ + các navigation cần thiết
        var record = await _db.MedicalRecords
            .AsNoTracking()
            .Where(r => r.Id == medicalRecordId && !r.IsDeleted)
            .Include(r => r.Patient)
            .Include(r => r.Department)
            .Include(r => r.Doctor)
            .Include(r => r.Examinations.Where(e => !e.IsDeleted))
                .ThenInclude(e => e.Department)
            .Include(r => r.Prescriptions.Where(p => !p.IsDeleted))
                .ThenInclude(p => p.Details)
                    .ThenInclude(d => d.Medicine)
            .Include(r => r.ServiceRequests.Where(s => !s.IsDeleted))
                .ThenInclude(sr => sr.Details)
                    .ThenInclude(srd => srd.Service)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"MedicalRecord {medicalRecordId} not found.");

        _logger.LogInformation(
            "Cv365XmlService: exporting recordId={Id} code={Code}",
            record.Id, record.MedicalRecordCode);

        var sb = new StringBuilder();
        var settings = new XmlWriterSettings
        {
            Encoding = new UTF8Encoding(false), // UTF-8 no BOM
            Indent = true,
            IndentChars = "  ",
            Async = true
        };

        using var writer = XmlWriter.Create(sb, settings);
        await writer.WriteStartDocumentAsync();

        writer.WriteStartElement("HSBA", Cv365Ns);
        writer.WriteAttributeString("phienBan", SchemaVersion);
        writer.WriteAttributeString("ngayXuat", DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture));

        WriteHanhChinh(writer, record);
        WriteChanDoan(writer, record);
        WriteDienBien(writer, record);
        WriteThuoc(writer, record);
        WriteCls(writer, record);
        WriteThongTinThem(writer, record);

        writer.WriteEndElement(); // HSBA
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        return sb.ToString();
    }

    // -------------------------------------------------------------------------
    // Nhóm 1: Hành chính
    // -------------------------------------------------------------------------
    private static void WriteHanhChinh(XmlWriter w, MedicalRecord r)
    {
        var p = r.Patient;

        w.WriteStartElement("HanhChinh", Cv365Ns);

        // Bệnh nhân
        w.WriteStartElement("BenhNhan", Cv365Ns);
        WriteEl(w, "maBN", p?.PatientCode);
        WriteEl(w, "hoTen", p?.FullName);
        WriteEl(w, "ngaySinh", p?.DateOfBirth?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                               ?? p?.YearOfBirth?.ToString(CultureInfo.InvariantCulture));
        WriteEl(w, "gioiTinh", GenderName(p?.Gender ?? 0));
        WriteEl(w, "soCmnd", p?.IdentityNumber);
        WriteEl(w, "soDienThoai", p?.PhoneNumber);
        WriteEl(w, "diaChi", BuildAddress(p));
        WriteEl(w, "maPhuongXa", p?.WardCode);
        WriteEl(w, "maQuanHuyen", p?.DistrictCode);
        WriteEl(w, "maTinhThanh", p?.ProvinceCode);
        WriteEl(w, "ngheNghiep", p?.Occupation);
        WriteEl(w, "danToc", p?.EthnicName);
        WriteEl(w, "quocTich", p?.NationalityName ?? "Việt Nam");
        w.WriteEndElement(); // BenhNhan

        // Hồ sơ
        w.WriteStartElement("HoSo", Cv365Ns);
        WriteEl(w, "soHoSo", r.MedicalRecordCode);
        WriteEl(w, "soVaoVien", r.InpatientCode);
        WriteEl(w, "ngayVao", r.AdmissionDate.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture));
        WriteEl(w, "ngayRa", r.DischargeDate?.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture));
        WriteEl(w, "loaiBenhNhan", PatientTypeName(r.PatientType));
        WriteEl(w, "loaiDieuTri", TreatmentTypeName(r.TreatmentType));
        WriteEl(w, "khoaDieuTri", r.Department?.DepartmentName);
        WriteEl(w, "bacSiDieuTri", r.Doctor?.FullName);
        w.WriteEndElement(); // HoSo

        w.WriteEndElement(); // HanhChinh
    }

    // -------------------------------------------------------------------------
    // Nhóm 2: Chẩn đoán
    // -------------------------------------------------------------------------
    private static void WriteChanDoan(XmlWriter w, MedicalRecord r)
    {
        w.WriteStartElement("ChanDoan", Cv365Ns);
        WriteEl(w, "chanDoanNhap", r.InitialDiagnosis);
        WriteEl(w, "chanDoanChinh", r.MainDiagnosis);
        WriteEl(w, "maIcdChinh", r.MainIcdCode);
        WriteEl(w, "chanDoanPhu", r.SubDiagnosis);
        WriteEl(w, "maIcdPhu", r.SubIcdCodes);   // JSON array hoặc CSV
        WriteEl(w, "nguyenNhanNgoai", r.ExternalCause);
        WriteEl(w, "ketQuaDieuTri", TreatmentResultName(r.TreatmentResult));
        WriteEl(w, "loaiRaVien", DischargeTypeName(r.DischargeType));
        WriteEl(w, "ghiChuRaVien", r.DischargeNote);
        w.WriteEndElement(); // ChanDoan
    }

    // -------------------------------------------------------------------------
    // Nhóm 3: Diễn biến lâm sàng (Examinations)
    // -------------------------------------------------------------------------
    private static void WriteDienBien(XmlWriter w, MedicalRecord r)
    {
        w.WriteStartElement("DienBien", Cv365Ns);

        foreach (var exam in r.Examinations.OrderBy(e => e.StartTime ?? e.CreatedAt))
        {
            w.WriteStartElement("LuotKham", Cv365Ns);
            WriteEl(w, "maLuotKham", exam.Id.ToString());
            WriteEl(w, "thoiGianKham", (exam.StartTime ?? exam.CreatedAt)
                        .ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture));
            WriteEl(w, "khoaKham", exam.Department?.DepartmentName);

            // Sinh hiệu
            w.WriteStartElement("SinhHieu", Cv365Ns);
            WriteElDecimal(w, "nhietDo", exam.Temperature);
            WriteElInt(w, "mach", exam.Pulse);
            WriteElInt(w, "huyetApTamThu", exam.BloodPressureSystolic);
            WriteElInt(w, "huyetApTamTruong", exam.BloodPressureDiastolic);
            WriteElInt(w, "nhipTho", exam.RespiratoryRate);
            WriteElDecimal(w, "chieuCao", exam.Height);
            WriteElDecimal(w, "canNang", exam.Weight);
            WriteElDecimal(w, "spO2", exam.SpO2);
            w.WriteEndElement(); // SinhHieu

            // Khám bệnh
            WriteEl(w, "lyDoKham", exam.ChiefComplaint);
            WriteEl(w, "benhSu", exam.PresentIllness);
            WriteEl(w, "khamToanThan", exam.PhysicalExamination);
            WriteEl(w, "khamBoPhan", exam.SystemsReview);

            // Chẩn đoán lượt khám
            WriteEl(w, "chanDoanBanDau", exam.InitialDiagnosis);
            WriteEl(w, "chanDoanChinh", exam.MainDiagnosis);
            WriteEl(w, "maIcdChinh", exam.MainIcdCode);

            // Kết luận
            WriteEl(w, "ketLuan", exam.ConclusionNote);
            WriteEl(w, "ngayTaiKham", exam.FollowUpDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));

            w.WriteEndElement(); // LuotKham
        }

        w.WriteEndElement(); // DienBien
    }

    // -------------------------------------------------------------------------
    // Nhóm 4: Thuốc (Prescriptions)
    // -------------------------------------------------------------------------
    private static void WriteThuoc(XmlWriter w, MedicalRecord r)
    {
        w.WriteStartElement("DonThuoc", Cv365Ns);

        foreach (var rx in r.Prescriptions.OrderBy(p => p.PrescriptionDate))
        {
            w.WriteStartElement("DonThuocChiTiet", Cv365Ns);
            WriteEl(w, "maDon", rx.PrescriptionCode);
            WriteEl(w, "ngayKeDon", rx.PrescriptionDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            WriteEl(w, "chanDoan", rx.DiagnosisName ?? rx.DiagnosisCode);
            WriteEl(w, "loaiDon", PrescriptionTypeName(rx.PrescriptionType));

            foreach (var d in rx.Details.OrderBy(x => x.CreatedAt))
            {
                w.WriteStartElement("Thuoc", Cv365Ns);
                WriteEl(w, "tenThuoc", d.Medicine?.MedicineName);
                WriteEl(w, "hamLuong", d.Medicine?.Concentration);
                WriteEl(w, "donVi", d.Unit ?? d.Medicine?.Unit);
                WriteEl(w, "soLuong", d.Quantity.ToString(CultureInfo.InvariantCulture));
                WriteEl(w, "lieuDung", d.Dosage);
                WriteEl(w, "tanSuat", d.Frequency);
                WriteEl(w, "duongDung", d.Route);
                WriteEl(w, "cachDung", d.Usage ?? d.UsageInstructions);
                WriteEl(w, "soNgayDung", d.Days.ToString(CultureInfo.InvariantCulture));
                WriteEl(w, "sang", d.MorningDose?.ToString(CultureInfo.InvariantCulture));
                WriteEl(w, "trua", d.NoonDose?.ToString(CultureInfo.InvariantCulture));
                WriteEl(w, "chieu", d.EveningDose?.ToString(CultureInfo.InvariantCulture));
                WriteEl(w, "toi", d.NightDose?.ToString(CultureInfo.InvariantCulture));
                w.WriteEndElement(); // Thuoc
            }

            w.WriteEndElement(); // DonThuocChiTiet
        }

        w.WriteEndElement(); // DonThuoc
    }

    // -------------------------------------------------------------------------
    // Nhóm 5: Cận lâm sàng (ServiceRequests)
    // -------------------------------------------------------------------------
    private static void WriteCls(XmlWriter w, MedicalRecord r)
    {
        w.WriteStartElement("CanLamSang", Cv365Ns);

        // Chỉ xuất SR đã hoàn thành (Status = 2 per ServiceRequest convention)
        var completedRequests = r.ServiceRequests
            .Where(sr => sr.Status >= 2)
            .OrderBy(sr => sr.CreatedAt);

        foreach (var sr in completedRequests)
        {
            w.WriteStartElement("YeuCauCLS", Cv365Ns);
            WriteEl(w, "maYeuCau", sr.Id.ToString());
            WriteEl(w, "ngayYeuCau", sr.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture));

            foreach (var detail in sr.Details.OrderBy(d => d.CreatedAt))
            {
                w.WriteStartElement("ChiTiet", Cv365Ns);
                WriteEl(w, "tenDichVu", detail.Service?.ServiceName);
                WriteEl(w, "maDichVu", detail.Service?.ServiceCode);
                WriteEl(w, "ketQua", detail.Result);
                WriteEl(w, "ghiChu", detail.Note);
                w.WriteEndElement(); // ChiTiet
            }

            w.WriteEndElement(); // YeuCauCLS
        }

        w.WriteEndElement(); // CanLamSang
    }

    // -------------------------------------------------------------------------
    // Nhóm 6: Thông tin thêm (BHYT, tuyến, chuyển viện)
    // -------------------------------------------------------------------------
    private static void WriteThongTinThem(XmlWriter w, MedicalRecord r)
    {
        var p = r.Patient;

        w.WriteStartElement("ThongTinThem", Cv365Ns);

        // BHYT
        w.WriteStartElement("BhytInfo", Cv365Ns);
        WriteEl(w, "soTheBhyt", r.InsuranceNumber ?? p?.InsuranceNumber);
        WriteEl(w, "ngayHetHan", r.InsuranceExpireDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        WriteEl(w, "maCskcbBanDau", r.InsuranceFacilityCode ?? p?.InsuranceFacilityCode);
        WriteEl(w, "tuyenKcb", InsuranceRouteName(r.InsuranceRightRoute));
        WriteEl(w, "mucHuong", r.InsuranceCoverageRate?.ToString(CultureInfo.InvariantCulture));
        WriteEl(w, "bhyt5Nam", r.InsuranceFiveYearContinuous ? "true" : "false");
        w.WriteEndElement(); // BhytInfo

        // Giấy chuyển viện (đến)
        if (!string.IsNullOrWhiteSpace(r.ReferralFromFacilityCode))
        {
            w.WriteStartElement("ChuyenVienDen", Cv365Ns);
            WriteEl(w, "maCskcbChuyen", r.ReferralFromFacilityCode);
            WriteEl(w, "tenCskcbChuyen", r.ReferralFromFacilityName);
            WriteEl(w, "maIcdChuyen", r.ReferralIcdCode);
            WriteEl(w, "ngayChuyen", r.ReferralDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            w.WriteEndElement(); // ChuyenVienDen
        }

        // Lấy examination cuối để đọc thông tin chuyển viện ra
        var lastExam = r.Examinations
            .Where(e => !string.IsNullOrWhiteSpace(e.TransferToHospital))
            .OrderByDescending(e => e.StartTime ?? e.CreatedAt)
            .FirstOrDefault();

        if (lastExam != null)
        {
            w.WriteStartElement("ChuyenVienRa", Cv365Ns);
            WriteEl(w, "tenCskcbChuyen", lastExam.TransferToHospital);
            WriteEl(w, "phuongTien", lastExam.TransferTransportMethod);
            WriteEl(w, "maIcdChuyen", lastExam.TransferDiagnosisCode);
            WriteEl(w, "tenChanDoanChuyen", lastExam.TransferDiagnosisName);
            WriteEl(w, "lyDoChuyen", lastExam.TransferReason);
            w.WriteEndElement(); // ChuyenVienRa
        }

        w.WriteEndElement(); // ThongTinThem
    }

    // -------------------------------------------------------------------------
    // Helper writers
    // -------------------------------------------------------------------------
    private static void WriteEl(XmlWriter w, string name, string? value)
    {
        if (value != null)
            w.WriteElementString(name, Cv365Ns, value);
    }

    private static void WriteElDecimal(XmlWriter w, string name, decimal? value)
    {
        if (value.HasValue)
            w.WriteElementString(name, Cv365Ns, value.Value.ToString(CultureInfo.InvariantCulture));
    }

    private static void WriteElInt(XmlWriter w, string name, int? value)
    {
        if (value.HasValue)
            w.WriteElementString(name, Cv365Ns, value.Value.ToString(CultureInfo.InvariantCulture));
    }

    private static string BuildAddress(Patient? p) =>
        string.Join(", ", new[]
        {
            p?.Address, p?.WardName, p?.DistrictName, p?.ProvinceName
        }.Where(s => !string.IsNullOrWhiteSpace(s)));

    private static string GenderName(int g) => g switch
    {
        1 => "Nam", 2 => "Nữ", 3 => "Khác", _ => "Không xác định"
    };

    private static string PatientTypeName(int t) => t switch
    {
        1 => "BHYT", 2 => "Viện phí", 3 => "Dịch vụ", 4 => "Khám sức khỏe", _ => t.ToString()
    };

    private static string TreatmentTypeName(int t) => t switch
    {
        1 => "Ngoại trú", 2 => "Nội trú", 3 => "Cấp cứu", _ => t.ToString()
    };

    private static string TreatmentResultName(int? r) => r switch
    {
        1 => "Khỏi", 2 => "Đỡ", 3 => "Không thay đổi", 4 => "Nặng hơn", 5 => "Tử vong",
        null => "", _ => r.ToString()!
    };

    private static string DischargeTypeName(int? t) => t switch
    {
        1 => "Ra viện", 2 => "Chuyển viện", 3 => "Trốn viện", 4 => "Xin về", 5 => "Tử vong",
        null => "", _ => t.ToString()!
    };

    private static string InsuranceRouteName(int r) => r switch
    {
        1 => "Đúng tuyến", 2 => "Trái tuyến", 3 => "Thông tuyến", _ => r.ToString()
    };

    private static string PrescriptionTypeName(int t) => t switch
    {
        1 => "Ngoại trú", 2 => "Nội trú", 3 => "Nhà thuốc", 4 => "YHCT", _ => t.ToString()
    };
}
