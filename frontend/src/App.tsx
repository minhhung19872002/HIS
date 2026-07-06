import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AppRouter from './router/AppRouter';
import './App.css';

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 10,
          borderRadiusLG: 12,
          borderRadiusSM: 8,
          colorBgLayout: '#f0f2f5',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: 14,
          colorText: '#1f2937',
          colorTextSecondary: '#6b7280',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.08)',
          controlHeight: 36,
          ...(isDark
            ? { colorBgContainer: '#1f1f1f' }
            : { colorBgContainer: '#ffffff' }),
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
            headerBg: '#f8f9fc',
            headerColor: '#4a5568',
            headerSplitColor: '#e2e8f0',
            rowHoverBg: '#f0f7ff',
            headerBorderRadius: 10,
            cellFontSize: 13,
          },
          Tag: {
            borderRadiusSM: 6,
            defaultBg: '#f3f4f6',
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
            labelBg: '#f8f9fc',
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
      }}
    >
      <AntdApp>
        <AppRouter />
      </AntdApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default App;
