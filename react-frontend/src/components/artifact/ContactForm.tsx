/**
 * Contact Form Component
 *
 * Expert contact form with selection cards and message input
 * Matches Flask design exactly with Material Design 3 styling
 */

import { useState } from 'react';
import { toast } from 'sonner';
import ExpertCard from './ExpertCard';
import { apiClient } from '../../api/client';

// Expert profiles data - matches Flask expertCards.js
const EXPERTS = [
  {
    id: 'senior-analyst',
    title: 'Senior Analyst',
    description: 'Expert in PV market and price. Works with Alex and Maya',
    icon: 'chart',
    color: 'navy' as const,
  },
  {
    id: 'technology-expert',
    title: 'Senior Technology Expert',
    description: 'Expert in PV technology',
    icon: 'solar',
    color: 'gold' as const,
  },
  {
    id: 'ai-expert',
    title: 'Senior AI Expert',
    description: 'Discuss about AI solutions and needs for your company. Works with Nova',
    icon: 'ai',
    color: 'navy-light' as const,
  },
  {
    id: 'marketing-sales',
    title: 'Marketing and Sales Rep',
    description: 'Discuss about Becquerel Institute services and products',
    icon: 'briefcase',
    color: 'gold-dark' as const,
  },
];

interface ContactFormProps {
  onSuccess: () => void;
}

