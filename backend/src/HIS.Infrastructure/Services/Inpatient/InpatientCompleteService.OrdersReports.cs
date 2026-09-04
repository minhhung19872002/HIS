using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Inpatient;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using System.Text;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K6 phien 5 (2026-05-30): tach 4 region (3.1 Waiting + 3.3 Service Orders + 3.5 Nutrition + 3.8 Reports, ~674 dong) khoi InpatientCompleteService.
public partial class InpatientCompleteService {
    #region 3.1 Waiting Room Display

    public async Task<WardLayoutDto> GetWardLayoutAsync(Guid departmentId)
    {
        var department = await _context.Departments.FindAsync(departmentId);
        if (department == null)
            return new WardLayoutDto { DepartmentId = departmentId };

        // Get all rooms in the department
        var rooms = await _context.Rooms
            .Where(r => r.DepartmentId == departmentId && r.IsActive)
            .ToListAsync();

        var roomIds = rooms.Select(r => r.Id).ToList();

        // Get all beds in those rooms
        var beds = await _context.Beds
            .Where(b => roomIds.Contains(b.RoomId) && b.IsActive)
            .ToListAsync();

        var bedIds = beds.Select(b => b.Id).ToList();

        // Get current bed assignments
        var currentAssignments = await _context.Set<BedAssignment>()
            .Include(ba => ba.Admission)
            .ThenInclude(a => a.Patient)
            .Where(ba => bedIds.Contains(ba.BedId) && ba.Status == 0)
            .ToListAsync();

        // Data can contain multiple active assignments for the same bed (historical inconsistency).
        // Keep the latest assignment per bed to avoid duplicate-key exceptions.
        var assignmentsByBed = currentAssignments
            .GroupBy(a => a.BedId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .OrderByDescending(x => x.AssignedAt)
                    .ThenByDescending(x => x.CreatedAt)
                    .First());

        // Build room layouts
        var roomLayouts = new List<RoomLayoutDto>();
        foreach (var room in rooms)
        {
            var roomBeds = beds.Where(b => b.RoomId == room.Id).ToList();
            var occupiedCount = roomBeds.Count(b => assignmentsByBed.ContainsKey(b.Id));

            var bedLayouts = roomBeds.Select(bed =>
            {
                var assignment = assignmentsByBed.GetValueOrDefault(bed.Id);
                var patient = assignment?.Admission?.Patient;
                return new BedLayoutDto
                {
                    BedId = bed.Id,
                    BedCode = bed.BedCode,
                    BedName = bed.BedName,
                    BedType = bed.BedType,
                    Status = assignment != null ? 1 : 0,
                    CurrentAdmissionId = assignment?.AdmissionId,
                    PatientName = patient?.FullName,
                    PatientCode = patient?.PatientCode,
                    Gender = patient?.Gender,
                    AdmissionDate = assignment?.AssignedAt,
                    DaysOfStay = assignment != null ? (int)(DateTime.Now - assignment.AssignedAt).TotalDays : null
                };
            }).ToList();

            roomLayouts.Add(new RoomLayoutDto
            {
                RoomId = room.Id,
                RoomCode = room.RoomCode,
                RoomName = room.RoomName,
                RoomType = room.RoomType,
                TotalBeds = roomBeds.Count,
                OccupiedBeds = occupiedCount,
                AvailableBeds = roomBeds.Count - occupiedCount,
                Beds = bedLayouts
            });
        }

        return new WardLayoutDto
        {
            DepartmentId = department.Id,
            DepartmentName = department.DepartmentName,
            DepartmentCode = department.DepartmentCode,
            TotalRooms = rooms.Count,
            TotalBeds = beds.Count,
            OccupiedBeds = assignmentsByBed.Count,
            AvailableBeds = beds.Count - assignmentsByBed.Count,
            MaintenanceBeds = 0,
            Rooms = roomLayouts
        };
    }

