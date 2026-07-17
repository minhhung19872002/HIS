using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class HospitalPharmacyService : IHospitalPharmacyService
{
    private readonly HISDbContext _context;

    public HospitalPharmacyService(HISDbContext context)
    {
        _context = context;
    }




}
