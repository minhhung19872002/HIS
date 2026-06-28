using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.API.Dtos.InsuranceXml;

namespace HIS.API.Controllers;

public partial class InsuranceXmlController
{
    // 12.8 Quản lý danh mục BHYT

    /// <summary>
    /// Lấy danh sách mapping dịch vụ - mã BHYT
    /// </summary>
    [HttpGet("catalog/service-mappings")]
    public async Task<ActionResult<List<ServiceInsuranceMapDto>>> GetServiceMappings([FromQuery] string? keyword = null)
    {
        var result = await _insuranceService.GetServiceMappingsAsync(keyword);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật mapping dịch vụ - mã BHYT
    /// </summary>
    [HttpPut("catalog/service-mappings/{id}")]
    public async Task<ActionResult<ServiceInsuranceMapDto>> UpdateServiceMapping(Guid id, [FromBody] ServiceInsuranceMapDto dto)
    {
        var result = await _insuranceService.UpdateServiceMappingAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách mapping thuốc - mã BHYT
    /// </summary>
    [HttpGet("catalog/medicine-mappings")]
    public async Task<ActionResult<List<MedicineInsuranceMapDto>>> GetMedicineMappings([FromQuery] string? keyword = null)
    {
        var result = await _insuranceService.GetMedicineMappingsAsync(keyword);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật mapping thuốc - mã BHYT
    /// </summary>
    [HttpPut("catalog/medicine-mappings/{id}")]
    public async Task<ActionResult<MedicineInsuranceMapDto>> UpdateMedicineMapping(Guid id, [FromBody] MedicineInsuranceMapDto dto)
    {
        var result = await _insuranceService.UpdateMedicineMappingAsync(id, dto);
        return Ok(result);
    }

    /// <summary>
    /// Import danh mục thuốc BHYT từ file
    /// </summary>
    [HttpPost("catalog/import-medicines")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<ImportResultDto>> ImportMedicineCatalog(IFormFile file)
    {
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var result = await _insuranceService.ImportMedicineCatalogAsync(stream.ToArray());
        return Ok(result);
    }

    /// <summary>
    /// Import danh mục dịch vụ BHYT từ file
    /// </summary>
    [HttpPost("catalog/import-services")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<ImportResultDto>> ImportServiceCatalog(IFormFile file)
    {
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var result = await _insuranceService.ImportServiceCatalogAsync(stream.ToArray());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật giá BHYT theo đợt
    /// </summary>
    [HttpPost("catalog/update-prices")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<InsurancePriceUpdateBatchDto>> UpdateInsurancePrices([FromBody] InsurancePriceUpdateBatchDto dto)
    {
        var result = await _insuranceService.UpdateInsurancePricesAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách mã ICD hợp lệ BHYT
    /// </summary>
    [HttpGet("catalog/valid-icd-codes")]
    public async Task<ActionResult<List<IcdInsuranceMapDto>>> GetValidIcdCodes([FromQuery] string? keyword = null)
    {
        var result = await _insuranceService.GetValidIcdCodesAsync(keyword);
        return Ok(result);
    }
}
