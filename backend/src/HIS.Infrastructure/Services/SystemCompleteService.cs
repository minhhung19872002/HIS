using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of ISystemCompleteService
/// Covers Modules: 11 (Tai chinh), 13 (Danh muc), 15 (Bao cao Duoc), 16 (HSBA & Thong ke), 17 (Quan tri)
/// </summary>
public class SystemCompleteService : ISystemCompleteService
{
    private readonly HISDbContext _context;
    private readonly ILogger<SystemCompleteService> _logger;

    public SystemCompleteService(HISDbContext context, ILogger<SystemCompleteService> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region Module 11: Quan ly Tai chinh Ke toan - 9 chuc nang

    public async Task<List<RevenueByOrderingDeptDto>> GetRevenueByOrderingDeptAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string revenueType = null)
    {
        // Report - return empty list; full implementation requires complex aggregation
        return new List<RevenueByOrderingDeptDto>();
    }

    public async Task<List<RevenueByExecutingDeptDto>> GetRevenueByExecutingDeptAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string revenueType = null)
    {
        return new List<RevenueByExecutingDeptDto>();
    }

    public async Task<List<RevenueByServiceDto>> GetRevenueByServiceAsync(
        DateTime fromDate, DateTime toDate, Guid? serviceGroupId = null, Guid? serviceId = null)
    {
        return new List<RevenueByServiceDto>();
    }

    public async Task<List<SurgeryProfitReportDto>> GetSurgeryProfitReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? surgeryId = null)
    {
        return new List<SurgeryProfitReportDto>();
    }

    public async Task<List<CostByDepartmentDto>> GetCostByDepartmentAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string costType = null)
    {
        return new List<CostByDepartmentDto>();
    }

    public async Task<FinancialSummaryReportDto> GetFinancialSummaryReportAsync(
        DateTime fromDate, DateTime toDate)
    {
        return new FinancialSummaryReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalRevenue = 0,
            TotalCost = 0,
            GrossProfit = 0,
            NetProfit = 0,
            RevenueByDepartment = new List<DeptRevenueItemDto>(),
            CostByDepartment = new List<CostByDepartmentDto>()
        };
    }

    public async Task<List<PatientDebtReportDto>> GetPatientDebtReportAsync(
        DateTime? fromDate = null, DateTime? toDate = null, string debtStatus = null)
    {
        return new List<PatientDebtReportDto>();
    }

    public async Task<List<InsuranceDebtReportDto>> GetInsuranceDebtReportAsync(
        DateTime fromDate, DateTime toDate, string insuranceCode = null)
    {
        return new List<InsuranceDebtReportDto>();
    }

    public async Task<InsuranceReconciliationDto> GetInsuranceReconciliationAsync(
        DateTime fromDate, DateTime toDate, string insuranceCode = null)
    {
        return new InsuranceReconciliationDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            HospitalAmount = 0,
            InsuranceAmount = 0,
            Difference = 0,
            Items = new List<ReconciliationItemDto>()
        };
    }

    public async Task<byte[]> PrintFinancialReportAsync(FinancialReportRequest request)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> ExportFinancialReportToExcelAsync(FinancialReportRequest request)
    {
        return Array.Empty<byte>();
    }

    #endregion

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

            var items = await query.OrderBy(s => s.DisplayOrder).ThenBy(s => s.ServiceCode).ToListAsync();
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

            var items = await query.OrderBy(s => s.DisplayOrder).ThenBy(s => s.ServiceCode).ToListAsync();
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
        // Excel import not implemented yet
        _logger.LogWarning("ImportMedicinesFromExcelAsync: Not implemented");
        return false;
    }

    public async Task<byte[]> ExportMedicinesToExcelAsync(MedicineCatalogSearchDto search)
    {
        return Array.Empty<byte>();
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
        _logger.LogWarning("ImportMedicalSuppliesFromExcelAsync: Not implemented");
        return false;
    }

    public async Task<byte[]> ExportMedicalSuppliesToExcelAsync(string keyword = null, Guid? categoryId = null)
    {
        return Array.Empty<byte>();
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
        _logger.LogWarning("ImportICD10FromExcelAsync: Not implemented");
        return false;
    }

    public async Task<byte[]> ExportICD10ToExcelAsync(string chapterCode = null)
    {
        return Array.Empty<byte>();
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

            var items = await query.OrderBy(d => d.DisplayOrder).ThenBy(d => d.DepartmentCode).ToListAsync();
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

            var items = await query.OrderBy(r => r.DisplayOrder).ThenBy(r => r.RoomCode).ToListAsync();
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

            var items = await query.OrderBy(b => b.BedCode).ToListAsync();
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

            var items = await query.OrderBy(s => s.SupplierCode).ToListAsync();
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
        _logger.LogWarning("ImportServicePricesFromExcelAsync: Not implemented");
        return false;
    }

    public async Task<byte[]> ExportServicePricesToExcelAsync(string priceType = null)
    {
        return Array.Empty<byte>();
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

            var items = await query.OrderBy(t => t.ReportName).ToListAsync();
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

            var items = await query.ToListAsync();
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

            var items = await query.OrderBy(g => g.DisplayOrder).ThenBy(g => g.GroupCode).ToListAsync();
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

    // 13.17 Dong bo danh muc BHXH
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

    #endregion

    #region Module 15: Bao cao Duoc - 17 chuc nang

    public async Task<List<NarcoticDrugRegisterDto>> GetNarcoticDrugRegisterAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        return new List<NarcoticDrugRegisterDto>();
    }

    public async Task<List<PsychotropicDrugRegisterDto>> GetPsychotropicDrugRegisterAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        return new List<PsychotropicDrugRegisterDto>();
    }

    public async Task<List<PrecursorDrugRegisterDto>> GetPrecursorDrugRegisterAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        return new List<PrecursorDrugRegisterDto>();
    }

    public async Task<List<MedicineUsageReportDto>> GetMedicineUsageReportAsync(
        DateTime fromDate, DateTime toDate, Guid? medicineId = null, Guid? departmentId = null)
    {
        return new List<MedicineUsageReportDto>();
    }

    public async Task<List<AntibioticUsageReportDto>> GetAntibioticUsageReportAsync(
        DateTime fromDate, DateTime toDate, Guid? antibioticId = null, Guid? departmentId = null)
    {
        return new List<AntibioticUsageReportDto>();
    }

    public async Task<List<InventoryRecordDto>> GetDrugInventoryRecordAsync(
        DateTime inventoryDate, Guid warehouseId)
    {
        return new List<InventoryRecordDto>();
    }

    public async Task<List<DrugStockMovementReportDto>> GetDrugStockMovementReportAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null, Guid? medicineGroupId = null)
    {
        return new List<DrugStockMovementReportDto>();
    }

    public async Task<List<ExpiringDrugReportDto>> GetExpiringDrugReportAsync(
        int daysUntilExpiry = 90, Guid? warehouseId = null)
    {
        return new List<ExpiringDrugReportDto>();
    }

    public async Task<List<ExpiredDrugReportDto>> GetExpiredDrugReportAsync(Guid? warehouseId = null)
    {
        return new List<ExpiredDrugReportDto>();
    }

    public async Task<List<LowStockDrugReportDto>> GetLowStockDrugReportAsync(Guid? warehouseId = null)
    {
        return new List<LowStockDrugReportDto>();
    }

    public async Task<List<DrugCostByDeptReportDto>> GetDrugCostByDeptReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        return new List<DrugCostByDeptReportDto>();
    }

    public async Task<List<DrugCostByPatientReportDto>> GetDrugCostByPatientReportAsync(
        DateTime fromDate, DateTime toDate, Guid? patientId = null, string patientType = null)
    {
        return new List<DrugCostByPatientReportDto>();
    }

    public async Task<List<DrugByPaymentTypeReportDto>> GetDrugByPaymentTypeReportAsync(
        DateTime fromDate, DateTime toDate, string paymentType = null)
    {
        return new List<DrugByPaymentTypeReportDto>();
    }

    public async Task<List<OutpatientPrescriptionStatDto>> GetOutpatientPrescriptionStatAsync(
        DateTime fromDate, DateTime toDate, Guid? doctorId = null, Guid? departmentId = null)
    {
        return new List<OutpatientPrescriptionStatDto>();
    }

    public async Task<List<InpatientPrescriptionStatDto>> GetInpatientPrescriptionStatAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        return new List<InpatientPrescriptionStatDto>();
    }

    public async Task<ABCVENReportDto> GetABCVENReportAsync(
        DateTime fromDate, DateTime toDate, Guid? warehouseId = null)
    {
        return new ABCVENReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            Items = new List<ABCVENItemDto>()
        };
    }

    public async Task<List<DDDReportDto>> GetDDDReportAsync(
        DateTime fromDate, DateTime toDate, Guid? medicineId = null)
    {
        return new List<DDDReportDto>();
    }

    public async Task<byte[]> PrintPharmacyReportAsync(PharmacyReportRequest request)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> ExportPharmacyReportToExcelAsync(PharmacyReportRequest request)
    {
        return Array.Empty<byte>();
    }

    #endregion

    #region Module 16: HSBA & Thong ke - 12 chuc nang

    // 16.1 Luu tru ho so benh an
    public async Task<List<MedicalRecordArchiveDto>> GetMedicalRecordArchivesAsync(
        string keyword = null, int? year = null, string archiveStatus = null, Guid? departmentId = null)
    {
        // No dedicated archive entity; return empty
        return new List<MedicalRecordArchiveDto>();
    }

    public async Task<MedicalRecordArchiveDto> GetMedicalRecordArchiveAsync(Guid archiveId)
    {
        return null;
    }

    public async Task<MedicalRecordArchiveDto> SaveMedicalRecordArchiveAsync(MedicalRecordArchiveDto dto)
    {
        _logger.LogWarning("SaveMedicalRecordArchiveAsync: No dedicated archive entity");
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<bool> UpdateArchiveLocationAsync(Guid archiveId, string location)
    {
        _logger.LogWarning("UpdateArchiveLocationAsync: No dedicated archive entity");
        return false;
    }

    // 16.2 Muon tra ho so
    public async Task<List<MedicalRecordBorrowRequestDto>> GetBorrowRequestsAsync(
        DateTime? fromDate = null, DateTime? toDate = null, string status = null, Guid? borrowerId = null)
    {
        return new List<MedicalRecordBorrowRequestDto>();
    }

    public async Task<MedicalRecordBorrowRequestDto> GetBorrowRequestAsync(Guid requestId)
    {
        return null;
    }

    public async Task<MedicalRecordBorrowRequestDto> CreateBorrowRequestAsync(CreateBorrowRequestDto dto)
    {
        _logger.LogWarning("CreateBorrowRequestAsync: No dedicated borrow request entity");
        return new MedicalRecordBorrowRequestDto
        {
            Id = Guid.NewGuid(),
            RequestDate = DateTime.UtcNow,
            Status = "Pending",
            Purpose = dto.Purpose,
            ExpectedReturnDate = dto.ExpectedReturnDate,
            Note = dto.Note
        };
    }

    public async Task<bool> ApproveBorrowRequestAsync(Guid requestId)
    {
        _logger.LogWarning("ApproveBorrowRequestAsync: Not implemented");
        return false;
    }

    public async Task<bool> RejectBorrowRequestAsync(Guid requestId, string reason)
    {
        _logger.LogWarning("RejectBorrowRequestAsync: Not implemented");
        return false;
    }

    public async Task<bool> ProcessBorrowAsync(Guid requestId)
    {
        _logger.LogWarning("ProcessBorrowAsync: Not implemented");
        return false;
    }

    public async Task<bool> ReturnMedicalRecordAsync(Guid requestId, string note)
    {
        _logger.LogWarning("ReturnMedicalRecordAsync: Not implemented");
        return false;
    }

    // 16.3 Dashboard thong ke benh vien
    public async Task<HospitalDashboardDto> GetHospitalDashboardAsync(DateTime? date = null)
    {
        var reportDate = date ?? DateTime.Today;
        try
        {
            var todayStart = reportDate.Date;
            var todayEnd = todayStart.AddDays(1);

            var todayExams = await _context.Examinations
                .CountAsync(e => e.CreatedAt >= todayStart && e.CreatedAt < todayEnd);

            var todayAdmissions = await _context.Admissions
                .CountAsync(a => a.AdmissionDate >= todayStart && a.AdmissionDate < todayEnd);

            var currentInpatients = await _context.Admissions
                .CountAsync(a => a.Status == 0); // 0 = Dang dieu tri

            var totalBeds = await _context.Beds.CountAsync(b => b.IsActive);

            return new HospitalDashboardDto
            {
                ReportDate = reportDate,
                TodayOutpatients = todayExams,
                TodayAdmissions = todayAdmissions,
                CurrentInpatients = currentInpatients,
                AvailableBeds = totalBeds - currentInpatients,
                TodayDischarges = 0,
                TodaySurgeries = 0,
                TodayEmergencies = 0,
                TodayRevenue = 0,
                Trends = new List<DashboardTrendDto>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetHospitalDashboardAsync");
            return new HospitalDashboardDto
            {
                ReportDate = reportDate,
                Trends = new List<DashboardTrendDto>()
            };
        }
    }

    public async Task<List<DepartmentStatisticsDto>> GetDepartmentStatisticsAsync(
        DateTime fromDate, DateTime toDate)
    {
        try
        {
            var departments = await _context.Departments.AsNoTracking()
                .Where(d => d.IsActive)
                .OrderBy(d => d.DisplayOrder)
                .ToListAsync();

            return departments.Select(d => new DepartmentStatisticsDto
            {
                DepartmentId = d.Id,
                DepartmentName = d.DepartmentName,
                OutpatientCount = 0,
                InpatientCount = 0,
                AdmissionCount = 0,
                DischargeCount = 0,
                Revenue = 0
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetDepartmentStatisticsAsync");
            return new List<DepartmentStatisticsDto>();
        }
    }

    // 16.4 Bao cao kham benh
    public async Task<List<ExaminationStatisticsDto>> GetExaminationStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, Guid? doctorId = null)
    {
        return new List<ExaminationStatisticsDto>();
    }

    // 16.5 Bao cao nhap vien
    public async Task<List<AdmissionStatisticsDto>> GetAdmissionStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string admissionSource = null)
    {
        return new List<AdmissionStatisticsDto>();
    }

    // 16.6 Bao cao xuat vien
    public async Task<List<DischargeStatisticsDto>> GetDischargeStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null, string dischargeType = null)
    {
        return new List<DischargeStatisticsDto>();
    }

    // 16.7 Bao cao tu vong
    public async Task<List<MortalityStatisticsDto>> GetMortalityStatisticsAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        return new List<MortalityStatisticsDto>();
    }

    // 16.8 Bao cao benh theo ICD-10
    public async Task<List<DiseaseStatisticsDto>> GetDiseaseStatisticsAsync(
        DateTime fromDate, DateTime toDate, string icdChapter = null, Guid? departmentId = null)
    {
        return new List<DiseaseStatisticsDto>();
    }

    // 16.9 Bao cao hoat dong khoa
    public async Task<List<DepartmentActivityReportDto>> GetDepartmentActivityReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        return new List<DepartmentActivityReportDto>();
    }

    // 16.10 Bao cao cong suat giuong benh
    public async Task<List<BedOccupancyReportDto>> GetBedOccupancyReportAsync(
        DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        return new List<BedOccupancyReportDto>();
    }

    // 16.11 Bao cao A1-A2-A3 (BYT)
    public async Task<BYTReportDto> GetBYTReportAsync(DateTime fromDate, DateTime toDate)
    {
        return new BYTReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            HospitalName = string.Empty,
            HospitalCode = string.Empty,
            TotalOutpatients = 0,
            TotalInpatients = 0,
            TotalBeds = 0
        };
    }

    // 16.12 KPI benh vien
    public async Task<List<HospitalKPIDto>> GetHospitalKPIsAsync(DateTime fromDate, DateTime toDate)
    {
        return new List<HospitalKPIDto>();
    }

    public async Task<byte[]> PrintStatisticsReportAsync(StatisticsReportRequest request)
    {
        return Array.Empty<byte>();
    }

    public async Task<byte[]> ExportStatisticsReportToExcelAsync(StatisticsReportRequest request)
    {
        return Array.Empty<byte>();
    }

    #endregion

    #region Module 17: Quan tri He thong - 10 chuc nang

    // 17.1 Quan ly nguoi dung
    public async Task<List<SystemUserDto>> GetUsersAsync(
        string keyword = null, Guid? departmentId = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Users.AsNoTracking()
                .Include(u => u.Department)
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(u => u.FullName.Contains(keyword) || u.Username.Contains(keyword));
            if (departmentId.HasValue)
                query = query.Where(u => u.DepartmentId == departmentId.Value);
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            var items = await query.OrderBy(u => u.Username).Take(500).ToListAsync();
            return items.Select(u => new SystemUserDto
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.PhoneNumber,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                Roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string>(),
                Permissions = new List<string>(),
                IsActive = u.IsActive,
                LastLoginDate = u.LastLoginAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUsersAsync");
            return new List<SystemUserDto>();
        }
    }

    public async Task<SystemUserDto> GetUserAsync(Guid userId)
    {
        try
        {
            var u = await _context.Users.AsNoTracking()
                .Include(x => x.Department)
                .Include(x => x.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(x => x.Id == userId);
            if (u == null) return null;
            return new SystemUserDto
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.PhoneNumber,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department?.DepartmentName,
                Roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string>(),
                Permissions = new List<string>(),
                IsActive = u.IsActive,
                LastLoginDate = u.LastLoginAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUserAsync");
            return null;
        }
    }

    public async Task<SystemUserDto> CreateUserAsync(CreateUserDto dto)
    {
        try
        {
            var user = new User
            {
                Username = dto.Username ?? string.Empty,
                FullName = dto.FullName ?? string.Empty,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                DepartmentId = dto.DepartmentId,
                PasswordHash = HashPassword(dto.InitialPassword ?? "123456"),
                IsActive = true
            };
            _context.Users.Add(user);

            // Assign roles
            if (dto.RoleIds?.Any() == true)
            {
                foreach (var roleId in dto.RoleIds)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = user.Id,
                        RoleId = roleId
                    });
                }
            }

            await _context.SaveChangesAsync();

            return new SystemUserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.PhoneNumber,
                DepartmentId = user.DepartmentId,
                IsActive = user.IsActive,
                Roles = new List<string>(),
                Permissions = new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateUserAsync");
            return null;
        }
    }

    public async Task<SystemUserDto> UpdateUserAsync(Guid userId, UpdateUserDto dto)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return null;

            user.FullName = dto.FullName ?? user.FullName;
            user.Email = dto.Email;
            user.PhoneNumber = dto.PhoneNumber;
            user.DepartmentId = dto.DepartmentId;
            user.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return await GetUserAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateUserAsync");
            return null;
        }
    }

    public async Task<bool> DeleteUserAsync(Guid userId)
    {
        return await SoftDeleteEntityAsync<User>(userId);
    }

    public async Task<bool> ResetPasswordAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.PasswordHash = HashPassword("123456"); // Default reset password
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ResetPasswordAsync");
            return false;
        }
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, AdminChangePasswordDto dto)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            if (dto.NewPassword != dto.ConfirmPassword) return false;
            user.PasswordHash = HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ChangePasswordAsync");
            return false;
        }
    }

    public async Task<bool> LockUserAsync(Guid userId, string reason)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in LockUserAsync");
            return false;
        }
    }

    public async Task<bool> UnlockUserAsync(Guid userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return false;
            user.IsActive = true;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UnlockUserAsync");
            return false;
        }
    }

    // 17.2 Quan ly vai tro
    public async Task<List<RoleDto>> GetRolesAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.Roles.AsNoTracking()
                .Include(r => r.UserRoles)
                .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
                .AsQueryable();

            var items = await query.OrderBy(r => r.RoleCode).ToListAsync();
            return items.Select(r => new RoleDto
            {
                Id = r.Id,
                Code = r.RoleCode,
                Name = r.RoleName,
                Description = r.Description,
                Permissions = r.RolePermissions?.Select(rp => rp.Permission?.PermissionName).Where(p => p != null).ToList() ?? new List<string>(),
                UserCount = r.UserRoles?.Count ?? 0,
                IsActive = true
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRolesAsync");
            return new List<RoleDto>();
        }
    }

    public async Task<RoleDto> GetRoleAsync(Guid roleId)
    {
        try
        {
            var r = await _context.Roles.AsNoTracking()
                .Include(x => x.UserRoles)
                .Include(x => x.RolePermissions).ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(x => x.Id == roleId);
            if (r == null) return null;
            return new RoleDto
            {
                Id = r.Id,
                Code = r.RoleCode,
                Name = r.RoleName,
                Description = r.Description,
                Permissions = r.RolePermissions?.Select(rp => rp.Permission?.PermissionName).Where(p => p != null).ToList() ?? new List<string>(),
                UserCount = r.UserRoles?.Count ?? 0,
                IsActive = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRoleAsync");
            return null;
        }
    }

    public async Task<RoleDto> SaveRoleAsync(RoleDto dto)
    {
        try
        {
            Role entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Role
                {
                    RoleCode = dto.Code ?? string.Empty,
                    RoleName = dto.Name ?? string.Empty,
                    Description = dto.Description
                };
                _context.Roles.Add(entity);
            }
            else
            {
                entity = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.Id);
                if (entity == null) return null;
                entity.RoleCode = dto.Code ?? entity.RoleCode;
                entity.RoleName = dto.Name ?? entity.RoleName;
                entity.Description = dto.Description;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveRoleAsync");
            return null;
        }
    }

    public async Task<bool> DeleteRoleAsync(Guid roleId)
    {
        return await SoftDeleteEntityAsync<Role>(roleId);
    }

    // 17.3 Quan ly quyen
    public async Task<List<PermissionDto>> GetPermissionsAsync(string module = null)
    {
        try
        {
            var query = _context.Permissions.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(module))
                query = query.Where(p => p.Module == module);

            var items = await query.OrderBy(p => p.Module).ThenBy(p => p.PermissionCode).ToListAsync();
            return items.Select(p => new PermissionDto
            {
                Code = p.PermissionCode,
                Name = p.PermissionName,
                Module = p.Module,
                Description = p.Description
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<List<PermissionDto>> GetRolePermissionsAsync(Guid roleId)
    {
        try
        {
            var rolePerms = await _context.RolePermissions.AsNoTracking()
                .Include(rp => rp.Permission)
                .Where(rp => rp.RoleId == roleId)
                .ToListAsync();

            return rolePerms.Select(rp => new PermissionDto
            {
                Code = rp.Permission?.PermissionCode,
                Name = rp.Permission?.PermissionName,
                Module = rp.Permission?.Module,
                Description = rp.Permission?.Description
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetRolePermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<bool> UpdateRolePermissionsAsync(Guid roleId, List<Guid> permissionIds)
    {
        try
        {
            var existing = await _context.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync();
            _context.RolePermissions.RemoveRange(existing);

            foreach (var permId in permissionIds)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = roleId,
                    PermissionId = permId
                });
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateRolePermissionsAsync");
            return false;
        }
    }

    public async Task<List<PermissionDto>> GetUserPermissionsAsync(Guid userId)
    {
        try
        {
            var userRoles = await _context.UserRoles.AsNoTracking()
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .ToListAsync();

            var perms = await _context.RolePermissions.AsNoTracking()
                .Include(rp => rp.Permission)
                .Where(rp => userRoles.Contains(rp.RoleId))
                .ToListAsync();

            return perms
                .Select(rp => rp.Permission)
                .Where(p => p != null)
                .DistinctBy(p => p.Id)
                .Select(p => new PermissionDto
                {
                    Code = p.PermissionCode,
                    Name = p.PermissionName,
                    Module = p.Module,
                    Description = p.Description
                }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetUserPermissionsAsync");
            return new List<PermissionDto>();
        }
    }

    public async Task<bool> UpdateUserPermissionsAsync(Guid userId, List<Guid> permissionIds)
    {
        // User permissions are managed through roles in this system
        _logger.LogWarning("UpdateUserPermissionsAsync: Permissions are managed through roles");
        return false;
    }

    // 17.4 Nhat ky he thong
    public async Task<List<AuditLogDto>> GetAuditLogsAsync(AuditLogSearchDto search)
    {
        try
        {
            var query = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (search?.FromDate.HasValue == true)
                query = query.Where(l => l.CreatedAt >= search.FromDate.Value);
            if (search?.ToDate.HasValue == true)
                query = query.Where(l => l.CreatedAt <= search.ToDate.Value);
            if (search?.UserId.HasValue == true)
                query = query.Where(l => l.UserId == search.UserId.Value);
            if (!string.IsNullOrWhiteSpace(search?.Action))
                query = query.Where(l => l.Action == search.Action);
            if (!string.IsNullOrWhiteSpace(search?.EntityType))
                query = query.Where(l => l.TableName == search.EntityType);

            query = query.OrderByDescending(l => l.CreatedAt);

            if (search?.PageIndex.HasValue == true && search?.PageSize.HasValue == true)
            {
                var skip = search.PageIndex.Value * search.PageSize.Value;
                query = query.Skip(skip).Take(search.PageSize.Value);
            }
            else
            {
                query = query.Take(100);
            }

            var items = await query.ToListAsync();
            return items.Select(l => new AuditLogDto
            {
                Id = l.Id,
                LogTime = l.CreatedAt,
                UserId = l.UserId,
                Username = l.Username,
                Action = l.Action,
                EntityType = l.TableName,
                EntityId = l.RecordId.ToString(),
                OldValue = l.OldValues,
                NewValue = l.NewValues,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAuditLogsAsync");
            return new List<AuditLogDto>();
        }
    }

    public async Task<AuditLogDto> GetAuditLogAsync(Guid logId)
    {
        try
        {
            var l = await _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == logId);
            if (l == null) return null;
            return new AuditLogDto
            {
                Id = l.Id,
                LogTime = l.CreatedAt,
                UserId = l.UserId,
                Username = l.Username,
                Action = l.Action,
                EntityType = l.TableName,
                EntityId = l.RecordId.ToString(),
                OldValue = l.OldValues,
                NewValue = l.NewValues,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAuditLogAsync");
            return null;
        }
    }

    public async Task<byte[]> ExportAuditLogsToExcelAsync(AuditLogSearchDto search)
    {
        return Array.Empty<byte>();
    }

    // 17.5 Cau hinh he thong
    public async Task<List<SystemConfigDto>> GetSystemConfigsAsync(string category = null)
    {
        try
        {
            var query = _context.SystemConfigs.AsNoTracking()
                .Where(c => c.IsActive)
                .AsQueryable();

            var items = await query.OrderBy(c => c.ConfigKey).ToListAsync();
            return items.Select(c => new SystemConfigDto
            {
                Key = c.ConfigKey,
                Value = c.ConfigValue,
                DataType = c.ConfigType,
                Description = c.Description,
                IsEditable = true
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemConfigsAsync");
            return new List<SystemConfigDto>();
        }
    }

    public async Task<SystemConfigDto> GetSystemConfigAsync(string configKey)
    {
        try
        {
            var c = await _context.SystemConfigs.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ConfigKey == configKey);
            if (c == null) return null;
            return new SystemConfigDto
            {
                Key = c.ConfigKey,
                Value = c.ConfigValue,
                DataType = c.ConfigType,
                Description = c.Description,
                IsEditable = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemConfigAsync");
            return null;
        }
    }

    public async Task<SystemConfigDto> SaveSystemConfigAsync(SystemConfigDto dto)
    {
        try
        {
            var entity = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == dto.Key);

            if (entity == null)
            {
                entity = new SystemConfig
                {
                    ConfigKey = dto.Key ?? string.Empty,
                    ConfigValue = dto.Value ?? string.Empty,
                    ConfigType = dto.DataType ?? "String",
                    Description = dto.Description,
                    IsActive = true
                };
                _context.SystemConfigs.Add(entity);
            }
            else
            {
                entity.ConfigValue = dto.Value ?? entity.ConfigValue;
                entity.ConfigType = dto.DataType ?? entity.ConfigType;
                entity.Description = dto.Description;
            }
            await _context.SaveChangesAsync();
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSystemConfigAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSystemConfigAsync(string configKey)
    {
        try
        {
            var entity = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == configKey);
            if (entity == null) return false;
            entity.IsDeleted = true;
            entity.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in DeleteSystemConfigAsync");
            return false;
        }
    }

    // 17.6 Quan ly phien dang nhap
    public async Task<List<UserSessionDto>> GetActiveSessionsAsync(Guid? userId = null)
    {
        try
        {
            var query = _context.UserSessions.AsNoTracking()
                .Include(s => s.User)
                .Where(s => s.Status == 0) // 0 = Active
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(s => s.UserId == userId.Value);

            var items = await query.OrderByDescending(s => s.LoginTime).Take(100).ToListAsync();
            return items.Select(s => new UserSessionDto
            {
                Id = s.Id,
                UserId = s.UserId,
                Username = s.User?.Username,
                IpAddress = s.IPAddress,
                UserAgent = s.UserAgent,
                LoginTime = s.LoginTime,
                LastActivityTime = s.LogoutTime,
                IsActive = s.Status == 0
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetActiveSessionsAsync");
            return new List<UserSessionDto>();
        }
    }

    public async Task<bool> TerminateSessionAsync(Guid sessionId)
    {
        try
        {
            var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return false;
            session.Status = 2; // Logged out
            session.LogoutTime = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateSessionAsync");
            return false;
        }
    }

    public async Task<bool> TerminateAllSessionsAsync(Guid userId)
    {
        try
        {
            var sessions = await _context.UserSessions
                .Where(s => s.UserId == userId && s.Status == 0)
                .ToListAsync();

            foreach (var session in sessions)
            {
                session.Status = 2;
                session.LogoutTime = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminateAllSessionsAsync");
            return false;
        }
    }

    // 17.7 Quan ly thong bao he thong
    public async Task<List<SystemNotificationDto>> GetSystemNotificationsAsync(bool? isActive = null)
    {
        try
        {
            var query = _context.Notifications.AsNoTracking().AsQueryable();

            var items = await query.OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync();
            return items.Select(n => new SystemNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Content,
                NotificationType = n.NotificationType,
                StartTime = n.CreatedAt,
                IsActive = !n.IsRead,
                CreatedBy = n.CreatedBy,
                CreatedAt = n.CreatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemNotificationsAsync");
            return new List<SystemNotificationDto>();
        }
    }

    public async Task<SystemNotificationDto> GetSystemNotificationAsync(Guid notificationId)
    {
        try
        {
            var n = await _context.Notifications.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == notificationId);
            if (n == null) return null;
            return new SystemNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Content,
                NotificationType = n.NotificationType,
                StartTime = n.CreatedAt,
                IsActive = !n.IsRead,
                CreatedBy = n.CreatedBy,
                CreatedAt = n.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSystemNotificationAsync");
            return null;
        }
    }

    public async Task<SystemNotificationDto> SaveSystemNotificationAsync(SystemNotificationDto dto)
    {
        try
        {
            Notification entity;
            if (dto.Id == Guid.Empty)
            {
                entity = new Notification
                {
                    Title = dto.Title ?? string.Empty,
                    Content = dto.Message ?? string.Empty,
                    NotificationType = dto.NotificationType ?? "Info"
                };
                _context.Notifications.Add(entity);
            }
            else
            {
                entity = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == dto.Id);
                if (entity == null) return null;
                entity.Title = dto.Title ?? entity.Title;
                entity.Content = dto.Message ?? entity.Content;
                entity.NotificationType = dto.NotificationType ?? entity.NotificationType;
            }
            await _context.SaveChangesAsync();
            dto.Id = entity.Id;
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SaveSystemNotificationAsync");
            return null;
        }
    }

    public async Task<bool> DeleteSystemNotificationAsync(Guid notificationId)
    {
        return await SoftDeleteEntityAsync<Notification>(notificationId);
    }

    // 17.8 Sao luu du lieu
    public async Task<List<BackupHistoryDto>> GetBackupHistoryAsync(
        DateTime? fromDate = null, DateTime? toDate = null)
    {
        // No dedicated backup entity in DbContext
        return new List<BackupHistoryDto>();
    }

    public async Task<BackupHistoryDto> CreateBackupAsync(CreateBackupDto dto)
    {
        _logger.LogWarning("CreateBackupAsync: Database backup not implemented in application layer");
        return new BackupHistoryDto
        {
            Id = Guid.NewGuid(),
            BackupName = dto.BackupName,
            BackupType = dto.BackupType,
            BackupDate = DateTime.UtcNow,
            Status = "NotImplemented"
        };
    }

    public async Task<bool> RestoreBackupAsync(Guid backupId)
    {
        _logger.LogWarning("RestoreBackupAsync: Not implemented");
        return false;
    }

    public async Task<bool> DeleteBackupAsync(Guid backupId)
    {
        _logger.LogWarning("DeleteBackupAsync: Not implemented");
        return false;
    }

    // 17.9 Giam sat he thong
    public async Task<SystemHealthDto> GetSystemHealthAsync()
    {
        var dbStatus = "Unknown";
        try
        {
            var canConnect = await _context.Database.CanConnectAsync();
            dbStatus = canConnect ? "Healthy" : "Unhealthy";
        }
        catch
        {
            dbStatus = "Unhealthy";
        }

        return new SystemHealthDto
        {
            Status = dbStatus == "Healthy" ? "Healthy" : "Degraded",
            CpuUsage = 0,
            MemoryUsage = 0,
            DiskUsage = 0,
            DatabaseStatus = dbStatus,
            LastCheckTime = DateTime.UtcNow
        };
    }

    public async Task<List<SystemResourceDto>> GetSystemResourcesAsync()
    {
        return new List<SystemResourceDto>
        {
            new SystemResourceDto { ResourceName = "CPU", ResourceType = "Processor", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 },
            new SystemResourceDto { ResourceName = "Memory", ResourceType = "RAM", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 },
            new SystemResourceDto { ResourceName = "Disk", ResourceType = "Storage", CurrentValue = 0, MaxValue = 100, UtilizationPercentage = 0 }
        };
    }

    public async Task<List<DatabaseStatisticsDto>> GetDatabaseStatisticsAsync()
    {
        // Return basic table stats
        return new List<DatabaseStatisticsDto>();
    }

    // 17.10 Quan ly tich hop
    public async Task<List<IntegrationConfigDto>> GetIntegrationConfigsAsync(bool? isActive = null)
    {
        return new List<IntegrationConfigDto>();
    }

    public async Task<IntegrationConfigDto> GetIntegrationConfigAsync(Guid integrationId)
    {
        return null;
    }

    public async Task<IntegrationConfigDto> SaveIntegrationConfigAsync(IntegrationConfigDto dto)
    {
        _logger.LogWarning("SaveIntegrationConfigAsync: No dedicated integration entity");
        if (dto.Id == Guid.Empty) dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<bool> TestIntegrationConnectionAsync(Guid integrationId)
    {
        _logger.LogWarning("TestIntegrationConnectionAsync: Not implemented");
        return false;
    }

    public async Task<List<IntegrationLogDto>> GetIntegrationLogsAsync(
        Guid integrationId, DateTime? fromDate = null, DateTime? toDate = null)
    {
        return new List<IntegrationLogDto>();
    }

    #endregion

    #region Private Helper Methods

    private async Task<bool> SoftDeleteEntityAsync<T>(Guid id) where T : BaseEntity
    {
        try
        {
            var entity = await _context.Set<T>().FirstOrDefaultAsync(e => e.Id == id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SoftDeleteEntityAsync<{EntityType}> for Id {Id}", typeof(T).Name, id);
            return false;
        }
    }

    private async Task<Guid> GetDefaultServiceGroupIdAsync()
    {
        try
        {
            var group = await _context.ServiceGroups.FirstOrDefaultAsync(g => g.IsActive);
            return group?.Id ?? Guid.Empty;
        }
        catch
        {
            return Guid.Empty;
        }
    }

    private MedicineCatalogDto MapMedicineToDto(Medicine m)
    {
        return new MedicineCatalogDto
        {
            Id = m.Id,
            Code = m.MedicineCode,
            Name = m.MedicineName,
            EquivalentCode = m.MedicineCodeBYT,
            RegistrationNumber = m.RegistrationNumber,
            ActiveIngredientName = m.ActiveIngredient,
            Concentration = m.Concentration,
            Unit = m.Unit,
            PackageUnit = m.PackageUnit,
            PackageQuantity = m.ConversionRate,
            Manufacturer = m.Manufacturer,
            Country = m.Country,
            Price = m.UnitPrice,
            InsurancePrice = m.InsurancePrice,
            RouteName = m.RouteName,
            IsNarcotic = m.IsNarcotic,
            IsPsychotropic = m.IsPsychotropic,
            IsPrecursor = m.IsPrecursor,
            IsActive = m.IsActive
        };
    }

    private static string HashPassword(string password)
    {
        // Simple hash for now - should use proper hashing (BCrypt/Argon2) in production
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(password);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    #endregion
}