export default function ContactForm({ onSuccess }: ContactFormProps) {
  const [message, setMessage] = useState('');
  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleExpert = (expertId: string) => {
    setSelectedExperts((prev) =>
      prev.includes(expertId)
        ? prev.filter((id) => id !== expertId)
        : [...prev, expertId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!message.trim()) {
      toast.error('Please enter your message');
      return;
    }

    setLoading(true);

    try {
      await apiClient.request('chat/contact/submit', {
        method: 'POST',
        body: JSON.stringify({
          message: message.trim(),
          selected_experts: selectedExperts,
        }),
      });

      // Show success screen
      setShowSuccess(true);

      // Auto-close after 5 seconds
      setTimeout(() => {
        onSuccess();
      }, 5000);
    } catch (error) {
      console.error('Failed to submit contact request:', error);
      toast.error('Failed to send request. Please try again.');
      setLoading(false);
    }
  };

  // Success screen
  if (showSuccess) {
    return (
      <div className="artifact-success">
        <div className="success-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3 className="success-title">Request Sent Successfully!</h3>
        <p className="success-message">
          Thank you! Our experts have received your request and will reach out to you
          within 24-48 hours with personalized insights.
        </p>
        <p className="success-note">
          Please check your email (including spam folder) for our response.
        </p>
        <button
          className="btn-close-success"
          onClick={onSuccess}
        >
          Close
        </button>

        <style>{`
          /* Success Screen - MD3 flat design */
          .artifact-success {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 3rem 2rem;
            background: white;
          }

          .success-icon {
            margin-bottom: 1.5rem;
            animation: success-pop 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }

          @keyframes success-pop {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            50% {
              transform: scale(1.05);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          .success-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 1rem 0;
            letter-spacing: -0.01em;
            font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          }

          .success-message {
            font-size: 1.125rem;
            line-height: 1.7;
            color: #475569;
            margin: 0 0 1rem 0;
            max-width: 500px;
            font-weight: 400;
          }

          .success-note {
            font-size: 0.9375rem;
            color: #64748b;
            margin: 0 0 2rem 0;
            font-style: normal;
            font-weight: 300;
          }

          .btn-close-success {
            padding: 0.875rem 2rem;
            font-size: 1rem;
            font-weight: 500;
            font-family: 'Inter', 'Open Sans', Arial, sans-serif;
            color: white;
            background: #FFB74D;
            border: none;
            border-radius: 9999px;
            cursor: pointer;
            transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: none;
            position: relative;
            overflow: hidden;
          }

          .btn-close-success::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            opacity: 0;
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
          }

          .btn-close-success:hover {
            background: #FFB74D;
            transform: none;
            box-shadow: none;
          }

          .btn-close-success:hover::before {
            opacity: 0.08;
          }

          @media (max-width: 768px) {
            .artifact-success {
              padding: 2rem 1rem;
            }

            .success-title {
              font-size: 1.5rem;
            }

            .success-message {
              font-size: 1rem;
            }
          }
        `}</style>
      </div>
    );
  }

  // Contact form
  return (
    <div className="artifact-contact-form">
      <form onSubmit={handleSubmit} className="contact-form">
        {/* Expert Selection Section */}
        <div className="expert-selection-section">
          <h3 className="expert-section-title">Contact Our Experts</h3>
          <label className="expert-selection-label">
            Select Expert(s) <span className="optional-text">(optional)</span>
          </label>
          <p className="expert-selection-hint">
            Choose one or more experts who can best help with your inquiry
          </p>
          <div className="expert-cards-grid">
            {EXPERTS.map((expert) => (
              <ExpertCard
                key={expert.id}
                expert={expert}
                selected={selectedExperts.includes(expert.id)}
                onToggle={() => toggleExpert(expert.id)}
              />
            ))}
          </div>
        </div>

        {/* Message Field */}
        <div className="form-group">
          <label htmlFor="contact-message" className="form-label">
            Your Question or Request <span className="required">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            className="form-textarea"
            rows={6}
            placeholder="Please describe what information or insights you're looking for..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className={`btn-submit ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {!loading && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13"></path>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
            )}
            <span>{loading ? 'Sending...' : 'Send Request'}</span>
          </button>
        </div>
      </form>

      <style>{`
        /* Form Container */
        .artifact-contact-form {
          max-width: 100%;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Expert Selection Section */
        .expert-selection-section {
          margin-bottom: 2rem;
        }

        .expert-section-title {
          font-size: 1.5rem;
          font-weight: 300;
          color: #000A55;
          margin: 0 0 1.5rem 0;
          letter-spacing: -0.02em;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
        }

        .expert-selection-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 400;
          color: #475569;
          margin-bottom: 0.5rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          letter-spacing: -0.01em;
        }

        .optional-text {
          font-weight: 300;
          color: #9ca3af;
          font-size: 0.8125rem;
        }

        .expert-selection-hint {
          font-size: 0.8125rem;
          font-weight: 300;
          color: #6b7280;
          margin-bottom: 1.25rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          letter-spacing: -0.005em;
        }

        .expert-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        /* Form Groups */
        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 400;
          color: #475569;
          margin-bottom: 0.5rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          letter-spacing: -0.01em;
        }

        .required {
          color: #ef4444;
          font-weight: 400;
        }

        /* Form Textarea - MD3 flat design */
        .form-textarea {
          width: 100%;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          color: #1e293b;
          background: white;
          border: none;
          border-radius: 8px;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          box-sizing: border-box;
          box-shadow: none;
          resize: vertical;
          min-height: 80px;
          line-height: 1.5;
        }

        .form-textarea:focus {
          border: none;
          box-shadow: none;
          background: #fafafa;
        }

        .form-textarea::placeholder {
          color: #9ca3af;
        }

        /* Form Actions */
        .form-actions {
          margin-top: 1.25rem;
          display: flex;
          justify-content: flex-end;
        }

        /* MD3 Submit Button - Flat design with state layers */
        .btn-submit {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 2rem;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          letter-spacing: -0.01em;
          color: white;
          background: #1e3a8a;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: none;
          position: relative;
          overflow: hidden;
        }

        .btn-submit::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          opacity: 0;
          transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        .btn-submit:hover:not(:disabled) {
          background: #1e3a8a;
          transform: none;
          box-shadow: none;
        }

        .btn-submit:hover:not(:disabled)::before {
          opacity: 0.08;
        }

        .btn-submit:active:not(:disabled) {
          transform: none;
          box-shadow: none;
        }

        .btn-submit:active:not(:disabled)::before {
          opacity: 0.12;
        }

        .btn-submit:disabled {
          opacity: 0.38;
          cursor: not-allowed;
          transform: none;
        }

        .btn-submit:disabled::before {
          display: none;
        }

        .btn-submit svg {
          width: 18px;
          height: 18px;
          transition: none;
          position: relative;
          z-index: 1;
        }

        .btn-submit:hover:not(:disabled) svg {
          transform: none;
        }

        /* Loading state */
        .btn-submit.loading span {
          opacity: 0;
        }

        .btn-submit.loading::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          top: 50%;
          left: 50%;
          margin-left: -10px;
          margin-top: -10px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: button-spin 0.8s linear infinite;
        }

        @keyframes button-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .expert-cards-grid {
            grid-template-columns: 1fr;
            gap: 0.875rem;
          }

          .form-group {
            margin-bottom: 1.25rem;
          }

          .btn-submit {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .expert-section-title {
            font-size: 1.125rem;
          }

          .form-textarea {
            padding: 0.75rem 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
