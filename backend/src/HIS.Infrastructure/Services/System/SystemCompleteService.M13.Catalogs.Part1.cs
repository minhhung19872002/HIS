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

            // #195: hỏi DB 1 lần cho mọi mã trong file thay vì 1 query/dòng. HashSet cũng nuốt
            // luôn mã vừa thêm nên file có mã trùng nhau không còn tạo 2 bản ghi như trước.
            var codesInFile = new List<string>();
            for (int i = 1; i < lines.Length; i++)
            {
                var probeCols = lines[i].Split('\t');
                if (probeCols.Length < 2) continue;
                var probeCode = probeCols[0].Trim();
                if (!string.IsNullOrWhiteSpace(probeCode)) codesInFile.Add(probeCode);
            }
            var takenCodes = codesInFile.Count == 0
                ? new HashSet<string>()
                : (await _context.Medicines
                        .Where(m => codesInFile.Contains(m.MedicineCode) && !m.IsDeleted)
                        .Select(m => m.MedicineCode)
                        .ToListAsync())
                    .ToHashSet();

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
                if (!takenCodes.Add(code)) continue;

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

            // #195: hỏi DB 1 lần cho mọi mã trong file thay vì 1 query/dòng (xem ghi chú ở
            // ImportMedicinesFromExcelAsync — HashSet cũng chặn mã trùng trong cùng file).
            var supplyCodesInFile = new List<string>();
            for (int i = 1; i < lines.Length; i++)
            {
                var probeCols = lines[i].Split('\t');
                if (probeCols.Length < 2) continue;
                var probeCode = probeCols[0].Trim();
                if (!string.IsNullOrWhiteSpace(probeCode)) supplyCodesInFile.Add(probeCode);
            }
            var takenSupplyCodes = supplyCodesInFile.Count == 0
                ? new HashSet<string>()
                : (await _context.MedicalSupplies
                        .Where(s => supplyCodesInFile.Contains(s.SupplyCode) && !s.IsDeleted)
                        .Select(s => s.SupplyCode)
                        .ToListAsync())
                    .ToHashSet();

            var imported = 0;
            for (int i = 1; i < lines.Length; i++)
            {
                var cols = lines[i].Split('\t');
                if (cols.Length < 2) continue;

                var code = cols[0].Trim();
                var name = cols[1].Trim();
                if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name)) continue;

                if (!takenSupplyCodes.Add(code)) continue;

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

}
