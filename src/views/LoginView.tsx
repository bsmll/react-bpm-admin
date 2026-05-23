import React from "react";
import { Card, Form, Input, Button, message } from "antd";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import "./Login.css";

const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  // 当点击登录按钮，且表单验证通过后执行
  const onFinish = async (values: any) => {
    try {
      // 1. 调用 Zustand 里的登录 Action
      // 这里会触发我们之前写的 axios 请求 (authApi.login)
      await login(values.username, values.password);

      message.success("登录成功");

      // 2. 跳转到首页
      navigate("/dashboard");
    } catch (error: any) {
      // 3. 这里的报错会被 api/request.ts 拦截，但我们也可以在这里单独处理
      message.error(error.message || "登录失败，请检查用户名或密码");
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" title=" BPM 登录" bordered={false}>
        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          {/* 用户名输入框 */}
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="admin" size="large" />
          </Form.Item>

          {/* 密码输入框 */}
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="123456" size="large" />
          </Form.Item>

          {/* 登录按钮 */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading} // 使用 Zustand 中的 loading 状态
            >
              登录
            </Button>
          </Form.Item>

          {/* 注册链接 */}
          <div className="register-link">
            还没有账号？ <Link to="/register">立即注册</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginView;
