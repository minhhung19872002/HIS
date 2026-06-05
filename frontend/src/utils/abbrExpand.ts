/* =====================================================================
 * abbrExpand — bung từ viết tắt kiểu macro (MQSoft F2) khi gõ văn bản.
 * Dùng chung: OPD (bệnh sử/khám/kết luận), LIS (nhập KQ), RIS (mô tả)…
 * Nguồn dữ liệu: AbbreviationController (api/abbreviation.ts) theo scope.
 * Cơ chế: khi user gõ xong 1 token + space/newline → nếu token trùng
 * `code` đã khai báo thì thay bằng `expansion` (case-insensitive).
 * ===================================================================== */
import { useEffect, useRef, useCallback } from 'react';
import { searchAbbreviations, type AbbreviationDto } from '../api/abbreviation';

/** Token vừa gõ xong ngay trước space/newline cuối chuỗi (hỗ trợ tiếng Việt). */
const LAST_TOKEN_RE = /(^|[\s(.,;:])([^\s(.,;:]+)([ \n])$/;

export function expandLastToken(text: string, dict: Map<string, string>): string {
  const m = text.match(LAST_TOKEN_RE);
  if (!m) return text;
  const expansion = dict.get(m[2].toLowerCase());
  if (!expansion) return text;
  const tokenStart = text.length - m[2].length - m[3].length;
  return text.slice(0, tokenStart) + expansion + m[3];
}

/**
 * Hook nạp từ điển viết tắt theo scope rồi trả hàm `expand(text)` để gọi
 * trong onChange của input/textarea: `setValue(expand(e.target.value))`.
 * `scopes` nên là hằng số khai báo ngoài component (tránh refetch mỗi render).
 */
export function useAbbrExpansion(scopes: readonly number[]) {
  const dictRef = useRef<Map<string, string>>(new Map());
  const scopeKey = scopes.join(',');

  useEffect(() => {
    let alive = true;
    (async () => {
      const all: AbbreviationDto[] = [];
      for (const scope of scopeKey.split(',').filter(Boolean).map(Number)) {
        try { all.push(...(await searchAbbreviations(scope) || [])); }
        catch { /* scope không tải được — bỏ qua, không chặn nhập liệu */ }
      }
      if (!alive) return;
      const dict = new Map<string, string>();
      all.filter((a) => a.isActive !== false && a.code).forEach((a) => dict.set(a.code.toLowerCase(), a.expansion));
      dictRef.current = dict;
    })();
    return () => { alive = false; };
  }, [scopeKey]);

  return useCallback((text: string) => expandLastToken(text, dictRef.current), []);
}
