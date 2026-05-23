import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Input,
  Button,
  Form,
  Select,
  DatePicker,
  Switch,
  InputNumber,
  Space,
  Typography,
  Divider,
  message,
} from "antd";
import type { AiFormItemSchema } from "../../types";
import { generateAiForm } from "../../api";

export interface AiFormBuilderModalProps {
  open: boolean;
  onCancel: () => void;
  /** 返回 false 时不关闭弹窗（例如未选中合法节点） */
  onSuccess: (schema: AiFormItemSchema[]) => void | boolean;
}

function normalizeAiFormItem(raw: unknown): AiFormItemSchema | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.name !== "string" ||
    typeof o.label !== "string" ||
    typeof o.type !== "string"
  ) {
    return null;
  }
  const required = Boolean(o.required);
  let options: AiFormItemSchema["options"];
  if (Array.isArray(o.options)) {
    options = o.options.filter((x): x is NonNullable<typeof x> => {
      if (!x || typeof x !== "object") return false;
      const opt = x as Record<string, unknown>;
      return (
        typeof opt.label === "string" &&
        (typeof opt.value === "string" || typeof opt.value === "number")
      );
    }) as AiFormItemSchema["options"];
    if (options?.length === 0) options = undefined;
  }
  return { name: o.name, label: o.label, type: o.type, required, options };
}

function renderFormControl(item: AiFormItemSchema): React.ReactNode {
  const t = item.type?.toLowerCase?.() ?? "";
  switch (t) {
    case "textarea":
      return <Input.TextArea rows={3} placeholder={`请输入${item.label}`} />;
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
    case "input":
    default:
      return <Input placeholder={`请输入${item.label}`} />;
  }
}

const AiFormBuilderModal: React.FC<AiFormBuilderModalProps> = ({
  open,
  onCancel,
  onSuccess,
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<AiFormItemSchema[]>([]);
  const [previewForm] = Form.useForm();

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setSchema([]);
      setLoading(false);
      previewForm.resetFields();
    }
  }, [open, previewForm]);

  const previewKey = useMemo(
    () => schema.map((s) => s.name).join("|"),
    [schema],
  );

  const handleGenerate = async () => {
    const text = prompt.trim();
    if (!text) {
      message.warning("请先输入自然语言需求");
      return;
    }
    setLoading(true);
    try {
      const data = await generateAiForm(text);
      if (!Array.isArray(data)) {
        message.error("接口返回格式异常：应为字段数组");
        return;
      }
      const normalized = data
        .map(normalizeAiFormItem)
        .filter((x): x is AiFormItemSchema => x !== null);
      if (normalized.length === 0) {
        message.error("未能解析出有效表单字段，请调整描述后重试");
        setSchema([]);
        return;
      }
      setSchema(normalized);
      previewForm.resetFields();
      message.success("表单结构已生成");
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "生成表单失败，请稍后重试";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (schema.length === 0) {
      message.warning("请先生成表单预览");
      return;
    }
    const close = onSuccess(schema);
    if (close === false) return;
    onCancel();
  };

  return (
    <Modal
      title="AI 动态表单生成"
      open={open}
      onCancel={onCancel}
      width={720}
      destroyOnHidden
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" disabled={schema.length === 0} onClick={handleConfirm}>
            确认采用此表单结构
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Text strong>描述你的表单需求</Typography.Text>
          <Input.TextArea
            style={{ marginTop: 8 }}
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：做一个请假申请单，包含请假类型（年假/事假）、开始结束日期、事由说明"
          />
          <Button
            type="primary"
            style={{ marginTop: 12 }}
            loading={loading}
            onClick={handleGenerate}
          >
            ✨ AI 一键生成表单
          </Button>
        </div>

        <Divider style={{ margin: "8px 0" }}>预览区</Divider>

        {schema.length > 0 ? (
          <Form
            key={previewKey}
            form={previewForm}
            layout="vertical"
            style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}
          >
            {schema.map((item) => {
              const rules = item.required
                ? [{ required: true, message: `请填写${item.label}` }]
                : [];
              const isSwitch = item.type?.toLowerCase?.() === "switch";
              return (
                <Form.Item
                  key={item.name}
                  name={item.name}
                  label={item.label}
                  rules={rules}
                  valuePropName={isSwitch ? "checked" : "value"}
                >
                  {renderFormControl(item)}
                </Form.Item>
              );
            })}
          </Form>
        ) : (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            生成后将在此展示表单预览。
          </Typography.Paragraph>
        )}
      </Space>
    </Modal>
  );
};

export default AiFormBuilderModal;
