import React from "react";
import { Dropdown, Button, MenuProps } from "antd";
import { BulbOutlined, BulbFilled } from "@ant-design/icons";
import { useThemeStore } from "../stores/theme";
import { Theme } from "../theme";

const ThemeSwitcher: React.FC = () => {
  const { themeConfig, setTheme } = useThemeStore();

  const handleThemeChange = (theme: Theme) => {
    // 调用 store 方法，它内部会自动执行 applyTheme 修改 CSS 变量并持久化
    setTheme({ ...themeConfig, theme });
  };

  // AntD 推荐的配置式菜单
  const items: MenuProps["items"] = [
    {
      key: "light",
      label: "亮色模式",
      icon: <BulbOutlined />,
      onClick: () => handleThemeChange("light"),
    },
    {
      key: "dark",
      label: "暗黑模式",
      icon: <BulbFilled />,
      onClick: () => handleThemeChange("dark"),
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Button
        icon={themeConfig.theme === "light" ? <BulbOutlined /> : <BulbFilled />}
      >
        {themeConfig.theme === "light" ? "亮色" : "暗黑"}
      </Button>
    </Dropdown>
  );
};

export default ThemeSwitcher;
