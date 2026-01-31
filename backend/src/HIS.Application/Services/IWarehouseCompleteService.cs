using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;

namespace HIS.Application.Services;

/// <summary>
/// Service Interface đầy đủ cho Phân hệ 5: Kho Dược - Vật tư
/// </summary>
public interface IWarehouseCompleteService
{
    #region 5.1 Nhập kho

    /// <summary>
    /// Tạo phiếu nhập NCC
    /// </summary>
    Task<StockReceiptDto> CreateSupplierReceiptAsync(CreateStockReceiptDto dto, Guid userId);

    /// <summary>
    /// Tạo phiếu nhập từ nguồn khác (viện trợ, tài trợ)
    /// </summary>
    Task<StockReceiptDto> CreateOtherSourceReceiptAsync(CreateStockReceiptDto dto, Guid userId);

    /// <summary>
    /// Tạo phiếu nhập chuyển kho
    /// </summary>
    Task<StockReceiptDto> CreateTransferReceiptAsync(CreateStockReceiptDto dto, Guid userId);

    /// <summary>
    /// Tạo phiếu nhập hoàn trả khoa/phòng
    /// </summary>
    Task<StockReceiptDto> CreateDepartmentReturnReceiptAsync(CreateStockReceiptDto dto, Guid userId);

    /// <summary>
    /// Tạo phiếu nhập hoàn trả kho
    /// </summary>
    Task<StockReceiptDto> CreateWarehouseReturnReceiptAsync(CreateStockReceiptDto dto, Guid userId);

    /// <summary>
    /// Tạo phiếu nhập kiểm kê (điều chỉnh tăng)
    /// </summary>
    Task<StockReceiptDto> CreateStockTakeReceiptAsync(CreateStockReceiptDto dto, Guid userId);

    /// <summary>
    /// Cập nhật phiếu nhập
    /// </summary>
    Task<StockReceiptDto> UpdateStockReceiptAsync(Guid id, CreateStockReceiptDto dto, Guid userId);

    /// <summary>
    /// Duyệt phiếu nhập
    /// </summary>
    Task<StockReceiptDto> ApproveStockReceiptAsync(Guid id, Guid userId);

    /// <summary>
    /// Hủy phiếu nhập
    /// </summary>
    Task<bool> CancelStockReceiptAsync(Guid id, string reason, Guid userId);

    /// <summary>
    /// Lấy danh sách phiếu nhập
    /// </summary>
    Task<PagedResultDto<StockReceiptDto>> GetStockReceiptsAsync(StockReceiptSearchDto searchDto);

    /// <summary>
    /// Lấy chi tiết phiếu nhập
    /// </summary>
    Task<StockReceiptDto?> GetStockReceiptByIdAsync(Guid id);

    /// <summary>
    /// Lấy công nợ NCC
    /// </summary>
    Task<List<SupplierPayableDto>> GetSupplierPayablesAsync(Guid? supplierId);

    /// <summary>
    /// Thanh toán NCC
    /// </summary>
    Task<SupplierPaymentDto> CreateSupplierPaymentAsync(SupplierPaymentDto dto, Guid userId);

    /// <summary>
    /// In phiếu nhập NCC
    /// </summary>
    Task<byte[]> PrintStockReceiptAsync(Guid id);

    /// <summary>
    /// In biên bản kiểm nhập
    /// </summary>
    Task<byte[]> PrintInspectionReportAsync(Guid id);

    #endregion

    #region 5.2 Xuất kho

    /// <summary>
    /// Tự động chọn lô xuất (FIFO/FEFO)
    /// </summary>
    Task<List<StockDto>> AutoSelectBatchesAsync(Guid warehouseId, Guid itemId, decimal quantity);

    /// <summary>
    /// Xuất đơn thuốc ngoại trú
    /// </summary>
    Task<StockIssueDto> DispenseOutpatientPrescriptionAsync(Guid prescriptionId, Guid userId);

