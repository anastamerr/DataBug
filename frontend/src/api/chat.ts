import { API_BASE, api } from "./client";

export type ChatRequest = {
  message: string;
  bug_id?: string;
  scan_id?: string;
  finding_id?: string;
};

export type ChatResponse = {
  response: string;
  used_llm: boolean;
  model?: string | null;
};

export const chatApi = {
  send: async (payload: ChatRequest) => {
    const { data } = await api.post<ChatResponse>("/api/chat", payload);
    return data;
  },
  stream: async (
    payload: ChatRequest,
    signal?: AbortSignal,
  ): Promise<Response> => {
    return fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  },
};

