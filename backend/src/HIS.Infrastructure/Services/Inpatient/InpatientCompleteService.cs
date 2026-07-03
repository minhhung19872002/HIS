using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IInpatientCompleteService — handles all IPD workflows (100+ methods).
///
/// K6 phien 1+ (2026-05-30): converted to partial class. 10 region 3.x sẽ tách dần ra
/// file riêng `InpatientCompleteService.Mxx.{name}.cs`. ZERO runtime change — partial class.
/// </summary>
public partial class InpatientCompleteService : IInpatientCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Patient> _patientRepo;
    private readonly IRepository<MedicalRecord> _medicalRecordRepo;
    private readonly IRepository<Admission> _admissionRepo;
    private readonly IRepository<Department> _departmentRepo;
    private readonly IRepository<Room> _roomRepo;
    private readonly IRepository<Bed> _bedRepo;
    private readonly IRepository<BedAssignment> _bedAssignmentRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPaymentGatewayService _paymentGateway;

    public InpatientCompleteService(
        HISDbContext context,
        IRepository<Patient> patientRepo,
        IRepository<MedicalRecord> medicalRecordRepo,
        IRepository<Admission> admissionRepo,
        IRepository<Department> departmentRepo,
        IRepository<Room> roomRepo,
        IRepository<Bed> bedRepo,
        IRepository<BedAssignment> bedAssignmentRepo,
        IRepository<User> userRepo,
        IUnitOfWork unitOfWork,
        IPaymentGatewayService paymentGateway)
    {
        _context = context;
        _patientRepo = patientRepo;
        _medicalRecordRepo = medicalRecordRepo;
        _admissionRepo = admissionRepo;
        _departmentRepo = departmentRepo;
        _roomRepo = roomRepo;
        _bedRepo = bedRepo;
        _bedAssignmentRepo = bedAssignmentRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _paymentGateway = paymentGateway;
    }


    #region Helper Methods

    private static string GetAdmissionTypeName(int admissionType)
    {
        return admissionType switch
        {
            1 => "Cấp cứu",
            2 => "Chuyển viện",
            3 => "Từ ngoại trú",
            4 => "Nhập viện trực tiếp",
            _ => "Khác"
        };
    }

    private static string GetAdmissionStatusName(int status)
    {
        return status switch
        {
            0 => "Đang điều trị",
            1 => "Đã xuất viện",
            2 => "Đã chuyển viện",
            3 => "Đã tử vong",
            4 => "Bỏ về",          // DischargeType 3 (audit #11: trước đây không có tên)
            5 => "Đã chuyển khoa", // chuyển nội bộ — phân biệt với "Đã xuất viện" (1)
            6 => "Chờ ra viện",
            _ => "Không xác định"
        };
    }

    #endregion

}
