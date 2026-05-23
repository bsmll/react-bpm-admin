import React, { useState, useEffect, useMemo } from "react";
import { Card, Table, Tag, Space, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useInstanceStore } from "../stores/instance";
import { useProcessStore } from "../stores/process";
import { useAuthStore } from "../stores/auth";
import { ProcessInstance } from "../types";
import type { ColumnsType } from "antd/es/table";

const MyApplicationsView: React.FC = () => {
  const navigate = useNavigate();
  const instanceStore = useInstanceStore();
  const processStore = useProcessStore();
  const authStore = useAuthStore();

  const [loading, setLoading] = useState(false);

  // 1. 初始化加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          instanceStore.fetchInstances(),
          processStore.fetchDefinitions(),
        ]);
      } catch (error: any) {
        message.error(error.message || "加载数据失败");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. 核心逻辑：过滤出当前用户发起的申请 (对应 Vue 的 myInstances computed)
  const myInstances = useMemo(() => {
    return instanceStore.instances.filter(
      (i) =>
        i.startedBy === authStore.user?.id ||
        i.startedBy === authStore.user?.username,
    );
  }, [instanceStore.instances, authStore.user]);

  // 3. 辅助显示函数
  const getDefinitionName = (definitionId: string) => {
    const definition = processStore.definitions.find(
      (d) => d.id === definitionId,
    );
    return definition?.name || definitionId;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      running: "processing",
      completed: "success",
      suspended: "warning",
      cancelled: "error",
    };
    return colorMap[status] || "default";
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      running: "运行中",
      completed: "已完成",
      suspended: "已挂起",
      cancelled: "已取消",
    };
    return textMap[status] || status;
  };

  const getCurrentNodeName = (instance: ProcessInstance) => {
    if (instance.status === "completed") return "流程已结束";
    if (!instance.currentNodeIds || instance.currentNodeIds.length === 0)
      return "待处理";

    const definition = processStore.definitions.find(
      (d) => d.id === instance.definitionId,
    );
    if (!definition) return "加载中...";

    const currentNode = definition.nodes.find((n) =>
      instance.currentNodeIds.includes(n.id),
    );
    return currentNode?.name || "未知节点";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  // 4. 表格列定义
  const columns: ColumnsType<ProcessInstance> = [
    {
      title: "流程名称",
      key: "definitionName",
      render: (_, record) => getDefinitionName(record.definitionId),
    },
    {
      title: "业务键",
      dataIndex: "businessKey",
      key: "businessKey",
      render: (text) => text || "-",
    },
    {
      title: "状态",
      key: "status",
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>
          {getStatusText(record.status)}
        </Tag>
      ),
    },
    {
      title: "当前节点",
      key: "currentNode",
      render: (_, record) => (
        <span style={{ color: "#1677ff", fontWeight: 500 }}>
          {getCurrentNodeName(record)}
        </span>
      ),
    },
    {
      title: "发起时间",
      key: "createdAt",
      render: (_, record) => formatDate(record.createdAt),
    },
    {
      title: "操作",
      key: "actions",
      fixed: "right",
      width: 100,
      render: (_, record) => (
        <Button type="link" onClick={() => navigate(`/instances/${record.id}`)}>
          查看进度
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title="我的申请"
        bordered={false}
        extra={
          <Button type="primary" onClick={() => navigate("/apply")}>
            发起新申请
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={myInstances}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            pageSize: 10,
          }}
        />
      </Card>
    </div>
  );
};

export default MyApplicationsView;
