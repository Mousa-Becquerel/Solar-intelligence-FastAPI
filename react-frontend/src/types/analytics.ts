/**
 * Analytics Types - TypeScript definitions for admin analytics data
 */

export interface AnalyticsOverview {
  total_users: number;
  active_users: number;
  total_conversations: number;
  total_messages: number;
  total_queries: number;
  total_responses: number;
  plan_distribution: Record<string, number>;
  new_users_week: number;
  new_users_month: number;
}

export interface DailyUsageData {
  date: string;
  queries: number;
  active_users: number;
  new_conversations: number;
}

export interface UsageOverTime {
  period_days: number;
  daily_data: DailyUsageData[];
  total_queries: number;
}

export interface AgentUsageItem {
  agent: string;
  queries: number;
  unique_users: number;
  conversations: number;
  currently_hired: number;
}

export interface AgentUsageStats {
  period_days: number;
  agents: AgentUsageItem[];
  total_queries: number;
}

export interface RecentQuery {
  id: number;
  query: string;
  agent: string;
  timestamp: string;
  user_hash: string;
}

export interface RecentQueriesResponse {
  queries: RecentQuery[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface AnonymizedUser {
  user_hash: string;
  queries: number;
}

export interface UserEngagement {
  period_days: number;
  total_queries: number;
  unique_active_users: number;
  avg_queries_per_user: number;
  top_users_anonymized: AnonymizedUser[];
  first_half_active_users: number;
  second_half_active_users: number;
}

export interface HourlyData {
  hour: number;
  queries: number;
}

export interface HourlyDistribution {
  period_days: number;
  hourly_distribution: HourlyData[];
  peak_hour: number;
  peak_queries: number;
}

export interface FullAnalyticsReport {
  generated_at: string;
  period_days: number;
  overview: AnalyticsOverview;
  usage_over_time: UsageOverTime;
  agent_stats: AgentUsageStats;
  user_engagement: UserEngagement;
  hourly_distribution: HourlyDistribution;
}

// Survey Types
export interface Stage1Survey {
  id: number;
  user_hash: string;
  email: string;
  role: string;
  role_other: string | null;
  regions: string[];
  familiarity: string;
  insights: string[];
  tailored: string | null;
  created_at: string;
  bonus_queries_granted: number;
}

export interface Stage2Survey {
  id: number;
  user_hash: string;
  email: string;
  work_focus: string;
  work_focus_other: string | null;
  pv_segments: string[];
  technologies: string[];
  technologies_other: string | null;
  challenges: string[];
  weekly_insight: string | null;
  created_at: string;
  bonus_queries_granted: number;
}

export interface SurveyAggregates {
  role_distribution: Record<string, number>;
  familiarity_distribution: Record<string, number>;
  region_distribution: Record<string, number>;
  work_focus_distribution: Record<string, number>;
}

export interface SurveyAnalytics {
  total_stage1: number;
  total_stage2: number;
  stage1_surveys: Stage1Survey[];
  stage2_surveys: Stage2Survey[];
  aggregates: SurveyAggregates;
}
