import { create } from "zustand";
import { authApi } from "../api";
import {
  initializeWebSocket,
  disconnectWebSocket,
} from "../services/websocket.service";

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 1. 初始化时，直接从硬盘读取 User 和 Token
  // 这样刷新页面的一瞬间，isLoggedIn 就会是正确的状态
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),
  loading: false,

  // 💡 关键修改：不要写死 false，而是根据本地是否有 token 来判断
  isLoggedIn: !!localStorage.getItem("token"),

  // 2. 真实登录逻辑（连接后端）
  login: async (username, password) => {
    set({ loading: true });
    try {
      // 调用我们之前在 api/index.ts 定义的后端接口
      const data: any = await authApi.login({ username, password });

      // 登录成功，将信息存入硬盘持久化
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      initializeWebSocket(data.token); // 💡 取消注释
      // 更新内存状态
      set({
        token: data.token,
        user: data.user,
        isLoggedIn: true,
        loading: false,
      });
      return data;
    } catch (error) {
      set({ loading: false });
      throw error; // 抛出错误让视图层 message.error 显示
    }
  },

  register: async (data) => {
    set({ loading: true });
    try {
      const result = await authApi.register(data);
      return result;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    // 1. 清空硬盘持久化数据
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // 💡 2. 关键修改：断开 WebSocket 物理连接
    disconnectWebSocket();

    // 3. 重置内存状态
    set({ token: null, user: null, isLoggedIn: false });
  },

  initAuth: () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      // 💡 关键修改：如果用户刷新页面，重新建立 WebSocket 连接
      // 否则刷新后小铃铛就会失效
      initializeWebSocket(token);

      set({
        token,
        user: JSON.parse(user),
        isLoggedIn: true,
      });
    } else {
      set({ isLoggedIn: false });
    }
  },
}));
