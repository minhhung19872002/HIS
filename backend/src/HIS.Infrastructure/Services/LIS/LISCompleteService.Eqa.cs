using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Laboratory;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap26 — LIS #29 Quản lý ngoại kiểm (EQA) + LIS #15 Quản lý đơn vị gửi mẫu.
/// Nội kiểm (IQC) đã có sẵn ở LabQCResults — file này chỉ lo phần NGOẠI kiểm.
/// </summary>
public partial class LISCompleteService
{
    #region LIS #29 — Danh mục xét nghiệm ngoại kiểm

    public async Task<List<LabEqaTestDto>> GetEqaTestsAsync(bool activeOnly = true)
    {
        var q = _context.LabEqaTests.AsNoTracking().Where(t => !t.IsDeleted);
        if (activeOnly) q = q.Where(t => t.IsActive);
        return await q.OrderBy(t => t.Code)
            .Select(t => new LabEqaTestDto
            {
                Id = t.Id, Code = t.Code, Name = t.Name, ServiceId = t.ServiceId,
                ServiceName = t.Service != null ? t.Service.ServiceName : null,
                ProviderName = t.ProviderName, Cycle = t.Cycle, Unit = t.Unit,
                Notes = t.Notes, IsActive = t.IsActive
            })
            .ToListAsync();
    }

