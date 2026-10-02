/**
 * QA-R15: Vietnamese-aware client-side search for list filters.
 *
 * `hay.toLowerCase().includes(q)` is accent-sensitive and Unicode-form-sensitive: reception staff type
 * "nguyen" for "Nguyễn", and a name saved from a macOS/iOS keyboard or pasted from a PDF is decomposed (NFD),
 * so even the exact NFC spelling missed it. Both sides are folded the same way as the backend's
 * `VnSearchText.Fold`: Đ/đ → D/d, strip combining marks, lowercase.
 */
export const foldVn = (value?: string | null): string =>
  (value ?? '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** True when `needle` is blank or occurs in any of `values`, ignoring accents, case and NFC/NFD form. */
export const vnIncludes = (values: string | null | undefined | ReadonlyArray<string | null | undefined>, needle: string): boolean => {
  const n = foldVn(needle).trim();
  if (!n) return true;
  const list = Array.isArray(values) ? values : [values as string | null | undefined];
  return list.some((v) => foldVn(v).includes(n));
};
