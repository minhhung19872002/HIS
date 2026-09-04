"""Bản Python của HIS.API/Authorization/WritePermissionMap.cs (AUTHZ #216/F2).

Từ #216/F2, đường GHI không còn mang attribute trên từng action: WritePermissionConvention
gắn policy perm:{code} lúc dựng ApplicationModel theo bảng khai báo trong WritePermissionMap.cs.
Kiểm kê tĩnh vì thế phải ĐỌC CHÍNH FILE ĐÓ, nếu không nó sẽ báo "auth-only" cho những endpoint
thực tế đã được gate và ma trận sống sẽ so với kỳ vọng sai.

Đọc trực tiếp file .cs thay vì chép lại bảng sang Python: chỉ có một nguồn sự thật, sửa bảng
bên C# là script tự thấy.
"""
import re

MAP_CS = r"D:\Source\HIS\backend\src\HIS.API\Authorization\WritePermissionMap.cs"

READ_ISH = ("Search", "Check", "Estimate", "Calculate", "Preview", "Query", "Lookup", "Suggest")

_CONST = re.compile(r"PermissionCatalog\.(\w+)\.(\w+)")


def _code(expr):
    """'PermissionCatalog.Billing.Collect' -> 'Billing.Collect'"""
    m = _CONST.search(expr)
    return "{}.{}".format(m.group(1), m.group(2)) if m else None


def _set_block(src, name):
    m = re.search(name + r" = new\(StringComparer\.OrdinalIgnoreCase\)\s*\{(.*?)\n    \};", src, re.S)
    return set(re.findall(r'"([^"]+)"', m.group(1))) if m else set()


def load(path=MAP_CS):
    """-> (exempt_controllers, exempt_actions, {controller: (write, read, {action: perm})})"""
    src = open(path, encoding="utf-8").read()
    exempt_ctrl = _set_block(src, "ExemptControllers")
    exempt_act = _set_block(src, "ExemptActions")

    body = src.split("Rules = new Dictionary<string, Rule>", 1)[1]
    rules = {}
    entry = re.compile(
        r'\["(\w+)"\] = new\('              # ["Ctrl"] = new(
        r'([^\n]*?)'                        # Write[, Read]
        r'(?:,\s*new Dictionary<string, string>\s*\{(.*?)\n        \})?'  # optional overrides
        r'\),\s*\n',
        re.S)
    for m in entry.finditer(body):
        ctrl, head, over = m.group(1), m.group(2), m.group(3) or ""
        codes = [c for c in (_code(x) for x in head.split(",")) if c]
        write = codes[0] if codes else None
        read = codes[1] if len(codes) > 1 else None
        ovr = {}
        for om in re.finditer(r'\["(\w+)"\]\s*=\s*(PermissionCatalog\.\w+\.\w+)', over):
            ovr[om.group(1)] = _code(om.group(2))
        rules[ctrl] = (write, read, ovr)
    return exempt_ctrl, exempt_act, rules


EXEMPT_CTRL, EXEMPT_ACT, RULES = load()


def resolve(controller, action):
    """Bản Python của WritePermissionMap.Resolve. `controller` đã bỏ hậu tố 'Controller'."""
    if controller in EXEMPT_CTRL:
        return None
    if "{}.{}".format(controller, action) in EXEMPT_ACT:
        return None
    rule = RULES.get(controller)
    if not rule:
        return None
    write, read, ovr = rule
    if action in ovr:
        return ovr[action]
    if read and action.startswith(READ_ISH):
        return read
    return write


if __name__ == "__main__":
    print("controllers:", len(RULES), "| exempt ctrl:", sorted(EXEMPT_CTRL), "| exempt actions:", len(EXEMPT_ACT))
