using HIS.Application.DTOs.Payment;

namespace HIS.Application.Services;

/// <summary>
/// NangCap25 IV — Chi hộ hoàn tiền thừa cho bệnh nhân qua tài khoản Vietcombank của BV.
/// Chưa có API giải ngân thật (cần merchant contract VCB) → MockMode mặc định;
/// khi có contract, cấu hình PaymentGateway:Disbursement và tắt MockMode.
/// </summary>
public interface IRefundDisbursementService
{
    Task<RefundDisbursementDto> CreateAsync(CreateRefundDisbursementDto dto, Guid userId);

    /// <summary>Duyệt + thực hiện chi (MockMode: đánh dấu hoàn tất với mã lệnh mock).</summary>
    Task<RefundDisbursementDto> ExecuteAsync(Guid id, Guid userId);

    Task<RefundDisbursementDto> CancelAsync(Guid id, string? reason, Guid userId);

    Task<RefundDisbursementDto?> GetByIdAsync(Guid id);

    Task<RefundDisbursementSearchResultDto> SearchAsync(RefundDisbursementSearchDto dto);
}
