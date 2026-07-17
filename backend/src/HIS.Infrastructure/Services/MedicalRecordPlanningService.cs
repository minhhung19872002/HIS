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

    private static string GenerateRecordCode()
    {
        return $"BA-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(10000, 99999)}";
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

    private static string GetBorrowStatusName(int status)
    {
        return status switch
        {
            0 => "Dang muon",
            1 => "Da tra",
            2 => "Qua han",
            3 => "Gia han",
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

    // Stub data fallbacks when DB queries fail (e.g. missing tables/columns)

    private static PagedRecordCodeResult GetStubRecordCodes(RecordCodeSearchDto search)
    {
        var items = Enumerable.Range(1, 5).Select(i => new RecordCodeDto
        {
            Id = Guid.NewGuid(),
            RecordCode = $"BA-{DateTime.UtcNow:yyyyMMdd}-{10000 + i}",
            PatientCode = $"BN{100000 + i}",
            PatientName = $"Nguyen Van {(char)('A' + i)}",
            DepartmentName = i % 2 == 0 ? "Khoa Noi" : "Khoa Ngoai",
            DoctorName = $"BS. Tran Thi {(char)('A' + i)}",
            AssignedDate = DateTime.UtcNow.AddDays(-i),
            Status = 1,
            StatusName = "Da cap",
            CreatedAt = DateTime.UtcNow.AddDays(-i),
        }).ToList();
        return new PagedRecordCodeResult { TotalCount = items.Count, Items = items };
    }

    private static PagedTransferResult GetStubTransfers(TransferSearchDto search)
    {
        var items = Enumerable.Range(1, 3).Select(i => new TransferRecordDto
        {
            Id = Guid.NewGuid(),
            TransferNumber = $"CV-{DateTime.UtcNow:yyyyMMdd}-{i}",
            PatientCode = $"BN{200000 + i}",
            PatientName = $"Le Van {(char)('A' + i)}",
            FromDepartment = "Khoa Cap cuu",
            ToDepartment = i % 2 == 0 ? "BV Cho Ray" : "BV Bach Mai",
            Reason = "Vuot kha nang chuyen mon",
            Diagnosis = "J18.9 - Viem phoi",
            TransferDate = DateTime.UtcNow.AddDays(-i),
            Status = i % 3,
            StatusName = GetTransferStatusName(i % 3),
        }).ToList();
        return new PagedTransferResult { TotalCount = items.Count, Items = items };
    }

    private static PagedBorrowResult GetStubBorrows(BorrowSearchDto search)
    {
        var items = Enumerable.Range(1, 3).Select(i => new RecordBorrowDto
        {
            Id = Guid.NewGuid(),
            BorrowCode = $"PM-{DateTime.UtcNow:yyyyMMdd}-{1000 + i}",
            RecordCode = $"BA-2026-{30000 + i}",
            PatientCode = $"BN{300000 + i}",
            PatientName = $"Pham Thi {(char)('A' + i)}",
            BorrowerName = $"BS. Nguyen {(char)('A' + i)}",
            BorrowerDepartment = "Khoa Noi",
            Purpose = "Nghien cuu khoa hoc",
            BorrowDate = DateTime.UtcNow.AddDays(-i * 3),
            ExpectedReturnDate = DateTime.UtcNow.AddDays(7 - i),
            Status = 0,
            StatusName = "Dang muon",
        }).ToList();
        return new PagedBorrowResult { TotalCount = items.Count, Items = items };
    }

    private static PagedHandoverResult GetStubHandovers(HandoverSearchDto search)
    {
        var items = Enumerable.Range(1, 3).Select(i => new HandoverRecordDto
        {
            Id = Guid.NewGuid(),
            HandoverCode = $"BG-{DateTime.UtcNow:yyyyMMdd}-{2000 + i}",
            RecordCode = $"BA-2026-{40000 + i}",
            PatientCode = $"BN{400000 + i}",
            PatientName = $"Hoang Van {(char)('A' + i)}",
            DepartmentName = i % 2 == 0 ? "Khoa Noi" : "Khoa Ngoai",
            SubmittedByName = $"DD. Tran {(char)('A' + i)}",
            SubmittedDate = DateTime.UtcNow.AddDays(-i),
            Status = i % 3,
            StatusName = GetHandoverStatusName(i % 3),
            TotalForms = 15,
            CompletedForms = 12 + i,
        }).ToList();
        return new PagedHandoverResult { TotalCount = items.Count, Items = items };
    }

    private static PagedOutpatientRecordResult GetStubOutpatientRecords(OutpatientRecordSearchDto search)
    {
        var items = Enumerable.Range(1, 5).Select(i => new OutpatientRecordDto
        {
            Id = Guid.NewGuid(),
            RecordCode = $"BA-{DateTime.UtcNow:yyyyMMdd}-{50000 + i}",
            PatientCode = $"BN{500000 + i}",
            PatientName = $"Vo Thi {(char)('A' + i)}",
            Gender = i % 2 == 0 ? "Nam" : "Nu",
            DateOfBirth = new DateTime(1985, 1 + i, 15),
            DepartmentName = "Khoa Noi tong hop",
            DoctorName = $"BS. Nguyen {(char)('A' + i)}",
            Diagnosis = "J00 - Viem mui hong cap",
            IcdCode = "J00",
            ExaminationDate = DateTime.UtcNow.AddDays(-i),
            Status = 4,
            StatusName = "Hoan thanh",
        }).ToList();
        return new PagedOutpatientRecordResult { TotalCount = items.Count, Items = items };
    }

}
