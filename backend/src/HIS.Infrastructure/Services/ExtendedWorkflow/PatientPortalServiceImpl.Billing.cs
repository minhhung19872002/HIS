using HIS.Application.DTOs.PatientPortal;
using HIS.Core.Common;
using HIS.Core.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

// K-wave5: tach tu PatientPortalServiceImpl.cs — Prescriptions/Refill, Invoices/Payment,
// Feedback/Notifications, Dashboard, Family Members (~260 dong).
public partial class PatientPortalServiceImpl
{
    public async Task<List<PortalPrescriptionDto>> GetPrescriptionsAsync(Guid patientId, bool activeOnly = true)
    {
        var query = _context.Prescriptions
            .Include(x => x.MedicalRecord).ThenInclude(m => m!.Patient)
            .Include(x => x.Doctor)
            .Include(x => x.Department)
            .AsQueryable();
        if (patientId != Guid.Empty) query = query.Where(x => x.MedicalRecord!.PatientId == patientId);
        var list = await query.OrderByDescending(x => x.PrescriptionDate).Take(30).ToListAsync();
        return list.Select(e => new PortalPrescriptionDto {
            Id = e.Id,
            PrescriptionCode = e.PrescriptionCode ?? "",
            PrescriptionDate = e.PrescriptionDate,
            VisitId = e.MedicalRecordId,
            PatientId = e.MedicalRecord?.PatientId,
            PatientCode = e.MedicalRecord?.Patient?.PatientCode ?? "",
            PatientName = e.MedicalRecord?.Patient?.FullName ?? "",
            Diagnosis = e.Diagnosis ?? "",
            DoctorName = e.Doctor?.FullName ?? "",
            DepartmentName = e.Department?.DepartmentName ?? "",
            Status = e.Status == 2 ? "FullyDispensed" : e.Status == 1 ? "Active" : "Pending",
            Items = new List<PrescriptionItemDto>()
        }).ToList();
    }

    public async Task<PortalPrescriptionDto> GetPrescriptionAsync(Guid id)
    {
        var e = await _context.Prescriptions.Include(x => x.Details).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalPrescriptionDto { Id = e.Id, PrescriptionDate = e.PrescriptionDate, Status = e.Status == 2 ? "FullyDispensed" : e.Status == 1 ? "Active" : "Pending" };
    }

    // F9: yêu cầu cấp lại đơn persist THẬT (trước chỉ trả DTO, không lưu).
    public async Task<RefillRequestDto> RequestRefillAsync(RefillRequestDto dto)
    {
        var entity = new RefillRequest
        {
            Id = Guid.NewGuid(),
            PrescriptionId = dto.PrescriptionId,
            DeliveryOption = string.IsNullOrWhiteSpace(dto.DeliveryOption) ? "Pickup" : dto.DeliveryOption,
            DeliveryAddress = dto.DeliveryAddress,
            DeliveryPhone = dto.DeliveryPhone,
            PreferredPharmacyId = dto.PreferredPharmacyId,
            Notes = dto.Notes,
            Status = "Pending",
            RequestedAt = DateTime.Now,
            CreatedAt = DateTime.Now,
        };
        _context.RefillRequests.Add(entity);
        await _context.SaveChangesAsync();
        dto.Id = entity.Id; dto.Status = entity.Status; dto.RequestedAt = entity.RequestedAt;
        return dto;
    }

    public async Task<List<PortalPrescriptionDto>> GetRefillHistoryAsync(Guid patientId)
    {
        var list = await (from r in _context.RefillRequests.Where(x => !x.IsDeleted)
                          join p in _context.Prescriptions on r.PrescriptionId equals p.Id
                          join mr in _context.MedicalRecords on p.MedicalRecordId equals mr.Id
                          where mr.PatientId == patientId
                          orderby r.RequestedAt descending
                          select new PortalPrescriptionDto { Id = p.Id, PrescriptionDate = r.RequestedAt, Status = r.Status })
                         .Take(50).ToListAsync();
        return list;
    }

    public async Task<List<PortalInvoiceDto>> GetInvoicesAsync(Guid patientId, bool unpaidOnly = false)
    {
        var query = _context.Receipts.AsQueryable();
        if (patientId != Guid.Empty) query = query.Where(x => x.PatientId == patientId);
        if (unpaidOnly) query = query.Where(x => x.Status != 1);
        var list = await query.OrderByDescending(x => x.ReceiptDate).Take(30).ToListAsync();
        return list.Select(e => new PortalInvoiceDto { Id = e.Id, InvoiceCode = e.ReceiptCode, InvoiceDate = e.ReceiptDate, TotalAmount = e.FinalAmount, PaymentStatus = e.Status == 1 ? "Paid" : "Unpaid" }).ToList();
    }

