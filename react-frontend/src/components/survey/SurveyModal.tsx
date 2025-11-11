/**
 * Survey Modal - Stage 1 (User Profiling)
 *
 * 5-step survey triggered when free users hit 5 queries
 * Rewards user with 5 additional queries upon completion
 */

import { useState, FormEvent } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import type { UserSurveyData } from '../../types/survey';
import '../../styles/survey.css';

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newQueryCount: number | string, newQueryLimit: number | string) => void;
}

export function SurveyModal({ isOpen, onClose, onSuccess }: SurveyModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UserSurveyData>({
    role: '',
    role_other: '',
    regions: [],
    familiarity: '',
    insights: [],
    tailored: '',
  });

  const totalSteps = 5;

  // Step 1: Role
  const roleOptions = [
    'Researcher',
    'Policy Maker',
    'Industry Professional',
    'Consultant',
    'Investor',
    'Student',
    'Other',
  ];

  // Step 2: Regions
  const regionOptions = [
    'Europe',
    'North America',
    'Asia-Pacific',
    'Middle East & Africa',
    'Latin America',
    'Global',
  ];

  // Step 3: Familiarity
  const familiarityOptions = [
    { value: 'beginner', label: 'Beginner - Just getting started' },
    { value: 'intermediate', label: 'Intermediate - Some knowledge' },
    { value: 'advanced', label: 'Advanced - Deep expertise' },
  ];

  // Step 4: Insights
  const insightOptions = [
    'Market Trends',
    'Pricing Data',
    'Policy Updates',
    'Technology Insights',
    'Supply Chain',
    'Competitive Analysis',
  ];

  // Step 5: Tailored recommendations
  const tailoredOptions = [
    { value: 'yes', label: 'Yes, please!' },
    { value: 'no', label: 'No, thanks' },
  ];

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return formData.role !== '';
      case 2:
        return formData.regions.length > 0;
      case 3:
        return formData.familiarity !== '';
      case 4:
        return formData.insights.length > 0;
      case 5:
        return formData.tailored !== '';
      default:
        return false;
    }
  };

  const handleRoleChange = (role: string) => {
    setFormData({ ...formData, role, role_other: role === 'Other' ? formData.role_other : '' });
  };

  const handleRegionToggle = (region: string) => {
    const regions = formData.regions.includes(region)
      ? formData.regions.filter((r) => r !== region)
      : [...formData.regions, region];
    setFormData({ ...formData, regions });
  };

  const handleInsightToggle = (insight: string) => {
    const insights = formData.insights.includes(insight)
      ? formData.insights.filter((i) => i !== insight)
      : [...formData.insights, insight];
    setFormData({ ...formData, insights });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canProceed()) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.submitUserSurvey(formData);

      if (response.success) {
        toast.success(response.message);
        onSuccess(response.new_query_count, response.new_query_limit);
        onClose();

        // Auto-reload after a short delay to update query count
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Survey submission error:', error);
      toast.error(error.message || 'Failed to submit survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="survey-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="survey-modal-content">
        {/* Close button */}
        <button
          className="survey-close"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <div className="survey-header">
          <h2 className="survey-title">User Profiling Survey</h2>
          <p className="survey-subtitle">Help us understand your needs better to unlock 5 extra queries</p>

          {/* Progress Indicator */}
          <div className="survey-progress">
            <div className="survey-progress-bar">
              <div
                className="survey-progress-fill"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            <div className="survey-progress-text">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="survey-form">
          {/* Step 1: Role */}
          {currentStep === 1 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  What best describes your role? <span className="required">*</span>
                </label>
                <p className="survey-helper-text">This helps us tailor insights to your needs</p>

                <div className="survey-radio-group">
                  {roleOptions.map((option) => (
                    <label key={option} className="survey-radio">
                      <input
                        type="radio"
                        name="role"
                        value={option}
                        checked={formData.role === option}
                        onChange={(e) => handleRoleChange(e.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>

                {formData.role === 'Other' && (
                  <input
                    type="text"
                    className="survey-input"
                    placeholder="Please specify..."
                    value={formData.role_other || ''}
                    onChange={(e) => setFormData({ ...formData, role_other: e.target.value })}
                    style={{ marginTop: '1rem' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 2: Regions */}
          {currentStep === 2 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  Which regions are you interested in? <span className="required">*</span>
                </label>
                <p className="survey-helper-text">Select all that apply</p>

                <div className="survey-checkbox-group">
                  {regionOptions.map((option) => (
                    <label key={option} className="survey-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.regions.includes(option)}
                        onChange={() => handleRegionToggle(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Familiarity */}
          {currentStep === 3 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  How familiar are you with PV markets? <span className="required">*</span>
                </label>
                <p className="survey-helper-text">This helps us adjust the complexity of insights</p>

                <div className="survey-radio-group">
                  {familiarityOptions.map((option) => (
                    <label key={option.value} className="survey-radio">
                      <input
                        type="radio"
                        name="familiarity"
                        value={option.value}
                        checked={formData.familiarity === option.value}
                        onChange={(e) => setFormData({ ...formData, familiarity: e.target.value })}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Insights */}
          {currentStep === 4 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  What type of insights are you looking for? <span className="required">*</span>
                </label>
                <p className="survey-helper-text">Select all that apply</p>

                <div className="survey-checkbox-group">
                  {insightOptions.map((option) => (
                    <label key={option} className="survey-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.insights.includes(option)}
                        onChange={() => handleInsightToggle(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Tailored */}
          {currentStep === 5 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  Would you like tailored recommendations? <span className="required">*</span>
                </label>
                <p className="survey-helper-text">Based on your profile and preferences</p>

                <div className="survey-radio-group">
                  {tailoredOptions.map((option) => (
                    <label key={option.value} className="survey-radio">
                      <input
                        type="radio"
                        name="tailored"
                        value={option.value}
                        checked={formData.tailored === option.value}
                        onChange={(e) => setFormData({ ...formData, tailored: e.target.value })}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="survey-actions">
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : handleBack}
              disabled={isSubmitting}
              className="survey-btn survey-btn-secondary"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="survey-btn survey-btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canProceed() || isSubmitting}
                className="survey-btn survey-btn-primary"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Get 5 Extra Queries'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
