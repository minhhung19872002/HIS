using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HIS.Application.Common;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
// Use DTOs from IExaminationCompleteService (HIS.Application.Services namespace)
using ServiceDto = HIS.Application.Services.ServiceDto;
using RoomDto = HIS.Application.Services.RoomDto;
using MedicineDto = HIS.Application.Services.MedicineDto;
using DoctorDto = HIS.Application.Services.DoctorDto;
using ExamWarehouseDto = HIS.Application.Services.ExamWarehouseDto;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IExaminationCompleteService — handles all examination/OPD workflows.
///
/// K4 phien 1 (2026-05-30): converted to partial class. Section 2.7 Prescriptions (~829 dong)
/// tach ra `ExaminationCompleteService.Prescriptions.cs`. ZERO runtime change — partial class.
/// </summary>
public partial class ExaminationCompleteService : IExaminationCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Patient> _patientRepo;
    private readonly IRepository<MedicalRecord> _medicalRecordRepo;
    private readonly IRepository<Examination> _examinationRepo;
    private readonly IRepository<Room> _roomRepo;
    private readonly IRepository<User> _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserAccessor _currentUser;

    public ExaminationCompleteService(
        HISDbContext context,
        IRepository<Patient> patientRepo,
        IRepository<MedicalRecord> medicalRecordRepo,
        IRepository<Examination> examinationRepo,
        IRepository<Room> roomRepo,
        IRepository<User> userRepo,
        IUnitOfWork unitOfWork,
        ICurrentUserAccessor currentUser)
    {
        _context = context;
        _patientRepo = patientRepo;
        _medicalRecordRepo = medicalRecordRepo;
        _examinationRepo = examinationRepo;
        _roomRepo = roomRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    // Đọc người dùng hiện tại qua ICurrentUserAccessor (canonical claim) — #200 REFAC-1.
    // Behavior giữ nguyên: "sub"/"id" trước đây luôn null (AuthService không phát) → chỉ NameIdentifier có tác dụng.
    private Guid? GetCurrentUserId() => _currentUser.UserGuid;









    #region Private Helper Methods

    private int CalculateAge(DateTime? dateOfBirth, int? yearOfBirth)
    {
        if (dateOfBirth.HasValue)
            return DateTime.Today.Year - dateOfBirth.Value.Year;
        if (yearOfBirth.HasValue)
            return DateTime.Today.Year - yearOfBirth.Value;
        return 0;
    }

    private string ClassifyBMI(decimal? bmi)
    {
        if (!bmi.HasValue) return "";
        if (bmi < 18.5m) return "Gay";
        if (bmi < 25) return "Binh thuong";
        if (bmi < 30) return "Thua can";
        if (bmi < 35) return "Beo phi do 1";
        if (bmi < 40) return "Beo phi do 2";
        return "Beo phi do 3";
    }

    private VitalSignsFullDto? MapToVitalSignsFullDto(Examination examination)
    {
        if (examination.Temperature == null && examination.Pulse == null) return null;

        return new VitalSignsFullDto
        {
            Weight = examination.Weight,
            Height = examination.Height,
            BMI = examination.BMI,
            BMIClassification = ClassifyBMI(examination.BMI),
            SystolicBP = examination.BloodPressureSystolic,
            DiastolicBP = examination.BloodPressureDiastolic,
            Pulse = examination.Pulse,
            Temperature = examination.Temperature,
            RespiratoryRate = examination.RespiratoryRate,
            SpO2 = (int?)examination.SpO2,
            MeasuredAt = examination.StartTime ?? DateTime.Now
        };
    }

    private RoomPatientListDto MapToRoomPatientListDto(Examination examination)
    {
        var patient = examination.MedicalRecord?.Patient;

        var gender = patient?.Gender ?? 0;
        var patientType = examination.MedicalRecord?.PatientType ?? 0;

        return new RoomPatientListDto
        {
            ExaminationId = examination.Id,
            PatientId = patient?.Id ?? Guid.Empty,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            Gender = gender,
            GenderName = gender switch
            {
                1 => "Nam",
                2 => "Nữ",
                _ => "Không xác định"
            },
            Age = CalculateAge(patient?.DateOfBirth, patient?.YearOfBirth),
            PatientType = patientType,
            PatientTypeName = patientType switch
            {
                0 => "Viện phí",
                1 => "BHYT",
                2 => "Dịch vụ",
                3 => "Miễn phí",
                _ => "Khác"
            },
            InsuranceNumber = examination.MedicalRecord?.InsuranceNumber,
            IsInsuranceValid = true,
            QueueNumber = examination.QueueNumber,
            Status = examination.Status,
            StatusName = examination.Status switch
            {
                0 => "Chờ khám",
                1 => "Đang khám",
                2 => "Chờ CLS",
                3 => "Chờ kết luận",
                4 => "Hoàn thành",
                _ => ""
            },
            PreliminaryDiagnosis = examination.InitialDiagnosis
        };
    }

    private Application.DTOs.ExaminationDto MapToExaminationDto(Examination examination)
    {
        var patient = examination.MedicalRecord?.Patient;

        return new Application.DTOs.ExaminationDto
        {
            Id = examination.Id,
            MedicalRecordCode = examination.MedicalRecord?.MedicalRecordCode ?? "",
            PatientId = patient?.Id ?? Guid.Empty,
            PatientCode = patient?.PatientCode ?? "",
            PatientName = patient?.FullName ?? "",
            Gender = patient?.Gender == 1 ? "Nam" : "Nữ",
            DateOfBirth = patient?.DateOfBirth,
            Age = CalculateAge(patient?.DateOfBirth, patient?.YearOfBirth),
            PhoneNumber = patient?.PhoneNumber ?? "",
            Address = patient?.Address ?? "",
            ExaminationDate = examination.MedicalRecord?.AdmissionDate ?? DateTime.Now,
            DepartmentId = examination.DepartmentId,
            RoomId = examination.RoomId,
            RoomName = examination.Room?.RoomName ?? "",
            DoctorId = examination.DoctorId ?? Guid.Empty,
            ChiefComplaint = examination.ChiefComplaint ?? "",
            Diagnosis = examination.MainDiagnosis ?? "",
            IcdCode = examination.MainIcdCode ?? "",
            Status = examination.Status switch
            {
                0 => "Waiting",
                1 => "InProgress",
                2 => "WaitingLab",
                3 => "WaitingConclusion",
                4 => "Completed",
                _ => "Unknown"
            },
            QueueNumber = examination.QueueNumber,
            CreatedDate = examination.CreatedAt,
            PatientType = examination.MedicalRecord?.PatientType switch
            {
                1 => "BHYT",
                2 => "Vien phi",
                3 => "Dich vu",
                _ => ""
            },
            InsuranceNumber = examination.MedicalRecord?.InsuranceNumber ?? ""
        };
    }

    private PrescriptionFullDto MapToPrescriptionFullDto(Prescription prescription)
    {
        return new PrescriptionFullDto
        {
            Id = prescription.Id,
            ExaminationId = prescription.ExaminationId ?? Guid.Empty,
            PrescribedById = prescription.DoctorId,
            PrescribedByName = prescription.Doctor?.FullName,
            PrescriptionDate = prescription.PrescriptionDate,
            PrescriptionType = prescription.PrescriptionType,
            DiagnosisCode = prescription.DiagnosisCode,
            DiagnosisName = prescription.DiagnosisName,
            TotalDays = prescription.TotalDays,
            TotalAmount = prescription.TotalAmount,
            InsuranceAmount = prescription.InsuranceAmount,
            PatientAmount = prescription.PatientAmount,
            Instructions = prescription.Instructions,
            Status = prescription.Status,
            Items = prescription.Details?.Select(i => new PrescriptionItemFullDto
            {
                Id = i.Id,
                MedicineId = i.MedicineId,
                MedicineCode = i.Medicine?.MedicineCode ?? "",
                MedicineName = i.Medicine?.MedicineName ?? "",
                ActiveIngredient = i.Medicine?.ActiveIngredient,
                Quantity = i.Quantity,
                Unit = i.Unit,
                Days = i.Days,
                Dosage = i.Dosage,
                Route = i.Route,
                Frequency = i.Frequency,
                UsageInstructions = i.UsageInstructions,
                UnitPrice = i.UnitPrice,
                TotalPrice = i.TotalPrice
            }).ToList() ?? new List<PrescriptionItemFullDto>()
        };
    }

    #endregion

    #region Private Helper Methods

    private static string GetLabStatusName(int status) => status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đang lấy mẫu",
        2 => "Đang xét nghiệm",
        3 => "Có kết quả",
        _ => ""
    };

    private static string GetImagingStatusName(int status) => status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đang chụp",
        2 => "Chờ đọc kết quả",
        3 => "Có kết quả",
        _ => ""
    };

    #endregion

}
