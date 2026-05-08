using HIS.Application.DTOs.MasterCatalog;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap22: 13 master catalogs for BV Đắk Nông tender doc.
/// Generic CRUD pattern — soft-delete via IsDeleted, audit via CreatedBy/UpdatedBy.
/// </summary>
public class MasterCatalogService : IMasterCatalogService
{
    private readonly HISDbContext _db;

    public MasterCatalogService(HISDbContext db) => _db = db;

    private static Guid? ParseUserGuid(string? userId) =>
        Guid.TryParse(userId, out var g) ? g : null;

    private static string? Normalize(string? userId) => userId;

    // ───────────────── #1 Manufacturer ─────────────────
    public async Task<List<ManufacturerDto>> GetManufacturersAsync(string? keyword)
    {
        var q = _db.Manufacturers.Where(m => !m.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(m => m.Name.Contains(keyword) || m.Code.Contains(keyword));
        return await q.OrderBy(m => m.SortOrder).ThenBy(m => m.Name)
            .Select(m => new ManufacturerDto
            {
                Id = m.Id, Code = m.Code, Name = m.Name, Country = m.Country,
                Address = m.Address, Note = m.Note, SortOrder = m.SortOrder, IsActive = m.IsActive
            }).ToListAsync();
    }

    public async Task<ManufacturerDto> SaveManufacturerAsync(ManufacturerDto dto, string? userId)
    {
        Manufacturer entity;
        if (dto.Id == Guid.Empty)
        {
            entity = new Manufacturer { CreatedBy = Normalize(userId) };
            _db.Manufacturers.Add(entity);
        }
        else
        {
            entity = await _db.Manufacturers.FirstAsync(m => m.Id == dto.Id);
            entity.UpdatedBy = Normalize(userId);
        }
        entity.Code = dto.Code; entity.Name = dto.Name; entity.Country = dto.Country;
        entity.Address = dto.Address; entity.Note = dto.Note; entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();
        dto.Id = entity.Id;
        return dto;
    }

    public async Task<bool> DeleteManufacturerAsync(Guid id)
    {
        var e = await _db.Manufacturers.FirstOrDefaultAsync(m => m.Id == id);
        if (e == null) return false;
        e.IsDeleted = true;
        await _db.SaveChangesAsync();
        return true;
    }

    // ───────────────── #2 MedicationRoute ─────────────────
    public async Task<List<MedicationRouteDto>> GetMedicationRoutesAsync(string? keyword)
    {
        var q = _db.MedicationRoutes.Where(m => !m.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(m => m.Name.Contains(keyword) || m.Code.Contains(keyword));
        return await q.OrderBy(m => m.SortOrder).ThenBy(m => m.Name)
            .Select(m => new MedicationRouteDto
            {
                Id = m.Id, Code = m.Code, Name = m.Name, BhxhCode = m.BhxhCode,
                Note = m.Note, SortOrder = m.SortOrder, IsActive = m.IsActive
            }).ToListAsync();
    }

    public async Task<MedicationRouteDto> SaveMedicationRouteAsync(MedicationRouteDto dto, string? userId)
    {
        MedicationRoute e;
        if (dto.Id == Guid.Empty) { e = new(); _db.MedicationRoutes.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.MedicationRoutes.FirstAsync(m => m.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.BhxhCode = dto.BhxhCode; e.Note = dto.Note;
        e.SortOrder = dto.SortOrder; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteMedicationRouteAsync(Guid id)
    {
        var e = await _db.MedicationRoutes.FirstOrDefaultAsync(m => m.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #3 AdditionalCharge ─────────────────
    public async Task<List<AdditionalChargeDto>> GetAdditionalChargesAsync(string? keyword)
    {
        var q = _db.AdditionalCharges.Where(a => !a.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(a => a.Name.Contains(keyword) || a.Code.Contains(keyword));
        return await q.OrderBy(a => a.SortOrder).ThenBy(a => a.Name)
            .Select(a => new AdditionalChargeDto
            {
                Id = a.Id, Code = a.Code, Name = a.Name, Price = a.Price,
                EffectiveFrom = a.EffectiveFrom, EffectiveTo = a.EffectiveTo,
                Unit = a.Unit, Note = a.Note, SortOrder = a.SortOrder, IsActive = a.IsActive
            }).ToListAsync();
    }

    public async Task<AdditionalChargeDto> SaveAdditionalChargeAsync(AdditionalChargeDto dto, string? userId)
    {
        AdditionalCharge e;
        if (dto.Id == Guid.Empty) { e = new(); _db.AdditionalCharges.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.AdditionalCharges.FirstAsync(a => a.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.Price = dto.Price;
        e.EffectiveFrom = dto.EffectiveFrom; e.EffectiveTo = dto.EffectiveTo;
        e.Unit = dto.Unit; e.Note = dto.Note; e.SortOrder = dto.SortOrder; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteAdditionalChargeAsync(Guid id)
    {
        var e = await _db.AdditionalCharges.FirstOrDefaultAsync(a => a.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #4 OtherIncome ─────────────────
    public async Task<List<OtherIncomeDto>> GetOtherIncomesAsync(string? keyword)
    {
        var q = _db.OtherIncomes.Where(o => !o.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(o => o.Name.Contains(keyword) || o.Code.Contains(keyword));
        return await q.OrderBy(o => o.SortOrder).ThenBy(o => o.Name)
            .Select(o => new OtherIncomeDto
            {
                Id = o.Id, Code = o.Code, Name = o.Name, Price = o.Price,
                EffectiveFrom = o.EffectiveFrom, EffectiveTo = o.EffectiveTo,
                Unit = o.Unit, Note = o.Note, SortOrder = o.SortOrder, IsActive = o.IsActive
            }).ToListAsync();
    }

    public async Task<OtherIncomeDto> SaveOtherIncomeAsync(OtherIncomeDto dto, string? userId)
    {
        OtherIncome e;
        if (dto.Id == Guid.Empty) { e = new(); _db.OtherIncomes.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.OtherIncomes.FirstAsync(o => o.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.Price = dto.Price;
        e.EffectiveFrom = dto.EffectiveFrom; e.EffectiveTo = dto.EffectiveTo;
        e.Unit = dto.Unit; e.Note = dto.Note; e.SortOrder = dto.SortOrder; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteOtherIncomeAsync(Guid id)
    {
        var e = await _db.OtherIncomes.FirstOrDefaultAsync(o => o.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #5 TransportService ─────────────────
    public async Task<List<TransportServiceDto>> GetTransportServicesAsync(string? keyword)
    {
        var q = _db.TransportServices.Where(t => !t.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(t => t.Name.Contains(keyword) || t.Code.Contains(keyword));
        return await q.OrderBy(t => t.SortOrder).ThenBy(t => t.Name)
            .Select(t => new TransportServiceDto
            {
                Id = t.Id, Code = t.Code, Name = t.Name, CalculationType = t.CalculationType,
                UnitPrice = t.UnitPrice, GasolineFactor = t.GasolineFactor,
                Note = t.Note, SortOrder = t.SortOrder, IsActive = t.IsActive
            }).ToListAsync();
    }

    public async Task<TransportServiceDto> SaveTransportServiceAsync(TransportServiceDto dto, string? userId)
    {
        TransportService e;
        if (dto.Id == Guid.Empty) { e = new(); _db.TransportServices.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.TransportServices.FirstAsync(t => t.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.CalculationType = dto.CalculationType;
        e.UnitPrice = dto.UnitPrice; e.GasolineFactor = dto.GasolineFactor;
        e.Note = dto.Note; e.SortOrder = dto.SortOrder; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteTransportServiceAsync(Guid id)
    {
        var e = await _db.TransportServices.FirstOrDefaultAsync(t => t.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #6 GasolinePrice ─────────────────
    public async Task<List<GasolinePriceDto>> GetGasolinePricesAsync(string? fuelType)
    {
        var q = _db.GasolinePrices.Where(g => !g.IsDeleted);
        if (!string.IsNullOrWhiteSpace(fuelType))
            q = q.Where(g => g.FuelType == fuelType);
        return await q.OrderByDescending(g => g.EffectiveFrom)
            .Select(g => new GasolinePriceDto
            {
                Id = g.Id, FuelType = g.FuelType, PricePerLitre = g.PricePerLitre,
                EffectiveFrom = g.EffectiveFrom, IssuedBy = g.IssuedBy, Note = g.Note
            }).ToListAsync();
    }

    public async Task<GasolinePriceDto> SaveGasolinePriceAsync(GasolinePriceDto dto, string? userId)
    {
        GasolinePrice e;
        if (dto.Id == Guid.Empty) { e = new(); _db.GasolinePrices.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.GasolinePrices.FirstAsync(g => g.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.FuelType = dto.FuelType; e.PricePerLitre = dto.PricePerLitre;
        e.EffectiveFrom = dto.EffectiveFrom; e.IssuedBy = dto.IssuedBy; e.Note = dto.Note;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteGasolinePriceAsync(Guid id)
    {
        var e = await _db.GasolinePrices.FirstOrDefaultAsync(g => g.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #7 MachineCode ─────────────────
    public async Task<List<MachineCodeDto>> GetMachineCodesAsync(string? keyword)
    {
        var q = _db.MachineCodes.Where(m => !m.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(m => m.Name.Contains(keyword) || m.Code.Contains(keyword)
                          || (m.SerialNumber ?? "").Contains(keyword));
        return await q.OrderBy(m => m.Code)
            .Select(m => new MachineCodeDto
            {
                Id = m.Id, Code = m.Code, Name = m.Name, Manufacturer = m.Manufacturer,
                Model = m.Model, SerialNumber = m.SerialNumber,
                DepartmentId = m.DepartmentId, RoomId = m.RoomId,
                BhxhCode = m.BhxhCode, Note = m.Note,
                IsLocked = m.IsLocked, IsActive = m.IsActive
            }).ToListAsync();
    }

    public async Task<MachineCodeDto> SaveMachineCodeAsync(MachineCodeDto dto, string? userId)
    {
        MachineCode e;
        if (dto.Id == Guid.Empty) { e = new(); _db.MachineCodes.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.MachineCodes.FirstAsync(m => m.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.Manufacturer = dto.Manufacturer;
        e.Model = dto.Model; e.SerialNumber = dto.SerialNumber;
        e.DepartmentId = dto.DepartmentId; e.RoomId = dto.RoomId;
        e.BhxhCode = dto.BhxhCode; e.Note = dto.Note;
        e.IsLocked = dto.IsLocked; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteMachineCodeAsync(Guid id)
    {
        var e = await _db.MachineCodes.FirstOrDefaultAsync(m => m.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #8 MachineService ─────────────────
    public async Task<List<MachineServiceDto>> GetMachineServicesAsync(Guid? machineCodeId)
    {
        var q = _db.MachineServices.Where(m => !m.IsDeleted);
        if (machineCodeId.HasValue) q = q.Where(m => m.MachineCodeId == machineCodeId.Value);

        var rows = await q.ToListAsync();
        var machineIds = rows.Select(r => r.MachineCodeId).Distinct().ToList();
        var serviceIds = rows.Select(r => r.ServiceId).Distinct().ToList();
        var machines = await _db.MachineCodes.Where(m => machineIds.Contains(m.Id))
            .Select(m => new { m.Id, m.Name }).ToDictionaryAsync(x => x.Id, x => x.Name);
        var services = await _db.Set<Service>().Where(s => serviceIds.Contains(s.Id))
            .Select(s => new { s.Id, s.ServiceName }).ToDictionaryAsync(x => x.Id, x => x.ServiceName);

        return rows.Select(r => new MachineServiceDto
        {
            Id = r.Id, MachineCodeId = r.MachineCodeId, ServiceId = r.ServiceId,
            MachineName = machines.GetValueOrDefault(r.MachineCodeId),
            ServiceName = services.GetValueOrDefault(r.ServiceId),
            IsDefault = r.IsDefault, Note = r.Note
        }).ToList();
    }

    public async Task<MachineServiceDto> SaveMachineServiceAsync(MachineServiceDto dto, string? userId)
    {
        MachineService e;
        if (dto.Id == Guid.Empty) { e = new(); _db.MachineServices.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.MachineServices.FirstAsync(m => m.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.MachineCodeId = dto.MachineCodeId; e.ServiceId = dto.ServiceId;
        e.IsDefault = dto.IsDefault; e.Note = dto.Note;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteMachineServiceAsync(Guid id)
    {
        var e = await _db.MachineServices.FirstOrDefaultAsync(m => m.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #9 InspectionCommittee ─────────────────
    public async Task<List<InspectionCommitteeDto>> GetInspectionCommitteesAsync(string? keyword)
    {
        var q = _db.InspectionCommittees.Where(c => !c.IsDeleted);
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(c => c.Name.Contains(keyword) || c.Code.Contains(keyword));

        var committees = await q.OrderBy(c => c.Name).ToListAsync();
        var ids = committees.Select(c => c.Id).ToList();
        var members = await _db.InspectionCommitteeMembers
            .Where(m => ids.Contains(m.CommitteeId) && !m.IsDeleted)
            .OrderBy(m => m.SortOrder).ToListAsync();

        return committees.Select(c => new InspectionCommitteeDto
        {
            Id = c.Id, Code = c.Code, Name = c.Name, Description = c.Description,
            EffectiveFrom = c.EffectiveFrom, EffectiveTo = c.EffectiveTo, IsActive = c.IsActive,
            Members = members.Where(m => m.CommitteeId == c.Id).Select(m => new InspectionCommitteeMemberDto
            {
                Id = m.Id, CommitteeId = m.CommitteeId, UserId = m.UserId,
                FullName = m.FullName, Title = m.Title, Role = m.Role, SortOrder = m.SortOrder
            }).ToList()
        }).ToList();
    }

    public async Task<InspectionCommitteeDto> SaveInspectionCommitteeAsync(InspectionCommitteeDto dto, string? userId)
    {
        InspectionCommittee e;
        if (dto.Id == Guid.Empty) { e = new(); _db.InspectionCommittees.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.InspectionCommittees.FirstAsync(c => c.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.Description = dto.Description;
        e.EffectiveFrom = dto.EffectiveFrom; e.EffectiveTo = dto.EffectiveTo; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync();
        dto.Id = e.Id;

        // Replace members atomically
        var existing = await _db.InspectionCommitteeMembers.Where(m => m.CommitteeId == e.Id).ToListAsync();
        _db.InspectionCommitteeMembers.RemoveRange(existing);
        foreach (var md in dto.Members)
        {
            _db.InspectionCommitteeMembers.Add(new InspectionCommitteeMember
            {
                CommitteeId = e.Id,
                UserId = md.UserId,
                FullName = md.FullName,
                Title = md.Title,
                Role = md.Role,
                SortOrder = md.SortOrder,
                CreatedBy = Normalize(userId)
            });
        }
        await _db.SaveChangesAsync();
        return dto;
    }

    public async Task<bool> DeleteInspectionCommitteeAsync(Guid id)
    {
        var e = await _db.InspectionCommittees.FirstOrDefaultAsync(c => c.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #10 NursingCareLevel ─────────────────
    public async Task<List<NursingCareLevelDto>> GetNursingCareLevelsAsync()
    {
        return await _db.NursingCareLevels.Where(n => !n.IsDeleted)
            .OrderBy(n => n.SortOrder).ThenBy(n => n.Level)
            .Select(n => new NursingCareLevelDto
            {
                Id = n.Id, Code = n.Code, Name = n.Name, Level = n.Level,
                Description = n.Description, Note = n.Note,
                SortOrder = n.SortOrder, IsActive = n.IsActive
            }).ToListAsync();
    }

    public async Task<NursingCareLevelDto> SaveNursingCareLevelAsync(NursingCareLevelDto dto, string? userId)
    {
        NursingCareLevel e;
        if (dto.Id == Guid.Empty) { e = new(); _db.NursingCareLevels.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.NursingCareLevels.FirstAsync(n => n.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.Level = dto.Level;
        e.Description = dto.Description; e.Note = dto.Note;
        e.SortOrder = dto.SortOrder; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteNursingCareLevelAsync(Guid id)
    {
        var e = await _db.NursingCareLevels.FirstOrDefaultAsync(n => n.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #11 MedicalRecordType ─────────────────
    public async Task<List<MedicalRecordTypeDto>> GetMedicalRecordTypesAsync()
    {
        return await _db.MedicalRecordTypes.Where(m => !m.IsDeleted)
            .OrderBy(m => m.SortOrder).ThenBy(m => m.Name)
            .Select(m => new MedicalRecordTypeDto
            {
                Id = m.Id, Code = m.Code, Name = m.Name, Category = m.Category,
                Note = m.Note, SortOrder = m.SortOrder,
                IsActive = m.IsActive, IsLocked = m.IsLocked
            }).ToListAsync();
    }

    public async Task<MedicalRecordTypeDto> SaveMedicalRecordTypeAsync(MedicalRecordTypeDto dto, string? userId)
    {
        MedicalRecordType e;
        if (dto.Id == Guid.Empty) { e = new(); _db.MedicalRecordTypes.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.MedicalRecordTypes.FirstAsync(m => m.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.Category = dto.Category;
        e.Note = dto.Note; e.SortOrder = dto.SortOrder;
        e.IsActive = dto.IsActive; e.IsLocked = dto.IsLocked;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteMedicalRecordTypeAsync(Guid id)
    {
        var e = await _db.MedicalRecordTypes.FirstOrDefaultAsync(m => m.Id == id);
        if (e == null) return false;
        if (e.IsLocked) throw new InvalidOperationException("Loại bệnh án này đang khóa, không thể xóa");
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #12 ParaclinicalRoomPriority ─────────────────
    public async Task<List<ParaclinicalRoomPriorityDto>> GetParaclinicalRoomPrioritiesAsync(Guid? serviceId)
    {
        var q = _db.ParaclinicalRoomPriorities.Where(p => !p.IsDeleted);
        if (serviceId.HasValue) q = q.Where(p => p.ServiceId == serviceId.Value);

        var rows = await q.OrderBy(p => p.PriorityLevel).ThenBy(p => p.Sequence).ToListAsync();
        var serviceIds = rows.Select(r => r.ServiceId).Distinct().ToList();
        var roomIds = rows.Where(r => r.RoomId.HasValue).Select(r => r.RoomId!.Value).Distinct().ToList();
        var deptIds = rows.Where(r => r.DepartmentId.HasValue).Select(r => r.DepartmentId!.Value).Distinct().ToList();

        var services = await _db.Set<Service>().Where(s => serviceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.ServiceName);
        var rooms = await _db.Set<Room>().Where(r => roomIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r.RoomName);
        var depts = await _db.Departments.Where(d => deptIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.DepartmentName);

        return rows.Select(r => new ParaclinicalRoomPriorityDto
        {
            Id = r.Id, ServiceId = r.ServiceId,
            ServiceName = services.GetValueOrDefault(r.ServiceId),
            RoomId = r.RoomId, RoomName = r.RoomId.HasValue ? rooms.GetValueOrDefault(r.RoomId.Value) : null,
            DepartmentId = r.DepartmentId, DepartmentName = r.DepartmentId.HasValue ? depts.GetValueOrDefault(r.DepartmentId.Value) : null,
            PriorityLevel = r.PriorityLevel, Sequence = r.Sequence, Note = r.Note
        }).ToList();
    }

    public async Task<ParaclinicalRoomPriorityDto> SaveParaclinicalRoomPriorityAsync(ParaclinicalRoomPriorityDto dto, string? userId)
    {
        ParaclinicalRoomPriority e;
        if (dto.Id == Guid.Empty) { e = new(); _db.ParaclinicalRoomPriorities.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.ParaclinicalRoomPriorities.FirstAsync(p => p.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.ServiceId = dto.ServiceId; e.RoomId = dto.RoomId; e.DepartmentId = dto.DepartmentId;
        e.PriorityLevel = dto.PriorityLevel; e.Sequence = dto.Sequence; e.Note = dto.Note;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteParaclinicalRoomPriorityAsync(Guid id)
    {
        var e = await _db.ParaclinicalRoomPriorities.FirstOrDefaultAsync(p => p.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    // ───────────────── #13 ReportServiceGroupType / Group ─────────────────
    public async Task<List<ReportServiceGroupTypeDto>> GetReportServiceGroupTypesAsync()
    {
        return await _db.ReportServiceGroupTypes.Where(r => !r.IsDeleted)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new ReportServiceGroupTypeDto
            {
                Id = r.Id, Code = r.Code, Name = r.Name, ReportLabel = r.ReportLabel,
                Note = r.Note, SortOrder = r.SortOrder, IsActive = r.IsActive
            }).ToListAsync();
    }

    public async Task<ReportServiceGroupTypeDto> SaveReportServiceGroupTypeAsync(ReportServiceGroupTypeDto dto, string? userId)
    {
        ReportServiceGroupType e;
        if (dto.Id == Guid.Empty) { e = new(); _db.ReportServiceGroupTypes.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.ReportServiceGroupTypes.FirstAsync(r => r.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.Code = dto.Code; e.Name = dto.Name; e.ReportLabel = dto.ReportLabel;
        e.Note = dto.Note; e.SortOrder = dto.SortOrder; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteReportServiceGroupTypeAsync(Guid id)
    {
        var e = await _db.ReportServiceGroupTypes.FirstOrDefaultAsync(r => r.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }

    public async Task<List<ReportServiceGroupDto>> GetReportServiceGroupsAsync(Guid? typeId)
    {
        var q = _db.ReportServiceGroups.Where(r => !r.IsDeleted);
        if (typeId.HasValue) q = q.Where(r => r.GroupTypeId == typeId.Value);
        var rows = await q.OrderBy(r => r.SortOrder).ThenBy(r => r.Name).ToListAsync();
        var typeIds = rows.Select(r => r.GroupTypeId).Distinct().ToList();
        var types = await _db.ReportServiceGroupTypes.Where(t => typeIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name);

        return rows.Select(r => new ReportServiceGroupDto
        {
            Id = r.Id, GroupTypeId = r.GroupTypeId,
            GroupTypeName = types.GetValueOrDefault(r.GroupTypeId),
            Code = r.Code, Name = r.Name, Note = r.Note,
            SortOrder = r.SortOrder, IsActive = r.IsActive
        }).ToList();
    }

    public async Task<ReportServiceGroupDto> SaveReportServiceGroupAsync(ReportServiceGroupDto dto, string? userId)
    {
        ReportServiceGroup e;
        if (dto.Id == Guid.Empty) { e = new(); _db.ReportServiceGroups.Add(e); e.CreatedBy = Normalize(userId); }
        else { e = await _db.ReportServiceGroups.FirstAsync(r => r.Id == dto.Id); e.UpdatedBy = Normalize(userId); }
        e.GroupTypeId = dto.GroupTypeId; e.Code = dto.Code; e.Name = dto.Name;
        e.Note = dto.Note; e.SortOrder = dto.SortOrder; e.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(); dto.Id = e.Id; return dto;
    }

    public async Task<bool> DeleteReportServiceGroupAsync(Guid id)
    {
        var e = await _db.ReportServiceGroups.FirstOrDefaultAsync(r => r.Id == id);
        if (e == null) return false;
        e.IsDeleted = true; await _db.SaveChangesAsync(); return true;
    }
}
