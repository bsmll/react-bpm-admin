import { create } from "zustand";
import { nanoid } from "nanoid";
import { processApi } from "../api";
import { ProcessStatus, NodeType, ProcessDefinition } from "../types";
import { message } from "antd"; // 💡
const parseDefinition = (item: any): ProcessDefinition => {
  const def =
    typeof item.definition === "string"
      ? JSON.parse(item.definition)
      : item.definition;
  return {
    ...item,
    nodes: def?.nodes || [],
    edges: def?.edges || [],
    createdAt: new Date(item.createdAt).getTime(),
    updatedAt: new Date(item.updatedAt).getTime(),
  };
};

interface ProcessState {
  definitions: ProcessDefinition[];
  currentDefinition: ProcessDefinition | null;
  loading: boolean;
  fetchDefinitions: (params?: any) => Promise<void>;
  createDefinition: (name: string, desc?: string) => Promise<any>;
  publishDefinition: (id: string) => Promise<void>;
  deleteDefinition: (id: string) => Promise<void>;
  setCurrentDefinition: (id: string | null) => void;
  updateNodesAndEdges: (
    id: string,
    nodes: any[],
    edges: any[],
  ) => Promise<void>;
}

export const useProcessStore = create<ProcessState>((set, get) => ({
  definitions: [],
  currentDefinition: null,
  loading: false,

  deleteDefinition: async (id: string) => {
    try {
      // 调用后端接口
      await processApi.deleteDefinition(id);

      // 更新本地状态
      set((state) => {
        const nextDefinitions = state.definitions.filter((d) => d.id !== id);
        const nextCurrent =
          state.currentDefinition?.id === id ? null : state.currentDefinition;

        return {
          definitions: nextDefinitions,
          currentDefinition: nextCurrent,
        };
      });

      message.success("流程已成功删除");
    } catch (error: any) {
      message.error(error.message || "删除失败");
      throw error;
    }
  },

  updateNodesAndEdges: async (id, nodes, edges) => {
    try {
      // 1. 调用后端 API 保存
      const result: any = await processApi.updateDefinition(id, {
        definition: { nodes, edges },
      });

      // 2. 将后端返回的新数据解析出来
      const def =
        typeof result.definition === "string"
          ? JSON.parse(result.definition)
          : result.definition;
      const parsedResult = {
        ...result,
        nodes: def?.nodes || [],
        edges: def?.edges || [],
        createdAt: new Date(result.createdAt).getTime(),
        updatedAt: new Date(result.updatedAt).getTime(),
      };

      // 3. 更新本地 Store：同步更新列表里的那一条，以及当前选中的那一条
      set((state) => ({
        definitions: state.definitions.map((d) =>
          d.id === id ? parsedResult : d,
        ),
        currentDefinition:
          state.currentDefinition?.id === id
            ? parsedResult
            : state.currentDefinition,
      }));
    } catch (error) {
      console.error("更新流程图失败:", error);
      throw error;
    }
  },

  setCurrentDefinition: (id) => {
    if (!id) {
      set({ currentDefinition: null });
      return;
    }
    // 💡 现在 get() 已经定义了，不会再报错了
    const definition = get().definitions.find(
      (d: ProcessDefinition) => d.id === id,
    );
    set({ currentDefinition: definition || null });
  },

  fetchDefinitions: async (params) => {
    set({ loading: true });
    try {
      const data: any = await processApi.getDefinitions(params);

      // 💡 第一步：解析数据
      const rawList = data.list.map(parseDefinition);

      // 💡 第二步：【物理级强制去重】
      // 使用 Map 以 ID 为 Key 进行存储，ID 相同的项会被后面的覆盖，确保唯一
      const uniqueMap = new Map();
      rawList.forEach((item: ProcessDefinition) => {
        uniqueMap.set(item.id, item);
      });

      const finalUniqueList = Array.from(uniqueMap.values());

      console.log("去重后的真实条数:", finalUniqueList.length);

      set({
        definitions: finalUniqueList, // 💡 存入绝对唯一的列表
        loading: false,
      });
    } catch (error) {
      console.error("加载列表失败", error);
    } finally {
      set({ loading: false });
    }
  },

  // 2. 修改 createDefinition
  createDefinition: async (name, description) => {
    const result: any = await processApi.createDefinition({
      name,
      description,
      definition: {
        nodes: [
          { id: "start", type: NodeType.START, name: "开始", x: 100, y: 100 },
          { id: "end", type: NodeType.END, name: "结束", x: 500, y: 100 },
        ],
        edges: [],
      },
    });

    const parsed = parseDefinition(result);

    // 💡 优化建议：既然页面 handleCreate 里会立刻调用 fetchDefinitions()，
    // 我们在这里其实不需要手动修改 definitions 数组，只需要把“当前选中”设为它即可。
    // 如果你非要手动加，请确保 fetchDefinitions 不会在同一时间运行。
    set({
      currentDefinition: parsed,
    });

    return parsed;
  },

  publishDefinition: async (id) => {
    const result = await processApi.publishDefinition(id);
    const parsed = parseDefinition(result);
    set((state) => ({
      definitions: state.definitions.map((d) => (d.id === id ? parsed : d)),
    }));
  },
}));