    public async Task<PortalInvoiceDto> GetInvoiceAsync(Guid id)
    {
        var e = await _context.Receipts.Include(x => x.Details).FirstOrDefaultAsync(x => x.Id == id);
        return e == null ? null! : new PortalInvoiceDto { Id = e.Id, InvoiceCode = e.ReceiptCode, InvoiceDate = e.ReceiptDate, TotalAmount = e.FinalAmount, PaymentStatus = e.Status == 1 ? "Paid" : "Unpaid" };
    }

    public async Task<OnlinePaymentDto> InitiatePaymentAsync(Guid patientId, InitiatePaymentDto dto)
    {
        var invoiceId = dto.InvoiceIds?.FirstOrDefault() ?? Guid.Empty;
        var invoice = await _context.Receipts.FindAsync(invoiceId);
        var amount = invoice?.FinalAmount ?? 0;
        var entity = new OnlinePayment { Id = Guid.NewGuid(), PatientId = patientId, ReferenceId = invoiceId, PaymentType = "Invoice", Amount = amount, PaymentMethod = dto.PaymentMethod ?? "VNPay", Status = "Pending", TransactionCode = CodeGenerator.Timestamp("PAY"), CreatedAt = DateTime.Now };
        _context.OnlinePayments.Add(entity);
        await _context.SaveChangesAsync();
        return new OnlinePaymentDto { Id = entity.Id, Amount = entity.Amount, PaymentMethod = entity.PaymentMethod, Status = entity.Status };
    }

    public async Task<OnlinePaymentDto> GetPaymentStatusAsync(Guid paymentId)
    {
        var e = await _context.OnlinePayments.FindAsync(paymentId);
        return e == null ? null! : new OnlinePaymentDto { Id = e.Id, Amount = e.Amount, PaymentMethod = e.PaymentMethod, Status = e.Status, TransactionCode = e.TransactionCode };
    }

