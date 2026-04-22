using HIS.Application.DTOs.Examination;

namespace HIS.Application.Services;

/// <summary>
/// Service cho workflow khám nhiều phòng cùng lúc (Reception) và
/// khám thêm chuyên khoa khác trong 1 phiên khám (OPD).
/// Tuân thủ quy tắc BHYT: chỉ phiên cuối in bảng kê tổng hợp.
/// </summary>
public interface IMultiSpecialtyExamService
{
    Task<MultiRoomRegistrationResultDto> RegisterMultipleRoomsAsync(
        MultiRoomRegistrationDto dto, Guid userId);

    Task<RegisteredExamDto> AddFollowUpSpecialtyAsync(
        AddFollowUpSpecialtyDto dto, Guid userId);

    Task<RegisteredExamDto> ChangeRoomBeforeExamAsync(
        ChangeRoomBeforeExamDto dto, Guid userId);

    Task<ExamCompletionStatusDto> GetCompletionStatusAsync(Guid examinationId);

    Task<ExamCompletionStatusDto> PrintBillAsync(Guid examinationId, Guid userId);

    Task<ExamCompletionStatusDto> CancelPrintBillAsync(Guid examinationId, Guid userId);

    Task<ExamCompletionStatusDto> CancelCompletionAsync(Guid examinationId, Guid userId);

    Task<bool> DeleteRegistrationAsync(DeleteRegistrationDto dto, Guid userId);
}
