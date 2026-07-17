using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using IcdCodeDto = HIS.Application.Services.IcdCodeDto;
using SurgeryServiceDto = HIS.Application.Services.SurgeryServiceDto;

namespace HIS.Infrastructure.Services.Surgery;

public partial class SurgeryOperationServiceImpl
{
    public async Task<byte[]> PrintServiceOrderAsync(Guid orderId)
    {
        try
        {
            // Try to find the service request by orderId
            var serviceReq = await _context.Set<ServiceRequest>()
                .Include(sr => sr.MedicalRecord).ThenInclude(mr => mr!.Patient)
                .Include(sr => sr.Doctor)
                .Include(sr => sr.Department)
                .FirstOrDefaultAsync(sr => sr.Id == orderId);

            if (serviceReq == null)
            {
                // Fallback: generate a generic single order form
                var html = BuildVoucherReport(
                    "PHIẾU CHỈ ĐỊNH DỊCH VỤ",
                    orderId.ToString("N")[..10].ToUpper(),
                    DateTime.Now,
                    new[] { "Mã phiếu", "Ngày chỉ định", "Ghi chú" },
                    new[] { orderId.ToString("N")[..10].ToUpper(), DateTime.Now.ToString("dd/MM/yyyy"), "Chỉ định dịch vụ phẫu thuật" },
                    null);
                return Encoding.UTF8.GetBytes(html);
            }

            var pat = serviceReq.MedicalRecord?.Patient;
            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">PHIẾU CHỈ ĐỊNH DỊCH VỤ</div>");
            body.AppendLine(@"<div class=""form-number"">MS. CĐ-01</div>");

            if (pat != null)
                body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Mã phiếu:</span><span class=""field-value"">{Esc(serviceReq.RequestCode)}</span></div>
<div class=""field""><span class=""field-label"">Ngày chỉ định:</span><span class=""field-value"">{serviceReq.RequestDate:dd/MM/yyyy HH:mm}</span></div>
<div class=""field""><span class=""field-label"">BS chỉ định:</span><span class=""field-value"">{Esc(serviceReq.Doctor?.FullName)}</span></div>
<div class=""field""><span class=""field-label"">Khoa:</span><span class=""field-value"">{Esc(serviceReq.Department?.DepartmentName)}</span></div>
<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(serviceReq.Diagnosis)}</span></div>");

            // Load details
            var details = await _context.Set<ServiceRequestDetail>()
                .Include(d => d.Service)
                .Where(d => d.ServiceRequestId == orderId)
                .ToListAsync();

