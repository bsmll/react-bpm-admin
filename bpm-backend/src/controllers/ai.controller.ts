import { Context } from 'koa';
import OpenAI from 'openai';
import * as aiService from '../services/ai.service';
import { errorResponse, successResponse } from '../utils/response.util';

function parseFormSchemaArray(raw: string): unknown[] {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error('无法解析表单 Schema：内容不是合法 JSON 数组');
    }
    parsed = JSON.parse(match[0]);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('表单 Schema 必须是 JSON 数组');
  }
  return parsed;
}

function resolveAiErrorMessage(err: unknown): { status: number; message: string } {
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return { status: 504, message: 'AI 请求超时，请稍后重试' };
  }
  if (err instanceof OpenAI.APIUserAbortError) {
    return { status: 499, message: '请求已取消' };
  }
  if (err instanceof OpenAI.APIError) {
    const status =
      typeof err.status === 'number' && err.status >= 400 && err.status < 600
        ? err.status
        : 502;
    return {
      status,
      message: err.message || '调用 AI 服务失败',
    };
  }
  if (err instanceof SyntaxError) {
    return { status: 502, message: '模型输出无法解析为 JSON' };
  }
  if (err instanceof Error) {
    const msg = err.message || '生成表单失败';
    if (/timeout|timed out/i.test(msg)) {
      return { status: 504, message: 'AI 请求超时，请稍后重试' };
    }
    if (msg.includes('DEEPSEEK_API_KEY')) {
      return { status: 500, message: msg };
    }
    return { status: 502, message: msg };
  }
  return { status: 500, message: '未知错误' };
}

export const generateForm = async (ctx: Context) => {
  try {
    const body = ctx.request.body as { prompt?: unknown };
    const prompt = body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      errorResponse(ctx, 400, '请求体需提供非空字符串字段 prompt');
      return;
    }

    const raw = await aiService.generateFormSchema(prompt.trim());
    const data = parseFormSchemaArray(raw);
    successResponse(ctx, data, 'success');
  } catch (err: unknown) {
    const { status, message } = resolveAiErrorMessage(err);
    errorResponse(ctx, status, message);
  }
};
