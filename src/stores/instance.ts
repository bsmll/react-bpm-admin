import { create } from "zustand";
import type { ProcessInstance, Task } from "../types";
import { instanceApi, taskApi } from "../api";

// 数据格式化工具函数（复用 Vue 里的解析逻辑）
const parseInstance = (item: any): ProcessInstance => {
  // 💡 核心修复：兼容后端传来的 histories (复数)
  // 如果 item.history 是空的，就去拿 item.histories 的值
  const rawHistory =
    item.history && item.history.length > 0
      ? item.history
      : item.histories || [];

  return {
    ...item,
    variables:
      typeof item.variables === "string"
        ? JSON.parse(item.variables)
        : item.variables,
    currentNodeIds:
      typeof item.currentNodeIds === "string"
        ? JSON.parse(item.currentNodeIds)
        : item.currentNodeIds,

    // 💡 这里的逻辑也要更新，使用我们刚才找到的 rawHistory
    history: rawHistory.map((h: any) => ({
      ...h,
      timestamp: new Date(h.timestamp).getTime(),
    })),

    createdAt: new Date(item.createdAt).getTime(),
    startedAt: new Date(item.startedAt).getTime(),
    endedAt: item.endedAt ? new Date(item.endedAt).getTime() : undefined,
  };
};

const parseTask = (item: any): Task => ({
  ...item,
  variables:
    typeof item.variables === "string"
      ? JSON.parse(item.variables)
      : item.variables,
  candidateUsers:
    typeof item.candidateUsers === "string"
      ? JSON.parse(item.candidateUsers)
      : item.candidateUsers,
  candidateGroups:
    typeof item.candidateGroups === "string"
      ? JSON.parse(item.candidateGroups)
      : item.candidateGroups,
  createdAt: new Date(item.createdAt).getTime(),
  claimedAt: item.claimedAt ? new Date(item.claimedAt).getTime() : undefined,
  completedAt: item.completedAt
    ? new Date(item.completedAt).getTime()
    : undefined,
});

// 实例 Store
interface InstanceState {
  instances: ProcessInstance[];
  currentInstance: ProcessInstance | null;
  loading: boolean;
  fetchInstances: (params?: any) => Promise<void>;
  startProcess: (defId: string, key?: string, vars?: any) => Promise<any>;
  cancelInstance: (id: string) => Promise<void>;
  getInstance: (id: string) => Promise<any>;
}

export const useInstanceStore = create<InstanceState>((set) => ({
  instances: [],
  currentInstance: null,
  loading: false,

  fetchInstances: async (params) => {
    set({ loading: true });
    try {
      const data: any = await instanceApi.getInstances(params);
      set({ instances: data.list.map(parseInstance) });
    } finally {
      set({ loading: false });
    }
  },

  startProcess: async (definitionId, businessKey, variables = {}) => {
    const result: any = await instanceApi.startInstance({
      definitionId,
      businessKey,
      variables,
    });
    const parsed = parseInstance(result);
    set((state) => ({
      instances: [...state.instances, parsed],
      currentInstance: parsed,
    }));
    return parsed;
  },

  cancelInstance: async (id) => {
    await instanceApi.cancelInstance(id);
    set((state) => ({ instances: state.instances.filter((i) => i.id !== id) }));
  },

  getInstance: async (id) => {
    const result: any = await instanceApi.getInstance(id);
    const parsed = parseInstance(result);
    set({ currentInstance: parsed });
    return parsed;
  },
}));

// 任务 Store
interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: (params?: any) => Promise<void>;
  fetchMyPendingTasks: () => Promise<void>;
  completeTask: (id: string, vars?: any, comment?: string) => Promise<void>;
  rejectTask: (taskId: string, comment?: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (params) => {
    set({ loading: true });
    try {
      const data: any = await taskApi.getTasks(params);
      set({ tasks: data.list.map(parseTask) });
    } finally {
      set({ loading: false });
    }
  },
  // src/stores/instance.ts (useTaskStore 部分)

  fetchMyPendingTasks: async () => {
    set({ loading: true });
    try {
      const result: any = await taskApi.getMyPendingTasks();
      set({ tasks: result.map(parseTask) });
    } finally {
      set({ loading: false });
    }
  },
  rejectTask: async (taskId: string, comment?: string) => {
    // 1. 调用 api 里的 reject 接口
    const result: any = await taskApi.rejectTask(taskId, { comment });

    // 2. 加工结果（解析时间戳等，逻辑同 parseTask）
    const parsedResult = parseTask(result);

    // 3. 更新本地任务列表，让 UI 上的“已同意”变成“已拒绝”
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? parsedResult : t)),
    }));
  },

  completeTask: async (taskId, variables = {}, comment) => {
    const result: any = await taskApi.completeTask(taskId, {
      variables,
      comment,
    });
    const parsed = parseTask(result);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? parsed : t)),
    }));
  },
}));
