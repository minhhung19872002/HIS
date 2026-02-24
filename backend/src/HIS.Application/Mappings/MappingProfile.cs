using AutoMapper;
using HIS.Core.Entities;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reception;

namespace HIS.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Patient
        CreateMap<Patient, PatientDto>();
        CreateMap<CreatePatientDto, Patient>();
        CreateMap<UpdatePatientDto, Patient>();

        // User
        CreateMap<User, UserDto>()
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department != null ? s.Department.DepartmentName : null))
            .ForMember(d => d.Roles, o => o.MapFrom(s => s.UserRoles.Select(ur => ur.Role.RoleName).ToList()))
            .ForMember(d => d.RoleCodes, o => o.MapFrom(s => s.UserRoles.Select(ur => ur.Role.RoleCode).ToList()))
            .ForMember(d => d.Permissions, o => o.MapFrom(s =>
                s.UserRoles.SelectMany(ur => ur.Role.RolePermissions.Select(rp => rp.Permission.PermissionCode)).Distinct().ToList()));

        // Department
        CreateMap<Department, DepartmentDto>()
            .ForMember(d => d.Rooms, o => o.MapFrom(s => s.Rooms));
        CreateMap<Department, SelectItemDto>()
            .ForMember(d => d.Code, o => o.MapFrom(s => s.DepartmentCode))
            .ForMember(d => d.Name, o => o.MapFrom(s => s.DepartmentName));

        // Room
        CreateMap<Room, RoomDto>()
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department.DepartmentName));
        CreateMap<Room, SelectItemDto>()
            .ForMember(d => d.Code, o => o.MapFrom(s => s.RoomCode))
            .ForMember(d => d.Name, o => o.MapFrom(s => s.RoomName));

        // Service
        CreateMap<Service, ServiceDto>()
            .ForMember(d => d.ServiceGroupName, o => o.MapFrom(s => s.ServiceGroup.GroupName));
        CreateMap<Service, SelectItemDto>()
            .ForMember(d => d.Code, o => o.MapFrom(s => s.ServiceCode))
            .ForMember(d => d.Name, o => o.MapFrom(s => s.ServiceName));

        // MedicalRecord -> ReceptionDto
        CreateMap<MedicalRecord, ReceptionDto>()
            .ForMember(d => d.PatientCode, o => o.MapFrom(s => s.Patient.PatientCode))
            .ForMember(d => d.PatientName, o => o.MapFrom(s => s.Patient.FullName))
            .ForMember(d => d.Gender, o => o.MapFrom(s => s.Patient.Gender))
            .ForMember(d => d.DateOfBirth, o => o.MapFrom(s => s.Patient.DateOfBirth))
            .ForMember(d => d.PhoneNumber, o => o.MapFrom(s => s.Patient.PhoneNumber))
            .ForMember(d => d.Address, o => o.MapFrom(s => s.Patient.Address))
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department != null ? s.Department.DepartmentName : null))
            .ForMember(d => d.RoomName, o => o.MapFrom(s => s.Room != null ? s.Room.RoomName : null))
            .ForMember(d => d.DoctorName, o => o.MapFrom(s => s.Doctor != null ? s.Doctor.FullName : null));

        // Examination -> ExaminationDto
        CreateMap<Examination, ExaminationDto>()
            .ForMember(d => d.MedicalRecordCode, o => o.MapFrom(s => s.MedicalRecord.MedicalRecordCode))
            .ForMember(d => d.PatientId, o => o.MapFrom(s => s.MedicalRecord.PatientId))
            .ForMember(d => d.PatientCode, o => o.MapFrom(s => s.MedicalRecord.Patient.PatientCode))
            .ForMember(d => d.PatientName, o => o.MapFrom(s => s.MedicalRecord.Patient.FullName))
            .ForMember(d => d.Gender, o => o.MapFrom(s => s.MedicalRecord.Patient.Gender))
            .ForMember(d => d.DateOfBirth, o => o.MapFrom(s => s.MedicalRecord.Patient.DateOfBirth))
            .ForMember(d => d.Age, o => o.MapFrom(s => s.MedicalRecord.Patient.DateOfBirth.HasValue
                ? DateTime.Now.Year - s.MedicalRecord.Patient.DateOfBirth.Value.Year
                : (int?)null))
            .ForMember(d => d.PhoneNumber, o => o.MapFrom(s => s.MedicalRecord.Patient.PhoneNumber))
            .ForMember(d => d.Address, o => o.MapFrom(s => s.MedicalRecord.Patient.Address))
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department.DepartmentName))
            .ForMember(d => d.RoomName, o => o.MapFrom(s => s.Room.RoomName))
            .ForMember(d => d.DoctorName, o => o.MapFrom(s => s.Doctor != null ? s.Doctor.FullName : null))
            .ForMember(d => d.ExaminationDate, o => o.MapFrom(s => s.StartTime ?? s.CreatedAt))
            .ForMember(d => d.HeartRate, o => o.MapFrom(s => s.Pulse))
            .ForMember(d => d.GeneralExamination, o => o.MapFrom(s => s.PhysicalExamination))
            .ForMember(d => d.SystemExamination, o => o.MapFrom(s => s.SystemsReview))
            .ForMember(d => d.PrimaryDiagnosisCode, o => o.MapFrom(s => s.MainIcdCode))
            .ForMember(d => d.PrimaryDiagnosisName, o => o.MapFrom(s => s.MainDiagnosis))
            .ForMember(d => d.MedicalHistory, o => o.MapFrom(s => s.PresentIllness))
            .ForMember(d => d.ReexaminationDate, o => o.MapFrom(s => s.FollowUpDate))
            .ForMember(d => d.Notes, o => o.MapFrom(s => s.ConclusionNote))
            .ForMember(d => d.PatientType, o => o.MapFrom(s => s.MedicalRecord.PatientType))
            .ForMember(d => d.InsuranceNumber, o => o.MapFrom(s => s.MedicalRecord.InsuranceNumber))
            .ForMember(d => d.InsuranceExpireDate, o => o.MapFrom(s => s.MedicalRecord.InsuranceExpireDate))
            .ForMember(d => d.SecondaryDiagnoses, o => o.Ignore()); // Xử lý riêng trong service

        // IcdCode -> IcdCodeDto
        CreateMap<IcdCode, IcdCodeDto>();

        // MedicalRecord -> AdmissionDto (New Reception Module)
        CreateMap<MedicalRecord, AdmissionDto>()
            .ForMember(d => d.PatientCode, o => o.MapFrom(s => s.Patient.PatientCode))
            .ForMember(d => d.PatientName, o => o.MapFrom(s => s.Patient.FullName))
            .ForMember(d => d.Gender, o => o.MapFrom(s => s.Patient.Gender))
            .ForMember(d => d.DateOfBirth, o => o.MapFrom(s => s.Patient.DateOfBirth))
            .ForMember(d => d.YearOfBirth, o => o.MapFrom(s => s.Patient.YearOfBirth))
            .ForMember(d => d.PhoneNumber, o => o.MapFrom(s => s.Patient.PhoneNumber))
            .ForMember(d => d.Address, o => o.MapFrom(s => s.Patient.Address))
            .ForMember(d => d.IdentityNumber, o => o.MapFrom(s => s.Patient.IdentityNumber))
            .ForMember(d => d.InsuranceFacilityName, o => o.MapFrom(s => s.Patient.InsuranceFacilityName))
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department != null ? s.Department.DepartmentName : null))
            .ForMember(d => d.RoomName, o => o.MapFrom(s => s.Room != null ? s.Room.RoomName : null))
            .ForMember(d => d.DoctorName, o => o.MapFrom(s => s.Doctor != null ? s.Doctor.FullName : null))
            .ForMember(d => d.IsEmergency, o => o.MapFrom(s => s.TreatmentType == 3))
            .ForMember(d => d.IsPriority, o => o.MapFrom(s => false)) // Will be set from Queue
            .ForMember(d => d.QueueNumber, o => o.MapFrom(s => 0)) // Will be set from Queue
            .ForMember(d => d.QueueCode, o => o.MapFrom(s => string.Empty)) // Will be set from Queue
            .ForMember(d => d.Priority, o => o.MapFrom(s => 0)) // Will be set from Queue
            .ForMember(d => d.CalledAt, o => o.MapFrom(s => (DateTime?)null)) // Will be set from Queue
            .ForMember(d => d.StartedAt, o => o.MapFrom(s => (DateTime?)null)) // Will be set from Queue
            .ForMember(d => d.CompletedAt, o => o.MapFrom(s => (DateTime?)null)) // Will be set from Queue
            .ForMember(d => d.ChiefComplaint, o => o.MapFrom(s => string.Empty)) // Will be set from Examination
            .ForMember(d => d.Notes, o => o.MapFrom(s => string.Empty));

        // Queue -> QueueDto
        CreateMap<Queue, QueueDto>()
            .ForMember(d => d.PatientCode, o => o.MapFrom(s => s.Patient.PatientCode))
            .ForMember(d => d.PatientName, o => o.MapFrom(s => s.Patient.FullName))
            .ForMember(d => d.Gender, o => o.MapFrom(s => s.Patient.Gender))
            .ForMember(d => d.Age, o => o.MapFrom(s =>
                s.Patient.DateOfBirth.HasValue
                    ? DateTime.Now.Year - s.Patient.DateOfBirth.Value.Year
                    : (s.Patient.YearOfBirth.HasValue ? DateTime.Now.Year - s.Patient.YearOfBirth.Value : (int?)null)))
            .ForMember(d => d.MedicalRecordCode, o => o.MapFrom(s => s.MedicalRecord != null ? s.MedicalRecord.MedicalRecordCode : null))
            .ForMember(d => d.RoomName, o => o.MapFrom(s => s.Room != null ? s.Room.RoomName : null))
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department != null ? s.Department.DepartmentName : null));

        // DocumentHold -> DocumentHoldDto
        CreateMap<DocumentHold, DocumentHoldDto>()
            .ForMember(d => d.PatientCode, o => o.MapFrom(s => s.Patient.PatientCode))
            .ForMember(d => d.PatientName, o => o.MapFrom(s => s.Patient.FullName))
            .ForMember(d => d.MedicalRecordCode, o => o.MapFrom(s => s.MedicalRecord != null ? s.MedicalRecord.MedicalRecordCode : null));
    }
}
