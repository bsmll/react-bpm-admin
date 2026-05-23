import React, { useMemo } from "react";
import { Layout, Menu, Space, Dropdown, Avatar, Button } from "antd";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  DownOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  DashboardOutlined,
  EditOutlined,
  SendOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../stores/auth";
import ThemeSwitcher from "../ThemeSwitcher";
import NotificationCenter from "../NotificationCenter";

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const authStore = useAuthStore();

  // 1. 对应 Vue 的 pageTitle computed
  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      "/dashboard": "数据看板",
      "/designer": "流程设计器",
      "/apply": "发起申请",
      "/my-applications": "我的申请",
      "/instances": "流程实例",
      "/tasks": "任务中心",
      "/virtual-list-demo": "虚拟列表演示",
      "/simple-test": "通知测试",
    };
    return titles[location.pathname] || "首页";
  }, [location.pathname]);

  // 2. 退出登录逻辑
  const handleLogout = () => {
    authStore.logout();
    navigate("/login");
  };

  // 3. 菜单项配置 (Ant Design React 5.0+ 推荐写法)
  const menuItems = [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "数据看板" },
    { key: "/designer", icon: <EditOutlined />, label: "流程设计器" },
    { key: "/apply", icon: <SendOutlined />, label: "发起申请" },
    { key: "/my-applications", icon: <FileTextOutlined />, label: "我的申请" },
    { key: "/instances", icon: <AppstoreOutlined />, label: "流程实例" },
    { key: "/tasks", icon: <CheckCircleOutlined />, label: "任务中心" },
    {
      key: "/virtual-list-demo",
      icon: <UnorderedListOutlined />,
      label: "虚拟列表演示",
    },
    { key: "/simple-test", icon: <BellOutlined />, label: "通知测试" },
  ];

  // 4. 用户下拉菜单配置
  const userMenu = {
    items: [
      { key: "profile", icon: <UserOutlined />, label: "个人信息" },
      { key: "setting", icon: <SettingOutlined />, label: "设置" },
      { type: "divider" as const },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "退出登录",
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* 侧边栏 */}
      <Sider width={240} collapsible>
        <div
          style={{
            height: 64,
            background: "#001529",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h2 style={{ color: "white", margin: 0, fontSize: 18 }}>
            BPM 流程管理系统
          </h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      {/* 右侧主区域 */}
      <Layout>
        {/* 顶部导航 */}
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500 }}>{pageTitle}</span>

          <Space size="middle">
            <NotificationCenter />
            <ThemeSwitcher />

            {authStore.user ? (
              <Dropdown menu={userMenu} placement="bottomRight">
                <Space style={{ cursor: "pointer" }}>
                  <Avatar style={{ backgroundColor: "#1890ff" }}>
                    {authStore.user.username?.charAt(0)?.toUpperCase() || "U"}
                  </Avatar>
                  <span>{authStore.user.username}</span>
                  <DownOutlined />
                </Space>
              </Dropdown>
            ) : (
              <Button type="primary" onClick={() => navigate("/login")}>
                登录
              </Button>
            )}
          </Space>
        </Header>

        {/* 页面内容区 */}
        <Content style={{ margin: 24, padding: 0, minHeight: 280 }}>
          {/* 这里放置子页面 */}
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
