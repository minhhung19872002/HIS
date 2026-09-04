using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Core.Constants;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// #364 wave-8b (2026-07-17): tach 10.1.5 Refunds khoi BillingCompleteService.Payments.cs
public partial class BillingCompleteService {

    #region 10.1.5 Refunds

    public async Task<List<RefundableItemDto>> GetRefundableItemsAsync(Guid patientId, Guid? medicalRecordId)
    {
        // Dịch vụ: phiếu chỉ định ĐÃ THANH TOÁN, chưa hủy, BN có phải trả
        var serviceQuery = _context.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecord.PatientId == patientId
                && d.ServiceRequest.IsPaid
                && d.ServiceRequest.Status != 4
                && d.Status != 3
                && d.PatientAmount > 0);
        if (medicalRecordId.HasValue)
            serviceQuery = serviceQuery.Where(d => d.ServiceRequest.MedicalRecordId == medicalRecordId.Value);

        var services = await serviceQuery
            .OrderByDescending(d => d.ServiceRequest.RequestDate)
            .ToBoundedListAsync("BillingCompleteService.GetRefundableItemsAsync.Services");

        // Thuốc: đơn đã duyệt/đã cấp phát, chưa hủy, dòng chưa hoàn trả, BN có phải trả
        // (Prescription không có cờ IsPaid — phiếu hoàn luôn Status=0 chờ kế toán duyệt nên fail-safe)
        var medicineQuery = _context.PrescriptionDetails
            .Include(d => d.Medicine)
            .Include(d => d.Prescription)
            .Where(d => d.Prescription.MedicalRecord.PatientId == patientId
                && (d.Prescription.Status == 1 || d.Prescription.Status == 2)
                && d.Status != 2
                && d.PatientAmount > 0);
        if (medicalRecordId.HasValue)
            medicineQuery = medicineQuery.Where(d => d.Prescription.MedicalRecordId == medicalRecordId.Value);

        var medicines = await medicineQuery
            .OrderByDescending(d => d.Prescription.PrescriptionDate)
            .ToBoundedListAsync("BillingCompleteService.GetRefundableItemsAsync.Medicines");

        var result = services.Select(d => new RefundableItemDto
        {
            Id = d.Id,
            ItemType = "service",
            Name = d.Service?.ServiceName ?? "",
            Quantity = d.Quantity,
            Amount = d.Amount,
            PatientAmount = d.PatientAmount,
            PatientType = d.PatientType,
            HasResult = !string.IsNullOrWhiteSpace(d.Result),
            IsDispensed = false
        }).ToList();

        result.AddRange(medicines.Select(d => new RefundableItemDto
        {
            Id = d.Id,
            ItemType = "medicine",
            Name = d.Medicine?.MedicineName ?? "",
            Quantity = d.Quantity,
            Amount = d.Amount,
            PatientAmount = d.PatientAmount,
            PatientType = d.PatientType,
            HasResult = false,
            IsDispensed = d.Prescription.IsDispensed || d.Status == 1
        }));

