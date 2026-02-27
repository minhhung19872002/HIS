using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.DataInheritance;

namespace HIS.API.Controllers
{
    /// <summary>
    /// API Controller for cross-module data inheritance.
    /// Provides context data that flows seamlessly between HIS modules:
    /// Reception → OPD → Prescription → Billing → Pharmacy → Inpatient → Discharge
    /// </summary>
    [ApiController]
    [Route("api/data-inheritance")]
    [Authorize]
    public class DataInheritanceController : ControllerBase
    {
        private readonly IDataInheritanceService _service;

        public DataInheritanceController(IDataInheritanceService service)
        {
            _service = service;
        }

        /// <summary>
        /// Get OPD context for examination: patient demographics, insurance, queue ticket, registration data.
        /// Used when doctor selects a patient in OPD (data inherited from Reception).
        /// </summary>
        [HttpGet("opd-context/{examinationId}")]
        public async Task<ActionResult<OpdContextDto>> GetOpdContext(Guid examinationId)
        {
            var result = await _service.GetOpdContextAsync(examinationId);
            if (result == null) return NotFound(new { message = "Không tìm thấy lượt khám" });
            return Ok(result);
        }

        /// <summary>
        /// Get Prescription context for examination: diagnosis, allergies, vital signs, patient info.
        /// Used when doctor prescribes medicines (data inherited from OPD examination).
        /// </summary>
        [HttpGet("prescription-context/{examinationId}")]
        public async Task<ActionResult<PrescriptionContextDto>> GetPrescriptionContext(Guid examinationId)
        {
            var result = await _service.GetPrescriptionContextAsync(examinationId);
            if (result == null) return NotFound(new { message = "Không tìm thấy lượt khám" });
            return Ok(result);
        }

        /// <summary>
        /// Get Billing context for medical record: services, prescriptions, patient info, payments.
        /// Used when cashier processes billing (data inherited from OPD + Prescription).
        /// </summary>
        [HttpGet("billing-context/{medicalRecordId}")]
        public async Task<ActionResult<BillingContextDto>> GetBillingContext(Guid medicalRecordId)
        {
            var result = await _service.GetBillingContextAsync(medicalRecordId);
            if (result == null) return NotFound(new { message = "Không tìm thấy hồ sơ bệnh án" });
            return Ok(result);
        }

        /// <summary>
        /// Get Pharmacy context for prescription: medicine details, dosages, payment status.
        /// Used when pharmacist dispenses medicines (data inherited from Prescription + Billing).
        /// </summary>
        [HttpGet("pharmacy-context/{prescriptionId}")]
        public async Task<ActionResult<PharmacyContextDto>> GetPharmacyContext(Guid prescriptionId)
        {
            var result = await _service.GetPharmacyContextAsync(prescriptionId);
            if (result == null) return NotFound(new { message = "Không tìm thấy đơn thuốc" });
            return Ok(result);
        }

        /// <summary>
        /// Get Admission context for examination: OPD data, diagnosis, vitals, treatment history.
        /// Used when IPD nurse admits a patient (data inherited from OPD examination).
        /// </summary>
        [HttpGet("admission-context/{examinationId}")]
        public async Task<ActionResult<AdmissionContextDto>> GetAdmissionContext(Guid examinationId)
        {
            var result = await _service.GetAdmissionContextAsync(examinationId);
            if (result == null) return NotFound(new { message = "Không tìm thấy lượt khám" });
            return Ok(result);
        }
    }
}
