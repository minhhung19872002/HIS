using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs.Laboratory;
using ApproveLabResultDto = HIS.Application.Services.ApproveLabResultDto;
using HIS.API.Dtos.LISComplete;
using ApiResponse = HIS.Application.DTOs.Common.ApiResponse<object>;

namespace HIS.API.Controllers
{
    public partial class LISCompleteController : ControllerBase
    {
    /// <summary>
    /// Danh sách lô QC
    /// </summary>
    [HttpGet("qc/lots")]
    public ActionResult GetQCLots(
        [FromQuery] Guid? analyzerId = null,
        [FromQuery] Guid? testId = null,
        [FromQuery] string status = null)
    {
        var now = DateTime.UtcNow;
        var lots = new[]
        {
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-ROCHE-001", testCode = "GLUC", testName = "Glucose máu", level = 2, manufacturer = "Roche Diagnostics", expiryDate = now.AddMonths(6).ToString("O"), targetMean = 5.6m, targetSD = 0.3m, unit = "mmol/L", isActive = true, createdAt = now.AddDays(-30).ToString("O") },
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-ROCHE-002", testCode = "GLUC", testName = "Glucose máu", level = 3, manufacturer = "Roche Diagnostics", expiryDate = now.AddMonths(6).ToString("O"), targetMean = 12.5m, targetSD = 0.6m, unit = "mmol/L", isActive = true, createdAt = now.AddDays(-30).ToString("O") },
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-SYSMEX-101", testCode = "CBC", testName = "Công thức máu", level = 2, manufacturer = "Sysmex", expiryDate = now.AddMonths(4).ToString("O"), targetMean = 7.5m, targetSD = 0.4m, unit = "10^9/L", isActive = true, createdAt = now.AddDays(-20).ToString("O") },
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-BIO-501", testCode = "CREA", testName = "Creatinin", level = 2, manufacturer = "Bio-Rad", expiryDate = now.AddMonths(8).ToString("O"), targetMean = 85.0m, targetSD = 4.2m, unit = "µmol/L", isActive = true, createdAt = now.AddDays(-15).ToString("O") },
            new { id = Guid.NewGuid().ToString(), lotNumber = "QC-BIO-502", testCode = "HbA1c", testName = "HbA1c", level = 1, manufacturer = "Bio-Rad", expiryDate = now.AddMonths(12).ToString("O"), targetMean = 5.5m, targetSD = 0.2m, unit = "%", isActive = true, createdAt = now.AddDays(-10).ToString("O") },
        };
        return Ok(lots);
    }

