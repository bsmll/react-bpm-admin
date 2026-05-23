import React, { useState, useMemo, useEffect } from "react";
import {
  Dropdown,
  Badge,
  Button,
  Menu,
  Divider,
  Empty,
  Typography,
  message,
} from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useNotificationStore } from "../stores/notification";
import "./NotificationCenter.css";
import { useWebSocket } from "../services/websocket.service";
const { Text } = Typography;

const NotificationCenter: React.FC = () => {
  const { notifications, clearAll, markAsRead, addNotification } =
    useNotificationStore();
  const { getWebSocketClient } = useWebSocket();
  const [open, setOpen] = useState(false);

  // 计算未读数
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString("zh-CN");

  // 💡 WebSocket 模拟处理逻辑 (对应 Vue 的 handleWebSocketMessage)
  // 暂时注释掉真正的 ws 引用，防止报错。等搬运了服务后再对接。

  useEffect(() => {
    const client = getWebSocketClient();
    if (!client) return;

    // 定义如何处理收到的消息 (对应 Vue 的 handleWebSocketMessage)
    const handleMessage = (msg: any) => {
      // 根据消息类型决定通知内容
      let title = "系统通知";
      let content = msg.data?.message || "";

      if (msg.type === "task_assigned") {
        title = "新任务分配";
        content = `您有一个新的审批任务：${msg.data.taskName}`;
      }

      addNotification({
        type: "info",
        title: title,
        message: content,
        timestamp: Date.now(),
      });

      // 同时可以在右侧弹出一个全局通知气泡
      message.info(content);
    };

    // 💡 注册监听器
    client.on("info", handleMessage);
    client.on("task_assigned", handleMessage);
    client.on("task_result", handleMessage);

    // 💡 组件销毁时必须取消监听，防止内存泄漏和重复弹窗
    return () => {
      client.off("info", handleMessage);
      client.off("task_assigned", handleMessage);
      client.off("task_result", handleMessage);
    };
  }, [getWebSocketClient, addNotification]);

  const markAllAsRead = () => {
    notifications.forEach((n) => markAsRead(n.id));
  };

  const handleDropdownOpen = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  // 下拉菜单的内容渲染
  const menuContent = (
    <div className="notification-dropdown-overlay">
      <div className="notification-header">通知中心</div>
      <Divider style={{ margin: "8px 0" }} />

      <div className="notification-list">
        {notifications.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notification-item ${n.read ? "read" : ""}`}
              onClick={() => markAsRead(n.id)}
            >
              <div className="notification-title">{n.title}</div>
              <div className="notification-message">{n.message}</div>
              <div className="notification-time">{formatTime(n.timestamp)}</div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <>
          <Divider style={{ margin: "8px 0" }} />
          <div className="notification-footer" onClick={clearAll}>
            清空所有通知
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      popupRender={() => menuContent}
      trigger={["click"]}
      open={open}
      onOpenChange={handleDropdownOpen}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: "18px" }} />}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationCenter;
