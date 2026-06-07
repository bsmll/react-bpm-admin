import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Timeline,
  Empty,
  Button,
  Space,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useInstanceStore } from "../stores/instance";
import { useProcessStore } from "../stores/process";
import { ProcessInstance } from "../types";

const { Title, Text } = Typography;

const InstanceDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // 获取 URL 中的 :id
  const navigate = useNavigate();
  const getInstance = useInstanceStore((state) => state.getInstance);

  const fetchDefinitions = useProcessStore((state) => state.fetchDefinitions);
  const definitions = useProcessStore((state) => state.definitions);

  const [instance, setInstance] = useState<ProcessInstance | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. 初始化数据加载 (useEffect)
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 同时获取实例详情和流程定义（为了拿流程名称）
        const [instanceData] = await Promise.all([
          getInstance(id),
          fetchDefinitions(),
        ]);
        setInstance(instanceData);
      } catch (error: any) {
        message.error(error.message || "加载详情失败");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // 2. 辅助工具函数
  const getDefinitionName = (definitionId?: string) => {
    if (!definitionId) return "-";
    const definition = definitions.find((d) => d.id === definitionId);
    return definition?.name || definitionId;
  };

  const getStatusColor = (status?: string) => {
    const colorMap: Record<string, string> = {
      running: "processing",
      completed: "success",
      suspended: "warning",
      cancelled: "error",
    };
    return colorMap[status || ""] || "default";
  };

  const getStatusText = (status?: string) => {
    const textMap: Record<string, string> = {
      running: "运行中",
      completed: "已完成",
      suspended: "已挂起",
      cancelled: "已取消",
    };
    return textMap[status || ""] || status || "-";
  };

  const getHistoryColor = (type: string) => {
    const colorMap: Record<string, string> = {
      enter: "blue",
      leave: "gray",
      complete: "green",
    };
    return colorMap[type] || "gray";
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div style={{ padding: "24px" }}>
      {/* 模拟 PageHeader (AntD 5.x 移除了原 PageHeader，我们手动实现一个简单的) */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Space size="large">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
          <Title level={4} style={{ margin: 0 }}>
            实例详情：{instance?.businessKey || instance?.id}
          </Title>
        </Space>
        <Tag color={getStatusColor(instance?.status)}>
          {getStatusText(instance?.status)}
        </Tag>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* 左侧：基础信息 */}
          <Card title="流程信息" bordered={false} loading={loading}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="流程名称">
                {getDefinitionName(instance?.definitionId)}
              </Descriptions.Item>
              <Descriptions.Item label="业务键">
                {instance?.businessKey || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={getStatusColor(instance?.status)}>
                  {getStatusText(instance?.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="发起人">
                {instance?.startedByName || instance?.startedBy || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDate(instance?.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {formatDate(instance?.startedAt)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 左侧：表单变量数据 */}
          <Card
            title="流程数据 (变量)"
            bordered={false}
            style={{ marginTop: 24 }}
            loading={loading}
          >
            {instance?.variables &&
            Object.keys(instance.variables).length > 0 ? (
              <Descriptions column={2} bordered size="small">
                {Object.entries(instance.variables).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {formatValue(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ) : (
              <Empty description="该流程未提交任何表单变量" />
            )}
          </Card>
        </Col>

        {/* 右侧：审批时间轴 */}
        <Col span={8}>
          <Card title="审批历程" bordered={false} loading={loading}>
            {instance?.history && instance.history.length > 0 ? (
              <Timeline mode="left">
                {instance.history.map((h: any) => (
                  <Timeline.Item key={h.id} color={getHistoryColor(h.type)}>
                    <div style={{ marginBottom: 4 }}>
                      <Text strong>{h.nodeName}</Text>
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, marginLeft: 8 }}
                      >
                        {h.type === "complete"
                          ? "已完成"
                          : h.type === "enter"
                            ? "处理中"
                            : ""}
                      </Text>
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      时间：{formatDate(h.timestamp)}
                    </div>
                    {h.operator && (
                      <div style={{ fontSize: 12, color: "#888" }}>
                        操作人：{h.operatorName || h.operator}
                      </div>
                    )}
                    {h.comment && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "4px 8px",
                          background: "#f5f5f5",
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        备注：{h.comment}
                      </div>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="暂无流转记录" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InstanceDetailView;