    /// <summary>
    /// Xuất phiếu lĩnh nội trú
    /// </summary>
    Task<StockIssueDto> DispenseInpatientOrderAsync(Guid orderSummaryId, Guid userId);

    /// <summary>
    /// Xuất khoa/phòng theo định mức
    /// </summary>
    Task<StockIssueDto> IssueToDepartmentAsync(CreateStockIssueDto dto, Guid userId);

    /// <summary>
    /// Xuất chuyển kho
    /// </summary>
    Task<StockIssueDto> CreateTransferIssueAsync(CreateStockIssueDto dto, Guid userId);

    /// <summary>
    /// Xuất trả NCC
    /// </summary>
    Task<StockIssueDto> CreateSupplierReturnAsync(CreateStockIssueDto dto, Guid userId);

    /// <summary>
    /// Xuất ngoại viện
    /// </summary>
    Task<StockIssueDto> CreateExternalIssueAsync(CreateStockIssueDto dto, Guid userId);

    /// <summary>
    /// Xuất hủy
    /// </summary>
    Task<StockIssueDto> CreateDestructionIssueAsync(CreateStockIssueDto dto, Guid userId);

    /// <summary>
    /// Xuất kiểm nghiệm
    /// </summary>
    Task<StockIssueDto> CreateTestSampleIssueAsync(CreateStockIssueDto dto, Guid userId);

    /// <summary>
    /// Xuất kiểm kê (điều chỉnh giảm)
    /// </summary>
    Task<StockIssueDto> CreateStockTakeIssueAsync(CreateStockIssueDto dto, Guid userId);

    /// <summary>
    /// Xuất thanh lý
    /// </summary>
    Task<StockIssueDto> CreateDisposalIssueAsync(CreateStockIssueDto dto, Guid userId);

    /// <summary>
    /// Bán thuốc nhà thuốc theo đơn BS
    /// </summary>
    Task<PharmacySaleDto> CreatePharmacySaleByPrescriptionAsync(Guid prescriptionId, Guid userId);

    /// <summary>
    /// Bán lẻ nhà thuốc
    /// </summary>
    Task<PharmacySaleDto> CreateRetailSaleAsync(PharmacySaleDto dto, Guid userId);

    /// <summary>
    /// Hủy phiếu xuất
    /// </summary>
    Task<bool> CancelStockIssueAsync(Guid id, string reason, Guid userId);

    /// <summary>
    /// Lấy danh sách phiếu xuất
    /// </summary>
    Task<PagedResultDto<StockIssueDto>> GetStockIssuesAsync(StockIssueSearchDto searchDto);

    /// <summary>
    /// Lấy chi tiết phiếu xuất
    /// </summary>
    Task<StockIssueDto?> GetStockIssueByIdAsync(Guid id);

    /// <summary>
    /// Lấy danh sách đơn thuốc ngoại trú chờ phát
    /// </summary>
    Task<List<DispenseOutpatientDto>> GetPendingOutpatientPrescriptionsAsync(Guid warehouseId, DateTime date);

    /// <summary>
    /// In đơn xuất bán
    /// </summary>
    Task<byte[]> PrintSaleInvoiceAsync(Guid saleId);

    /// <summary>
    /// In hướng dẫn sử dụng
    /// </summary>
    Task<byte[]> PrintUsageInstructionsAsync(Guid issueId);

    /// <summary>
    /// In đơn thuốc ngoại trú
    /// </summary>
    Task<byte[]> PrintOutpatientPrescriptionAsync(Guid prescriptionId);

    /// <summary>
    /// In phiếu lĩnh nội trú
    /// </summary>
    Task<byte[]> PrintInpatientOrderAsync(Guid orderSummaryId);

    /// <summary>
    /// In phiếu xuất
    /// </summary>
    Task<byte[]> PrintStockIssueAsync(Guid id);

    /// <summary>
    /// In phiếu xuất tách theo thuốc GN/HT
    /// </summary>
    Task<byte[]> PrintNarcoticIssueAsync(Guid id);

