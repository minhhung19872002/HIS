namespace HIS.Application.DTOs;

public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public List<string>? Errors { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null)
    {
        return new ApiResponse<T> { Success = true, Data = data, Message = message };
    }

    public static ApiResponse<T> Fail(string message, List<string>? errors = null)
    {
        return new ApiResponse<T> { Success = false, Message = message, Errors = errors };
    }

    // Aliases for compatibility
    public static ApiResponse<T> SuccessResponse(T data, string? message = null) => Ok(data, message);
    public static ApiResponse<T> ErrorResponse(string message, List<string>? errors = null) => Fail(message, errors);
}

public class SelectItemDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class DepartmentDto
{
    public Guid Id { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int DepartmentType { get; set; }
    public string? Location { get; set; }
    public bool IsActive { get; set; }
    public List<RoomDto> Rooms { get; set; } = new();
}

public class RoomDto
{
    public Guid Id { get; set; }
    public string RoomCode { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public int RoomType { get; set; }
    public string? Location { get; set; }
    public int MaxPatients { get; set; }
    public int MaxInsurancePatients { get; set; }
    public Guid DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public bool IsActive { get; set; }
}

public class ServiceDto
{
    public Guid Id { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int ServiceType { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal ServicePrice { get; set; }
    public string? Unit { get; set; }
    public bool IsInsuranceCovered { get; set; }
    public int InsurancePaymentRate { get; set; }
    public Guid ServiceGroupId { get; set; }
    public string? ServiceGroupName { get; set; }
}
