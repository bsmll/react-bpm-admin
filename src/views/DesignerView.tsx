import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  Spin,
  Row,
  Col,
  Card,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Empty,
  message,
  Popconfirm,
} from "antd";

import type { ProcessDesignerHandle } from "../components/designer/ProcessDesigner";
import AiFormBuilderModal from "../components/designer/AiFormBuilderModal";
import { loadProcessDesigner } from "../router/lazyRoutes";
import { useProcessStore } from "../stores/process";
import { DeleteOutlined } from "@ant-design/icons";
import "./DesignerView.css";

const ProcessDesigner = lazy(loadProcessDesigner);
const { TextArea } = Input;

const DesignerView: React.FC = () => {
  const processStore = useProcessStore();
  const designerRef = useRef<ProcessDesignerHandle>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [aiFormModalOpen, setAiFormModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // 只有在没数据时才请求，防止重复触发
    if (processStore.definitions.length === 0) {
      processStore.fetchDefinitions();
    }
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await processStore.createDefinition(values.name, values.description);
      await processStore.fetchDefinitions();
      setCreateModalVisible(false);
      form.resetFields();
      message.success("创建成功");
    } catch (error: any) {
      if (error.name !== "FieldsValidationError") {
        message.error(error.message || "创建失败");
      }
    }
  };

  const handlePublish = async () => {
    if (!processStore.currentDefinition) return;
    try {
      await processStore.publishDefinition(processStore.currentDefinition.id);
      await processStore.fetchDefinitions();
      message.success("发布成功");
    } catch (error: any) {
      message.error(error.message || "发布失败");
    }
  };

  return (
    <div className="designer-page-container">
      {/* 💡 AntD 6: tip 改为 description */}
      <Spin spinning={processStore.loading} description="正在努力加载中...">
        <Row gutter={16} style={{ height: "100%", minHeight: "600px" }}>
          {/* 左侧：流程列表 */}
          <Col span={6} style={{ height: "100%", overflowY: "auto" }}>
            {/* 💡 AntD 6: bordered={false} 改为 variant="borderless" */}
            <Card
              title="流程列表"
              variant="borderless"
              styles={{ body: { padding: "12px" } }}
              extra={
                <Button
                  type="primary"
                  size="small"
                  onClick={() => setCreateModalVisible(true)}
                >
                  新建
                </Button>
              }
            >
              <div className="process-list-wrapper">
                {/* 💡 确保这里只有这一处 .map 渲染 */}
                {processStore.definitions.map((item) => (
                  <div
                    key={item.id} // 💡 必须有唯一的 key
                    className={`process-list-item ${processStore.currentDefinition?.id === item.id ? "active" : ""}`}
                    onClick={() => processStore.setCurrentDefinition(item.id)}
                    style={{
                      padding: "12px",
                      cursor: "pointer",
                      borderRadius: "6px",
                      marginBottom: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid #f0f0f0",
                      transition: "all 0.3s",
                      position: "relative",
                    }}
                  >
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "rgba(0, 0, 0, 0.88)",
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "rgba(0, 0, 0, 0.45)",
                        }}
                      >
                        {item.description || "暂无描述"}
                      </div>
                    </div>
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Tag
                        color={item.status === "published" ? "green" : "orange"}
                      >
                        {item.status === "published" ? "已发布" : "草稿"}
                      </Tag>
                      <Popconfirm
                        title="确定删除吗？"
                        onConfirm={() => processStore.deleteDefinition(item.id)}
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                ))}

                {processStore.definitions.length === 0 && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无流程"
                  />
                )}
              </div>
            </Card>
          </Col>

          {/* 右侧：画布设计器 */}
          <Col span={18} style={{ height: "100%" }}>
            {processStore.currentDefinition ? (
              <Card
                variant="borderless"
                style={{ height: "100%" }}
                styles={{ body: { height: "calc(100% - 58px)", padding: 0 } }}
                title={
                  <Space>
                    <span>{processStore.currentDefinition.name}</span>
                    <Tag
                      color={
                        processStore.currentDefinition.status === "published"
                          ? "green"
                          : "orange"
                      }
                    >
                      {processStore.currentDefinition.status === "published"
                        ? "已发布"
                        : "草稿"}
                    </Tag>
                    {processStore.currentDefinition.status === "draft" && (
                      <Button
                        type="primary"
                        size="small"
                        onClick={handlePublish}
                      >
                        发布
                      </Button>
                    )}
                    <Button
                      size="small"
                      onClick={() => setAiFormModalOpen(true)}
                    >
                      AI 表单
                    </Button>
                  </Space>
                }
              >
                <Suspense
                  fallback={
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Spin description="画布加载中..." />
                    </div>
                  }
                >
                  <ProcessDesigner
                    ref={designerRef}
                    key={processStore.currentDefinition.id}
                  />
                </Suspense>
              </Card>
            ) : (
              <Card
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Empty description="请从左侧选择一个流程进行设计" />
              </Card>
            )}
          </Col>
        </Row>
      </Spin>

      <AiFormBuilderModal
        open={aiFormModalOpen}
        onCancel={() => setAiFormModalOpen(false)}
        onSuccess={(schema) =>
          designerRef.current?.applyAiFormSchema(schema) ?? false
        }
      />

      <Modal
        title="新建流程"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => setCreateModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="流程名称"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="流程描述">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DesignerView;