    /// <summary>
    /// In phiếu xuất tách thuốc độc
    /// </summary>
    Task<byte[]> PrintToxicIssueAsync(Guid id);

    /// <summary>
    /// In phiếu chuyển kho
    /// </summary>
    Task<byte[]> PrintTransferIssueAsync(Guid id);

    #endregion

    #region 5.3 Tồn kho

    /// <summary>
    /// Tạo dự trù
    /// </summary>
    Task<ProcurementRequestDto> CreateProcurementRequestAsync(CreateProcurementRequestDto dto, Guid userId);

    /// <summary>
    /// Tự động gợi ý dự trù theo tiêu thụ cùng kỳ
    /// </summary>
    Task<List<AutoProcurementSuggestionDto>> GetAutoProcurementSuggestionsAsync(Guid warehouseId);

    /// <summary>
    /// Duyệt dự trù
    /// </summary>
    Task<ProcurementRequestDto> ApproveProcurementRequestAsync(Guid id, Guid userId);

    /// <summary>
    /// Lấy danh sách dự trù
    /// </summary>
    Task<List<ProcurementRequestDto>> GetProcurementRequestsAsync(Guid? warehouseId, int? status, DateTime? fromDate, DateTime? toDate);

    /// <summary>
    /// Quản lý tồn kho
    /// </summary>
    Task<PagedResultDto<StockDto>> GetStockAsync(StockSearchDto searchDto);

    /// <summary>
    /// Lấy cảnh báo tồn kho (tối thiểu/tối đa)
    /// </summary>
    Task<List<StockDto>> GetStockWarningsAsync(Guid warehouseId);

    /// <summary>
    /// Lấy thuốc sắp hết hạn
    /// </summary>
    Task<List<ExpiryWarningDto>> GetExpiryWarningsAsync(Guid? warehouseId, int monthsAhead);

    /// <summary>
    /// Quản lý lô thuốc
    /// </summary>
    Task<List<BatchInfoDto>> GetBatchInfoAsync(Guid? warehouseId, Guid? itemId);

    /// <summary>
    /// Duyệt đơn thuốc ngoại trú không lĩnh
    /// </summary>
    Task<List<UnclaimedPrescriptionDto>> GetUnclaimedPrescriptionsAsync(Guid warehouseId, int daysOld);

    /// <summary>
    /// Hủy đơn thuốc không lĩnh
    /// </summary>
    Task<bool> CancelUnclaimedPrescriptionAsync(Guid prescriptionId, Guid userId);

    /// <summary>
    /// Tạo kỳ kiểm kê
    /// </summary>
    Task<StockTakeDto> CreateStockTakeAsync(Guid warehouseId, DateTime periodFrom, DateTime periodTo, Guid userId);

    /// <summary>
    /// Nhập kết quả kiểm kê
    /// </summary>
    Task<StockTakeDto> UpdateStockTakeResultsAsync(Guid stockTakeId, List<StockTakeItemDto> items, Guid userId);

    /// <summary>
    /// Hoàn thành kiểm kê
    /// </summary>
    Task<StockTakeDto> CompleteStockTakeAsync(Guid stockTakeId, Guid userId);

    /// <summary>
    /// Điều chỉnh sau kiểm kê
    /// </summary>
    Task<bool> AdjustStockAfterTakeAsync(Guid stockTakeId, Guid userId);

    /// <summary>
    /// Hủy kỳ kiểm kê
    /// </summary>
    Task<bool> CancelStockTakeAsync(Guid stockTakeId, string reason, Guid userId);

    /// <summary>
    /// In phiếu dự trù
    /// </summary>
    Task<byte[]> PrintProcurementRequestAsync(Guid id);

    /// <summary>
    /// In biên bản kiểm kê
    /// </summary>
    Task<byte[]> PrintStockTakeReportAsync(Guid stockTakeId);

