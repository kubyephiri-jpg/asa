import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import type { CallCredentials } from './callApi';
export * from './callApi';

export async function joinChannel(credentials: CallCredentials, onRemoteAudio?: (user: unknown) => void) {
  const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  let microphone: IMicrophoneAudioTrack | null = null;
  let microphonePublished = false;
  let micAvailable = false;
  let micError: string | null = null;
  const describeMicError = (error: unknown) => {
    const value = error as { name?: string; message?: string };
    const name = value?.name || 'Error';
    const message = value?.message || String(error);
    console.warn('[calls] microphone unavailable:', name, message);
    return `${name}: ${message}`;
  };
  const createMicrophone = async () => {
    try {
      microphone = await AgoraRTC.createMicrophoneAudioTrack();
      micError = null;
      return true;
    } catch (error) {
      micError = describeMicError(error);
      return false;
    }
  };
  const closeMicrophone = () => {
    const track = microphone as IMicrophoneAudioTrack | null;
    try { track?.close(); } catch {}
    microphone = null;
  };

  try {
    const playRemote = (user: any) => {
      try {
        const track = user?.audioTrack;
        if (!track) return;
        track.setVolume?.(100);
        Promise.resolve(track.play()).catch(() => undefined);
      } catch {
        // The remote track may be removed while a call is ending.
      }
    };
    const playAllRemote = () => client.remoteUsers.forEach(playRemote);
    // If the WebView blocked audio until a tap, start it on the next touch.
    (AgoraRTC as any).onAutoplayFailed = () => {
      const resume = () => { playAllRemote(); window.removeEventListener('touchstart', resume); window.removeEventListener('click', resume); };
      window.addEventListener('touchstart', resume, { once: true });
      window.addEventListener('click', resume, { once: true });
    };
    client.on('user-published', async (user, mediaType) => {
      try { await client.subscribe(user, mediaType); } catch (e) { console.warn('[calls] subscribe failed', e); return; }
      if (mediaType === 'audio') {
        playRemote(user);
        setTimeout(() => playRemote(user), 1000);
        onRemoteAudio?.(user);
      }
    });
    // Answering from the lock screen starts the call while the app is still hidden, which can give
    // a silent microphone. Rebuild the microphone as soon as the app is visible.
    const refreshMic = async () => {
      try {
        const current = microphone as IMicrophoneAudioTrack | null;
        if (!current || !microphonePublished) return;
        const raw = current.getMediaStreamTrack();
        if (raw.readyState === 'ended' || raw.muted) {
          await client.unpublish([current]).catch(() => undefined);
          try { current.close(); } catch {}
          microphone = await AgoraRTC.createMicrophoneAudioTrack();
          await client.publish([microphone]);
        }
      } catch (e) { console.warn('[calls] mic refresh failed', e); }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') { void refreshMic(); playAllRemote(); } };
    document.addEventListener('visibilitychange', onVisible);

    let microphoneCreated = await createMicrophone();
    if (!microphoneCreated) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      microphoneCreated = await createMicrophone();
    }

    await client.join(credentials.appId, credentials.channel, credentials.token || null, credentials.uid);
    if (microphoneCreated) {
      const track = microphone as IMicrophoneAudioTrack | null;
      if (track) {
        try {
          await client.publish([track]);
          microphonePublished = true;
          micAvailable = true;
        } catch (error) {
          micError = describeMicError(error);
          closeMicrophone();
        }
      }
    }

    for (const u of client.remoteUsers) {
      if (u.hasAudio) { try { await client.subscribe(u, 'audio'); playRemote(u); } catch {} }
    }
    setTimeout(() => { void refreshMic(); playAllRemote(); }, 1500);
    setTimeout(() => { void refreshMic(); playAllRemote(); }, 4000);

    return {
      get micAvailable() { return micAvailable; },
      get micError() { return micError; },
      leave: async () => {
        document.removeEventListener('visibilitychange', onVisible);
        closeMicrophone();
        await client.leave();
      },
      setMuted: async (muted: boolean) => {
        try {
          await microphone?.setEnabled(!muted);
        } catch (error) {
          micError = describeMicError(error);
          micAvailable = false;
        }
      },
      enableMicrophone: async () => {
        try {
          if (!microphone) microphone = await AgoraRTC.createMicrophoneAudioTrack();
          await microphone.setEnabled(true);
          if (!microphonePublished) {
            await client.publish([microphone]);
            microphonePublished = true;
          }
          micAvailable = true;
          micError = null;
          return true;
        } catch (error) {
          micError = describeMicError(error);
          closeMicrophone();
          microphonePublished = false;
          micAvailable = false;
          return false;
        }
      },
    };
  } catch (error) {
    closeMicrophone();
    await client.leave().catch(() => undefined);
    throw error;
  }
}
