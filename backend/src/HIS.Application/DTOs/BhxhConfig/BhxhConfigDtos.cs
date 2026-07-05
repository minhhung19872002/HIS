namespace HIS.Application.DTOs.BhxhConfig;

public class BhxhConfigDto
{
    public string? GatewayUrl { get; set; }
    public string? TokenUrl { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? MaCSKCB { get; set; }
    public string? MaDVI { get; set; }
    public int Timeout { get; set; } = 30;
    public string? Environment { get; set; } = "sandbox";
}

public class TestSubmitXmlDto
{
    public string Xml { get; set; } = string.Empty;
    public string? Endpoint { get; set; } // phần path vd "/api/bhxh/xml"
}
