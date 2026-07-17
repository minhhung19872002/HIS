using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;

namespace HIS.Infrastructure.Services.Surgery;

public partial class SurgeryOperationServiceImpl
{
    public async Task<string?> GetDiagnosisFromOrderAsync(Guid medicalRecordId)
    {
        // F1 (audit FLOW-FINAL 2026-06-06): đọc chẩn đoán THẬT từ HSBA thay hardcode "Viêm ruột thừa cấp".
        var mr = await _context.MedicalRecords
            .Where(m => m.Id == medicalRecordId)
            .Select(m => new { m.InitialDiagnosis, m.MainIcdCode })
            .FirstOrDefaultAsync();
        if (mr == null) return null;
        return !string.IsNullOrWhiteSpace(mr.InitialDiagnosis) ? mr.InitialDiagnosis : mr.MainIcdCode;
    }

    public Task<List<IcdCodeDto>> SearchIcdCodesAsync(string keyword, bool byCode)
    {
        var codes = new List<IcdCodeDto>
        {
            new() { Code = "K35.9", Name = "Viêm ruột thừa cấp" },
            new() { Code = "K80.0", Name = "Sỏi túi mật có viêm túi mật cấp" },
            new() { Code = "I21.0", Name = "Nhồi máu cơ tim cấp thành trước" },
            new() { Code = "J18.9", Name = "Viêm phổi không xác định" }
        };

        if (!string.IsNullOrEmpty(keyword))
        {
            codes = codes.Where(c =>
                c.Code.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                c.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return Task.FromResult(codes);
    }

    public async Task<List<SurgeryServiceDto>> SearchServicesAsync(string? keyword, int? serviceType)
    {
        // E2E fix (prod-e2e 2026-06-17): trước đây trả mock hardcode với GUID random mỗi call → không
        // drive được surgery lifecycle (serviceId không tồn tại trong DB → FK-fail khi tạo yêu cầu PTTT).
        // Nay query bảng Services THẬT. PTTT = ServiceType 5 (theo comment entity Service); caller lọc qua serviceType.
        var query = _context.Set<Service>().Where(s => s.IsActive && !s.IsDeleted);
        if (serviceType.HasValue)
            query = query.Where(s => s.ServiceType == serviceType.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            query = query.Where(s => s.ServiceCode.Contains(k) || s.ServiceName.Contains(k));
        }
        return await query
            .OrderBy(s => s.ServiceName)
            .Take(100)
            .Select(s => new SurgeryServiceDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                ServiceType = s.ServiceType,
                UnitPrice = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive,
            })
            .ToListAsync();
    }

    public Task<SurgeryServiceOrderDto> OrderServiceAsync(CreateSurgeryServiceOrderDto dto, Guid userId)
    {
        return Task.FromResult(new SurgeryServiceOrderDto
        {
            Id = Guid.NewGuid(),
            SurgeryId = dto.SurgeryId,
            ServiceId = dto.ServiceId,
            Quantity = dto.Quantity,
            Status = 0,
            OrderedAt = DateTime.Now
        });
    }

    public Task<List<SurgeryServiceOrderDto>> OrderServicesAsync(Guid surgeryId, List<CreateSurgeryServiceOrderDto> dtos, Guid userId)
    {
        return Task.FromResult(dtos.Select(dto => new SurgeryServiceOrderDto
        {
            Id = Guid.NewGuid(),
            SurgeryId = surgeryId,
            ServiceId = dto.ServiceId,
            Quantity = dto.Quantity,
            Status = 0,
            OrderedAt = DateTime.Now
        }).ToList());
    }

    public Task<SurgeryPackageOrderDto> OrderPackageAsync(Guid surgeryId, Guid packageId, Guid userId)
    {
        return Task.FromResult(new SurgeryPackageOrderDto
        {
            SurgeryId = surgeryId,
            PackageId = packageId,
            PackageName = "Gói phẫu thuật"
        });
    }

    public Task<List<SurgeryServiceOrderDto>> CopyPreviousOrdersAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

    public Task<SurgeryServiceOrderDto> UpdateServiceOrderAsync(Guid orderId, CreateSurgeryServiceOrderDto dto, Guid userId)
    {
        return Task.FromResult(new SurgeryServiceOrderDto { Id = orderId });
    }

    public Task<bool> DeleteServiceOrderAsync(Guid orderId, Guid userId)
    {
        return Task.FromResult(true);
    }

    public Task<List<SurgeryServiceOrderDto>> GetServiceOrdersAsync(Guid surgeryId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

    public Task<SurgeryServiceOrderDto> ChangeOrderDoctorAsync(Guid orderId, Guid newDoctorId, Guid userId)
    {
        return Task.FromResult(new SurgeryServiceOrderDto { Id = orderId });
    }

    public Task<SurgeryServiceOrderDto> ChangePaymentObjectAsync(Guid orderId, int paymentObject, Guid userId)
    {
        return Task.FromResult(new SurgeryServiceOrderDto { Id = orderId });
    }

    public Task<ServiceCostInfoDto> GetServiceCostInfoAsync(Guid surgeryId)
    {
        return Task.FromResult(new ServiceCostInfoDto
        {
            TotalServiceCost = 8500000,
            InsuranceCoverage = 6800000,
            PatientPayment = 1700000,
            DepositBalance = 5000000,
            RemainingDeposit = 3300000,
            HasSufficientDeposit = true
        });
    }

    public Task<List<ServiceOrderWarningDto>> CheckOrderWarningsAsync(Guid surgeryId, Guid serviceId)
    {
        return Task.FromResult(new List<ServiceOrderWarningDto>());
    }

    public Task<List<SurgeryServiceGroupDto>> GetServiceGroupsAsync(Guid userId)
    {
        return Task.FromResult(new List<SurgeryServiceGroupDto>
        {
            new() { Id = Guid.NewGuid(), Code = "GRP001", Name = "Nhóm XN tiền phẫu", IsShared = true },
            new() { Id = Guid.NewGuid(), Code = "GRP002", Name = "Nhóm CĐHA ngực bụng", IsShared = true }
        });
    }

    public Task<SurgeryServiceGroupDto> CreateServiceGroupAsync(SurgeryServiceGroupDto dto, Guid userId)
    {
        dto.Id = Guid.NewGuid();
        dto.CreatedBy = userId;
        return Task.FromResult(dto);
    }

    public Task<SurgeryServiceGroupDto> UpdateServiceGroupAsync(Guid groupId, SurgeryServiceGroupDto dto, Guid userId)
    {
        return Task.FromResult(dto);
    }

    public Task<bool> DeleteServiceGroupAsync(Guid groupId, Guid userId)
    {
        return Task.FromResult(true);
    }

    public Task<List<SurgeryServiceOrderDto>> OrderByGroupAsync(Guid surgeryId, Guid groupId, Guid userId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

}
