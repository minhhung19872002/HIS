using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace HIS.Infrastructure.Services.HL7
{
    /// <summary>
    /// HL7 v2.x Message Parser
    /// Supports ORU (Observation Result), ORM (Order Message), ACK (Acknowledgment)
    /// </summary>
    public class HL7Parser
    {
        public const char SegmentSeparator = '\r';
        public const char FieldSeparator = '|';
        public const char ComponentSeparator = '^';
        public const char RepeatSeparator = '~';
        public const char EscapeCharacter = '\\';
        public const char SubComponentSeparator = '&';

        /// <summary>
        /// Parse HL7 message string to HL7Message object
        /// </summary>
        public HL7Message Parse(string rawMessage)
        {
            if (string.IsNullOrWhiteSpace(rawMessage))
                throw new ArgumentException("HL7 message cannot be empty");

            var message = new HL7Message { RawMessage = rawMessage };

            // Normalize line endings
            rawMessage = rawMessage.Replace("\r\n", "\r").Replace("\n", "\r");

            // Remove MLLP framing if present (0x0B at start, 0x1C 0x0D at end)
            rawMessage = StripMLLP(rawMessage);

            var segmentStrings = rawMessage.Split(new[] { SegmentSeparator }, StringSplitOptions.RemoveEmptyEntries);

            foreach (var segmentString in segmentStrings)
            {
                var segment = ParseSegment(segmentString.Trim());
                if (segment != null)
                {
                    message.Segments.Add(segment);
                }
            }

            // Extract common header info
            if (message.Segments.Any(s => s.Name == "MSH"))
            {
                var msh = message.Segments.First(s => s.Name == "MSH");
                message.MessageType = msh.GetField(9, 1); // MSH-9.1
                message.MessageTrigger = msh.GetField(9, 2); // MSH-9.2
                message.MessageControlId = msh.GetField(10); // MSH-10
                message.ProcessingId = msh.GetField(11); // MSH-11
                message.VersionId = msh.GetField(12); // MSH-12

                if (DateTime.TryParseExact(msh.GetField(7),
                    new[] { "yyyyMMddHHmmss", "yyyyMMddHHmm", "yyyyMMdd" },
                    null, System.Globalization.DateTimeStyles.None, out var timestamp))
                {
                    message.Timestamp = timestamp;
                }
            }

            return message;
        }

        /// <summary>
        /// Parse ORU^R01 message to extract lab results
        /// </summary>
        public List<HL7LabResult> ParseORU(HL7Message message)
        {
            var results = new List<HL7LabResult>();

            HL7Segment currentPID = null;
            HL7Segment currentOBR = null;

            foreach (var segment in message.Segments)
            {
                switch (segment.Name)
                {
                    case "PID":
                        currentPID = segment;
                        break;
                    case "OBR":
                        currentOBR = segment;
                        break;
                    case "OBX":
                        var result = ParseOBXSegment(segment, currentPID, currentOBR);
                        if (result != null)
                        {
                            results.Add(result);
                        }
                        break;
                }
            }

            return results;
        }

        /// <summary>
        /// Parse ORM^O01 message to extract orders
        /// </summary>
        public List<HL7Order> ParseORM(HL7Message message)
        {
            var orders = new List<HL7Order>();

            HL7Segment currentPID = null;

            foreach (var segment in message.Segments)
            {
                switch (segment.Name)
                {
                    case "PID":
                        currentPID = segment;
                        break;
                    case "ORC":
                        var nextOBR = message.Segments
                            .SkipWhile(s => s != segment)
                            .Skip(1)
                            .FirstOrDefault(s => s.Name == "OBR");

                        var order = ParseOrderSegments(segment, nextOBR, currentPID);
                        if (order != null)
                        {
                            orders.Add(order);
                        }
                        break;
                }
            }

            return orders;
        }

        private HL7Segment ParseSegment(string segmentString)
        {
            if (string.IsNullOrWhiteSpace(segmentString))
                return null;

            var fields = segmentString.Split(FieldSeparator);
            if (fields.Length == 0)
                return null;

            var segment = new HL7Segment
            {
                Name = fields[0],
                RawValue = segmentString
            };

            // Special handling for MSH - the field separator is actually the first field
            if (segment.Name == "MSH")
            {
                segment.Fields.Add(new HL7Field { Value = FieldSeparator.ToString(), Components = new List<string> { FieldSeparator.ToString() } });
            }

            for (int i = (segment.Name == "MSH" ? 1 : 1); i < fields.Length; i++)
            {
                var field = new HL7Field
                {
                    Value = fields[i],
                    Components = fields[i].Split(ComponentSeparator).ToList()
                };
                segment.Fields.Add(field);
            }

            return segment;
        }

        private HL7LabResult ParseOBXSegment(HL7Segment obx, HL7Segment pid, HL7Segment obr)
        {
            var result = new HL7LabResult
            {
                SetId = obx.GetField(1),
                ValueType = obx.GetField(2), // NM, ST, CE, TX, etc.
                TestCode = obx.GetField(3, 1), // OBX-3.1 (Identifier)
                TestName = obx.GetField(3, 2), // OBX-3.2 (Text)
                TestCodingSystem = obx.GetField(3, 3), // OBX-3.3 (Coding System)
                SubId = obx.GetField(4),
                Value = obx.GetField(5),
                Units = obx.GetField(6, 1),
                ReferenceRange = obx.GetField(7),
                AbnormalFlag = obx.GetField(8), // H, L, HH, LL, N, A, etc.
                Probability = obx.GetField(9),
                NatureOfAbnormalTest = obx.GetField(10),
                ResultStatus = obx.GetField(11), // F=Final, P=Preliminary, C=Corrected
                DateOfLastChange = ParseHL7DateTime(obx.GetField(12)),
                UserDefinedAccessChecks = obx.GetField(13),
                DateTimeOfObservation = ParseHL7DateTime(obx.GetField(14)),
                ProducerId = obx.GetField(15, 1),
                ResponsibleObserver = obx.GetField(16, 1),
                ObservationMethod = obx.GetField(17, 1)
            };

            // Parse patient info from PID
            if (pid != null)
            {
                result.PatientId = pid.GetField(3, 1); // PID-3.1 (Patient ID)
                result.PatientName = FormatPatientName(pid.GetField(5, 1), pid.GetField(5, 2)); // PID-5
                result.DateOfBirth = ParseHL7DateTime(pid.GetField(7));
                result.Gender = pid.GetField(8);
            }

            // Parse order info from OBR
            if (obr != null)
            {
                result.SampleId = obr.GetField(3, 1); // OBR-3.1 (Filler Order Number)
                result.PlacerOrderNumber = obr.GetField(2, 1); // OBR-2.1
                result.OrderCode = obr.GetField(4, 1); // OBR-4.1
                result.OrderName = obr.GetField(4, 2); // OBR-4.2
                result.CollectionDateTime = ParseHL7DateTime(obr.GetField(7));
                result.SpecimenReceivedDateTime = ParseHL7DateTime(obr.GetField(14));
                result.ResultDateTime = ParseHL7DateTime(obr.GetField(22));
            }

            return result;
        }

        private HL7Order ParseOrderSegments(HL7Segment orc, HL7Segment obr, HL7Segment pid)
        {
            if (orc == null) return null;

            var order = new HL7Order
            {
                OrderControl = orc.GetField(1), // NW=New, CA=Cancel, etc.
                PlacerOrderNumber = orc.GetField(2, 1),
                FillerOrderNumber = orc.GetField(3, 1),
                PlacerGroupNumber = orc.GetField(4, 1),
                OrderStatus = orc.GetField(5),
                TransactionDateTime = ParseHL7DateTime(orc.GetField(9)),
                EnteredBy = orc.GetField(10, 1),
                OrderingProvider = orc.GetField(12, 1),
                EnteringDevice = orc.GetField(18, 1),
                ActionBy = orc.GetField(19, 1)
            };

            if (obr != null)
            {
                order.TestCode = obr.GetField(4, 1);
                order.TestName = obr.GetField(4, 2);
                order.Priority = obr.GetField(5);
                order.RequestedDateTime = ParseHL7DateTime(obr.GetField(6));
                order.CollectionDateTime = ParseHL7DateTime(obr.GetField(7));
                order.SpecimenSource = obr.GetField(15, 1);
                order.OrderingProvider = string.IsNullOrEmpty(order.OrderingProvider)
                    ? obr.GetField(16, 1)
                    : order.OrderingProvider;
            }

            if (pid != null)
            {
                order.PatientId = pid.GetField(3, 1);
                order.PatientName = FormatPatientName(pid.GetField(5, 1), pid.GetField(5, 2));
                order.DateOfBirth = ParseHL7DateTime(pid.GetField(7));
                order.Gender = pid.GetField(8);
            }

            return order;
        }

        private DateTime? ParseHL7DateTime(string hl7DateTime)
        {
            if (string.IsNullOrWhiteSpace(hl7DateTime))
                return null;

            // HL7 datetime formats: YYYY, YYYYMM, YYYYMMDD, YYYYMMDDHHmm, YYYYMMDDHHmmss, etc.
            var formats = new[]
            {
                "yyyyMMddHHmmss.ffff",
                "yyyyMMddHHmmss.fff",
                "yyyyMMddHHmmss.ff",
                "yyyyMMddHHmmss.f",
                "yyyyMMddHHmmss",
                "yyyyMMddHHmm",
                "yyyyMMddHH",
                "yyyyMMdd",
                "yyyyMM",
                "yyyy"
            };

            // Remove timezone offset if present (+0700, -0500, etc.)
            var cleanDateTime = Regex.Replace(hl7DateTime, @"[+-]\d{4}$", "");

            foreach (var format in formats)
            {
                if (DateTime.TryParseExact(cleanDateTime, format,
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var result))
                {
                    return result;
                }
            }

            return null;
        }

        private string FormatPatientName(string familyName, string givenName)
        {
            if (string.IsNullOrWhiteSpace(familyName) && string.IsNullOrWhiteSpace(givenName))
                return null;

            return $"{familyName ?? ""} {givenName ?? ""}".Trim();
        }

        private string StripMLLP(string message)
        {
            // MLLP framing: <VT> message <FS><CR>
            // VT = 0x0B (vertical tab)
            // FS = 0x1C (file separator)
            // CR = 0x0D (carriage return)

            if (message.Length > 0 && message[0] == '\x0B')
            {
                message = message.Substring(1);
            }

            if (message.Length >= 2 && message[^2] == '\x1C' && message[^1] == '\x0D')
            {
                message = message.Substring(0, message.Length - 2);
            }
            else if (message.Length >= 1 && message[^1] == '\x1C')
            {
                message = message.Substring(0, message.Length - 1);
            }

            return message;
        }

        /// <summary>
        /// Build ACK message in response to received message
        /// </summary>
        public string BuildACK(HL7Message originalMessage, string ackCode = "AA", string errorMessage = null)
        {
            var msh = originalMessage.Segments.FirstOrDefault(s => s.Name == "MSH");
            if (msh == null)
                throw new ArgumentException("Original message must contain MSH segment");

            var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
            var messageControlId = Guid.NewGuid().ToString("N").Substring(0, 20);

            var sb = new StringBuilder();

            // MSH segment - swap sending/receiving application and facility
            sb.Append($"MSH|^~\\&|");
            sb.Append($"{msh.GetField(5)}|"); // Receiving App -> Sending App
            sb.Append($"{msh.GetField(6)}|"); // Receiving Facility -> Sending Facility
            sb.Append($"{msh.GetField(3)}|"); // Sending App -> Receiving App
            sb.Append($"{msh.GetField(4)}|"); // Sending Facility -> Receiving Facility
            sb.Append($"{timestamp}||");
            sb.Append($"ACK^{originalMessage.MessageTrigger ?? "R01"}|");
            sb.Append($"{messageControlId}|");
            sb.Append($"{msh.GetField(11)}|"); // Processing ID
            sb.Append($"{msh.GetField(12)}"); // Version
            sb.Append(SegmentSeparator);

            // MSA segment - Message Acknowledgment
            sb.Append($"MSA|");
            sb.Append($"{ackCode}|"); // AA=Accept, AE=Application Error, AR=Application Reject
            sb.Append($"{originalMessage.MessageControlId}|");
            sb.Append($"{errorMessage ?? ""}");
            sb.Append(SegmentSeparator);

            // Add ERR segment if there's an error
            if (ackCode != "AA" && !string.IsNullOrEmpty(errorMessage))
            {
                sb.Append($"ERR|");
                sb.Append($"^^^{ackCode}|");
                sb.Append($"|{errorMessage}");
                sb.Append(SegmentSeparator);
            }

            return sb.ToString();
        }

        /// <summary>
        /// Build ORM^O01 message for sending worklist to analyzer
        /// </summary>
        public string BuildORM(HL7WorklistRequest request)
        {
            var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
            var messageControlId = request.MessageControlId ?? Guid.NewGuid().ToString("N").Substring(0, 20);

            var sb = new StringBuilder();

            // MSH segment
            sb.Append($"MSH|^~\\&|");
            sb.Append($"{request.SendingApplication ?? "HIS"}|");
            sb.Append($"{request.SendingFacility ?? "HOSPITAL"}|");
            sb.Append($"{request.ReceivingApplication ?? "LIS"}|");
            sb.Append($"{request.ReceivingFacility ?? "LAB"}|");
            sb.Append($"{timestamp}||");
            sb.Append($"ORM^O01|");
            sb.Append($"{messageControlId}|");
            sb.Append($"P|"); // Production
            sb.Append($"2.5"); // HL7 Version
            sb.Append(SegmentSeparator);

            // PID segment
            sb.Append($"PID|1||");
            sb.Append($"{request.PatientId}^^^MRN||");
            sb.Append($"{request.PatientFamilyName ?? ""}^{request.PatientGivenName ?? ""}||");
            sb.Append($"{request.DateOfBirth?.ToString("yyyyMMdd") ?? ""}|");
            sb.Append($"{request.Gender ?? "U"}");
            sb.Append(SegmentSeparator);

            // PV1 segment (Patient Visit)
            sb.Append($"PV1|1|");
            sb.Append($"{request.PatientClass ?? "O"}|"); // O=Outpatient, I=Inpatient
            sb.Append($"{request.Location ?? ""}|||");
            sb.Append($"{request.AttendingDoctor ?? ""}");
            sb.Append(SegmentSeparator);

            // ORC and OBR segments for each test
            int setId = 1;
            foreach (var test in request.Tests)
            {
                // ORC segment (Common Order)
                sb.Append($"ORC|");
                sb.Append($"NW|"); // Order Control: New Order
                sb.Append($"{request.PlacerOrderNumber ?? request.SampleId}|");
                sb.Append($"{test.FillerOrderNumber ?? ""}|");
                sb.Append($"|"); // Placer Group Number
                sb.Append($"SC|"); // Order Status: Scheduled
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"{timestamp}|"); // Transaction Date/Time
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"{request.OrderingProvider ?? ""}|||");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"{request.OrderingFacility ?? ""}");
                sb.Append(SegmentSeparator);

                // OBR segment (Observation Request)
                sb.Append($"OBR|");
                sb.Append($"{setId++}|");
                sb.Append($"{request.PlacerOrderNumber ?? request.SampleId}|");
                sb.Append($"{request.SampleId}|"); // Filler Order Number (Barcode/Sample ID)
                sb.Append($"{test.TestCode}^{test.TestName}||");
                sb.Append($"{request.RequestedDateTime?.ToString("yyyyMMddHHmmss") ?? timestamp}|");
                sb.Append($"{request.CollectionDateTime?.ToString("yyyyMMddHHmmss") ?? ""}|||");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"{request.SpecimenSource ?? ""}|");
                sb.Append($"{request.OrderingProvider ?? ""}|||");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"|");
                sb.Append($"{(request.IsPriority ? "S" : "R")}"); // Priority: S=Stat, R=Routine
                sb.Append(SegmentSeparator);
            }

            return sb.ToString();
        }

        /// <summary>
        /// Wrap message with MLLP framing
        /// </summary>
        public string WrapMLLP(string message)
        {
            return $"\x0B{message}\x1C\x0D";
        }
    }

    #region HL7 Data Models

    public class HL7Message
    {
        public string RawMessage { get; set; }
        public string MessageType { get; set; }
        public string MessageTrigger { get; set; }
        public string MessageControlId { get; set; }
        public string ProcessingId { get; set; }
        public string VersionId { get; set; }
        public DateTime? Timestamp { get; set; }
        public List<HL7Segment> Segments { get; set; } = new();

        public HL7Segment GetSegment(string name) => Segments.FirstOrDefault(s => s.Name == name);
        public IEnumerable<HL7Segment> GetSegments(string name) => Segments.Where(s => s.Name == name);
    }

    public class HL7Segment
    {
        public string Name { get; set; }
        public string RawValue { get; set; }
        public List<HL7Field> Fields { get; set; } = new();

        /// <summary>
        /// Get field value by 1-based index
        /// </summary>
        public string GetField(int fieldIndex, int componentIndex = 0)
        {
            // Adjust for MSH segment where field separator counts as field 1
            int adjustedIndex = fieldIndex - 1;

            if (adjustedIndex < 0 || adjustedIndex >= Fields.Count)
                return null;

            var field = Fields[adjustedIndex];

            if (componentIndex == 0)
                return field.Value;

            if (componentIndex - 1 >= 0 && componentIndex - 1 < field.Components.Count)
                return field.Components[componentIndex - 1];

            return null;
        }
    }

    public class HL7Field
    {
        public string Value { get; set; }
        public List<string> Components { get; set; } = new();
    }

    public class HL7LabResult
    {
        // OBX fields
        public string SetId { get; set; }
        public string ValueType { get; set; }
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public string TestCodingSystem { get; set; }
        public string SubId { get; set; }
        public string Value { get; set; }
        public string Units { get; set; }
        public string ReferenceRange { get; set; }
        public string AbnormalFlag { get; set; }
        public string Probability { get; set; }
        public string NatureOfAbnormalTest { get; set; }
        public string ResultStatus { get; set; }
        public DateTime? DateOfLastChange { get; set; }
        public string UserDefinedAccessChecks { get; set; }
        public DateTime? DateTimeOfObservation { get; set; }
        public string ProducerId { get; set; }
        public string ResponsibleObserver { get; set; }
        public string ObservationMethod { get; set; }

        // From PID
        public string PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string Gender { get; set; }

        // From OBR
        public string SampleId { get; set; }
        public string PlacerOrderNumber { get; set; }
        public string OrderCode { get; set; }
        public string OrderName { get; set; }
        public DateTime? CollectionDateTime { get; set; }
        public DateTime? SpecimenReceivedDateTime { get; set; }
        public DateTime? ResultDateTime { get; set; }

        /// <summary>
        /// Determine if result is abnormal based on flag
        /// </summary>
        public bool IsAbnormal => !string.IsNullOrEmpty(AbnormalFlag) &&
            AbnormalFlag.ToUpper() != "N" && AbnormalFlag.ToUpper() != "NORMAL";

        /// <summary>
        /// Determine if result is critical
        /// </summary>
        public bool IsCritical => !string.IsNullOrEmpty(AbnormalFlag) &&
            (AbnormalFlag.ToUpper().Contains("HH") || AbnormalFlag.ToUpper().Contains("LL") ||
             AbnormalFlag.ToUpper().Contains("PANIC") || AbnormalFlag.ToUpper().Contains("CRIT"));
    }

    public class HL7Order
    {
        // ORC fields
        public string OrderControl { get; set; }
        public string PlacerOrderNumber { get; set; }
        public string FillerOrderNumber { get; set; }
        public string PlacerGroupNumber { get; set; }
        public string OrderStatus { get; set; }
        public DateTime? TransactionDateTime { get; set; }
        public string EnteredBy { get; set; }
        public string OrderingProvider { get; set; }
        public string EnteringDevice { get; set; }
        public string ActionBy { get; set; }

        // OBR fields
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public string Priority { get; set; }
        public DateTime? RequestedDateTime { get; set; }
        public DateTime? CollectionDateTime { get; set; }
        public string SpecimenSource { get; set; }

        // From PID
        public string PatientId { get; set; }
        public string PatientName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string Gender { get; set; }
    }

    public class HL7WorklistRequest
    {
        // Message header info
        public string MessageControlId { get; set; }
        public string SendingApplication { get; set; }
        public string SendingFacility { get; set; }
        public string ReceivingApplication { get; set; }
        public string ReceivingFacility { get; set; }

        // Patient info
        public string PatientId { get; set; }
        public string PatientFamilyName { get; set; }
        public string PatientGivenName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string PatientClass { get; set; }
        public string Location { get; set; }
        public string AttendingDoctor { get; set; }

        // Order info
        public string SampleId { get; set; }
        public string PlacerOrderNumber { get; set; }
        public string OrderingProvider { get; set; }
        public string OrderingFacility { get; set; }
        public string SpecimenSource { get; set; }
        public DateTime? RequestedDateTime { get; set; }
        public DateTime? CollectionDateTime { get; set; }
        public bool IsPriority { get; set; }

        // Tests to order
        public List<HL7TestRequest> Tests { get; set; } = new();
    }

    public class HL7TestRequest
    {
        public string TestCode { get; set; }
        public string TestName { get; set; }
        public string FillerOrderNumber { get; set; }
    }

    #endregion
}
