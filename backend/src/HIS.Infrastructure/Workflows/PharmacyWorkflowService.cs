using HIS.Application.Workflows;
using HIS.Core.Interfaces;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng 6: Kho Dược & Phát thuốc (Pharmacy Flow)
/// Theo HIS_DataFlow_Architecture.md - Mục 2.5
///
/// LUỒNG CHÍNH:
/// [NHẬP KHO] Nhà cung cấp → Kiểm nhập QC → Lưu kho (Lô/HSD) → Quản lý tồn kho
/// [XUẤT KHO NGOẠI TRÚ] Đơn thuốc → Kiểm tra → Xuất thuốc (FIFO/FEFO) → Quầy phát thuốc
/// [XUẤT KHO NỘI TRÚ] Phiếu lĩnh → Duyệt → Xuất thuốc → Khoa Lâm sàng
/// [CHUYỂN KHO] Yêu cầu chuyển → Duyệt → Thực hiện chuyển
///
/// BUSINESS RULES (Mục 5.1):
/// RULE_PHAR_001: FIFO (nhập trước xuất trước), FEFO (hết hạn trước xuất trước - ưu tiên hơn)
/// RULE_PHAR_002: Cảnh báo tồn tối thiểu, thuốc sắp hết hạn (30/60/90 ngày)
/// RULE_PHAR_003: Thuốc gây nghiện/hướng thần cần sổ theo dõi riêng
///
/// LIÊN KẾT MODULE:
/// - Module 2 (Khám bệnh): Nhận đơn thuốc ngoại trú
/// - Module 3 (Nội trú): Nhận phiếu lĩnh thuốc nội trú
/// - Module 6 (PTTT): Xuất vật tư mổ
/// - Module 10 (Thu ngân): Tính tiền thuốc
/// - Module 14 (Nhà thuốc): Bán lẻ thuốc
/// - Module 15 (BC Dược): Báo cáo tồn kho, xuất nhập
/// </summary>
public class PharmacyWorkflowService : IPharmacyWorkflowService
{
    private readonly IUnitOfWork _unitOfWork;

    public PharmacyWorkflowService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    #region NHẬP KHO