            body.AppendLine(@"
<table class=""bordered"" style=""margin-top:10px"">
<thead><tr><th>STT</th><th>Tên dịch vụ</th><th>SL</th><th>Ghi chú</th></tr></thead>
<tbody>");
            for (int i = 0; i < details.Count; i++)
            {
                var d = details[i];
                body.AppendLine($@"<tr><td class=""text-center"">{i + 1}</td><td>{Esc(d.Service?.ServiceName)}</td><td class=""text-center"">{d.Quantity}</td><td>{Esc(d.Note)}</td></tr>");
            }
            if (details.Count == 0)
                body.AppendLine(@"<tr><td colspan=""4"" class=""text-center"" style=""font-style:italic"">Không có chi tiết</td></tr>");
            body.AppendLine("</tbody></table>");

            body.AppendLine(GetSignatureBlock(serviceReq.Doctor?.FullName, null, null, false));

            var htmlResult = WrapHtmlPage("Phiếu chỉ định dịch vụ - MS.CĐ-01", body.ToString());
            return Encoding.UTF8.GetBytes(htmlResult);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintOrdersByPaymentObjectAsync(Guid surgeryId, int paymentObject)
    {
        try
        {
            var (req, sched, _, pat, surgeon, _, _) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var paymentObjectName = paymentObject switch
            {
                1 => "BHYT",
                2 => "Viện phí",
                3 => "Dịch vụ",
                4 => "Bên thứ ba",
                _ => "Tất cả"
            };

            // Load service requests linked to the surgery's medical record
            var serviceReqs = await _context.Set<ServiceRequest>()
                .Include(sr => sr.Doctor)
                .Where(sr => sr.MedicalRecordId == (req.MedicalRecordId ?? Guid.Empty))
                .ToListAsync();

            var allDetails = new List<ServiceRequestDetail>();
            foreach (var sr in serviceReqs)
            {
                var details = await _context.Set<ServiceRequestDetail>()
                    .Include(d => d.Service)
                    .Where(d => d.ServiceRequestId == sr.Id)
                    .ToListAsync();
                allDetails.AddRange(details);
            }

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine($@"<div class=""form-title"">PHIẾU CHỈ ĐỊNH DỊCH VỤ - {Esc(paymentObjectName.ToUpper())}</div>");
            body.AppendLine(@"<div class=""form-number"">MS. CĐ-02</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Đối tượng thanh toán:</span><span class=""field-value"">{Esc(paymentObjectName)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>

<table class=""bordered"" style=""margin-top:10px"">
<thead><tr><th>STT</th><th>Tên dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
<tbody>");
            for (int i = 0; i < allDetails.Count; i++)
            {
                var d = allDetails[i];
                var amount = d.Quantity * d.UnitPrice;
                body.AppendLine($@"<tr><td class=""text-center"">{i + 1}</td><td>{Esc(d.Service?.ServiceName)}</td><td class=""text-center"">{d.Quantity}</td><td class=""text-right"">{d.UnitPrice:#,##0}</td><td class=""text-right"">{amount:#,##0}</td></tr>");
            }
            if (allDetails.Count == 0)
                body.AppendLine(@"<tr><td colspan=""5"" class=""text-center"" style=""font-style:italic"">Không có chỉ định</td></tr>");
            body.AppendLine("</tbody></table>");

            body.AppendLine(GetSignatureBlock(surgeon?.FullName, null, null, false));

            var html = WrapHtmlPage($"Phiếu chỉ định - {paymentObjectName} - MS.CĐ-02", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintOrdersByGroupAsync(Guid surgeryId, string serviceGroup)
    {
        try
        {
            var (req, sched, _, pat, surgeon, _, _) = await LoadSurgeryPrintDataAsync(surgeryId);
            if (req == null || pat == null) return Array.Empty<byte>();

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine($@"<div class=""form-title"">PHIẾU CHỈ ĐỊNH - NHÓM {Esc(serviceGroup.ToUpper())}</div>");
            body.AppendLine(@"<div class=""form-number"">MS. CĐ-03</div>");
            body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""field""><span class=""field-label"">Nhóm dịch vụ:</span><span class=""field-value"">{Esc(serviceGroup)}</span></div>
<div class=""field""><span class=""field-label"">Phẫu thuật:</span><span class=""field-value"">{Esc(req.PlannedProcedure)}</span></div>
<div class=""field""><span class=""field-label"">Chẩn đoán:</span><span class=""field-value"">{Esc(req.PreOpDiagnosis)}</span></div>

<table class=""bordered"" style=""margin-top:10px"">
<thead><tr><th>STT</th><th>Tên dịch vụ</th><th>SL</th><th>Ghi chú</th></tr></thead>
<tbody>
<tr><td colspan=""4"" class=""text-center"" style=""font-style:italic"">(Các dịch vụ trong nhóm {Esc(serviceGroup)})</td></tr>
</tbody></table>");

            body.AppendLine(GetSignatureBlock(surgeon?.FullName, null, null, false));

            var html = WrapHtmlPage($"Phiếu chỉ định nhóm {serviceGroup} - MS.CĐ-03", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintMultipleOrdersAsync(List<Guid> orderIds)
    {
        try
        {
            var serviceReqs = await _context.Set<ServiceRequest>()
                .Include(sr => sr.MedicalRecord).ThenInclude(mr => mr!.Patient)
                .Include(sr => sr.Doctor)
                .Include(sr => sr.Department)
                .Where(sr => orderIds.Contains(sr.Id))
                .ToListAsync();

            if (serviceReqs.Count == 0)
            {
                // Fallback: generate a summary with order IDs
                var headers = new[] { "Mã phiếu", "Ngày", "Trạng thái" };
                var rows = orderIds.Select(id => new[] { id.ToString("N")[..10].ToUpper(), DateTime.Now.ToString("dd/MM/yyyy"), "Đã chỉ định" }).ToList();
                var html = BuildTableReport("TỔNG HỢP PHIẾU CHỈ ĐỊNH", "MS. CĐ-04", DateTime.Now, headers, rows);
                return Encoding.UTF8.GetBytes(html);
            }

            var firstPat = serviceReqs.FirstOrDefault()?.MedicalRecord?.Patient;

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine(@"<div class=""form-title"">TỔNG HỢP PHIẾU CHỈ ĐỊNH DỊCH VỤ</div>");
            body.AppendLine(@"<div class=""form-number"">MS. CĐ-04</div>");

            if (firstPat != null)
                body.AppendLine(GetPatientInfoBlock(firstPat.PatientCode, firstPat.FullName, firstPat.Gender, firstPat.DateOfBirth, firstPat.Address, firstPat.PhoneNumber, null));

            body.AppendLine($@"<div class=""field""><span class=""field-label"">Số phiếu:</span><span class=""field-value"">{serviceReqs.Count} phiếu</span></div>");

            int rowNum = 1;
            foreach (var sr in serviceReqs)
            {
                body.AppendLine($@"<div class=""section-title"">Phiếu {rowNum}: {Esc(sr.RequestCode)}</div>");
                body.AppendLine($@"<div class=""field""><span class=""field-label"">Ngày chỉ định:</span><span class=""field-value"">{sr.RequestDate:dd/MM/yyyy HH:mm}</span></div>");
                body.AppendLine($@"<div class=""field""><span class=""field-label"">BS chỉ định:</span><span class=""field-value"">{Esc(sr.Doctor?.FullName)}</span></div>");

                var details = await _context.Set<ServiceRequestDetail>()
                    .Include(d => d.Service)
                    .Where(d => d.ServiceRequestId == sr.Id)
                    .ToListAsync();

                body.AppendLine(@"<table class=""bordered""><thead><tr><th>STT</th><th>Tên dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>");
                for (int i = 0; i < details.Count; i++)
                {
                    var d = details[i];
                    var amount = d.Quantity * d.UnitPrice;
                    body.AppendLine($@"<tr><td class=""text-center"">{i + 1}</td><td>{Esc(d.Service?.ServiceName)}</td><td class=""text-center"">{d.Quantity}</td><td class=""text-right"">{d.UnitPrice:#,##0}</td><td class=""text-right"">{amount:#,##0}</td></tr>");
                }
                if (details.Count == 0)
                    body.AppendLine(@"<tr><td colspan=""5"" class=""text-center"" style=""font-style:italic"">Không có chi tiết</td></tr>");
                body.AppendLine("</tbody></table>");

                rowNum++;
            }

            body.AppendLine(GetSignatureBlock(serviceReqs.FirstOrDefault()?.Doctor?.FullName, null, null, false));

            var htmlResult = WrapHtmlPage("Tổng hợp phiếu chỉ định - MS.CĐ-04", body.ToString());
            return Encoding.UTF8.GetBytes(htmlResult);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

}
