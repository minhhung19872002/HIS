using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.FHIR;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class FhirService
{
    // ==================== Observation ====================

    public async Task<FhirBundle> SearchObservationsAsync(string baseUrl, Guid? patientId = null, string? category = null, string? code = null, string? dateFrom = null, string? dateTo = null, int count = 20, int offset = 0)
    {
        try
        {
            var entries = new List<FhirBundleEntry>();
            var total = 0;
            var isVitalSigns = string.IsNullOrEmpty(category) || category == "vital-signs";
            var isLab = string.IsNullOrEmpty(category) || category == "laboratory";

            // Vital signs from Examinations
            if (isVitalSigns)
            {
                var vsQuery = _context.Examinations.AsNoTracking()
                    .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                    .Include(e => e.Doctor)
                    .Where(e => !e.IsDeleted && (e.Temperature != null || e.Pulse != null || e.BloodPressureSystolic != null))
                    .AsQueryable();

                if (patientId.HasValue)
                    vsQuery = vsQuery.Where(e => e.MedicalRecord.PatientId == patientId.Value);
                if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var vdf))
                    vsQuery = vsQuery.Where(e => e.CreatedAt >= vdf);
                if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var vdt))
                    vsQuery = vsQuery.Where(e => e.CreatedAt <= vdt.AddDays(1));

                var vsTotal = await vsQuery.CountAsync();
                total += vsTotal;
                var vsExams = await vsQuery.OrderByDescending(e => e.CreatedAt).Skip(offset).Take(count).ToListAsync();

                foreach (var exam in vsExams)
                {
                    var obs = MapVitalSignsObservation(exam);
                    entries.Add(new FhirBundleEntry
                    {
                        FullUrl = $"{baseUrl}/api/fhir/Observation/vs-{exam.Id}",
                        Resource = obs,
                        Search = new FhirBundleEntrySearch { Mode = "match" }
                    });
                }
            }

            // Lab results — #14b: model 1 (chỉ số con per-parameter R1 + SRD legacy KQ chuỗi); model 2 LabResults chết
            if (isLab)
            {
                var paramQuery = _context.ServiceRequestDetailParameters
                    .AsNoTracking()
                    .Include(p => p.ServiceRequestDetail!)
                        .ThenInclude(d => d.ServiceRequest)
                        .ThenInclude(sr => sr.MedicalRecord)
                        .ThenInclude(m => m.Patient)
                    .Where(p => !p.IsDeleted && p.ServiceRequestDetail!.Status != 3)
                    .AsQueryable();

                if (patientId.HasValue)
                    paramQuery = paramQuery.Where(p => p.ServiceRequestDetail!.ServiceRequest.MedicalRecord.PatientId == patientId.Value);
                if (!string.IsNullOrEmpty(code))
                    paramQuery = paramQuery.Where(p => p.ParameterCode == code);
                if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var ldf))
                    paramQuery = paramQuery.Where(p => p.CreatedAt >= ldf);
                if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var ldt))
                    paramQuery = paramQuery.Where(p => p.CreatedAt <= ldt.AddDays(1));

                var labTotal = await paramQuery.CountAsync();
                total += labTotal;
                var remainingCount = Math.Max(0, count - entries.Count);
                var labParams = await paramQuery.OrderByDescending(p => p.CreatedAt).Take(remainingCount).ToListAsync();

                foreach (var p in labParams)
                {
                    entries.Add(new FhirBundleEntry
                    {
                        FullUrl = $"{baseUrl}/api/fhir/Observation/lab-{p.Id}",
                        Resource = MapLabParamObservation(p),
                        Search = new FhirBundleEntrySearch { Mode = "match" }
                    });
                }

                // SRD legacy chỉ có KQ chuỗi (chưa có chỉ số con) — vẫn phát Observation để không mất dữ liệu cũ
                var srdQuery = _context.ServiceRequestDetails.AsNoTracking()
                    .Include(d => d.Service)
                    .Include(d => d.ServiceRequest).ThenInclude(sr => sr.MedicalRecord).ThenInclude(m => m.Patient)
                    .Where(d => !d.IsDeleted && d.Status != 3 && d.ServiceRequest.RequestType == 1
                        && d.Result != null
                        && !_context.ServiceRequestDetailParameters.Any(p => p.ServiceRequestDetailId == d.Id && !p.IsDeleted))
                    .AsQueryable();

                if (patientId.HasValue)
                    srdQuery = srdQuery.Where(d => d.ServiceRequest.MedicalRecord.PatientId == patientId.Value);
                if (!string.IsNullOrEmpty(code))
                    srdQuery = srdQuery.Where(d => d.Service.ServiceCode == code);
                if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var sdf))
                    srdQuery = srdQuery.Where(d => d.CreatedAt >= sdf);
                if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var sdt))
                    srdQuery = srdQuery.Where(d => d.CreatedAt <= sdt.AddDays(1));

                total += await srdQuery.CountAsync();
                var remainingSrd = Math.Max(0, count - entries.Count);
                var legacySrds = await srdQuery.OrderByDescending(d => d.CreatedAt).Take(remainingSrd).ToListAsync();

                foreach (var d in legacySrds)
                {
                    entries.Add(new FhirBundleEntry
                    {
                        FullUrl = $"{baseUrl}/api/fhir/Observation/lab-{d.Id}",
                        Resource = MapLabSrdObservation(d),
                        Search = new FhirBundleEntrySearch { Mode = "match" }
                    });
                }
            }

            return new FhirBundle
            {
                Type = "searchset",
                Total = total,
                Link = new List<FhirBundleLink> { new() { Relation = "self", Url = $"{baseUrl}/api/fhir/Observation?_count={count}&_offset={offset}" } },
                Entry = entries
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return EmptyBundle("searchset", baseUrl, "Observation");
        }
    }

    public async Task<FhirObservation?> GetObservationAsync(string compositeId)
    {
        try
        {
            if (compositeId.StartsWith("vs-") && Guid.TryParse(compositeId[3..], out var vsId))
            {
                var exam = await _context.Examinations.AsNoTracking()
                    .Include(e => e.MedicalRecord).ThenInclude(m => m.Patient)
                    .Include(e => e.Doctor)
                    .FirstOrDefaultAsync(e => e.Id == vsId && !e.IsDeleted);
                return exam == null ? null : MapVitalSignsObservation(exam);
            }
            else if (compositeId.StartsWith("lab-") && Guid.TryParse(compositeId[4..], out var labId))
            {
                // #14b: thử chỉ số con per-parameter (R1) trước, fallback SRD legacy KQ chuỗi
                var p = await _context.ServiceRequestDetailParameters
                    .AsNoTracking()
                    .Include(x => x.ServiceRequestDetail!)
                        .ThenInclude(d => d.ServiceRequest).ThenInclude(sr => sr.MedicalRecord).ThenInclude(m => m.Patient)
                    .FirstOrDefaultAsync(x => x.Id == labId && !x.IsDeleted);
                if (p != null) return MapLabParamObservation(p);

                var srd = await _context.ServiceRequestDetails.AsNoTracking()
                    .Include(d => d.Service)
                    .Include(d => d.ServiceRequest).ThenInclude(sr => sr.MedicalRecord).ThenInclude(m => m.Patient)
                    .FirstOrDefaultAsync(d => d.Id == labId && !d.IsDeleted && d.ServiceRequest.RequestType == 1);
                return srd == null ? null : MapLabSrdObservation(srd);
            }
            return null;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    private static FhirObservation MapVitalSignsObservation(Examination exam)
    {
        var patient = exam.MedicalRecord?.Patient;
        var components = new List<FhirObservationComponent>();

        if (exam.Temperature.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8310-5", Display = "Body temperature" } } },
                ValueQuantity = new FhirQuantity { Value = exam.Temperature, Unit = "Cel", System = "http://unitsofmeasure.org", Code = "Cel" }
            });
        if (exam.Pulse.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8867-4", Display = "Heart rate" } } },
                ValueQuantity = new FhirQuantity { Value = exam.Pulse, Unit = "/min", System = "http://unitsofmeasure.org", Code = "/min" }
            });
        if (exam.BloodPressureSystolic.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8480-6", Display = "Systolic blood pressure" } } },
                ValueQuantity = new FhirQuantity { Value = exam.BloodPressureSystolic, Unit = "mmHg", System = "http://unitsofmeasure.org", Code = "mm[Hg]" }
            });
        if (exam.BloodPressureDiastolic.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8462-4", Display = "Diastolic blood pressure" } } },
                ValueQuantity = new FhirQuantity { Value = exam.BloodPressureDiastolic, Unit = "mmHg", System = "http://unitsofmeasure.org", Code = "mm[Hg]" }
            });
        if (exam.RespiratoryRate.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "9279-1", Display = "Respiratory rate" } } },
                ValueQuantity = new FhirQuantity { Value = exam.RespiratoryRate, Unit = "/min", System = "http://unitsofmeasure.org", Code = "/min" }
            });
        if (exam.SpO2.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "2708-6", Display = "Oxygen saturation" } } },
                ValueQuantity = new FhirQuantity { Value = exam.SpO2, Unit = "%", System = "http://unitsofmeasure.org", Code = "%" }
            });
        if (exam.Height.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "8302-2", Display = "Body height" } } },
                ValueQuantity = new FhirQuantity { Value = exam.Height, Unit = "cm", System = "http://unitsofmeasure.org", Code = "cm" }
            });
        if (exam.Weight.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "29463-7", Display = "Body weight" } } },
                ValueQuantity = new FhirQuantity { Value = exam.Weight, Unit = "kg", System = "http://unitsofmeasure.org", Code = "kg" }
            });
        if (exam.BMI.HasValue)
            components.Add(new FhirObservationComponent
            {
                Code = new FhirCodeableConcept { Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "39156-5", Display = "Body mass index" } } },
                ValueQuantity = new FhirQuantity { Value = exam.BMI, Unit = "kg/m2", System = "http://unitsofmeasure.org", Code = "kg/m2" }
            });

        return new FhirObservation
        {
            Id = $"vs-{exam.Id}",
            Meta = new FhirMeta { LastUpdated = (exam.UpdatedAt ?? exam.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Status = exam.Status >= 3 ? "final" : "preliminary",
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = OBSERVATION_CATEGORY_SYSTEM, Code = "vital-signs", Display = "Vital Signs" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = "85353-1", Display = "Vital signs, weight, height, head circumference, oxygen saturation and BMI panel" } },
                Text = "Vital Signs Panel"
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            Encounter = new FhirReference { Reference = $"Encounter/exam-{exam.Id}" },
            EffectiveDateTime = (exam.StartTime ?? exam.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Performer = exam.Doctor != null ? new List<FhirReference> { new() { Reference = $"Practitioner/{exam.DoctorId}", Display = exam.Doctor.FullName } } : null,
            Component = components.Count > 0 ? components : null
        };
    }

    // #14b: Observation từ chỉ số con per-parameter (model 1 — R1 ServiceRequestDetailParameter)
    private static FhirObservation MapLabParamObservation(ServiceRequestDetailParameter p)
    {
        var detail = p.ServiceRequestDetail;
        var patient = detail?.ServiceRequest?.MedicalRecord?.Patient;

        var interpretation = new List<FhirCodeableConcept>();
        var flag = (p.Flag ?? "").ToUpperInvariant();
        if (flag is "H" or "L" or "HH" or "LL")
        {
            var interpCode = flag switch
            {
                "H" => ("H", "High"),
                "L" => ("L", "Low"),
                "HH" => ("HH", "Critical high"),
                _ => ("LL", "Critical low")
            };
            interpretation.Add(new FhirCodeableConcept
            {
                Coding = new List<FhirCoding>
                {
                    new() { System = "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", Code = interpCode.Item1, Display = interpCode.Item2 }
                }
            });
        }

        var referenceRanges = new List<FhirReferenceRange>();
        if (p.ReferenceMin.HasValue || p.ReferenceMax.HasValue || !string.IsNullOrEmpty(p.ReferenceRange))
        {
            referenceRanges.Add(new FhirReferenceRange
            {
                Low = p.ReferenceMin.HasValue ? new FhirQuantity { Value = p.ReferenceMin, Unit = p.Unit } : null,
                High = p.ReferenceMax.HasValue ? new FhirQuantity { Value = p.ReferenceMax, Unit = p.Unit } : null,
                Text = p.ReferenceRange
            });
        }

        return new FhirObservation
        {
            Id = $"lab-{p.Id}",
            Meta = new FhirMeta { LastUpdated = (p.UpdatedAt ?? p.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Status = detail?.ReviewedAt != null || detail?.Status == 2 ? "final" : "preliminary",
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = OBSERVATION_CATEGORY_SYSTEM, Code = "laboratory", Display = "Laboratory" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = p.ParameterCode, Display = p.ParameterName } },
                Text = p.ParameterName
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            EffectiveDateTime = (detail?.ResultDate ?? p.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Issued = detail?.ReviewedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ValueQuantity = p.NumericValue.HasValue ? new FhirQuantity { Value = p.NumericValue, Unit = p.Unit } : null,
            ValueString = p.NumericValue.HasValue ? null : p.Value,
            Interpretation = interpretation.Count > 0 ? interpretation : null,
            ReferenceRange = referenceRanges.Count > 0 ? referenceRanges : null
        };
    }

    // #14b: Observation từ SRD legacy (KQ chuỗi, chưa có chỉ số con)
    private static FhirObservation MapLabSrdObservation(ServiceRequestDetail d)
    {
        var patient = d.ServiceRequest?.MedicalRecord?.Patient;
        return new FhirObservation
        {
            Id = $"lab-{d.Id}",
            Meta = new FhirMeta { LastUpdated = (d.UpdatedAt ?? d.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ") },
            Status = d.ReviewedAt != null || d.Status == 2 ? "final" : "preliminary",
            Category = new List<FhirCodeableConcept>
            {
                new() { Coding = new List<FhirCoding> { new() { System = OBSERVATION_CATEGORY_SYSTEM, Code = "laboratory", Display = "Laboratory" } } }
            },
            Code = new FhirCodeableConcept
            {
                Coding = new List<FhirCoding> { new() { System = LOINC_SYSTEM, Code = d.Service?.ServiceCode, Display = d.Service?.ServiceName } },
                Text = d.Service?.ServiceName
            },
            Subject = patient != null ? new FhirReference { Reference = $"Patient/{patient.Id}", Display = patient.FullName } : null,
            EffectiveDateTime = (d.ResultDate ?? d.CreatedAt).ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Issued = d.ReviewedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ValueString = d.Result
        };
    }
}
