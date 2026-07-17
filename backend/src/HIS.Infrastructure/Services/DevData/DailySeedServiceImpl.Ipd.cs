using Microsoft.EntityFrameworkCore;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services.DevData;

public partial class DailySeedServiceImpl
{
    // Split out of RunDailySeedAsync (task #364 wave-6): IPD-side daily seed —
    // admissions into inpatient beds/rooms + discharges of yesterday's lingering
    // admissions. Cut verbatim, only the shared `newAdmissions`/`newDischarges`
    // counters were localized and are now returned as a tuple.
    private async Task<(int admissions, int discharges)> SeedAdmissionsAndDischargesAsync(
        DateTime today, DateTime now, Random rng,
        List<Guid> docIdsAll, List<Guid> deptIdsAll, List<SeedTodayRecord> todayRecords)
    {
        int newAdmissions = 0, newDischarges = 0;

        // ==== Admissions - for Inpatient page + dashboard currentInpatients/todayAdmissions ====
        var freeBeds = await _db.Beds
            .Where(b => b.IsActive && b.Status == 0)
            .Select(b => new { b.Id, b.RoomId })
            .Take(30).ToListAsync();
        var inpatientRoomList = await _db.Rooms
            .Where(r => r.IsActive && r.RoomType == 2)
            .Select(r => new { r.Id, r.DepartmentId })
            .ToListAsync();
        var roomDeptMap = inpatientRoomList.ToDictionary(r => r.Id, r => r.DepartmentId);

        if (await _db.Admissions.CountAsync(a => a.AdmissionDate >= today && a.AdmissionDate < today.AddDays(1)
                && _db.MedicalRecords.Any(m => m.Id == a.MedicalRecordId && m.MedicalRecordCode.StartsWith($"HS{today:yyyyMMdd}SEED"))) == 0
            && inpatientRoomList.Count > 0 && docIdsAll.Count > 0 && todayRecords.Count >= 4)
        {
            var admitTypes = new[] { 3, 1, 3, 4, 2 };
            var newAdmsList = new List<Admission>();
            for (int i = 0; i < Math.Min(8, todayRecords.Count); i++)
            {
                var r = todayRecords[i];
                // Prefer a free bed if available, otherwise pick any inpatient room (bed-less admission)
                Guid? bedId = null;
                Guid roomId;
                Guid deptId;
                if (i < freeBeds.Count)
                {
                    bedId = freeBeds[i].Id;
                    roomId = freeBeds[i].RoomId;
                }
                else
                {
                    var room = inpatientRoomList[i % inpatientRoomList.Count];
                    roomId = room.Id;
                }
                if (!roomDeptMap.TryGetValue(roomId, out deptId) || deptId == Guid.Empty)
                    deptId = r.DepartmentId ?? (deptIdsAll.Count > 0 ? deptIdsAll[0] : Guid.Empty);
                if (deptId == Guid.Empty) continue;

                newAdmsList.Add(new Admission
                {
                    Id = Guid.NewGuid(),
                    MedicalRecordId = r.Id,
                    PatientId = r.PatientId,
                    AdmissionDate = today.AddHours(rng.Next(6, 12)),
                    AdmissionType = admitTypes[i % admitTypes.Length],
                    AdmittingDoctorId = docIdsAll[i % docIdsAll.Count],
                    DepartmentId = deptId,
                    RoomId = roomId,
                    BedId = bedId,
                    Status = 0,
                    DiagnosisOnAdmission = r.InitialDiagnosis,
                    ReasonForAdmission = $"Nhập viện điều trị: {r.InitialDiagnosis}",
                    CreatedAt = now, UpdatedAt = now
                });
                newAdmissions++;
            }
            if (newAdmsList.Count > 0)
            {
                _db.Admissions.AddRange(newAdmsList);
                var mrIds = newAdmsList.Select(a => a.MedicalRecordId).ToHashSet();
                var mrsToUpdate = await _db.MedicalRecords.Where(m => mrIds.Contains(m.Id)).ToListAsync();
                foreach (var m in mrsToUpdate) m.TreatmentType = 2;
                var bedIdsUsed = newAdmsList.Where(a => a.BedId.HasValue).Select(a => a.BedId!.Value).ToHashSet();
                if (bedIdsUsed.Count > 0)
                {
                    var bedsToUpdate = await _db.Beds.Where(b => bedIdsUsed.Contains(b.Id)).ToListAsync();
                    foreach (var b in bedsToUpdate) b.Status = 1;
                }
                await _db.SaveChangesAsync();
            }
        }

        // ==== Discharges - turn yesterday's lingering admissions into today's discharges ====
        if (await _db.Discharges.CountAsync(d => d.DischargeDate >= today && d.DischargeDate < today.AddDays(1)) < 3
            && docIdsAll.Count > 0)
        {
            var candidateAdms = await _db.Admissions
                .Where(a => a.Status == 0 && a.AdmissionDate < today)
                .OrderBy(a => a.AdmissionDate)
                .Take(3)
                .ToListAsync();
            foreach (var adm in candidateAdms)
            {
                _db.Discharges.Add(new Discharge
                {
                    Id = Guid.NewGuid(),
                    AdmissionId = adm.Id,
                    DischargeDate = today.AddHours(9 + newDischarges * 2),
                    DischargeType = 1,
                    DischargeCondition = 1,
                    DischargeDiagnosis = adm.DiagnosisOnAdmission,
                    DischargeInstructions = "Uống thuốc đều, tái khám sau 7 ngày",
                    FollowUpDate = today.AddDays(7),
                    DischargedBy = docIdsAll[newDischarges % docIdsAll.Count],
                    CreatedAt = now, UpdatedAt = now
                });
                adm.Status = 2;
                if (adm.BedId.HasValue)
                {
                    var b = await _db.Beds.FirstOrDefaultAsync(x => x.Id == adm.BedId.Value);
                    if (b != null) b.Status = 0;
                }
                newDischarges++;
            }
            if (newDischarges > 0) await _db.SaveChangesAsync();
        }

        return (newAdmissions, newDischarges);
    }
}
