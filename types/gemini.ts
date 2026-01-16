
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
  lastInstruction: EmergencyInstruction | null;
  error: string | null;
}
