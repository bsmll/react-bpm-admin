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
  Select,
  Popconfirm,
  Timeline,
  Typography,
  Descriptions,
  Divider,
  message,
} from "antd";
import { useInstanceStore } from "../stores/instance";
import { useProcessStore } from "../stores/process";
import { InstanceStatus, ProcessInstance } from "../types";
import type { ColumnsType } from "antd/es/table";

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

const InstancesView: React.FC = () => {
  const instanceStore = useInstanceStore();
  const processStore = useProcessStore();

  // 1. 本地 UI 状态
  const [activeTab, setActiveTab] = useState<"running" | "completed" | "all">(
    "running",
  );
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [startForm] = Form.useForm(); // AntD React 推荐使用 useForm

  // 2. 初始化加载数据
  useEffect(() => {
    instanceStore.fetchInstances();
    processStore.fetchDefinitions();
  }, []);

  // 3. 计算属性 (Computed -> useMemo)
  const filteredInstances = useMemo(() => {
    const list = instanceStore.instances;
    if (activeTab === "running")
      return list.filter((i) => i.status === "running");
    if (activeTab === "completed")
      return list.filter((i) => i.status === "completed");
    return list;
  }, [activeTab, instanceStore.instances]);

  // 4. 辅助函数
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString("zh-CN");

  const getStatusColor = (status: InstanceStatus) => {
    const colors: Record<InstanceStatus, string> = {
      running: "blue",
      completed: "green",
      suspended: "orange",
      cancelled: "red",
    };
    return colors[status];
  };

  const getStatusText = (status: InstanceStatus) => {
    const texts: Record<InstanceStatus, string> = {
      running: "运行中",
      completed: "已完成",
      suspended: "已暂停",
      cancelled: "已取消",
    };
    return texts[status];
  };

  const getHistoryTypeText = (type: string) => {
    const texts: Record<string, string> = {
      enter: "进入",
      leave: "离开",
      complete: "完成",
    };
    return texts[type] || type;
  };

  // 5. 操作处理
  const handleStart = async () => {
    try {
      const values = await startForm.validateFields();
      const variables = JSON.parse(values.variablesJson || "{}");

      await instanceStore.startProcess(
        values.definitionId,
        values.businessKey,
        variables,
      );

      setStartModalVisible(false);
      startForm.resetFields();
      message.success("发起成功");
    } catch (e: any) {
      if (e.name === "SyntaxError") message.error("变量 JSON 格式错误");
    }
  };

  const viewInstance = async (record: ProcessInstance) => {
    // 1. 先展示弹窗（此时可以显示一个加载中状态，或者利用 Modal 的 loading）
    setViewModalVisible(true);

    try {
      // 2. 关键：必须 await 等待后端数据返回
      // 这样数据存入 Store 后，弹窗内部才会触发重绘
      await instanceStore.getInstance(record.id);
    } catch (error) {
      message.error("获取详情失败");
    }
  };

  const cancelInstance = async (id: string) => {
    await instanceStore.cancelInstance(id);
    message.success("已终止");
  };

  // 6. 表格列定义 (Columns)
  const columns: ColumnsType<ProcessInstance> = [
    { title: "实例ID", dataIndex: "id", key: "id", width: 200, ellipsis: true },
    { title: "业务键", dataIndex: "businessKey", key: "businessKey" },
    {
      title: "状态",
      key: "status",
      width: 100,
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>
          {getStatusText(record.status)}
        </Tag>
      ),
    },
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
        <Space>
          <Button type="link" size="small" onClick={() => viewInstance(record)}>
            查看
          </Button>
          {record.status === "running" && (
            <Popconfirm
              title="确定要终止此流程吗？"
              onConfirm={() => cancelInstance(record.id)}
            >
              <Button type="link" size="small" danger>
                终止
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="instances-page" style={{ padding: "24px" }}>
      <Card
        bordered={false}
        title={
          <Radio.Group
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="running">运行中</Radio.Button>
            <Radio.Button value="completed">已完成</Radio.Button>
            <Radio.Button value="all">全部</Radio.Button>
          </Radio.Group>
        }
        extra={
          <Button type="primary" onClick={() => setStartModalVisible(true)}>
            发起流程
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredInstances}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={instanceStore.loading}
        />
      </Card>

      {/* 发起流程弹窗 */}
      <Modal
        title="发起流程"
        open={startModalVisible}
        onOk={handleStart}
        onCancel={() => setStartModalVisible(false)}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={startForm}
          layout="vertical"
          initialValues={{ variablesJson: "{}" }}
        >
          <Form.Item
            name="definitionId"
            label="选择流程"
            rules={[{ required: true, message: "请选择流程" }]}
          >
            <Select placeholder="请选择流程">
              {processStore.definitions
                .filter((d) => d.status === "published")
                .map((def) => (
                  <Select.Option key={def.id} value={def.id}>
                    {def.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="businessKey" label="业务键">
            <Input placeholder="请输入业务键" />
          </Form.Item>
          <Form.Item name="variablesJson" label="流程变量">
            <TextArea placeholder="请输入JSON格式的变量" rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="流程详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        width={700}
        footer={null}
      >
        {instanceStore.currentInstance && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="实例ID">
                {instanceStore.currentInstance.id}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag
                  color={getStatusColor(instanceStore.currentInstance.status)}
                >
                  {getStatusText(instanceStore.currentInstance.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="流程定义ID">
                {instanceStore.currentInstance.definitionId}
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                {instanceStore.currentInstance.definitionVersion}
              </Descriptions.Item>
              <Divider />
            </Descriptions>
            <Title level={5} style={{ marginTop: 20 }}>
              流转记录
            </Title>
            <Timeline
              mode="start" // 对应警告：把 left 改为 start
              items={
                instanceStore.currentInstance?.history?.map((item: any) => ({
                  color: item.type === "complete" ? "green" : "blue",
                  children: (
                    <>
                      <Paragraph style={{ marginBottom: 0 }}>
                        <Text strong>{item.nodeName}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {getHistoryTypeText(item.type)}
                        </Text>
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(item.timestamp)}
                        {item.operator && (
                          <span style={{ marginLeft: 12 }}>
                            操作人：{item.operator}
                          </span>
                        )}
                      </Text>
                      {item.comment && (
                        <Paragraph style={{ marginTop: 8 }}>
                          备注：{item.comment}
                        </Paragraph>
                      )}
                    </>
                  ),
                })) || []
              }
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default InstancesView;
