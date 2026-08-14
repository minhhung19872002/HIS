using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class FhirService
{
    // ==================== Patient ====================

    public async Task<FhirBundle> SearchPatientsAsync(string baseUrl, string? name = null, string? identifier = null, string? phone = null, int count = 20, int offset = 0)
    {
        try
        {
            var query = _context.Patients.AsNoTracking().Where(p => !p.IsDeleted).AsQueryable();

            if (!string.IsNullOrEmpty(name))
                query = query.Where(p => p.FullName.Contains(name));
            count = Math.Clamp(count, 1, 200);
            offset = Math.Max(0, offset);
            List<Patient> patients;
            int total;
            if (!string.IsNullOrWhiteSpace(identifier) || !string.IsNullOrWhiteSpace(phone))
            {
                // Identity/insurance/phone are randomized encrypted Patient PII.
                // Compare only after materialization/decryption; SQL equality/LIKE
                // cannot work reliably for randomized ciphertext.
                var candidates = await query.ToListAsync();
                var matched = candidates
                    .Where(p =>
                        (string.IsNullOrWhiteSpace(identifier)
                            || string.Equals(p.PatientCode, identifier, StringComparison.OrdinalIgnoreCase)
                            || string.Equals(p.IdentityNumber, identifier, StringComparison.OrdinalIgnoreCase)
                            || string.Equals(p.InsuranceNumber, identifier, StringComparison.OrdinalIgnoreCase))
                        && (string.IsNullOrWhiteSpace(phone)
                            || (p.PhoneNumber?.Contains(phone, StringComparison.OrdinalIgnoreCase) ?? false)))
                    .OrderByDescending(p => p.CreatedAt)
                    .ToList();
                total = matched.Count;
                patients = matched.Skip(offset).Take(count).ToList();
            }
            else
            {
                total = await query.CountAsync();
                patients = await query.OrderByDescending(p => p.CreatedAt)
                    .Skip(offset).Take(count).ToListAsync();
            }

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink>
                {
                    new() { Relation = "self", Url = $"{baseUrl}/api/fhir/Patient?_count={count}&_offset={offset}" }
                },
                Entry = patients.Select(p => new FhirBundleEntry
                {
                    FullUrl = $"{baseUrl}/api/fhir/Patient/{p.Id}",
                    Resource = MapPatient(p),
                    Search = new FhirBundleEntrySearch { Mode = "match" }
                }).ToList()
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "Patient");
        }
    }

    public async Task<FhirPatient?> GetPatientAsync(Guid id)
    {
        try
        {
            var patient = await _context.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            return patient == null ? null : MapPatient(patient);
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirPatient MapPatient(Patient p)
    {
        var identifiers = new List<FhirIdentifier>
        {
            new() { Use = "official", System = $"{HIS_SYSTEM}/patient-code", Value = p.PatientCode }
        };
        if (!string.IsNullOrEmpty(p.IdentityNumber))
            identifiers.Add(new FhirIdentifier { Use = "secondary", System = $"{HIS_SYSTEM}/cccd", Value = p.IdentityNumber });
        if (!string.IsNullOrEmpty(p.InsuranceNumber))
            identifiers.Add(new FhirIdentifier { Use = "secondary", System = $"{HIS_SYSTEM}/bhyt", Value = p.InsuranceNumber });

        var nameParts = (p.FullName ?? "").Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var family = nameParts.Length > 0 ? nameParts[0] : "";
        var given = nameParts.Length > 1 ? nameParts.Skip(1).ToList() : new List<string>();

        var telecoms = new List<FhirContactPoint>();
        if (!string.IsNullOrEmpty(p.PhoneNumber))
            telecoms.Add(new FhirContactPoint { System = "phone", Value = p.PhoneNumber, Use = "mobile" });
        if (!string.IsNullOrEmpty(p.Email))
            telecoms.Add(new FhirContactPoint { System = "email", Value = p.Email });

        var addresses = new List<FhirAddress>();
        if (!string.IsNullOrEmpty(p.Address) || !string.IsNullOrEmpty(p.ProvinceName))
        {
            addresses.Add(new FhirAddress
            {
                Use = "home",
                Text = BuildAddressText(p.Address, p.WardName, p.DistrictName, p.ProvinceName),
                Line = !string.IsNullOrEmpty(p.Address) ? new List<string> { p.Address } : null,
                City = p.DistrictName,
                District = p.WardName,
                State = p.ProvinceName,
                Country = "VN"
            });
        }

        var contacts = new List<FhirPatientContact>();
        if (!string.IsNullOrEmpty(p.GuardianName))
        {
            contacts.Add(new FhirPatientContact
            {
                Relationship = new List<FhirCodeableConcept>
                {
                    new() { Text = p.GuardianRelationship ?? "Guardian" }
                },
                Name = new FhirHumanName { Text = p.GuardianName },
                Telecom = !string.IsNullOrEmpty(p.GuardianPhone)
                    ? new List<FhirContactPoint> { new() { System = "phone", Value = p.GuardianPhone } }
                    : null
            });
        }

        return new FhirPatient
        {
            Id = p.Id.ToString(),
            Meta = new FhirMeta
            {
                VersionId = "1",
                LastUpdated = (p.UpdatedAt ?? p.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                Profile = new List<string> { "http://hl7.org/fhir/StructureDefinition/Patient" }
            },
            Identifier = identifiers,
            Active = !p.IsDeleted,
            Name = new List<FhirHumanName>
            {
                new() { Use = "official", Text = p.FullName, Family = family, Given = given.Count > 0 ? given : null }
            },
            Telecom = telecoms.Count > 0 ? telecoms : null,
            Gender = MapGender(p.Gender),
            BirthDate = p.DateOfBirth?.ToString("yyyy-MM-dd") ?? (p.YearOfBirth.HasValue ? $"{p.YearOfBirth}" : null),
            Address = addresses.Count > 0 ? addresses : null,
            Contact = contacts.Count > 0 ? contacts : null,
            Communication = new List<FhirPatientCommunication>
            {
                new()
                {
                    Language = new FhirCodeableConcept
                    {
                        Coding = new List<FhirCoding> { new() { System = "urn:ietf:bcp:47", Code = "vi", Display = "Vietnamese" } }
                    },
                    Preferred = true
                }
            }
        };
    }
}
