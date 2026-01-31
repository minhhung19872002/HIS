using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HIS.Application.DTOs.BloodBank;

namespace HIS.Application.Services
{
    /// <summary>
    /// Complete Blood Bank Service Interface
    /// Module 9: Quản lý máu, chế phẩm máu - 10 chức năng
    /// </summary>
    public interface IBloodBankCompleteService
    {
        #region 1-2. Quản lý nhập máu từ nhà cung cấp

        /// <summary>
        /// 1. Quản lý nhập máu từ nhà cung cấp - Danh sách phiếu nhập
        /// </summary>
        Task<List<BloodImportReceiptDto>> GetImportReceiptsAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? supplierId = null,
            string status = null);

        /// <summary>
        /// Chi tiết phiếu nhập
        /// </summary>
        Task<BloodImportReceiptDto> GetImportReceiptAsync(Guid receiptId);

        /// <summary>
        /// Tạo phiếu nhập máu
        /// </summary>
        Task<BloodImportReceiptDto> CreateImportReceiptAsync(CreateBloodImportDto dto);

        /// <summary>
        /// Cập nhật phiếu nhập
        /// </summary>
        Task<BloodImportReceiptDto> UpdateImportReceiptAsync(Guid receiptId, CreateBloodImportDto dto);

        /// <summary>
        /// Xác nhận phiếu nhập
        /// </summary>
        Task<bool> ConfirmImportReceiptAsync(Guid receiptId);

        /// <summary>
        /// Hủy phiếu nhập
        /// </summary>
        Task<bool> CancelImportReceiptAsync(Guid receiptId, string reason);

        /// <summary>
        /// 2. In phiếu nhập máu từ nhà cung cấp
        /// </summary>
        Task<byte[]> PrintImportReceiptAsync(Guid receiptId);

        #endregion

        #region 3. Quản lý yêu cầu xuất kho máu

