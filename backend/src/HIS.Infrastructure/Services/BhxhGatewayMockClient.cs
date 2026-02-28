using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Insurance;
using HIS.Application.Services;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Mock implementation of IBhxhGatewayClient for development and testing.
/// Returns realistic Vietnamese data without making HTTP calls.
/// Special insurance numbers trigger edge cases:
///   - Contains "INVALID" -> DuDkKcb=false
///   - Contains "EXPIRED" -> Expired card dates
/// </summary>
public class BhxhGatewayMockClient : IBhxhGatewayClient
{
    private readonly ILogger<BhxhGatewayMockClient> _logger;

    public BhxhGatewayMockClient(ILogger<BhxhGatewayMockClient> logger)
    {
        _logger = logger;
    }

    public Task<BhxhTokenResponse> GetTokenAsync(CancellationToken ct = default)
    {
        _logger.LogDebug("BHXH Mock: Returning mock token");
        return Task.FromResult(new BhxhTokenResponse
        {
            Token = $"mock-bhxh-token-{Guid.NewGuid():N}",
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });
    }

    public async Task<BhxhCardVerifyResponse> VerifyCardAsync(BhxhCardVerifyRequest request, CancellationToken ct = default)
    {
        // Simulate 50ms network latency
        await Task.Delay(50, ct);
        _logger.LogDebug("BHXH Mock: Verifying card {MaThe}", request.MaThe);

        var maThe = request.MaThe?.ToUpperInvariant() ?? "";

        // Edge case: invalid card
        if (maThe.Contains("INVALID"))
        {
            return new BhxhCardVerifyResponse
            {
                MaThe = request.MaThe,
                HoTen = request.HoTen,
                NgaySinh = request.NgaySinh,
                GioiTinh = 1,
                DiaChi = "",
                GtTheTu = DateTime.Today.AddYears(-1),
                GtTheDen = DateTime.Today.AddYears(1),
                MaDkbd = "01001",
                TenDkbd = "Benh vien Da khoa tinh",
                MucHuong = "0",
                DuDkKcb = false,
                LyDoKhongDuDk = "The BHYT khong hop le hoac da bi thu hoi",
                MaKv = "K1",
                LoaiThe = "DN",
                VerificationTime = DateTime.Now,
                VerificationToken = Guid.NewGuid().ToString()
            };
        }

        // Edge case: expired card
        if (maThe.Contains("EXPIRED"))
        {
            return new BhxhCardVerifyResponse
            {
                MaThe = request.MaThe,
                HoTen = request.HoTen,
                NgaySinh = request.NgaySinh,
                GioiTinh = 2,
                DiaChi = "456 Le Loi, Phuong 3, TP Da Nang",
                GtTheTu = DateTime.Today.AddYears(-3),
                GtTheDen = DateTime.Today.AddMonths(-1), // Expired last month
                MaDkbd = "48001",
                TenDkbd = "BV Da khoa Da Nang",
                MucHuong = "80",
                DuDkKcb = false,
                LyDoKhongDuDk = "The BHYT da het han su dung",
                MaKv = "K1",
                LoaiThe = "DN",
                VerificationTime = DateTime.Now,
                VerificationToken = Guid.NewGuid().ToString()
            };
        }

        // Normal case: valid card with realistic Vietnamese data
        return new BhxhCardVerifyResponse
        {
            MaThe = request.MaThe,
            HoTen = !string.IsNullOrEmpty(request.HoTen) ? request.HoTen : "Nguyen Van An",
            NgaySinh = request.NgaySinh != default ? request.NgaySinh : new DateTime(1990, 3, 15),
            GioiTinh = 1,
            DiaChi = "123 Tran Hung Dao, Phuong 1, Quan 5, TP Ho Chi Minh",
            GtTheTu = DateTime.Today.AddYears(-1),
            GtTheDen = DateTime.Today.AddYears(2),
            MaDkbd = "79068",
            TenDkbd = "Benh vien Nhan dan 115",
            MucHuong = "80",
            DuDkKcb = true,
            MienCungCt = false,
            NgayDu5Nam = DateTime.Today.AddYears(-3),
            IsTraTruoc = false,
            MaKv = "K1",
            LoaiThe = "DN",
            VerificationTime = DateTime.Now,
            VerificationToken = Guid.NewGuid().ToString()
        };
    }

