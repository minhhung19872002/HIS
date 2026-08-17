using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Examination;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using ServiceDto = HIS.Application.Services.ServiceDto;
using RoomDto = HIS.Application.Services.RoomDto;
using MedicineDto = HIS.Application.Services.MedicineDto;
using DoctorDto = HIS.Application.Services.DoctorDto;
using ExamWarehouseDto = HIS.Application.Services.ExamWarehouseDto;

namespace HIS.Infrastructure.Services;

// K4 phien 3 (2026-05-30): tach Section 2.6 Service Orders (~569 dong) khoi
// ExaminationCompleteService.cs. ZERO runtime change — partial class.
public partial class ExaminationCompleteService
{
    #region 2.6 Service Orders

    public async Task<List<ServiceOrderFullDto>> GetServiceOrdersAsync(Guid examinationId)
    {
        var examination = await _examinationRepo.GetByIdAsync(examinationId);
        if (examination == null) return new List<ServiceOrderFullDto>();

        var requests = await _context.ServiceRequests
            .Include(r => r.Service)
            .Include(r => r.Room)
            .Include(r => r.Doctor)
            .Where(r => r.MedicalRecordId == examination.MedicalRecordId)
            .ToListAsync();

        return requests.Select(r => new ServiceOrderFullDto
        {
            Id = r.Id,
            ExaminationId = examinationId,
            OrderDate = r.RequestedDate ?? DateTime.Now,
            ServiceId = r.ServiceId ?? Guid.Empty,
            ServiceCode = r.Service?.ServiceCode ?? "",
            ServiceName = r.Service?.ServiceName ?? "",
            ServiceType = r.Service?.ServiceType ?? 0,
            Quantity = r.Quantity,
            UnitPrice = r.UnitPrice,
            TotalPrice = r.TotalPrice,
            RoomId = r.RoomId,
            RoomName = r.Room?.RoomName,
            PaymentType = 1,
            IsPriority = r.IsPriority,
            IsEmergency = r.IsEmergency,
            Status = r.Status,
            OrderNotes = r.Notes ?? r.Note,
            OrderedById = r.RequestedByUserId ?? r.DoctorId,
            OrderedByName = r.Doctor?.FullName,
        }).ToList();
    }

