import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Switch,
  Button,
  Space,
  Divider,
  message,
  Typography,
} from "antd";
import { useProcessStore } from "../stores/process";
import { useInstanceStore } from "../stores/instance";
import AiFormBuilderModal from "../components/designer/AiFormBuilderModal";
import type { AiFormItemSchema } from "../types";
import "./ApplyView.css";

const { Option } = Select;

function renderVariableControl(item: AiFormItemSchema): React.ReactNode {
  const t = item.type?.toLowerCase?.() ?? "";
  switch (t) {
    case "textarea":
      return <Input.TextArea rows={4} placeholder={`请输入${item.label}`} />;
    case "inputnumber":
      return (
        <InputNumber style={{ width: "100%" }} placeholder={item.label} />
      );
    case "select":
      return (
        <Select
          allowClear
          placeholder={`请选择${item.label}`}
          options={(item.options ?? []).map((o) => ({
            label: o.label,
            value: o.value,
          }))}
        />
      );
    case "datepicker":
      return <DatePicker style={{ width: "100%" }} />;
    case "switch":
      return <Switch />;
    case "password":
      return <Input.Password placeholder={`请输入${item.label}`} />;
    default:
      return <Input placeholder={`请输入${item.label}`} />;
  }
}

const ApplyView: React.FC = () => {
  const [form] = Form.useForm();
  const processStore = useProcessStore();
  const instanceStore = useInstanceStore();

  const [loading, setLoading] = useState(false);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<
    string | undefined
  >(undefined);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [formSchema, setFormSchema] = useState<AiFormItemSchema[]>([]);

  // 1. 初始化加载流程定义
  useEffect(() => {
    processStore.fetchDefinitions();
  }, []);

  // 2. 对应 Vue 的 publishedDefinitions 计算属性
  const publishedDefinitions = useMemo(() => {
    return processStore.definitions.filter((d) => d.status === "published");
  }, [processStore.definitions]);

  // 3. 对应 Vue 的 selectedDefinition 计算属性
  const selectedDefinition = useMemo(() => {
    return processStore.definitions.find((d) => d.id === selectedDefinitionId);
  }, [processStore.definitions, selectedDefinitionId]);

  const previewFormKey = useMemo(
    () => formSchema.map((s) => s.name).join("|"),
    [formSchema],
  );

  // 5. 处理流程选择变化
  const handleDefinitionChange = (value: string) => {
    setSelectedDefinitionId(value);
    setFormSchema([]);
    const currentValues = form.getFieldsValue();
    form.setFieldsValue({ ...currentValues, variables: {} });
  };

  // 6. 提交申请 (对应 Vue 的 handleSubmit)
  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await instanceStore.startProcess(
        values.definitionId,
        values.businessKey,
        values.variables || {},
      );

      message.success("申请提交成功");
      handleReset();
    } catch (error: any) {
      message.error(error.message || "申请提交失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSelectedDefinitionId(undefined);
    setFormSchema([]);
  };

  return (
    <div className="apply-container">
      <Card title="发起申请" variant="borderless">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ variables: {} }}
        >
          {/* 选择流程 */}
          <Form.Item
            label="选择流程"
            name="definitionId"
            rules={[{ required: true, message: "请选择流程" }]}
          >
            <Select placeholder="请选择流程" onChange={handleDefinitionChange}>
              {publishedDefinitions.map((def) => (
                <Option key={def.id} value={def.id}>
                  {def.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* 业务键 */}
          <Form.Item label="业务键" name="businessKey">
            <Input placeholder="请输入业务键（可选，如：LEAVE-2024-001）" />
          </Form.Item>

          {selectedDefinition && (
            <>
              <Divider orientation={"start" as any}>申请信息</Divider>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Button type="default" onClick={() => setAiModalOpen(true)}>
                  ✨ AI 生成表单结构
                </Button>
                {formSchema.length === 0 ? (
                  <Typography.Text type="secondary">
                    请先使用 AI 描述本次申请需要填写的字段；生成后将在此动态渲染表单项。
                  </Typography.Text>
                ) : (
                  <div key={previewFormKey}>
                    {formSchema.map((item) => {
                      const rules = item.required
                        ? [{ required: true, message: `请填写${item.label}` }]
                        : [];
                      const isSwitch =
                        item.type?.toLowerCase?.() === "switch";
                      return (
                        <Form.Item
                          key={item.name}
                          label={item.label}
                          name={["variables", item.name]}
                          rules={rules}
                          valuePropName={isSwitch ? "checked" : "value"}
                        >
                          {renderVariableControl(item)}
                        </Form.Item>
                      );
                    })}
                  </div>
                )}
              </Space>
            </>
          )}

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交申请
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <AiFormBuilderModal
        open={aiModalOpen}
        onCancel={() => setAiModalOpen(false)}
        onSuccess={(schema) => {
          setFormSchema(schema);
          const rest = form.getFieldsValue();
          form.setFieldsValue({ ...rest, variables: {} });
          return true;
        }}
      />
    </div>
  );
};

export default ApplyView;