    /// <summary>
    /// Kết quả QC
    /// </summary>
    [HttpGet("qc/results")]
    public ActionResult GetQCResults(
        [FromQuery] Guid? lotId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
        => Ok(new List<object>());

    /// <summary>
    /// Danh sách mẫu lưu trữ
    /// </summary>
    [HttpGet("sample-storage")]
    public ActionResult GetSampleStorageRecords(
        [FromQuery] string status = null,
        [FromQuery] string keyword = null)
    {
        var now = DateTime.UtcNow;
        var samples = new List<object>();
        var tubes = new[] { "Purple EDTA", "Red SST", "Yellow Citrate", "Green Heparin", "Blue Citrate" };
        var sampleTypes = new[] { "Whole Blood", "Serum", "Plasma", "Urine", "CSF" };
        var conditions = new[] { "frozen", "refrigerator", "deepFrozen", "room" };
        for (int i = 0; i < 15; i++)
        {
            samples.Add(new
            {
                id = Guid.NewGuid().ToString(),
                sampleBarcode = $"SMP{now:yyyyMMdd}{(i + 1):D4}",
                requestCode = $"LR{now:yyyyMMdd}{(i + 100):D4}",
                patientName = $"Bệnh nhân {(i + 1):D3}",
                patientCode = $"BN{now:yyyyMMdd}{(i + 100):D4}",
                sampleType = sampleTypes[i % sampleTypes.Length],
                tubeColor = tubes[i % tubes.Length],
                storageLocation = $"Freezer-{(char)('A' + (i % 3))}/Rack-{(i % 5) + 1}/Box-{(i % 10) + 1}/Pos-{(i % 20) + 1}",
                freezer = $"Freezer-{(char)('A' + (i % 3))}",
                rack = $"Rack-{(i % 5) + 1}",
                box = $"Box-{(i % 10) + 1}",
                position = $"{(i % 20) + 1}",
                temperature = i % 3 == 0 ? -80 : (i % 3 == 1 ? -20 : 4),
                storageCondition = conditions[i % conditions.Length],
                storedAt = now.AddHours(-(i * 3)).ToString("O"),
                storedBy = "KTV xét nghiệm",
                status = i < 10 ? "stored" : "retrieved",
                retentionDays = 365,
                expiryDate = now.AddDays(365 - i * 3).ToString("O")
            });
        }
        return Ok(samples);
    }

    /// <summary>
    /// Vị trí lưu trữ
    /// </summary>
    [HttpGet("sample-storage/locations")]
    public ActionResult GetStorageLocations()
    {
        var locs = new List<object>();
        foreach (var freezer in new[] { "Freezer-A", "Freezer-B", "Freezer-C" })
            for (int r = 1; r <= 5; r++)
                locs.Add(new { id = Guid.NewGuid().ToString(), freezer, rack = $"Rack-{r}", capacity = 100, used = 15 + r * 8 });
        return Ok(locs);
    }

    /// <summary>
    /// Cảnh báo lưu trữ
    /// </summary>
    [HttpGet("sample-storage/alerts")]
    public ActionResult GetStorageAlerts()
    {
        var now = DateTime.UtcNow;
        return Ok(new[]
        {
            new { id = Guid.NewGuid().ToString(), alertType = "expiring", sampleBarcode = $"SMP{now:yyyyMMdd}0003", daysLeft = 7, severity = "warning", message = "Mẫu sắp hết hạn lưu trữ trong 7 ngày" },
            new { id = Guid.NewGuid().ToString(), alertType = "temperature", sampleBarcode = $"SMP{now:yyyyMMdd}0008", daysLeft = 0, severity = "critical", message = "Nhiệt độ tủ -80°C vượt ngưỡng (-75°C)" },
            new { id = Guid.NewGuid().ToString(), alertType = "capacity", sampleBarcode = "", daysLeft = 0, severity = "info", message = "Freezer-B đã đầy 85% sức chứa" }
        });
    }

    /// <summary>
    /// Yêu cầu sàng lọc
    /// </summary>
    [HttpGet("screening/requests")]
    public ActionResult GetScreeningRequests(
        [FromQuery] string type = null,
        [FromQuery] string status = null)
    {
        var now = DateTime.UtcNow;
        var results = new List<object>();
        for (int i = 0; i < 12; i++)
        {
            var isNewborn = i % 2 == 0;
            results.Add(new
            {
                id = Guid.NewGuid().ToString(),
                requestCode = $"SCR{now:yyyyMMdd}{(i + 1):D4}",
                screeningType = isNewborn ? "newborn" : "prenatal",
                patientId = Guid.NewGuid().ToString(),
                patientName = isNewborn ? $"Mẹ BN {(i + 1):D3}" : $"Sản phụ {(i + 1):D3}",
                patientCode = $"BN{now:yyyyMMdd}{(i + 200):D4}",
                babyName = isNewborn ? $"Bé sơ sinh {(i + 1):D3}" : (string?)null,
                babyGender = isNewborn ? (i % 2 + 1) : (int?)null,
                birthWeight = isNewborn ? 2800m + i * 100 : (decimal?)null,
                gestationalAge = isNewborn ? 38 + (i % 4) : (int?)null,
                birthDate = isNewborn ? now.AddDays(-(i + 1)).ToString("O") : (string?)null,
                gestationalWeek = !isNewborn ? 12 + (i % 16) : (int?)null,
                status = i < 3 ? 0 : (i < 6 ? 1 : (i < 10 ? 2 : 3)),
                statusLabel = i < 3 ? "Chờ lấy mẫu" : (i < 6 ? "Đang xử lý" : (i < 10 ? "Có kết quả" : "Đã trả lời")),
                sampleType = isNewborn ? "Blood spot" : "Máu tĩnh mạch",
                requestDate = now.AddHours(-i).ToString("O"),
                requestedBy = "BS Khoa Sản",
                tests = isNewborn
                    ? new[] { "TSH", "17-OH Progesterone", "G6PD" }
                    : new[] { "Double test", "Triple test", "NIPT" }
            });
        }
        return Ok(results);
    }

    /// <summary>
    /// Chương trình sàng lọc
    /// </summary>
    [HttpGet("screening/programs")]
    public ActionResult GetScreeningPrograms()
    {
        return Ok(new[]
        {
            new { id = Guid.NewGuid().ToString(), code = "NB-2PANEL", name = "Sàng lọc sơ sinh 2 bệnh (TSH, G6PD)", targetGroup = "Trẻ sơ sinh", testCount = 2, cost = 280000, isActive = true },
            new { id = Guid.NewGuid().ToString(), code = "NB-5PANEL", name = "Sàng lọc sơ sinh 5 bệnh", targetGroup = "Trẻ sơ sinh", testCount = 5, cost = 650000, isActive = true },
            new { id = Guid.NewGuid().ToString(), code = "PRE-DOUBLE", name = "Double test (11-13w)", targetGroup = "Thai 11-13 tuần", testCount = 2, cost = 450000, isActive = true },
            new { id = Guid.NewGuid().ToString(), code = "PRE-TRIPLE", name = "Triple test (15-18w)", targetGroup = "Thai 15-18 tuần", testCount = 3, cost = 550000, isActive = true },
            new { id = Guid.NewGuid().ToString(), code = "PRE-NIPT", name = "NIPT - Sàng lọc không xâm lấn", targetGroup = "Thai ≥10 tuần", testCount = 1, cost = 5500000, isActive = true }
        });
    }

    /// <summary>
    /// Danh sách hóa chất
    /// </summary>
    [HttpGet("reagents")]
    public ActionResult GetReagents(
        [FromQuery] string keyword = null,
        [FromQuery] string status = null)
    {
        var now = DateTime.UtcNow;
        var list = new[]
        {
            ("GLU-R1", "Glucose Reagent R1", "Roche", new[] { "GLUC" }, 200m, 50m),
            ("HbA1c-R1", "HbA1c Cartridge", "Bio-Rad", new[] { "HbA1c" }, 80m, 20m),
            ("CREA-R1", "Creatinine Jaffe R1", "Roche", new[] { "CREA" }, 150m, 40m),
            ("ALT-R1", "ALT (GPT) Reagent", "Siemens", new[] { "ALT", "SGPT" }, 120m, 30m),
            ("AST-R1", "AST (GOT) Reagent", "Siemens", new[] { "AST", "SGOT" }, 120m, 30m),
            ("CHOL-R1", "Cholesterol Total", "Roche", new[] { "CHOL" }, 100m, 25m),
            ("CRP-R1", "CRP High Sensitivity", "Roche", new[] { "CRP" }, 90m, 20m),
            ("CBC-DIL", "CBC Diluent", "Sysmex", new[] { "CBC" }, 500m, 100m),
            ("HCG-R1", "hCG Quantitative", "Roche", new[] { "hCG" }, 60m, 15m),
            ("TSH-R1", "TSH Reagent", "Roche", new[] { "TSH" }, 80m, 20m),
        };
        var reagents = list.Select((x, i) => new
        {
            id = Guid.NewGuid().ToString(),
            code = x.Item1,
            name = x.Item2,
            manufacturer = x.Item3,
            lotNumber = $"L{now:yyMM}{(i + 1):D3}",
            catalogNumber = $"CAT-{x.Item1}",
            testCodes = x.Item4,
            testNames = x.Item4,
            analyzerName = i % 2 == 0 ? "Cobas c311" : "XN-1000",
            unit = "mL",
            quantity = x.Item5,
            minimumStock = x.Item6,
            usedQuantity = x.Item5 * 0.3m,
            remainingQuantity = x.Item5 * 0.7m,
            expiryDate = now.AddMonths(6 + i).ToString("O"),
            isExpired = false,
            isLowStock = i == 3 || i == 7,
            status = i == 3 || i == 7 ? "low" : "active"
        });
        return Ok(reagents);
    }

    /// <summary>
    /// Lịch sử sử dụng hóa chất
    /// </summary>
    [HttpGet("reagents/usage")]
    public ActionResult GetReagentUsage(
        [FromQuery] Guid? reagentId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var now = DateTime.UtcNow;
        var list = new List<object>();
        for (int i = 0; i < 20; i++)
        {
            list.Add(new
            {
                id = Guid.NewGuid().ToString(),
                reagentCode = new[] { "GLU-R1", "HbA1c-R1", "CREA-R1", "ALT-R1", "CBC-DIL" }[i % 5],
                usedAt = now.AddHours(-i * 6).ToString("O"),
                usedBy = "KTV xét nghiệm",
                quantityUsed = 5m + (i % 10),
                testsRun = 10 + (i % 30),
                notes = ""
            });
        }
        return Ok(list);
    }

    /// <summary>
    /// Cảnh báo hóa chất
    /// </summary>
    [HttpGet("reagents/alerts")]
    public ActionResult GetReagentAlerts()
    {
        var now = DateTime.UtcNow;
        return Ok(new[]
        {
            new { id = Guid.NewGuid().ToString(), alertType = "low_stock", reagentCode = "ALT-R1", message = "Tồn kho thấp hơn mức tối thiểu (25/30 mL)", severity = "warning" },
            new { id = Guid.NewGuid().ToString(), alertType = "expiring", reagentCode = "HbA1c-R1", message = "Hết hạn trong 15 ngày", severity = "warning" },
            new { id = Guid.NewGuid().ToString(), alertType = "calibration", reagentCode = "GLU-R1", message = "Cần hiệu chuẩn lại sau 2 ngày", severity = "info" }
        });
    }

    /// <summary>
    /// Tồn kho hóa chất
    /// </summary>
    [HttpGet("reagents/inventory")]
    public ActionResult GetReagentInventory()
    {
        var now = DateTime.UtcNow;
        return Ok(new[]
        {
            new { category = "Sinh hoá", total = 25, expired = 0, expiringIn30Days = 2, lowStock = 3 },
            new { category = "Huyết học", total = 12, expired = 0, expiringIn30Days = 1, lowStock = 1 },
            new { category = "Miễn dịch", total = 18, expired = 1, expiringIn30Days = 3, lowStock = 2 },
            new { category = "Vi sinh", total = 8, expired = 0, expiringIn30Days = 0, lowStock = 0 }
        });
    }

    /// <summary>
    /// Mẫu bị từ chối
    /// </summary>
    [HttpGet("sample-tracking/rejections")]
    public ActionResult GetSampleRejections(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var now = DateTime.UtcNow;
        var reasons = new[]
        {
            ("HEMOLYSIS", "Mẫu huyết tán"),
            ("CLOTTED", "Mẫu đông"),
            ("INSUFFICIENT", "Không đủ thể tích"),
            ("WRONG_TUBE", "Sai loại ống"),
            ("MISLABELED", "Nhãn không đúng"),
            ("NO_BARCODE", "Thiếu mã vạch"),
            ("CONTAMINATED", "Nhiễm bẩn"),
            ("LYSED", "Vỡ hồng cầu")
        };
        var list = new List<object>();
        for (int i = 0; i < 10; i++)
        {
            var (code, lbl) = reasons[i % reasons.Length];
            list.Add(new
            {
                id = Guid.NewGuid().ToString(),
                sampleBarcode = $"SMP{now:yyyyMMdd}{(i + 50):D4}",
                requestCode = $"LR{now:yyyyMMdd}{(i + 50):D4}",
                patientName = $"Bệnh nhân {(i + 10):D3}",
                patientCode = $"BN{now:yyyyMMdd}{(i + 300):D4}",
                rejectionReason = lbl,
                rejectionCode = code,
                rejectedAt = now.AddHours(-(i * 2)).ToString("O"),
                rejectedBy = "KTV xét nghiệm",
                isUndone = i == 2,
                undoneAt = i == 2 ? now.AddHours(-1).ToString("O") : null,
                undoneBy = i == 2 ? "KTV Trưởng" : null,
                reCollected = i < 4,
                reCollectedAt = i < 4 ? now.AddMinutes(-30 * i).ToString("O") : null,
                notes = i % 3 == 0 ? "Đã liên hệ bác sĩ chỉ định" : null
            });
        }
        return Ok(list);
    }

    /// <summary>
    /// Tổng hợp theo dõi mẫu
    /// </summary>
    [HttpGet("sample-tracking/summary")]
    public ActionResult GetSampleTrackingSummary()
    {
        return Ok(new
        {
            totalSamples = 125,
            rejected = 10,
            pending = 15,
            completed = 100,
            rejectionRate = 8.0,
            topReasons = new[]
            {
                new { code = "HEMOLYSIS", label = "Mẫu huyết tán", count = 4 },
                new { code = "CLOTTED", label = "Mẫu đông", count = 3 },
                new { code = "INSUFFICIENT", label = "Không đủ thể tích", count = 2 },
                new { code = "MISLABELED", label = "Nhãn không đúng", count = 1 }
            }
        });
    }

    /// <summary>
    /// Lý do từ chối mẫu
    /// </summary>
    [HttpGet("sample-tracking/rejection-reasons")]
    public ActionResult GetRejectionReasons()
    {
        return Ok(new[]
        {
            new { code = "HEMOLYSIS", label = "Mẫu huyết tán", category = "quality" },
            new { code = "CLOTTED", label = "Mẫu đông", category = "quality" },
            new { code = "INSUFFICIENT", label = "Không đủ thể tích", category = "quantity" },
            new { code = "WRONG_TUBE", label = "Sai loại ống", category = "collection" },
            new { code = "MISLABELED", label = "Nhãn không đúng", category = "identification" },
            new { code = "NO_BARCODE", label = "Thiếu mã vạch", category = "identification" },
            new { code = "CONTAMINATED", label = "Nhiễm bẩn", category = "quality" },
            new { code = "LYSED", label = "Vỡ hồng cầu", category = "quality" }
        });
    }

    // #14b: 4 endpoint K5 chuyển thao tác lên ServiceRequestDetail (model 1) — id mẫu = SRD id.
    // Trước thao tác LabRequestItems (model 2 chết, chỉ seed) → id thật từ luồng nghiệp vụ luôn 404.

    [HttpPost("sample-storage/store")]
    public async Task<IActionResult> StoreSample([FromBody] StoreSampleRequest dto)
    {
        var ok = await _lisService.StoreSampleAsync(dto.SampleId, dto.Location, GetUserId());
        if (!ok) return NotFound(ApiResponse.Fail("Mẫu không tồn tại"));
        return Ok(new { message = $"Đã lưu trữ mẫu tại {dto.Location}" });
    }

    [HttpPost("sample-storage/retrieve")]
    public async Task<IActionResult> RetrieveSample([FromBody] RetrieveSampleRequest dto)
    {
        var ok = await _lisService.RetrieveSampleAsync(dto.SampleId, GetUserId());
        if (!ok) return NotFound(ApiResponse.Fail("Mẫu không tồn tại"));
        return Ok(new { message = "Đã lấy mẫu ra khỏi kho" });
    }

    [HttpPost("sample-tracking/reject")]
    public async Task<IActionResult> RejectSample([FromBody] RejectSampleRequest dto)
    {
        var ok = await _lisService.RejectSampleAsync(dto.SampleId, dto.Reason, GetUserId());
        if (!ok) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy dữ liệu." });
        return Ok();
    }

    [HttpPost("sample-tracking/undo-reject")]
    public async Task<IActionResult> UndoRejectSample([FromBody] UndoRejectRequest dto)
    {
        var ok = await _lisService.UndoRejectSampleAsync(dto.SampleId, GetUserId());
        if (!ok) return NotFound(new { error = "NOT_FOUND", message = "Không tìm thấy dữ liệu." });
        return Ok();
    }

    /// <summary>
    /// Màn hình hiển thị hàng đợi xét nghiệm (public API, không cần đăng nhập)
    /// </summary>
    [HttpGet("queue/display")]
    [AllowAnonymous]
    public async Task<ActionResult<LabQueueDisplayDto>> GetLabQueueDisplay()
    {
        var result = await _lisService.GetLabQueueDisplayAsync();
        if (result != null)
        {
            // Endpoint anonymous (màn hình TV) không được lộ họ tên đầy đủ + mã BN (#406)
            foreach (var item in result.ProcessingItems.Concat(result.WaitingItems).Concat(result.CompletedItems))
            {
                item.PatientName = HIS.Core.Common.NameMask.Mask(item.PatientName);
                item.PatientCode = null;
            }
        }
        return Ok(result);
    }

    #region NangCap26 — LIS #29 Ngoại kiểm (EQA) + LIS #15 Đơn vị gửi mẫu

    /// <summary>Danh mục xét nghiệm ngoại kiểm.</summary>
    [HttpGet("eqa/tests")]
    public async Task<ActionResult<List<LabEqaTestDto>>> GetEqaTests([FromQuery] bool activeOnly = true)
        => Ok(await _lisService.GetEqaTestsAsync(activeOnly));

    [HttpPost("eqa/tests")]
    public async Task<ActionResult<LabEqaTestDto>> SaveEqaTest([FromBody] LabEqaTestDto dto)
        => Ok(await _lisService.SaveEqaTestAsync(dto, GetUserId() ?? Guid.Empty));

    [HttpDelete("eqa/tests/{id}")]
    public async Task<IActionResult> DeleteEqaTest(Guid id)
    {
        await _lisService.DeleteEqaTestAsync(id, GetUserId() ?? Guid.Empty);
        return NoContent();
    }

    /// <summary>Danh sách đợt ngoại kiểm (tiếp nhận bàn giao mẫu).</summary>
    [HttpGet("eqa/batches")]
    public async Task<ActionResult<List<LabEqaBatchDto>>> GetEqaBatches(
        [FromQuery] string? status, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        => Ok(await _lisService.GetEqaBatchesAsync(status, fromDate, toDate));

    [HttpGet("eqa/batches/{id}")]
    public async Task<ActionResult<LabEqaBatchDto>> GetEqaBatch(Guid id)
        => Ok(await _lisService.GetEqaBatchAsync(id));

    [HttpPost("eqa/batches")]
    public async Task<ActionResult<LabEqaBatchDto>> SaveEqaBatch([FromBody] SaveLabEqaBatchDto dto)
        => Ok(await _lisService.SaveEqaBatchAsync(dto, GetUserId() ?? Guid.Empty));

    /// <summary>Chuyển trạng thái đợt: Received → Running → Reported → Closed.</summary>
    [HttpPost("eqa/batches/{id}/status")]
    public async Task<ActionResult<LabEqaBatchDto>> SetEqaBatchStatus(Guid id, [FromBody] EqaStatusRequest req)
        => Ok(await _lisService.SetEqaBatchStatusAsync(id, req?.Status ?? string.Empty, GetUserId() ?? Guid.Empty));

    /// <summary>Đăng ký chạy mẫu / nhập kết quả ngoại kiểm.</summary>
    [HttpPost("eqa/results")]
    public async Task<ActionResult<LabEqaResultDto>> SaveEqaResult([FromBody] SaveLabEqaResultDto dto)
        => Ok(await _lisService.SaveEqaResultAsync(dto, GetUserId() ?? Guid.Empty));

    [HttpDelete("eqa/results/{id}")]
    public async Task<IActionResult> DeleteEqaResult(Guid id)
    {
        await _lisService.DeleteEqaResultAsync(id, GetUserId() ?? Guid.Empty);
        return NoContent();
    }

    /// <summary>Danh mục đơn vị gửi mẫu.</summary>
    [HttpGet("sending-units")]
    public async Task<ActionResult<List<LabSendingUnitDto>>> GetSendingUnits([FromQuery] bool activeOnly = true)
        => Ok(await _lisService.GetSendingUnitsAsync(activeOnly));

    [HttpPost("sending-units")]
    public async Task<ActionResult<LabSendingUnitDto>> SaveSendingUnit([FromBody] LabSendingUnitDto dto)
        => Ok(await _lisService.SaveSendingUnitAsync(dto, GetUserId() ?? Guid.Empty));

    [HttpDelete("sending-units/{id}")]
    public async Task<IActionResult> DeleteSendingUnit(Guid id)
    {
        await _lisService.DeleteSendingUnitAsync(id, GetUserId() ?? Guid.Empty);
        return NoContent();
    }

    /// <summary>Import đơn vị gửi mẫu từ Excel (client parse file → gửi mảng dòng).</summary>
    [HttpPost("sending-units/import")]
    public async Task<ActionResult<object>> ImportSendingUnits([FromBody] List<LabSendingUnitDto> rows)
        => Ok(new { imported = await _lisService.ImportSendingUnitsAsync(rows, GetUserId() ?? Guid.Empty) });

    public class EqaStatusRequest { public string Status { get; set; } = string.Empty; }

    #endregion
    }
}