        return result;
    }

    public async Task<List<PatientPaymentBriefDto>> GetPatientPaymentsAsync(Guid patientId)
    {
        // Phiếu thanh toán (ReceiptType=2) đã thu (Status=1) — nguồn chọn phiếu gốc cho RefundType=2
        var receipts = await _context.Receipts
            .Where(r => r.PatientId == patientId && r.ReceiptType == 2 && r.Status == 1)
            .OrderByDescending(r => r.ReceiptDate)
            .ToBoundedListAsync("BillingCompleteService.GetPatientPaymentsAsync");

        return receipts.Select(r => new PatientPaymentBriefDto
        {
            Id = r.Id,
            ReceiptCode = r.ReceiptCode,
            ReceiptDate = r.ReceiptDate,
            FinalAmount = r.FinalAmount,
            PaymentMethod = r.PaymentMethod,
            Note = r.Note
        }).ToList();
    }

    public async Task<RefundDto> CreateRefundAsync(CreateRefundDto dto, Guid userId)
    {
        var patient = await _context.Patients.FindAsync(dto.PatientId);
        if (patient == null)
            throw new KeyNotFoundException("Patient not found");
        // #189: chặn số tiền hoàn <= 0 (chống "hoàn âm" = rút tiền bệnh nhân)
        if (dto.RefundAmount <= 0)
            throw new InvalidOperationException("Số tiền hoàn phải lớn hơn 0");

        // Verify original payment/deposit exists and has sufficient amount
        if (dto.RefundType == 1 && dto.OriginalDepositId.HasValue)
        {
            var originalDeposit = await _context.Deposits.FindAsync(dto.OriginalDepositId.Value);
            if (originalDeposit == null)
                throw new KeyNotFoundException("Phiếu tạm ứng gốc không tồn tại");
            var availableAmount = originalDeposit.Amount - originalDeposit.UsedAmount;
            if (dto.RefundAmount > availableAmount)
                throw new InvalidOperationException($"Số tiền hoàn ({dto.RefundAmount:N0}đ) vượt quá số dư tạm ứng ({availableAmount:N0}đ)");
        }
        else if (dto.RefundType == 2 && dto.OriginalPaymentId.HasValue)
        {
            var originalPayment = await _context.Receipts.FindAsync(dto.OriginalPaymentId.Value);
            if (originalPayment == null)
                throw new KeyNotFoundException("Phiếu thanh toán gốc không tồn tại");
            if (originalPayment.Status == 2)
                throw new InvalidOperationException("Phiếu thanh toán gốc đã bị hủy");
            if (dto.RefundAmount > originalPayment.FinalAmount)
                throw new InvalidOperationException($"Số tiền hoàn ({dto.RefundAmount:N0}đ) vượt quá số tiền đã thanh toán ({originalPayment.FinalAmount:N0}đ)");
        }
        else
        {
            throw new InvalidOperationException("Cần chỉ định phiếu tạm ứng hoặc phiếu thanh toán gốc");
        }

        // Sprint 3 Item 2.5: partial refund validation
        if (dto.Items is { Count: > 0 })
        {
            var sumItems = dto.Items.Sum(i => i.RefundAmount);
            if (Math.Abs(sumItems - dto.RefundAmount) > 0.01m)
                throw new InvalidOperationException(
                    $"Tổng hoàn chi tiết ({sumItems:N0}đ) không khớp với tổng yêu cầu hoàn ({dto.RefundAmount:N0}đ)");

            // #195: nạp 1 lần các dòng cần kiểm tra thay vì 1 query/dòng. Vòng lặp vẫn chạy
            // đúng thứ tự dto.Items nên lỗi nào bật ra trước vẫn y như cũ.
            var refundServiceIds = dto.Items.Where(i => i.ItemType == "service").Select(i => i.ItemId).Distinct().ToList();
            var refundMedicineIds = dto.Items.Where(i => i.ItemType == "medicine").Select(i => i.ItemId).Distinct().ToList();

            var refundServiceDetails = refundServiceIds.Count == 0
                ? new Dictionary<Guid, ServiceRequestDetail>()
                : await _context.ServiceRequestDetails
                    .Include(d => d.ServiceRequest)
                    .Where(d => refundServiceIds.Contains(d.Id))
                    .ToDictionaryAsync(d => d.Id);

            var refundPrescriptionDetails = refundMedicineIds.Count == 0
                ? new Dictionary<Guid, PrescriptionDetail>()
                : await _context.PrescriptionDetails
                    .Include(d => d.Prescription)
                    .Where(d => refundMedicineIds.Contains(d.Id))
                    .ToDictionaryAsync(d => d.Id);

            foreach (var item in dto.Items)
            {
                if (item.ItemType == "service")
                {
                    refundServiceDetails.TryGetValue(item.ItemId, out var sr);
                    if (sr == null) throw new KeyNotFoundException($"Dịch vụ {item.ItemId} không tồn tại");
                    // BHYT không cho hoàn chi tiết CLS đã có kết quả
                    if (sr.PatientType == 1 && !string.IsNullOrWhiteSpace(sr.Result))
                        throw new InvalidOperationException(
                            $"BHYT: không thể hoàn chi tiết CLS đã có kết quả ({sr.ServiceRequest.RequestCode}). Phải hủy KQ trước.");
                }
                else if (item.ItemType == "medicine")
                {
                    refundPrescriptionDetails.TryGetValue(item.ItemId, out var pd);
                    if (pd == null) throw new KeyNotFoundException($"Thuốc {item.ItemId} không tồn tại");
                    if (pd.PatientType == 1)
                        throw new InvalidOperationException(
                            "BHYT: không thể hoàn chi tiết thuốc. Phải hoàn trả toàn bộ toa.");
                }
            }
        }

        // Create refund receipt
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"HT{DateTime.Now:yyyyMMddHHmmssfff}",
            ReceiptDate = DateTime.Now,
            PatientId = dto.PatientId,
            ReceiptType = 3, // Hoàn trả
            PaymentMethod = dto.RefundMethod,
            Amount = dto.RefundAmount,
            Discount = 0,
            FinalAmount = dto.RefundAmount,
            Status = 0, // Chờ duyệt
            CashierId = userId,
            Note = dto.Items is { Count: > 0 }
                ? $"{dto.Reason} | Hoàn chi tiết {dto.Items.Count} mục"
                : dto.Reason,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Receipts.Add(receipt);
        await _context.SaveChangesAsync();

        return new RefundDto
        {
            Id = receipt.Id,
            RefundCode = receipt.ReceiptCode,
            PatientId = dto.PatientId,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            RefundType = dto.RefundType,
            RefundTypeName = dto.RefundType == 1 ? "Hoàn tạm ứng" : "Hoàn thanh toán",
            OriginalDepositId = dto.OriginalDepositId,
            OriginalPaymentId = dto.OriginalPaymentId,
            RefundAmount = dto.RefundAmount,
            RefundMethod = dto.RefundMethod,
            RefundMethodName = GetPaymentMethodName(dto.RefundMethod),
            BankAccount = dto.BankAccount,
            BankName = dto.BankName,
            Reason = dto.Reason,
            CashierId = userId,
            Status = 0,
            StatusName = "Chờ duyệt",
            CreatedAt = receipt.CreatedAt
        };
    }

    public async Task<RefundDto> ApproveRefundAsync(ApproveRefundDto dto, Guid userId)
    {
        var receipt = await _context.Receipts
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.RefundId && r.ReceiptType == 3);
        if (receipt == null)
            throw new KeyNotFoundException("Refund not found");

        // #218/T3: trước đây gán thẳng, nên phiếu đã TỪ CHỐI / đã CHI / đã HỦY vẫn duyệt lại được.
        var target = dto.IsApproved ? RefundStatus.Approved : RefundStatus.Rejected;
        RefundStatus.EnsureCanTransition(receipt.Status, target);

        if (dto.IsApproved)
        {
            receipt.Status = RefundStatus.Approved;
        }
        else
        {
            receipt.Status = RefundStatus.Rejected;
            receipt.Note = $"{receipt.Note} | Từ chối: {dto.RejectReason}";
        }

        await _context.SaveChangesAsync();

        return new RefundDto
        {
            Id = receipt.Id,
            RefundCode = receipt.ReceiptCode,
            PatientId = receipt.PatientId,
            PatientCode = receipt.Patient?.PatientCode ?? string.Empty,
            PatientName = receipt.Patient?.FullName ?? string.Empty,
            RefundAmount = receipt.FinalAmount,
            Reason = receipt.Note ?? string.Empty,
            Status = dto.IsApproved ? 1 : 3,
            StatusName = dto.IsApproved ? "Đã duyệt" : "Từ chối",
            ApprovedBy = userId,
            ApprovedAt = DateTime.Now,
            CreatedAt = receipt.CreatedAt
        };
    }

    public async Task<RefundDto> ConfirmRefundAsync(ConfirmRefundDto dto, Guid userId)
    {
        var receipt = await _context.Receipts
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.RefundId && r.ReceiptType == 3);
        if (receipt == null)
            throw new KeyNotFoundException("Refund not found");

        // #218/T3: đây là lúc TIỀN RA KHỎI QUỸ. Trước đây không kiểm gì, nên chi được cho phiếu
        // chưa từng duyệt, phiếu đã từ chối và cả phiếu đã hủy.
        RefundStatus.EnsureCanTransition(receipt.Status, RefundStatus.Paid);
        receipt.Status = RefundStatus.Paid;
        receipt.Note = $"{receipt.Note} | Xác nhận: {dto.Notes} | Mã GD: {dto.TransactionNumber}";
        receipt.UpdatedAt = DateTime.Now;
        receipt.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        return new RefundDto
        {
            Id = receipt.Id,
            RefundCode = receipt.ReceiptCode,
            PatientId = receipt.PatientId,
            PatientCode = receipt.Patient?.PatientCode ?? string.Empty,
            PatientName = receipt.Patient?.FullName ?? string.Empty,
            RefundAmount = receipt.FinalAmount,
            Reason = receipt.Note ?? string.Empty,
            CashierId = receipt.CashierId,
            Status = 4,
            StatusName = "Đã xác nhận hoàn",
            ConfirmedBy = userId,
            ConfirmedAt = DateTime.Now,
            CreatedAt = receipt.CreatedAt
        };
    }

    public async Task<PagedResultDto<RefundDto>> SearchRefundsAsync(RefundSearchDto dto)
    {
        return new PagedResultDto<RefundDto>
        {
            Items = new List<RefundDto>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50
        };
    }

    public async Task<bool> CancelRefundAsync(Guid refundId, string reason, Guid userId)
    {
        var receipt = await _context.Receipts
            .FirstOrDefaultAsync(r => r.Id == refundId && r.ReceiptType == 3);
        if (receipt == null)
            throw new KeyNotFoundException("Refund not found");
        RefundStatus.EnsureCanTransition(receipt.Status, RefundStatus.Cancelled);
        if (receipt.Status == RefundStatus.Cancelled)
            throw new InvalidOperationException("Refund already cancelled");

        receipt.Status = RefundStatus.Cancelled;
        receipt.Note = $"{receipt.Note} | Hủy: {reason}";
        receipt.UpdatedAt = DateTime.Now;
        receipt.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion
}
