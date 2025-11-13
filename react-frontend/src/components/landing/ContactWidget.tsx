/**
 * ContactWidget Component
 * Modal contact form
 */

import { useState, useEffect, FormEvent } from 'react';
import styles from './ContactWidget.module.css';

interface ContactWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactWidget({ isOpen, onClose }: ContactWidgetProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Disable body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    const formData = new FormData(e.currentTarget);

    // Convert FormData to API format
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const company = formData.get('company') as string;
    const message = formData.get('message') as string;

    const data = {
      name: `${firstName} ${lastName}`.trim(),
      email,
      company: company || undefined,
      message,
    };

    try {
      const response = await fetch('http://localhost:8000/api/v1/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.container}>
        <button className={styles.closeButton} onClick={onClose}>
          <svg className={styles.closeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <div className={styles.content}>
          {status === 'success' ? (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>
                <svg width="32" height="32" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className={styles.successTitle}>Message Sent!</h3>
              <p className={styles.successText}>Thank you for your message! We will get back to you soon.</p>
              <button onClick={onClose} className={styles.successButton}>
                Close
              </button>
            </div>
          ) : (
            <>
              <div className={styles.header}>
                <h2 className={styles.title}>
                  Get in <span className={styles.titleAccent}>touch</span>
                </h2>
                <p className={styles.subtitle}>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="firstName" className={styles.label}>
                      First name *
                    </label>
                    <input type="text" id="firstName" name="firstName" className={styles.input} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="lastName" className={styles.label}>
                      Last name *
                    </label>
                    <input type="text" id="lastName" name="lastName" className={styles.input} required />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                      Email *
                    </label>
                    <input type="email" id="email" name="email" className={styles.input} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="company" className={styles.label}>
                      Company
                    </label>
                    <input type="text" id="company" name="company" className={styles.input} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.label}>
                    Message *
                  </label>
                  <textarea id="message" name="message" rows={3} className={`${styles.input} ${styles.textarea}`} required></textarea>
                </div>

                <button type="submit" className={styles.submitButton} disabled={status === 'loading'}>
                  {status === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
