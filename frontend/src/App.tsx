import { ConfigProvider, App as AntdApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AppRouter from './router/AppRouter';
import { getAntdTheme } from './config/theme.config';
import ErrorBoundary from './components/feedback/ErrorBoundary';
import './App.css';

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <ConfigProvider locale={viVN} theme={getAntdTheme(isDark)}>
      <AntdApp>
        <AppRouter />
      </AntdApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
