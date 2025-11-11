/**
 * Survey Types
 *
 * Type definitions for user profiling surveys (Stage 1 and Stage 2)
 */

// Stage 1 Survey Data
export interface UserSurveyData {
  role: string;
  role_other?: string;
  regions: string[];
  familiarity: string;
  insights: string[];
  tailored?: string;
}

// Stage 2 Survey Data
export interface UserSurveyStage2Data {
  work_focus: string;
  work_focus_other?: string;
  pv_segments: string[];
  technologies: string[];
  technologies_other?: string;
  challenges: string[];  // Max 3
  weekly_insight?: string;
}

// Survey Status Response
export interface SurveyStatus {
  stage1_completed: boolean;
  stage2_completed: boolean;
}

// Survey Submit Response
export interface SurveySubmitResponse {
  success: boolean;
  message: string;
  new_query_count: number | string;
  new_query_limit: number | string;
}

// Survey Step State (for multi-step form)
export interface SurveyStepState {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
}
