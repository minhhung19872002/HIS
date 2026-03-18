using System.Text;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.SpecialtyEmr;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class SpecialtyEmrService : ISpecialtyEmrService
{
    private readonly HISDbContext _context;

    public SpecialtyEmrService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<SpecialtyEmrPagedResult> SearchAsync(SpecialtyEmrSearchDto dto)
    {
        var query = _context.SpecialtyEmrs
            .Where(e => !e.IsDeleted && e.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim().ToLower();
            query = query.Where(e =>
                e.PatientCode.ToLower().Contains(kw) ||
                e.PatientName.ToLower().Contains(kw) ||
                (e.DoctorName != null && e.DoctorName.ToLower().Contains(kw)) ||
                (e.IcdCode != null && e.IcdCode.ToLower().Contains(kw)) ||
                (e.IcdName != null && e.IcdName.ToLower().Contains(kw))
            );
        }

        if (!string.IsNullOrWhiteSpace(dto.SpecialtyType))
        {
            query = query.Where(e => e.SpecialtyType == dto.SpecialtyType);
        }

        if (dto.FromDate.HasValue)
        {
            query = query.Where(e => e.RecordDate >= dto.FromDate.Value.Date);
        }

        if (dto.ToDate.HasValue)
        {
            query = query.Where(e => e.RecordDate < dto.ToDate.Value.Date.AddDays(1));
        }

        var totalCount = await query.CountAsync();

        var pageSize = dto.PageSize > 0 ? dto.PageSize : 20;
        var pageIndex = dto.PageIndex > 0 ? dto.PageIndex : 0;

        var items = await query
            .OrderByDescending(e => e.RecordDate)
            .ThenByDescending(e => e.CreatedAt)
            .Skip(pageIndex * pageSize)
            .Take(pageSize)
            .Select(e => new SpecialtyEmrDto
            {
                Id = e.Id,
                PatientId = e.PatientId,
                PatientCode = e.PatientCode,
                PatientName = e.PatientName,
                SpecialtyType = e.SpecialtyType,
                SpecialtyTypeName = MapSpecialtyTypeName(e.SpecialtyType),
                RecordDate = e.RecordDate,
                DoctorName = e.DoctorName,
                DepartmentName = e.DepartmentName,
                IcdCode = e.IcdCode,
                IcdName = e.IcdName,
                FieldData = e.FieldData,
                Status = e.Status,
                StatusName = MapStatusName(e.Status),
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();

        return new SpecialtyEmrPagedResult
        {
            Items = items,
            TotalCount = totalCount
        };
    }

    public async Task<SpecialtyEmrDto?> GetByIdAsync(Guid id)
    {
        var entity = await _context.SpecialtyEmrs
            .Where(e => !e.IsDeleted && e.Id == id)
            .FirstOrDefaultAsync();

        if (entity == null) return null;

        return new SpecialtyEmrDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientCode = entity.PatientCode,
            PatientName = entity.PatientName,
            SpecialtyType = entity.SpecialtyType,
            SpecialtyTypeName = MapSpecialtyTypeName(entity.SpecialtyType),
            RecordDate = entity.RecordDate,
            DoctorName = entity.DoctorName,
            DepartmentName = entity.DepartmentName,
            IcdCode = entity.IcdCode,
            IcdName = entity.IcdName,
            FieldData = entity.FieldData,
            Status = entity.Status,
            StatusName = MapStatusName(entity.Status),
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<SpecialtyEmrDto> SaveAsync(SpecialtyEmrSaveDto dto)
    {
        SpecialtyEmr entity;

        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            // Update existing
            entity = await _context.SpecialtyEmrs
                .FirstOrDefaultAsync(e => e.Id == dto.Id.Value && !e.IsDeleted)
                ?? throw new InvalidOperationException($"SpecialtyEmr with Id {dto.Id.Value} not found.");

            entity.PatientId = dto.PatientId;
            entity.PatientCode = dto.PatientCode;
            entity.PatientName = dto.PatientName;
            entity.SpecialtyType = dto.SpecialtyType;
            entity.RecordDate = dto.RecordDate;
            entity.DoctorName = dto.DoctorName;
            entity.DepartmentName = dto.DepartmentName;
            entity.IcdCode = dto.IcdCode;
            entity.IcdName = dto.IcdName;
            entity.FieldData = dto.FieldData;
            entity.Status = dto.Status;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            // Create new
            entity = new SpecialtyEmr
            {
                Id = Guid.NewGuid(),
                PatientId = dto.PatientId,
                PatientCode = dto.PatientCode,
                PatientName = dto.PatientName,
                SpecialtyType = dto.SpecialtyType,
                RecordDate = dto.RecordDate,
                DoctorName = dto.DoctorName,
                DepartmentName = dto.DepartmentName,
                IcdCode = dto.IcdCode,
                IcdName = dto.IcdName,
                FieldData = dto.FieldData,
                Status = dto.Status,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.SpecialtyEmrs.Add(entity);
        }

        await _context.SaveChangesAsync();

        return new SpecialtyEmrDto
        {
            Id = entity.Id,
            PatientId = entity.PatientId,
            PatientCode = entity.PatientCode,
            PatientName = entity.PatientName,
            SpecialtyType = entity.SpecialtyType,
            SpecialtyTypeName = MapSpecialtyTypeName(entity.SpecialtyType),
            RecordDate = entity.RecordDate,
            DoctorName = entity.DoctorName,
            DepartmentName = entity.DepartmentName,
            IcdCode = entity.IcdCode,
            IcdName = entity.IcdName,
            FieldData = entity.FieldData,
            Status = entity.Status,
            StatusName = MapStatusName(entity.Status),
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _context.SpecialtyEmrs
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (entity == null) return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<byte[]> ExportPdfAsync(Guid id)
    {
        var entity = await _context.SpecialtyEmrs
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (entity == null)
            return Encoding.UTF8.GetBytes("<html><body><p>Không tìm thấy bệnh án.</p></body></html>");

        var specialtyTypeName = MapSpecialtyTypeName(entity.SpecialtyType);
        var statusName = MapStatusName(entity.Status);

        var html = $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
<meta charset=""UTF-8"">
<title>Bệnh án chuyên khoa - {specialtyTypeName}</title>
<style>
  body {{ font-family: 'Times New Roman', serif; font-size: 14px; margin: 20px; }}
  h1 {{ text-align: center; font-size: 18px; text-transform: uppercase; }}
  h2 {{ font-size: 16px; margin-top: 16px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
  td {{ padding: 4px 8px; vertical-align: top; }}
  .label {{ font-weight: bold; width: 180px; }}
  .header {{ text-align: center; margin-bottom: 20px; }}
  .footer {{ margin-top: 40px; text-align: right; }}
  @media print {{ body {{ margin: 0; }} }}
</style>
</head>
<body>
<div class=""header"">
  <p>BỘ Y TẾ</p>
  <h1>BỆNH ÁN CHUYÊN KHOA {specialtyTypeName.ToUpper()}</h1>
</div>

<table>
  <tr><td class=""label"">Mã bệnh nhân:</td><td>{entity.PatientCode}</td></tr>
  <tr><td class=""label"">Họ và tên:</td><td>{entity.PatientName}</td></tr>
  <tr><td class=""label"">Chuyên khoa:</td><td>{specialtyTypeName}</td></tr>
  <tr><td class=""label"">Ngày ghi nhận:</td><td>{entity.RecordDate:dd/MM/yyyy}</td></tr>
  <tr><td class=""label"">Bác sĩ:</td><td>{entity.DoctorName ?? ""}</td></tr>
  <tr><td class=""label"">Khoa:</td><td>{entity.DepartmentName ?? ""}</td></tr>
  <tr><td class=""label"">Mã ICD:</td><td>{entity.IcdCode ?? ""} - {entity.IcdName ?? ""}</td></tr>
  <tr><td class=""label"">Trạng thái:</td><td>{statusName}</td></tr>
</table>

<h2>Dữ liệu chuyên khoa</h2>
<pre style=""white-space: pre-wrap; background: #f5f5f5; padding: 10px; border: 1px solid #ddd;"">{entity.FieldData}</pre>

<div class=""footer"">
  <p>Ngày in: {DateTime.Now:dd/MM/yyyy HH:mm}</p>
  <p style=""margin-top: 40px;"">Bác sĩ điều trị</p>
  <p><i>(Ký, ghi rõ họ tên)</i></p>
</div>
</body>
</html>";

        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> ExportXmlAsync(Guid id)
    {
        var entity = await _context.SpecialtyEmrs
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

        if (entity == null)
        {
            var emptyXml = new XDocument(
                new XDeclaration("1.0", "UTF-8", null),
                new XElement("Error", "Không tìm thấy bệnh án.")
            );
            return Encoding.UTF8.GetBytes(emptyXml.ToString());
        }

        var doc = new XDocument(
            new XDeclaration("1.0", "UTF-8", null),
            new XElement("SpecialtyEmr",
                new XElement("Id", entity.Id),
                new XElement("PatientId", entity.PatientId),
                new XElement("PatientCode", entity.PatientCode),
                new XElement("PatientName", entity.PatientName),
                new XElement("SpecialtyType", entity.SpecialtyType),
                new XElement("SpecialtyTypeName", MapSpecialtyTypeName(entity.SpecialtyType)),
                new XElement("RecordDate", entity.RecordDate.ToString("yyyy-MM-ddTHH:mm:ss")),
                new XElement("DoctorName", entity.DoctorName ?? ""),
                new XElement("DepartmentName", entity.DepartmentName ?? ""),
                new XElement("IcdCode", entity.IcdCode ?? ""),
                new XElement("IcdName", entity.IcdName ?? ""),
                new XElement("FieldData", new XCData(entity.FieldData)),
                new XElement("Status", entity.Status),
                new XElement("StatusName", MapStatusName(entity.Status)),
                new XElement("CreatedAt", entity.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"))
            )
        );

        return Encoding.UTF8.GetBytes(doc.ToString());
    }

    private static string MapSpecialtyTypeName(string specialtyType) => specialtyType switch
    {
        "surgical" => "Ngoại khoa",
        "internal" => "Nội khoa",
        "obstetrics" => "Sản khoa",
        "pediatrics" => "Nhi khoa",
        "dental" => "Răng Hàm Mặt",
        "ent" => "Tai Mũi Họng",
        "traditional" => "Y học cổ truyền (nội trú)",
        "traditional_outpatient" => "Y học cổ truyền (ngoại trú)",
        "hematology" => "Huyết học và Truyền máu",
        "oncology" => "Ung bướu",
        "burns" => "Bỏng",
        "psychiatry" => "Tâm thần",
        "dermatology" => "Da liễu",
        "ophthalmology" => "Mắt",
        "infectious" => "Truyền nhiễm",
        // NangCap9: 10 loại bổ sung
        "neonatal" => "Sơ sinh",
        "gynecology" => "Phụ khoa",
        "outpatient" => "Ngoại trú",
        "outpatient_dental" => "Ngoại trú Răng Hàm Mặt",
        "outpatient_ent" => "Ngoại trú Tai Mũi Họng",
        "ophthalmology_retina" => "Đáy mắt",
        "ophthalmology_strabismus" => "Mắt lác",
        "ophthalmology_pediatric" => "Mắt trẻ em",
        "ophthalmology_trauma" => "Chấn thương mắt",
        "ophthalmology_anterior" => "Mắt - Bán phần trước",
        "ophthalmology_glaucoma" => "Mắt Glocom",
        "nursing_rehab" => "Điều dưỡng và Phục hồi chức năng",
        _ => specialtyType
    };

    private static string MapStatusName(int status) => status switch
    {
        0 => "Nháp",
        1 => "Hoàn thành",
        2 => "Đã ký",
        _ => "Không xác định"
    };
}
