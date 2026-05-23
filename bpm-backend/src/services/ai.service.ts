import OpenAI from "openai";

/** 硅基流动 OpenAI 兼容网关默认地址（也可用 LLM_BASE_URL / SILICONFLOW_BASE_URL 覆盖） */
const SILICONFLOW_DEFAULT_BASE = "https://api.siliconflow.cn/v1";
/** 平台上显示的模型名，如 deepseek-ai/DeepSeek-V3（勿再用官方 DeepSeek 的 deepseek-chat） */
const SILICONFLOW_DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3";
const REQUEST_TIMEOUT_MS = 120_000;

const SYSTEM_PROMPT = `You generate Ant Design form field definitions as structured JSON only.

Hard rules (violations are unacceptable):
1. Output MUST be exactly one JSON array and nothing else — no prose, no explanations, no markdown, no code fences (never use \`\`\` or \`\`\`json).
2. The response must start with "[" and end with "]".
3. Each array element is one field object with these keys:
   - name: string, English identifier (camelCase), unique among fields
   - label: string, human-readable Chinese label for the field
   - type: string, one of: input, textarea, password, select, datepicker, rangePicker, timepicker, inputNumber, switch, radio, checkbox, upload (pick what fits the user request)
   - required: boolean
   - options: optional; ONLY when type is select, radio, or checkbox — array of { "label": string (Chinese), "value": string | number }; omit options entirely for other types or use null

Respond only with the JSON array.`;

function resolveApiKey(): string {
  const key =
    process.env.SILICONFLOW_API_KEY ??
    process.env.LLM_API_KEY ??
    process.env.DEEPSEEK_API_KEY;
  if (!key?.trim()) {
    throw new Error(
      "请配置 SILICONFLOW_API_KEY（推荐）、LLM_API_KEY 或 DEEPSEEK_API_KEY",
    );
  }
  return key.trim();
}

function resolveBaseURL(): string {
  const url =
    process.env.LLM_BASE_URL ??
    process.env.SILICONFLOW_BASE_URL ??
    SILICONFLOW_DEFAULT_BASE;
  return url.replace(/\/$/, "");
}

function resolveModel(): string {
  return (
    process.env.LLM_MODEL ??
    process.env.SILICONFLOW_MODEL ??
    process.env.DEEPSEEK_MODEL ??
    SILICONFLOW_DEFAULT_MODEL
  );
}

function createClient(): OpenAI {
  return new OpenAI({
    apiKey: resolveApiKey(),
    baseURL: resolveBaseURL(),
    timeout: REQUEST_TIMEOUT_MS,
  });
}

export async function generateFormSchema(prompt: string): Promise<string> {
  const client = createClient();
  const model = resolveModel();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("模型返回内容为空");
  }
  return content.trim();
}
