using System.Text;
using HIS.Infrastructure.Services.Export;
using Xunit;

namespace HIS.Tests.Services;

/// <summary>QA-R10: imports accept UTF-8 (with/without BOM) and Vietnamese ANSI (Windows-1258) CSV from Excel.</summary>
public sealed class CsvUtilDecodeTests
{
    private const string Name = "Nguyễn Văn Đức,Hà Nội";

    [Fact]
    public void Utf8_with_bom_is_decoded_and_bom_stripped()
        => Assert.Equal(Name, CsvUtil.DecodeText(CsvUtil.ToBytes(Name)));

    [Fact]
    public void Windows1258_falls_back_and_normalises_to_nfc()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        // Windows-1258 keeps base vowels (ê, ă, ư, ô) precomposed and stores tone marks as combining characters.
        const string ansiForm = "Nguyễn Văn Đức,Hà Nội";
        var bytes = Encoding.GetEncoding(1258, EncoderFallback.ExceptionFallback, DecoderFallback.ExceptionFallback).GetBytes(ansiForm);
        Assert.Equal(Name.Normalize(NormalizationForm.FormC), CsvUtil.DecodeText(bytes));
    }

    [Fact]
    public void Xlsx_is_rejected()
        => Assert.Throws<InvalidOperationException>(() => CsvUtil.DecodeText(new byte[] { 0x50, 0x4B, 3, 4, 0 }));
}
