namespace HIS.Application.DTOs.BhxhConfig;

public class BhxhConfigDto
{
    public string? GatewayUrl { get; set; }
    public string? TokenUrl { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? MaCSKCB { get; set; }
    public string? MaDVI { get; set; }
    // Nullable: the v2 form sends `timeout: null` when the field is cleared → non-nullable int made the
    // whole save a 400 "The dto field is required". Null = default 30s.
    public int? Timeout { get; set; } = 30;
    public string? Environment { get; set; } = "sandbox";
}

public class TestSubmitXmlDto
{
    public string Xml { get; set; } = string.Empty;
    public string? Endpoint { get; set; } // phần path vd "/api/bhxh/xml"
}