    public async Task<LabEqaTestDto> SaveEqaTestAsync(LabEqaTestDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Code)) throw new InvalidOperationException("Thiếu mã xét nghiệm ngoại kiểm.");
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new InvalidOperationException("Thiếu tên xét nghiệm ngoại kiểm.");

        var now = DateTime.Now;
        LabEqaTest e;
        if (dto.Id != Guid.Empty)
        {
            e = await _context.LabEqaTests.FirstOrDefaultAsync(x => x.Id == dto.Id && !x.IsDeleted)
                ?? throw new InvalidOperationException("Không tìm thấy xét nghiệm ngoại kiểm.");
            e.UpdatedAt = now; e.UpdatedBy = userId.ToString();
        }
        else
        {
            var dup = await _context.LabEqaTests.AnyAsync(x => x.Code == dto.Code.Trim() && !x.IsDeleted);
            if (dup) throw new InvalidOperationException($"Mã \"{dto.Code}\" đã tồn tại.");
            e = new LabEqaTest { Id = Guid.NewGuid(), CreatedAt = now, CreatedBy = userId.ToString() };
            _context.LabEqaTests.Add(e);
        }

        e.Code = dto.Code.Trim();
        e.Name = dto.Name.Trim();
        e.ServiceId = dto.ServiceId;
        e.ProviderName = dto.ProviderName;
        e.Cycle = dto.Cycle;
        e.Unit = dto.Unit;
        e.Notes = dto.Notes;
        e.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        dto.Id = e.Id;
        return dto;
    }

    public async Task DeleteEqaTestAsync(Guid id, Guid userId)
    {
        var e = await _context.LabEqaTests.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy xét nghiệm ngoại kiểm.");
        var used = await _context.LabEqaResults.AnyAsync(r => r.EqaTestId == id && !r.IsDeleted);
        if (used) throw new InvalidOperationException("Xét nghiệm đã có kết quả ngoại kiểm, không xóa được — hãy ngưng sử dụng.");
        e.IsDeleted = true; e.UpdatedAt = DateTime.Now; e.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
    }

    #endregion

    #region LIS #29 — Đợt ngoại kiểm: nhận bàn giao mẫu → chạy mẫu → báo cáo

    public async Task<List<LabEqaBatchDto>> GetEqaBatchesAsync(string? status, DateTime? fromDate, DateTime? toDate)
    {
        var q = _context.LabEqaBatches.AsNoTracking().Where(b => !b.IsDeleted);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(b => b.Status == status);
        if (fromDate.HasValue) q = q.Where(b => b.ReceivedDate >= fromDate.Value.Date);
        if (toDate.HasValue) q = q.Where(b => b.ReceivedDate < toDate.Value.Date.AddDays(1));

        var rows = await q.OrderByDescending(b => b.ReceivedDate)
            .Select(b => new
            {
                b.Id, b.BatchCode, b.ProviderName, b.Period, b.ReceivedDate, b.DueDate,
                b.HandoverBy, b.ReceivedBy, b.Status, b.Notes,
                ResultCount = _context.LabEqaResults.Count(r => r.BatchId == b.Id && !r.IsDeleted)
            })
            .ToListAsync();

        var userIds = rows.Where(r => r.ReceivedBy.HasValue).Select(r => r.ReceivedBy!.Value).Distinct().ToList();
        var users = await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        return rows.Select(b => new LabEqaBatchDto
        {
            Id = b.Id, BatchCode = b.BatchCode, ProviderName = b.ProviderName, Period = b.Period,
            ReceivedDate = b.ReceivedDate, DueDate = b.DueDate, HandoverBy = b.HandoverBy,
            ReceivedBy = b.ReceivedBy,
            ReceivedByName = b.ReceivedBy.HasValue && users.TryGetValue(b.ReceivedBy.Value, out var n) ? n : null,
            Status = b.Status, Notes = b.Notes, ResultCount = b.ResultCount
        }).ToList();
    }

    public async Task<LabEqaBatchDto> GetEqaBatchAsync(Guid id)
    {
        var b = await _context.LabEqaBatches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy đợt ngoại kiểm.");

        var results = await _context.LabEqaResults.AsNoTracking()
            .Where(r => r.BatchId == id && !r.IsDeleted)
            .OrderBy(r => r.SampleCode)
            .Select(r => new LabEqaResultDto
            {
                Id = r.Id, BatchId = r.BatchId, EqaTestId = r.EqaTestId,
                EqaTestName = r.EqaTest != null ? r.EqaTest.Name : null,
                SampleCode = r.SampleCode, ResultValue = r.ResultValue, ResultText = r.ResultText,
                RunAt = r.RunAt, RunBy = r.RunBy, TargetValue = r.TargetValue, ZScore = r.ZScore,
                Evaluation = r.Evaluation, CorrectiveAction = r.CorrectiveAction, Notes = r.Notes
            })
            .ToListAsync();

        string? receivedByName = null;
        if (b.ReceivedBy.HasValue)
            receivedByName = await _context.Users.Where(u => u.Id == b.ReceivedBy.Value).Select(u => u.FullName).FirstOrDefaultAsync();

        return new LabEqaBatchDto
        {
            Id = b.Id, BatchCode = b.BatchCode, ProviderName = b.ProviderName, Period = b.Period,
            ReceivedDate = b.ReceivedDate, DueDate = b.DueDate, HandoverBy = b.HandoverBy,
            ReceivedBy = b.ReceivedBy, ReceivedByName = receivedByName, Status = b.Status,
            Notes = b.Notes, ResultCount = results.Count, Results = results
        };
    }

    /// <summary>Tiếp nhận bàn giao mẫu ngoại kiểm (tạo mới) hoặc sửa thông tin đợt.</summary>
    public async Task<LabEqaBatchDto> SaveEqaBatchAsync(SaveLabEqaBatchDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.BatchCode)) throw new InvalidOperationException("Thiếu mã đợt ngoại kiểm.");

        var now = DateTime.Now;
        LabEqaBatch e;
        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            e = await _context.LabEqaBatches.FirstOrDefaultAsync(x => x.Id == dto.Id && !x.IsDeleted)
                ?? throw new InvalidOperationException("Không tìm thấy đợt ngoại kiểm.");
            e.UpdatedAt = now; e.UpdatedBy = userId.ToString();
        }
        else
        {
            e = new LabEqaBatch
            {
                Id = Guid.NewGuid(), Status = "Received", ReceivedBy = userId,
                CreatedAt = now, CreatedBy = userId.ToString()
            };
            _context.LabEqaBatches.Add(e);
        }

        e.BatchCode = dto.BatchCode.Trim();
        e.ProviderName = dto.ProviderName;
        e.Period = dto.Period;
        e.ReceivedDate = dto.ReceivedDate == default ? now : dto.ReceivedDate;
        e.DueDate = dto.DueDate;
        e.HandoverBy = dto.HandoverBy;
        e.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return await GetEqaBatchAsync(e.Id);
    }

    /// <summary>Chuyển trạng thái đợt: Received → Running → Reported → Closed.</summary>
    public async Task<LabEqaBatchDto> SetEqaBatchStatusAsync(Guid id, string status, Guid userId)
    {
        var allowed = new[] { "Received", "Running", "Reported", "Closed" };
        if (!allowed.Contains(status))
            throw new InvalidOperationException($"Trạng thái \"{status}\" không hợp lệ.");

        var e = await _context.LabEqaBatches.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy đợt ngoại kiểm.");

        if (status == "Reported")
        {
            var hasResult = await _context.LabEqaResults.AnyAsync(r => r.BatchId == id && !r.IsDeleted && (r.ResultValue != null || r.ResultText != null));
            if (!hasResult) throw new InvalidOperationException("Chưa có kết quả nào — không báo cáo được.");
        }

        e.Status = status;
        e.UpdatedAt = DateTime.Now;
        e.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return await GetEqaBatchAsync(id);
    }

    /// <summary>Đăng ký chạy mẫu / nhập kết quả cho 1 chỉ tiêu trong đợt.</summary>
    public async Task<LabEqaResultDto> SaveEqaResultAsync(SaveLabEqaResultDto dto, Guid userId)
    {
        var batch = await _context.LabEqaBatches.FirstOrDefaultAsync(b => b.Id == dto.BatchId && !b.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy đợt ngoại kiểm.");
        if (batch.Status == "Closed")
            throw new InvalidOperationException("Đợt đã đóng, không sửa kết quả được.");

        var now = DateTime.Now;
        LabEqaResult e;
        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            e = await _context.LabEqaResults.FirstOrDefaultAsync(x => x.Id == dto.Id && !x.IsDeleted)
                ?? throw new InvalidOperationException("Không tìm thấy kết quả ngoại kiểm.");
            e.UpdatedAt = now; e.UpdatedBy = userId.ToString();
        }
        else
        {
            e = new LabEqaResult { Id = Guid.NewGuid(), BatchId = dto.BatchId, CreatedAt = now, CreatedBy = userId.ToString() };
            _context.LabEqaResults.Add(e);
        }

        e.EqaTestId = dto.EqaTestId;
        e.SampleCode = dto.SampleCode;
        e.ResultValue = dto.ResultValue;
        e.ResultText = dto.ResultText;
        e.TargetValue = dto.TargetValue;
        e.ZScore = dto.ZScore;
        e.Evaluation = dto.Evaluation;
        e.CorrectiveAction = dto.CorrectiveAction;
        e.Notes = dto.Notes;
        if (dto.ResultValue != null || !string.IsNullOrWhiteSpace(dto.ResultText))
        {
            e.RunAt ??= now;
            e.RunBy ??= userId;
        }

        // Nhập kết quả đầu tiên → đợt chuyển sang "đang chạy mẫu".
        if (batch.Status == "Received") batch.Status = "Running";

        await _context.SaveChangesAsync();

        return new LabEqaResultDto
        {
            Id = e.Id, BatchId = e.BatchId, EqaTestId = e.EqaTestId, SampleCode = e.SampleCode,
            ResultValue = e.ResultValue, ResultText = e.ResultText, RunAt = e.RunAt, RunBy = e.RunBy,
            TargetValue = e.TargetValue, ZScore = e.ZScore, Evaluation = e.Evaluation,
            CorrectiveAction = e.CorrectiveAction, Notes = e.Notes
        };
    }

    public async Task DeleteEqaResultAsync(Guid id, Guid userId)
    {
        var e = await _context.LabEqaResults.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy kết quả ngoại kiểm.");
        e.IsDeleted = true; e.UpdatedAt = DateTime.Now; e.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
    }

    #endregion

    #region LIS #15 — Đơn vị gửi mẫu

    public async Task<List<LabSendingUnitDto>> GetSendingUnitsAsync(bool activeOnly = true)
    {
        var q = _context.LabSendingUnits.AsNoTracking().Where(u => !u.IsDeleted);
        if (activeOnly) q = q.Where(u => u.IsActive);
        return await q.OrderBy(u => u.Name)
            .Select(u => new LabSendingUnitDto
            {
                Id = u.Id, Code = u.Code, Name = u.Name, Address = u.Address,
                PhoneNumber = u.PhoneNumber, ContactPerson = u.ContactPerson, Email = u.Email,
                FacilityCode = u.FacilityCode, Notes = u.Notes, IsActive = u.IsActive
            })
            .ToListAsync();
    }

    public async Task<LabSendingUnitDto> SaveSendingUnitAsync(LabSendingUnitDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Code)) throw new InvalidOperationException("Thiếu mã đơn vị gửi mẫu.");
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new InvalidOperationException("Thiếu tên đơn vị gửi mẫu.");

        var now = DateTime.Now;
        LabSendingUnit e;
        if (dto.Id != Guid.Empty)
        {
            e = await _context.LabSendingUnits.FirstOrDefaultAsync(x => x.Id == dto.Id && !x.IsDeleted)
                ?? throw new InvalidOperationException("Không tìm thấy đơn vị gửi mẫu.");
            e.UpdatedAt = now; e.UpdatedBy = userId.ToString();
        }
        else
        {
            var dup = await _context.LabSendingUnits.AnyAsync(x => x.Code == dto.Code.Trim() && !x.IsDeleted);
            if (dup) throw new InvalidOperationException($"Mã \"{dto.Code}\" đã tồn tại.");
            e = new LabSendingUnit { Id = Guid.NewGuid(), CreatedAt = now, CreatedBy = userId.ToString() };
            _context.LabSendingUnits.Add(e);
        }

        e.Code = dto.Code.Trim();
        e.Name = dto.Name.Trim();
        e.Address = dto.Address;
        e.PhoneNumber = dto.PhoneNumber;
        e.ContactPerson = dto.ContactPerson;
        e.Email = dto.Email;
        e.FacilityCode = dto.FacilityCode;
        e.Notes = dto.Notes;
        e.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        dto.Id = e.Id;
        return dto;
    }

    public async Task DeleteSendingUnitAsync(Guid id, Guid userId)
    {
        var e = await _context.LabSendingUnits.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy đơn vị gửi mẫu.");
        e.IsDeleted = true; e.UpdatedAt = DateTime.Now; e.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
    }

    /// <summary>Import danh sách đơn vị gửi mẫu từ Excel (client parse → gửi mảng dòng).</summary>
    public async Task<int> ImportSendingUnitsAsync(List<LabSendingUnitDto> rows, Guid userId)
    {
        if (rows == null || rows.Count == 0) return 0;
        var now = DateTime.Now;
        var codes = rows.Where(r => !string.IsNullOrWhiteSpace(r.Code)).Select(r => r.Code.Trim()).ToList();
        var existing = await _context.LabSendingUnits
            .Where(u => codes.Contains(u.Code) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Code, u => u);

        var n = 0;
        foreach (var r in rows)
        {
            if (string.IsNullOrWhiteSpace(r.Code) || string.IsNullOrWhiteSpace(r.Name)) continue;
            var code = r.Code.Trim();
            if (existing.TryGetValue(code, out var e))
            {
                e.Name = r.Name.Trim(); e.Address = r.Address; e.PhoneNumber = r.PhoneNumber;
                e.ContactPerson = r.ContactPerson; e.Email = r.Email; e.FacilityCode = r.FacilityCode;
                e.UpdatedAt = now; e.UpdatedBy = userId.ToString();
            }
            else
            {
                _context.LabSendingUnits.Add(new LabSendingUnit
                {
                    Id = Guid.NewGuid(), Code = code, Name = r.Name.Trim(), Address = r.Address,
                    PhoneNumber = r.PhoneNumber, ContactPerson = r.ContactPerson, Email = r.Email,
                    FacilityCode = r.FacilityCode, Notes = r.Notes, IsActive = true,
                    CreatedAt = now, CreatedBy = userId.ToString()
                });
            }
            n++;
        }
        await _context.SaveChangesAsync();
        return n;
    }

    #endregion
}
