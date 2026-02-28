using System.Xml;
using System.Xml.Schema;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// XSD schema validation service for BHXH XML 4210 files.
/// Loads XSD files from a designated folder. When no XSD files are present,
/// validation is skipped with a warning log (graceful degradation).
/// </summary>
public class XmlSchemaValidator
{
    private XmlSchemaSet? _schemaSet;
    private readonly string _xsdFolderPath;
    private readonly ILogger<XmlSchemaValidator> _logger;

    public XmlSchemaValidator(string xsdFolderPath, ILogger<XmlSchemaValidator> logger)
    {
        _xsdFolderPath = xsdFolderPath;
        _logger = logger;
        ReloadSchemas();
    }

    /// <summary>
    /// Load or reload all .xsd files from the configured folder.
    /// If no XSD files are found, _schemaSet is set to null (validation skipped).
    /// </summary>
    public void ReloadSchemas()
    {
        try
        {
            if (!Directory.Exists(_xsdFolderPath))
            {
                _logger.LogWarning("XSD folder not found at {Path}. XML validation will be skipped.", _xsdFolderPath);
                _schemaSet = null;
                return;
            }

            var xsdFiles = Directory.GetFiles(_xsdFolderPath, "*.xsd");
            if (xsdFiles.Length == 0)
            {
                _logger.LogWarning("No XSD schema files found in {Path}. XML validation will be skipped. " +
                    "Place official BHXH XSD files (.xsd) in this folder to enable validation.", _xsdFolderPath);
                _schemaSet = null;
                return;
            }

            var schemaSet = new XmlSchemaSet();
            foreach (var xsdFile in xsdFiles)
            {
                using var reader = XmlReader.Create(xsdFile);
                schemaSet.Add(null, reader);
                _logger.LogInformation("Loaded XSD schema: {FileName}", Path.GetFileName(xsdFile));
            }

            schemaSet.Compile();
            _schemaSet = schemaSet;
            _logger.LogInformation("XSD schema set compiled successfully with {Count} schemas from {Path}",
                xsdFiles.Length, _xsdFolderPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load XSD schemas from {Path}. XML validation will be skipped.", _xsdFolderPath);
            _schemaSet = null;
        }
    }

    /// <summary>
    /// Validate XML bytes against loaded XSD schemas.
    /// Returns empty list if no schemas are loaded (pass-through).
    /// </summary>
    /// <param name="xmlBytes">The XML content to validate</param>
    /// <param name="tableName">Table identifier (e.g. "XML1") for error reporting</param>
    /// <returns>List of validation errors/warnings. Empty list means valid or no schema available.</returns>
    public List<XmlValidationError> Validate(byte[] xmlBytes, string tableName)
    {
        var errors = new List<XmlValidationError>();

        if (_schemaSet == null)
        {
            _logger.LogDebug("No XSD schemas loaded. Skipping validation for {TableName}.", tableName);
            return errors;
        }

        try
        {
            var settings = new XmlReaderSettings
            {
                ValidationType = ValidationType.Schema,
                Schemas = _schemaSet
            };

            settings.ValidationEventHandler += (sender, e) =>
            {
                errors.Add(new XmlValidationError
                {
                    TableName = tableName,
                    Severity = e.Severity == XmlSeverityType.Error ? "Error" : "Warning",
                    Message = e.Message,
                    LineNumber = e.Exception?.LineNumber ?? 0,
                    LinePosition = e.Exception?.LinePosition ?? 0
                });
            };

            using var stream = new MemoryStream(xmlBytes);
            using var reader = XmlReader.Create(stream, settings);

            while (reader.Read()) { }

            if (errors.Count > 0)
            {
                _logger.LogWarning("XSD validation for {TableName}: {ErrorCount} error(s), {WarningCount} warning(s)",
                    tableName,
                    errors.Count(e => e.Severity == "Error"),
                    errors.Count(e => e.Severity == "Warning"));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "XSD validation failed for {TableName}. Treating as pass-through.", tableName);
            // Don't block export on validator crash -- return empty errors
        }

        return errors;
    }
}

/// <summary>
/// Represents a single XSD validation error or warning for BHXH XML.
/// </summary>
public class XmlValidationError
{
    public string TableName { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty; // "Error" or "Warning"
    public string Message { get; set; } = string.Empty;
    public int LineNumber { get; set; }
    public int LinePosition { get; set; }
}
