using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R7: small server-side HTML scrubber for client-supplied document snapshots (signing workflow
/// DocumentContent). No HTML-sanitizer package is referenced by the repo, so this keeps to a narrow,
/// conservative rule set instead of a full parser:
///   - comments and script-capable elements (script, iframe, object, embed, ...) are removed with their content;
///   - document-level tags (base, link, meta, form) are dropped, their text kept;
///   - only well-formed tags are re-emitted, attribute by attribute: on* handlers, srcdoc and any value that
///     resolves to javascript:/vbscript: (or a non-image data: URL) are dropped;
///   - any other '&lt;' (malformed markup such as &lt;img/src=x onerror=...&gt;) is emitted as text.
/// The print-form markup the EMR sends (div/table/span/img/svg + inline style + &lt;style&gt;) passes through.
/// </summary>
internal static class HtmlContentSanitizer
{
    private const RegexOptions Opts = RegexOptions.IgnoreCase | RegexOptions.CultureInvariant;
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(2);

    private static readonly Regex Comment = new(@"<!--[\s\S]*?(-->|$)", Opts, Timeout);
    private static readonly Regex DangerousBlock = new(
        @"<(script|iframe|frame|frameset|object|embed|applet|noscript|noembed|noframes|template|xmp|plaintext)\b[\s\S]*?</\1\s*>",
        Opts, Timeout);
    private static readonly Regex DangerousOpen = new(
        @"</?(script|iframe|frame|frameset|object|embed|applet|noscript|noembed|noframes|template|xmp|plaintext)\b[^>]*>?",
        Opts, Timeout);
    private static readonly Regex TagOrLt = new(
        @"<(?<close>/?)(?<name>[a-zA-Z][a-zA-Z0-9:-]*)(?<attrs>(?:\s+[^\s""'>/=]+(?:\s*=\s*(?:""[^""]*""|'[^']*'|[^\s""'>]+))?)*)\s*(?<self>/?)>|<",
        Opts, Timeout);
    private static readonly Regex Attr = new(
        @"(?<n>[^\s""'>/=]+)(?:\s*=\s*(?:""(?<v>[^""]*)""|'(?<v>[^']*)'|(?<v>[^\s""'>]+)))?",
        Opts, Timeout);
    private static readonly Regex SafeDataImage = new(@"^data:image/(png|jpe?g|gif|webp|bmp);", Opts, Timeout);

    private static readonly HashSet<string> DroppedTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "base", "link", "meta", "form", "html", "head", "body", "title", "isindex",
    };

    private static readonly HashSet<string> UrlAttrs = new(StringComparer.OrdinalIgnoreCase)
    {
        "href", "src", "xlink:href", "action", "formaction", "background", "poster", "data", "lowsrc", "dynsrc", "cite", "longdesc",
    };

    public static string Sanitize(string? html)
    {
        if (string.IsNullOrEmpty(html)) return string.Empty;
        var s = Comment.Replace(html, string.Empty);
        string prev;
        do { prev = s; s = DangerousBlock.Replace(s, string.Empty); } while (s != prev);
        s = DangerousOpen.Replace(s, string.Empty);
        return TagOrLt.Replace(s, RewriteTag);
    }

    private static string RewriteTag(Match m)
    {
        if (!m.Groups["name"].Success) return "&lt;"; // stray '<'
        var name = m.Groups["name"].Value;
        if (DroppedTags.Contains(name)) return string.Empty;
        if (m.Groups["close"].Value == "/") return "</" + name + ">";

        var sb = new StringBuilder("<").Append(name);
        foreach (Match a in Attr.Matches(m.Groups["attrs"].Value))
        {
            var attrName = a.Groups["n"].Value;
            if (!IsAllowedAttribute(attrName, a.Groups["v"].Success ? a.Groups["v"].Value : null)) continue;
            sb.Append(' ').Append(attrName);
            if (a.Groups["v"].Success)
                sb.Append("=\"").Append(a.Groups["v"].Value.Replace("\"", "&quot;")).Append('"');
        }
        if (m.Groups["self"].Value == "/") sb.Append(" /");
        return sb.Append('>').ToString();
    }

    private static bool IsAllowedAttribute(string name, string? rawValue)
    {
        if (name.StartsWith("on", StringComparison.OrdinalIgnoreCase)) return false;
        if (name.Equals("srcdoc", StringComparison.OrdinalIgnoreCase)
            || name.Equals("formaction", StringComparison.OrdinalIgnoreCase)) return false;
        if (rawValue == null) return true;

        // Decode entities and drop whitespace/control chars so "jav&#x61;script:" / "java\tscript:" are caught.
        var decoded = WebUtility.HtmlDecode(rawValue);
        var compact = new string(decoded.Where(c => !char.IsWhiteSpace(c) && !char.IsControl(c)).ToArray()).ToLowerInvariant();
        if (compact.Contains("javascript:") || compact.Contains("vbscript:") || compact.Contains("livescript:")) return false;
        if (name.Equals("style", StringComparison.OrdinalIgnoreCase)
            && (compact.Contains("expression(") || compact.Contains("-moz-binding") || compact.Contains("behavior:")))
            return false;
        if (UrlAttrs.Contains(name) && compact.StartsWith("data:") && !SafeDataImage.IsMatch(compact)) return false;
        return true;
    }
}
