namespace HIS.PatientApp.Api;

/// <summary>
/// Vỏ phản hồi <c>{ success, data, message }</c> — giữ giống HIS Core để client dùng chung một cách
/// bóc dữ liệu.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }

    /// <summary>Mã lỗi nghiệp vụ để app phân nhánh, ví dụ PASSWORD_CHANGE_REQUIRED.</summary>
    public string? Error { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message, string? error = null) =>
        new() { Success = false, Message = message, Error = error };
}

/// <summary>Tiện ích cho các phản hồi không có dữ liệu trả về.</summary>
public static class ApiResponse
{
    public static ApiResponse<object> Ok(string? message = null) =>
        new() { Success = true, Message = message };

    public static ApiResponse<object> Fail(string message, string? error = null) =>
        new() { Success = false, Message = message, Error = error };
}
