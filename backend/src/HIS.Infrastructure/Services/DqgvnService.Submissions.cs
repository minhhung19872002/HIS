using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.DQGVN;
using HIS.Application.Services;

namespace HIS.Infrastructure.Services;

// K-wave5: tach tu DqgvnService.cs — Submit Encounter (OPD/IPD) + Submit Lab Result (~220 dong).
public partial class DqgvnService
{
    // ==================== Submit Encounter (OPD/IPD) ====================

    public async Task<DqgvnSubmitResult> SubmitEncounterAsync(SubmitEncounterRequest request, string userId)
    {
        var patient = await _context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PatientId);

        if (patient == null)
            return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay benh nhan" };

        var config = GetConfig();
        Guid? sourceEntityId = null;

        var payload = new Dictionary<string, object?>
        {
            ["maCSKCB"] = config.FacilityCode,
            ["tenCSKCB"] = config.FacilityName,
            ["maBN"] = patient.PatientCode,
            ["hoTen"] = patient.FullName,
            ["ngaySinh"] = patient.DateOfBirth?.ToString("dd/MM/yyyy"),
            ["gioiTinh"] = patient.Gender,
            ["soCCCD"] = patient.IdentityNumber,
            ["soTheBHYT"] = patient.InsuranceNumber
        };

        // OPD encounter
        if (request.ExaminationId.HasValue)
        {
            sourceEntityId = request.ExaminationId.Value;
            var exam = await _context.Examinations
                .Include(e => e.Department)
                .Include(e => e.Room)
                .Include(e => e.Doctor)
                .Include(e => e.MedicalRecord)
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == request.ExaminationId.Value);

            if (exam == null)
                return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay luot kham" };

            payload["loaiKCB"] = 1; // Ngoai tru
            payload["maHoSo"] = exam.MedicalRecord?.MedicalRecordCode;
            payload["ngayVao"] = exam.StartTime?.ToString("dd/MM/yyyy HH:mm");
            payload["ngayRa"] = exam.EndTime?.ToString("dd/MM/yyyy HH:mm");
            payload["maKhoa"] = exam.Department?.DepartmentCode;
            payload["tenKhoa"] = exam.Department?.DepartmentName;
            payload["maPhong"] = exam.Room?.RoomCode;
            payload["tenPhong"] = exam.Room?.RoomName;
            payload["maBacSi"] = exam.Doctor?.Username;
            payload["tenBacSi"] = exam.Doctor?.FullName;
            payload["lyDoKham"] = exam.ChiefComplaint;
            payload["chanDoanVao"] = exam.InitialDiagnosis;
            payload["chanDoanRa"] = exam.MainDiagnosis;
            payload["maICD"] = exam.MainIcdCode;
            payload["chanDoanPhu"] = exam.SubDiagnosis;
            payload["maICDPhu"] = exam.SubIcdCodes;
            payload["huongXuTri"] = exam.ConclusionType; // 1-Cho ve, 2-Ke don, 3-Nhap vien, 4-Chuyen vien
            payload["ghiChuKetLuan"] = exam.ConclusionNote;
            payload["ngayTaiKham"] = exam.FollowUpDate?.ToString("dd/MM/yyyy");
            payload["doiTuong"] = exam.MedicalRecord?.PatientType; // 1-BHYT, 2-Vien phi, 3-Dich vu
            payload["tuyenKCB"] = exam.MedicalRecord?.InsuranceRightRoute;

