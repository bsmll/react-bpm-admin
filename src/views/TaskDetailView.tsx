import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Timeline,
  Button,
  Space,
  Form,
  Radio,
  Input,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useTaskStore, useInstanceStore } from "../stores/instance";
import { Task } from "../types";

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

const TaskDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const taskStore = useTaskStore();
  const instanceStore = useInstanceStore();

  const currentInstance = useInstanceStore((state) => state.currentInstance);
  const getInstance = useInstanceStore((state) => state.getInstance);

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 1. 数据加载
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 先拉取任务列表，找到当前这个任务
        await taskStore.fetchTasks({ pageSize: 1000 });
        console.log("当前 Store 里的所有任务:", taskStore.tasks);
        const foundTask = taskStore.tasks.find((t: Task) => t.id === id);

        if (foundTask) {
          setTask(foundTask);
          // 找到任务后，顺便拉取所属流程实例的流转历史
          await instanceStore.getInstance(foundTask.instanceId);
        } else {
          message.error("未找到该任务");
        }
      } catch (error: any) {
        message.error("加载任务详情失败");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // 2. 处理审批 (同意/拒绝)
  const handleProcess = async () => {
    if (!task) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (values.action === "approve") {
        await taskStore.completeTask(task.id, {}, values.comment);
        message.success("审批通过");
      } else {
        // 假设 store 已经实现了 rejectTask，如果没有，统一用 completeTask 传变量
        await taskStore.rejectTask(task.id, values.comment);
        message.success("已拒绝申请");
      }
      navigate("/tasks"); // 处理完跳回列表
    } catch (error: any) {
      if (error.name !== "FieldsValidationError") {
        message.error("处理失败");
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. 辅助函数
  const getStatusColor = (status?: string) => {
    const map: any = {
      pending: "processing",
      approved: "success",
      rejected: "error",
    };
    return map[status || ""] || "default";
  };

  const formatDate = (ts?: number) =>
    ts ? new Date(ts).toLocaleString() : "-";

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
          <Title level={4} style={{ margin: 0 }}>
            任务处理：{task?.nodeName}
          </Title>
        </Space>
        <Tag color={getStatusColor(task?.status)}>
          {task?.status === "pending" ? "待处理" : "已完成"}
        </Tag>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* 任务详情 */}
          <Card title="任务信息" bordered={false} loading={loading}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="任务名称">
                {task?.nodeName}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDate(task?.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="分配人">
                {task?.assignee || "候选组/未签收"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 处理表单 */}
          {task?.status === "pending" && (
            <Card title="审批操作" bordered={false} style={{ marginTop: 24 }}>
              <Form
                form={form}
                layout="vertical"
                initialValues={{ action: "approve" }}
              >
                <Form.Item name="action" label="处理结果">
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="approve">同意</Radio.Button>
                    <Radio.Button value="reject">拒绝</Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Form.Item
                  name="comment"
                  label="审批意见"
                  rules={[{ required: true, message: "请填写意见" }]}
                >
                  <TextArea rows={4} placeholder="请输入您的审批意见..." />
                </Form.Item>
                <Button
                  type="primary"
                  onClick={handleProcess}
                  loading={loading}
                >
                  提交处理
                </Button>
              </Form>
            </Card>
          )}
        </Col>

        {/* 右侧流转历史 */}
        <Col span={8}>
          <Card title="流转历史" variant="borderless">
            <Timeline
              mode="start"
              items={currentInstance?.history?.map((h: any) => ({
                color: h.type === "complete" ? "green" : "blue",
                children: (
                  <>
                    <Text strong>{h.nodeName}</Text>
                    <div style={{ fontSize: 12, color: "#999" }}>
                      {formatDate(h.timestamp)}
                    </div>
                    {h.comment && (
                      <Paragraph style={{ color: "#666", marginTop: 4 }}>
                        {h.comment}
                      </Paragraph>
                    )}
                  </>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TaskDetailView;
