import React from 'react';
import { Mic, Sun, Moon, Radio, FileText, Code2, History } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentPage: string;
  navigate: (page: string) => void;
  isMockMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  currentPage,
  navigate,
  isMockMode,
}) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Brand Mark */}
      <div
        onClick={() => navigate('landing')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 10px var(--brand-glow)',
          }}
        >
          <Mic size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '-0.02em',
                background: 'var(--brand-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SunoSamjho
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--brand-light)',
                color: 'var(--brand-primary)',
              }}
            >
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => navigate('live')}
          className={`btn btn-sm ${currentPage === 'live' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Radio size={14} />
          <span>Live Room</span>
        </button>

        <button
          onClick={() => navigate('history')}
          className={`btn btn-sm ${currentPage === 'history' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <History size={14} />
          <span>History</span>
        </button>

        <button
          onClick={() => navigate('developers')}
          className={`btn btn-sm ${currentPage === 'developers' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Code2 size={14} />
          <span>Developers</span>
        </button>

        <button
          onClick={() => navigate('docs')}
          className={`btn btn-sm ${currentPage === 'docs' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FileText size={14} />
          <span>Docs</span>
        </button>
      </nav>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isMockMode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-amber)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
            title="Running in local simulation mode. Supply Gnani credentials to switch to real AI services."
          >
            <span>MOCK MODE</span>
          </div>
        )}

        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
          aria-label="Toggle light/dark theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
};