        /// <summary>
        /// Danh sách yêu cầu xuất kho
        /// </summary>
        Task<List<BloodIssueRequestDto>> GetIssueRequestsAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            string status = null);

        /// <summary>
        /// Chi tiết yêu cầu xuất
        /// </summary>
        Task<BloodIssueRequestDto> GetIssueRequestAsync(Guid requestId);

        /// <summary>
        /// Tạo yêu cầu xuất kho
        /// </summary>
        Task<BloodIssueRequestDto> CreateIssueRequestAsync(CreateBloodIssueRequestDto dto);

        /// <summary>
        /// Duyệt yêu cầu xuất
        /// </summary>
        Task<bool> ApproveIssueRequestAsync(Guid requestId);

        /// <summary>
        /// Từ chối yêu cầu xuất
        /// </summary>
        Task<bool> RejectIssueRequestAsync(Guid requestId, string reason);

        /// <summary>
        /// Thực hiện xuất máu
        /// </summary>
        Task<BloodIssueReceiptDto> IssueBloodAsync(IssueBloodDto dto);

        /// <summary>
        /// Danh sách phiếu xuất
        /// </summary>
        Task<List<BloodIssueReceiptDto>> GetIssueReceiptsAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null);

        /// <summary>
        /// In phiếu xuất máu
        /// </summary>
        Task<byte[]> PrintIssueReceiptAsync(Guid receiptId);

        #endregion

        #region 4. Quản lý tồn kho máu

        /// <summary>
        /// Tồn kho tổng hợp
        /// </summary>
        Task<List<BloodStockDto>> GetBloodStockAsync(
            string bloodType = null,
            string rhFactor = null,
            Guid? productTypeId = null);

        /// <summary>
        /// Chi tiết tồn kho theo túi
        /// </summary>
        Task<List<BloodStockDetailDto>> GetBloodStockDetailAsync(
            string bloodType = null,
            string rhFactor = null,
            Guid? productTypeId = null,
            string status = null);

        /// <summary>
        /// Lấy thông tin túi máu
        /// </summary>
        Task<BloodBagDto> GetBloodBagAsync(Guid bloodBagId);

        /// <summary>
        /// Cập nhật trạng thái túi máu
        /// </summary>
        Task<bool> UpdateBloodBagStatusAsync(Guid bloodBagId, string status, string reason = null);

        /// <summary>
        /// Danh sách túi máu sắp hết hạn
        /// </summary>
        Task<List<BloodStockDetailDto>> GetExpiringBloodBagsAsync(int daysUntilExpiry = 7);

        /// <summary>
        /// Danh sách túi máu đã hết hạn
        /// </summary>
        Task<List<BloodStockDetailDto>> GetExpiredBloodBagsAsync();

        /// <summary>
        /// Hủy túi máu hết hạn
        /// </summary>
        Task<bool> DestroyExpiredBloodBagsAsync(List<Guid> bloodBagIds, string reason);

        #endregion

        #region 5. Quản lý hoạt động kiểm kê

        /// <summary>
        /// Danh sách phiếu kiểm kê
        /// </summary>
        Task<List<BloodInventoryDto>> GetInventoriesAsync(
            DateTime fromDate,
            DateTime toDate,
            string status = null);

        /// <summary>
        /// Chi tiết phiếu kiểm kê
        /// </summary>
        Task<BloodInventoryDto> GetInventoryAsync(Guid inventoryId);

        /// <summary>
        /// Tạo phiếu kiểm kê
        /// </summary>
        Task<BloodInventoryDto> CreateInventoryAsync(CreateBloodInventoryDto dto);

        /// <summary>
        /// Cập nhật phiếu kiểm kê
        /// </summary>
        Task<BloodInventoryDto> UpdateInventoryAsync(Guid inventoryId, CreateBloodInventoryDto dto);

        /// <summary>
        /// Hoàn thành kiểm kê
        /// </summary>
        Task<bool> CompleteInventoryAsync(Guid inventoryId);

        /// <summary>
        /// Duyệt kiểm kê
        /// </summary>
        Task<bool> ApproveInventoryAsync(Guid inventoryId);

        #endregion

        #region 6. Hệ thống báo cáo kho máu

        /// <summary>
        /// Thẻ kho máu
        /// </summary>
        Task<BloodStockCardDto> GetStockCardAsync(
            string bloodType,
            string rhFactor,
            Guid productTypeId,
            DateTime fromDate,
            DateTime toDate);

        /// <summary>
        /// Báo cáo nhập xuất tồn kho
        /// </summary>
        Task<BloodInventoryReportDto> GetInventoryReportAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// In phiếu nhập
        /// </summary>
        Task<byte[]> PrintImportReportAsync(DateTime fromDate, DateTime toDate, Guid? supplierId = null);

        /// <summary>
        /// In phiếu xuất
        /// </summary>
        Task<byte[]> PrintExportReportAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// In biên bản kiểm kê
        /// </summary>
        Task<byte[]> PrintInventoryReportAsync(Guid inventoryId);

        /// <summary>
        /// In báo cáo nhập xuất tồn
        /// </summary>
        Task<byte[]> PrintStockReportAsync(DateTime fromDate, DateTime toDate);

        #endregion

        #region 7. Chỉ định máu, chế phẩm máu

        /// <summary>
        /// Danh sách chỉ định máu
        /// </summary>
        Task<List<BloodOrderDto>> GetBloodOrdersAsync(
            DateTime fromDate,
            DateTime toDate,
            Guid? departmentId = null,
            Guid? patientId = null,
            string status = null);

        /// <summary>
        /// Chi tiết chỉ định máu
        /// </summary>
        Task<BloodOrderDto> GetBloodOrderAsync(Guid orderId);

        /// <summary>
        /// Tạo chỉ định máu
        /// </summary>
        Task<BloodOrderDto> CreateBloodOrderAsync(CreateBloodOrderDto dto);

        /// <summary>
        /// Hủy chỉ định máu
        /// </summary>
        Task<bool> CancelBloodOrderAsync(Guid orderId, string reason);

        /// <summary>
        /// Gán túi máu cho bệnh nhân
        /// </summary>
        Task<bool> AssignBloodBagToPatientAsync(Guid orderItemId, Guid bloodBagId);

        /// <summary>
        /// Hủy gán túi máu
        /// </summary>
        Task<bool> UnassignBloodBagAsync(Guid orderItemId, Guid bloodBagId, string reason);

        /// <summary>
        /// Ghi nhận kết quả phản ứng chéo
        /// </summary>
        Task<bool> RecordCrossMatchResultAsync(Guid orderItemId, Guid bloodBagId, string result, string note);

        /// <summary>
        /// Bắt đầu truyền máu
        /// </summary>
        Task<bool> StartTransfusionAsync(Guid orderItemId, Guid bloodBagId);

        /// <summary>
        /// Kết thúc truyền máu
        /// </summary>
        Task<bool> CompleteTransfusionAsync(Guid orderItemId, Guid bloodBagId, string note);

        /// <summary>
        /// Ghi nhận phản ứng truyền máu
        /// </summary>
        Task<bool> RecordTransfusionReactionAsync(Guid orderItemId, Guid bloodBagId, string reaction, string action);

        #endregion

        #region 8-9. In phiếu lĩnh máu

        /// <summary>
        /// 8. In phiếu lĩnh máu tổng hợp
        /// </summary>
        Task<byte[]> PrintBloodIssueSummaryAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// Báo cáo phiếu lĩnh máu tổng hợp
        /// </summary>
        Task<BloodIssueSummaryDto> GetBloodIssueSummaryAsync(DateTime fromDate, DateTime toDate, Guid? departmentId = null);

        /// <summary>
        /// 9. In phiếu lĩnh máu theo từng bệnh nhân
        /// </summary>
        Task<byte[]> PrintBloodIssueByPatientAsync(Guid patientId, DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Báo cáo máu theo bệnh nhân
        /// </summary>
        Task<BloodIssueByPatientDto> GetBloodIssueByPatientAsync(Guid patientId, DateTime fromDate, DateTime toDate);

        #endregion

        #region 10. Kết nối thiết bị QRcode, Barcode

        /// <summary>
        /// Đọc mã vạch/QR code túi máu
        /// </summary>
        Task<ScanBloodBagResultDto> ScanBloodBagAsync(ScanBloodBagDto dto);

        /// <summary>
        /// In mã vạch túi máu
        /// </summary>
        Task<byte[]> PrintBloodBagBarcodesAsync(PrintBloodBagBarcodeDto dto);

        /// <summary>
        /// Tra cứu túi máu theo mã vạch
        /// </summary>
        Task<BloodBagDto> GetBloodBagByBarcodeAsync(string barcode);

        #endregion

        #region Danh mục

        /// <summary>
        /// Danh sách loại chế phẩm máu
        /// </summary>
        Task<List<BloodProductTypeDto>> GetProductTypesAsync();

        /// <summary>
        /// Thêm/Sửa loại chế phẩm
        /// </summary>
        Task<BloodProductTypeDto> SaveProductTypeAsync(BloodProductTypeDto dto);

        /// <summary>
        /// Danh sách nhà cung cấp máu
        /// </summary>
        Task<List<BloodSupplierDto>> GetSuppliersAsync(string keyword = null);

        /// <summary>
        /// Thêm/Sửa nhà cung cấp
        /// </summary>
        Task<BloodSupplierDto> SaveSupplierAsync(BloodSupplierDto dto);

        #endregion
    }
}
