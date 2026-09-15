using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HIS.Tests.Services;

/// <summary>
/// Cổng bệnh nhân (nguồn dữ liệu của app hỗ trợ người bệnh) phải hiện đúng điều HIS đang giữ.
/// Ba lỗi dưới đây đo được trên prod 15/09 khi đối chiếu app với màn nghiệp vụ của HIS.
/// </summary>
public sealed class PatientPortalLinkageTests
{
    private readonly Guid _patientId = Guid.NewGuid();
    private readonly Guid _recordId = Guid.NewGuid();
    private readonly Guid _departmentId = Guid.NewGuid();
    private readonly Guid _roomId = Guid.NewGuid();
    private readonly Guid _doctorId = Guid.NewGuid();
    private readonly Guid _serviceId = Guid.NewGuid();

    private static PatientPortalServiceImpl Build(HISDbContext ctx, IRISCompleteService? ris = null) =>
        new(ctx, ris ?? new Mock<IRISCompleteService>().Object);

    private void SeedBase(HISDbContext ctx)
    {
        ctx.Patients.Add(new Patient { Id = _patientId, PatientCode = "BN-PORTAL", FullName = "BN Portal", PhoneNumber = "0901234567" });
        ctx.MedicalRecords.Add(new MedicalRecord { Id = _recordId, PatientId = _patientId, PatientType = 2 });
        ctx.Departments.Add(new Department { Id = _departmentId, DepartmentCode = "KNOI", DepartmentName = "Khoa Nội", IsActive = true });
        ctx.Rooms.Add(new Room { Id = _roomId, RoomCode = "PK2", RoomName = "Phòng khám Nội 2", DepartmentId = _departmentId, IsActive = true });
        ctx.Users.Add(new User { Id = _doctorId, Username = "bs.portal", FullName = "BS Portal", PasswordHash = "x", UserType = 1, IsActive = true });
        var groupId = Guid.NewGuid();
        ctx.ServiceGroups.Add(new ServiceGroup { Id = groupId, GroupCode = "XN_SH", GroupName = "Xét nghiệm sinh hóa" });
        ctx.Services.Add(new Service { Id = _serviceId, ServiceCode = "XN_URE", ServiceName = "Ure máu", ServiceGroupId = groupId, IsActive = true });
    }

    /// <summary>Lượt khám chưa bấm "bắt đầu khám": trước đây ra 01/01/0001 và chẩn đoán trống.</summary>
    [Fact]
    public async Task Luot_kham_chua_bat_dau_lay_ngay_dang_ky_va_chan_doan_theo_ma_ICD()
    {
        using var ctx = TestDb.NewInMemory();
        SeedBase(ctx);
        var exam = new Examination
        {
            Id = Guid.NewGuid(), MedicalRecordId = _recordId, DepartmentId = _departmentId, RoomId = _roomId,
            StartTime = null, MainIcdCode = "J00", MainDiagnosis = null,
        };
        ctx.Examinations.Add(exam);
        ctx.IcdCodes.Add(new IcdCode { Id = Guid.NewGuid(), Code = "J00", Name = "Viêm mũi họng cấp" });
        await ctx.SaveChangesAsync();

        var visit = Assert.Single(await Build(ctx).GetVisitHistoryAsync(_patientId));

        // CreatedAt do DbContext đóng dấu lúc lưu = lúc đăng ký khám.
        Assert.NotEqual(DateTime.MinValue, visit.VisitDate);
        Assert.Equal(exam.CreatedAt, visit.VisitDate);
        Assert.Equal("J00 - Viêm mũi họng cấp", visit.Diagnosis);
    }

