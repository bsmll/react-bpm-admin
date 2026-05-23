// src/stores/theme.ts
import { create } from "zustand";
import { THEME_KEY, DEFAULT_THEME, ThemeConfig, applyTheme } from "../theme";

// 1. 定义状态接口
interface ThemeState {
  themeConfig: ThemeConfig;
  // 💡 确保这里声明了 setTheme
  setTheme: (config: ThemeConfig) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeConfig: DEFAULT_THEME,

  // 💡 实现 setTheme 方法
  setTheme: (config) => {
    // 1. 持久化到本地
    localStorage.setItem(THEME_KEY, JSON.stringify(config));
    // 2. 立即应用 CSS 变量到 HTML 根节点
    applyTheme(config);
    // 3. 更新 Zustand 状态
    set({ themeConfig: config });
  },

  toggleTheme: () => {
    const { themeConfig, setTheme } = get();
    const newTheme = themeConfig.theme === "light" ? "dark" : "light";
    setTheme({ ...themeConfig, theme: newTheme });
  },

  initTheme: () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        applyTheme(config); // 初始化时应用样式
        set({ themeConfig: config });
      } catch (e) {
        set({ themeConfig: DEFAULT_THEME });
      }
    } else {
      applyTheme(DEFAULT_THEME);
    }
  },
}));