    public async Task<List<ServiceOrderFullDto>> CreateServiceOrdersAsync(CreateServiceOrderDto dto)
    {
        var examination = await _examinationRepo.GetByIdAsync(dto.ExaminationId);
        if (examination == null) throw new Exception("Examination not found");
        var effectiveDoctorId = examination.DoctorId ?? GetCurrentUserId();
        if (!effectiveDoctorId.HasValue)
        {
            throw new Exception("No valid doctor/user is available to create service orders");
        }

        var results = new List<ServiceOrderFullDto>();

        foreach (var item in dto.Services)
        {
            var service = await _context.Services.FindAsync(item.ServiceId);
            if (service == null) continue;

            var request = new ServiceRequest
            {
                Id = Guid.NewGuid(),
                RequestCode = $"CD{DateTime.Now:yyyyMMddHHmmss}",
                RequestDate = DateTime.UtcNow, // dot16: chuẩn UTC — nguồn copy sang RadiologyRequest.RequestDate (DayRangeUtc)
                MedicalRecordId = examination.MedicalRecordId,
                ExaminationId = examination.Id,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = service.UnitPrice * item.Quantity,
                TotalAmount = service.UnitPrice * item.Quantity,
                InsuranceAmount = 0,
                PatientAmount = service.UnitPrice * item.Quantity,
                DoctorId = effectiveDoctorId.Value,
                DepartmentId = examination.DepartmentId,
                RequestType = service.ServiceType,
                IsEmergency = item.IsEmergency,
                IsPriority = item.IsPriority,
                RequestedByUserId = effectiveDoctorId.Value,
                RoomId = item.RoomId,
                Status = 0,
                RequestedDate = DateTime.Now,
                Notes = item.Notes
            };

            // #9 (audit luồng nghiệp vụ 2026-06-06): tạo ServiceRequestDetail cho mỗi dịch vụ —
            // nguồn-sự-thật cho lấy mẫu/nhận mẫu/trả KQ (đọc bởi GetPatientLabResultsAsync #1) + viện phí.
            request.Details.Add(new ServiceRequestDetail
            {
                Id = Guid.NewGuid(),
                ServiceRequestId = request.Id,
                ServiceId = item.ServiceId,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                Amount = service.UnitPrice * item.Quantity,
                InsuranceAmount = 0,
                PatientAmount = service.UnitPrice * item.Quantity,
                PatientType = item.PaymentType,
                Status = 0,
                Note = item.Notes,
            });

            await _context.ServiceRequests.AddAsync(request);

            results.Add(new ServiceOrderFullDto
            {
                Id = request.Id,
                ExaminationId = dto.ExaminationId,
                OrderDate = request.RequestedDate ?? request.RequestDate,
                DiagnosisCode = dto.DiagnosisCode,
                DiagnosisName = dto.DiagnosisName,
                ServiceId = service.Id,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                ServiceType = service.ServiceType,
                Quantity = item.Quantity,
                UnitPrice = service.UnitPrice,
                TotalPrice = request.TotalPrice,
                PaymentType = item.PaymentType,
                IsPriority = item.IsPriority,
                IsEmergency = item.IsEmergency,
                RoomId = item.RoomId,
                Status = 0,
                OrderNotes = request.Notes,
                OrderedById = effectiveDoctorId.Value,
            });
        }

        // #7: phiên khám chuyển sang "Chờ CLS" (ExaminationStatus=2) khi vừa tạo chỉ định CLS —
        // hàng đợi phòng khám phản ánh đúng bước BN đang ở. Chỉ tiến, không lùi trạng thái.
        if (results.Count > 0)
        {
            var examEntity = await _context.Examinations.FirstOrDefaultAsync(e => e.Id == dto.ExaminationId);
            if (examEntity != null && examEntity.Status < HIS.Core.Constants.ExaminationStatus.PendingCLS)
                examEntity.Status = HIS.Core.Constants.ExaminationStatus.PendingCLS;
        }

        await _unitOfWork.SaveChangesAsync();
        return results;
    }

    public async Task<ServiceOrderFullDto> UpdateServiceOrderAsync(Guid orderId, ServiceOrderFullDto dto)
    {
        var request = await _context.ServiceRequests.FindAsync(orderId);
        if (request == null) throw new Exception("Service order not found");

        request.Quantity = dto.Quantity;
        request.TotalPrice = dto.UnitPrice * dto.Quantity;
        request.RoomId = dto.RoomId;

        await _unitOfWork.SaveChangesAsync();

        dto.Id = orderId;
        return dto;
    }

