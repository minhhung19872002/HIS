using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class MedicalRecordPlanningService : IMedicalRecordPlanningService
{
    private readonly HISDbContext _context;
    private readonly ILogger<MedicalRecordPlanningService> _logger;

    public MedicalRecordPlanningService(HISDbContext context, ILogger<MedicalRecordPlanningService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    // QA-R11: was `BA-{UTC date}-{Random(10000,99999)}` — two assigns the same day could draw the same
    // number (and the date was the UTC day, not the VN day). Next number in the VN-day sequence instead,
    // same approach as RecordCodeGenerator; deleted rows are counted so a code is never reused.
    // Sync on purpose: the caller (RecordCode.cs) invokes it as a plain expression.
    private string GenerateRecordCode()
    {
        var prefix = $"BA-{HIS.Core.Common.VnTime.NowVn:yyyyMMdd}-";
        var codes = _context.MedicalRecords.IgnoreQueryFilters()
            .Where(r => r.MedicalRecordCode.StartsWith(prefix))
            .Select(r => r.MedicalRecordCode)
            .ToList();
        return $"{prefix}{RecordCodeGenerator.NextNumber(codes, prefix):D5}";
    }

    private static string GetTransferStatusName(int condition)
    {
        return condition switch
        {
            0 => "Cho duyet",
            1 => "Da duyet",
            2 => "Tu choi",
            _ => "Hoan thanh",
        };
    }

    // QA-R2: cùng bộ mã với MedicalRecordBorrowRequest.Status / MedicalRecordArchiveService.
    // Bộ tên cũ (0 đang mượn · 1 đã trả · 2 quá hạn · 3 gia hạn) không khớp giá trị thật trong DB:
    // phiếu đã trả (4) hiện "Khong xac dinh", phiếu đang mượn (3) hiện "Gia han".
    private static string GetBorrowStatusName(int status)
    {
        return status switch
        {
            0 => "Cho duyet",
            1 => "Da duyet",
            2 => "Tu choi",
            3 => "Dang muon",
            4 => "Da tra",
            _ => "Khong xac dinh",
        };
    }

    private static string GetHandoverStatusName(int status)
    {
        return status switch
        {
            0 => "Nhap",
            1 => "Da gui",
            2 => "Da duyet",
            3 => "Tu choi",
            _ => "Khong xac dinh",
        };
    }

    private static string GetExamStatusName(int status)
    {
        return status switch
        {
            0 => "Cho kham",
            1 => "Dang kham",
            2 => "Cho CLS",
            3 => "Cho ket luan",
            4 => "Hoan thanh",
            _ => "Khong xac dinh",
        };
    }

    // QA-R2: đã bỏ các hàm GetStub* — khi truy vấn lỗi chúng trả danh sách người bệnh bịa
    // ("Nguyen Van B", "BN100002"...) như dữ liệu thật. Lỗi nay nổi lên thành HTTP lỗi.
}
