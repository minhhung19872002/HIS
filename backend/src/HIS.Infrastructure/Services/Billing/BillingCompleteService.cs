using System.Text;
using Microsoft.EntityFrameworkCore;
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

    public BillingCompleteService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }







}

