import React, { useEffect } from "react";
import { ConfigProvider, theme as antdTheme } from "antd"; // 💡 引入 antdTheme
import AppRouter from "./router/index";
import { useThemeStore } from "./stores/theme";
import "antd/dist/reset.css";

function App() {
  const { themeConfig, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    // 💡 关键：使用 ConfigProvider 包裹整个应用
    <ConfigProvider
      theme={{
        // 1. 自动切换 AntD 的暗黑/亮色算法
        algorithm:
          themeConfig.theme === "dark"
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
        // 2. 这里的 token 可以自定义主色调
        token: {
          colorPrimary: themeConfig.primaryColor,
        },
      }}
    >
      <div className="app-container">
        <AppRouter />
      </div>
    </ConfigProvider>
  );
}

export default App;
