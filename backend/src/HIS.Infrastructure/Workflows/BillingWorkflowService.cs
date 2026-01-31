using HIS.Application.Workflows;
using HIS.Core.Interfaces;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Workflows;

/// <summary>
/// Luồng 7: Thanh toán & Viện phí (Billing Flow)
/// Theo HIS_DataFlow_Architecture.md - Mục 2.6
///
/// LUỒNG CHÍNH:
/// [Kết thúc điều trị] → Tổng hợp chi phí → Tách chi phí theo nguồn
///     → Phần BHYT chi trả / Phần BN tự trả / Phần nguồn khác
///     → Thu ngân thu tiền (Tạm ứng / Thanh toán / Hoàn ứng)
///     → In hóa đơn biên lai → Sổ quỹ
///
/// CHI PHÍ BAO GỒM:
/// - Tiền khám
/// - Tiền giường
/// - Tiền thuốc/VTTH
/// - Tiền XN/CĐHA/TDCN
/// - Tiền PTTT
/// - Tiền vận chuyển
///
/// NGUỒN CHI TRẢ:
/// - BHYT (theo tỷ lệ)
/// - Viện phí (BN tự trả)
/// - Dịch vụ yêu cầu
/// - Nguồn khác (BHNT...)
///
/// LIÊN KẾT MODULE:
/// - Module 2 (Khám bệnh): Chi phí khám ngoại trú
/// - Module 3 (Nội trú): Chi phí nội trú
/// - Module 5 (Kho Dược): Chi phí thuốc
/// - Module 6 (PTTT): Chi phí phẫu thuật
/// - Module 7,8 (XN/CĐHA): Chi phí xét nghiệm, CĐHA
/// - Module 11 (Tài chính): Hạch toán doanh thu
/// - Module 12 (BHYT): Thanh toán BHYT
/// </summary>
public class BillingWorkflowService : IBillingWorkflowService
{
    private readonly IUnitOfWork _unitOfWork;

    public BillingWorkflowService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    #region TỔNG HỢP CHI PHÍ

