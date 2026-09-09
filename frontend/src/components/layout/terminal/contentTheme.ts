import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';

/* Tách khỏi `TerminalLayout.tsx` để web quản trị app người bệnh (`admin-web/`) dùng lại được
   ĐÚNG bộ token này. Web đó là một SPA riêng — cố ý không nằm trong SPA của HIS, vì nó còn phải
   chạy được khi ghép với HIS của đơn vị khác — nhưng phải trông y hệt HIS. Chép bảng token sang
   đó là chắc chắn lệch: sửa một bên, bên kia ở lại. */

/**
 * Theme cho vùng nội dung v2 (ConfigProvider lồng trong shell). #381 dark+compact.
 * - Light mode: token/components giữ NGUYÊN palette sáng đang dùng (behavior-preserving).
 * - Dark mode: bỏ token bề-mặt sáng để `darkAlgorithm` tự sinh; giữ brand + shape.
 * - Compact: thêm `compactAlgorithm` + bỏ các height/padding hardcode để thuật toán thu gọn.
 */
export function buildContentTheme(isDark: boolean, isCompact: boolean): ThemeConfig {
  const { darkAlgorithm, defaultAlgorithm, compactAlgorithm } = antdTheme;
  const algorithm = [
    isDark ? darkAlgorithm : defaultAlgorithm,
    isCompact ? compactAlgorithm : null,
  ].filter(Boolean) as ThemeConfig['algorithm'];

  const token: ThemeConfig['token'] = {
    colorPrimary: '#2563eb',
    colorInfo: '#0284c7',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    fontFamily: 'Inter, "IBM Plex Sans", system-ui, sans-serif',
    fontSize: 13,
    fontSizeLG: 14,
    fontSizeSM: 12,
    fontSizeHeading1: 32,
    fontSizeHeading2: 26,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    lineHeight: 1.5,
    // Chiều cao control cố định chỉ khi KHÔNG compact (compactAlgorithm mới thu nhỏ được).
    ...(isCompact ? {} : { controlHeight: 34, controlHeightLG: 40, controlHeightSM: 26 }),
    // Palette bề-mặt sáng chỉ áp ở light; dark để darkAlgorithm tự sinh.
    ...(isDark
      ? {}
      : {
          colorText: '#0f172a',
          colorTextSecondary: '#334155',
          colorTextTertiary: '#64748b',
          colorBorder: '#e4e9f0',
          colorBorderSecondary: '#edf1f6',
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f7f9fc',
          colorBgElevated: '#ffffff',
          colorFillAlter: '#f1f5f9',
          colorFillContent: '#f1f5f9',
        }),
  };

  const components: ThemeConfig['components'] = {
    Button: { fontWeight: 500, ...(isCompact ? {} : { controlHeight: 34 }) },
    Card: { paddingLG: 18, ...(isCompact ? {} : { headerHeight: 44 }), ...(isDark ? {} : { headerBg: '#ffffff' }) },
    Table: {
      cellFontSize: 13,
      ...(isCompact ? {} : { cellPaddingBlock: 10, cellPaddingInline: 14 }),
      ...(isDark
        ? {}
        : {
            headerBg: '#f7f9fc',
            headerColor: '#64748b',
            headerSplitColor: '#e4e9f0',
            rowHoverBg: '#f7f9fc',
            rowSelectedBg: '#eff5ff',
            rowSelectedHoverBg: '#e5edf7',
            borderColor: '#f1f4f9',
          }),
    },
    Tabs: {
      titleFontSize: 13,
      horizontalItemGutter: 24,
      inkBarColor: '#2563eb',
      itemSelectedColor: '#2563eb',
      itemActiveColor: '#1d4ed8',
      ...(isDark ? {} : { itemHoverColor: '#0f172a' }),
    },
    Statistic: { titleFontSize: 11, contentFontSize: 26 },
    Modal: { titleFontSize: 15, ...(isDark ? {} : { headerBg: '#ffffff' }) },
    Drawer: { fontSizeLG: 15 },
    Alert: { defaultPadding: '8px 12px' },
    Form: { labelFontSize: 12, ...(isDark ? {} : { labelColor: '#64748b' }) },
    // Nhóm token thuần-màu sáng: chỉ áp ở light, dark để algorithm sinh.
    ...(isDark
      ? {}
      : {
          Menu: {
            itemBg: 'transparent',
            itemColor: '#334155',
            itemHoverBg: '#f1f5f9',
            itemSelectedBg: '#eff5ff',
            itemSelectedColor: '#2563eb',
            itemHeight: 36,
            itemBorderRadius: 4,
          },
          Tag: { defaultBg: '#f1f5f9', defaultColor: '#334155' },
          Input: {
            hoverBorderColor: '#bfd3fa',
            activeBorderColor: '#2563eb',
            activeShadow: '0 0 0 3px #eff5ff',
          },
          Select: { optionSelectedBg: '#eff5ff', optionSelectedColor: '#2563eb' },
          Descriptions: { titleColor: '#64748b', labelBg: '#f7f9fc' },
          Segmented: {
            itemSelectedBg: '#ffffff',
            itemSelectedColor: '#0f172a',
            trackBg: '#f7f9fc',
          },
        }),
  };

  return { algorithm, token, components };
}
