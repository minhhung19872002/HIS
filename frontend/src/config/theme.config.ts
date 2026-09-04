/**
 * Theme config — cấu hình Ant Design ConfigProvider dùng chung toàn app.
 * #config-consolidation (tách verbatim từ App.tsx — behavior-preserving).
 *
 * `getAntdTheme(isDark)` trả về object theme y hệt bản inline cũ (token + components +
 * algorithm sáng/tối). App.tsx chỉ còn `<ConfigProvider theme={getAntdTheme(isDark)}>`.
 */
import { theme as antdTheme, type ThemeConfig } from 'antd';

export const getAntdTheme = (isDark: boolean): ThemeConfig => ({
  algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 10,
    borderRadiusLG: 12,
    borderRadiusSM: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.08)',
    controlHeight: 36,
    // #216/TC-PERM-020: colorText / colorTextSecondary / colorBgLayout TỪNG đặt cứng màu sáng ở
    // ngoài nhánh này, nên chúng ghi đè kết quả của darkAlgorithm: chữ ra #1f2937 (gần đen) trên
    // nền tối. Đo tại màn đăng nhập ở chế độ tối: chữ trong ô nhập rgb(31,41,55) — coi như không
    // đọc được. Lỗi ảnh hưởng MỌI chữ trong chế độ tối, không riêng màn đăng nhập.
    ...(isDark
      ? {
          colorBgContainer: '#1f1f1f',
          colorBgLayout: '#141414',
          colorText: '#e5e7eb',
          colorTextSecondary: '#9ca3af',
        }
      : {
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f0f2f5',
          colorText: '#1f2937',
          colorTextSecondary: '#6b7280',
        }),
  },
  components: {
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 4px rgba(0,0,0,0.06)',
    },
    Button: {
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
      fontWeight: 500,
      primaryShadow: '0 2px 6px rgba(22,119,255,0.25)',
    },
    Table: {
      // Cùng lý do: bốn màu này là bảng màu sáng, để nguyên thì đầu bảng sáng trắng nằm giữa
      // giao diện tối.
      ...(isDark
        ? { headerBg: '#262626', headerColor: '#d1d5db', headerSplitColor: '#3a3a3a', rowHoverBg: '#262626' }
        : { headerBg: '#f8f9fc', headerColor: '#4a5568', headerSplitColor: '#e2e8f0', rowHoverBg: '#f0f7ff' }),
      headerBorderRadius: 10,
      cellFontSize: 13,
    },
    Tag: {
      borderRadiusSM: 6,
      defaultBg: isDark ? '#2a2a2a' : '#f3f4f6',
    },
    Input: {
      borderRadius: 8,
      borderRadiusLG: 10,
    },
    Select: {
      borderRadius: 8,
      borderRadiusLG: 10,
    },
    DatePicker: {
      borderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 16,
      titleFontSize: 16,
    },
    Tabs: {
      inkBarColor: '#1677ff',
      itemSelectedColor: '#1677ff',
      titleFontSize: 14,
    },
    Alert: {
      borderRadiusLG: 10,
    },
    Descriptions: {
      labelBg: isDark ? '#262626' : '#f8f9fc',
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 28,
    },
    Progress: {
      lineBorderRadius: 6,
    },
    Drawer: {
      borderRadiusLG: 16,
    },
    Form: {
      labelFontSize: 13,
    },
    Notification: {
      borderRadiusLG: 12,
    },
    Message: {
      borderRadiusLG: 10,
    },
  },
});
