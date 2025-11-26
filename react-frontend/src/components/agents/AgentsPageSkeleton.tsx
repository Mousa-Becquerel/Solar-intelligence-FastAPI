/**
 * Agents Page Skeleton Loader
 *
 * Professional skeleton loading state for the agents gallery page
 * Matches the layout of the actual agents page with shimmer animations
 */

export default function AgentsPageSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f5f5f5',
        fontFamily: "'Inter', 'Roboto', 'Google Sans Text', Arial, sans-serif",
      }}
    >
      {/* Sidebar Skeleton */}
      <div
        style={{
          width: '72px',
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          position: 'fixed',
          height: '100vh',
          zIndex: 100,
        }}
      >
        {/* Sidebar header skeleton */}
        <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
          <div
            className="skeleton"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              margin: '0 auto',
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          marginLeft: '72px',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Top Bar Skeleton */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '52px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Title skeleton */}
          <div
            className="skeleton"
            style={{
              width: '140px',
              height: '28px',
              borderRadius: '6px',
            }}
          />

          {/* Button skeleton */}
          <div
            className="skeleton"
            style={{
              width: '120px',
              height: '40px',
              borderRadius: '20px',
            }}
          />
        </div>

        {/* Hero Section Skeleton */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(255, 183, 77, 0.12) 100%)',
            padding: '64px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '320px',
          }}
        >
          {/* Welcome text skeleton */}
          <div style={{ marginBottom: '32px', textAlign: 'center', maxWidth: '900px' }}>
            <div
              className="skeleton skeleton-pulse"
              style={{
                width: '320px',
                height: '38px',
                borderRadius: '8px',
                margin: '0 auto 12px auto',
              }}
            />
            <div
              className="skeleton skeleton-pulse"
              style={{
                width: '600px',
                height: '24px',
                borderRadius: '6px',
                margin: '0 auto',
              }}
            />
          </div>

          {/* Input section skeleton */}
          <div
            style={{
              width: '100%',
              maxWidth: '800px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '8px',
              boxShadow: '0 8px 32px rgba(30, 58, 138, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Input field skeleton */}
              <div
                className="skeleton"
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: '24px',
                }}
              />
              {/* Button skeleton */}
              <div
                className="skeleton"
                style={{
                  width: '140px',
                  height: '48px',
                  borderRadius: '24px',
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px' }}>
          {/* Filter buttons skeleton */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '24px',
              justifyContent: 'center',
            }}
          >
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="skeleton"
                style={{
                  width: index === 0 ? '100px' : index === 1 ? '90px' : '140px',
                  height: '40px',
                  borderRadius: '20px',
                }}
              />
            ))}
          </div>

          {/* Agent cards grid skeleton */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 280px))',
              gap: '24px',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="skeleton-card"
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px',
                  height: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                }}
              >
                {/* Icon skeleton */}
                <div
                  className="skeleton"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                  }}
                />

                {/* Title skeleton */}
                <div
                  className="skeleton skeleton-pulse"
                  style={{
                    width: '70%',
                    height: '24px',
                    borderRadius: '6px',
                  }}
                />

                {/* Description lines skeleton */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    className="skeleton"
                    style={{
                      width: '100%',
                      height: '14px',
                      borderRadius: '4px',
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      width: '90%',
                      height: '14px',
                      borderRadius: '4px',
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      width: '80%',
                      height: '14px',
                      borderRadius: '4px',
                    }}
                  />
                </div>

                {/* Tags skeleton */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div
                    className="skeleton"
                    style={{
                      width: '60px',
                      height: '24px',
                      borderRadius: '12px',
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{
                      width: '80px',
                      height: '24px',
                      borderRadius: '12px',
                    }}
                  />
                </div>

                {/* Button skeleton */}
                <div
                  className="skeleton"
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '20px',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        .skeleton {
          background: linear-gradient(
            90deg,
            #f0f0f0 0%,
            #f8f8f8 50%,
            #f0f0f0 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }

        .skeleton-pulse {
          animation: shimmer 2s infinite, pulse 2s ease-in-out infinite;
        }

        .skeleton-card {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Stagger animation for cards */
        .skeleton-card:nth-child(1) { animation-delay: 0s; }
        .skeleton-card:nth-child(2) { animation-delay: 0.05s; }
        .skeleton-card:nth-child(3) { animation-delay: 0.1s; }
        .skeleton-card:nth-child(4) { animation-delay: 0.15s; }
        .skeleton-card:nth-child(5) { animation-delay: 0.2s; }
        .skeleton-card:nth-child(6) { animation-delay: 0.25s; }
        .skeleton-card:nth-child(7) { animation-delay: 0.3s; }
        .skeleton-card:nth-child(8) { animation-delay: 0.35s; }
      `}</style>
    </div>
  );
}
