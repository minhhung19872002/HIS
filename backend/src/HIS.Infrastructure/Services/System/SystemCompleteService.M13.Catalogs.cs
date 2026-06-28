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

// K2 phien 1 (2026-05-30): tach Module 13 (Danh muc, 17 chuc nang, 2377 dong) khoi
// SystemCompleteService.cs god-file. ZERO runtime change — partial class chia code physical,
// runtime identical. Helper methods + ctor + DI fields o file goc SystemCompleteService.cs.
public partial class SystemCompleteService
{
    #region Module 13: Quan ly Danh muc - 17 chuc nang

    // 13.1 Danh muc dich vu kham
    public async Task<List<ExaminationServiceCatalogDto>> GetExaminationServicesAsync(
        string keyword = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Services.AsNoTracking()
                .Where(s => s.ServiceType == 1); // 1 = Kham

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.ServiceName.Contains(keyword) || s.ServiceCode.Contains(keyword));
            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var items = await query.OrderBy(s => s.DisplayOrder).ThenBy(s => s.ServiceCode).ToBoundedListAsync("SystemCompleteService.GetExaminationServicesAsync");
            return items.Select(s => new ExaminationServiceCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                EquivalentCode = s.ServiceCodeBYT,
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExaminationServicesAsync");
            return new List<ExaminationServiceCatalogDto>();
        }
    }

    public async Task<ExaminationServiceCatalogDto> GetExaminationServiceAsync(Guid serviceId)
    {
        try
        {
            var s = await _context.Services.AsNoTracking().FirstOrDefaultAsync(x => x.Id == serviceId);
            if (s == null) return null;
            return new ExaminationServiceCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                EquivalentCode = s.ServiceCodeBYT,
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetExaminationServiceAsync");
            return null;
        }
    }

    public async Task<ExaminationServiceCatalogDto> SaveExaminationServiceAsync(ExaminationServiceCatalogDto dto)
    {
        try
        {
            Service entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Service
                {
                    ServiceCode = dto.Code ?? string.Empty,
                    ServiceName = dto.Name ?? string.Empty,
                    ServiceCodeBYT = dto.EquivalentCode,
                    UnitPrice = dto.Price,
                    InsurancePrice = dto.InsurancePrice,
                    ServiceType = 1, // Kham
                    IsActive = dto.IsActive,
                    ServiceGroupId = await GetDefaultServiceGroupIdAsync()
                };
                _context.Services.Add(entity);
            }
            else
            {
                entity = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.Id);
                if (entity == null) return null;
                entity.ServiceCode = dto.Code ?? entity.ServiceCode;
                entity.ServiceName = dto.Name ?? entity.ServiceName;
                entity.ServiceCodeBYT = dto.EquivalentCode;
                entity.UnitPrice = dto.Price;
                entity.InsurancePrice = dto.InsurancePrice;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveExaminationServiceAsync");
            return null;
        }
    }

    public async Task<bool> DeleteExaminationServiceAsync(Guid serviceId)
    {
        try
        {
            var entity = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteExaminationServiceAsync");
            return false;
        }
    }

    // 13.2 Danh muc dich vu can lam sang
    public async Task<List<ParaclinicalServiceCatalogDto>> GetParaclinicalServicesAsync(
        string keyword = null, string serviceType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Services.AsNoTracking()
                .Where(s => s.ServiceType >= 2 && s.ServiceType <= 5); // XN, CDHA, TDCN, PTTT

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.ServiceName.Contains(keyword) || s.ServiceCode.Contains(keyword));
            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var items = await query.OrderBy(s => s.DisplayOrder).ThenBy(s => s.ServiceCode).ToBoundedListAsync("SystemCompleteService.GetParaclinicalServicesAsync");
            return items.Select(s => new ParaclinicalServiceCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                ServiceType = s.ServiceType.ToString(),
                UnitPrice = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetParaclinicalServicesAsync");
            return new List<ParaclinicalServiceCatalogDto>();
        }
    }

    public async Task<ParaclinicalServiceCatalogDto> GetParaclinicalServiceAsync(Guid serviceId)
    {
        try
        {
            var s = await _context.Services.AsNoTracking().FirstOrDefaultAsync(x => x.Id == serviceId);
            if (s == null) return null;
            return new ParaclinicalServiceCatalogDto
            {
                Id = s.Id,
                Code = s.ServiceCode,
                Name = s.ServiceName,
                ServiceType = s.ServiceType.ToString(),
                UnitPrice = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetParaclinicalServiceAsync");
            return null;
        }
    }

    public async Task<ParaclinicalServiceCatalogDto> SaveParaclinicalServiceAsync(ParaclinicalServiceCatalogDto dto)
    {
        try
        {
            Service entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Service
                {
                    ServiceCode = dto.Code ?? string.Empty,
                    ServiceName = dto.Name ?? string.Empty,
                    UnitPrice = dto.UnitPrice,
                    InsurancePrice = dto.InsurancePrice ?? 0,
                    ServiceType = int.TryParse(dto.ServiceType, out var st) ? st : 2,
                    IsActive = dto.IsActive,
                    ServiceGroupId = await GetDefaultServiceGroupIdAsync()
                };
                _context.Services.Add(entity);
            }
            else
            {
                entity = await _context.Services.FirstOrDefaultAsync(s => s.Id == dto.Id);
                if (entity == null) return null;
                entity.ServiceCode = dto.Code ?? entity.ServiceCode;
                entity.ServiceName = dto.Name ?? entity.ServiceName;
                entity.UnitPrice = dto.UnitPrice;
                entity.InsurancePrice = dto.InsurancePrice ?? entity.InsurancePrice;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveParaclinicalServiceAsync");
            return null;
        }
    }

    public async Task<bool> DeleteParaclinicalServiceAsync(Guid serviceId)
    {
        return await SoftDeleteEntityAsync<Service>(serviceId);
    }

    // 13.3 Danh muc thuoc
    public async Task<List<MedicineCatalogDto>> GetMedicinesAsync(MedicineCatalogSearchDto search)
    {
        try
        {
            var query = _context.Medicines.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search?.Keyword))
                query = query.Where(m => m.MedicineName.Contains(search.Keyword) || m.MedicineCode.Contains(search.Keyword));
            if (search?.IsActive.HasValue == true)
                query = query.Where(m => m.IsActive == search.IsActive.Value);
            if (search?.IsNarcotic.HasValue == true)
                query = query.Where(m => m.IsNarcotic == search.IsNarcotic.Value);
            if (search?.IsPsychotropic.HasValue == true)
                query = query.Where(m => m.IsPsychotropic == search.IsPsychotropic.Value);
            if (search?.IsPrecursor.HasValue == true)
                query = query.Where(m => m.IsPrecursor == search.IsPrecursor.Value);
            if (search?.IsAntibiotic.HasValue == true)
                query = query.Where(m => m.IsAntibiotic == search.IsAntibiotic.Value);
            if (search?.MedicineGroupId.HasValue == true)
                query = query.Where(m => m.MedicineGroupId == search.MedicineGroupId.Value);

            // Paging
            if (search?.PageIndex.HasValue == true && search?.PageSize.HasValue == true)
            {
                var skip = (search.PageIndex.Value) * search.PageSize.Value;
                query = query.Skip(skip).Take(search.PageSize.Value);
            }
            else
            {
                query = query.Take(500); // default limit
            }

            var items = await query.OrderBy(m => m.MedicineCode).ToListAsync();
            return items.Select(m => MapMedicineToDto(m)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicinesAsync");
            return new List<MedicineCatalogDto>();
        }
    }

    public async Task<MedicineCatalogDto> GetMedicineAsync(Guid medicineId)
    {
        try
        {
            var m = await _context.Medicines.AsNoTracking().FirstOrDefaultAsync(x => x.Id == medicineId);
            return m == null ? null : MapMedicineToDto(m);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicineAsync");
            return null;
        }
    }

    public async Task<MedicineCatalogDto> SaveMedicineAsync(MedicineCatalogDto dto)
    {
        try
        {
            Medicine entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Medicine
                {
                    MedicineCode = dto.Code ?? string.Empty,
                    MedicineName = dto.Name ?? string.Empty,
                    MedicineCodeBYT = dto.EquivalentCode,
                    RegistrationNumber = dto.RegistrationNumber,
                    ActiveIngredient = dto.ActiveIngredientName,
                    Concentration = dto.Concentration,
                    Unit = dto.Unit,
                    PackageUnit = dto.PackageUnit,
                    Manufacturer = dto.Manufacturer,
                    Country = dto.Country,
                    UnitPrice = dto.Price,
                    InsurancePrice = dto.InsurancePrice,
                    IsNarcotic = dto.IsNarcotic,
                    IsPsychotropic = dto.IsPsychotropic,
                    IsPrecursor = dto.IsPrecursor,
                    IsActive = dto.IsActive,
                    MedicineGroupId = dto.ActiveIngredientId // map if available
                };
                _context.Medicines.Add(entity);
            }
            else
            {
                entity = await _context.Medicines.FirstOrDefaultAsync(m => m.Id == dto.Id);
                if (entity == null) return null;
                entity.MedicineCode = dto.Code ?? entity.MedicineCode;
                entity.MedicineName = dto.Name ?? entity.MedicineName;
                entity.MedicineCodeBYT = dto.EquivalentCode;
                entity.RegistrationNumber = dto.RegistrationNumber;
                entity.ActiveIngredient = dto.ActiveIngredientName;
                entity.Concentration = dto.Concentration;
                entity.Unit = dto.Unit;
                entity.PackageUnit = dto.PackageUnit;
                entity.Manufacturer = dto.Manufacturer;
                entity.Country = dto.Country;
                entity.UnitPrice = dto.Price;
                entity.InsurancePrice = dto.InsurancePrice;
                entity.IsNarcotic = dto.IsNarcotic;
                entity.IsPsychotropic = dto.IsPsychotropic;
                entity.IsPrecursor = dto.IsPrecursor;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveMedicineAsync");
            return null;
        }
    }

    public async Task<bool> DeleteMedicineAsync(Guid medicineId)
    {
        return await SoftDeleteEntityAsync<Medicine>(medicineId);
    }

    public async Task<bool> ImportMedicinesFromExcelAsync(byte[] fileData)
    {
        try
        {
            var text = Encoding.UTF8.GetString(fileData);
            var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2)
            {
                _logger.LogWarning("ImportMedicinesFromExcelAsync: File has no data rows (expected header + data). Columns: MedicineCode, MedicineName, ActiveIngredient, Unit, Concentration, Manufacturer");
                return false;
            }

            var imported = 0;
            // Skip header row (line 0), parse data rows
            for (int i = 1; i < lines.Length; i++)
            {
                var cols = lines[i].Split('\t');
                if (cols.Length < 2) continue; // Need at least code and name

                var code = cols[0].Trim();
                var name = cols[1].Trim();
                if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name)) continue;

                // Skip if code already exists
                var exists = await _context.Medicines.AnyAsync(m => m.MedicineCode == code && !m.IsDeleted);
                if (exists) continue;

                var medicine = new Medicine
                {
                    Id = Guid.NewGuid(),
                    MedicineCode = code,
                    MedicineName = name,
                    ActiveIngredient = cols.Length > 2 ? cols[2].Trim() : null,
                    Unit = cols.Length > 3 ? cols[3].Trim() : null,
                    Concentration = cols.Length > 4 ? cols[4].Trim() : null,
                    Manufacturer = cols.Length > 5 ? cols[5].Trim() : null,
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };
                _context.Medicines.Add(medicine);
                imported++;
            }

            if (imported > 0)
                await _context.SaveChangesAsync();

            _logger.LogInformation("ImportMedicinesFromExcelAsync: Imported {Count} medicines from {TotalLines} data rows", imported, lines.Length - 1);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ImportMedicinesFromExcelAsync failed");
            return false;
        }
    }

    public async Task<byte[]> ExportMedicinesToExcelAsync(MedicineCatalogSearchDto search)
    {
        try
        {
            var query = _context.Medicines.AsNoTracking().Where(m => !m.IsDeleted);
            if (!string.IsNullOrWhiteSpace(search?.Keyword))
                query = query.Where(m => m.MedicineName.Contains(search.Keyword) || m.MedicineCode.Contains(search.Keyword));
            if (search?.IsActive.HasValue == true)
                query = query.Where(m => m.IsActive == search.IsActive);
            var medicines = await query.OrderBy(m => m.MedicineName).Take(2000).ToListAsync();

            var rows = medicines.Select(m => new string[] {
                m.MedicineCode, m.MedicineName, m.ActiveIngredient ?? "", m.Unit ?? "",
                m.Concentration ?? "", m.Manufacturer ?? "", m.IsActive ? "Co" : "Khong"
            }).ToList();

            var html = BuildTableReport("DANH MUC THUOC", $"Tong: {medicines.Count} thuoc", DateTime.Now,
                new[] { "Ma thuoc", "Ten thuoc", "Hoat chat", "DVT", "Ham luong", "Hang SX", "Hoat dong" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 13.4 Danh muc vat tu y te
    public async Task<List<MedicalSupplyCatalogDto>> GetMedicalSuppliesAsync(
        string keyword = null, Guid? categoryId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.MedicalSupplies.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.SupplyName.Contains(keyword) || s.SupplyCode.Contains(keyword));
            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var items = await query.OrderBy(s => s.SupplyCode).Take(500).ToListAsync();
            return items.Select(s => new MedicalSupplyCatalogDto
            {
                Id = s.Id,
                Code = s.SupplyCode,
                Name = s.SupplyName,
                EquivalentCode = s.SupplyCodeBYT,
                RegistrationNumber = s.RegistrationNumber,
                Specification = s.Specification,
                Unit = s.Unit,
                Manufacturer = s.Manufacturer,
                Country = s.ManufacturerCountry,
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalSuppliesAsync");
            return new List<MedicalSupplyCatalogDto>();
        }
    }

    public async Task<MedicalSupplyCatalogDto> GetMedicalSupplyAsync(Guid supplyId)
    {
        try
        {
            var s = await _context.MedicalSupplies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == supplyId);
            if (s == null) return null;
            return new MedicalSupplyCatalogDto
            {
                Id = s.Id,
                Code = s.SupplyCode,
                Name = s.SupplyName,
                EquivalentCode = s.SupplyCodeBYT,
                RegistrationNumber = s.RegistrationNumber,
                Specification = s.Specification,
                Unit = s.Unit,
                Manufacturer = s.Manufacturer,
                Country = s.ManufacturerCountry,
                Price = s.UnitPrice,
                InsurancePrice = s.InsurancePrice,
                IsActive = s.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMedicalSupplyAsync");
            return null;
        }
    }

    public async Task<MedicalSupplyCatalogDto> SaveMedicalSupplyAsync(MedicalSupplyCatalogDto dto)
    {
        try
        {
            MedicalSupply entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new MedicalSupply
                {
                    SupplyCode = dto.Code ?? string.Empty,
                    SupplyName = dto.Name ?? string.Empty,
                    SupplyCodeBYT = dto.EquivalentCode,
                    RegistrationNumber = dto.RegistrationNumber,
                    Specification = dto.Specification,
                    Unit = dto.Unit,
                    Manufacturer = dto.Manufacturer,
                    ManufacturerCountry = dto.Country,
                    UnitPrice = dto.Price,
                    InsurancePrice = dto.InsurancePrice,
                    IsActive = dto.IsActive
                };
                _context.MedicalSupplies.Add(entity);
            }
            else
            {
                entity = await _context.MedicalSupplies.FirstOrDefaultAsync(s => s.Id == dto.Id);
                if (entity == null) return null;
                entity.SupplyCode = dto.Code ?? entity.SupplyCode;
                entity.SupplyName = dto.Name ?? entity.SupplyName;
                entity.SupplyCodeBYT = dto.EquivalentCode;
                entity.RegistrationNumber = dto.RegistrationNumber;
                entity.Specification = dto.Specification;
                entity.Unit = dto.Unit;
                entity.Manufacturer = dto.Manufacturer;
                entity.ManufacturerCountry = dto.Country;
                entity.UnitPrice = dto.Price;
                entity.InsurancePrice = dto.InsurancePrice;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveMedicalSupplyAsync");
            return null;
        }
    }

    public async Task<bool> DeleteMedicalSupplyAsync(Guid supplyId)
    {
        return await SoftDeleteEntityAsync<MedicalSupply>(supplyId);
    }

    public async Task<bool> ImportMedicalSuppliesFromExcelAsync(byte[] fileData)
    {
        try
        {
            var text = Encoding.UTF8.GetString(fileData);
            var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2)
            {
                _logger.LogWarning("ImportMedicalSuppliesFromExcelAsync: File has no data rows (expected header + data). Columns: SupplyCode, SupplyName, Unit, Manufacturer, ManufacturerCountry");
                return false;
            }

            var imported = 0;
            for (int i = 1; i < lines.Length; i++)
            {
                var cols = lines[i].Split('\t');
                if (cols.Length < 2) continue;

                var code = cols[0].Trim();
                var name = cols[1].Trim();
                if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name)) continue;

                var exists = await _context.MedicalSupplies.AnyAsync(s => s.SupplyCode == code && !s.IsDeleted);
                if (exists) continue;

                var supply = new MedicalSupply
                {
                    Id = Guid.NewGuid(),
                    SupplyCode = code,
                    SupplyName = name,
                    Unit = cols.Length > 2 ? cols[2].Trim() : null,
                    Manufacturer = cols.Length > 3 ? cols[3].Trim() : null,
                    ManufacturerCountry = cols.Length > 4 ? cols[4].Trim() : null,
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };
                _context.MedicalSupplies.Add(supply);
                imported++;
            }

            if (imported > 0)
                await _context.SaveChangesAsync();

            _logger.LogInformation("ImportMedicalSuppliesFromExcelAsync: Imported {Count} supplies from {TotalLines} data rows", imported, lines.Length - 1);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ImportMedicalSuppliesFromExcelAsync failed");
            return false;
        }
    }

    public async Task<byte[]> ExportMedicalSuppliesToExcelAsync(string keyword = null, Guid? categoryId = null)
    {
        try
        {
            var query = _context.MedicalSupplies.AsNoTracking().Where(s => !s.IsDeleted);
            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.SupplyName.Contains(keyword) || s.SupplyCode.Contains(keyword));
            var supplies = await query.OrderBy(s => s.SupplyName).Take(2000).ToListAsync();

            var rows = supplies.Select(s => new string[] {
                s.SupplyCode, s.SupplyName, s.Unit ?? "", s.Manufacturer ?? "",
                s.ManufacturerCountry ?? "", s.IsActive ? "Co" : "Khong"
            }).ToList();

            var html = BuildTableReport("DANH MUC VAT TU Y TE", $"Tong: {supplies.Count} vat tu", DateTime.Now,
                new[] { "Ma VT", "Ten vat tu", "DVT", "Hang SX", "Nuoc SX", "Hoat dong" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 13.5 Danh muc ICD-10
    public async Task<List<ICD10CatalogDto>> GetICD10CodesAsync(
        string keyword = null, string chapterCode = null, bool? isActive = null)
    {
        try
        {
            var query = _context.IcdCodes.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(i => i.Name.Contains(keyword) || i.Code.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(chapterCode))
                query = query.Where(i => i.ChapterCode == chapterCode);
            if (isActive.HasValue)
                query = query.Where(i => i.IsActive == isActive.Value);

            var items = await query.OrderBy(i => i.Code).Take(1000).ToListAsync();
            return items.Select(i => new ICD10CatalogDto
            {
                Id = i.Id,
                Code = i.Code,
                Name = i.Name,
                EnglishName = i.NameEnglish,
                ChapterCode = i.ChapterCode,
                ChapterName = i.ChapterName,
                GroupCode = i.GroupCode,
                GroupName = i.GroupName,
                IsActive = i.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetICD10CodesAsync");
            return new List<ICD10CatalogDto>();
        }
    }

    public async Task<ICD10CatalogDto> GetICD10CodeAsync(Guid icd10Id)
    {
        try
        {
            var i = await _context.IcdCodes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == icd10Id);
            if (i == null) return null;
            return new ICD10CatalogDto
            {
                Id = i.Id,
                Code = i.Code,
                Name = i.Name,
                EnglishName = i.NameEnglish,
                ChapterCode = i.ChapterCode,
                ChapterName = i.ChapterName,
                GroupCode = i.GroupCode,
                GroupName = i.GroupName,
                IsActive = i.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetICD10CodeAsync");
            return null;
        }
    }

    public async Task<ICD10CatalogDto> SaveICD10CodeAsync(ICD10CatalogDto dto)
    {
        try
        {
            IcdCode entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new IcdCode
                {
                    Code = dto.Code ?? string.Empty,
                    Name = dto.Name ?? string.Empty,
                    NameEnglish = dto.EnglishName,
                    ChapterCode = dto.ChapterCode,
                    ChapterName = dto.ChapterName,
                    GroupCode = dto.GroupCode,
                    GroupName = dto.GroupName,
                    IsActive = dto.IsActive
                };
                _context.IcdCodes.Add(entity);
            }
            else
            {
                entity = await _context.IcdCodes.FirstOrDefaultAsync(x => x.Id == dto.Id);
                if (entity == null) return null;
                entity.Code = dto.Code ?? entity.Code;
                entity.Name = dto.Name ?? entity.Name;
                entity.NameEnglish = dto.EnglishName;
                entity.ChapterCode = dto.ChapterCode;
                entity.ChapterName = dto.ChapterName;
                entity.GroupCode = dto.GroupCode;
                entity.GroupName = dto.GroupName;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveICD10CodeAsync");
            return null;
        }
    }

    public async Task<bool> DeleteICD10CodeAsync(Guid icd10Id)
    {
        return await SoftDeleteEntityAsync<IcdCode>(icd10Id);
    }

    public async Task<bool> ImportICD10FromExcelAsync(byte[] fileData)
    {
        try
        {
            var text = Encoding.UTF8.GetString(fileData);
            var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length < 2)
            {
                _logger.LogWarning("ImportICD10FromExcelAsync: File has no data rows (expected header + data). Columns: Code, Name, NameEnglish, ChapterCode, ChapterName");
                return false;
            }

            var imported = 0;
            for (int i = 1; i < lines.Length; i++)
            {
                var cols = lines[i].Split('\t');
                if (cols.Length < 2) continue;

                var code = cols[0].Trim();
                var name = cols[1].Trim();
                if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name)) continue;

                var exists = await _context.IcdCodes.AnyAsync(c => c.Code == code);
                if (exists) continue;

                var icd = new IcdCode
                {
                    Id = Guid.NewGuid(),
                    Code = code,
                    Name = name,
                    NameEnglish = cols.Length > 2 ? cols[2].Trim() : null,
                    ChapterCode = cols.Length > 3 ? cols[3].Trim() : null,
                    ChapterName = cols.Length > 4 ? cols[4].Trim() : null,
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };
                _context.IcdCodes.Add(icd);
                imported++;
            }

            if (imported > 0)
                await _context.SaveChangesAsync();

            _logger.LogInformation("ImportICD10FromExcelAsync: Imported {Count} ICD codes from {TotalLines} data rows", imported, lines.Length - 1);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ImportICD10FromExcelAsync failed");
            return false;
        }
    }

    public async Task<byte[]> ExportICD10ToExcelAsync(string chapterCode = null)
    {
        try
        {
            var query = _context.IcdCodes.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(chapterCode))
                query = query.Where(i => i.ChapterCode == chapterCode);
            var codes = await query.OrderBy(i => i.Code).Take(5000).ToListAsync();

            var rows = codes.Select(i => new string[] {
                i.Code, i.Name ?? "", i.NameEnglish ?? "", i.ChapterCode ?? "", i.ChapterName ?? ""
            }).ToList();

            var html = BuildTableReport("DANH MUC MA ICD-10", $"Tong: {codes.Count} ma", DateTime.Now,
                new[] { "Ma ICD", "Ten benh", "Ten tieng Anh", "Ma chuong", "Ten chuong" }, rows);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    // 13.6 Danh muc khoa phong
    public async Task<List<DepartmentCatalogDto>> GetDepartmentsAsync(
        string keyword = null, string departmentType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Departments.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(d => d.DepartmentName.Contains(keyword) || d.DepartmentCode.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(departmentType) && int.TryParse(departmentType, out var dt))
                query = query.Where(d => d.DepartmentType == dt);
            if (isActive.HasValue)
                query = query.Where(d => d.IsActive == isActive.Value);

            var items = await query.OrderBy(d => d.DisplayOrder).ThenBy(d => d.DepartmentCode).ToBoundedListAsync("SystemCompleteService.GetDepartmentsAsync");
            return items.Select(d => new DepartmentCatalogDto
            {
                Id = d.Id,
                Code = d.DepartmentCode,
                Name = d.DepartmentName,
                DepartmentType = d.DepartmentType.ToString(),
                BYTDeptCode = d.DepartmentCodeBYT,
                ParentId = d.ParentId,
                IsActive = d.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentsAsync");
            return new List<DepartmentCatalogDto>();
        }
    }

    public async Task<DepartmentCatalogDto> GetDepartmentAsync(Guid departmentId)
    {
        try
        {
            var d = await _context.Departments.AsNoTracking()
                .Include(x => x.Parent)
                .FirstOrDefaultAsync(x => x.Id == departmentId);
            if (d == null) return null;
            return new DepartmentCatalogDto
            {
                Id = d.Id,
                Code = d.DepartmentCode,
                Name = d.DepartmentName,
                DepartmentType = d.DepartmentType.ToString(),
                BYTDeptCode = d.DepartmentCodeBYT,
                ParentId = d.ParentId,
                ParentName = d.Parent?.DepartmentName,
                IsActive = d.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentAsync");
            return null;
        }
    }

    public async Task<DepartmentCatalogDto> SaveDepartmentAsync(DepartmentCatalogDto dto)
    {
        try
        {
            Department entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Department
                {
                    DepartmentCode = dto.Code ?? string.Empty,
                    DepartmentName = dto.Name ?? string.Empty,
                    DepartmentCodeBYT = dto.BYTDeptCode,
                    DepartmentType = int.TryParse(dto.DepartmentType, out var dt) ? dt : 1,
                    ParentId = dto.ParentId,
                    IsActive = dto.IsActive
                };
                _context.Departments.Add(entity);
            }
            else
            {
                entity = await _context.Departments.FirstOrDefaultAsync(d => d.Id == dto.Id);
                if (entity == null) return null;
                entity.DepartmentCode = dto.Code ?? entity.DepartmentCode;
                entity.DepartmentName = dto.Name ?? entity.DepartmentName;
                entity.DepartmentCodeBYT = dto.BYTDeptCode;
                entity.DepartmentType = int.TryParse(dto.DepartmentType, out var dt2) ? dt2 : entity.DepartmentType;
                entity.ParentId = dto.ParentId;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveDepartmentAsync");
            return null;
        }
    }

    public async Task<bool> DeleteDepartmentAsync(Guid departmentId)
    {
        return await SoftDeleteEntityAsync<Department>(departmentId);
    }

    // 13.7 Danh muc phong benh / giuong
    public async Task<List<RoomCatalogDto>> GetRoomsAsync(
        Guid? departmentId = null, string roomType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Rooms.AsNoTracking()
                .Include(r => r.Department)
                .AsQueryable();

            if (departmentId.HasValue)
                query = query.Where(r => r.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(roomType) && int.TryParse(roomType, out var rt))
                query = query.Where(r => r.RoomType == rt);
            if (isActive.HasValue)
                query = query.Where(r => r.IsActive == isActive.Value);

            var items = await query.OrderBy(r => r.DisplayOrder).ThenBy(r => r.RoomCode).ToBoundedListAsync("SystemCompleteService.GetRoomsAsync");
            return items.Select(r => new RoomCatalogDto
            {
                Id = r.Id,
                Code = r.RoomCode,
                Name = r.RoomName,
                DepartmentId = r.DepartmentId,
                DepartmentName = r.Department?.DepartmentName,
                RoomType = r.RoomType.ToString(),
                BedCount = r.Beds?.Count,
                IsActive = r.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRoomsAsync");
            return new List<RoomCatalogDto>();
        }
    }

    public async Task<RoomCatalogDto> GetRoomAsync(Guid roomId)
    {
        try
        {
            var r = await _context.Rooms.AsNoTracking()
                .Include(x => x.Department)
                .Include(x => x.Beds)
                .FirstOrDefaultAsync(x => x.Id == roomId);
            if (r == null) return null;
            return new RoomCatalogDto
            {
                Id = r.Id,
                Code = r.RoomCode,
                Name = r.RoomName,
                DepartmentId = r.DepartmentId,
                DepartmentName = r.Department?.DepartmentName,
                RoomType = r.RoomType.ToString(),
                BedCount = r.Beds?.Count,
                IsActive = r.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRoomAsync");
            return null;
        }
    }

    public async Task<RoomCatalogDto> SaveRoomAsync(RoomCatalogDto dto)
    {
        try
        {
            Room entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Room
                {
                    RoomCode = dto.Code ?? string.Empty,
                    RoomName = dto.Name ?? string.Empty,
                    DepartmentId = dto.DepartmentId,
                    RoomType = int.TryParse(dto.RoomType, out var rt) ? rt : 1,
                    IsActive = dto.IsActive
                };
                _context.Rooms.Add(entity);
            }
            else
            {
                entity = await _context.Rooms.FirstOrDefaultAsync(r => r.Id == dto.Id);
                if (entity == null) return null;
                entity.RoomCode = dto.Code ?? entity.RoomCode;
                entity.RoomName = dto.Name ?? entity.RoomName;
                entity.DepartmentId = dto.DepartmentId;
                entity.RoomType = int.TryParse(dto.RoomType, out var rt2) ? rt2 : entity.RoomType;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveRoomAsync");
            return null;
        }
    }

    public async Task<bool> DeleteRoomAsync(Guid roomId)
    {
        return await SoftDeleteEntityAsync<Room>(roomId);
    }

    public async Task<List<BedCatalogDto>> GetBedsAsync(Guid? roomId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Beds.AsNoTracking()
                .Include(b => b.Room)
                .AsQueryable();

            if (roomId.HasValue)
                query = query.Where(b => b.RoomId == roomId.Value);
            if (isActive.HasValue)
                query = query.Where(b => b.IsActive == isActive.Value);

            var items = await query.OrderBy(b => b.BedCode).ToBoundedListAsync("SystemCompleteService.GetBedsAsync");
            return items.Select(b => new BedCatalogDto
            {
                Id = b.Id,
                Code = b.BedCode,
                Name = b.BedName,
                RoomId = b.RoomId,
                RoomName = b.Room?.RoomName,
                BedType = b.BedType.ToString(),
                DailyRate = b.DailyPrice,
                IsActive = b.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBedsAsync");
            return new List<BedCatalogDto>();
        }
    }

    public async Task<BedCatalogDto> GetBedAsync(Guid bedId)
    {
        try
        {
            var b = await _context.Beds.AsNoTracking()
                .Include(x => x.Room)
                .FirstOrDefaultAsync(x => x.Id == bedId);
            if (b == null) return null;
            return new BedCatalogDto
            {
                Id = b.Id,
                Code = b.BedCode,
                Name = b.BedName,
                RoomId = b.RoomId,
                RoomName = b.Room?.RoomName,
                BedType = b.BedType.ToString(),
                DailyRate = b.DailyPrice,
                IsActive = b.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetBedAsync");
            return null;
        }
    }

    public async Task<BedCatalogDto> SaveBedAsync(BedCatalogDto dto)
    {
        try
        {
            Bed entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Bed
                {
                    BedCode = dto.Code ?? string.Empty,
                    BedName = dto.Name ?? string.Empty,
                    RoomId = dto.RoomId,
                    BedType = int.TryParse(dto.BedType, out var bt) ? bt : 1,
                    DailyPrice = dto.DailyRate ?? 0,
                    IsActive = dto.IsActive
                };
                _context.Beds.Add(entity);
            }
            else
            {
                entity = await _context.Beds.FirstOrDefaultAsync(b => b.Id == dto.Id);
                if (entity == null) return null;
                entity.BedCode = dto.Code ?? entity.BedCode;
                entity.BedName = dto.Name ?? entity.BedName;
                entity.RoomId = dto.RoomId;
                entity.BedType = int.TryParse(dto.BedType, out var bt2) ? bt2 : entity.BedType;
                entity.DailyPrice = dto.DailyRate ?? entity.DailyPrice;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveBedAsync");
            return null;
        }
    }

    public async Task<bool> DeleteBedAsync(Guid bedId)
    {
        return await SoftDeleteEntityAsync<Bed>(bedId);
    }

    // 13.8 Danh muc nhan vien
    public async Task<List<EmployeeCatalogDto>> GetEmployeesAsync(
        string keyword = null, Guid? departmentId = null, string position = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Users.AsNoTracking()
                .Include(u => u.Department)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(u => u.FullName.Contains(keyword) || u.Username.Contains(keyword));
            if (departmentId.HasValue)
                query = query.Where(u => u.DepartmentId == departmentId.Value);
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            var items = await query.OrderBy(u => u.FullName).Take(500).ToListAsync();
            return items.Select(u => new EmployeeCatalogDto
            {
                Id = u.Id,
                Code = u.EmployeeCode ?? u.UserCode,
                FullName = u.FullName,
                Position = u.Title,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                Phone = u.PhoneNumber,
                Email = u.Email,
                IsDoctor = u.UserType == 1,
                IsNurse = u.UserType == 2,
                IsActive = u.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetEmployeesAsync");
            return new List<EmployeeCatalogDto>();
        }
    }

    public async Task<EmployeeCatalogDto> GetEmployeeAsync(Guid employeeId)
    {
        try
        {
            var u = await _context.Users.AsNoTracking()
                .Include(x => x.Department)
                .FirstOrDefaultAsync(x => x.Id == employeeId);
            if (u == null) return null;
            return new EmployeeCatalogDto
            {
                Id = u.Id,
                Code = u.EmployeeCode ?? u.UserCode,
                FullName = u.FullName,
                Position = u.Title,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                Phone = u.PhoneNumber,
                Email = u.Email,
                IsDoctor = u.UserType == 1,
                IsNurse = u.UserType == 2,
                IsActive = u.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetEmployeeAsync");
            return null;
        }
    }

    public async Task<EmployeeCatalogDto> SaveEmployeeAsync(EmployeeCatalogDto dto)
    {
        try
        {
            var entity = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.Id);
            if (entity == null) return null; // Employee creation should go through user management
            entity.FullName = dto.FullName ?? entity.FullName;
            entity.Title = dto.Position;
            entity.DepartmentId = dto.DepartmentId;
            entity.PhoneNumber = dto.Phone;
            entity.Email = dto.Email;
            entity.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveEmployeeAsync");
            return null;
        }
    }

    public async Task<bool> DeleteEmployeeAsync(Guid employeeId)
    {
        return await SoftDeleteEntityAsync<User>(employeeId);
    }

    // 13.9 Danh muc nha cung cap
    public async Task<List<SupplierCatalogDto>> GetSuppliersAsync(
        string keyword = null, string supplierType = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Suppliers.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(s => s.SupplierName.Contains(keyword) || s.SupplierCode.Contains(keyword));
            if (!string.IsNullOrWhiteSpace(supplierType) && int.TryParse(supplierType, out var st))
                query = query.Where(s => s.SupplierType == st);
            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var items = await query.OrderBy(s => s.SupplierCode).ToBoundedListAsync("SystemCompleteService.GetSuppliersAsync");
            return items.Select(s => new SupplierCatalogDto
            {
                Id = s.Id,
                Code = s.SupplierCode,
                Name = s.SupplierName,
                SupplierType = s.SupplierType.ToString(),
                Address = s.Address,
                Phone = s.PhoneNumber,
                TaxCode = s.TaxCode,
                IsActive = s.IsActive
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSuppliersAsync");
            return new List<SupplierCatalogDto>();
        }
    }

    public async Task<SupplierCatalogDto> GetSupplierAsync(Guid supplierId)
    {
        try
        {
            var s = await _context.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == supplierId);
            if (s == null) return null;
            return new SupplierCatalogDto
            {
                Id = s.Id,
                Code = s.SupplierCode,
                Name = s.SupplierName,
                SupplierType = s.SupplierType.ToString(),
                Address = s.Address,
                Phone = s.PhoneNumber,
                TaxCode = s.TaxCode,
                IsActive = s.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSupplierAsync");
            return null;
        }
    }

    public async Task<SupplierCatalogDto> SaveSupplierAsync(SupplierCatalogDto dto)
    {
        try
        {
            Supplier entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Supplier
                {
                    SupplierCode = dto.Code ?? string.Empty,
                    SupplierName = dto.Name ?? string.Empty,
                    SupplierType = int.TryParse(dto.SupplierType, out var st) ? st : 1,
                    Address = dto.Address,
                    PhoneNumber = dto.Phone,
                    TaxCode = dto.TaxCode,
                    IsActive = dto.IsActive
                };
                _context.Suppliers.Add(entity);
            }
            else
            {
                entity = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == dto.Id);
                if (entity == null) return null;
                entity.SupplierCode = dto.Code ?? entity.SupplierCode;
                entity.SupplierName = dto.Name ?? entity.SupplierName;
                entity.SupplierType = int.TryParse(dto.SupplierType, out var st2) ? st2 : entity.SupplierType;
                entity.Address = dto.Address;
                entity.PhoneNumber = dto.Phone;
                entity.TaxCode = dto.TaxCode;
                entity.IsActive = dto.IsActive;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSupplierAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSupplierAsync(Guid supplierId)
    {
        return await SoftDeleteEntityAsync<Supplier>(supplierId);
    }

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

    // 13.18 Dong bo danh muc BHXH
    public async Task<SyncResultDto> SyncBHXHMedicinesAsync()
    {
        _logger.LogWarning("SyncBHXHMedicinesAsync: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<SyncResultDto> SyncBHXHServicesAsync()
    {
        _logger.LogWarning("SyncBHXHServicesAsync: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<SyncResultDto> SyncBHXHICD10Async()
    {
        _logger.LogWarning("SyncBHXHICD10Async: External integration not implemented");
        return new SyncResultDto
        {
            IsSuccess = false,
            TotalRecords = 0,
            InsertedRecords = 0,
            UpdatedRecords = 0,
            FailedRecords = 0,
            Errors = new List<string> { "BHXH integration not configured" },
            SyncDate = DateTime.UtcNow
        };
    }

    public async Task<DateTime?> GetLastSyncDateAsync(string syncType)
    {
        return null;
    }

    // 13.20 Nghe nghiep (Occupation)
    public async Task<List<OccupationCatalogDto>> GetOccupationsAsync(string? keyword = null, bool? isActive = null)
    {
        var query = _context.Occupations.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(o => o.Code.Contains(keyword) || o.Name.Contains(keyword));
        if (isActive.HasValue)
            query = query.Where(o => o.IsActive == isActive.Value);

        return await query.OrderBy(o => o.SortOrder).ThenBy(o => o.Name)
            .Select(o => new OccupationCatalogDto
            {
                Id = o.Id,
                Code = o.Code,
                Name = o.Name,
                SortOrder = o.SortOrder,
                IsActive = o.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetOccupationsAsync");
    }

    public async Task<OccupationCatalogDto> SaveOccupationAsync(OccupationCatalogDto dto)
    {
        Occupation entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.Occupations.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"Occupation {dto.Id} not found");
        }
        else
        {
            entity = new Occupation { Id = Guid.NewGuid() };
            _context.Occupations.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteOccupationAsync(Guid occupationId)
    {
        var entity = await _context.Occupations.FindAsync(occupationId);
        if (entity == null) return false;
        _context.Occupations.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // 13.21 Gioi tinh (Gender)
    public async Task<List<GenderCatalogDto>> GetGendersAsync(string? keyword = null, bool? isActive = null)
    {
        var query = _context.Genders.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(g => g.Code.Contains(keyword) || g.Name.Contains(keyword));
        if (isActive.HasValue)
            query = query.Where(g => g.IsActive == isActive.Value);

        return await query.OrderBy(g => g.SortOrder).ThenBy(g => g.Name)
            .Select(g => new GenderCatalogDto
            {
                Id = g.Id,
                Code = g.Code,
                Name = g.Name,
                SortOrder = g.SortOrder,
                IsActive = g.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetGendersAsync");
    }

    public async Task<GenderCatalogDto> SaveGenderAsync(GenderCatalogDto dto)
    {
        Gender entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.Genders.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"Gender {dto.Id} not found");
        }
        else
        {
            entity = new Gender { Id = Guid.NewGuid() };
            _context.Genders.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteGenderAsync(Guid genderId)
    {
        var entity = await _context.Genders.FindAsync(genderId);
        if (entity == null) return false;
        _context.Genders.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // 13.22 Don vi hanh chinh (Administrative Division)
    public async Task<List<AdministrativeDivisionCatalogDto>> GetAdministrativeDivisionsAsync(string? keyword = null, int? level = null, string? parentCode = null, bool? isActive = null)
    {
        var query = _context.AdministrativeDivisions.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(d => d.Code.Contains(keyword) || d.Name.Contains(keyword));
        if (level.HasValue)
            query = query.Where(d => d.Level == level.Value);
        if (!string.IsNullOrEmpty(parentCode))
            query = query.Where(d => d.ParentCode == parentCode);
        if (isActive.HasValue)
            query = query.Where(d => d.IsActive == isActive.Value);

        var divisions = await query.OrderBy(d => d.Level).ThenBy(d => d.SortOrder).ThenBy(d => d.Name).ToListAsync();

        // Resolve parent names for Level 2 and 3
        var parentCodes = divisions.Where(d => d.ParentCode != null).Select(d => d.ParentCode).Distinct().ToList();
        var parentMap = await _context.AdministrativeDivisions
            .Where(d => parentCodes.Contains(d.Code))
            .ToDictionaryAsync(d => d.Code, d => d.Name);

        return divisions.Select(d => new AdministrativeDivisionCatalogDto
        {
            Id = d.Id,
            Code = d.Code,
            Name = d.Name,
            Level = d.Level,
            ParentCode = d.ParentCode,
            ParentName = d.ParentCode != null && parentMap.ContainsKey(d.ParentCode) ? parentMap[d.ParentCode] : null,
            SortOrder = d.SortOrder,
            IsActive = d.IsActive,
        }).ToList();
    }

    public async Task<AdministrativeDivisionCatalogDto> SaveAdministrativeDivisionAsync(AdministrativeDivisionCatalogDto dto)
    {
        AdministrativeDivision entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.AdministrativeDivisions.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"AdministrativeDivision {dto.Id} not found");
        }
        else
        {
            entity = new AdministrativeDivision { Id = Guid.NewGuid() };
            _context.AdministrativeDivisions.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.Level = dto.Level;
        entity.ParentCode = dto.ParentCode;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteAdministrativeDivisionAsync(Guid divisionId)
    {
        var entity = await _context.AdministrativeDivisions.FindAsync(divisionId);
        if (entity == null) return false;
        _context.AdministrativeDivisions.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // 13.23 Quoc gia (Country)
    public async Task<List<CountryCatalogDto>> GetCountriesAsync(string? keyword = null, bool? isActive = null)
    {
        var query = _context.Countries.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(c => c.Code.Contains(keyword) || c.Name.Contains(keyword) || (c.NationalityName != null && c.NationalityName.Contains(keyword)));
        if (isActive.HasValue)
            query = query.Where(c => c.IsActive == isActive.Value);

        return await query.OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new CountryCatalogDto
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                NationalityName = c.NationalityName,
                SortOrder = c.SortOrder,
                IsActive = c.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetCountriesAsync");
    }

    public async Task<CountryCatalogDto> SaveCountryAsync(CountryCatalogDto dto)
    {
        Country entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.Countries.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"Country {dto.Id} not found");
        }
        else
        {
            entity = new Country { Id = Guid.NewGuid() };
            _context.Countries.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.NationalityName = dto.NationalityName;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteCountryAsync(Guid countryId)
    {
        var entity = await _context.Countries.FindAsync(countryId);
        if (entity == null) return false;
        _context.Countries.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    // 13.24 Co so KCB (Healthcare Facility)
    public async Task<List<HealthcareFacilityCatalogDto>> GetHealthcareFacilitiesAsync(string? keyword = null, string? level = null, string? provinceCode = null, bool? isActive = null)
    {
        var query = _context.HealthcareFacilities.AsQueryable();
        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(f => f.Code.Contains(keyword) || f.Name.Contains(keyword));
        if (!string.IsNullOrEmpty(level))
            query = query.Where(f => f.Level == level);
        if (!string.IsNullOrEmpty(provinceCode))
            query = query.Where(f => f.ProvinceCode == provinceCode);
        if (isActive.HasValue)
            query = query.Where(f => f.IsActive == isActive.Value);

        return await query.OrderBy(f => f.SortOrder).ThenBy(f => f.Name)
            .Select(f => new HealthcareFacilityCatalogDto
            {
                Id = f.Id,
                Code = f.Code,
                Name = f.Name,
                Address = f.Address,
                Level = f.Level,
                ProvinceCode = f.ProvinceCode,
                SortOrder = f.SortOrder,
                IsActive = f.IsActive,
            }).ToBoundedListAsync("SystemCompleteService.GetHealthcareFacilitiesAsync");
    }

    public async Task<HealthcareFacilityCatalogDto> SaveHealthcareFacilityAsync(HealthcareFacilityCatalogDto dto)
    {
        HealthcareFacility entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _context.HealthcareFacilities.FindAsync(dto.Id);
            if (entity == null) throw new KeyNotFoundException($"HealthcareFacility {dto.Id} not found");
        }
        else
        {
            entity = new HealthcareFacility { Id = Guid.NewGuid() };
            _context.HealthcareFacilities.Add(entity);
        }
        entity.Code = dto.Code;
        entity.Name = dto.Name;
        entity.Address = dto.Address;
        entity.Level = dto.Level;
        entity.ProvinceCode = dto.ProvinceCode;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteHealthcareFacilityAsync(Guid facilityId)
    {
        var entity = await _context.HealthcareFacilities.FindAsync(facilityId);
        if (entity == null) return false;
        _context.HealthcareFacilities.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion
}
