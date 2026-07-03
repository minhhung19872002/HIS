using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IBillingCompleteService — handles all billing/payment workflows.
///
/// K8 phien (2026-05-30): converted to partial class. ZERO runtime change — partial class.
/// </summary>
public partial class BillingCompleteService : IBillingCompleteService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IElectronicInvoiceProvider _eInvoiceProvider;
    private readonly ILogger<BillingCompleteService> _logger;
    private readonly IPaymentGatewayService _paymentGateway;

    public BillingCompleteService(
        HISDbContext context,
        IUnitOfWork unitOfWork,
        IElectronicInvoiceProvider eInvoiceProvider,
        ILogger<BillingCompleteService> logger,
        IPaymentGatewayService paymentGateway)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _eInvoiceProvider = eInvoiceProvider;
        _logger = logger;
        _paymentGateway = paymentGateway;
    }







}

