using System;
using System.Threading.Tasks;
using HIS.Application.DTOs.Reporting;

namespace HIS.Application.Services
{
    /// <summary>
    /// Hospital Report Service Interface
    /// Generic report service handling all 140 report codes
    /// </summary>
    public interface IHospitalReportService
    {
        /// <summary>
        /// Get report data by report code with common filter parameters
        /// </summary>
        Task<HospitalReportResult> GetReportDataAsync(
            string reportCode,
            DateTime? from,
            DateTime? to,
            Guid? departmentId,
            Guid? warehouseId);

        /// <summary>
        /// Generate birth certificate HTML for printing
        /// </summary>
        Task<byte[]> GenerateBirthCertificateAsync(BirthCertificateDto dto);
    }
}
