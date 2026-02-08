
export enum Language {
  ENGLISH = 'English',
  ARABIC = 'Arabic',
  FRENCH = 'French'
}

export enum EmergencyType {
  BLEEDING = 'Severe Bleeding',
  FIRE = 'Fire or Smoke',
  NONE = 'Not an Emergency'
}

export enum DangerLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MODERATE = 'MODERATE',
  LOW = 'LOW'
}

export enum AgentState {
  IDLE = 'IDLE',
  MONITORING = 'MONITORING', // Fast Path Active
  ASSESSING = 'ASSESSING',   // Fast Path Triggered -> Transitioning
  ANALYZING = 'ANALYZING',   // Deep Path Active (Gemini)
  VERIFYING = 'VERIFYING',   // Severity Scoring
  ACTIVE = 'ACTIVE'          // Emergency Protocol Active
}

export interface EmergencyInstruction {
  type: EmergencyType;
  dangerLevel: DangerLevel;
  actions: string[];
  warning?: string;
  reason?: string;
}

export interface AppState {
  language: Language;
  isEmergencyActive: boolean;
  isAnalyzing: boolean;
  agentState: AgentState;
  lastInstruction: EmergencyInstruction | null;
  error: string | null;
}
