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

    public async Task<List<IcdCodeDto>> SearchIcdCodesAsync(string keyword, bool byCode)
    {
        // QA0915: was a hard-coded list of 4 codes — the surgery request modal could not find any other
        // pre-op diagnosis. Read the real ICD-10 catalogue (same table the OPD search uses).
        var kw = (keyword ?? string.Empty).Trim();
        var query = _context.IcdCodes.AsNoTracking().Where(i => !i.IsDeleted && i.IsActive);
        if (kw.Length > 0)
            query = byCode
                ? query.Where(i => i.Code.StartsWith(kw))
                : query.Where(i => i.Code.StartsWith(kw) || i.Name.Contains(kw)
                                   || (i.NameNoDiacritics != null && i.NameNoDiacritics.Contains(kw)));

        return await query
            .OrderBy(i => i.Code)
            .Take(50)
            .Select(i => new IcdCodeDto { Code = i.Code, Name = i.Name, NameEnglish = i.NameEnglish, Chapter = i.ChapterName })
            .ToListAsync();
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

    /// <summary>
    /// QA-R6: the surgery service-order / cost endpoints below were stubs that answered 200 with a
    /// made-up order id (nothing saved, so nothing was ever billed) or with invented money figures
    /// (8.500.000đ cost, 5.000.000đ deposit on a surgery with no orders). Same policy as TT50 in
    /// Execution.cs: refuse clearly instead of pretending. Charges for a surgery go through the
    /// inpatient / OPD service-order screens until this module is implemented.
    /// </summary>
    private static InvalidOperationException NotImplementedYet(string feature) =>
        new($"{feature} trong module Phẫu thuật chưa được cài đặt trên máy chủ nên chưa lưu/tính được. "
            + "Vui lòng chỉ định qua màn nội trú / khám bệnh và báo quản trị.");

    public Task<SurgeryServiceOrderDto> OrderServiceAsync(CreateSurgeryServiceOrderDto dto, Guid userId)
        => throw NotImplementedYet("Chỉ định dịch vụ trong ca mổ");

    public Task<List<SurgeryServiceOrderDto>> OrderServicesAsync(Guid surgeryId, List<CreateSurgeryServiceOrderDto> dtos, Guid userId)
        => throw NotImplementedYet("Chỉ định dịch vụ trong ca mổ");

    public Task<SurgeryPackageOrderDto> OrderPackageAsync(Guid surgeryId, Guid packageId, Guid userId)
        => throw NotImplementedYet("Chỉ định gói PTTT");

    public Task<List<SurgeryServiceOrderDto>> CopyPreviousOrdersAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

    public Task<SurgeryServiceOrderDto> UpdateServiceOrderAsync(Guid orderId, CreateSurgeryServiceOrderDto dto, Guid userId)
        => throw NotImplementedYet("Sửa chỉ định dịch vụ ca mổ");

    public Task<bool> DeleteServiceOrderAsync(Guid orderId, Guid userId)
        => throw NotImplementedYet("Xóa chỉ định dịch vụ ca mổ");

    public Task<List<SurgeryServiceOrderDto>> GetServiceOrdersAsync(Guid surgeryId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

    public Task<SurgeryServiceOrderDto> ChangeOrderDoctorAsync(Guid orderId, Guid newDoctorId, Guid userId)
        => throw NotImplementedYet("Đổi bác sĩ chỉ định");

    public Task<SurgeryServiceOrderDto> ChangePaymentObjectAsync(Guid orderId, int paymentObject, Guid userId)
        => throw NotImplementedYet("Đổi đối tượng thanh toán");

    public Task<ServiceCostInfoDto> GetServiceCostInfoAsync(Guid surgeryId)
        => throw NotImplementedYet("Chi phí dịch vụ ca mổ");

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
        => throw NotImplementedYet("Tạo nhóm dịch vụ");

    public Task<SurgeryServiceGroupDto> UpdateServiceGroupAsync(Guid groupId, SurgeryServiceGroupDto dto, Guid userId)
        => throw NotImplementedYet("Sửa nhóm dịch vụ");

    public Task<bool> DeleteServiceGroupAsync(Guid groupId, Guid userId)
        => throw NotImplementedYet("Xóa nhóm dịch vụ");

    public Task<List<SurgeryServiceOrderDto>> OrderByGroupAsync(Guid surgeryId, Guid groupId, Guid userId)
    {
        return Task.FromResult(new List<SurgeryServiceOrderDto>());
    }

}