    public async Task<bool> ProcessPaymentCallbackAsync(string transactionCode, string gatewayResponse)
    {
        var e = await _context.OnlinePayments.FirstOrDefaultAsync(x => x.TransactionCode == transactionCode);
        if (e == null) return false;
        e.Status = gatewayResponse.Contains("success") ? "Completed" : "Failed"; e.GatewayResponse = gatewayResponse; e.PaidAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    // F9: phản hồi/đánh giá dịch vụ persist THẬT (trước chỉ trả DTO rỗng).
    public async Task<ServiceFeedbackDto> SubmitFeedbackAsync(Guid patientId, SubmitFeedbackDto dto)
    {
        var entity = new ServiceFeedback
        {
            Id = Guid.NewGuid(), PatientId = patientId, VisitId = dto.VisitId,
            OverallRating = dto.OverallRating, DoctorRating = dto.DoctorRating, StaffRating = dto.StaffRating,
            FacilityRating = dto.FacilityRating, WaitTimeRating = dto.WaitTimeRating,
            Comments = dto.Comments, WouldRecommend = dto.WouldRecommend,
            SubmittedAt = DateTime.Now, CreatedAt = DateTime.Now,
        };
        _context.ServiceFeedbacks.Add(entity);
        await _context.SaveChangesAsync();
        return new ServiceFeedbackDto
        {
            Id = entity.Id, VisitId = entity.VisitId, OverallRating = entity.OverallRating,
            DoctorRating = entity.DoctorRating, StaffRating = entity.StaffRating, FacilityRating = entity.FacilityRating,
            WaitTimeRating = entity.WaitTimeRating, Comments = entity.Comments, WouldRecommend = entity.WouldRecommend,
            SubmittedAt = entity.SubmittedAt,
        };
    }

    public async Task<List<PortalNotificationDto>> GetNotificationsAsync(Guid accountId, bool unreadOnly = false)
    {
        // Demo fallback: if accountId is empty or has no portal account, return latest 50 notifications.
        IQueryable<Notification> query;
        if (accountId == Guid.Empty)
        {
            query = _context.Notifications;
        }
        else
        {
            var account = await _context.PortalAccounts.FindAsync(accountId);
            query = account?.PatientId != null
                ? _context.Notifications.Where(x => x.TargetUserId == account.PatientId)
                : _context.Notifications;
        }
        if (unreadOnly) query = query.Where(x => !x.IsRead);
        var list = await query.OrderByDescending(x => x.CreatedAt).Take(50).ToListAsync();
        return list.Select(e => new PortalNotificationDto { Id = e.Id, Title = e.Title, Message = e.Content, IsRead = e.IsRead, CreatedAt = e.CreatedAt }).ToList();
    }

    public async Task<bool> MarkNotificationReadAsync(Guid id)
    {
        var e = await _context.Notifications.FindAsync(id);
        if (e == null) return false;
        e.IsRead = true; e.ReadAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> GetUnreadNotificationCountAsync(Guid accountId)
    {
        var account = await _context.PortalAccounts.FindAsync(accountId);
        if (account?.PatientId == null) return 0;
        return await _context.Notifications.CountAsync(x => x.TargetUserId == account.PatientId && !x.IsRead);
    }

    public async Task<PatientPortalDashboardDto> GetDashboardAsync(Guid patientId)
    {
        try
        {
            // Demo fallback: empty patientId aggregates across the whole hospital
            // so admin (no portal account) sees real numbers on the dashboard.
            var hasPatient = patientId != Guid.Empty;
            var upcomingAppointments = 0;
            try { upcomingAppointments = await _context.PortalAppointments.CountAsync(x => (!hasPatient || x.PatientId == patientId) && x.AppointmentDate >= DateTime.Today && x.Status != "Cancelled"); } catch (SqlException) { }
            var unpaidInvoices = 0;
            try { unpaidInvoices = await _context.Receipts.CountAsync(x => (!hasPatient || x.PatientId == patientId) && x.Status != 1); } catch (SqlException) { }
            var newLabResults = 0;
            // #14b: đếm KQ XN mới từ ServiceRequestDetail (model 1) thay LabResults (model 2 chết).
            try { newLabResults = await _context.ServiceRequestDetails.CountAsync(d => (!hasPatient || d.ServiceRequest.MedicalRecord.PatientId == patientId) && d.ServiceRequest.RequestType == 1 && d.Status == 2); } catch (SqlException) { }
            return new PatientPortalDashboardDto
            {
                PatientId = patientId,
                UpcomingAppointments = upcomingAppointments,
                UnpaidInvoices = unpaidInvoices,
                NewLabResults = newLabResults
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new PatientPortalDashboardDto { PatientId = patientId };
        }
    }

    // NangCap19: Family Members
    public async Task<List<FamilyMemberDto>> GetFamilyMembersAsync(Guid accountId)
    {
        try
        {
            // Demo fallback: empty accountId returns the first 20 rows so admin
            // (who has no portal account) can still see something on /patient-portal.
            var query = _context.FamilyMembers.Where(x => x.IsActive);
            if (accountId != Guid.Empty) query = query.Where(x => x.AccountId == accountId);
            var list = await query
                .OrderBy(x => x.FullName)
                .Take(20)
                .ToListAsync();
            return list.Select(e => new FamilyMemberDto
            {
                Id = e.Id, AccountId = e.AccountId, FullName = e.FullName, Relationship = e.Relationship,
                DateOfBirth = e.DateOfBirth ?? "", Gender = e.Gender ?? "", IdNumber = e.IdNumber ?? "",
                Phone = e.Phone ?? "", InsuranceNumber = e.InsuranceNumber ?? "",
                LinkedPatientId = e.LinkedPatientId, IsActive = e.IsActive, CreatedAt = e.CreatedAt
            }).ToList();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<FamilyMemberDto>();
        }
    }

    public async Task<FamilyMemberDto> SaveFamilyMemberAsync(SaveFamilyMemberDto dto)
    {
        var entity = dto.Id.HasValue && dto.Id != Guid.Empty
            ? await _context.FamilyMembers.FindAsync(dto.Id.Value) : null;
        if (entity == null)
        {
            entity = new FamilyMember { Id = Guid.NewGuid(), CreatedAt = DateTime.Now };
            _context.FamilyMembers.Add(entity);
        }
        entity.AccountId = dto.AccountId;
        entity.FullName = dto.FullName;
        entity.Relationship = dto.Relationship;
        entity.DateOfBirth = dto.DateOfBirth;
        entity.Gender = dto.Gender;
        entity.IdNumber = dto.IdNumber;
        entity.Phone = dto.Phone;
        entity.InsuranceNumber = dto.InsuranceNumber;
        entity.LinkedPatientId = dto.LinkedPatientId;
        entity.IsActive = true;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return new FamilyMemberDto
        {
            Id = entity.Id, AccountId = entity.AccountId, FullName = entity.FullName,
            Relationship = entity.Relationship, DateOfBirth = entity.DateOfBirth ?? "",
            Gender = entity.Gender ?? "", IdNumber = entity.IdNumber ?? "",
            Phone = entity.Phone ?? "", InsuranceNumber = entity.InsuranceNumber ?? "",
            LinkedPatientId = entity.LinkedPatientId, IsActive = entity.IsActive, CreatedAt = entity.CreatedAt
        };
    }

    public async Task<bool> DeleteFamilyMemberAsync(Guid id)
    {
        var entity = await _context.FamilyMembers.FindAsync(id);
        if (entity == null) return false;
        entity.IsActive = false;
        entity.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }
}
