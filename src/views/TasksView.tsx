import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Radio,
  Modal,
  Form,
  Input,
  Descriptions,
  Typography,
  Divider,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useTaskStore, useInstanceStore } from "../stores/instance";
import { useProcessStore } from "../stores/process";
import { Task, TaskStatus } from "../types";
import type { ColumnsType } from "antd/es/table";
import { useAuthStore } from "../stores/auth";
const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const TasksView: React.FC = () => {
  const navigate = useNavigate();
  const taskStore = useTaskStore();
  const processStore = useProcessStore();
  const authStore = useAuthStore();

  // 1. 本地状态 (State)
  const [activeTab, setActiveTab] = useState<"my" | "pending" | "approved">(
    "my",
  );
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  // 2. 初始化数据 (Effect)
  useEffect(() => {
    taskStore.fetchTasks();
    processStore.fetchDefinitions();
  }, []);

  const currentUserId = authStore.user?.id;
  // 3. 过滤逻辑 (Computed -> useMemo)
  const filteredTasks = useMemo(() => {
    // 对应 Vue 的 filteredTasks 计算属性
    // 注意：Zustand 的数据直接从 store 访问即可，不需要 .value
    const allTasks = taskStore.tasks;
    if (activeTab === "my")
      return allTasks.filter(
        (t) =>
          t.status === "pending" &&
          (t.assignee === currentUserId ||
            t.assignee === authStore.user?.username),
      ); // 简化逻辑
    if (activeTab === "pending")
      return allTasks.filter((t) => t.status === "pending");
    return allTasks.filter(
      (t) => t.status === "approved" || t.status === "rejected",
    );
  }, [activeTab, taskStore.tasks]);

  // 4. 辅助函数 (Utils)
  const getDefinitionName = (definitionId: string) => {
    const def = processStore.definitions.find((d) => d.id === definitionId);
    return def?.name || definitionId;
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString("zh-CN");

  const getTaskStatusColor = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      pending: "orange",
      approved: "green",
      rejected: "red",
      delegated: "blue",
    };
    return colors[status] || "default";
  };

  const getTaskStatusText = (status: TaskStatus) => {
    const texts: Record<TaskStatus, string> = {
      pending: "待处理",
      approved: "已同意",
      rejected: "已拒绝",
      delegated: "已委派",
    };
    return texts[status] || status;
  };

  const showViewModal = (task: Task) => {
    setCurrentTask(task);
    setViewModalVisible(true);
  };

  // 5. 表格列定义 (Columns)
  // React 版 antd 的渲染逻辑直接写在 render 函数里
  const columns: ColumnsType<Task> = [
    { title: "任务ID", dataIndex: "id", key: "id", width: 200, ellipsis: true },
    { title: "任务名称", dataIndex: "nodeName", key: "nodeName", width: 150 },
    {
      title: "流程名称",
      key: "defName",
      width: 150,
      render: (_, record) => getDefinitionName(record.definitionId),
    },
    {
      title: "状态",
      key: "status",
      width: 100,
      render: (_, record) => (
        <Tag color={getTaskStatusColor(record.status)}>
          {getTaskStatusText(record.status)}
        </Tag>
      ),
    },
    { title: "处理人", dataIndex: "assignee", key: "assignee", width: 100 },
    {
      title: "创建时间",
      key: "createdAt",
      width: 180,
      render: (_, record) => formatDate(record.createdAt),
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          {record.status === "pending" && (
            <Button type="link" onClick={() => navigate(`/tasks/${record.id}`)}>
              处理
            </Button>
          )}
          <Button type="link" onClick={() => showViewModal(record)}>
            查看
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="tasks-page" style={{ padding: "24px" }}>
      <Card
        bordered={false}
        title={
          <Radio.Group
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="my">我的待办</Radio.Button>
            <Radio.Button value="pending">全部待办</Radio.Button>
            <Radio.Button value="approved">已处理</Radio.Button>
          </Radio.Group>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={taskStore.loading}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="任务详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        width={700}
        footer={null}
      >
        {currentTask && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="任务ID">
                {currentTask.id}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getTaskStatusColor(currentTask.status)}>
                  {getTaskStatusText(currentTask.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="任务名称">
                {currentTask.nodeName}
              </Descriptions.Item>
              <Descriptions.Item label="处理人">
                {currentTask.assignee || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDate(currentTask.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {currentTask.completedAt
                  ? formatDate(currentTask.completedAt)
                  : "-"}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Title level={5}>流程变量</Title>
            <Paragraph>
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "12px",
                  borderRadius: "4px",
                }}
              >
                {JSON.stringify(currentTask.variables || {}, null, 2)}
              </pre>
            </Paragraph>
          </>
        )}
      </Modal>
    </div>
  );
};

export default TasksView;
