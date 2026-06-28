using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.BloodBank;
using HIS.API.Controllers;

namespace HIS.API.Dtos.BloodBankComplete;

    public class BloodBankCancelRequest
    {
        public string Reason { get; set; }
    }

    public class BloodBankUpdateStatusRequest
    {
        public string Status { get; set; }
        public string Reason { get; set; }
    }

    public class DestroyBloodBagsRequest
    {
        public List<Guid> BloodBagIds { get; set; }
        public string Reason { get; set; }
    }

    public class AssignBloodBagRequest
    {
        public Guid BloodBagId { get; set; }
    }

    public class UnassignBloodBagRequest
    {
        public Guid BloodBagId { get; set; }
        public string Reason { get; set; }
    }

    public class CrossMatchResultRequest
    {
        public Guid BloodBagId { get; set; }
        public string Result { get; set; }
        public string Note { get; set; }
    }

    public class TransfusionRequest
    {
        public Guid BloodBagId { get; set; }
    }

    public class CompleteTransfusionRequest
    {
        public Guid BloodBagId { get; set; }
        public string Note { get; set; }
    }

    public class TransfusionReactionRequest
    {
        public Guid BloodBagId { get; set; }
        public string Reaction { get; set; }
        public string Action { get; set; }
    }

