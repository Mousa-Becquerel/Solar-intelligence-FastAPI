/**
 * Admin Analytics Page
 * Platform usage analytics with anonymized user data
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiClient } from '../../api/client';
import type { FullAnalyticsReport, AgentUsageItem, RecentQuery, RecentQueriesResponse, HourlyData, SurveyAnalytics, Stage1Survey, Stage2Survey } from '../../types/analytics';
import './AdminAnalyticsPage.css';

export default function AdminAnalyticsPage() {
  const [report, setReport] = useState<FullAnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getAnalyticsFullReport(selectedPeriod);
      setReport(response.data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getMaxQueries = (agents: AgentUsageItem[]): number => {
    return Math.max(...agents.map(a => a.queries), 1);
  };

  const getMaxHourlyQueries = (hourly: HourlyData[]): number => {
    return Math.max(...hourly.map(h => h.queries), 1);
  };

  const formatAgentName = (agent: string): string => {
    return agent
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="analytics-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="analytics-page">
        <div className="loading-container">
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  const { overview, agent_stats, user_engagement, hourly_distribution } = report;

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10"></path>
              <path d="M12 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
            Platform Analytics
          </h1>
          <p className="analytics-subtitle">
            Usage insights with anonymized user data | Generated: {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>

        <div className="header-actions">
          <select
            className="period-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <Link to="/admin" className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"></path>
            </svg>
            Back to Admin
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon" style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span className="stat-label">Total Users</span>
          </div>
          <p className="stat-value">{formatNumber(overview.total_users)}</p>
          <p className="stat-change positive">+{overview.new_users_week} this week</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon" style={{ backgroundColor: '#FFECB3', color: '#FF8F00' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <span className="stat-label">Active Users</span>
          </div>
          <p className="stat-value">{formatNumber(overview.active_users)}</p>
          <p className="stat-change">{user_engagement.unique_active_users} active in period</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon" style={{ backgroundColor: '#FFE0B2', color: '#EF6C00' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span className="stat-label">Total Queries</span>
          </div>
          <p className="stat-value">{formatNumber(overview.total_queries)}</p>
          <p className="stat-change">{user_engagement.avg_queries_per_user} avg/user</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon" style={{ backgroundColor: '#FFD180', color: '#E65100' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </div>
            <span className="stat-label">Conversations</span>
          </div>
          <p className="stat-value">{formatNumber(overview.total_conversations)}</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon" style={{ backgroundColor: '#FFCC80', color: '#F57C00' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <span className="stat-label">Responses</span>
          </div>
          <p className="stat-value">{formatNumber(overview.total_responses)}</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon" style={{ backgroundColor: '#FFB74D', color: '#BF360C' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <span className="stat-label">Peak Hour</span>
          </div>
          <p className="stat-value">{hourly_distribution.peak_hour}:00</p>
          <p className="stat-change">{hourly_distribution.peak_queries} queries</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Agent Usage */}
        <div className="chart-card">
          <h3 className="chart-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
            Agent Usage
          </h3>
          <table className="agent-usage-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Queries</th>
                <th>Users</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {agent_stats.agents.slice(0, 8).map((agent: AgentUsageItem) => (
                <tr key={agent.agent}>
                  <td className="agent-name">{formatAgentName(agent.agent)}</td>
                  <td>{formatNumber(agent.queries)}</td>
                  <td>{agent.unique_users}</td>
                  <td>
                    <div className="usage-bar-container">
                      <div
                        className="usage-bar"
                        style={{ width: `${(agent.queries / getMaxQueries(agent_stats.agents)) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Hourly Distribution */}
        <div className="chart-card">
          <h3 className="chart-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Hourly Activity (UTC)
          </h3>
          <div className="hourly-chart">
            {hourly_distribution.hourly_distribution.map((hour: HourlyData) => (
              <div key={hour.hour} className="hour-bar-wrapper">
                <div
                  className={`hour-bar ${hour.hour === hourly_distribution.peak_hour ? 'peak' : ''}`}
                  style={{
                    height: `${Math.max((hour.queries / getMaxHourlyQueries(hourly_distribution.hourly_distribution)) * 150, 4)}px`,
                  }}
                  title={`${hour.hour}:00 - ${hour.queries} queries`}
                />
                {hour.hour % 3 === 0 && (
                  <span className="hour-label">
                    {hour.hour.toString().padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="hourly-chart-legend">
            <div className="legend-item">
              <span className="legend-dot regular"></span>
              <span>Regular hours</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot peak"></span>
              <span>Peak hour ({hourly_distribution.peak_hour}:00 - {hourly_distribution.peak_queries} queries)</span>
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="chart-card">
          <h3 className="chart-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
            User Plans
          </h3>
          <div className="plan-distribution">
            {Object.entries(overview.plan_distribution).map(([plan, count]) => {
              const total = Object.values(overview.plan_distribution).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={plan} className="plan-item">
                  <span className="plan-label">{plan}</span>
                  <div className="plan-bar-container">
                    <div
                      className={`plan-bar ${plan}`}
                      style={{ width: `${percentage}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Queries */}
        <div className="chart-card queries-card">
          <RecentQueriesList agents={agent_stats.agents} />
        </div>

        {/* Surveys Section */}
        <div className="chart-card surveys-card">
          <SurveysSection />
        </div>
      </div>
    </div>
  );
}

function RecentQueriesList({ agents }: { agents: AgentUsageItem[] }) {
  const [queries, setQueries] = useState<RecentQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedDays, setSelectedDays] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQuery, setExpandedQuery] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    // Reset and load when filters change
    setOffset(0);
    setQueries([]);
    loadQueries(0, true);
  }, [selectedAgent, searchTerm, selectedDays]);

  const loadQueries = async (currentOffset: number, reset: boolean = false) => {
    try {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await apiClient.getAnalyticsRecentQueries(
        LIMIT,
        currentOffset,
        selectedAgent !== 'all' ? selectedAgent : undefined,
        searchTerm || undefined,
        selectedDays
      );

      const data = response.data as RecentQueriesResponse;

      if (reset) {
        setQueries(data.queries);
      } else {
        setQueries(prev => [...prev, ...data.queries]);
      }

      setTotal(data.total);
      setHasMore(data.has_more);
      setOffset(currentOffset + data.queries.length);
    } catch (error) {
      console.error('Failed to load queries:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    loadQueries(offset, false);
  };

  const formatAgentName = (agent: string): string => {
    return agent
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedQuery(expandedQuery === id ? null : id);
  };

  // Debounce search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Use a simple timeout for debounce
    setTimeout(() => {
      setSearchTerm(value);
    }, 300);
  };

  // Export CSV handler
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      await apiClient.exportQueriesCSV(selectedDays ?? 30, selectedAgent !== 'all' ? selectedAgent : undefined);
      toast.success('CSV exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="queries-section">
      {/* Header with title and filters */}
      <div className="queries-header">
        <h3 className="chart-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Recent Queries
          <span className="queries-count">{total} total</span>
        </h3>

        <div className="queries-filters">
          {/* Time Filter */}
          <select
            className="queries-filter-select"
            value={selectedDays ?? ''}
            onChange={(e) => setSelectedDays(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Time</option>
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>

          {/* Agent Filter */}
          <select
            className="queries-filter-select"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.agent} value={agent.agent}>
                {formatAgentName(agent.agent)}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="queries-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search queries..."
              onChange={handleSearchChange}
              className="queries-search-input"
            />
          </div>

          {/* Export CSV Button */}
          <button
            className="export-csv-btn"
            onClick={handleExportCSV}
            disabled={isExporting}
            title="Export queries to CSV"
          >
            {isExporting ? (
              <>
                <div className="loading-spinner small" />
                Exporting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Queries List */}
      {isLoading ? (
        <div className="queries-loading">
          <div className="loading-spinner small" />
          <span>Loading queries...</span>
        </div>
      ) : queries.length === 0 ? (
        <div className="queries-empty">
          <p>No queries found</p>
          {(selectedAgent !== 'all' || searchTerm) && (
            <p className="queries-empty-hint">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <>
          <div className="queries-list">
            {queries.map((query: RecentQuery) => (
              <div
                key={query.id}
                className={`query-item ${expandedQuery === query.id ? 'expanded' : ''}`}
                onClick={() => toggleExpand(query.id)}
              >
                <div className="query-header">
                  <div className="query-icon user-icon" title="User Query">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <p className={`query-content ${expandedQuery === query.id ? 'expanded' : ''}`}>
                    {query.query || <span className="query-empty-text">Empty query</span>}
                  </p>
                  <div className="query-expand-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedQuery === query.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
                <div className="query-meta">
                  <span className="query-agent">{formatAgentName(query.agent)}</span>
                  <span className="query-timestamp">{formatTimestamp(query.timestamp)}</span>
                  <span className="query-user">{query.user_hash}</span>
                </div>

                {/* Agent Response - shown when expanded */}
                {expandedQuery === query.id && query.response && (
                  <div className="query-response-section">
                    <div className="response-header">
                      <div className="query-icon agent-icon" title="Agent Response">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                          <line x1="9" y1="9" x2="9.01" y2="9"></line>
                          <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                      </div>
                      <span className="response-label">Agent Response</span>
                    </div>
                    <div className="response-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {query.response}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                {expandedQuery === query.id && !query.response && (
                  <div className="query-response-section no-response">
                    <span className="no-response-text">No response recorded</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="queries-load-more">
              <button
                className="load-more-btn"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <div className="loading-spinner small" />
                    Loading...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    Load More ({total - queries.length} remaining)
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SurveysSection() {
  const [surveyData, setSurveyData] = useState<SurveyAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'stage1' | 'stage2'>('overview');
  const [expandedSurvey, setExpandedSurvey] = useState<number | null>(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getAnalyticsSurveys();
      setSurveyData(response.data);
    } catch (error) {
      console.error('Failed to load surveys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMaxDistributionValue = (distribution: Record<string, number>): number => {
    return Math.max(...Object.values(distribution), 1);
  };

  if (isLoading) {
    return (
      <div className="surveys-section">
        <h3 className="chart-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Survey Responses
        </h3>
        <div className="surveys-loading">
          <div className="loading-spinner small" />
          <span>Loading surveys...</span>
        </div>
      </div>
    );
  }

  if (!surveyData) {
    return (
      <div className="surveys-section">
        <h3 className="chart-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Survey Responses
        </h3>
        <div className="surveys-empty">
          <p>No survey data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surveys-section">
      {/* Header */}
      <div className="surveys-header">
        <h3 className="chart-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Survey Responses
          <span className="surveys-count">{surveyData.total_stage1 + surveyData.total_stage2} total</span>
        </h3>

        {/* Tabs */}
        <div className="surveys-tabs">
          <button
            className={`survey-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`survey-tab ${activeTab === 'stage1' ? 'active' : ''}`}
            onClick={() => setActiveTab('stage1')}
          >
            Profile ({surveyData.total_stage1})
          </button>
          <button
            className={`survey-tab ${activeTab === 'stage2' ? 'active' : ''}`}
            onClick={() => setActiveTab('stage2')}
          >
            Market Activity ({surveyData.total_stage2})
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="surveys-overview">
          {/* Summary Stats */}
          <div className="surveys-summary">
            <div className="survey-stat-box">
              <span className="survey-stat-value">{surveyData.total_stage1}</span>
              <span className="survey-stat-label">Profile Surveys</span>
            </div>
            <div className="survey-stat-box">
              <span className="survey-stat-value">{surveyData.total_stage2}</span>
              <span className="survey-stat-label">Market Activity Surveys</span>
            </div>
            <div className="survey-stat-box">
              <span className="survey-stat-value">
                {surveyData.total_stage1 > 0
                  ? Math.round((surveyData.total_stage2 / surveyData.total_stage1) * 100)
                  : 0}%
              </span>
              <span className="survey-stat-label">Completion Rate</span>
            </div>
          </div>

          {/* Distribution Charts */}
          {surveyData.aggregates && (
            <div className="surveys-distributions">
              {/* Role Distribution */}
              {surveyData.aggregates.role_distribution && Object.keys(surveyData.aggregates.role_distribution).length > 0 && (
                <div className="distribution-chart">
                  <h4 className="distribution-title">Role Distribution</h4>
                  <div className="distribution-bars">
                    {Object.entries(surveyData.aggregates.role_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([role, count]) => (
                        <div key={role} className="distribution-item">
                          <span className="distribution-label">{role}</span>
                          <div className="distribution-bar-container">
                            <div
                              className="distribution-bar"
                              style={{
                                width: `${(count / getMaxDistributionValue(surveyData.aggregates.role_distribution)) * 100}%`
                              }}
                            />
                            <span className="distribution-value">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Familiarity Distribution */}
              {surveyData.aggregates.familiarity_distribution && Object.keys(surveyData.aggregates.familiarity_distribution).length > 0 && (
                <div className="distribution-chart">
                  <h4 className="distribution-title">PV Familiarity</h4>
                  <div className="distribution-bars">
                    {Object.entries(surveyData.aggregates.familiarity_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([level, count]) => (
                        <div key={level} className="distribution-item">
                          <span className="distribution-label">{level}</span>
                          <div className="distribution-bar-container">
                            <div
                              className="distribution-bar familiarity"
                              style={{
                                width: `${(count / getMaxDistributionValue(surveyData.aggregates.familiarity_distribution)) * 100}%`
                              }}
                            />
                            <span className="distribution-value">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Region Distribution */}
              {surveyData.aggregates.region_distribution && Object.keys(surveyData.aggregates.region_distribution).length > 0 && (
                <div className="distribution-chart">
                  <h4 className="distribution-title">Regions of Interest</h4>
                  <div className="distribution-bars">
                    {Object.entries(surveyData.aggregates.region_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([region, count]) => (
                        <div key={region} className="distribution-item">
                          <span className="distribution-label">{region}</span>
                          <div className="distribution-bar-container">
                            <div
                              className="distribution-bar region"
                              style={{
                                width: `${(count / getMaxDistributionValue(surveyData.aggregates.region_distribution)) * 100}%`
                              }}
                            />
                            <span className="distribution-value">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Work Focus Distribution */}
              {surveyData.aggregates.work_focus_distribution && Object.keys(surveyData.aggregates.work_focus_distribution).length > 0 && (
                <div className="distribution-chart">
                  <h4 className="distribution-title">Work Focus</h4>
                  <div className="distribution-bars">
                    {Object.entries(surveyData.aggregates.work_focus_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([focus, count]) => (
                        <div key={focus} className="distribution-item">
                          <span className="distribution-label">{focus}</span>
                          <div className="distribution-bar-container">
                            <div
                              className="distribution-bar work-focus"
                              style={{
                                width: `${(count / getMaxDistributionValue(surveyData.aggregates.work_focus_distribution)) * 100}%`
                              }}
                            />
                            <span className="distribution-value">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stage 1 Surveys Tab */}
      {activeTab === 'stage1' && (
        <div className="surveys-list-container">
          {surveyData.stage1_surveys.length === 0 ? (
            <div className="surveys-empty">
              <p>No profile surveys yet</p>
            </div>
          ) : (
            <div className="surveys-list">
              {surveyData.stage1_surveys.map((survey: Stage1Survey) => (
                <div
                  key={survey.id}
                  className={`survey-item ${expandedSurvey === survey.id ? 'expanded' : ''}`}
                  onClick={() => setExpandedSurvey(expandedSurvey === survey.id ? null : survey.id)}
                >
                  <div className="survey-item-header">
                    <div className="survey-item-main">
                      <span className="survey-email">{survey.email}</span>
                      <span className="survey-role-badge">{survey.role}</span>
                    </div>
                    <div className="survey-item-meta">
                      <span className="survey-timestamp">{formatTimestamp(survey.created_at)}</span>
                      {survey.bonus_queries_granted > 0 && (
                        <span className="survey-bonus">+{survey.bonus_queries_granted} queries</span>
                      )}
                    </div>
                  </div>

                  {expandedSurvey === survey.id && (
                    <div className="survey-item-details">
                      <div className="survey-detail-row">
                        <span className="survey-detail-label">Familiarity:</span>
                        <span className="survey-detail-value">{survey.familiarity}</span>
                      </div>
                      <div className="survey-detail-row">
                        <span className="survey-detail-label">Regions:</span>
                        <span className="survey-detail-value">{survey.regions.join(', ') || 'None selected'}</span>
                      </div>
                      <div className="survey-detail-row">
                        <span className="survey-detail-label">Insights:</span>
                        <span className="survey-detail-value">{survey.insights.join(', ') || 'None selected'}</span>
                      </div>
                      {survey.tailored && (
                        <div className="survey-detail-row">
                          <span className="survey-detail-label">Tailored:</span>
                          <span className="survey-detail-value">{survey.tailored}</span>
                        </div>
                      )}
                      <div className="survey-detail-row">
                        <span className="survey-detail-label">User Hash:</span>
                        <span className="survey-detail-value survey-hash">{survey.user_hash}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage 2 Surveys Tab */}
      {activeTab === 'stage2' && (
        <div className="surveys-list-container">
          {surveyData.stage2_surveys.length === 0 ? (
            <div className="surveys-empty">
              <p>No market activity surveys yet</p>
            </div>
          ) : (
            <div className="surveys-list">
              {surveyData.stage2_surveys.map((survey: Stage2Survey) => (
                <div
                  key={survey.id}
                  className={`survey-item ${expandedSurvey === survey.id + 10000 ? 'expanded' : ''}`}
                  onClick={() => setExpandedSurvey(expandedSurvey === survey.id + 10000 ? null : survey.id + 10000)}
                >
                  <div className="survey-item-header">
                    <div className="survey-item-main">
                      <span className="survey-email">{survey.email}</span>
                      <span className="survey-role-badge work-focus">{survey.work_focus}</span>
                    </div>
                    <div className="survey-item-meta">
                      <span className="survey-timestamp">{formatTimestamp(survey.created_at)}</span>
                      {survey.bonus_queries_granted > 0 && (
                        <span className="survey-bonus">+{survey.bonus_queries_granted} queries</span>
                      )}
                    </div>
                  </div>

                  {expandedSurvey === survey.id + 10000 && (
                    <div className="survey-item-details">
                      <div className="survey-detail-row">
                        <span className="survey-detail-label">PV Segments:</span>
                        <span className="survey-detail-value">{survey.pv_segments.join(', ') || 'None selected'}</span>
                      </div>
                      <div className="survey-detail-row">
                        <span className="survey-detail-label">Technologies:</span>
                        <span className="survey-detail-value">{survey.technologies.join(', ') || 'None selected'}</span>
                      </div>
                      <div className="survey-detail-row">
                        <span className="survey-detail-label">Challenges:</span>
                        <span className="survey-detail-value">{survey.challenges.join(', ') || 'None selected'}</span>
                      </div>
                      {survey.weekly_insight && (
                        <div className="survey-detail-row">
                          <span className="survey-detail-label">Weekly Insight:</span>
                          <span className="survey-detail-value">{survey.weekly_insight}</span>
                        </div>
                      )}
                      <div className="survey-detail-row">
                        <span className="survey-detail-label">User Hash:</span>
                        <span className="survey-detail-value survey-hash">{survey.user_hash}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
