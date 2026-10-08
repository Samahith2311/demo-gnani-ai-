const API_BASE = '/api/v1';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchLanguages() {
  const res = await fetch(`${API_BASE}/languages`);
  return res.json();
}

export async function createConversation(data: {
  sourceLanguage: string;
  targetLanguage: string;
  saveTranscripts?: boolean;
}) {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create conversation');
  }
  return res.json();
}

export async function getConversation(idOrCode: string) {
  const res = await fetch(`${API_BASE}/conversations/${idOrCode}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Room not found');
  }
  return res.json();
}

export async function endConversation(id: string) {
  const res = await fetch(`${API_BASE}/conversations/${id}/end`, {
    method: 'POST',
  });
  return res.json();
}

export async function fetchHistory(query?: string) {
  const url = query ? `${API_BASE}/history?q=${encodeURIComponent(query)}` : `${API_BASE}/history`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchTranscript(id: string) {
  const res = await fetch(`${API_BASE}/history/${id}`);
  return res.json();
}

export async function deleteTranscript(id: string) {
  const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchApiKeys() {
  const res = await fetch(`${API_BASE}/developers/keys`);
  return res.json();
}

export async function createApiKey(name: string) {
  const res = await fetch(`${API_BASE}/developers/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function revokeApiKey(id: string) {
  const res = await fetch(`${API_BASE}/developers/keys/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchUsage() {
  const res = await fetch(`${API_BASE}/developers/usage`);
  return res.json();
}
