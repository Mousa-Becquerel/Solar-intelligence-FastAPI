/**
 * Survey Modal - Stage 2 (Market Activity & Behaviour)
 *
 * 5-step advanced survey triggered when free users hit 10 queries
 * Rewards user with 5 additional queries upon completion
 */

import { useState, FormEvent } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../../api/client';
import type { UserSurveyStage2Data } from '../../types/survey';
import '../../styles/survey.css';

interface SurveyModalStage2Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newQueryCount: number | string, newQueryLimit: number | string) => void;
}

export function SurveyModalStage2({ isOpen, onClose, onSuccess }: SurveyModalStage2Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UserSurveyStage2Data>({
    work_focus: '',
    work_focus_other: '',
    pv_segments: [],
    technologies: [],
    technologies_other: '',
    challenges: [],
    weekly_insight: '',
  });

  const totalSteps = 5;

  // Step 1: Work Focus
  const workFocusOptions = [
    'Manufacturing',
    'Project Development',
    'Investment & Finance',
    'Policy & Regulation',
    'Research & Development',
    'Supply Chain & Logistics',
    'Consulting & Advisory',
    'Other',
  ];

  // Step 2: PV Segments
  const pvSegmentOptions = [
    'Residential',
    'Commercial & Industrial (C&I)',
    'Utility-Scale',
    'Off-Grid / Standalone',
    'Building-Integrated PV (BIPV)',
    'Agri-PV / Floating PV',
  ];

  // Step 3: Technologies
  const technologyOptions = [
    'Monocrystalline Silicon',
    'Polycrystalline Silicon',
    'Thin-Film (CdTe, CIGS)',
    'Perovskite',
    'Bifacial Modules',
    'Tandem Cells',
    'Energy Storage Systems',
    'Other',
  ];

  // Step 4: Challenges (max 3)
  const challengeOptions = [
    'Supply Chain Disruptions',
    'Policy & Regulatory Uncertainty',
    'Financing & Investment Risks',
    'Technology Selection & Performance',
    'Grid Integration & Infrastructure',
    'Market Competition & Pricing',
    'Talent & Skill Gaps',
    'Environmental & Sustainability Concerns',
  ];

  // Step 5: Weekly Insight (optional text)

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
        return formData.work_focus !== '';
      case 2:
        return formData.pv_segments.length > 0;
      case 3:
        return formData.technologies.length > 0;
      case 4:
        return formData.challenges.length > 0 && formData.challenges.length <= 3;
      case 5:
        return true; // Optional field
      default:
        return false;
    }
  };

  const handleWorkFocusChange = (focus: string) => {
    setFormData({ ...formData, work_focus: focus, work_focus_other: focus === 'Other' ? formData.work_focus_other : '' });
  };

  const handlePVSegmentToggle = (segment: string) => {
    const pv_segments = formData.pv_segments.includes(segment)
      ? formData.pv_segments.filter((s) => s !== segment)
      : [...formData.pv_segments, segment];
    setFormData({ ...formData, pv_segments });
  };

  const handleTechnologyToggle = (tech: string) => {
    const technologies = formData.technologies.includes(tech)
      ? formData.technologies.filter((t) => t !== tech)
      : [...formData.technologies, tech];
    setFormData({ ...formData, technologies });
  };

  const handleChallengeToggle = (challenge: string) => {
    const challenges = formData.challenges.includes(challenge)
      ? formData.challenges.filter((c) => c !== challenge)
      : formData.challenges.length < 3
      ? [...formData.challenges, challenge]
      : formData.challenges; // Don't add if already at max

    if (formData.challenges.length >= 3 && !formData.challenges.includes(challenge)) {
      toast.warning('You can select a maximum of 3 challenges');
    }

    setFormData({ ...formData, challenges });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canProceed()) {
      toast.error('Please complete all required fields');
      return;
    }

    if (formData.challenges.length > 3) {
      toast.error('Please select a maximum of 3 challenges');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.submitUserSurveyStage2(formData);

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
      console.error('Stage 2 survey submission error:', error);
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
          <h2 className="survey-title">Market Activity Survey</h2>
          <p className="survey-subtitle">Share your market insights to unlock 5 more queries</p>

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
          {/* Step 1: Work Focus */}
          {currentStep === 1 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  What is your primary work focus? <span className="required">*</span>
                </label>
                <p className="survey-helper-text">Select the area you focus on most</p>

                <div className="survey-radio-group">
                  {workFocusOptions.map((option) => (
                    <label key={option} className="survey-radio">
                      <input
                        type="radio"
                        name="work_focus"
                        value={option}
                        checked={formData.work_focus === option}
                        onChange={(e) => handleWorkFocusChange(e.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>

                {formData.work_focus === 'Other' && (
                  <input
                    type="text"
                    className="survey-input"
                    placeholder="Please specify..."
                    value={formData.work_focus_other || ''}
                    onChange={(e) => setFormData({ ...formData, work_focus_other: e.target.value })}
                    style={{ marginTop: '1rem' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 2: PV Segments */}
          {currentStep === 2 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  Which PV segments do you work with? <span className="required">*</span>
                </label>
                <p className="survey-helper-text">Select all that apply</p>

                <div className="survey-checkbox-group">
                  {pvSegmentOptions.map((option) => (
                    <label key={option} className="survey-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.pv_segments.includes(option)}
                        onChange={() => handlePVSegmentToggle(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Technologies */}
          {currentStep === 3 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  Which PV technologies interest you? <span className="required">*</span>
                </label>
                <p className="survey-helper-text">Select all that apply</p>

                <div className="survey-checkbox-group">
                  {technologyOptions.map((option) => (
                    <label key={option} className="survey-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.technologies.includes(option)}
                        onChange={() => handleTechnologyToggle(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>

                {formData.technologies.includes('Other') && (
                  <input
                    type="text"
                    className="survey-input"
                    placeholder="Please specify other technologies..."
                    value={formData.technologies_other || ''}
                    onChange={(e) => setFormData({ ...formData, technologies_other: e.target.value })}
                    style={{ marginTop: '1rem' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 4: Challenges (max 3) */}
          {currentStep === 4 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  What are your top 3 challenges? <span className="required">*</span>
                </label>
                <p className="challenge-counter">
                  {formData.challenges.length}/3 selected
                </p>

                <div className="survey-checkbox-group">
                  {challengeOptions.map((option) => {
                    const isSelected = formData.challenges.includes(option);
                    const isDisabled = !isSelected && formData.challenges.length >= 3;

                    return (
                      <label
                        key={option}
                        className="survey-checkbox"
                        style={{
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleChallengeToggle(option)}
                          disabled={isDisabled}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Weekly Insight (optional) */}
          {currentStep === 5 && (
            <div className="survey-step">
              <div className="survey-question">
                <label className="survey-label">
                  Would you like weekly PV market insights?
                </label>
                <p className="survey-helper-text">
                  Optional: Tell us what type of insights you'd like to receive weekly
                </p>

                <textarea
                  className="survey-textarea"
                  placeholder="E.g., pricing trends, policy updates, technology breakthroughs..."
                  value={formData.weekly_insight || ''}
                  onChange={(e) => setFormData({ ...formData, weekly_insight: e.target.value })}
                  rows={4}
                />
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
                disabled={isSubmitting}
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