    public async Task<List<RoomLayoutDto>> GetRoomLayoutsAsync(Guid departmentId)
    {
        var wardLayout = await GetWardLayoutAsync(departmentId);
        return wardLayout?.Rooms ?? new List<RoomLayoutDto>();
    }

    public async Task<List<BedLayoutDto>> GetBedLayoutsAsync(Guid roomId)
    {
        var beds = await _context.Beds
            .Where(b => b.RoomId == roomId && b.IsActive)
            .ToListAsync();

        var bedIds = beds.Select(b => b.Id).ToList();
        var currentAssignments = await _context.Set<BedAssignment>()
            .Include(ba => ba.Admission)
            .ThenInclude(a => a.Patient)
            .Where(ba => bedIds.Contains(ba.BedId) && ba.Status == 0)
            .ToListAsync();

        var assignmentsByBed = currentAssignments
            .GroupBy(a => a.BedId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .OrderByDescending(x => x.AssignedAt)
                    .ThenByDescending(x => x.CreatedAt)
                    .First());

        return beds.Select(bed =>
        {
            var assignment = assignmentsByBed.GetValueOrDefault(bed.Id);
            var patient = assignment?.Admission?.Patient;
            return new BedLayoutDto
            {
                BedId = bed.Id,
                BedCode = bed.BedCode,
                BedName = bed.BedName,
                BedType = bed.BedType,
                Status = assignment != null ? 1 : 0,
                CurrentAdmissionId = assignment?.AdmissionId,
                PatientName = patient?.FullName,
                PatientCode = patient?.PatientCode,
                Gender = patient?.Gender,
                AdmissionDate = assignment?.AssignedAt,
                DaysOfStay = assignment != null ? (int)(DateTime.Now - assignment.AssignedAt).TotalDays : null
            };
        }).ToList();
    }

    public Task<List<SharedBedPatientDto>> GetSharedBedPatientsAsync(Guid bedId)
    {
        return Task.FromResult(new List<SharedBedPatientDto>());
    }

    public Task<WardColorConfigDto> GetWardColorConfigAsync(Guid? departmentId)
    {
        return Task.FromResult(new WardColorConfigDto
        {
            InsurancePatientColor = "#2196F3",
            FeePatientColor = "#FF9800",
            ChronicPatientColor = "#9C27B0",
            EmergencyPatientColor = "#F44336",
            VIPPatientColor = "#FFD700",
            PediatricPatientColor = "#E91E63"
        });
    }

    public Task UpdateWardColorConfigAsync(Guid? departmentId, WardColorConfigDto config)
    {
        return Task.CompletedTask;
    }

    #endregion


    #region 3.3 Service Orders

