import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Copy,
  Check,
  Volume2,
  HelpCircle,
  PhoneOff,
  Share2,
  Sparkles,
  Wifi,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { useAudioPipeline } from '../hooks/useAudioPipeline';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { fetchLanguages, getConversation, endConversation } from '../services/api';

interface LiveRoomPageProps {
  initialRoomCode?: string;
  navigate: (page: string) => void;
}

interface MessageItem {
  id: string;
  speakerLabel: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  explanationText?: string;
  audioBase64?: string;
  latencyMs?: number;
  timestamp: string;
}

export const LiveRoomPage: React.FC<LiveRoomPageProps> = ({
  initialRoomCode,
  navigate,
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode || 'SJ-DEMO1');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'CONNECTED' | 'RECONNECTING' | 'ERROR'>('RECONNECTING');
  const [speechState, setSpeechState] = useState<'LISTENING' | 'PROCESSING' | 'TRANSLATING' | 'SPEAKING'>('LISTENING');
  const [latencyMs, setLatencyMs] = useState<number>(185);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [myLanguage, setMyLanguage] = useState('hi-IN');
  const [partnerLanguage, setPartnerLanguage] = useState('kn-IN');
  const [supportedLangs, setSupportedLangs] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isExplaining, setIsExplaining] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messageStreamEndRef = useRef<HTMLDivElement | null>(null);

  // Audio Pipeline hook
  const handleAudioSegmentReady = useCallback((audioBase64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'audio_frame',
          audioBase64,
          language: myLanguage,
        })
      );
    }
  }, [myLanguage]);

  const {
    hasPermission,
    permissionError,
    isMuted,
    isSpeaking,
    micLevel,
    isPlayingAudio,
    initializeMic,
    toggleMute,
    queueAudioForPlayback,
    playAudioDirectly,
  } = useAudioPipeline({
    onAudioSegmentReady: handleAudioSegmentReady,
  });

  // Load verified languages and lookup room
  useEffect(() => {
    fetchLanguages()
      .then((data) => {
        if (data.languages) setSupportedLangs(data.languages);
      })
      .catch(() => {});

    if (initialRoomCode) {
      getConversation(initialRoomCode)
        .then((data) => {
          if (data.room) {
            setRoomId(data.room.id);
            setRoomCode(data.room.roomCode);
            setMyLanguage(data.room.sourceLanguage || 'hi-IN');
            setPartnerLanguage(data.room.targetLanguage || 'kn-IN');
          }
        })
        .catch(() => {
          // If room lookup fails, use initial code
        });
    }
  }, [initialRoomCode]);

  // Connect to Realtime WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const targetCodeOrId = roomId || roomCode;
    const wsUrl = `${protocol}//${host}/api/v1/realtime/${targetCodeOrId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('CONNECTED');
      ws.send(
        JSON.stringify({
          type: 'join',
          participantLabel: 'You',
          assignedLanguage: myLanguage,
          isHost: true,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          setConnectionState('CONNECTED');
          if (data.roomId) setRoomId(data.roomId);
        } else if (data.type === 'speech_status') {
          if (['LISTENING', 'PROCESSING', 'TRANSLATING', 'SPEAKING'].includes(data.status)) {
            setSpeechState(data.status);
          }
        } else if (data.type === 'translation_complete') {
          const newItem: MessageItem = {
            id: data.messageId || Math.random().toString(),
            speakerLabel: data.speakerLabel || 'Speaker',
            sourceLanguage: data.sourceLanguage,
            targetLanguage: data.targetLanguage,
            originalText: data.originalText,
            translatedText: data.translatedText,
            audioBase64: data.audioBase64,
            latencyMs: data.latencyMs || 180,
            timestamp: data.timestamp || new Date().toISOString(),
          };

          setMessages((prev) => [...prev, newItem]);
          if (data.latencyMs) setLatencyMs(data.latencyMs);

          // Queue audio for sequential FIFO playback
          if (data.audioBase64) {
            queueAudioForPlayback(data.audioBase64, data.mimeType || 'audio/wav');
          }
        } else if (data.type === 'explanation_ready') {
          setMessages((prev) =>
            prev.map((m) =>
              m.originalText === data.originalText
                ? { ...m, explanationText: data.explanation }
                : m
            )
          );
          setIsExplaining(null);
          if (data.audioBase64) {
            playAudioDirectly(data.audioBase64, 'audio/wav');
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onerror = () => {
      setConnectionState('ERROR');
    };

    ws.onclose = () => {
      setConnectionState('RECONNECTING');
    };

    return () => {
      ws.close();
    };
  }, [roomCode, roomId, myLanguage, queueAudioForPlayback, playAudioDirectly]);

  // Auto-scroll message list
  useEffect(() => {
    messageStreamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEndRoom = async () => {
    if (roomId) {
      await endConversation(roomId).catch(() => {});
    }
    navigate('history');
  };

  const handleExplainSimply = (msg: MessageItem) => {
    setIsExplaining(msg.id);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'explain',
          text: msg.originalText,
          language: myLanguage,
        })
      );
    }
  };

  const handleCopyMessage = (msg: MessageItem) => {
    const textToCopy = `[${msg.sourceLanguage}] ${msg.originalText}\n[${msg.targetLanguage}] ${msg.translatedText}`;
    navigator.clipboard.writeText(textToCopy);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* TOP BAR */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Room Code:</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.05em',
                background: 'var(--bg-tertiary)',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              {roomCode}
            </span>
          </div>

          <button
            onClick={copyRoomCode}
            className="btn btn-sm btn-secondary"
            title="Copy Room Code"
          >
            {copiedCode ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* CONNECTION & LATENCY STATUS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className={`status-pill ${connectionState}`}
            title="Real-time WebSocket connection state"
          >
            <Wifi size={12} />
            <span>{connectionState}</span>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-tertiary)',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            Latency: <strong>{latencyMs}ms</strong>
          </div>

          <button
            onClick={handleEndRoom}
            className="btn btn-sm btn-danger"
          >
            <PhoneOff size={14} />
            <span>End Call</span>
          </button>
        </div>
      </div>

      {/* PERMISSION ERROR ALERT */}
      {permissionError && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: 'var(--accent-rose)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.9rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>{permissionError}</span>
        </div>
      )}

      {/* PARTICIPANTS STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Participant 1: YOU */}
        <div
          className="glass-panel"
          style={{
            padding: '18px',
            background: 'var(--bg-secondary)',
            border: isSpeaking ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            transition: 'border 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--brand-light)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                YOU
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>Your Microphone</div>
                <div style={{ fontSize: '0.75rem', color: isMuted ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                  {isMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Listening...'}
                </div>
              </div>
            </div>

            <div className={`status-pill ${speechState}`}>
              {speechState}
            </div>
          </div>

          {/* Language Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Globe size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Spoken Language:</span>
            <select
              value={myLanguage}
              onChange={(e) => setMyLanguage(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {supportedLangs.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Live Waveform Indicator */}
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '6px' }}>
            <WaveformVisualizer isActive={!isMuted && isSpeaking} level={micLevel} barCount={20} />
          </div>
        </div>

        {/* Participant 2: PARTNER */}
        <div
          className="glass-panel"
          style={{
            padding: '18px',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                P2
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>Conversation Partner</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isPlayingAudio ? 'Audio Playing...' : 'Connected'}
                </div>
              </div>
            </div>

            <div className="status-pill CONNECTED">
              READY
            </div>
          </div>

          {/* Language Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Globe size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Language:</span>
            <select
              value={partnerLanguage}
              onChange={(e) => setPartnerLanguage(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {supportedLangs.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Partner Audio Queue Indicator */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Audio Playback Queue:</span>
            <span style={{ fontWeight: 700, color: isPlayingAudio ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
              {isPlayingAudio ? 'Sequential Playback Active' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* CENTER: CONVERSATION STREAM */}
      <div
        className="glass-panel"
        style={{
          minHeight: '380px',
          maxHeight: '520px',
          overflowY: 'auto',
          padding: '24px',
          marginBottom: '24px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              maxWidth: '400px',
              color: 'var(--text-muted)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--brand-primary)',
              }}
            >
              <Mic size={24} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Conversation Room Ready
            </h4>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
              Click <strong>Enable Microphone</strong> below and begin speaking naturally. Speech will be transcribed,
              translated, and spoken aloud in real time.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{msg.speakerLabel}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--brand-light)',
                      color: 'var(--brand-primary)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {msg.sourceLanguage}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Original Utterance */}
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                "{msg.originalText}"
              </div>

              {/* Translation Arrow & Translated Text */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  borderLeft: '3px solid var(--brand-primary)',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--brand-primary)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {msg.targetLanguage} Translation
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  "{msg.translatedText}"
                </div>
              </div>

              {/* Plain Language Explanation (if requested) */}
              {msg.explanationText && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={16} color="var(--accent-emerald)" />
                  <span><strong>Plain Explanation:</strong> {msg.explanationText}</span>
                </div>
              )}

              {/* Utterance Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {msg.audioBase64 && (
                  <button
                    onClick={() => playAudioDirectly(msg.audioBase64!)}
                    className="btn btn-sm btn-secondary"
                    title="Play translated voice"
                  >
                    <Volume2 size={13} />
                    <span>Play Voice</span>
                  </button>
                )}

                <button
                  onClick={() => handleExplainSimply(msg)}
                  disabled={isExplaining === msg.id}
                  className="btn btn-sm btn-secondary"
                  title="Explain this phrase simply in plain terms"
                >
                  <HelpCircle size={13} />
                  <span>{isExplaining === msg.id ? 'Explaining...' : 'Explain Simply'}</span>
                </button>

                <button
                  onClick={() => handleCopyMessage(msg)}
                  className="btn btn-sm btn-secondary"
                  title="Copy transcription and translation"
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          ))
        )}
        <div ref={messageStreamEndRef} />
      </div>

      {/* BOTTOM CONVERSATION CONTROLS (Mobile-friendly One-Hand Bar) */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 24px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {!hasPermission ? (
          <button onClick={initializeMic} className="btn btn-primary btn-lg pulsing-mic">
            <Mic size={20} />
            <span>Enable Microphone to Speak</span>
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`btn btn-lg ${isMuted ? 'btn-danger' : 'btn-primary'}`}
              style={{ minWidth: '180px' }}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              <span>{isMuted ? 'Unmute Microphone' : 'Mute Microphone'}</span>
            </button>

            <button
              onClick={copyRoomCode}
              className="btn btn-secondary btn-lg"
            >
              <Share2 size={18} />
              <span>Share Invite</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
