using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

public partial class SystemCompleteService
{
    // 13.10 Danh muc gia vien phi
    public async Task<List<ServicePriceCatalogDto>> GetServicePricesAsync(
        Guid? serviceId = null, string priceType = null, DateTime? effectiveDate = null)
    {
        try
        {
            var query = _context.ServicePrices.AsNoTracking()
                .Include(sp => sp.Service)
                .AsQueryable();

            if (serviceId.HasValue)
                query = query.Where(sp => sp.ServiceId == serviceId.Value);
            if (effectiveDate.HasValue)
                query = query.Where(sp => sp.EffectiveDate <= effectiveDate.Value
                    && (sp.EndDate == null || sp.EndDate >= effectiveDate.Value));

            var items = await query.OrderBy(sp => sp.Service.ServiceCode).Take(500).ToListAsync();
            return items.Select(sp => new ServicePriceCatalogDto
            {
                Id = sp.Id,
                ServiceId = sp.ServiceId,
                ServiceCode = sp.Service?.ServiceCode,
                ServiceName = sp.Service?.ServiceName,
                PriceType = sp.PriceType,
                UnitPrice = sp.Price,
                InsurancePrice = sp.InsurancePrice,
                EffectiveDate = sp.EffectiveDate,
                ExpiryDate = sp.EndDate,
                IsActive = sp.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetServicePricesAsync");
            return new List<ServicePriceCatalogDto>();
        }
    }

    public async Task<ServicePriceCatalogDto> GetServicePriceAsync(Guid priceId)
    {
        try
        {
            var sp = await _context.ServicePrices.AsNoTracking()
                .Include(x => x.Service)
                .FirstOrDefaultAsync(x => x.Id == priceId);
            if (sp == null) return null;
            return new ServicePriceCatalogDto
            {
                Id = sp.Id,
                ServiceId = sp.ServiceId,
                ServiceCode = sp.Service?.ServiceCode,
                ServiceName = sp.Service?.ServiceName,
                PriceType = sp.PriceType,
                UnitPrice = sp.Price,
                InsurancePrice = sp.InsurancePrice,
                EffectiveDate = sp.EffectiveDate,
                ExpiryDate = sp.EndDate,
                IsActive = sp.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetServicePriceAsync");
            return null;
        }
    }

    public async Task<ServicePriceCatalogDto> SaveServicePriceAsync(ServicePriceCatalogDto dto)
    {
        try
        {
            ServicePrice entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new ServicePrice
                {
                    ServiceId = dto.ServiceId,
                    PriceType = dto.PriceType ?? "BHYT",
                    Price = dto.UnitPrice,
                    InsurancePrice = dto.InsurancePrice ?? 0m,
                    EffectiveDate = dto.EffectiveDate,
                    EndDate = dto.ExpiryDate,
                    IsActive = dto.IsActive
                };
                _context.ServicePrices.Add(entity);
            }
            else
            {
                entity = await _context.ServicePrices.FirstOrDefaultAsync(sp => sp.Id == dto.Id);
                if (entity == null) return null;
                entity.ServiceId = dto.ServiceId;
                entity.PriceType = dto.PriceType ?? entity.PriceType;
                entity.Price = dto.UnitPrice;
                entity.InsurancePrice = dto.InsurancePrice ?? 0m;
                entity.EffectiveDate = dto.EffectiveDate;
                entity.EndDate = dto.ExpiryDate;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveServicePriceAsync");
            return null;
        }
    }

    public async Task<bool> DeleteServicePriceAsync(Guid priceId)
    {
        return await SoftDeleteEntityAsync<ServicePrice>(priceId);
    }

    public async Task<bool> ImportServicePricesFromExcelAsync(byte[] fileData, DateTime effectiveDate)
    {
        try
        {
            var text = Encoding.UTF8.GetString(fileData);
            var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2)
            {
                _logger.LogWarning("ImportServicePricesFromExcelAsync: File has no data rows (expected header + data). Columns: ServiceCode, PriceType, Price, InsurancePrice");
                return false;
            }

            var imported = 0;
            for (int i = 1; i < lines.Length; i++)
            {
                var cols = lines[i].Split('\t');
                if (cols.Length < 3) continue;

                var serviceCode = cols[0].Trim();
                var priceType = cols.Length > 1 ? cols[1].Trim() : "BHYT";
                if (string.IsNullOrWhiteSpace(serviceCode)) continue;

                var service = await _context.Services.FirstOrDefaultAsync(s => s.ServiceCode == serviceCode && !s.IsDeleted);
                if (service == null)
                {
                    _logger.LogWarning("ImportServicePricesFromExcelAsync: Service code '{Code}' not found, skipping row {Row}", serviceCode, i + 1);
                    continue;
                }

                if (!decimal.TryParse(cols[2].Trim(), out var price)) continue;
                var insurancePrice = cols.Length > 3 && decimal.TryParse(cols[3].Trim(), out var ip) ? ip : price;

                // Deactivate existing prices of the same type for this service
                var existingPrices = await _context.Set<ServicePrice>()
                    .Where(sp => sp.ServiceId == service.Id && sp.PriceType == priceType && sp.IsActive)
                    .ToListAsync();
                foreach (var ep in existingPrices)
                {
                    ep.EndDate = effectiveDate.AddDays(-1);
                    ep.IsActive = false;
                }

                var newPrice = new ServicePrice
                {
                    Id = Guid.NewGuid(),
                    ServiceId = service.Id,
                    PriceType = priceType,
                    Price = price,
                    InsurancePrice = insurancePrice,
                    EffectiveDate = effectiveDate,
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };
                _context.Set<ServicePrice>().Add(newPrice);
                imported++;
            }

            if (imported > 0)
                await _context.SaveChangesAsync();

            _logger.LogInformation("ImportServicePricesFromExcelAsync: Imported {Count} service prices (effective {Date}) from {TotalLines} data rows", imported, effectiveDate.ToString("yyyy-MM-dd"), lines.Length - 1);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ImportServicePricesFromExcelAsync failed");
            return false;
        }
    }

    public async Task<byte[]> ExportServicePricesToExcelAsync(string priceType = null)
    {
        try
        {
            var services = await _context.Services.AsNoTracking().Where(s => !s.IsDeleted)
                .Include(s => s.ServiceGroup).OrderBy(s => s.ServiceName).Take(3000).ToListAsync();

            var rows = services.Select(s => new string[] {
                s.ServiceCode, s.ServiceName, s.ServiceGroup?.GroupName ?? "",
                s.Unit ?? "", s.UnitPrice.ToString("N0"), s.InsurancePrice.ToString("N0"),
                s.IsActive ? "Co" : "Khong"
            }).ToList();

            var html = BuildTableReport("BANG GIA DICH VU", $"Tong: {services.Count} dich vu", DateTime.Now,
                new[] { "Ma DV", "Ten dich vu", "Khoa", "DVT", "Gia co so", "Gia BHYT", "Hoat dong" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 13.11 Danh muc doi tuong benh nhan
    public async Task<List<PatientTypeCatalogDto>> GetPatientTypesAsync(bool? isActive = null)
    {
        // No dedicated PatientType entity in DbContext; return static defaults
        return new List<PatientTypeCatalogDto>
        {
            new PatientTypeCatalogDto { Id = Guid.NewGuid(), Code = "BHYT", Name = "Bao hiem y te", IsDefault = true, IsActive = true },
            new PatientTypeCatalogDto { Id = Guid.NewGuid(), Code = "VP", Name = "Vien phi", IsDefault = false, IsActive = true },
            new PatientTypeCatalogDto { Id = Guid.NewGuid(), Code = "DV", Name = "Dich vu", IsDefault = false, IsActive = true },
            new PatientTypeCatalogDto { Id = Guid.NewGuid(), Code = "KSK", Name = "Kham suc khoe", IsDefault = false, IsActive = true }
        };
    }

    public async Task<PatientTypeCatalogDto> GetPatientTypeAsync(Guid patientTypeId)
    {
        var list = await GetPatientTypesAsync(null);
        return list.FirstOrDefault(x => x.Id == patientTypeId);
    }

    public async Task<PatientTypeCatalogDto> SavePatientTypeAsync(PatientTypeCatalogDto dto)
    {
        _logger.LogWarning("SavePatientTypeAsync: No dedicated entity table; returning dto as-is");
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<bool> DeletePatientTypeAsync(Guid patientTypeId)
    {
        _logger.LogWarning("DeletePatientTypeAsync: No dedicated entity table");
        return true;
    }

    // 13.12 Danh muc nguon nhap vien
    public async Task<List<AdmissionSourceCatalogDto>> GetAdmissionSourcesAsync(bool? isActive = null)
    {
        return new List<AdmissionSourceCatalogDto>
        {
            new AdmissionSourceCatalogDto { Id = Guid.NewGuid(), Code = "CC", Name = "Cap cuu", IsDefault = true, IsActive = true },
            new AdmissionSourceCatalogDto { Id = Guid.NewGuid(), Code = "CT", Name = "Chuyen tuyen", IsDefault = false, IsActive = true },
            new AdmissionSourceCatalogDto { Id = Guid.NewGuid(), Code = "DT", Name = "Dieu tri", IsDefault = false, IsActive = true },
            new AdmissionSourceCatalogDto { Id = Guid.NewGuid(), Code = "K", Name = "Khac", IsDefault = false, IsActive = true }
        };
    }

    public async Task<AdmissionSourceCatalogDto> GetAdmissionSourceAsync(Guid sourceId)
    {
        var list = await GetAdmissionSourcesAsync(null);
        return list.FirstOrDefault(x => x.Id == sourceId);
    }

    public async Task<AdmissionSourceCatalogDto> SaveAdmissionSourceAsync(AdmissionSourceCatalogDto dto)
    {
        _logger.LogWarning("SaveAdmissionSourceAsync: No dedicated entity table; returning dto as-is");
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<bool> DeleteAdmissionSourceAsync(Guid sourceId)
    {
        _logger.LogWarning("DeleteAdmissionSourceAsync: No dedicated entity table");
        return true;
    }

    // 13.13 Danh muc mau phieu in
    public async Task<List<PrintTemplateCatalogDto>> GetPrintTemplatesAsync(
        string templateType = null, Guid? departmentId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.ReportTemplates.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(templateType))
                query = query.Where(t => t.Category == templateType);
            if (isActive.HasValue)
                query = query.Where(t => t.IsActive == isActive.Value);

            var items = await query.OrderBy(t => t.ReportName).ToBoundedListAsync("SystemCompleteService.GetPrintTemplatesAsync");
            return items.Select(t => new PrintTemplateCatalogDto
            {
                Id = t.Id,
                Code = t.ReportCode,
                Name = t.ReportName,
                TemplateType = t.Category,
                TemplateContent = t.TemplateFile,
                IsActive = t.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPrintTemplatesAsync");
            return new List<PrintTemplateCatalogDto>();
        }
    }

    public async Task<PrintTemplateCatalogDto> GetPrintTemplateAsync(Guid templateId)
    {
        try
        {
            var t = await _context.ReportTemplates.AsNoTracking().FirstOrDefaultAsync(x => x.Id == templateId);
            if (t == null) return null;
            return new PrintTemplateCatalogDto
            {
                Id = t.Id,
                Code = t.ReportCode,
                Name = t.ReportName,
                TemplateType = t.Category,
                TemplateContent = t.TemplateFile,
                IsActive = t.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPrintTemplateAsync");
            return null;
        }
    }

    public async Task<PrintTemplateCatalogDto> SavePrintTemplateAsync(PrintTemplateCatalogDto dto)
    {
        try
        {
            ReportTemplate entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new ReportTemplate
                {
                    ReportCode = dto.Code ?? string.Empty,
                    ReportName = dto.Name ?? string.Empty,
                    Category = dto.TemplateType ?? string.Empty,
                    TemplateFile = dto.TemplateContent,
                    IsActive = dto.IsActive
                };
                _context.ReportTemplates.Add(entity);
            }
            else
            {
                entity = await _context.ReportTemplates.FirstOrDefaultAsync(t => t.Id == dto.Id);
                if (entity == null) return null;
                entity.ReportCode = dto.Code ?? entity.ReportCode;
                entity.ReportName = dto.Name ?? entity.ReportName;
                entity.Category = dto.TemplateType ?? entity.Category;
                entity.TemplateFile = dto.TemplateContent;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SavePrintTemplateAsync");
            return null;
        }
    }

    public async Task<bool> DeletePrintTemplateAsync(Guid templateId)
    {
        return await SoftDeleteEntityAsync<ReportTemplate>(templateId);
    }

    // 13.14 Danh muc mau benh an
    public async Task<List<MedicalRecordTemplateCatalogDto>> GetMedicalRecordTemplatesAsync(
        string templateType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.ExaminationTemplates.AsNoTracking().AsQueryable();

            var items = await query.ToBoundedListAsync("SystemCompleteService.GetMedicalRecordTemplatesAsync");
            return items.Select(t => new MedicalRecordTemplateCatalogDto
            {
                Id = t.Id,
                Code = t.TemplateCode ?? t.Id.ToString().Substring(0, 8),
                Name = t.TemplateName,
                TemplateType = t.TemplateType.ToString(),
                TemplateContent = t.ChiefComplaintTemplate,
                IsActive = t.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalRecordTemplatesAsync");
            return new List<MedicalRecordTemplateCatalogDto>();
        }
    }

    public async Task<MedicalRecordTemplateCatalogDto> GetMedicalRecordTemplateAsync(Guid templateId)
    {
        try
        {
            var t = await _context.ExaminationTemplates.AsNoTracking().FirstOrDefaultAsync(x => x.Id == templateId);
            if (t == null) return null;
            return new MedicalRecordTemplateCatalogDto
            {
                Id = t.Id,
                Code = t.TemplateCode,
                Name = t.TemplateName,
                TemplateType = t.TemplateType.ToString(),
                TemplateContent = t.ChiefComplaintTemplate,
                IsActive = t.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalRecordTemplateAsync");
            return null;
        }
    }

    public async Task<MedicalRecordTemplateCatalogDto> SaveMedicalRecordTemplateAsync(MedicalRecordTemplateCatalogDto dto)
    {
        try
        {
            ExaminationTemplate entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new ExaminationTemplate
                {
                    TemplateName = dto.Name ?? string.Empty,
                    TemplateCode = dto.Code,
                    TemplateType = int.TryParse(dto.TemplateType, out var tt) ? tt : 1,
                    ChiefComplaintTemplate = dto.TemplateContent,
                    IsActive = dto.IsActive
                };
                _context.ExaminationTemplates.Add(entity);
            }
            else
            {
                entity = await _context.ExaminationTemplates.FirstOrDefaultAsync(t => t.Id == dto.Id);
                if (entity == null) return null;
                entity.TemplateName = dto.Name ?? entity.TemplateName;
                entity.TemplateCode = dto.Code ?? entity.TemplateCode;
                entity.TemplateType = int.TryParse(dto.TemplateType, out var tt2) ? tt2 : entity.TemplateType;
                entity.ChiefComplaintTemplate = dto.TemplateContent;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveMedicalRecordTemplateAsync");
            return null;
        }
    }

    public async Task<bool> DeleteMedicalRecordTemplateAsync(Guid templateId)
    {
        return await SoftDeleteEntityAsync<ExaminationTemplate>(templateId);
    }

    // 13.15 Nhom dich vu
    public async Task<List<ServiceGroupCatalogDto>> GetServiceGroupsAsync(
        string groupType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.ServiceGroups.AsNoTracking()
                .Include(g => g.Parent)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(groupType) && int.TryParse(groupType, out var gt))
                query = query.Where(g => g.GroupType == gt);
            if (isActive.HasValue)
                query = query.Where(g => g.IsActive == isActive.Value);

            var items = await query.OrderBy(g => g.DisplayOrder).ThenBy(g => g.GroupCode).ToBoundedListAsync("SystemCompleteService.GetServiceGroupsAsync");
            return items.Select(g => new ServiceGroupCatalogDto
            {
                Id = g.Id,
                Code = g.GroupCode,
                Name = g.GroupName,
                GroupType = g.GroupType.ToString(),
                ParentId = g.ParentId,
                ParentName = g.Parent?.GroupName,
                IsActive = g.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetServiceGroupsAsync");
            return new List<ServiceGroupCatalogDto>();
        }
    }

    public async Task<ServiceGroupCatalogDto> GetServiceGroupAsync(Guid groupId)
    {
        try
        {
            var g = await _context.ServiceGroups.AsNoTracking()
                .Include(x => x.Parent)
                .FirstOrDefaultAsync(x => x.Id == groupId);
            if (g == null) return null;
            return new ServiceGroupCatalogDto
            {
                Id = g.Id,
                Code = g.GroupCode,
                Name = g.GroupName,
                GroupType = g.GroupType.ToString(),
                ParentId = g.ParentId,
                ParentName = g.Parent?.GroupName,
                IsActive = g.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetServiceGroupAsync");
            return null;
        }
    }

    public async Task<ServiceGroupCatalogDto> SaveServiceGroupAsync(ServiceGroupCatalogDto dto)
    {
        try
        {
            ServiceGroup entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new ServiceGroup
                {
                    GroupCode = dto.Code ?? string.Empty,
                    GroupName = dto.Name ?? string.Empty,
                    GroupType = int.TryParse(dto.GroupType, out var gt) ? gt : 7,
                    ParentId = dto.ParentId,
                    IsActive = dto.IsActive
                };
                _context.ServiceGroups.Add(entity);
            }
            else
            {
                entity = await _context.ServiceGroups.FirstOrDefaultAsync(g => g.Id == dto.Id);
                if (entity == null) return null;
                entity.GroupCode = dto.Code ?? entity.GroupCode;
                entity.GroupName = dto.Name ?? entity.GroupName;
                entity.GroupType = int.TryParse(dto.GroupType, out var gt2) ? gt2 : entity.GroupType;
                entity.ParentId = dto.ParentId;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveServiceGroupAsync");
            return null;
        }
    }

    public async Task<bool> DeleteServiceGroupAsync(Guid groupId)
    {
        return await SoftDeleteEntityAsync<ServiceGroup>(groupId);
    }

    // 13.16 Nhom thuoc
    public async Task<List<MedicineGroupCatalogDto>> GetMedicineGroupsAsync(bool? isActive = null)
    {
        // No dedicated MedicineGroup entity in DbContext; return empty list
        // Medicine has MedicineGroupCode string field but no separate entity
        return new List<MedicineGroupCatalogDto>();
    }

    public async Task<MedicineGroupCatalogDto> GetMedicineGroupAsync(Guid groupId)
    {
        return null;
    }

    public async Task<MedicineGroupCatalogDto> SaveMedicineGroupAsync(MedicineGroupCatalogDto dto)
    {
        _logger.LogWarning("SaveMedicineGroupAsync: No dedicated MedicineGroup entity");
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<bool> DeleteMedicineGroupAsync(Guid groupId)
    {
        _logger.LogWarning("DeleteMedicineGroupAsync: No dedicated MedicineGroup entity");
        return true;
    }

    // 13.17 Thuat ngu lam sang (Clinical Terms)
    public async Task<List<ClinicalTermCatalogDto>> GetClinicalTermsAsync(string keyword = null, string category = null, string bodySystem = null, bool? isActive = null)
    {
        var query = _context.ClinicalTerms.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(t => t.Code.Contains(keyword) || t.Name.Contains(keyword) || (t.NameEnglish != null && t.NameEnglish.Contains(keyword)));
        if (!string.IsNullOrEmpty(category))
            query = query.Where(t => t.Category == category);
        if (!string.IsNullOrEmpty(bodySystem))
            query = query.Where(t => t.BodySystem == bodySystem);
        if (isActive.HasValue)
            query = query.Where(t => t.IsActive == isActive.Value);

        return await query.OrderBy(t => t.Category).ThenBy(t => t.SortOrder).ThenBy(t => t.Name)
            .Select(t => new ClinicalTermCatalogDto
            {
                Id = t.Id,
                Code = t.Code,
                Name = t.Name,
                NameEnglish = t.NameEnglish,
                Category = t.Category,
                BodySystem = t.BodySystem,
                Description = t.Description,
                SortOrder = t.SortOrder,
                IsActive = t.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetClinicalTermsAsync");
    }

    public async Task<ClinicalTermCatalogDto> GetClinicalTermAsync(Guid termId)
    {
        var t = await _context.ClinicalTerms.FindAsync(termId);
        if (t == null) return null;
        return new ClinicalTermCatalogDto
        {
            Id = t.Id, Code = t.Code, Name = t.Name, NameEnglish = t.NameEnglish,
            Category = t.Category, BodySystem = t.BodySystem, Description = t.Description,
            SortOrder = t.SortOrder, IsActive = t.IsActive,
        };
    }

    public async Task<ClinicalTermCatalogDto> SaveClinicalTermAsync(ClinicalTermCatalogDto dto)
    {
        ClinicalTerm entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.ClinicalTerms.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"ClinicalTerm {dto.Id} not found");
        }
        else
        {
            entity = new ClinicalTerm { Id = Guid.NewGuid() };
            _context.ClinicalTerms.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.NameEnglish = dto.NameEnglish;
        entity.Category = dto.Category;
        entity.BodySystem = dto.BodySystem;
        entity.Description = dto.Description;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteClinicalTermAsync(Guid termId)
    {
        var entity = await _context.ClinicalTerms.FindAsync(termId);
        if (entity == null) return false;
        _context.ClinicalTerms.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // SNOMED CT Mapping
    public async Task<List<SnomedIcdMappingDto>> GetSnomedMappingsAsync(string? keyword, string? icdCode)
    {
        var query = _context.SnomedIcdMappings.Where(m => m.IsActive);
        if (!string.IsNullOrWhiteSpace(icdCode))
            query = query.Where(m => m.IcdCode.Contains(icdCode));
        if (!string.IsNullOrWhiteSpace(keyword))
            query = query.Where(m => m.IcdName.Contains(keyword) || m.SnomedCtDisplay.Contains(keyword) || m.SnomedCtCode.Contains(keyword));
        return await query.OrderBy(m => m.IcdCode).Take(200).Select(m => new SnomedIcdMappingDto
        {
            Id = m.Id, IcdCode = m.IcdCode, IcdName = m.IcdName,
            SnomedCtCode = m.SnomedCtCode, SnomedCtDisplay = m.SnomedCtDisplay,
            MapGroup = m.MapGroup, MapPriority = m.MapPriority, MapRule = m.MapRule, IsActive = m.IsActive
        }).ToListAsync();
    }

    public async Task<SnomedIcdMappingDto> SaveSnomedMappingAsync(SnomedIcdMappingDto dto)
    {
        SnomedIcdMapping entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.SnomedIcdMappings.FindAsync(dto.Id) ?? new SnomedIcdMapping();
        }
        else
        {
            entity = new SnomedIcdMapping();
            _context.SnomedIcdMappings.Add(entity);
        }
        entity.IcdCode = dto.IcdCode; entity.IcdName = dto.IcdName;
        entity.SnomedCtCode = dto.SnomedCtCode; entity.SnomedCtDisplay = dto.SnomedCtDisplay;
        entity.MapGroup = dto.MapGroup; entity.MapPriority = dto.MapPriority;
        entity.MapRule = dto.MapRule; entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteSnomedMappingAsync(Guid mappingId)
    {
        var entity = await _context.SnomedIcdMappings.FindAsync(mappingId);
        if (entity == null) return false;
        _context.SnomedIcdMappings.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SnomedIcdMappingDto>> SearchSnomedByIcdAsync(string icdCode)
    {
        return await _context.SnomedIcdMappings
            .Where(m => m.IsActive && m.IcdCode == icdCode)
            .OrderBy(m => m.MapPriority)
            .Select(m => new SnomedIcdMappingDto
            {
                Id = m.Id, IcdCode = m.IcdCode, IcdName = m.IcdName,
                SnomedCtCode = m.SnomedCtCode, SnomedCtDisplay = m.SnomedCtDisplay,
                MapGroup = m.MapGroup, MapPriority = m.MapPriority, MapRule = m.MapRule, IsActive = m.IsActive
            }).ToBoundedListAsync("SystemCompleteService.SearchSnomedByIcdAsync");
    }

}
