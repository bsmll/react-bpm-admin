import React, { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import MainLayout from "../components/layout/MainLayout";
import { loadDesignerView } from "./lazyRoutes";

// 1. 页面懒加载
const LoginView = lazy(() => import("../views/LoginView"));
const RegisterView = lazy(() => import("../views/RegisterView"));
const DashboardView = lazy(() => import("../views/DashboardView"));
const DesignerView = lazy(loadDesignerView);
const ApplyView = lazy(() => import("../views/ApplyView"));
const MyApplicationsView = lazy(() => import("../views/MyApplicationsView"));
const InstancesView = lazy(() => import("../views/InstancesView"));
const InstanceDetailView = lazy(() => import("../views/InstanceDetailView"));
const TasksView = lazy(() => import("../views/TasksView"));
const TaskDetailView = lazy(() => import("../views/TaskDetailView"));
const VirtualListDemo = lazy(() => import("../views/VirtualListDemo"));
const SimpleTest = lazy(() => import("../views/SimpleTest"));

// 2. 路由守卫：需要登录才能进 (保安 A)
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// 3. 路由守卫：已登录不能再进登录/注册页 (保安 B)
const RequireGuest = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// 4. 路由配置主程序
const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div style={{ padding: 50, textAlign: "center" }}>页面下载中...</div>
        }
      >
        <Routes>
          {/* ---- 公开页面（不需要外壳） ---- */}
          <Route
            path="/login"
            element={
              <RequireGuest>
                <LoginView />
              </RequireGuest>
            }
          />
          <Route
            path="/register"
            element={
              <RequireGuest>
                <RegisterView />
              </RequireGuest>
            }
          />

          {/* ---- 业务页面（全部套入 MainLayout 外壳） ---- */}
          <Route
            path="/"
            element={
              <RequireAuth>
                {/* 关键：用 MainLayout 包裹 Outlet */}
                <MainLayout>
                  <Outlet />
                </MainLayout>
              </RequireAuth>
            }
          >
            {/* 访问 / 自动跳到 dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* 以下子页面都会显示在 MainLayout 的 Content 区域 */}
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="designer" element={<DesignerView />} />
            <Route path="apply" element={<ApplyView />} />
            <Route path="my-applications" element={<MyApplicationsView />} />
            <Route path="instances" element={<InstancesView />} />
            <Route path="instances/:id" element={<InstanceDetailView />} />
            <Route path="tasks" element={<TasksView />} />
            <Route path="tasks/:id" element={<TaskDetailView />} />
            <Route path="virtual-list-demo" element={<VirtualListDemo />} />
            <Route path="simple-test" element={<SimpleTest />} />
          </Route>

          {/* 404 兜底：访问不存在的地址跳回首页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
