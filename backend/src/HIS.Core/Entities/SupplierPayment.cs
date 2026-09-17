namespace HIS.Core.Entities;

/// <summary>
/// So thanh toan nha cung cap (mig 213). Cong no NCC = tong phieu nhap da duyet − xuat tra NCC − cac khoan o day.
/// </summary>
public class SupplierPayment : BaseEntity
{
    public Guid SupplierId { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? ReferenceNumber { get; set; }

    /// <summary>Phieu nhap duoc thanh toan (tuy chon).</summary>
    public Guid? ImportReceiptId { get; set; }

    public string? Note { get; set; }
}