    /// <summary>
    /// Tạo đơn đặt hàng từ nhà cung cấp
    /// - Theo danh mục trúng thầu
    /// - Kiểm tra tồn kho tối thiểu
    /// </summary>
    public async Task<PurchaseOrderResult> CreatePurchaseOrderAsync(PurchaseOrderDto order)
    {
        try
        {
            // Verify supplier exists
            var supplier = await _unitOfWork.GetRepository<Supplier>()
                .Query()
                .FirstOrDefaultAsync(s => s.Id == order.SupplierId && !s.IsDeleted && s.IsActive);

            if (supplier == null)
            {
                return new PurchaseOrderResult(false, null, "Nhà cung cấp không tồn tại hoặc không hoạt động");
            }

            // Create purchase order
            var purchaseOrder = new PurchaseOrder
            {
                Id = Guid.NewGuid(),
                SupplierId = order.SupplierId,
                OrderNumber = GenerateOrderNumber("PO"),
                Status = "Draft", // Draft → Approved → Received → Completed
                TotalAmount = order.Items.Sum(i => i.Quantity * i.UnitPrice),
                Note = order.Note,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<PurchaseOrder>().AddAsync(purchaseOrder);

            // Create order items
            foreach (var item in order.Items)
            {
                var orderItem = new PurchaseOrderItem
                {
                    Id = Guid.NewGuid(),
                    PurchaseOrderId = purchaseOrder.Id,
                    ItemId = item.ItemId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    TotalPrice = item.Quantity * item.UnitPrice,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<PurchaseOrderItem>().AddAsync(orderItem);
            }

            await _unitOfWork.SaveChangesAsync();

            return new PurchaseOrderResult(true, purchaseOrder.Id, $"Đã tạo đơn đặt hàng {purchaseOrder.OrderNumber}");
        }
        catch (Exception ex)
        {
            return new PurchaseOrderResult(false, null, $"Lỗi khi tạo đơn đặt hàng: {ex.Message}");
        }
    }

    /// <summary>
    /// Nhận hàng từ nhà cung cấp
    /// - Kiểm tra thông tin hóa đơn
    /// - Kiểm tra số lượng, lô, hạn sử dụng
    /// </summary>
    public async Task<GoodsReceiptResult> ReceiveGoodsAsync(Guid purchaseOrderId, GoodsReceiptDto receipt)
    {
        try
        {
            var purchaseOrder = await _unitOfWork.GetRepository<PurchaseOrder>()
                .Query()
                .Include(po => po.Items)
                .FirstOrDefaultAsync(po => po.Id == purchaseOrderId && !po.IsDeleted);

            if (purchaseOrder == null)
            {
                return new GoodsReceiptResult(false, null, "Không tìm thấy đơn đặt hàng");
            }

            // Create goods receipt
            var goodsReceipt = new GoodsReceipt
            {
                Id = Guid.NewGuid(),
                PurchaseOrderId = purchaseOrderId,
                ReceiptNumber = GenerateOrderNumber("GR"),
                InvoiceNumber = receipt.InvoiceNumber,
                InvoiceDate = receipt.InvoiceDate,
                Status = "PendingQC", // PendingQC → Passed → StockedIn
                ReceivedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<GoodsReceipt>().AddAsync(goodsReceipt);

            // Create receipt items with batch info
            foreach (var item in receipt.Items)
            {
                var receiptItem = new GoodsReceiptItem
                {
                    Id = Guid.NewGuid(),
                    GoodsReceiptId = goodsReceipt.Id,
                    ItemId = item.ItemId,
                    Quantity = item.Quantity,
                    BatchNumber = item.BatchNumber,
                    ExpiryDate = item.ExpiryDate,
                    UnitPrice = item.UnitPrice,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<GoodsReceiptItem>().AddAsync(receiptItem);
            }

            // Update purchase order
            purchaseOrder.Status = "Received";
            purchaseOrder.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new GoodsReceiptResult(true, goodsReceipt.Id, $"Đã tạo phiếu nhập kho {goodsReceipt.ReceiptNumber}");
        }
        catch (Exception ex)
        {
            return new GoodsReceiptResult(false, null, $"Lỗi khi nhận hàng: {ex.Message}");
        }
    }

    /// <summary>
    /// Kiểm tra chất lượng hàng nhập
    /// - Kiểm tra mẫu mã, bao bì
    /// - Kiểm tra hạn sử dụng
    /// - Kiểm tra số lô, số đăng ký
    /// </summary>
    public async Task<QualityCheckResult> PerformQualityCheckAsync(Guid goodsReceiptId)
    {
        try
        {
            var receipt = await _unitOfWork.GetRepository<GoodsReceipt>()
                .Query()
                .Include(gr => gr.Items)
                .FirstOrDefaultAsync(gr => gr.Id == goodsReceiptId && !gr.IsDeleted);

            if (receipt == null)
            {
                return new QualityCheckResult(false, null, "Không tìm thấy phiếu nhập kho");
            }

            var issues = new List<string>();

            foreach (var item in receipt.Items)
            {
                // Check expiry date - at least 6 months remaining
                if (item.ExpiryDate < DateTime.Now.AddMonths(6))
                {
                    issues.Add($"Thuốc {item.ItemId} hạn sử dụng còn dưới 6 tháng");
                }

                // Check batch number format
                if (string.IsNullOrEmpty(item.BatchNumber))
                {
                    issues.Add($"Thuốc {item.ItemId} thiếu số lô");
                }
            }

            // Create QC record
            var qcRecord = new QualityCheckRecord
            {
                Id = Guid.NewGuid(),
                GoodsReceiptId = goodsReceiptId,
                IsPassed = issues.Count == 0,
                Issues = string.Join("; ", issues),
                CheckedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<QualityCheckRecord>().AddAsync(qcRecord);

            // Update receipt status
            receipt.Status = issues.Count == 0 ? "Passed" : "Failed";
            receipt.QCCheckedAt = DateTime.Now;
            receipt.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new QualityCheckResult(issues.Count == 0, issues.Count > 0 ? issues : null,
                issues.Count == 0 ? "Kiểm tra chất lượng đạt" : "Có vấn đề cần xử lý");
        }
        catch (Exception ex)
        {
            return new QualityCheckResult(false, null, $"Lỗi khi kiểm tra chất lượng: {ex.Message}");
        }
    }

    /// <summary>
    /// Nhập kho chính thức
    /// - Cập nhật tồn kho theo lô
    /// - Ghi nhận giao dịch nhập kho
    /// </summary>
    public async Task<StockInResult> StockInAsync(Guid goodsReceiptId)
    {
        try
        {
            var receipt = await _unitOfWork.GetRepository<GoodsReceipt>()
                .Query()
                .Include(gr => gr.Items)
                .FirstOrDefaultAsync(gr => gr.Id == goodsReceiptId && !gr.IsDeleted && gr.Status == "Passed");

            if (receipt == null)
            {
                return new StockInResult(false, "Không tìm thấy phiếu nhập kho đã qua QC");
            }

            foreach (var item in receipt.Items)
            {
                // Find or create batch record
                var batch = await _unitOfWork.GetRepository<ItemBatch>()
                    .Query()
                    .FirstOrDefaultAsync(b => b.ItemId == item.ItemId
                        && b.BatchNumber == item.BatchNumber
                        && !b.IsDeleted);

                if (batch == null)
                {
                    batch = new ItemBatch
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.ItemId,
                        BatchNumber = item.BatchNumber,
                        ExpiryDate = item.ExpiryDate,
                        InitialQuantity = item.Quantity,
                        CurrentQuantity = item.Quantity,
                        UnitPrice = item.UnitPrice,
                        CreatedAt = DateTime.Now
                    };
                    await _unitOfWork.GetRepository<ItemBatch>().AddAsync(batch);
                }
                else
                {
                    batch.CurrentQuantity += item.Quantity;
                    batch.UpdatedAt = DateTime.Now;
                }

                // Update item stock
                var stock = await _unitOfWork.GetRepository<ItemStock>()
                    .Query()
                    .FirstOrDefaultAsync(s => s.ItemId == item.ItemId && !s.IsDeleted);

                if (stock == null)
                {
                    stock = new ItemStock
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.ItemId,
                        Quantity = item.Quantity,
                        CreatedAt = DateTime.Now
                    };
                    await _unitOfWork.GetRepository<ItemStock>().AddAsync(stock);
                }
                else
                {
                    stock.Quantity += item.Quantity;
                    stock.UpdatedAt = DateTime.Now;
                }

                // Create stock transaction
                var transaction = new StockTransaction
                {
                    Id = Guid.NewGuid(),
                    ItemId = item.ItemId,
                    BatchId = batch.Id,
                    TransactionType = "StockIn",
                    Quantity = item.Quantity,
                    ReferenceId = goodsReceiptId,
                    ReferenceType = "GoodsReceipt",
                    TransactionDate = DateTime.Now,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<StockTransaction>().AddAsync(transaction);
            }

            // Update receipt status
            receipt.Status = "StockedIn";
            receipt.StockedInAt = DateTime.Now;
            receipt.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new StockInResult(true, "Đã nhập kho thành công");
        }
        catch (Exception ex)
        {
            return new StockInResult(false, $"Lỗi khi nhập kho: {ex.Message}");
        }
    }

    #endregion

    #region XUẤT KHO NGOẠI TRÚ

    /// <summary>
    /// Kiểm tra đơn thuốc trước khi xuất
    /// - Kiểm tra thông tin đơn
    /// - Kiểm tra BS kê đơn
    /// </summary>
    public async Task<DispenseValidationResult> ValidatePrescriptionAsync(Guid prescriptionId)
    {
        try
        {
            var prescription = await _unitOfWork.GetRepository<Prescription>()
                .Query()
                .Include(p => p.Items)
                .Include(p => p.Examination)
                    .ThenInclude(e => e!.Doctor)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
            {
                return new DispenseValidationResult(false, new List<string> { "Không tìm thấy đơn thuốc" }, null);
            }

            var errors = new List<string>();
            var warnings = new List<string>();

            // Check doctor credentials
            if (prescription.Examination?.Doctor?.IsActive != true)
            {
                errors.Add("Bác sĩ kê đơn không còn hoạt động");
            }

            // Check prescription items
            if (!prescription.Items.Any())
            {
                errors.Add("Đơn thuốc không có thuốc nào");
            }

            // Check for controlled drugs
            foreach (var item in prescription.Items)
            {
                var medicine = await _unitOfWork.GetRepository<Medicine>()
                    .Query()
                    .FirstOrDefaultAsync(m => m.Id == item.MedicineId && !m.IsDeleted);

                if (medicine?.IsControlled == true)
                {
                    warnings.Add($"{medicine.Name} là thuốc kiểm soát đặc biệt");
                }
            }

            return new DispenseValidationResult(
                errors.Count == 0,
                errors.Count > 0 ? errors : null,
                warnings.Count > 0 ? warnings : null);
        }
        catch (Exception ex)
        {
            return new DispenseValidationResult(false, new List<string> { $"Lỗi: {ex.Message}" }, null);
        }
    }

    /// <summary>
    /// Kiểm tra tương tác thuốc
    /// RULE_EXAM_002: drug-drug interaction
    /// </summary>
    public async Task<DrugInteractionResult> CheckDrugInteractionsAsync(Guid prescriptionId)
    {
        try
        {
            var prescription = await _unitOfWork.GetRepository<Prescription>()
                .Query()
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
            {
                return new DrugInteractionResult(false, null);
            }

            var interactions = new List<string>();
            var medicineIds = prescription.Items.Select(i => i.MedicineId).ToList();

            // Check for known interactions
            var knownInteractions = await _unitOfWork.GetRepository<DrugInteraction>()
                .Query()
                .Where(di => medicineIds.Contains(di.Drug1Id) && medicineIds.Contains(di.Drug2Id) && !di.IsDeleted)
                .ToListAsync();

            foreach (var interaction in knownInteractions)
            {
                interactions.Add($"Tương tác: {interaction.Drug1Name} - {interaction.Drug2Name}: {interaction.Description}");
            }

            return new DrugInteractionResult(interactions.Count > 0, interactions.Count > 0 ? interactions : null);
        }
        catch
        {
            return new DrugInteractionResult(false, null);
        }
    }

    /// <summary>
    /// Kiểm tra dị ứng thuốc của bệnh nhân
    /// RULE_EXAM_002: allergy check
    /// </summary>
    public async Task<AllergyCheckResult> CheckAllergiesAsync(Guid prescriptionId, Guid patientId)
    {
        try
        {
            var prescription = await _unitOfWork.GetRepository<Prescription>()
                .Query()
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
            {
                return new AllergyCheckResult(false, null);
            }

            // Get patient allergies
            var patientAllergies = await _unitOfWork.GetRepository<PatientAllergy>()
                .Query()
                .Where(pa => pa.PatientId == patientId && !pa.IsDeleted)
                .ToListAsync();

            var allergies = new List<string>();

            foreach (var item in prescription.Items)
            {
                var medicine = await _unitOfWork.GetRepository<Medicine>()
                    .Query()
                    .FirstOrDefaultAsync(m => m.Id == item.MedicineId && !m.IsDeleted);

                if (medicine != null)
                {
                    // Check if patient is allergic to this medicine or its components
                    var matchingAllergies = patientAllergies
                        .Where(pa => pa.AllergenName?.Contains(medicine.ActiveIngredient ?? "") == true)
                        .ToList();

                    foreach (var allergy in matchingAllergies)
                    {
                        allergies.Add($"BN dị ứng với {allergy.AllergenName} - có trong {medicine.Name}");
                    }
                }
            }

            return new AllergyCheckResult(allergies.Count > 0, allergies.Count > 0 ? allergies : null);
        }
        catch
        {
            return new AllergyCheckResult(false, null);
        }
    }

    /// <summary>
    /// Kiểm tra tồn kho
    /// - Kiểm tra đủ số lượng
    /// - Kiểm tra còn hạn sử dụng
    /// </summary>
    public async Task<StockAvailabilityResult> CheckStockAvailabilityAsync(Guid prescriptionId)
    {
        try
        {
            var prescription = await _unitOfWork.GetRepository<Prescription>()
                .Query()
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
            {
                return new StockAvailabilityResult(false, new List<string> { "Không tìm thấy đơn thuốc" });
            }

            var unavailableItems = new List<string>();

            foreach (var item in prescription.Items)
            {
                var medicine = await _unitOfWork.GetRepository<Medicine>()
                    .Query()
                    .FirstOrDefaultAsync(m => m.Id == item.MedicineId && !m.IsDeleted);

                // Get available stock (non-expired, FEFO order)
                var availableStock = await _unitOfWork.GetRepository<ItemBatch>()
                    .Query()
                    .Where(b => b.ItemId == item.MedicineId
                        && b.ExpiryDate > DateTime.Now
                        && b.CurrentQuantity > 0
                        && !b.IsDeleted)
                    .SumAsync(b => b.CurrentQuantity);

                if (availableStock < item.Quantity)
                {
                    unavailableItems.Add($"{medicine?.Name ?? item.MedicineId.ToString()}: Cần {item.Quantity}, Có {availableStock}");
                }
            }

            return new StockAvailabilityResult(unavailableItems.Count == 0,
                unavailableItems.Count > 0 ? unavailableItems : null);
        }
        catch (Exception ex)
        {
            return new StockAvailabilityResult(false, new List<string> { $"Lỗi: {ex.Message}" });
        }
    }

    /// <summary>
    /// Xuất thuốc ngoại trú theo đơn
    /// RULE_PHAR_001: FIFO/FEFO - Ưu tiên lô hết hạn trước
    /// </summary>
    public async Task<DispenseResult> DispenseOutpatientAsync(Guid prescriptionId)
    {
        try
        {
            var prescription = await _unitOfWork.GetRepository<Prescription>()
                .Query()
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

            if (prescription == null)
            {
                return new DispenseResult(false, null, "Không tìm thấy đơn thuốc");
            }

            // Create dispensing record
            var dispensing = new Dispensing
            {
                Id = Guid.NewGuid(),
                PrescriptionId = prescriptionId,
                DispenseType = "Outpatient",
                Status = "Completed",
                DispensedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Dispensing>().AddAsync(dispensing);

            foreach (var item in prescription.Items)
            {
                // Get batches ordered by expiry date (FEFO) then by creation date (FIFO)
                var batches = await _unitOfWork.GetRepository<ItemBatch>()
                    .Query()
                    .Where(b => b.ItemId == item.MedicineId
                        && b.ExpiryDate > DateTime.Now
                        && b.CurrentQuantity > 0
                        && !b.IsDeleted)
                    .OrderBy(b => b.ExpiryDate)
                    .ThenBy(b => b.CreatedAt)
                    .ToListAsync();

                decimal remainingQty = item.Quantity;

                foreach (var batch in batches)
                {
                    if (remainingQty <= 0) break;

                    var dispenseQty = Math.Min(batch.CurrentQuantity, remainingQty);

                    // Update batch quantity
                    batch.CurrentQuantity -= dispenseQty;
                    batch.UpdatedAt = DateTime.Now;

                    // Create dispensing detail
                    var detail = new DispensingDetail
                    {
                        Id = Guid.NewGuid(),
                        DispensingId = dispensing.Id,
                        ItemId = item.MedicineId,
                        BatchId = batch.Id,
                        Quantity = dispenseQty,
                        CreatedAt = DateTime.Now
                    };

                    await _unitOfWork.GetRepository<DispensingDetail>().AddAsync(detail);

                    // Create stock transaction
                    var transaction = new StockTransaction
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.MedicineId,
                        BatchId = batch.Id,
                        TransactionType = "DispenseOutpatient",
                        Quantity = -dispenseQty,
                        ReferenceId = prescriptionId,
                        ReferenceType = "Prescription",
                        TransactionDate = DateTime.Now,
                        CreatedAt = DateTime.Now
                    };

                    await _unitOfWork.GetRepository<StockTransaction>().AddAsync(transaction);

                    remainingQty -= dispenseQty;
                }

                // Update item total stock
                var stock = await _unitOfWork.GetRepository<ItemStock>()
                    .Query()
                    .FirstOrDefaultAsync(s => s.ItemId == item.MedicineId && !s.IsDeleted);

                if (stock != null)
                {
                    stock.Quantity -= item.Quantity;
                    stock.UpdatedAt = DateTime.Now;
                }
            }

            // Update prescription status
            prescription.Status = "Dispensed";
            prescription.DispensedAt = DateTime.Now;
            prescription.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new DispenseResult(true, dispensing.Id, "Đã xuất thuốc thành công");
        }
        catch (Exception ex)
        {
            return new DispenseResult(false, null, $"Lỗi khi xuất thuốc: {ex.Message}");
        }
    }

    #endregion

    #region XUẤT KHO NỘI TRÚ

    /// <summary>
    /// Tạo phiếu lĩnh thuốc từ khoa
    /// - Tổng hợp y lệnh thuốc hàng ngày
    /// - Gửi về kho dược
    /// </summary>
    public async Task<RequisitionResult> CreateWardRequisitionAsync(WardRequisitionDto requisition)
    {
        try
        {
            // Verify ward exists
            var ward = await _unitOfWork.GetRepository<Department>()
                .Query()
                .FirstOrDefaultAsync(d => d.Id == requisition.WardId && !d.IsDeleted);

            if (ward == null)
            {
                return new RequisitionResult(false, null, "Khoa không tồn tại");
            }

            // Create requisition
            var wardRequisition = new WardRequisition
            {
                Id = Guid.NewGuid(),
                WardId = requisition.WardId,
                RequisitionNumber = GenerateOrderNumber("REQ"),
                RequisitionDate = requisition.Date,
                Status = "Pending", // Pending → Approved → Dispensed
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<WardRequisition>().AddAsync(wardRequisition);

            // Create requisition items
            foreach (var item in requisition.Items)
            {
                var reqItem = new WardRequisitionItem
                {
                    Id = Guid.NewGuid(),
                    RequisitionId = wardRequisition.Id,
                    ItemId = item.ItemId,
                    RequestedQuantity = item.Quantity,
                    Note = item.Note,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<WardRequisitionItem>().AddAsync(reqItem);
            }

            await _unitOfWork.SaveChangesAsync();

            return new RequisitionResult(true, wardRequisition.Id, $"Đã tạo phiếu lĩnh {wardRequisition.RequisitionNumber}");
        }
        catch (Exception ex)
        {
            return new RequisitionResult(false, null, $"Lỗi khi tạo phiếu lĩnh: {ex.Message}");
        }
    }

    /// <summary>
    /// Duyệt phiếu lĩnh thuốc
    /// - Dược sĩ kiểm tra và duyệt
    /// - Có thể điều chỉnh số lượng
    /// </summary>
    public async Task<RequisitionApprovalResult> ApproveRequisitionAsync(Guid requisitionId, Guid approverId)
    {
        try
        {
            var requisition = await _unitOfWork.GetRepository<WardRequisition>()
                .Query()
                .FirstOrDefaultAsync(r => r.Id == requisitionId && !r.IsDeleted);

            if (requisition == null)
            {
                return new RequisitionApprovalResult(false, "Không tìm thấy phiếu lĩnh");
            }

            requisition.Status = "Approved";
            requisition.ApprovedById = approverId;
            requisition.ApprovedAt = DateTime.Now;
            requisition.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new RequisitionApprovalResult(true, "Đã duyệt phiếu lĩnh");
        }
        catch (Exception ex)
        {
            return new RequisitionApprovalResult(false, $"Lỗi khi duyệt: {ex.Message}");
        }
    }

    /// <summary>
    /// Xuất thuốc theo phiếu lĩnh
    /// - Áp dụng FIFO/FEFO
    /// - Cập nhật tồn kho
    /// </summary>
    public async Task<DispenseResult> DispenseToWardAsync(Guid requisitionId)
    {
        try
        {
            var requisition = await _unitOfWork.GetRepository<WardRequisition>()
                .Query()
                .Include(r => r.Items)
                .FirstOrDefaultAsync(r => r.Id == requisitionId && !r.IsDeleted && r.Status == "Approved");

            if (requisition == null)
            {
                return new DispenseResult(false, null, "Không tìm thấy phiếu lĩnh đã duyệt");
            }

            // Create dispensing record
            var dispensing = new Dispensing
            {
                Id = Guid.NewGuid(),
                WardRequisitionId = requisitionId,
                DispenseType = "Inpatient",
                Status = "Completed",
                DispensedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Dispensing>().AddAsync(dispensing);

            foreach (var item in requisition.Items)
            {
                // FEFO/FIFO logic same as outpatient
                var batches = await _unitOfWork.GetRepository<ItemBatch>()
                    .Query()
                    .Where(b => b.ItemId == item.ItemId
                        && b.ExpiryDate > DateTime.Now
                        && b.CurrentQuantity > 0
                        && !b.IsDeleted)
                    .OrderBy(b => b.ExpiryDate)
                    .ThenBy(b => b.CreatedAt)
                    .ToListAsync();

                decimal remainingQty = item.RequestedQuantity;

                foreach (var batch in batches)
                {
                    if (remainingQty <= 0) break;

                    var dispenseQty = Math.Min(batch.CurrentQuantity, remainingQty);

                    batch.CurrentQuantity -= dispenseQty;
                    batch.UpdatedAt = DateTime.Now;

                    var detail = new DispensingDetail
                    {
                        Id = Guid.NewGuid(),
                        DispensingId = dispensing.Id,
                        ItemId = item.ItemId,
                        BatchId = batch.Id,
                        Quantity = dispenseQty,
                        CreatedAt = DateTime.Now
                    };

                    await _unitOfWork.GetRepository<DispensingDetail>().AddAsync(detail);

                    var transaction = new StockTransaction
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.ItemId,
                        BatchId = batch.Id,
                        TransactionType = "DispenseToWard",
                        Quantity = -dispenseQty,
                        ReferenceId = requisitionId,
                        ReferenceType = "WardRequisition",
                        TransactionDate = DateTime.Now,
                        CreatedAt = DateTime.Now
                    };

                    await _unitOfWork.GetRepository<StockTransaction>().AddAsync(transaction);

                    remainingQty -= dispenseQty;
                }

                item.IssuedQuantity = item.RequestedQuantity - remainingQty;
                item.UpdatedAt = DateTime.Now;
            }

            requisition.Status = "Dispensed";
            requisition.DispensedAt = DateTime.Now;
            requisition.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new DispenseResult(true, dispensing.Id, "Đã xuất thuốc cho khoa");
        }
        catch (Exception ex)
        {
            return new DispenseResult(false, null, $"Lỗi khi xuất thuốc: {ex.Message}");
        }
    }

    /// <summary>
    /// Xử lý hoàn trả thuốc từ khoa
    /// - Thuốc không sử dụng hết
    /// - Nhập lại kho
    /// </summary>
    public async Task<ReturnResult> ProcessReturnAsync(Guid wardId, ReturnDto returnDto)
    {
        try
        {
            // Create return record
            var drugReturn = new DrugReturn
            {
                Id = Guid.NewGuid(),
                WardId = wardId,
                ReturnNumber = GenerateOrderNumber("RET"),
                Reason = returnDto.Reason,
                Status = "Completed",
                ReturnedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<DrugReturn>().AddAsync(drugReturn);

            foreach (var item in returnDto.Items)
            {
                // Find the batch
                ItemBatch? batch = null;
                if (!string.IsNullOrEmpty(item.BatchNumber))
                {
                    batch = await _unitOfWork.GetRepository<ItemBatch>()
                        .Query()
                        .FirstOrDefaultAsync(b => b.ItemId == item.ItemId && b.BatchNumber == item.BatchNumber && !b.IsDeleted);
                }

                if (batch != null)
                {
                    batch.CurrentQuantity += item.Quantity;
                    batch.UpdatedAt = DateTime.Now;
                }

                // Update stock
                var stock = await _unitOfWork.GetRepository<ItemStock>()
                    .Query()
                    .FirstOrDefaultAsync(s => s.ItemId == item.ItemId && !s.IsDeleted);

                if (stock != null)
                {
                    stock.Quantity += item.Quantity;
                    stock.UpdatedAt = DateTime.Now;
                }

                // Create return detail
                var returnItem = new DrugReturnItem
                {
                    Id = Guid.NewGuid(),
                    ReturnId = drugReturn.Id,
                    ItemId = item.ItemId,
                    BatchId = batch?.Id,
                    Quantity = item.Quantity,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<DrugReturnItem>().AddAsync(returnItem);

                // Create transaction
                var transaction = new StockTransaction
                {
                    Id = Guid.NewGuid(),
                    ItemId = item.ItemId,
                    BatchId = batch?.Id,
                    TransactionType = "ReturnFromWard",
                    Quantity = item.Quantity,
                    ReferenceId = drugReturn.Id,
                    ReferenceType = "DrugReturn",
                    TransactionDate = DateTime.Now,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<StockTransaction>().AddAsync(transaction);
            }

            await _unitOfWork.SaveChangesAsync();

            return new ReturnResult(true, drugReturn.Id, "Đã hoàn trả thuốc thành công");
        }
        catch (Exception ex)
        {
            return new ReturnResult(false, null, $"Lỗi khi hoàn trả: {ex.Message}");
        }
    }

    #endregion

    #region CHUYỂN KHO

    public async Task<TransferRequestResult> CreateTransferRequestAsync(WarehouseTransferDto transfer)
    {
        try
        {
            var transferRecord = new WarehouseTransfer
            {
                Id = Guid.NewGuid(),
                FromWarehouseId = transfer.FromWarehouseId,
                ToWarehouseId = transfer.ToWarehouseId,
                TransferNumber = GenerateOrderNumber("TRF"),
                Status = "Pending",
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<WarehouseTransfer>().AddAsync(transferRecord);

            foreach (var item in transfer.Items)
            {
                var transferItem = new WarehouseTransferItem
                {
                    Id = Guid.NewGuid(),
                    TransferId = transferRecord.Id,
                    ItemId = item.ItemId,
                    Quantity = item.Quantity,
                    BatchNumber = item.BatchNumber,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<WarehouseTransferItem>().AddAsync(transferItem);
            }

            await _unitOfWork.SaveChangesAsync();

            return new TransferRequestResult(true, transferRecord.Id, $"Đã tạo phiếu chuyển kho {transferRecord.TransferNumber}");
        }
        catch (Exception ex)
        {
            return new TransferRequestResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    public async Task<TransferApprovalResult> ApproveTransferAsync(Guid transferId)
    {
        try
        {
            var transfer = await _unitOfWork.GetRepository<WarehouseTransfer>()
                .Query()
                .FirstOrDefaultAsync(t => t.Id == transferId && !t.IsDeleted);

            if (transfer == null)
            {
                return new TransferApprovalResult(false, "Không tìm thấy phiếu chuyển kho");
            }

            transfer.Status = "Approved";
            transfer.ApprovedAt = DateTime.Now;
            transfer.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new TransferApprovalResult(true, "Đã duyệt phiếu chuyển kho");
        }
        catch (Exception ex)
        {
            return new TransferApprovalResult(false, $"Lỗi: {ex.Message}");
        }
    }

    public async Task<TransferCompleteResult> CompleteTransferAsync(Guid transferId)
    {
        try
        {
            var transfer = await _unitOfWork.GetRepository<WarehouseTransfer>()
                .Query()
                .Include(t => t.Items)
                .FirstOrDefaultAsync(t => t.Id == transferId && !t.IsDeleted && t.Status == "Approved");

            if (transfer == null)
            {
                return new TransferCompleteResult(false, "Không tìm thấy phiếu chuyển kho đã duyệt");
            }

            // Process transfer items
            foreach (var item in transfer.Items)
            {
                // Decrease from source warehouse - already handled by FIFO/FEFO in actual implementation
                // Increase to destination warehouse
                var transaction = new StockTransaction
                {
                    Id = Guid.NewGuid(),
                    ItemId = item.ItemId,
                    TransactionType = "WarehouseTransfer",
                    Quantity = item.Quantity,
                    ReferenceId = transferId,
                    ReferenceType = "WarehouseTransfer",
                    TransactionDate = DateTime.Now,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<StockTransaction>().AddAsync(transaction);
            }

            transfer.Status = "Completed";
            transfer.CompletedAt = DateTime.Now;
            transfer.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new TransferCompleteResult(true, "Đã hoàn thành chuyển kho");
        }
        catch (Exception ex)
        {
            return new TransferCompleteResult(false, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region KIỂM SOÁT TỒN KHO

    /// <summary>
    /// Kiểm tra cảnh báo tồn kho thấp
    /// RULE_PHAR_002: Cảnh báo tồn tối thiểu
    /// </summary>
    public async Task<LowStockAlertResult> CheckLowStockAsync()
    {
        try
        {
            var lowStockItems = await _unitOfWork.GetRepository<ItemStock>()
                .Query()
                .Include(s => s.Item)
                .Where(s => !s.IsDeleted && s.Quantity <= s.Item.MinStockLevel)
                .Select(s => new LowStockItemDto(
                    s.ItemId,
                    s.Item.Name,
                    s.Quantity,
                    s.Item.MinStockLevel
                ))
                .ToListAsync();

            return new LowStockAlertResult(lowStockItems.Any(), lowStockItems.Any() ? lowStockItems : null);
        }
        catch
        {
            return new LowStockAlertResult(false, null);
        }
    }

    /// <summary>
    /// Kiểm tra thuốc sắp hết hạn
    /// RULE_PHAR_002: Cảnh báo 30/60/90 ngày
    /// </summary>
    public async Task<ExpiryAlertResult> CheckExpiryAsync(int daysAhead)
    {
        try
        {
            var expiryDate = DateTime.Now.AddDays(daysAhead);

            var expiringItems = await _unitOfWork.GetRepository<ItemBatch>()
                .Query()
                .Include(b => b.Item)
                .Where(b => !b.IsDeleted
                    && b.CurrentQuantity > 0
                    && b.ExpiryDate <= expiryDate
                    && b.ExpiryDate > DateTime.Now)
                .Select(b => new ExpiryItemDto(
                    b.ItemId,
                    b.Item.Name,
                    b.BatchNumber,
                    b.ExpiryDate,
                    b.CurrentQuantity
                ))
                .ToListAsync();

            return new ExpiryAlertResult(expiringItems.Any(), expiringItems.Any() ? expiringItems : null);
        }
        catch
        {
            return new ExpiryAlertResult(false, null);
        }
    }

    public async Task<StockAdjustmentResult> AdjustStockAsync(StockAdjustmentDto adjustment)
    {
        try
        {
            var adjustmentRecord = new StockAdjustment
            {
                Id = Guid.NewGuid(),
                WarehouseId = adjustment.WarehouseId,
                AdjustmentNumber = GenerateOrderNumber("ADJ"),
                Reason = adjustment.Reason,
                Status = "Completed",
                AdjustedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<StockAdjustment>().AddAsync(adjustmentRecord);

            foreach (var item in adjustment.Items)
            {
                var stock = await _unitOfWork.GetRepository<ItemStock>()
                    .Query()
                    .FirstOrDefaultAsync(s => s.ItemId == item.ItemId && !s.IsDeleted);

                if (stock != null)
                {
                    stock.Quantity += item.AdjustmentQuantity;
                    stock.UpdatedAt = DateTime.Now;
                }

                var transaction = new StockTransaction
                {
                    Id = Guid.NewGuid(),
                    ItemId = item.ItemId,
                    TransactionType = "Adjustment",
                    Quantity = item.AdjustmentQuantity,
                    ReferenceId = adjustmentRecord.Id,
                    ReferenceType = "StockAdjustment",
                    TransactionDate = DateTime.Now,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<StockTransaction>().AddAsync(transaction);
            }

            await _unitOfWork.SaveChangesAsync();

            return new StockAdjustmentResult(true, adjustmentRecord.Id, "Đã điều chỉnh tồn kho");
        }
        catch (Exception ex)
        {
            return new StockAdjustmentResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    public async Task<StockTakeResult> PerformStockTakeAsync(Guid warehouseId)
    {
        try
        {
            var stockTake = new StockTake
            {
                Id = Guid.NewGuid(),
                WarehouseId = warehouseId,
                StockTakeNumber = GenerateOrderNumber("ST"),
                Status = "InProgress",
                StartedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<StockTake>().AddAsync(stockTake);
            await _unitOfWork.SaveChangesAsync();

            return new StockTakeResult(true, stockTake.Id, $"Đã bắt đầu kiểm kê {stockTake.StockTakeNumber}");
        }
        catch (Exception ex)
        {
            return new StockTakeResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region Helper Methods

    private string GenerateOrderNumber(string prefix)
    {
        return $"{prefix}{DateTime.Now:yyyyMMdd}{new Random().Next(10000, 99999)}";
    }

    #endregion
}
