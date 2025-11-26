/**
 * Loading Skeleton
 *
 * Skeleton placeholder shown while agents are loading
 * Matches the final layout of WelcomeScreen + SuggestedQueries
 */

export default function LoadingSkeleton() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#ffffff',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
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
          border-radius: 8px;
        }

        .skeleton-pulse {
          animation: shimmer 2s infinite, pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3rem',
        }}
      >
        {/* Welcome Title Skeleton */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          {/* Title placeholder */}
          <div
            className="skeleton skeleton-pulse"
            style={{
              width: '60%',
              height: '3rem',
              maxWidth: '500px',
            }}
          />

          {/* Subtitle placeholders - 2 lines */}
          <div
            style={{
              width: '80%',
              maxWidth: '700px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            <div
              className="skeleton"
              style={{
                width: '100%',
                height: '1.125rem',
              }}
            />
            <div
              className="skeleton"
              style={{
                width: '85%',
                height: '1.125rem',
              }}
            />
          </div>
        </div>

        {/* Suggested Queries Skeleton */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
            padding: '0 1rem',
          }}
        >
          {/* 6 query pill skeletons */}
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="skeleton"
              style={{
                height: '44px',
                borderRadius: '9999px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
