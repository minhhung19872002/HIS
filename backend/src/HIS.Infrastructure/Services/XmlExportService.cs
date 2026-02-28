using System.Globalization;
using System.Text;
using System.Xml;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Insurance;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Generates BHXH-compliant XML files from DTO lists using XmlWriter.
/// UTF-8 without BOM, Vietnamese diacritics preserved, BHXH date format (yyyyMMddHHmm).
/// Internal service used by InsuranceXmlService -- no interface needed.
/// </summary>
public class XmlExportService
{
    private readonly ILogger<XmlExportService> _logger;

    public XmlExportService(ILogger<XmlExportService> logger)
    {
        _logger = logger;
    }

    #region Helpers

    private static XmlWriterSettings CreateSettings() => new()
    {
        Encoding = new UTF8Encoding(false), // UTF-8 without BOM per BHXH spec
        Indent = true,
        IndentChars = "  ",
        Async = true
    };

    /// <summary>
    /// Format DateTime to BHXH convention: yyyyMMddHHmm (per research pitfall #2)
    /// </summary>
    private static string ToBhxhDate(DateTime? dt) =>
        dt?.ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture) ?? "";

    /// <summary>
    /// Format decimal with 2 decimal places using invariant culture (per research pitfall #5)
    /// </summary>
    private static string ToDecimal(decimal value) =>
        Math.Round(value, 2).ToString(CultureInfo.InvariantCulture);

    private static string ToDecimalNullable(decimal? value) =>
        value.HasValue ? ToDecimal(value.Value) : "";

    private static string ToInt(int value) =>
        value.ToString(CultureInfo.InvariantCulture);

    private static string ToIntNullable(int? value) =>
        value?.ToString(CultureInfo.InvariantCulture) ?? "";

    private static void WriteElement(XmlWriter w, string name, string? value) =>
        w.WriteElementString(name, value ?? "");

    #endregion

    #region XML1 - Thong tin chung ho so KCB

    public async Task<byte[]> GenerateXml1FileAsync(List<Xml1MedicalRecordDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_THONG_TIN");

        foreach (var r in records)
        {
            writer.WriteStartElement("THONG_TIN");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", "1");
            WriteElement(writer, "MA_BN", r.MaBn);
            WriteElement(writer, "HO_TEN", r.HoTen);
            WriteElement(writer, "NGAY_SINH", ToBhxhDate(r.NgaySinh));
            WriteElement(writer, "GIOI_TINH", ToInt(r.GioiTinh));
            WriteElement(writer, "DIA_CHI", r.DiaChi);
            WriteElement(writer, "MA_THE", r.MaThe);
            WriteElement(writer, "MA_DKBD", r.MaDkbd);
            WriteElement(writer, "GT_THE_TU", ToBhxhDate(r.GtTheTu));
            WriteElement(writer, "GT_THE_DEN", ToBhxhDate(r.GtTheDen));
            WriteElement(writer, "MIEN_CUNG_CT", r.MienCungCt ?? "");
            WriteElement(writer, "MA_BENH_CHINH", r.MaBenhChinh);
            WriteElement(writer, "MA_BENH_KT", r.MaBenhKt ?? "");
            WriteElement(writer, "MA_BENH_YHCT", r.MaBenhYhct ?? "");
            WriteElement(writer, "MA_PTTT_QT", r.MaPtttQt ?? "");
            WriteElement(writer, "MA_DOI_TUONG", r.MaDoiTuong ?? "");
            WriteElement(writer, "MA_LOAI_KCB", r.MaLoaiKcb);
            WriteElement(writer, "MA_KHOA", r.MaKhoa);
            WriteElement(writer, "MA_CSKCB", ""); // Will be set at export level from BhxhGatewayOptions
            WriteElement(writer, "MA_KHUVUC", r.MaKhuvuc ?? "");
            WriteElement(writer, "MA_PHONG", r.MaPhong);
            WriteElement(writer, "CAN_NANG", r.CanNang ?? "");
            WriteElement(writer, "NGAY_VAO", ToBhxhDate(r.NgayVao));
            WriteElement(writer, "NGAY_RA", ToBhxhDate(r.NgayRa));
            WriteElement(writer, "SO_NGAY_DTRI", ToInt(r.SoNgayDt));
            WriteElement(writer, "KET_QUA_DTRI", r.KetQuaDt);
            WriteElement(writer, "TINH_TRANG_RV", ToInt(r.TinhTrangRv));
            WriteElement(writer, "T_TONGCHI", ToDecimal(r.TienKham + r.TienGiuong + r.TienNgoaitruth + r.TienBhyt + r.TienBnCct + r.TienNguoibenh));
            WriteElement(writer, "T_BHYT_TT", ToDecimal(r.TienBhyt));
            WriteElement(writer, "T_BN_CCT", ToDecimal(r.TienBnCct));
            WriteElement(writer, "T_NGUOI_BENH", ToDecimal(r.TienNguoibenh));
            WriteElement(writer, "T_TIEN_KHAM", ToDecimal(r.TienKham));
            WriteElement(writer, "T_TIEN_GIUONG", ToDecimal(r.TienGiuong));
            WriteElement(writer, "T_TIEN_NGOAI_TH", ToDecimal(r.TienNgoaitruth));
            WriteElement(writer, "T_TIEN_TU_PHI_TRU", ToDecimal(r.TienTuphitru));
            WriteElement(writer, "MA_LOAI_RV", r.MaLoaiRv ?? "");
            WriteElement(writer, "MA_NOI_CHUYEN", r.MaNoiChuyen ?? "");
            WriteElement(writer, "MA_TTPT", r.MaTtpt ?? "");
            WriteElement(writer, "NAM_QT_NHO_HAT", r.NamQtNhoHat ?? "");
            WriteElement(writer, "NGAY_MIEN", ToBhxhDate(r.NgayMien));
            writer.WriteEndElement(); // THONG_TIN
        }

        writer.WriteEndElement(); // DSACH_THONG_TIN
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML1 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML2 - Thuoc dieu tri

    public async Task<byte[]> GenerateXml2FileAsync(List<Xml2MedicineDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_CHI_TIET_THUOC");

        foreach (var r in records)
        {
            writer.WriteStartElement("CHI_TIET_THUOC");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "MA_THUOC", r.MaThuoc);
            WriteElement(writer, "MA_NHOM", r.MaNhom);
            WriteElement(writer, "TEN_THUOC", r.TenThuoc);
            WriteElement(writer, "DON_VI_TINH", r.DonViTinh ?? "");
            WriteElement(writer, "HAM_LUONG", r.HamLuong ?? "");
            WriteElement(writer, "DUONG_DUNG", r.DuongDung ?? "");
            WriteElement(writer, "SO_LUONG", ToDecimal(r.SoLuong));
            WriteElement(writer, "DON_GIA", ToDecimal(r.DonGia));
            WriteElement(writer, "TY_LE_TT", ToInt(r.TyLeThanhToan));
            WriteElement(writer, "THANH_TIEN", ToDecimal(r.ThanhTien));
            WriteElement(writer, "MA_KHOA", r.MaKhoa ?? "");
            WriteElement(writer, "MA_BAC_SI", r.MaBacSi ?? "");
            WriteElement(writer, "NGAY_YL", ToBhxhDate(r.NgayYl));
            WriteElement(writer, "MA_PTTT", r.MaPttt ?? "");
            WriteElement(writer, "MA_BENH", r.MaBenh ?? "");
            WriteElement(writer, "T_THANH_TIEN_BV", ToDecimalNullable(r.ThanhTienBv));
            WriteElement(writer, "T_BHYT", ToDecimalNullable(r.TienBhyt));
            WriteElement(writer, "T_BNCT", ToDecimalNullable(r.TienBnCct));
            WriteElement(writer, "T_NGUOI_BENH", ToDecimalNullable(r.TienNguoiBenh));
            WriteElement(writer, "MUC_HUONG", ToIntNullable(r.MucHuong));
            WriteElement(writer, "MA_NGUON_CT", ToIntNullable(r.MaNguonChiTra));
            writer.WriteEndElement(); // CHI_TIET_THUOC
        }

        writer.WriteEndElement(); // DSACH_CHI_TIET_THUOC
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML2 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML3 - Dich vu ky thuat

    public async Task<byte[]> GenerateXml3FileAsync(List<Xml3ServiceDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_CHI_TIET_DVKT");

        foreach (var r in records)
        {
            writer.WriteStartElement("CHI_TIET_DVKT");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "MA_DVU", r.MaDvu);
            WriteElement(writer, "MA_NHOM", r.MaNhom);
            WriteElement(writer, "MA_PTTT", r.MaPttt ?? "");
            WriteElement(writer, "TEN_DVU", r.TenDvu);
            WriteElement(writer, "DON_VI_TINH", r.DonViTinh ?? "");
            WriteElement(writer, "SO_LUONG", ToDecimal(r.SoLuong));
            WriteElement(writer, "DON_GIA", ToDecimal(r.DonGia));
            WriteElement(writer, "TY_LE_TT", ToInt(r.TyLeThanhToan));
            WriteElement(writer, "THANH_TIEN", ToDecimal(r.ThanhTien));
            WriteElement(writer, "MA_KHOA", r.MaKhoa ?? "");
            WriteElement(writer, "MA_BAC_SI", r.MaBacSi ?? "");
            WriteElement(writer, "NGAY_YL", ToBhxhDate(r.NgayYl));
            WriteElement(writer, "NGAY_KQ", ToBhxhDate(r.NgayKq));
            WriteElement(writer, "MA_BENH", r.MaBenh ?? "");
            WriteElement(writer, "T_THANH_TIEN_BV", ToDecimalNullable(r.ThanhTienBv));
            WriteElement(writer, "T_BHYT", ToDecimalNullable(r.TienBhyt));
            WriteElement(writer, "T_BNCT", ToDecimalNullable(r.TienBnCct));
            WriteElement(writer, "T_NGUOI_BENH", ToDecimalNullable(r.TienNguoiBenh));
            WriteElement(writer, "MUC_HUONG", ToIntNullable(r.MucHuong));
            WriteElement(writer, "MA_NGUON_CT", ToIntNullable(r.MaNguonChiTra));
            writer.WriteEndElement(); // CHI_TIET_DVKT
        }

        writer.WriteEndElement(); // DSACH_CHI_TIET_DVKT
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML3 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML4 - Thuoc ngoai danh muc

    public async Task<byte[]> GenerateXml4FileAsync(List<Xml4OtherMedicineDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_CHI_TIET_THUOC_CT");

        foreach (var r in records)
        {
            writer.WriteStartElement("CHI_TIET_THUOC_CT");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "MA_THUOC", r.MaThuoc);
            WriteElement(writer, "TEN_THUOC", r.TenThuoc);
            WriteElement(writer, "DON_VI_TINH", r.DonViTinh ?? "");
            WriteElement(writer, "HAM_LUONG", r.HamLuong ?? "");
            WriteElement(writer, "DUONG_DUNG", r.DuongDung ?? "");
            WriteElement(writer, "SO_LUONG", ToDecimal(r.SoLuong));
            WriteElement(writer, "DON_GIA", ToDecimal(r.DonGia));
            WriteElement(writer, "THANH_TIEN", ToDecimal(r.ThanhTien));
            WriteElement(writer, "MA_KHOA", r.MaKhoa ?? "");
            WriteElement(writer, "MA_BAC_SI", r.MaBacSi ?? "");
            WriteElement(writer, "NGAY_YL", ToBhxhDate(r.NgayYl));
            writer.WriteEndElement(); // CHI_TIET_THUOC_CT
        }

        writer.WriteEndElement(); // DSACH_CHI_TIET_THUOC_CT
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML4 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML5 - Chi dinh thuoc

    public async Task<byte[]> GenerateXml5FileAsync(List<Xml5PrescriptionDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_CHI_DINH_THUOC");

        foreach (var r in records)
        {
            writer.WriteStartElement("CHI_DINH_THUOC");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "MA_THUOC", r.MaThuoc);
            WriteElement(writer, "TEN_THUOC", r.TenThuoc);
            WriteElement(writer, "SO_DK", r.SoDk ?? "");
            WriteElement(writer, "HAM_LUONG", r.HamLuong ?? "");
            WriteElement(writer, "SO_LUONG", ToDecimal(r.SoLuong));
            WriteElement(writer, "DON_GIA", ToDecimal(r.DonGia));
            WriteElement(writer, "THANH_TIEN", ToDecimal(r.ThanhTien));
            WriteElement(writer, "LIEU_DUNG", r.LieuDung ?? "");
            WriteElement(writer, "CACH_DUNG", r.CachDung ?? "");
            WriteElement(writer, "SO_NGAY", ToInt(r.SoNgay));
            WriteElement(writer, "MA_BENH", r.MaBenh ?? "");
            WriteElement(writer, "NGAY_KE_DON", ToBhxhDate(r.NgayKeDon));
            writer.WriteEndElement(); // CHI_DINH_THUOC
        }

        writer.WriteEndElement(); // DSACH_CHI_DINH_THUOC
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML5 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML6 - Mau va che pham mau

    public async Task<byte[]> GenerateXml6FileAsync(List<Xml6BloodDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_CHI_TIET_MAU");

        foreach (var r in records)
        {
            writer.WriteStartElement("CHI_TIET_MAU");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "MA_MAU", r.MaMau);
            WriteElement(writer, "TEN_MAU", r.TenMau);
            WriteElement(writer, "THE_TICH", ToDecimal(r.TheTich));
            WriteElement(writer, "DON_GIA", ToDecimal(r.DonGia));
            WriteElement(writer, "THANH_TIEN", ToDecimal(r.ThanhTien));
            WriteElement(writer, "T_BHYT", ToDecimalNullable(r.TienBhyt));
            WriteElement(writer, "T_BNCT", ToDecimalNullable(r.TienBnCct));
            WriteElement(writer, "T_NGUOI_BENH", ToDecimalNullable(r.TienNguoiBenh));
            WriteElement(writer, "NGAY_YL", ToBhxhDate(r.NgayYl));
            WriteElement(writer, "MA_KHOA", r.MaKhoa ?? "");
            WriteElement(writer, "MA_BAC_SI", r.MaBacSi ?? "");
            writer.WriteEndElement(); // CHI_TIET_MAU
        }

        writer.WriteEndElement(); // DSACH_CHI_TIET_MAU
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML6 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML7 - Giay chuyen tuyen

    public async Task<byte[]> GenerateXml7FileAsync(List<Xml7ReferralDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_GIAY_CHUYEN_TUYEN");

        foreach (var r in records)
        {
            writer.WriteStartElement("GIAY_CHUYEN_TUYEN");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "SO_HOSO", r.SoHoSo);
            WriteElement(writer, "MA_BN_CHUYEN_DI", r.MaBnChuyenDi);
            WriteElement(writer, "MA_CSKB_CHUYEN_DI", r.MaCskbChuyenDi);
            WriteElement(writer, "NGAY_CHUYEN_DI", ToBhxhDate(r.NgayChuyenDi));
            WriteElement(writer, "MA_CSKB_CHUYEN_DEN", r.MaCskbChuyenDen);
            WriteElement(writer, "LY_DO_CHUYEN_VIEN", r.LyDoChuyenVien);
            WriteElement(writer, "MA_BENH_CHINH", r.MaBenhChinh ?? "");
            WriteElement(writer, "MA_BENH_KT", r.MaBenhKt ?? "");
            WriteElement(writer, "TOM_TAT_KQ", r.TomTatKq ?? "");
            WriteElement(writer, "HUONG_DIEU_TRI", r.HuongDieuTri ?? "");
            WriteElement(writer, "PHUONG_TIEN_VC", r.PhuongTienVc ?? "");
            WriteElement(writer, "HO_TEN_NGUOI_HT", r.HoTenNguoiHt ?? "");
            WriteElement(writer, "CHUC_DANH_NGUOI_HT", r.ChucDanhNguoiHt ?? "");
            writer.WriteEndElement(); // GIAY_CHUYEN_TUYEN
        }

        writer.WriteEndElement(); // DSACH_GIAY_CHUYEN_TUYEN
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML7 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML8 - Van chuyen nguoi benh

    public async Task<byte[]> GenerateXml8FileAsync(List<Xml8TransportDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_VAN_CHUYEN");

        foreach (var r in records)
        {
            writer.WriteStartElement("VAN_CHUYEN");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "PHUONG_TIEN", r.PhuongTien);
            WriteElement(writer, "KHOANG_CACH", ToDecimal(r.KhoangCach));
            WriteElement(writer, "PHI_VC", ToDecimal(r.PhiVc));
            WriteElement(writer, "T_BHYT", ToDecimalNullable(r.TienBhyt));
            WriteElement(writer, "NGAY_VC", ToBhxhDate(r.NgayVc));
            WriteElement(writer, "NOI_DI", r.NoiDi ?? "");
            WriteElement(writer, "NOI_DEN", r.NoiDen ?? "");
            writer.WriteEndElement(); // VAN_CHUYEN
        }

        writer.WriteEndElement(); // DSACH_VAN_CHUYEN
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML8 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML9 - Giay nghi viec huong BHXH

    public async Task<byte[]> GenerateXml9FileAsync(List<Xml9SickLeaveDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_GIAY_NGHI");

        foreach (var r in records)
        {
            writer.WriteStartElement("GIAY_NGHI");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "TU_NGAY", ToBhxhDate(r.TuNgay));
            WriteElement(writer, "DEN_NGAY", ToBhxhDate(r.DenNgay));
            WriteElement(writer, "SO_NGAY", ToInt(r.SoNgay));
            WriteElement(writer, "LY_DO", r.LyDo);
            WriteElement(writer, "MA_BENH", r.MaBenh ?? "");
            WriteElement(writer, "MA_BAC_SI", r.MaBacSi ?? "");
            writer.WriteEndElement(); // GIAY_NGHI
        }

        writer.WriteEndElement(); // DSACH_GIAY_NGHI
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML9 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML10 - Ket qua giam dinh

    public async Task<byte[]> GenerateXml10FileAsync(List<Xml10AssessmentDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_KET_QUA_GD");

        foreach (var r in records)
        {
            writer.WriteStartElement("KET_QUA_GD");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "KET_QUA", r.KetQua);
            WriteElement(writer, "GHI_CHU", r.GhiChu ?? "");
            WriteElement(writer, "NGAY_GIAM_DINH", ToBhxhDate(r.NgayGiamDinh));
            WriteElement(writer, "MA_NGUOI_GD", r.MaNguoiGd ?? "");
            WriteElement(writer, "TEN_NGUOI_GD", r.TenNguoiGd ?? "");
            writer.WriteEndElement(); // KET_QUA_GD
        }

        writer.WriteEndElement(); // DSACH_KET_QUA_GD
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML10 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML11 - So BHXH

    public async Task<byte[]> GenerateXml11FileAsync(List<Xml11SocialInsuranceDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_SO_BHXH");

        foreach (var r in records)
        {
            writer.WriteStartElement("SO_BHXH");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "MA_BHXH", r.MaBhxh);
            WriteElement(writer, "HO_TEN", r.HoTen);
            WriteElement(writer, "SO_SO_BHXH", r.SoSoBhxh);
            WriteElement(writer, "NGAY_SINH", ToBhxhDate(r.NgaySinh));
            WriteElement(writer, "GIOI_TINH", ToIntNullable(r.GioiTinh));
            writer.WriteEndElement(); // SO_BHXH
        }

        writer.WriteEndElement(); // DSACH_SO_BHXH
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML11 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML13 - Giay hen tai kham

    public async Task<byte[]> GenerateXml13FileAsync(List<Xml13ReExamDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_GIAY_HEN");

        foreach (var r in records)
        {
            writer.WriteStartElement("GIAY_HEN");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "NGAY_HEN", ToBhxhDate(r.NgayHen));
            WriteElement(writer, "NOI_DUNG", r.NoiDung);
            WriteElement(writer, "MA_BAC_SI", r.MaBacSi ?? "");
            WriteElement(writer, "MA_KHOA", r.MaKhoa ?? "");
            writer.WriteEndElement(); // GIAY_HEN
        }

        writer.WriteEndElement(); // DSACH_GIAY_HEN
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML13 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML14 - Phieu chuyen tuyen (QD 3176)

    public async Task<byte[]> GenerateXml14FileAsync(List<Xml14ReferralCertDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_PHIEU_CHUYEN_TUYEN");

        foreach (var r in records)
        {
            writer.WriteStartElement("PHIEU_CHUYEN_TUYEN");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "SO_PHIEU", r.SoPhieu);
            WriteElement(writer, "MA_CSKB_CHUYEN_DEN", r.MaCskbChuyenDen);
            WriteElement(writer, "TEN_CSKB_CHUYEN_DEN", r.TenCskbChuyenDen);
            WriteElement(writer, "NGAY_CHUYEN", ToBhxhDate(r.NgayChuyen));
            WriteElement(writer, "LY_DO_CHUYEN", r.LyDoChuyen);
            WriteElement(writer, "CHAN_DOAN_CHUYEN", r.ChanDoanChuyen ?? "");
            WriteElement(writer, "HUONG_DIEU_TRI", r.HuongDieuTri ?? "");
            WriteElement(writer, "MA_BAC_SI", r.MaBacSi ?? "");
            writer.WriteEndElement(); // PHIEU_CHUYEN_TUYEN
        }

        writer.WriteEndElement(); // DSACH_PHIEU_CHUYEN_TUYEN
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML14 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion

    #region XML15 - Dieu tri lao

    public async Task<byte[]> GenerateXml15FileAsync(List<Xml15TbTreatmentDto> records)
    {
        using var stream = new MemoryStream();
        await using var writer = XmlWriter.Create(stream, CreateSettings());

        await writer.WriteStartDocumentAsync();
        writer.WriteStartElement("DSACH_DIEU_TRI_LAO");

        foreach (var r in records)
        {
            writer.WriteStartElement("DIEU_TRI_LAO");
            WriteElement(writer, "MA_LK", r.MaLk);
            WriteElement(writer, "STT", ToInt(r.Stt));
            WriteElement(writer, "PHAC_DO", r.PhacDo);
            WriteElement(writer, "GIAI_DOAN", r.GiaiDoan);
            WriteElement(writer, "NGAY_BAT_DAU", ToBhxhDate(r.NgayBatDau));
            WriteElement(writer, "NGAY_KET_THUC", ToBhxhDate(r.NgayKetThuc));
            WriteElement(writer, "KET_QUA", r.KetQua ?? "");
            writer.WriteEndElement(); // DIEU_TRI_LAO
        }

        writer.WriteEndElement(); // DSACH_DIEU_TRI_LAO
        await writer.WriteEndDocumentAsync();
        await writer.FlushAsync();

        _logger.LogInformation("Generated XML15 with {Count} records ({Size} bytes)", records.Count, stream.Length);
        return stream.ToArray();
    }

    #endregion
}
