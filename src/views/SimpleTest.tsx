import React, { useState, useMemo } from "react";
import { Card, Space, Button, Typography, message, Alert } from "antd";
import { useNotificationStore } from "../stores/notification";
import { useWebSocket } from "../services/websocket.service";
import axios from "axios";

const { Title, Paragraph, Text } = Typography;

const SimpleTest: React.FC = () => {
  const { notifications } = useNotificationStore();
  const { isConnected } = useWebSocket();
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const testAddNotification = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // 注意：这里使用的是真实的后端地址
      await axios.post(
        "http://localhost:3000/api/v1/test/notification",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      message.success("测试通知已发送");
    } catch (error: any) {
      message.error(error.response?.data?.message || "发送测试通知失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>通知中心简单测试</Title>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>测试按钮</Title>
        <Space>
          <Button
            type="primary"
            onClick={testAddNotification}
            loading={loading}
          >
            添加测试通知（通过真实 WebSocket）
          </Button>
        </Space>
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>调试信息</Title>
        <div style={{ lineHeight: "2.5" }}>
          <div>
            通知总数: <Text strong>{notifications.length}</Text>
          </div>
          <div>
            未读数量: <Text type="danger">{unreadCount}</Text>
          </div>
          <div>
            WebSocket 状态:
            <Text
              style={{ marginLeft: 8 }}
              color={isConnected ? "success" : "error"}
            >
              {isConnected ? "🟢 已连接" : "🔴 未连接"}
            </Text>
          </div>
          <Paragraph type="secondary">
            说明：点击按钮后，后端会通过 WebSocket
            实时推送消息到右上角的小铃铛。
          </Paragraph>
        </div>
      </Card>

      <Card>
        <Title level={4}>使用说明</Title>
        <ul style={{ color: "#666" }}>
          <li>登录系统后，WebSocket 链路会自动建立。</li>
          <li>点击上方按钮会模拟一次后端业务触发。</li>
          <li>观察右上角“铃铛”图标是否出现红点及新消息。</li>
        </ul>
      </Card>
    </div>
  );
};

export default SimpleTest;