            // Vital signs
            payload["nhietDo"] = exam.Temperature;
            payload["mach"] = exam.Pulse;
            payload["huyetApTamThu"] = exam.BloodPressureSystolic;
            payload["huyetApTamTruong"] = exam.BloodPressureDiastolic;
            payload["nhipTho"] = exam.RespiratoryRate;
            payload["chieuCao"] = exam.Height;
            payload["canNang"] = exam.Weight;
            payload["spO2"] = exam.SpO2;
        }

        // IPD encounter
        if (request.AdmissionId.HasValue)
        {
            sourceEntityId = request.AdmissionId.Value;
            var admission = await _context.Admissions
                .Include(a => a.Department)
                .Include(a => a.MedicalRecord)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == request.AdmissionId.Value);

            if (admission == null)
                return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay dot nhap vien" };

            payload["loaiKCB"] = 2; // Noi tru
            payload["maHoSo"] = admission.MedicalRecord?.MedicalRecordCode;
            payload["ngayVao"] = admission.AdmissionDate.ToString("dd/MM/yyyy HH:mm");
            payload["maKhoa"] = admission.Department?.DepartmentCode;
            payload["tenKhoa"] = admission.Department?.DepartmentName;
            payload["chanDoanVao"] = admission.MedicalRecord?.InitialDiagnosis;
            payload["chanDoanRa"] = admission.MedicalRecord?.MainDiagnosis;
            payload["maICD"] = admission.MedicalRecord?.MainIcdCode;
            payload["doiTuong"] = admission.MedicalRecord?.PatientType;
            payload["tuyenKCB"] = admission.MedicalRecord?.InsuranceRightRoute;

            // Check for discharge
            var discharge = await _context.Discharges
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.AdmissionId == request.AdmissionId.Value);

            if (discharge != null)
            {
                payload["ngayRa"] = discharge.DischargeDate.ToString("dd/MM/yyyy HH:mm");
                payload["ketQuaDieuTri"] = admission.MedicalRecord?.TreatmentResult;
                payload["tinhTrangRaVien"] = admission.MedicalRecord?.DischargeType;
            }
        }

        var submission = await CreateSubmissionAsync(
            DqgvnSubmissionType.EncounterReport,
            request.PatientId,
            sourceEntityId,
            payload,
            userId);

        return await SendSubmissionAsync(submission, config);
    }

    // ==================== Submit Lab Result ====================

    public async Task<DqgvnSubmitResult> SubmitLabResultAsync(SubmitLabResultRequest request, string userId)
    {
        // #14b: model 1 — ServiceRequest (RequestType=1) + SRD + per-parameter R1; model 2 LabRequests/LabResults chỉ seed ghi
        var labRequest = await _context.ServiceRequests
            .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.LabRequestId && r.RequestType == 1 && !r.IsDeleted);

        if (labRequest == null)
            return new DqgvnSubmitResult { Success = false, ErrorMessage = "Khong tim thay phieu xet nghiem" };

        var config = GetConfig();

        // Chỉ số con per-parameter (R1) — gom 1 query, group in-memory
        var detailIds = labRequest.Details.Select(d => d.Id).ToList();
        var paramRows = await _context.ServiceRequestDetailParameters
            .Where(p => detailIds.Contains(p.ServiceRequestDetailId) && !p.IsDeleted)
            .OrderBy(p => p.SequenceNumber)
            .AsNoTracking()
            .ToListAsync();
        var paramsByDetail = paramRows.GroupBy(p => p.ServiceRequestDetailId).ToDictionary(g => g.Key, g => g.ToList());

        // Ngày có KQ = mốc duyệt (ReviewedAt) muộn nhất, fallback ResultDate
        var completedDate = labRequest.Details
            .Select(d => d.ReviewedAt ?? d.ResultDate)
            .Where(d => d.HasValue)
            .OrderByDescending(d => d)
            .FirstOrDefault();

        var danhSachKetQua = new List<Dictionary<string, object?>>();
        foreach (var d in labRequest.Details)
        {
            if (paramsByDetail.TryGetValue(d.Id, out var ps))
            {
                foreach (var p in ps)
                    danhSachKetQua.Add(new Dictionary<string, object?>
                    {
                        ["maXetNghiem"] = p.ParameterCode,
                        ["tenXetNghiem"] = p.ParameterName,
                        ["ketQua"] = p.Value,
                        ["donVi"] = p.Unit,
                        ["giaTriThamChieu"] = p.ReferenceRange,
                        ["batThuong"] = LabFlagEvaluator.IsAbnormal(p.Flag),
                        ["ghiChu"] = null
                    });
            }
            else if (d.Result != null || d.ResultDate != null)
            {
                // SRD legacy chưa có chỉ số con → 1 dòng theo dịch vụ (KQ chuỗi)
                danhSachKetQua.Add(new Dictionary<string, object?>
                {
                    ["maXetNghiem"] = d.Service.ServiceCode,
                    ["tenXetNghiem"] = d.Service.ServiceName,
                    ["ketQua"] = d.Result,
                    ["donVi"] = null,
                    ["giaTriThamChieu"] = null,
                    ["batThuong"] = false,
                    ["ghiChu"] = d.Note
                });
            }
        }

        var payload = new Dictionary<string, object?>
        {
            ["maCSKCB"] = config.FacilityCode,
            ["maBN"] = labRequest.MedicalRecord?.Patient?.PatientCode,
            ["hoTen"] = labRequest.MedicalRecord?.Patient?.FullName,
            ["maPhieuXN"] = labRequest.RequestCode,
            ["ngayChiDinh"] = labRequest.RequestDate.ToString("dd/MM/yyyy HH:mm"),
            ["ngayCoKetQua"] = completedDate?.ToString("dd/MM/yyyy HH:mm"),
            ["trangThai"] = labRequest.Status, // model 1: 0=ChoTT, 1=DaTT, 2=DangTH, 3=CoKQ, 4=Huy
            ["danhSachKetQua"] = danhSachKetQua
        };

        var submission = await CreateSubmissionAsync(
            DqgvnSubmissionType.LabResult,
            labRequest.MedicalRecord?.PatientId ?? Guid.Empty,
            request.LabRequestId,
            payload,
            userId);

        return await SendSubmissionAsync(submission, config);
    }
}