    /// <summary>
    /// Tổng hợp chi phí ngoại trú (Outpatient)
    /// - Chi phí khám
    /// - Chi phí dịch vụ CLS
    /// - Chi phí thuốc
    /// </summary>
    public async Task<ChargeCollectionResult> CollectChargesAsync(Guid visitId)
    {
        try
        {
            var visit = await _unitOfWork.GetRepository<Visit>()
                .Query()
                .Include(v => v.Patient)
                .Include(v => v.Examination)
                .FirstOrDefaultAsync(v => v.Id == visitId && !v.IsDeleted);

            if (visit == null)
            {
                return new ChargeCollectionResult(false, null, null, "Không tìm thấy lượt khám");
            }

            // Check if charge collection already exists
            var existingCharge = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .FirstOrDefaultAsync(cc => cc.VisitId == visitId && !cc.IsDeleted);

            if (existingCharge != null)
            {
                return new ChargeCollectionResult(true, existingCharge.Id, existingCharge.TotalAmount, "Đã tổng hợp chi phí trước đó");
            }

            // Create charge collection
            var chargeCollection = new ChargeCollection
            {
                Id = Guid.NewGuid(),
                VisitId = visitId,
                PatientId = visit.PatientId,
                ChargeType = "Outpatient",
                Status = "Pending", // Pending → Invoiced → Paid
                CreatedAt = DateTime.Now
            };

            decimal totalAmount = 0;

            // 1. Examination fee
            if (visit.Examination != null)
            {
                var examFee = await _unitOfWork.GetRepository<Service>()
                    .Query()
                    .Where(s => s.ServiceType == "Examination" && !s.IsDeleted)
                    .Select(s => s.Price)
                    .FirstOrDefaultAsync();

                if (examFee > 0)
                {
                    var chargeItem = new ChargeItem
                    {
                        Id = Guid.NewGuid(),
                        ChargeCollectionId = chargeCollection.Id,
                        ChargeType = "Examination",
                        Description = "Phí khám bệnh",
                        Quantity = 1,
                        UnitPrice = examFee,
                        Amount = examFee,
                        CreatedAt = DateTime.Now
                    };
                    await _unitOfWork.GetRepository<ChargeItem>().AddAsync(chargeItem);
                    totalAmount += examFee;
                }
            }

            // 2. Service orders (Lab, Imaging, etc.)
            var serviceOrders = await _unitOfWork.GetRepository<ServiceOrderItem>()
                .Query()
                .Include(soi => soi.ServiceOrder)
                .Include(soi => soi.Service)
                .Where(soi => soi.ServiceOrder!.VisitId == visitId && !soi.IsDeleted)
                .ToListAsync();

            foreach (var item in serviceOrders)
            {
                var chargeItem = new ChargeItem
                {
                    Id = Guid.NewGuid(),
                    ChargeCollectionId = chargeCollection.Id,
                    ChargeType = item.Service?.ServiceType ?? "Service",
                    Description = item.Service?.Name ?? "Dịch vụ",
                    ServiceId = item.ServiceId,
                    Quantity = item.Quantity,
                    UnitPrice = item.Service?.Price ?? 0,
                    Amount = item.Quantity * (item.Service?.Price ?? 0),
                    CreatedAt = DateTime.Now
                };
                await _unitOfWork.GetRepository<ChargeItem>().AddAsync(chargeItem);
                totalAmount += chargeItem.Amount;
            }

            // 3. Prescription (medicines)
            var prescriptions = await _unitOfWork.GetRepository<PrescriptionItem>()
                .Query()
                .Include(pi => pi.Prescription)
                .Include(pi => pi.Medicine)
                .Where(pi => pi.Prescription!.VisitId == visitId && !pi.IsDeleted)
                .ToListAsync();

            foreach (var item in prescriptions)
            {
                var chargeItem = new ChargeItem
                {
                    Id = Guid.NewGuid(),
                    ChargeCollectionId = chargeCollection.Id,
                    ChargeType = "Medicine",
                    Description = item.Medicine?.Name ?? "Thuốc",
                    MedicineId = item.MedicineId,
                    Quantity = item.Quantity,
                    UnitPrice = item.Medicine?.Price ?? 0,
                    Amount = item.Quantity * (item.Medicine?.Price ?? 0),
                    CreatedAt = DateTime.Now
                };
                await _unitOfWork.GetRepository<ChargeItem>().AddAsync(chargeItem);
                totalAmount += chargeItem.Amount;
            }

            chargeCollection.TotalAmount = totalAmount;
            await _unitOfWork.GetRepository<ChargeCollection>().AddAsync(chargeCollection);
            await _unitOfWork.SaveChangesAsync();

            return new ChargeCollectionResult(true, chargeCollection.Id, totalAmount, "Đã tổng hợp chi phí ngoại trú");
        }
        catch (Exception ex)
        {
            return new ChargeCollectionResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Tổng hợp chi phí nội trú (Inpatient)
    /// - Chi phí giường
    /// - Chi phí điều trị hàng ngày
    /// - Chi phí phẫu thuật
    /// - Chi phí thuốc, vật tư
    /// </summary>
    public async Task<ChargeCollectionResult> CollectInpatientChargesAsync(Guid admissionId)
    {
        try
        {
            var admission = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .Include(a => a.Patient)
                .Include(a => a.BedAssignment)
                    .ThenInclude(ba => ba!.Bed)
                .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

            if (admission == null)
            {
                return new ChargeCollectionResult(false, null, null, "Không tìm thấy bệnh án nội trú");
            }

            var chargeCollection = new ChargeCollection
            {
                Id = Guid.NewGuid(),
                AdmissionId = admissionId,
                PatientId = admission.PatientId,
                ChargeType = "Inpatient",
                Status = "Pending",
                CreatedAt = DateTime.Now
            };

            decimal totalAmount = 0;

            // 1. Bed fee (per day)
            if (admission.BedAssignment?.Bed != null)
            {
                var days = (int)Math.Ceiling((admission.DischargedAt ?? DateTime.Now).Subtract(admission.AdmittedAt).TotalDays);
                days = Math.Max(days, 1);

                var bedFee = admission.BedAssignment.Bed.DailyRate * days;
                var chargeItem = new ChargeItem
                {
                    Id = Guid.NewGuid(),
                    ChargeCollectionId = chargeCollection.Id,
                    ChargeType = "Bed",
                    Description = $"Tiền giường ({admission.BedAssignment.Bed.Name}) x {days} ngày",
                    Quantity = days,
                    UnitPrice = admission.BedAssignment.Bed.DailyRate,
                    Amount = bedFee,
                    CreatedAt = DateTime.Now
                };
                await _unitOfWork.GetRepository<ChargeItem>().AddAsync(chargeItem);
                totalAmount += bedFee;
            }

            // 2. Treatment services
            var treatmentServices = await _unitOfWork.GetRepository<ServiceOrderItem>()
                .Query()
                .Include(soi => soi.ServiceOrder)
                .Include(soi => soi.Service)
                .Where(soi => soi.ServiceOrder!.AdmissionId == admissionId && !soi.IsDeleted)
                .ToListAsync();

            foreach (var item in treatmentServices)
            {
                var chargeItem = new ChargeItem
                {
                    Id = Guid.NewGuid(),
                    ChargeCollectionId = chargeCollection.Id,
                    ChargeType = item.Service?.ServiceType ?? "Service",
                    Description = item.Service?.Name ?? "Dịch vụ",
                    ServiceId = item.ServiceId,
                    Quantity = item.Quantity,
                    UnitPrice = item.Service?.Price ?? 0,
                    Amount = item.Quantity * (item.Service?.Price ?? 0),
                    CreatedAt = DateTime.Now
                };
                await _unitOfWork.GetRepository<ChargeItem>().AddAsync(chargeItem);
                totalAmount += chargeItem.Amount;
            }

            // 3. Surgery costs
            var surgeryCosts = await _unitOfWork.GetRepository<SurgeryCost>()
                .Query()
                .Include(sc => sc.Surgery)
                .Where(sc => sc.Surgery!.AdmissionId == admissionId && !sc.IsDeleted)
                .ToListAsync();

            foreach (var cost in surgeryCosts)
            {
                var chargeItem = new ChargeItem
                {
                    Id = Guid.NewGuid(),
                    ChargeCollectionId = chargeCollection.Id,
                    ChargeType = "Surgery",
                    Description = "Chi phí phẫu thuật",
                    SurgeryId = cost.SurgeryId,
                    Quantity = 1,
                    UnitPrice = cost.TotalCost,
                    Amount = cost.TotalCost,
                    CreatedAt = DateTime.Now
                };
                await _unitOfWork.GetRepository<ChargeItem>().AddAsync(chargeItem);
                totalAmount += cost.TotalCost;
            }

            // 4. Medicine costs (from ward requisitions)
            var medicineDispenses = await _unitOfWork.GetRepository<DispensingDetail>()
                .Query()
                .Include(dd => dd.Dispensing)
                .Include(dd => dd.Item)
                .Where(dd => dd.Dispensing!.AdmissionId == admissionId && !dd.IsDeleted)
                .ToListAsync();

            foreach (var dispense in medicineDispenses)
            {
                var chargeItem = new ChargeItem
                {
                    Id = Guid.NewGuid(),
                    ChargeCollectionId = chargeCollection.Id,
                    ChargeType = "Medicine",
                    Description = dispense.Item?.Name ?? "Thuốc/Vật tư",
                    MedicineId = dispense.ItemId,
                    Quantity = dispense.Quantity,
                    UnitPrice = dispense.Item?.Price ?? 0,
                    Amount = dispense.Quantity * (dispense.Item?.Price ?? 0),
                    CreatedAt = DateTime.Now
                };
                await _unitOfWork.GetRepository<ChargeItem>().AddAsync(chargeItem);
                totalAmount += chargeItem.Amount;
            }

            chargeCollection.TotalAmount = totalAmount;
            await _unitOfWork.GetRepository<ChargeCollection>().AddAsync(chargeCollection);
            await _unitOfWork.SaveChangesAsync();

            return new ChargeCollectionResult(true, chargeCollection.Id, totalAmount, "Đã tổng hợp chi phí nội trú");
        }
        catch (Exception ex)
        {
            return new ChargeCollectionResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Tách chi phí theo nguồn chi trả
    /// - BHYT chi trả
    /// - Bệnh nhân tự trả
    /// - Nguồn khác (BHNT, viện trợ...)
    /// </summary>
    public async Task<ChargeSplitResult> SplitChargesByPayerAsync(Guid chargeCollectionId)
    {
        try
        {
            var chargeCollection = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .Include(cc => cc.Items)
                .Include(cc => cc.Visit)
                    .ThenInclude(v => v!.InsuranceInfo)
                .FirstOrDefaultAsync(cc => cc.Id == chargeCollectionId && !cc.IsDeleted);

            if (chargeCollection == null)
            {
                return new ChargeSplitResult(false, null, null, null, "Không tìm thấy bảng tổng hợp chi phí");
            }

            decimal insuranceAmount = 0;
            decimal patientAmount = 0;
            decimal otherAmount = 0;

            // Get insurance info
            var insuranceInfo = chargeCollection.Visit?.InsuranceInfo;
            var coverageRate = insuranceInfo?.CoverageRate ?? 0;

            foreach (var item in chargeCollection.Items)
            {
                if (insuranceInfo != null && item.IsInsuranceCovered)
                {
                    // Insurance covered items
                    var insAmount = item.Amount * coverageRate;
                    var patAmount = item.Amount - insAmount;

                    item.InsuranceAmount = insAmount;
                    item.PatientAmount = patAmount;

                    insuranceAmount += insAmount;
                    patientAmount += patAmount;
                }
                else
                {
                    // Patient pays full amount
                    item.PatientAmount = item.Amount;
                    patientAmount += item.Amount;
                }

                item.UpdatedAt = DateTime.Now;
            }

            // Update charge collection
            chargeCollection.InsuranceAmount = insuranceAmount;
            chargeCollection.PatientAmount = patientAmount;
            chargeCollection.OtherAmount = otherAmount;
            chargeCollection.Status = "Split";
            chargeCollection.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new ChargeSplitResult(true, insuranceAmount, patientAmount, otherAmount, "Đã tách chi phí theo nguồn");
        }
        catch (Exception ex)
        {
            return new ChargeSplitResult(false, null, null, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region TẠM ỨNG (Nội trú)

    /// <summary>
    /// Tạo phiếu tạm ứng cho bệnh nhân nội trú
    /// - Đặt cọc trước khi nhập viện
    /// - Bổ sung tạm ứng trong quá trình điều trị
    /// </summary>
    public async Task<DepositResult> CreateDepositAsync(Guid admissionId, DepositDto deposit)
    {
        try
        {
            var admission = await _unitOfWork.GetRepository<Admission>()
                .Query()
                .Include(a => a.Patient)
                .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

            if (admission == null)
            {
                return new DepositResult(false, null, null, "Không tìm thấy bệnh án nội trú");
            }

            // Create deposit record
            var depositRecord = new PatientDeposit
            {
                Id = Guid.NewGuid(),
                AdmissionId = admissionId,
                PatientId = admission.PatientId,
                Amount = deposit.Amount,
                PaymentMethod = deposit.PaymentMethod, // Cash, Card, BankTransfer
                ReceiptNumber = GenerateReceiptNumber("DEP"),
                Note = deposit.Note,
                DepositedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<PatientDeposit>().AddAsync(depositRecord);

            // Create cash book entry (Module 11)
            var cashBookEntry = new CashBookEntry
            {
                Id = Guid.NewGuid(),
                EntryType = "Deposit",
                Amount = deposit.Amount,
                PaymentMethod = deposit.PaymentMethod,
                ReferenceId = depositRecord.Id,
                ReferenceType = "PatientDeposit",
                Description = $"Tạm ứng BN {admission.Patient?.FullName}",
                EntryDate = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<CashBookEntry>().AddAsync(cashBookEntry);
            await _unitOfWork.SaveChangesAsync();

            // Calculate new balance
            var balance = await _unitOfWork.GetRepository<PatientDeposit>()
                .Query()
                .Where(pd => pd.AdmissionId == admissionId && !pd.IsDeleted)
                .SumAsync(pd => pd.Amount);

            return new DepositResult(true, depositRecord.Id, balance, $"Đã nhận tạm ứng {deposit.Amount:N0} VNĐ");
        }
        catch (Exception ex)
        {
            return new DepositResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Kiểm tra số dư tạm ứng
    /// - So sánh với chi phí phát sinh
    /// - Cảnh báo khi thiếu
    /// </summary>
    public async Task<DepositBalanceResult> CheckDepositBalanceAsync(Guid admissionId)
    {
        try
        {
            // Get total deposits
            var totalDeposit = await _unitOfWork.GetRepository<PatientDeposit>()
                .Query()
                .Where(pd => pd.AdmissionId == admissionId && !pd.IsDeleted)
                .SumAsync(pd => pd.Amount);

            // Get total charges
            var chargeCollection = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .FirstOrDefaultAsync(cc => cc.AdmissionId == admissionId && !cc.IsDeleted);

            var totalCharges = chargeCollection?.PatientAmount ?? 0;

            // Get refunds (if any)
            var totalRefunds = await _unitOfWork.GetRepository<DepositRefund>()
                .Query()
                .Where(dr => dr.AdmissionId == admissionId && !dr.IsDeleted)
                .SumAsync(dr => dr.Amount);

            var balance = totalDeposit - totalRefunds - totalCharges;
            var requiredDeposit = totalCharges * 1.2m; // 20% buffer
            var isLow = balance < requiredDeposit * 0.3m; // Low if less than 30%

            return new DepositBalanceResult(balance, totalCharges, requiredDeposit, isLow);
        }
        catch
        {
            return new DepositBalanceResult(0, 0, 0, true);
        }
    }

    /// <summary>
    /// Cảnh báo tạm ứng thấp
    /// - Gửi thông báo cho thu ngân và khoa
    /// </summary>
    public async Task<DepositAlertResult> AlertLowDepositAsync(Guid admissionId)
    {
        try
        {
            var balance = await CheckDepositBalanceAsync(admissionId);

            if (balance.IsLow)
            {
                var admission = await _unitOfWork.GetRepository<Admission>()
                    .Query()
                    .Include(a => a.Patient)
                    .Include(a => a.Department)
                    .FirstOrDefaultAsync(a => a.Id == admissionId && !a.IsDeleted);

                if (admission != null)
                {
                    // Create alert
                    var alert = new DepositAlert
                    {
                        Id = Guid.NewGuid(),
                        AdmissionId = admissionId,
                        PatientName = admission.Patient?.FullName ?? "",
                        CurrentBalance = balance.Balance,
                        RequiredAmount = balance.RequiredDeposit,
                        AlertType = "LowDeposit",
                        CreatedAt = DateTime.Now
                    };

                    await _unitOfWork.GetRepository<DepositAlert>().AddAsync(alert);
                    await _unitOfWork.SaveChangesAsync();

                    return new DepositAlertResult(true, $"Cảnh báo: BN {admission.Patient?.FullName} tạm ứng thấp. Số dư: {balance.Balance:N0}, Cần: {balance.RequiredDeposit:N0}");
                }
            }

            return new DepositAlertResult(false, null);
        }
        catch (Exception ex)
        {
            return new DepositAlertResult(false, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region THANH TOÁN

    /// <summary>
    /// Tạo hóa đơn thanh toán
    /// - Từ bảng tổng hợp chi phí
    /// - Tính VAT nếu cần
    /// </summary>
    public async Task<InvoiceResult> GenerateInvoiceAsync(Guid chargeCollectionId)
    {
        try
        {
            var chargeCollection = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .Include(cc => cc.Items)
                .Include(cc => cc.Patient)
                .FirstOrDefaultAsync(cc => cc.Id == chargeCollectionId && !cc.IsDeleted);

            if (chargeCollection == null)
            {
                return new InvoiceResult(false, null, null, null, "Không tìm thấy bảng tổng hợp chi phí");
            }

            // Create invoice
            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                ChargeCollectionId = chargeCollectionId,
                PatientId = chargeCollection.PatientId,
                InvoiceNumber = GenerateInvoiceNumber(),
                InvoiceDate = DateTime.Now,
                SubTotal = chargeCollection.TotalAmount,
                InsuranceAmount = chargeCollection.InsuranceAmount ?? 0,
                PatientAmount = chargeCollection.PatientAmount ?? 0,
                TotalAmount = chargeCollection.PatientAmount ?? chargeCollection.TotalAmount,
                Status = "Pending", // Pending → Paid → Cancelled
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Invoice>().AddAsync(invoice);

            // Create invoice items
            foreach (var item in chargeCollection.Items)
            {
                var invoiceItem = new InvoiceItem
                {
                    Id = Guid.NewGuid(),
                    InvoiceId = invoice.Id,
                    Description = item.Description,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    Amount = item.Amount,
                    InsuranceAmount = item.InsuranceAmount,
                    PatientAmount = item.PatientAmount ?? item.Amount,
                    CreatedAt = DateTime.Now
                };

                await _unitOfWork.GetRepository<InvoiceItem>().AddAsync(invoiceItem);
            }

            // Update charge collection
            chargeCollection.Status = "Invoiced";
            chargeCollection.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new InvoiceResult(true, invoice.Id, invoice.InvoiceNumber, invoice.TotalAmount, "Đã tạo hóa đơn");
        }
        catch (Exception ex)
        {
            return new InvoiceResult(false, null, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Xem trước hóa đơn
    /// </summary>
    public async Task<InvoicePreviewResult> PreviewInvoiceAsync(Guid visitId)
    {
        try
        {
            var chargeCollection = await _unitOfWork.GetRepository<ChargeCollection>()
                .Query()
                .Include(cc => cc.Items)
                .FirstOrDefaultAsync(cc => cc.VisitId == visitId && !cc.IsDeleted);

            if (chargeCollection == null)
            {
                return new InvoicePreviewResult(0, 0, 0, null);
            }

            var lines = chargeCollection.Items.Select(i => new InvoiceLineDto(
                i.Description ?? "",
                i.Quantity,
                i.UnitPrice,
                i.Amount
            )).ToList();

            return new InvoicePreviewResult(
                chargeCollection.TotalAmount,
                chargeCollection.InsuranceAmount ?? 0,
                chargeCollection.PatientAmount ?? chargeCollection.TotalAmount,
                lines);
        }
        catch
        {
            return new InvoicePreviewResult(0, 0, 0, null);
        }
    }

    /// <summary>
    /// Thanh toán bằng tiền mặt
    /// </summary>
    public async Task<PaymentResult> ProcessCashPaymentAsync(Guid invoiceId, decimal amount)
    {
        try
        {
            var invoice = await _unitOfWork.GetRepository<Invoice>()
                .Query()
                .Include(i => i.Patient)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && !i.IsDeleted);

            if (invoice == null)
            {
                return new PaymentResult(false, null, null, "Không tìm thấy hóa đơn");
            }

            if (amount < invoice.TotalAmount)
            {
                return new PaymentResult(false, null, null, $"Số tiền không đủ. Cần thanh toán: {invoice.TotalAmount:N0} VNĐ");
            }

            // Create payment record
            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                Amount = amount,
                PaymentMethod = "Cash",
                ReceiptNumber = GenerateReceiptNumber("REC"),
                Change = amount - invoice.TotalAmount,
                PaidAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Payment>().AddAsync(payment);

            // Update invoice
            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.Now;
            invoice.UpdatedAt = DateTime.Now;

            // Create cash book entry
            var cashEntry = new CashBookEntry
            {
                Id = Guid.NewGuid(),
                EntryType = "Payment",
                Amount = invoice.TotalAmount,
                PaymentMethod = "Cash",
                ReferenceId = payment.Id,
                ReferenceType = "Payment",
                Description = $"Thu tiền hóa đơn {invoice.InvoiceNumber}",
                EntryDate = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<CashBookEntry>().AddAsync(cashEntry);
            await _unitOfWork.SaveChangesAsync();

            return new PaymentResult(true, payment.Id, payment.ReceiptNumber, "Đã thanh toán thành công");
        }
        catch (Exception ex)
        {
            return new PaymentResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Thanh toán bằng thẻ
    /// </summary>
    public async Task<PaymentResult> ProcessCardPaymentAsync(Guid invoiceId, CardPaymentDto payment)
    {
        try
        {
            var invoice = await _unitOfWork.GetRepository<Invoice>()
                .Query()
                .FirstOrDefaultAsync(i => i.Id == invoiceId && !i.IsDeleted);

            if (invoice == null)
            {
                return new PaymentResult(false, null, null, "Không tìm thấy hóa đơn");
            }

            // Create payment record
            var paymentRecord = new Payment
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                Amount = payment.Amount,
                PaymentMethod = "Card",
                CardType = payment.CardType,
                CardLastFour = payment.CardNumber.Length >= 4 ? payment.CardNumber[^4..] : "",
                TransactionReference = payment.Reference,
                ReceiptNumber = GenerateReceiptNumber("REC"),
                PaidAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Payment>().AddAsync(paymentRecord);

            // Update invoice
            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.Now;
            invoice.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new PaymentResult(true, paymentRecord.Id, paymentRecord.ReceiptNumber, "Đã thanh toán bằng thẻ");
        }
        catch (Exception ex)
        {
            return new PaymentResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Thanh toán qua chuyển khoản
    /// </summary>
    public async Task<PaymentResult> ProcessBankTransferAsync(Guid invoiceId, BankTransferDto transfer)
    {
        try
        {
            var invoice = await _unitOfWork.GetRepository<Invoice>()
                .Query()
                .FirstOrDefaultAsync(i => i.Id == invoiceId && !i.IsDeleted);

            if (invoice == null)
            {
                return new PaymentResult(false, null, null, "Không tìm thấy hóa đơn");
            }

            // Create payment record
            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                Amount = transfer.Amount,
                PaymentMethod = "BankTransfer",
                BankName = transfer.BankName,
                BankAccountNumber = transfer.AccountNumber,
                TransactionReference = transfer.Reference,
                ReceiptNumber = GenerateReceiptNumber("REC"),
                PaidAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Payment>().AddAsync(payment);

            // Update invoice
            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.Now;
            invoice.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            return new PaymentResult(true, payment.Id, payment.ReceiptNumber, "Đã thanh toán qua chuyển khoản");
        }
        catch (Exception ex)
        {
            return new PaymentResult(false, null, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region HOÀN TRẢ

    /// <summary>
    /// Hoàn tiền thanh toán
    /// - Khi hủy dịch vụ
    /// - Khi tính sai
    /// </summary>
    public async Task<RefundResult> ProcessRefundAsync(Guid paymentId, RefundRequestDto request)
    {
        try
        {
            var payment = await _unitOfWork.GetRepository<Payment>()
                .Query()
                .Include(p => p.Invoice)
                .FirstOrDefaultAsync(p => p.Id == paymentId && !p.IsDeleted);

            if (payment == null)
            {
                return new RefundResult(false, null, "Không tìm thấy thanh toán");
            }

            if (request.Amount > payment.Amount)
            {
                return new RefundResult(false, null, "Số tiền hoàn trả vượt quá số tiền đã thanh toán");
            }

            // Create refund record
            var refund = new Refund
            {
                Id = Guid.NewGuid(),
                PaymentId = paymentId,
                Amount = request.Amount,
                Reason = request.Reason,
                RefundNumber = GenerateReceiptNumber("REF"),
                RefundedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<Refund>().AddAsync(refund);

            // Create cash book entry (negative)
            var cashEntry = new CashBookEntry
            {
                Id = Guid.NewGuid(),
                EntryType = "Refund",
                Amount = -request.Amount,
                ReferenceId = refund.Id,
                ReferenceType = "Refund",
                Description = $"Hoàn tiền: {request.Reason}",
                EntryDate = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<CashBookEntry>().AddAsync(cashEntry);
            await _unitOfWork.SaveChangesAsync();

            return new RefundResult(true, refund.Id, $"Đã hoàn tiền {request.Amount:N0} VNĐ");
        }
        catch (Exception ex)
        {
            return new RefundResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Hoàn trả tạm ứng khi ra viện
    /// - Số dư còn lại sau thanh toán
    /// </summary>
    public async Task<DepositRefundResult> RefundDepositAsync(Guid admissionId)
    {
        try
        {
            var balance = await CheckDepositBalanceAsync(admissionId);

            if (balance.Balance <= 0)
            {
                return new DepositRefundResult(true, 0, "Không có số dư tạm ứng cần hoàn trả");
            }

            // Create deposit refund record
            var refund = new DepositRefund
            {
                Id = Guid.NewGuid(),
                AdmissionId = admissionId,
                Amount = balance.Balance,
                RefundNumber = GenerateReceiptNumber("DREF"),
                RefundedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<DepositRefund>().AddAsync(refund);

            // Create cash book entry
            var cashEntry = new CashBookEntry
            {
                Id = Guid.NewGuid(),
                EntryType = "DepositRefund",
                Amount = -balance.Balance,
                ReferenceId = refund.Id,
                ReferenceType = "DepositRefund",
                Description = "Hoàn trả tạm ứng ra viện",
                EntryDate = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<CashBookEntry>().AddAsync(cashEntry);
            await _unitOfWork.SaveChangesAsync();

            return new DepositRefundResult(true, balance.Balance, $"Đã hoàn trả tạm ứng {balance.Balance:N0} VNĐ");
        }
        catch (Exception ex)
        {
            return new DepositRefundResult(false, null, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region SỔ QUỸ

    /// <summary>
    /// Ghi nhận sổ quỹ
    /// </summary>
    public async Task<CashBookResult> RecordCashBookEntryAsync(CashBookEntryDto entry)
    {
        try
        {
            var cashEntry = new CashBookEntry
            {
                Id = Guid.NewGuid(),
                EntryType = entry.EntryType,
                Amount = entry.Amount,
                Description = entry.Description,
                EntryDate = entry.Date,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<CashBookEntry>().AddAsync(cashEntry);
            await _unitOfWork.SaveChangesAsync();

            return new CashBookResult(true, "Đã ghi nhận sổ quỹ");
        }
        catch (Exception ex)
        {
            return new CashBookResult(false, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Đóng ca làm việc
    /// - Tổng hợp thu chi trong ca
    /// - Kiểm đếm tiền mặt
    /// </summary>
    public async Task<ShiftCloseResult> CloseShiftAsync(Guid cashierId)
    {
        try
        {
            var today = DateTime.Today;
            var entries = await _unitOfWork.GetRepository<CashBookEntry>()
                .Query()
                .Where(e => e.CashierId == cashierId
                    && e.EntryDate >= today
                    && !e.IsDeleted)
                .ToListAsync();

            var totalReceipts = entries.Where(e => e.Amount > 0).Sum(e => e.Amount);
            var totalRefunds = Math.Abs(entries.Where(e => e.Amount < 0).Sum(e => e.Amount));
            var balance = totalReceipts - totalRefunds;

            // Create shift close record
            var shiftClose = new ShiftClose
            {
                Id = Guid.NewGuid(),
                CashierId = cashierId,
                ShiftDate = today,
                TotalReceipts = totalReceipts,
                TotalRefunds = totalRefunds,
                Balance = balance,
                ClosedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<ShiftClose>().AddAsync(shiftClose);
            await _unitOfWork.SaveChangesAsync();

            return new ShiftCloseResult(true, totalReceipts, totalRefunds, balance, "Đã đóng ca thành công");
        }
        catch (Exception ex)
        {
            return new ShiftCloseResult(false, null, null, null, $"Lỗi: {ex.Message}");
        }
    }

    /// <summary>
    /// Đóng sổ quỹ cuối ngày
    /// </summary>
    public async Task<DailyCloseResult> CloseDailyAsync(DateTime date)
    {
        try
        {
            var entries = await _unitOfWork.GetRepository<CashBookEntry>()
                .Query()
                .Where(e => e.EntryDate.Date == date.Date && !e.IsDeleted)
                .ToListAsync();

            // Create daily close record
            var dailyClose = new DailyClose
            {
                Id = Guid.NewGuid(),
                CloseDate = date.Date,
                TotalReceipts = entries.Where(e => e.Amount > 0).Sum(e => e.Amount),
                TotalRefunds = Math.Abs(entries.Where(e => e.Amount < 0).Sum(e => e.Amount)),
                ClosedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            await _unitOfWork.GetRepository<DailyClose>().AddAsync(dailyClose);
            await _unitOfWork.SaveChangesAsync();

            return new DailyCloseResult(true, "Đã đóng sổ quỹ cuối ngày");
        }
        catch (Exception ex)
        {
            return new DailyCloseResult(false, $"Lỗi: {ex.Message}");
        }
    }

    #endregion

    #region Helper Methods

    private string GenerateInvoiceNumber()
    {
        return $"INV{DateTime.Now:yyyyMMdd}{new Random().Next(10000, 99999)}";
    }

    private string GenerateReceiptNumber(string prefix)
    {
        return $"{prefix}{DateTime.Now:yyyyMMdd}{new Random().Next(10000, 99999)}";
    }

    #endregion
}
