/**
 * EMR print document wrapper — clone tất cả `<style>` + `<link rel="stylesheet">`
 * của trang hiện tại sang cửa sổ in để giữ Antd CSS + custom theme.
 *
 * Extracted khỏi pages/EMR.tsx (K20 Batch 1).
 */

export function buildPrintDocument(printMarkup: string): string {
  const styleMarkup = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]'),
  )
    .map((node) => node.outerHTML)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${document.documentElement.lang || 'vi'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>In biểu mẫu</title>
  <base href="${window.location.origin}" />
  ${styleMarkup}
  <style>
    html, body {
      background: #fff;
      margin: 0;
      padding: 0;
    }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: none !important;
    }
    @page {
      size: auto;
      margin: 12mm;
    }
  </style>
</head>
<body>
  ${printMarkup}
</body>
</html>`;
}
