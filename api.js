export async function sendRoomEvent(roomId, payload) {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Send failed: ${response.status}`);
  }
}

export async function requestHostKey(roomId, password) {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/host-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Could not create host key');
  }

  return body.hostKey;
}

export async function validateHostKey(hostKey, password) {
  const response = await fetch('/api/host-key/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostKey, password })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Could not validate host key');
  }

  return body.roomId;
}

export async function closeRoom(roomId) {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Could not close room');
  }
}

export function createRoomEventSource(roomId) {
  return new EventSource(`/api/rooms/${encodeURIComponent(roomId)}/events`);
}

export async function sendKeepAlive(roomId) {
  const now = Date.now();
  return fetch(`/api/rooms/${encodeURIComponent(roomId)}/keepalive?t=${now}`, {
    cache: 'no-store',
    keepalive: true
  });
}

export async function uploadPhoto(roomId, sender, image) {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender, image })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Upload failed');
  }
}

export async function fetchPhoto(roomId, sender) {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/photo?sender=${sender}`);
  if (!response.ok) throw new Error('Photo not available or expired');
  return response.blob();
}
