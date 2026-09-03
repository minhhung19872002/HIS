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

            // #195: hỏi DB 1 lần cho mọi mã ICD trong file thay vì 1 query/dòng. HashSet cũng
            // chặn mã trùng trong cùng file — trước đây mỗi dòng hỏi DB nên bản ghi vừa Add mà
            // chưa SaveChanges không thấy được.
            var icdCodesInFile = new List<string>();
            for (int i = 1; i < lines.Length; i++)
            {
                var probeCols = lines[i].Split('\t');
                if (probeCols.Length < 2) continue;
                var probeCode = probeCols[0].Trim();
                if (!string.IsNullOrWhiteSpace(probeCode)) icdCodesInFile.Add(probeCode);
            }
            var takenIcdCodes = icdCodesInFile.Count == 0
                ? new HashSet<string>()
                : (await _context.IcdCodes
                        .Where(c => icdCodesInFile.Contains(c.Code))
                        .Select(c => c.Code)
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

                if (!takenIcdCodes.Add(code)) continue;

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

}