    public async Task<(string? DiagnosisCode, string? Diagnosis)> GetDiagnosisFromRecordAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>().FindAsync(admissionId);
        if (admission == null)
            return (null, null);

        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId);
        if (medRecord == null)
            return (null, null);

        return (medRecord.MainIcdCode, medRecord.MainDiagnosis);
    }

    public async Task<InpatientDiagnosisDto> GetInpatientDiagnosisAsync(Guid admissionId)
    {
        var admission = await _context.Set<Admission>().FindAsync(admissionId);
        if (admission == null)
            return new InpatientDiagnosisDto();

        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId);
        if (medRecord == null)
            return new InpatientDiagnosisDto();

        var secondaries = new List<SecondaryDiagnosisItemDto>();
        if (!string.IsNullOrWhiteSpace(medRecord.SubIcdCodes))
        {
            var codes = medRecord.SubIcdCodes.Split('|');
            var names = medRecord.SubDiagnosis?.Split('|') ?? Array.Empty<string>();
            for (int i = 0; i < codes.Length; i++)
            {
                if (!string.IsNullOrWhiteSpace(codes[i]))
                    secondaries.Add(new SecondaryDiagnosisItemDto
                    {
                        Code = codes[i],
                        Name = i < names.Length ? names[i] : string.Empty,
                    });
            }
        }

        return new InpatientDiagnosisDto
        {
            MainDiagnosisCode = medRecord.MainIcdCode,
            MainDiagnosis = medRecord.MainDiagnosis,
            SecondaryDiagnoses = secondaries,
        };
    }

    public async Task<InpatientDiagnosisDto> SaveInpatientDiagnosisAsync(Guid admissionId, SaveInpatientDiagnosisDto dto, Guid userId)
    {
        var admission = await _context.Set<Admission>().FindAsync(admissionId)
            ?? throw new KeyNotFoundException($"Đợt điều trị {admissionId} không tìm thấy");

        var medRecord = await _context.MedicalRecords.FindAsync(admission.MedicalRecordId)
            ?? throw new KeyNotFoundException($"Hồ sơ bệnh án không tìm thấy");

        // #218/T3: hồ sơ đã kết thúc và khoá theo TT46 thì không ghi chẩn đoán vào nữa.
        // `EmrLockGuard` sinh ra đúng cho việc này — docstring của nó ghi "gọi 1 dòng ở đầu mọi
        // mutation nội dung (tờ điều trị, CHẨN ĐOÁN, kết luận, sinh hiệu, đơn thuốc...)" — nhưng cửa
        // này chưa gọi. Đo được ở evidence/cross/t3/t3_emr_locked_content.json: chẩn đoán chính của
        // một hồ sơ đã khoá bị ghi đè, HTTP 200. Tìm ra bằng bộ dò t3_verified_edit_sweep.py.
        await EmrLockGuard.EnsureEditableByRecordAsync(_context, medRecord.Id);

        // Update MedicalRecord fields (existing columns — no migration needed)
        medRecord.MainIcdCode = dto.MainDiagnosisCode?.Trim();
        medRecord.MainDiagnosis = dto.MainDiagnosis?.Trim();

        // SubIcdCodes / SubDiagnosis stored as pipe-delimited strings (existing pattern)
        if (dto.SecondaryDiagnoses.Count > 0)
        {
            medRecord.SubIcdCodes = string.Join("|", dto.SecondaryDiagnoses.Select(x => x.Code));
            medRecord.SubDiagnosis = string.Join("|", dto.SecondaryDiagnoses.Select(x => x.Name));
        }
        else
        {
            medRecord.SubIcdCodes = null;
            medRecord.SubDiagnosis = null;
        }

        medRecord.UpdatedAt = DateTime.UtcNow;
        if (_context.Entry(medRecord).State == Microsoft.EntityFrameworkCore.EntityState.Detached)
            _context.MedicalRecords.Update(medRecord);

        await _context.SaveChangesAsync();

        // Build response from saved data
        var secondaries = new List<SecondaryDiagnosisItemDto>();
        if (!string.IsNullOrWhiteSpace(medRecord.SubIcdCodes))
        {
            var codes = medRecord.SubIcdCodes.Split('|');
            var names = medRecord.SubDiagnosis?.Split('|') ?? Array.Empty<string>();
            for (int i = 0; i < codes.Length; i++)
            {
                if (!string.IsNullOrWhiteSpace(codes[i]))
                    secondaries.Add(new SecondaryDiagnosisItemDto { Code = codes[i], Name = i < names.Length ? names[i] : string.Empty });
            }
        }

        return new InpatientDiagnosisDto
        {
            MainDiagnosisCode = medRecord.MainIcdCode,
            MainDiagnosis = medRecord.MainDiagnosis,
            SecondaryDiagnoses = secondaries,
        };
    }

    public async Task<List<object>> GetServiceTreeAsync(Guid? parentId)
    {
        // Cây dịch vụ nhóm theo ServiceType (audit luồng nghiệp vụ 2026-06-06 #2 — trước đây rỗng).
        var services = await _context.Services
            .Where(s => s.IsActive)
            .OrderBy(s => s.ServiceType).ThenBy(s => s.ServiceName)
            .ToListAsync();
        return services
            .GroupBy(s => s.ServiceType)
            .Select(g => (object)new
            {
                serviceType = g.Key,
                children = g.Select(s => new
                {
                    id = s.Id,
                    serviceCode = s.ServiceCode,
                    serviceName = s.ServiceName,
                    unitPrice = s.UnitPrice
                }).ToList()
            })
            .ToList();
    }

    public async Task<List<object>> SearchServicesAsync(string keyword, string? serviceType)
    {
        var query = _context.Services.Where(s => s.IsActive);
        if (!string.IsNullOrWhiteSpace(keyword))
            query = query.Where(s => s.ServiceCode.Contains(keyword) || s.ServiceName.Contains(keyword));
        if (!string.IsNullOrWhiteSpace(serviceType) && int.TryParse(serviceType, out var st))
            query = query.Where(s => s.ServiceType == st);
        var services = await query.OrderBy(s => s.ServiceName).Take(100).ToListAsync();
        return services.Select(s => (object)new
        {
            id = s.Id,
            serviceCode = s.ServiceCode,
            serviceName = s.ServiceName,
            serviceType = s.ServiceType,
            unitPrice = s.UnitPrice
        }).ToList();
    }

    public async Task<InpatientServiceOrderDto> CreateServiceOrderAsync(CreateInpatientServiceOrderDto dto, Guid userId)
    {
        // Persist THẬT: 1 ServiceRequest (header, mã CDNT*) + ServiceRequestDetail mỗi dịch vụ —
        // cùng nguồn-sự-thật với OPD/LIS/RIS + viện phí (audit luồng nghiệp vụ 2026-06-06 #2).
        // Trước đây chỉ trả DTO in-memory ("we don't have a ServiceOrders table") → chỉ định CLS
        // tại giường biến mất, không lấy mẫu/trả KQ/tính viện phí được.
        var admission = await _context.Set<Admission>()
            .FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
        if (admission == null) throw new KeyNotFoundException("Admission not found");
        await CheckDepositEnforceBlockAsync(admission.PatientId); // F3.3

        var doctor = await _context.Users.FindAsync(userId);

        var request = new ServiceRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"CDNT{DateTime.Now:yyyyMMddHHmmss}",
            RequestDate = DateTime.UtcNow, // dot16: chuẩn UTC
            MedicalRecordId = admission.MedicalRecordId,
            DoctorId = userId,
            DepartmentId = admission.DepartmentId,
            RequestType = 0, // hỗn hợp — phân loại theo từng dịch vụ ở Detail
            Diagnosis = dto.MainDiagnosis,
            IcdCode = dto.MainDiagnosisCode,
            RequestedByUserId = userId,
            RequestedDate = DateTime.Now,
            Status = 0,
        };

        var serviceItems = new List<InpatientServiceItemDto>();
        decimal totalAmount = 0;

        // perf(#195): batch-load services instead of FindAsync per item (N+1)
        var serviceIds = dto.Services.Select(s => s.ServiceId).Distinct().ToList();
        var servicesMap = await _context.Services
            .Where(s => serviceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id);

        foreach (var item in dto.Services)
        {
            if (!servicesMap.TryGetValue(item.ServiceId, out var service)) continue;

            var amount = service.UnitPrice * item.Quantity;
            totalAmount += amount;

            request.Details.Add(new ServiceRequestDetail
            {
                Id = Guid.NewGuid(),
                ServiceRequestId = request.Id,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                Amount = amount,
                InsuranceAmount = 0,
                PatientAmount = amount,
                PatientType = item.PaymentSource,
                Status = 0,
                Note = item.Note,
            });

            serviceItems.Add(new InpatientServiceItemDto
            {
                Id = Guid.NewGuid(),
                ServiceId = item.ServiceId,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                Amount = amount,
                PaymentSource = item.PaymentSource,
                ExecutingRoomId = item.ExecutingRoomId,
                ScheduledDate = item.ScheduledDate,
                Status = 0
            });
        }

        request.Quantity = dto.Services.Sum(s => s.Quantity);
        request.ServiceId = dto.Services.FirstOrDefault()?.ServiceId;
        request.UnitPrice = serviceItems.Count > 0 ? serviceItems[0].UnitPrice : 0;
        request.TotalPrice = totalAmount;
        request.TotalAmount = totalAmount;
        request.InsuranceAmount = 0;
        request.PatientAmount = totalAmount;

        await _context.ServiceRequests.AddAsync(request);
        await _context.SaveChangesAsync();

        return new InpatientServiceOrderDto
        {
            Id = request.Id,
            AdmissionId = dto.AdmissionId,
            OrderDate = request.RequestDate,
            OrderingDoctorId = userId,
            OrderingDoctorName = doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = dto.MainDiagnosisCode,
            MainDiagnosis = dto.MainDiagnosis,
            SecondaryDiagnosisCodes = dto.SecondaryDiagnosisCodes,
            SecondaryDiagnoses = dto.SecondaryDiagnoses,
            Services = serviceItems,
            Status = 0,
            TotalAmount = totalAmount,
            InsuranceAmount = 0,
            PatientPayAmount = totalAmount
        };
    }

    public async Task<InpatientServiceOrderDto> UpdateServiceOrderAsync(Guid id, CreateInpatientServiceOrderDto dto, Guid userId)
    {
        // Cập nhật = huỷ phiếu cũ (chưa thực hiện) rồi tạo phiếu mới — tránh nhân đôi phiếu khi
        // phiếu đã persist. Chỉ huỷ được khi còn ở trạng thái Chờ (0), không đụng phiếu đã làm.
        var existing = await _context.ServiceRequests
            .Include(r => r.Details)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (existing != null && existing.Status == 0)
        {
            existing.Status = 4; // Đã hủy (ServiceRequest.Status: 4=hủy; SRD.Status: 3=hủy)
            foreach (var d in existing.Details) d.Status = 3;
            await _context.SaveChangesAsync();
        }
        return await CreateServiceOrderAsync(dto, userId);
    }

    public async Task DeleteServiceOrderAsync(Guid id, Guid userId)
    {
        var request = await _context.ServiceRequests
            .Include(r => r.Details)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request == null || request.Status != 0) return; // chỉ huỷ phiếu chưa thực hiện
        request.Status = 4; // Đã hủy (ServiceRequest.Status: 4=hủy; SRD.Status: 3=hủy)
        foreach (var d in request.Details) d.Status = 3;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteServiceItemAsync(Guid itemId, Guid userId)
    {
        var detail = await _context.ServiceRequestDetails.FirstOrDefaultAsync(d => d.Id == itemId);
        if (detail == null || detail.Status != 0) return;
        detail.Status = 3; // Huỷ dòng dịch vụ
        await _context.SaveChangesAsync();
    }

    public async Task<List<InpatientServiceOrderDto>> GetServiceOrdersAsync(Guid admissionId, DateTime? fromDate, DateTime? toDate)
    {
        // Đọc lại các chỉ định CLS tại giường đã persist (mã CDNT*) cho HSBA của lần nhập viện này.
        var admission = await _context.Set<Admission>().FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return new List<InpatientServiceOrderDto>();

        var query = _context.ServiceRequests
            .Include(r => r.Doctor)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .Where(r => r.MedicalRecordId == admission.MedicalRecordId
                     && r.RequestCode.StartsWith("CDNT")
                     && r.Status != 4);
        if (fromDate.HasValue) query = query.Where(r => r.RequestDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(r => r.RequestDate <= toDate.Value);

        var requests = await query.OrderByDescending(r => r.RequestDate).ToBoundedListAsync("InpatientCompleteService.GetServiceOrdersAsync");
        return requests.Select(r => MapToInpatientOrder(r, admissionId)).ToList();
    }

    public async Task<InpatientServiceOrderDto?> GetServiceOrderByIdAsync(Guid id)
    {
        var r = await _context.ServiceRequests
            .Include(x => x.Doctor)
            .Include(x => x.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var admission = await _context.Set<Admission>()
            .FirstOrDefaultAsync(a => a.MedicalRecordId == r.MedicalRecordId);
        return MapToInpatientOrder(r, admission?.Id ?? Guid.Empty);
    }

    private static InpatientServiceOrderDto MapToInpatientOrder(ServiceRequest r, Guid admissionId)
    {
        return new InpatientServiceOrderDto
        {
            Id = r.Id,
            AdmissionId = admissionId,
            OrderDate = r.RequestDate,
            OrderingDoctorId = r.DoctorId,
            OrderingDoctorName = r.Doctor?.FullName ?? string.Empty,
            MainDiagnosisCode = r.IcdCode,
            MainDiagnosis = r.Diagnosis,
            Services = r.Details
                .Where(d => d.Status != 3)
                .Select(d => new InpatientServiceItemDto
                {
                    Id = d.Id,
                    ServiceId = d.ServiceId,
                    ServiceCode = d.Service?.ServiceCode ?? string.Empty,
                    ServiceName = d.Service?.ServiceName ?? string.Empty,
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    Amount = d.Amount,
                    PaymentSource = d.PatientType,
                    Status = d.Status
                }).ToList(),
            Status = r.Status,
            TotalAmount = r.TotalAmount,
            InsuranceAmount = r.InsuranceAmount,
            PatientPayAmount = r.PatientAmount
        };
    }

    public Task<ServiceGroupTemplateDto> CreateServiceGroupTemplateAsync(ServiceGroupTemplateDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<List<ServiceGroupTemplateDto>> GetServiceGroupTemplatesAsync(Guid? departmentId, Guid? userId)
    {
        return Task.FromResult(new List<ServiceGroupTemplateDto>());
    }

    public Task<InpatientServiceOrderDto> OrderByTemplateAsync(Guid admissionId, Guid templateId, Guid userId)
    {
        return Task.FromResult(new InpatientServiceOrderDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            OrderDate = DateTime.Now,
            OrderingDoctorId = userId,
            Status = 0
        });
    }

    public Task<InpatientServiceOrderDto> CopyPreviousServiceOrderAsync(Guid admissionId, Guid sourceOrderId, Guid userId)
    {
        return Task.FromResult(new InpatientServiceOrderDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            OrderDate = DateTime.Now,
            OrderingDoctorId = userId,
            Status = 0
        });
    }

    public Task<InpatientServiceOrderDto> OrderByPackageAsync(Guid admissionId, Guid packageId, Guid userId)
    {
        return Task.FromResult(new InpatientServiceOrderDto
        {
            Id = Guid.NewGuid(),
            AdmissionId = admissionId,
            OrderDate = DateTime.Now,
            OrderingDoctorId = userId,
            Status = 0
        });
    }

    public Task MarkServiceAsUrgentAsync(Guid itemId, bool isUrgent, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task MarkServiceAsEmergencyAsync(Guid itemId, bool isEmergency, Guid userId)
    {
        return Task.CompletedTask;
    }

    public Task<ServiceOrderWarningDto> CheckServiceOrderWarningsAsync(Guid admissionId, List<CreateInpatientServiceItemDto> items)
    {
        return Task.FromResult(new ServiceOrderWarningDto
        {
            HasDuplicateToday = false,
            ExceedsDeposit = false,
            HasTT35Warnings = false,
            ExceedsPackageLimit = false,
            IsOutsideProtocol = false
        });
    }

    public async Task<byte[]> PrintServiceOrderAsync(Guid orderId)
    {
        var sr = await _context.ServiceRequests
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Department)
            .Include(s => s.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(s => s.Id == orderId);
        if (sr == null) return Array.Empty<byte>();

        var patient = sr.MedicalRecord.Patient;
        var dept = sr.MedicalRecord.Department;
        var doctor = await _context.Users.FindAsync(sr.DoctorId);

        var headers = new[] { "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = sr.Details.Select(d => new[]
        {
            d.Service?.ServiceName ?? "",
            d.Service?.Unit ?? "",
            d.Quantity.ToString("#,##0"),
            d.UnitPrice.ToString("#,##0"),
            d.Amount.ToString("#,##0")
        }).ToList();

        var html = BuildTableReport(
            "PHIẾU CHỈ ĐỊNH DỊCH VỤ",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(sr.MedicalRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            sr.RequestDate,
            headers, rows,
            doctor?.FullName, "Bác sĩ chỉ định");

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintServiceOrderByPaymentSourceAsync(Guid orderId, int paymentSource)
    {
        var sr = await _context.ServiceRequests
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(s => s.MedicalRecord).ThenInclude(m => m.Department)
            .Include(s => s.Details).ThenInclude(d => d.Service)
            .FirstOrDefaultAsync(s => s.Id == orderId);
        if (sr == null) return Array.Empty<byte>();

        var patient = sr.MedicalRecord.Patient;
        var dept = sr.MedicalRecord.Department;
        var doctor = await _context.Users.FindAsync(sr.DoctorId);
        var filteredDetails = sr.Details.Where(d => d.PatientType == paymentSource).ToList();
        var paymentName = paymentSource switch { 1 => "BHYT", 2 => "Viện phí", 3 => "Bên thứ 3", _ => "Khác" };

        var headers = new[] { "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = filteredDetails.Select(d => new[]
        {
            d.Service?.ServiceName ?? "",
            d.Service?.Unit ?? "",
            d.Quantity.ToString("#,##0"),
            d.UnitPrice.ToString("#,##0"),
            d.Amount.ToString("#,##0")
        }).ToList();

        var html = BuildTableReport(
            $"PHIẾU CHỈ ĐỊNH DỊCH VỤ - {paymentName}",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(sr.MedicalRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)}",
            sr.RequestDate,
            headers, rows,
            doctor?.FullName, "Bác sĩ chỉ định");

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> PrintCombinedServiceOrderAsync(Guid admissionId, DateTime fromDate, DateTime toDate)
    {
        var admission = await _context.Set<Admission>()
            .Include(a => a.Patient)
            .Include(a => a.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(a => a.Id == admissionId);
        if (admission == null) return Array.Empty<byte>();

        var patient = admission.Patient;
        var medRecord = admission.MedicalRecord;
        var dept = medRecord.Department;

        var details = await _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medRecord.Id
                && d.ServiceRequest.RequestDate >= fromDate
                && d.ServiceRequest.RequestDate <= toDate
                && !d.IsDeleted)
            .OrderBy(d => d.ServiceRequest.RequestDate)
            .ToListAsync();

        var headers = new[] { "Ngày CĐ", "Tên dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền" };
        var rows = details.Select(d => new[]
        {
            d.ServiceRequest.RequestDate.ToString("dd/MM/yyyy"),
            d.Service?.ServiceName ?? "",
            d.Service?.Unit ?? "",
            d.Quantity.ToString("#,##0"),
            d.UnitPrice.ToString("#,##0"),
            d.Amount.ToString("#,##0")
        }).ToList();

        var html = BuildTableReport(
            "TỔNG HỢP CHỈ ĐỊNH DỊCH VỤ",
            $"BN: {Esc(patient.FullName)} - Mã HS: {Esc(medRecord.MedicalRecordCode)} - Khoa: {Esc(dept?.DepartmentName)} - Từ {fromDate:dd/MM/yyyy} đến {toDate:dd/MM/yyyy}",
            null,
            headers, rows);

        return Encoding.UTF8.GetBytes(html);
    }

    #endregion
}
