import { AgentStateStore } from '@/types/agent';

export const INITIAL_AGENT_STATE: AgentStateStore = {
  severity: 0,
  confidence: 0,
  latency: {
    perception: 0,
    fastPath: 0,
    deepPath: 0,
    total: 0
  },
  logs: [],
  execution: null,
  isProcessing: false
};

export const generateTraceId = () => `TRC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;