    /// <summary>
    /// PACS không có series thì RIS dựng ảnh giả với id là GUID của DicomStudy. App không được nhận
    /// id đó — trên prod nó hiện "1 ảnh" mà mở ra lỗi.
    /// </summary>
    [Fact]
    public async Task Danh_sach_anh_bo_anh_du_phong_mang_id_noi_bo()
    {
        using var ctx = TestDb.NewInMemory();
        var examId = Guid.NewGuid();
        var reportId = Guid.NewGuid();
        var studyId = Guid.NewGuid();
        ctx.RadiologyExams.Add(new RadiologyExam { Id = examId, RadiologyRequestId = Guid.NewGuid(), ModalityId = Guid.NewGuid() });
        ctx.DicomStudies.Add(new DicomStudy { Id = studyId, RadiologyExamId = examId, StudyInstanceUID = "1.2.3", NumberOfImages = 2 });
        ctx.RadiologyReports.Add(new RadiologyReport { Id = reportId, RadiologyExamId = examId, RadiologistId = _doctorId });
        await ctx.SaveChangesAsync();

        const string orthancId = "3231e3f8-20738ac2-34091c24-a14dde7e-8cb64c25";
        var ris = new Mock<IRISCompleteService>();
        ris.Setup(r => r.GetSeriesAsync("1.2.3"))
            .ReturnsAsync(new List<DicomSeriesDto> { new() { SeriesInstanceUID = "1.2.3.1", SeriesNumber = 1, SeriesDescription = "XQ" } });
        ris.Setup(r => r.GetImagesAsync("1.2.3.1"))
            .ReturnsAsync(new List<DicomImageDto>
            {
                new() { OrthancInstanceId = studyId.ToString(), InstanceNumber = 1 },   // đường dự phòng
                new() { OrthancInstanceId = orthancId, InstanceNumber = 2 },
            });

        var service = Build(ctx, ris.Object);
        var instances = await service.GetImagingInstancesAsync(reportId);

        Assert.Equal(new[] { orthancId }, instances.Select(i => i.InstanceId));
        Assert.False(await service.IsInstanceInReportAsync(reportId, studyId.ToString()));
    }

    /// <summary>
    /// Nhập viện từ phòng khám dùng lại hồ sơ ngoại trú: chỉ định của lượt khám TRƯỚC khi nhập viện
    /// không thuộc đợt nội trú. Chỉ định tại giường (không gắn lượt khám) thì luôn giữ.
    /// </summary>
    [Fact]
    public async Task Chi_dinh_cua_dot_noi_tru_bo_phieu_ngoai_tru_truoc_nhap_vien()
    {
        using var ctx = TestDb.NewInMemory();
        SeedBase(ctx);
        var admittedAt = new DateTime(2026, 9, 15, 6, 0, 0);
        var admissionId = Guid.NewGuid();
        var examId = Guid.NewGuid();
        ctx.Admissions.Add(new Admission
        {
            Id = admissionId, PatientId = _patientId, MedicalRecordId = _recordId, AdmissionDate = admittedAt,
            AdmittingDoctorId = _doctorId, DepartmentId = _departmentId, RoomId = _roomId,
        });

        void AddOrder(string code, Guid? examinationId, DateTime at)
        {
            var requestId = Guid.NewGuid();
            ctx.ServiceRequests.Add(new ServiceRequest
            {
                Id = requestId, RequestCode = code, MedicalRecordId = _recordId, ExaminationId = examinationId,
                DoctorId = _doctorId, DepartmentId = _departmentId, RequestDate = at, RequestType = 1,
            });
            ctx.ServiceRequestDetails.Add(new ServiceRequestDetail
            {
                Id = Guid.NewGuid(), ServiceRequestId = requestId, ServiceId = _serviceId, Status = 2,
                ResultDate = at.AddHours(1),
            });
        }

        AddOrder("SR-OPD-BEFORE", examId, admittedAt.AddHours(-2));   // ngoại trú trước nhập viện → loại
        AddOrder("CDNT-BEDSIDE", null, admittedAt.AddHours(-3));      // tại giường, giờ lệch → vẫn giữ
        AddOrder("SR-OPD-AFTER", examId, admittedAt.AddHours(2));     // sau nhập viện → giữ
        await ctx.SaveChangesAsync();

        var service = Build(ctx);
        var orders = await service.GetServiceOrdersAsync(_patientId, admissionId);
        var labs = await service.GetLabResultsAsync(_patientId, admissionId: admissionId);

        Assert.Equal(new[] { "CDNT-BEDSIDE", "SR-OPD-AFTER" }, orders.Select(o => o.OrderCode).OrderBy(c => c));
        Assert.Equal(new[] { "CDNT-BEDSIDE", "SR-OPD-AFTER" }, labs.Select(l => l.OrderCode).OrderBy(c => c));
    }
}