    public async Task<bool> CancelServiceOrderAsync(Guid orderId, string reason)
    {
        var request = await _context.ServiceRequests.FindAsync(orderId);
        if (request == null || request.Status != 0) return false;

        request.Status = 3; // Cancelled
        request.Notes = reason;

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<ServiceDto>> GetServicesAsync(int? serviceType = null, Guid? departmentId = null, string? keyword = null)
    {
        var query = _context.Services.Where(s => s.IsActive);

        if (serviceType.HasValue)
            query = query.Where(s => s.ServiceType == serviceType.Value);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(s => s.ServiceCode.Contains(keyword) || s.ServiceName.Contains(keyword));

        var services = await query.Take(100).ToListAsync();

        return services.Select(s => new ServiceDto
        {
            Id = s.Id,
            Code = s.ServiceCode,
            Name = s.ServiceName,
            ServiceType = s.ServiceType,
            UnitPrice = s.UnitPrice,
            InsurancePrice = s.InsurancePrice,
            IsActive = s.IsActive
        }).ToList();
    }

    public async Task<List<ServiceDto>> SearchServicesAsync(string keyword, int limit = 20)
    {
        return await GetServicesAsync(null, null, keyword);
    }

    public async Task<List<ServiceGroupTemplateDto>> GetServiceGroupTemplatesAsync(Guid? departmentId = null)
    {
        var query = _context.ServiceGroupTemplates
            .Include(t => t.Items)
            .ThenInclude(i => i.Service)
            .Where(t => t.IsActive);

        if (departmentId.HasValue)
            query = query.Where(t => t.DepartmentId == departmentId || t.IsPublic);

        return await query
            .OrderBy(t => t.TemplateName)
            .Select(t => new ServiceGroupTemplateDto
            {
                Id = t.Id,
                TemplateCode = t.TemplateCode,
                TemplateName = t.TemplateName,
                DepartmentId = t.DepartmentId,
                IsPublic = t.IsPublic,
                Services = t.Items.Select(i => new ServiceGroupTemplateItemDto
                {
                    ServiceId = i.ServiceId,
                    ServiceCode = i.Service.ServiceCode,
                    ServiceName = i.Service.ServiceName,
                    Quantity = i.Quantity,
                    Notes = i.Notes
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<ServiceGroupTemplateDto> CreateServiceGroupTemplateAsync(ServiceGroupTemplateDto dto)
    {
        var template = new ServiceGroupTemplate
        {
            Id = Guid.NewGuid(),
            TemplateCode = dto.TemplateCode ?? $"DV{DateTime.Now:yyyyMMddHHmmss}",
            TemplateName = dto.TemplateName,
            DepartmentId = dto.DepartmentId,
            IsPublic = dto.IsPublic,
            IsActive = true,
            Items = new List<ServiceGroupTemplateItem>()
        };

        if (dto.Services != null)
        {
            foreach (var item in dto.Services)
            {
                template.Items.Add(new ServiceGroupTemplateItem
                {
                    Id = Guid.NewGuid(),
                    ServiceGroupTemplateId = template.Id,
                    ServiceId = item.ServiceId,
                    Quantity = item.Quantity,
                    Notes = item.Notes
                });
            }
        }

        await _context.ServiceGroupTemplates.AddAsync(template);
        await _unitOfWork.SaveChangesAsync();

        dto.Id = template.Id;
        return dto;
    }

    public async Task<ServiceGroupTemplateDto> UpdateServiceGroupTemplateAsync(Guid id, ServiceGroupTemplateDto dto)
    {
        var template = await _context.ServiceGroupTemplates
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null) throw new Exception("Template not found");

        template.TemplateCode = dto.TemplateCode;
        template.TemplateName = dto.TemplateName;
        template.DepartmentId = dto.DepartmentId;
        template.IsPublic = dto.IsPublic;

        // Remove old items
        _context.ServiceGroupTemplateItems.RemoveRange(template.Items);

        // Add new items
        if (dto.Services != null)
        {
            foreach (var item in dto.Services)
            {
                template.Items.Add(new ServiceGroupTemplateItem
                {
                    Id = Guid.NewGuid(),
                    ServiceGroupTemplateId = template.Id,
                    ServiceId = item.ServiceId,
                    Quantity = item.Quantity,
                    Notes = item.Notes
                });
            }
        }

        await _unitOfWork.SaveChangesAsync();

        dto.Id = id;
        return dto;
    }

    public async Task<bool> DeleteServiceGroupTemplateAsync(Guid id)
    {
        var template = await _context.ServiceGroupTemplates.FindAsync(id);
        if (template == null) return false;

        template.IsActive = false;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<ServicePackageDto>> GetServicePackagesAsync()
    {
        var packages = await _context.ServicePackages
            .Include(p => p.Items).ThenInclude(it => it.Service)
            .Where(p => !p.IsDeleted && p.IsActive
                        && (p.EffectiveTo == null || p.EffectiveTo >= DateTime.UtcNow))
            .OrderBy(p => p.PackageName)
            .ToListAsync();

        return packages.Select(p => new ServicePackageDto
        {
            Id = p.Id,
            PackageCode = p.PackageCode,
            PackageName = p.PackageName,
            PackagePrice = p.FinalPrice > 0 ? p.FinalPrice : p.TotalPrice,
            Services = (p.Items ?? new List<ServicePackageItem>())
                .Select(it => new ServicePackageItemDto
                {
                    ServiceId = it.ServiceId,
                    ServiceCode = it.Service?.ServiceCode ?? "",
                    ServiceName = it.Service?.ServiceName ?? "",
                    Quantity = it.Quantity,
                    UnitPrice = it.UnitPrice,
                }).ToList(),
        }).ToList();
    }

    public async Task<List<ServiceOrderFullDto>> ApplyServicePackageAsync(Guid examinationId, Guid packageId)
    {
        // "Apply" = synthesize ServiceOrderFullDto rows for each item in the
        // package so the frontend can stage them into the examination's
        // pending orders without inserting into ServiceRequests yet.
        var package = await _context.ServicePackages
            .Include(p => p.Items).ThenInclude(it => it.Service)
            .FirstOrDefaultAsync(p => p.Id == packageId && !p.IsDeleted && p.IsActive);
        if (package == null || package.Items == null || package.Items.Count == 0)
            return new List<ServiceOrderFullDto>();

        var exam = await _context.Examinations
            .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted);
        if (exam == null) return new List<ServiceOrderFullDto>();

        return package.Items.Select(it => new ServiceOrderFullDto
        {
            Id = Guid.Empty,
            ExaminationId = examinationId,
            ServiceId = it.ServiceId,
            ServiceCode = it.Service?.ServiceCode ?? "",
            ServiceName = it.Service?.ServiceName ?? "",
            Quantity = it.Quantity,
            UnitPrice = it.UnitPrice,
            TotalPrice = it.UnitPrice * it.Quantity,
            Status = 0,
        }).ToList();
    }

    public async Task<List<ServiceOrderWarningDto>> CheckDuplicateServicesAsync(Guid examinationId, List<Guid> serviceIds)
    {
        if (serviceIds == null || serviceIds.Count == 0) return new List<ServiceOrderWarningDto>();

        var exam = await _context.Examinations
            .FirstOrDefaultAsync(e => e.Id == examinationId && !e.IsDeleted);
        if (exam == null) return new List<ServiceOrderWarningDto>();

        var today = DateTime.UtcNow.Date;
        var existing = await _context.ServiceRequests
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .Where(r => r.MedicalRecordId == exam.MedicalRecordId
                        && !r.IsDeleted
                        && r.Status != 4 // not cancelled
                        && r.RequestDate >= today.AddDays(-1))
            .ToListAsync();

        var warnings = new List<ServiceOrderWarningDto>();
        foreach (var sid in serviceIds.Distinct())
        {
            var dup = existing
                .SelectMany(r => r.Details ?? new List<ServiceRequestDetail>())
                .Where(d => d.ServiceId == sid)
                .OrderByDescending(d => d.CreatedAt)
                .FirstOrDefault();
            if (dup != null)
            {
                warnings.Add(new ServiceOrderWarningDto
                {
                    WarningType = 1,
                    Message = $"Dịch vụ {dup.Service?.ServiceName ?? sid.ToString()} đã được chỉ định trong ngày",
                    IsBlocking = false,
                    RelatedServiceId = sid,
                    LastOrderDate = dup.CreatedAt,
                });
            }
        }
        return warnings;
    }

    public async Task<List<ServiceOrderWarningDto>> ValidateServiceOrdersAsync(Guid examinationId, List<Guid> serviceIds)
    {
        // Validation = duplicates + any future rules. For now, reuse duplicate check.
        return await CheckDuplicateServicesAsync(examinationId, serviceIds);
    }

    public async Task<List<RoomDto>> GetServiceRoomsAsync(Guid serviceId)
    {
        var rooms = await _context.Rooms.Where(r => r.IsActive).Take(10).ToListAsync();

        return rooms.Select(r => new RoomDto
        {
            Id = r.Id,
            Code = r.RoomCode,
            Name = r.RoomName,
            DepartmentId = r.DepartmentId,
            RoomType = r.RoomType,
            IsActive = r.IsActive
        }).ToList();
    }

    public async Task<Guid?> AutoSelectOptimalRoomAsync(Guid serviceId)
    {
        var room = await _context.Rooms.FirstOrDefaultAsync(r => r.IsActive);
        return room?.Id;
    }

    public async Task<List<RoomDto>> CalculateOptimalPathAsync(List<Guid> serviceIds)
    {
        if (!serviceIds.Any()) return new List<RoomDto>();

        var result = new List<RoomDto>();

        // Get services and their available rooms
        foreach (var serviceId in serviceIds)
        {
            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) continue;

            // Find room that can perform this service with least waiting
            var availableRooms = await _context.Rooms
                .Include(r => r.Department)
                .Where(r => r.IsActive && r.ServiceTypes != null && r.ServiceTypes.Contains(service.ServiceType.ToString()))
                .ToListAsync();

            if (!availableRooms.Any())
            {
                // Fall back to any active room that can perform this service.
                // RoomType và ServiceType là hai bảng mã khác nhau — phải ánh xạ, không so trực tiếp
                // (xem HIS.Core.Common.RoomTypes).
                var roomTypes = HIS.Core.Common.RoomTypes.ForServiceType(service.ServiceType);
                availableRooms = roomTypes.Length == 0
                    ? new List<Room>()
                    : await _context.Rooms
                        .Include(r => r.Department)
                        .Where(r => r.IsActive && roomTypes.Contains(r.RoomType))
                        .ToListAsync();
            }

            var optimalRoom = availableRooms.FirstOrDefault();
            if (optimalRoom != null && !result.Any(r => r.Id == optimalRoom.Id))
            {
                result.Add(new RoomDto
                {
                    Id = optimalRoom.Id,
                    Code = optimalRoom.RoomCode,
                    Name = optimalRoom.RoomName,
                    DepartmentId = optimalRoom.DepartmentId,
                    DepartmentName = optimalRoom.Department?.DepartmentName,
                    RoomType = optimalRoom.RoomType,
                    IsActive = optimalRoom.IsActive
                });
            }
        }

        return result;
    }

    public async Task<List<ServiceDto>> GetFrequentServicesAsync(Guid doctorId, int limit = 20)
    {
        return await GetServicesAsync(null, null, null);
    }

    public async Task<byte[]> PrintServiceOrderAsync(Guid orderId)
    {
        try
        {
            var order = await _context.ServiceRequests
                .Include(sr => sr.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(sr => sr.Doctor)
                .Include(sr => sr.Department)
                .Include(sr => sr.Details).ThenInclude(d => d.Service)
                .FirstOrDefaultAsync(sr => sr.Id == orderId);
            if (order == null) return Array.Empty<byte>();

            var patient = order.MedicalRecord.Patient;
            var requestTypeText = order.RequestType switch
            {
                1 => "Xet nghiem",
                2 => "Chan doan hinh anh",
                3 => "Tham do chuc nang",
                4 => "Phau thuat/Thu thuat",
                _ => "Khac"
            };

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIEU CHI DINH DICH VU</div>");
            body.AppendLine($@"<div class=""form-number"">So: {Esc(order.RequestCode)}</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, order.MedicalRecord.InsuranceNumber,
                order.MedicalRecord.MedicalRecordCode, order.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Loai chi dinh:</span><span class=""field-value"">{Esc(requestTypeText)}</span></div>");
            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(order.Diagnosis)} ({Esc(order.IcdCode)})</span></div>");
            if (order.IsEmergency)
                body.AppendLine(@"<div class=""field""><span class=""field-value text-bold"" style=""color:red"">CAP CUU</span></div>");

            body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Ten dich vu</th><th>SL</th><th>Don gia</th><th>Thanh tien</th><th>Ghi chu</th></tr></thead><tbody>");
            int idx = 0;
            decimal total = 0;
            foreach (var detail in order.Details)
            {
                idx++;
                total += detail.Amount;
                body.AppendLine($@"<tr><td class=""text-center"">{idx}</td><td>{Esc(detail.Service?.ServiceName)}</td><td class=""text-center"">{detail.Quantity}</td><td class=""text-right"">{detail.UnitPrice:#,##0}</td><td class=""text-right"">{detail.Amount:#,##0}</td><td>{Esc(detail.Note)}</td></tr>");
            }
            body.AppendLine($@"<tr><td colspan=""4"" class=""text-right""><b>Tong cong:</b></td><td class=""text-right""><b>{total:#,##0}</b></td><td></td></tr>");
            body.AppendLine("</tbody></table>");

            if (!string.IsNullOrEmpty(order.Note))
                body.AppendLine($@"<div class=""field"" style=""margin-top:10px""><span class=""field-label"">Ghi chu:</span><span class=""field-value"">{Esc(order.Note)}</span></div>");

            // NangCap25 I.4 — phiếu chưa thanh toán → nhúng QR động (helper tự bỏ qua nếu đã TT / miễn phí)
            if (!order.IsPaid)
                body.AppendLine(await _paymentGateway.BuildPrintQrBlockHtmlAsync(
                    new HIS.Application.DTOs.Payment.DynamicQrRequestDto
                    {
                        ReferenceType = "service-request",
                        ReferenceId = order.Id
                    }, Guid.Empty));

            body.AppendLine(GetSignatureBlock(order.Doctor?.FullName));

            var html = WrapHtmlPage("Phieu chi dinh dich vu", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    public async Task<byte[]> PrintAllServiceOrdersAsync(Guid examinationId)
    {
        try
        {
            var examination = await _context.Examinations
                .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(e => e.Doctor)
                .Include(e => e.Department)
                .FirstOrDefaultAsync(e => e.Id == examinationId);
            if (examination == null) return Array.Empty<byte>();

            var orders = await _context.ServiceRequests
                .Include(sr => sr.Details).ThenInclude(d => d.Service)
                .Include(sr => sr.Doctor)
                .Where(sr => sr.ExaminationId == examinationId)
                .OrderBy(sr => sr.RequestDate)
                .ToListAsync();
            if (!orders.Any()) return Array.Empty<byte>();

            var patient = examination.MedicalRecord.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">TONG HOP CHI DINH DICH VU</div>");
            body.AppendLine(GetPatientInfoBlock(
                patient.PatientCode, patient.FullName, patient.Gender, patient.DateOfBirth,
                patient.Address, patient.PhoneNumber, examination.MedicalRecord.InsuranceNumber,
                examination.MedicalRecord.MedicalRecordCode, examination.Department?.DepartmentName));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(examination.MainDiagnosis)} ({Esc(examination.MainIcdCode)})</span></div>");

            body.AppendLine(@"<table class=""bordered""><thead><tr><th style=""width:30px"">STT</th><th>Ma phieu</th><th>Ten dich vu</th><th>SL</th><th>Don gia</th><th>Thanh tien</th><th>BS chi dinh</th></tr></thead><tbody>");
            int idx = 0;
            decimal grandTotal = 0;
            foreach (var order in orders)
            {
                foreach (var detail in order.Details)
                {
                    idx++;
                    grandTotal += detail.Amount;
                    body.AppendLine($@"<tr><td class=""text-center"">{idx}</td><td>{Esc(order.RequestCode)}</td><td>{Esc(detail.Service?.ServiceName)}</td><td class=""text-center"">{detail.Quantity}</td><td class=""text-right"">{detail.UnitPrice:#,##0}</td><td class=""text-right"">{detail.Amount:#,##0}</td><td>{Esc(order.Doctor?.FullName)}</td></tr>");
                }
            }
            body.AppendLine($@"<tr><td colspan=""5"" class=""text-right""><b>Tong cong:</b></td><td class=""text-right""><b>{grandTotal:#,##0}</b></td><td></td></tr>");
            body.AppendLine("</tbody></table>");

            body.AppendLine(GetSignatureBlock(examination.Doctor?.FullName));

            var html = WrapHtmlPage("Tong hop chi dinh dich vu", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    #endregion
}
