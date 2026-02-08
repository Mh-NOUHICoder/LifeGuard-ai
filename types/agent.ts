export type LogType = 'FAST_PATH' | 'POLICY' | 'DEEP_PATH' | 'DECISION' | 'EXECUTION';

export interface AgentLogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  message: string;
  details?: string;
}

export interface AgentLatency {
  perception: number; // ms
  fastPath: number; // ms
  deepPath: number; // ms
  total: number; // ms
}

export interface ExecutionEvent {
  id: string;
  type: 'EMS_API' | 'CALL' | 'ALERT';
  traceId: string;
  timestamp: number;
  status: 'PENDING' | 'DISPATCHED' | 'FAILED';
}

export interface AgentStateStore {
  severity: number; // 0-100
  confidence: number; // 0-100
  latency: AgentLatency;
  logs: AgentLogEntry[];
  execution: ExecutionEvent | null;
  isProcessing: boolean;
}