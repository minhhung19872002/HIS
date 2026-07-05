namespace HIS.Application.DTOs.SampleBatch;

public record SampleItemDto(
    Guid Id,
    string? SampleBarcode,
    string? SampleType,
    string TestName,
    string PatientName,
    string PatientCode,
    DateTime CollectedAt,
    Guid? CollectedBy,
    string? CollectorName,
    int Priority,
    int Status);

public record BatchDto(string BatchName, int Count, IReadOnlyList<SampleItemDto> Items);

public record BatchReportDto(DateTime Date, IReadOnlyList<BatchDto> Batches, int Total);