    /// <summary>
    /// In thẻ kho
    /// </summary>
    Task<byte[]> PrintStockCardAsync(Guid warehouseId, Guid itemId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// Lấy thẻ kho
    /// </summary>
    Task<StockCardDto> GetStockCardAsync(Guid warehouseId, Guid itemId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// Báo cáo nhập xuất tồn
    /// </summary>
    Task<List<StockMovementReportDto>> GetStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType);

    /// <summary>
    /// In báo cáo nhập xuất tồn
    /// </summary>
    Task<byte[]> PrintStockMovementReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate, int? itemType);

    /// <summary>
    /// Thống kê xuất khoa phòng
    /// </summary>
    Task<DepartmentUsageReportDto> GetDepartmentUsageReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate);

    /// <summary>
    /// In thống kê xuất khoa phòng
    /// </summary>
    Task<byte[]> PrintDepartmentUsageReportAsync(Guid warehouseId, DateTime fromDate, DateTime toDate);

    #endregion

    #region 5.4 Quản lý

    /// <summary>
    /// Lấy danh sách kho
    /// </summary>
    Task<List<WarehouseDto>> GetWarehousesAsync(int? warehouseType);

    /// <summary>
    /// Lấy chi tiết kho
    /// </summary>
    Task<WarehouseDto?> GetWarehouseByIdAsync(Guid id);

    /// <summary>
    /// Quản lý vật tư tái sử dụng
    /// </summary>
    Task<List<ReusableSupplyDto>> GetReusableSuppliesAsync(Guid? warehouseId, int? status);

    /// <summary>
    /// Cập nhật trạng thái VT tái sử dụng
    /// </summary>
    Task<ReusableSupplyDto> UpdateReusableSupplyStatusAsync(Guid id, int status, Guid userId);

    /// <summary>
    /// Ghi nhận tiệt khuẩn VT
    /// </summary>
    Task<ReusableSupplyDto> RecordSterilizationAsync(Guid id, DateTime sterilizationDate, Guid userId);

    /// <summary>
    /// Quản lý kho ký gửi
    /// </summary>
    Task<List<ConsignmentStockDto>> GetConsignmentStockAsync(Guid? warehouseId, Guid? supplierId);

    /// <summary>
    /// Ghi nhận sử dụng hàng ký gửi
    /// </summary>
    Task<ConsignmentStockDto> RecordConsignmentUsageAsync(Guid consignmentId, decimal quantity, Guid userId);

    /// <summary>
    /// Quản lý thuốc kê theo IU
    /// </summary>
    Task<List<IUMedicineDto>> GetIUMedicinesAsync(Guid? warehouseId);

    /// <summary>
    /// Quy đổi IU sang đơn vị cơ bản
    /// </summary>
    Task<decimal> ConvertIUToBaseUnitAsync(Guid itemId, decimal iuQuantity);

    /// <summary>
    /// Quản lý xuất lẻ
    /// </summary>
    Task<List<SplitIssueDto>> GetSplitableItemsAsync(Guid warehouseId);

    /// <summary>
    /// Tách lẻ thuốc
    /// </summary>
    Task<bool> SplitPackageAsync(Guid warehouseId, Guid itemId, decimal packageQuantity, Guid userId);

    /// <summary>
    /// Lấy cấu hình giá lợi nhuận nhà thuốc
    /// </summary>
    Task<List<ProfitMarginConfigDto>> GetProfitMarginConfigsAsync(Guid warehouseId);

    /// <summary>
    /// Cập nhật cấu hình giá lợi nhuận
    /// </summary>
    Task<ProfitMarginConfigDto> UpdateProfitMarginConfigAsync(ProfitMarginConfigDto dto, Guid userId);

    /// <summary>
    /// Tính giá bán tự động theo lợi nhuận
    /// </summary>
    Task<decimal> CalculateSellingPriceAsync(Guid warehouseId, Guid itemId, decimal costPrice);

    #endregion
}
