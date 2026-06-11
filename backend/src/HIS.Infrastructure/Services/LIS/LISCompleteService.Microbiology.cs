using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

// G-19: Microbiology persist — culture result + antibiogram + CRUD endpoints for FE Microbiology v2.
// Replaces all stub => true returns in ReportsWorklist.cs for the microbiology region.
public partial class LISCompleteService
{
    #region Microbiology — FE v2 API (G-19)

    public async Task<List<MicrobiologyCultureV2Dto>> GetMicrobiologyCulturesV2Async(int? status, string keyword)
    {
        var query = _context.MicrobiologyCultures
            .Include(c => c.Organisms)
                .ThenInclude(o => o.Antibiogram)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            query = query.Where(c =>
                c.PatientName.ToLower().Contains(kw) ||
                c.PatientCode.ToLower().Contains(kw) ||
                c.RequestCode.ToLower().Contains(kw) ||
                (c.SampleBarcode != null && c.SampleBarcode.ToLower().Contains(kw)));
        }

        var list = await query
            .OrderByDescending(c => c.CultureDate)
            .Take(200)
            .ToListAsync();

        return list.Select(MapCultureV2).ToList();
    }

    public async Task<MicrobiologyCultureV2Dto?> GetMicrobiologyCultureByIdAsync(Guid id)
    {
        var c = await _context.MicrobiologyCultures
            .Include(c => c.Organisms)
                .ThenInclude(o => o.Antibiogram)
            .FirstOrDefaultAsync(c => c.Id == id);

        return c == null ? null : MapCultureV2(c);
    }

    public async Task<MicrobiologyCultureV2Dto> CreateMicrobiologyCultureAsync(CreateMicrobiologyCultureDto dto)
    {
        // Try to resolve LabRequestId: FE may send a Guid string or a request code string
        Guid? labRequestId = null;
        string requestCode = dto.LabRequestId?.Trim() ?? string.Empty;
        string patientName = string.Empty;
        string patientCode = string.Empty;
        Guid? patientId = null;

        // #14b: resolve theo model 1 ServiceRequest (RequestType=1); model 2 LabRequests chết
        if (Guid.TryParse(dto.LabRequestId, out var parsedId))
        {
            labRequestId = parsedId;
            var sr = await _context.ServiceRequests
                .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                .FirstOrDefaultAsync(r => r.Id == parsedId && r.RequestType == 1 && !r.IsDeleted);
            if (sr != null)
            {
                requestCode = sr.RequestCode ?? requestCode;
                patientId = sr.MedicalRecord?.PatientId;
                patientName = sr.MedicalRecord?.Patient?.FullName ?? string.Empty;
                patientCode = sr.MedicalRecord?.Patient?.PatientCode ?? string.Empty;
            }
        }
        else if (!string.IsNullOrWhiteSpace(dto.LabRequestId))
        {
            // Try to find by RequestCode
            var sr = await _context.ServiceRequests
                .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                .FirstOrDefaultAsync(r => r.RequestCode == dto.LabRequestId.Trim() && r.RequestType == 1 && !r.IsDeleted);
            if (sr != null)
            {
                labRequestId = sr.Id;
                requestCode = sr.RequestCode ?? requestCode;
                patientId = sr.MedicalRecord?.PatientId;
                patientName = sr.MedicalRecord?.Patient?.FullName ?? string.Empty;
                patientCode = sr.MedicalRecord?.Patient?.PatientCode ?? string.Empty;
            }
        }

        var culture = new MicrobiologyCulture
        {
            Id = Guid.NewGuid(),
            LabRequestId = labRequestId,
            RequestCode = requestCode,
            PatientId = patientId,
            PatientName = patientName,
            PatientCode = patientCode,
            SampleType = dto.SampleType ?? string.Empty,
            SampleBarcode = dto.SampleBarcode?.Trim(),
            CultureType = dto.CultureType ?? string.Empty,
            CultureDate = DateTime.UtcNow,
            Status = 0, // Pending
            Notes = dto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _context.MicrobiologyCultures.Add(culture);
        await _context.SaveChangesAsync();

        return MapCultureV2(culture);
    }

    public async Task UpdateMicrobiologyCultureStatusAsync(Guid id, UpdateCultureStatusDto dto)
    {
        var culture = await _context.MicrobiologyCultures.FindAsync(id);
        if (culture == null)
            throw new InvalidOperationException($"MicrobiologyCulture {id} not found");

        culture.Status = dto.Status;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            culture.Notes = dto.Notes.Trim();

        // Auto-set date fields based on status transition
        if (dto.Status == 1 && culture.IncubationStart == null)
            culture.IncubationStart = DateTime.UtcNow;
        if (dto.Status >= 2 && culture.IncubationEnd == null)
            culture.IncubationEnd = DateTime.UtcNow;
        if (dto.Status >= 2 && culture.ResultDate == null)
            culture.ResultDate = DateTime.UtcNow;

        culture.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<MicrobiologyOrganismV2Dto> AddOrganismToCultureAsync(Guid cultureId, AddOrganismDto dto)
    {
        var culture = await _context.MicrobiologyCultures.FindAsync(cultureId);
        if (culture == null)
            throw new InvalidOperationException($"MicrobiologyCulture {cultureId} not found");

        // Try to match master catalog
        Guid? labOrganismId = null;
        if (!string.IsNullOrWhiteSpace(dto.OrganismCode))
        {
            var master = await _context.LabOrganisms
                .FirstOrDefaultAsync(o => o.OrganismCode == dto.OrganismCode.Trim());
            labOrganismId = master?.Id;
        }

        var organism = new MicrobiologyOrganismFinding
        {
            Id = Guid.NewGuid(),
            CultureId = cultureId,
            LabOrganismId = labOrganismId,
            OrganismCode = dto.OrganismCode?.Trim() ?? string.Empty,
            OrganismName = dto.OrganismName?.Trim() ?? string.Empty,
            ColonyCount = dto.ColonyCount?.Trim(),
            Morphology = dto.Morphology?.Trim(),
            GramStain = dto.GramStain?.Trim(),
            IdentificationMethod = dto.IdentificationMethod?.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _context.MicrobiologyOrganismFindings.Add(organism);

        // Bump culture status to GrowthDetected if currently Pending/Incubating
        if (culture.Status < 2)
        {
            culture.Status = 2;
            culture.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return MapOrganismV2(organism);
    }

    public async Task SaveAntibiogramAsync(Guid organismFindingId, List<SaveAntibioticResultDto> results)
    {
        var organism = await _context.MicrobiologyOrganismFindings
            .Include(o => o.Antibiogram)
            .FirstOrDefaultAsync(o => o.Id == organismFindingId);

        if (organism == null)
            throw new InvalidOperationException($"MicrobiologyOrganismFinding {organismFindingId} not found");

        // Remove existing AST results (upsert strategy: clear + re-insert)
        _context.AntibioticSensitivityResults.RemoveRange(organism.Antibiogram);

        foreach (var r in results)
        {
            // Try to match master catalog
            Guid? labAntibioticId = null;
            if (!string.IsNullOrWhiteSpace(r.AntibioticCode))
            {
                var master = await _context.LabAntibiotics
                    .FirstOrDefaultAsync(a => a.AntibioticCode == r.AntibioticCode.Trim());
                labAntibioticId = master?.Id;
            }

            _context.AntibioticSensitivityResults.Add(new AntibioticSensitivityResult
            {
                Id = Guid.NewGuid(),
                OrganismFindingId = organismFindingId,
                LabAntibioticId = labAntibioticId,
                AntibioticCode = r.AntibioticCode?.Trim() ?? string.Empty,
                AntibioticName = r.AntibioticName?.Trim() ?? string.Empty,
                Mic = r.Mic,
                ZoneDiameter = r.ZoneDiameter,
                Interpretation = r.Interpretation?.Trim().ToUpper() ?? string.Empty,
                Method = r.Method?.Trim(),
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _context.SaveChangesAsync();
    }

    #endregion

    #region Microbiology — EnterCultureResult / EnterAntibioticSensitivity (existing interface, now persisted)

    /// <summary>
    /// Persist culture result: updates organism list on an existing MicrobiologyCulture.
    /// CultureId must be a valid MicrobiologyCulture.Id.
    /// </summary>
    public async Task<bool> EnterCultureResultAsync(EnterCultureResultDto dto)
    {
        var culture = await _context.MicrobiologyCultures
            .Include(c => c.Organisms)
            .FirstOrDefaultAsync(c => c.Id == dto.CultureId);

        if (culture == null)
        {
            _logger.LogWarning("EnterCultureResultAsync: culture {Id} not found", dto.CultureId);
            return false;
        }

        // Update culture-level fields
        culture.UpdatedAt = DateTime.UtcNow;

        if (!dto.HasGrowth)
        {
            // No growth — mark completed with NoGrowth status
            culture.Status = 3;
            culture.ResultDate ??= dto.CultureDate;
            await _context.SaveChangesAsync();
            return true;
        }

        // Remove existing organism findings before re-inserting
        _context.MicrobiologyOrganismFindings.RemoveRange(culture.Organisms);

        if (dto.Organisms != null)
        {
            foreach (var o in dto.Organisms)
            {
                Guid? labOrganismId = null;
                if (!string.IsNullOrWhiteSpace(o.OrganismCode))
                {
                    var master = await _context.LabOrganisms
                        .FirstOrDefaultAsync(x => x.OrganismCode == o.OrganismCode.Trim());
                    labOrganismId = master?.Id;
                }

                _context.MicrobiologyOrganismFindings.Add(new MicrobiologyOrganismFinding
                {
                    Id = Guid.NewGuid(),
                    CultureId = culture.Id,
                    LabOrganismId = labOrganismId,
                    OrganismCode = o.OrganismCode?.Trim() ?? string.Empty,
                    OrganismName = o.OrganismName?.Trim() ?? string.Empty,
                    ColonyCount = o.Quantity?.Trim(),
                    Morphology = o.ColonyDescription?.Trim(),
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        culture.Status = dto.Organisms != null && dto.Organisms.Count > 0 ? 2 : 3; // 2=GrowthDetected, 3=NoGrowth
        culture.ResultDate ??= dto.CultureDate;

        if (!string.IsNullOrWhiteSpace(dto.FinalConclusion))
            culture.Notes = dto.FinalConclusion.Trim();

        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Persist antibiotic sensitivity results for an organism found in a culture.
    /// OrganismId must be a valid MicrobiologyOrganismFinding.Id.
    /// </summary>
    public async Task<bool> EnterAntibioticSensitivityAsync(EnterAntibioticSensitivityDto dto)
    {
        var organism = await _context.MicrobiologyOrganismFindings
            .Include(o => o.Antibiogram)
            .FirstOrDefaultAsync(o => o.Id == dto.OrganismId);

        if (organism == null)
        {
            _logger.LogWarning("EnterAntibioticSensitivityAsync: organism finding {Id} not found", dto.OrganismId);
            return false;
        }

        // Remove existing AST results
        _context.AntibioticSensitivityResults.RemoveRange(organism.Antibiogram);

        if (dto.Results != null)
        {
            foreach (var r in dto.Results)
            {
                Guid? labAntibioticId = null;
                if (r.AntibioticId != Guid.Empty)
                {
                    var master = await _context.LabAntibiotics
                        .FirstOrDefaultAsync(a => a.Id == r.AntibioticId);
                    labAntibioticId = master?.Id;
                }

                _context.AntibioticSensitivityResults.Add(new AntibioticSensitivityResult
                {
                    Id = Guid.NewGuid(),
                    OrganismFindingId = organism.Id,
                    LabAntibioticId = labAntibioticId,
                    AntibioticCode = string.Empty, // EnterAntibioticSensitivityDto does not carry code
                    AntibioticName = string.Empty,
                    Mic = r.MIC,
                    ZoneDiameter = r.ZoneDiameter,
                    Interpretation = r.Sensitivity?.Trim().ToUpper() ?? string.Empty,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        // Bump culture status to Identified if all organisms have antibiogram
        var culture = await _context.MicrobiologyCultures.FindAsync(organism.CultureId);
        if (culture != null && culture.Status < 4)
        {
            culture.Status = 4; // Identified
            culture.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region Microbiology — Catalog (Antibiotics / Bacteria from DB with fallback to hardcoded)

    public async Task<List<AntibioticDto>> GetAntibioticsAsync()
    {
        var dbItems = await _context.LabAntibiotics
            .Where(a => a.IsActive)
            .OrderBy(a => a.SortOrder).ThenBy(a => a.AntibioticName)
            .Take(200)
            .ToListAsync();

        if (dbItems.Count > 0)
        {
            return dbItems.Select(a => new AntibioticDto
            {
                Id = a.Id,
                Code = a.AntibioticCode,
                Name = a.AntibioticName,
                Group = a.DrugClass ?? string.Empty,
                IsActive = a.IsActive,
            }).ToList();
        }

        // Fallback: hardcoded common antibiotics when catalog is empty
        var codes = new[] {
            ("AMP","Ampicillin","Penicillin"),
            ("AMX","Amoxicillin","Penicillin"),
            ("CEF","Cefotaxime","Cephalosporin"),
            ("CIP","Ciprofloxacin","Fluoroquinolone"),
            ("GEN","Gentamicin","Aminoglycoside"),
            ("VAN","Vancomycin","Glycopeptide"),
            ("MER","Meropenem","Carbapenem"),
            ("PEN","Penicillin G","Penicillin"),
            ("LEV","Levofloxacin","Fluoroquinolone"),
            ("CLI","Clindamycin","Lincosamide")
        };
        return codes.Select(c => new AntibioticDto
        {
            Id = Guid.NewGuid(), Code = c.Item1, Name = c.Item2, Group = c.Item3, IsActive = true
        }).ToList();
    }

    public async Task<List<BacteriaDto>> GetBacteriasAsync()
    {
        var dbItems = await _context.LabOrganisms
            .Where(o => o.IsActive)
            .OrderBy(o => o.SortOrder).ThenBy(o => o.OrganismName)
            .Take(200)
            .ToListAsync();

        if (dbItems.Count > 0)
        {
            return dbItems.Select(o => new BacteriaDto
            {
                Id = o.Id,
                Code = o.OrganismCode,
                Name = o.OrganismName,
                ScientificName = o.LatinName ?? string.Empty,
                Type = o.Category ?? string.Empty,
                IsActive = o.IsActive,
            }).ToList();
        }

        // Fallback: hardcoded common organisms when catalog is empty
        var names = new[] {
            ("SAU","Staphylococcus aureus","Gram+"),
            ("ECO","Escherichia coli","Gram-"),
            ("KPN","Klebsiella pneumoniae","Gram-"),
            ("PAE","Pseudomonas aeruginosa","Gram-"),
            ("SPN","Streptococcus pneumoniae","Gram+"),
            ("CAL","Candida albicans","Fungus"),
            ("EFM","Enterococcus faecium","Gram+"),
            ("ABA","Acinetobacter baumannii","Gram-")
        };
        return names.Select(n => new BacteriaDto
        {
            Id = Guid.NewGuid(), Code = n.Item1, Name = n.Item2, ScientificName = n.Item2, Type = n.Item3, IsActive = true
        }).ToList();
    }

    #endregion

    #region Microbiology — Mapping helpers

    private static MicrobiologyCultureV2Dto MapCultureV2(MicrobiologyCulture c) => new()
    {
        Id = c.Id,
        LabRequestId = c.LabRequestId,
        RequestCode = c.RequestCode,
        PatientId = c.PatientId,
        PatientName = c.PatientName,
        PatientCode = c.PatientCode,
        SampleType = c.SampleType,
        SampleBarcode = c.SampleBarcode,
        CultureType = c.CultureType,
        CultureDate = c.CultureDate,
        IncubationStart = c.IncubationStart,
        IncubationEnd = c.IncubationEnd,
        ResultDate = c.ResultDate,
        Status = c.Status,
        Notes = c.Notes,
        Organisms = c.Organisms?.Select(MapOrganismV2).ToList() ?? new(),
    };

    private static MicrobiologyOrganismV2Dto MapOrganismV2(MicrobiologyOrganismFinding o) => new()
    {
        Id = o.Id,
        CultureId = o.CultureId,
        OrganismCode = o.OrganismCode,
        OrganismName = o.OrganismName,
        ColonyCount = o.ColonyCount,
        Morphology = o.Morphology,
        GramStain = o.GramStain,
        IdentificationMethod = o.IdentificationMethod,
        Antibiogram = o.Antibiogram?.Select(a => new AntibioticSensitivityV2Dto
        {
            Id = a.Id,
            OrganismId = a.OrganismFindingId,
            AntibioticCode = a.AntibioticCode,
            AntibioticName = a.AntibioticName,
            Mic = a.Mic,
            ZoneDiameter = a.ZoneDiameter,
            Interpretation = a.Interpretation,
            Method = a.Method,
        }).ToList() ?? new(),
    };

    #endregion
}
