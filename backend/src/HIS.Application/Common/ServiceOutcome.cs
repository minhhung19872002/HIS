namespace HIS.Application.Common;

/// <summary>
/// Kết quả nghiệp vụ trả từ service cho controller mỏng (#202 thin-controller).
/// Cho phép service (không phụ thuộc HTTP) báo Ok / OkEmpty / NoContent / NotFound /
/// NotFound(message) / BadRequest(message) — và trường hợp tổng quát <see cref="Status"/>
/// (status code + body tuỳ ý) cho các shape hiếm (403/401, body raw-string, body object riêng).
/// Controller map về IActionResult giữ NGUYÊN status code + response body (behavior-preserving).
/// </summary>
public sealed class ServiceOutcome
{
    public enum Kind { Ok, OkEmpty, NoContent, NotFound, NotFoundMsg, BadRequest, Status }

    public Kind ResultKind { get; }
    public object? Payload { get; }
    public string? Message { get; }
    /// <summary>Chỉ dùng cho <see cref="Kind.Status"/>: HTTP status code tuỳ ý.</summary>
    public int StatusCode { get; }

    private ServiceOutcome(Kind kind, object? payload = null, string? message = null, int statusCode = 0)
    {
        ResultKind = kind;
        Payload = payload;
        Message = message;
        StatusCode = statusCode;
    }

    /// <summary>200 kèm body (tương đương <c>Ok(payload)</c>).</summary>
    public static ServiceOutcome Ok(object payload) => new(Kind.Ok, payload);

    /// <summary>200 không body (tương đương <c>Ok()</c>).</summary>
    public static ServiceOutcome OkEmpty() => new(Kind.OkEmpty);

    /// <summary>204 (tương đương <c>NoContent()</c>).</summary>
    public static ServiceOutcome NoContent() => new(Kind.NoContent);

    /// <summary>404 không body (tương đương <c>NotFound()</c>).</summary>
    public static ServiceOutcome NotFound() => new(Kind.NotFound);

    /// <summary>404 kèm <c>{ message }</c> (tương đương <c>NotFound(new { message })</c>).</summary>
    public static ServiceOutcome NotFound(string message) => new(Kind.NotFoundMsg, message: message);

    /// <summary>400 kèm <c>{ message }</c> (tương đương <c>BadRequest(new { message })</c>).</summary>
    public static ServiceOutcome Bad(string message) => new(Kind.BadRequest, message: message);

    /// <summary>Tổng quát: <c>StatusCode(statusCode, body)</c> — body tuỳ ý (raw string / object riêng); body null = chỉ status code.</summary>
    public static ServiceOutcome Status(int statusCode, object? body = null) => new(Kind.Status, payload: body, statusCode: statusCode);

    /// <summary>403 kèm body (tương đương <c>StatusCode(403, body)</c>).</summary>
    public static ServiceOutcome Forbidden(object body) => new(Kind.Status, payload: body, statusCode: 403);

    /// <summary>401 kèm body (tương đương <c>StatusCode(401, body)</c>).</summary>
    public static ServiceOutcome Unauthorized(object body) => new(Kind.Status, payload: body, statusCode: 401);
}