    public async Task<BhxhTreatmentHistoryResponse> GetTreatmentHistoryAsync(BhxhTreatmentHistoryRequest request, CancellationToken ct = default)
    {
        await Task.Delay(80, ct);
        _logger.LogDebug("BHXH Mock: Getting treatment history for {MaThe}", request.MaThe);

        return new BhxhTreatmentHistoryResponse
        {
            MaThe = request.MaThe,
            Visits = new List<BhxhVisitRecord>
            {
                new()
                {
                    MaCsKcb = "79068",
                    TenCsKcb = "Benh vien Nhan dan 115",
                    NgayKcb = DateTime.Today.AddDays(-45),
                    MaLoaiKcb = "1", // Outpatient
                    MaBenhChinh = "J06.9",
                    TenBenhChinh = "Nhiem trung duong ho hap tren cap tinh",
                    TienBhyt = 350000
                },
                new()
                {
                    MaCsKcb = "79002",
                    TenCsKcb = "Benh vien Cho Ray",
                    NgayKcb = DateTime.Today.AddDays(-120),
                    MaLoaiKcb = "2", // Inpatient
                    MaBenhChinh = "K29.7",
                    TenBenhChinh = "Viem da day khong dac hieu",
                    TienBhyt = 2500000
                },
                new()
                {
                    MaCsKcb = "79068",
                    TenCsKcb = "Benh vien Nhan dan 115",
                    NgayKcb = DateTime.Today.AddDays(-200),
                    MaLoaiKcb = "1",
                    MaBenhChinh = "I10",
                    TenBenhChinh = "Tang huyet ap vo can",
                    TienBhyt = 520000
                },
                new()
                {
                    MaCsKcb = "79024",
                    TenCsKcb = "Benh vien Dai hoc Y Duoc TP.HCM",
                    NgayKcb = DateTime.Today.AddDays(-300),
                    MaLoaiKcb = "1",
                    MaBenhChinh = "M54.5",
                    TenBenhChinh = "Dau lung vung that lung",
                    TienBhyt = 680000
                }
            }
        };
    }

    public async Task<BhxhSubmitResponse> SubmitCostDataAsync(BhxhSubmitRequest request, CancellationToken ct = default)
    {
        await Task.Delay(100, ct);
        _logger.LogDebug("BHXH Mock: Submitting cost data batch {BatchCode}", request.BatchCode);

        return new BhxhSubmitResponse
        {
            TransactionId = $"TXN-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            Status = 0, // Received
            Message = "Du lieu da duoc tiep nhan thanh cong"
        };
    }

    public async Task<BhxhAssessmentResponse> GetAssessmentResultAsync(string transactionId, CancellationToken ct = default)
    {
        await Task.Delay(60, ct);
        _logger.LogDebug("BHXH Mock: Getting assessment for {TransactionId}", transactionId);

        // Simulate realistic assessment: 80% accepted, 20% rejected
        var totalRecords = 50;
        var acceptedRecords = 40;
        var rejectedRecords = 10;

        var items = new List<BhxhAssessmentItem>();

        // Accepted items
        for (int i = 1; i <= acceptedRecords; i++)
        {
            items.Add(new BhxhAssessmentItem
            {
                MaLk = $"79068{DateTime.Today:yyyyMMdd}{i:D6}",
                IsAccepted = true,
                ClaimAmount = 500000 + (i * 100000),
                AcceptedAmount = 500000 + (i * 100000)
            });
        }

        // Rejected items with realistic reject codes
        var rejectCodes = new[]
        {
            ("ERR001", "Sai ma benh chinh"),
            ("ERR002", "Vuot tran chi phi"),
            ("ERR003", "Thieu thong tin dieu tri"),
            ("ERR004", "Khong dung tuyen"),
            ("ERR005", "Thuoc ngoai danh muc"),
            ("ERR006", "So luong thuoc vuot quy dinh"),
            ("ERR007", "Dich vu khong phu hop chan doan"),
            ("ERR008", "Trung lap ho so"),
            ("ERR009", "Sai dinh dang du lieu"),
            ("ERR010", "Thieu giay chuyen tuyen")
        };

        for (int i = 0; i < rejectedRecords; i++)
        {
            var (code, reason) = rejectCodes[i % rejectCodes.Length];
            items.Add(new BhxhAssessmentItem
            {
                MaLk = $"79068{DateTime.Today:yyyyMMdd}{(acceptedRecords + i + 1):D6}",
                IsAccepted = false,
                RejectCode = code,
                RejectReason = reason,
                ClaimAmount = 300000 + (i * 50000),
                AcceptedAmount = 0
            });
        }

        return new BhxhAssessmentResponse
        {
            TransactionId = transactionId,
            Status = 1, // Completed
            TotalRecords = totalRecords,
            AcceptedRecords = acceptedRecords,
            RejectedRecords = rejectedRecords,
            Items = items,
            Message = "Giam dinh hoan tat"
        };
    }

    public async Task<bool> TestConnectionAsync(CancellationToken ct = default)
    {
        await Task.Delay(50, ct);
        _logger.LogDebug("BHXH Mock: Connection test - returning true");
        return true;
    }

    public async Task<BhxhCheckInResponse> CheckInPatientAsync(BhxhCheckInRequest request, CancellationToken ct = default)
    {
        await Task.Delay(60, ct);
        _logger.LogDebug("BHXH Mock: Checking in patient {HoTen}", request.HoTen);

        return new BhxhCheckInResponse
        {
            MaLk = $"{request.MaCsKcb}{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(100000, 999999)}",
            Status = 0, // Success
            Message = "Check-in thanh cong"
        };
    }
}
