import React, { useState } from "react";
import { Card, Form, Input, Button, message } from "antd";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import "./Login.css"; // 复用登录页的样式

const RegisterView: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 1. 调用 Zustand 里的注册 Action
      await register({
        username: values.username,
        email: values.email,
        password: values.password,
        fullName: values.fullName,
      });

      message.success("注册成功，请登录");
      // 2. 注册成功后跳转到登录页
      navigate("/login");
    } catch (error: any) {
      message.error(error.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="注册新账号" bordered={false}>
        <Form name="register_form" layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="建议使用英文" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱格式" },
            ]}
          >
            <Input placeholder="example@test.com" />
          </Form.Item>

          <Form.Item label="全名" name="fullName">
            <Input placeholder="你的真实姓名" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码至少6位" },
            ]}
          >
            <Input.Password placeholder="密码至少6位" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              立即注册
            </Button>
          </Form.Item>

          <div className="register-link">
            已有账号？ <Link to="/login">立即登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterView;
