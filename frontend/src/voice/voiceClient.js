const WORKLET_URL = "/pcm16-worklet.js";

export function createVoiceClient({
  apiBase = "",
  getAccessToken,
  category,                 // "animal" | "crop"
  language = "hi-IN",
  onState = () => {},       // idle | connecting | agent_speaking | listening | thinking | done | error
  onEvent = () => {},       // every server JSON event, plus {type:"client_error", code, message}
  onLevel = () => {},       // 0..1 mic level, only while listening
}) {
  let ws = null, ctx = null, stream = null, node = null;
  let muted = true, playHead = 0, carry = null, finished = false, state = "idle";
  let connectionTimer = null;

  const setState = (s) => { state = s; onState(s); };

  function cleanup() {
    if (connectionTimer) {
      clearTimeout(connectionTimer);
      connectionTimer = null;
    }
    try { if (ws && ws.readyState <= 1) ws.close(); } catch {}
    try { if (node) node.disconnect(); } catch {}
    try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch {}
    try { if (ctx && ctx.state !== "closed") ctx.close(); } catch {}
  }

  function fail(code, message) {
    if (finished) return;
    finished = true;
    setState("error");
    onEvent({ type: "client_error", code, message });
    cleanup();
  }

  function playPcm(buf) {
    // a chunk can end mid sample, so carry a stray byte into the next chunk
    let bytes = new Uint8Array(buf);
    if (carry !== null) {
      const m = new Uint8Array(bytes.length + 1);
      m[0] = carry; m.set(bytes, 1); bytes = m; carry = null;
    }
    if (bytes.length % 2) { carry = bytes[bytes.length - 1]; bytes = bytes.slice(0, -1); }
    if (!bytes.length) return;

    const i16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;

    const ab = ctx.createBuffer(1, f32.length, 16000);
    ab.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = ab;
    src.connect(ctx.destination);
    playHead = Math.max(playHead, ctx.currentTime + 0.05);
    src.start(playHead);
    playHead += ab.duration;
  }

  function afterPlayback() {
    // the server has sent all audio for this turn; wait until the speaker is really done
    const remainingMs = Math.max(0, (playHead - ctx.currentTime) * 1000);
    const latencyMs = (ctx.outputLatency || 0) * 1000;
    setTimeout(() => {
      if (finished || !ws || ws.readyState !== 1) return;
      playHead = 0;
      ws.send(JSON.stringify({ type: "playback_done" }));
      muted = false;
      setState("listening");
    }, remainingMs + latencyMs + 80);
  }

  function handleEvent(ev) {
    if (ev.type === "tts_end") afterPlayback();
    else if (ev.type === "transcript") { muted = true; setState("thinking"); }
    else if (ev.type === "error") setState("error");
    else if (ev.type === "done") { finished = true; setState("done"); }
    onEvent(ev);
    if (ev.type === "done") setTimeout(cleanup, 300);
  }

  async function start() {
    setState("connecting");
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();           // created synchronously inside the user's tap
    ctx.resume();

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) { return fail("mic_denied", e.message); }

    try { await ctx.audioWorklet.addModule(WORKLET_URL); }
    catch (e) { return fail("audio_init", e.message); }

    try {
      const src = ctx.createMediaStreamSource(stream);
      node = new AudioWorkletNode(ctx, "pcm16");
      node.port.onmessage = (e) => {
        if (muted || !ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(e.data);
        const a = new Int16Array(e.data);
        let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i]);
        onLevel(Math.min(1, s / a.length / 6000));
      };
      const sink = ctx.createGain();
      sink.gain.value = 0;
      src.connect(node);
      node.connect(sink);
      sink.connect(ctx.destination);
    } catch (e) {
      return fail("audio_init", e.message);
    }

    let info;
    try {
      const r = await fetch(`${apiBase}/voice/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({ category, language }),
      });
      if (!r.ok) throw new Error(`start failed: ${r.status}`);
      info = await r.json();
    } catch (e) { return fail("start_failed", e.message); }

    // the ws_token is single use and expires in about 60 s, so connect immediately, never retry with it
    const url = new URL(info.ws_path, apiBase || window.location.origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", info.ws_token);
    ws = new WebSocket(url.toString());
    ws.binaryType = "arraybuffer";

    ws.onmessage = (e) => {
      if (typeof e.data !== "string") {
        muted = true;
        if (state !== "agent_speaking") setState("agent_speaking");
        playPcm(e.data);
        return;
      }
      let ev; try { ev = JSON.parse(e.data); } catch { return; }
      handleEvent(ev);
    };
    await new Promise((resolve, reject) => {
      let opened = false;
      connectionTimer = setTimeout(() => {
        reject(new Error("voice WebSocket connection timed out"));
      }, 10000);
      ws.onopen = () => {
        opened = true;
        clearTimeout(connectionTimer);
        connectionTimer = null;
        resolve();
      };
      ws.onerror = () => {
        if (!opened) reject(new Error("voice WebSocket connection failed"));
      };
      ws.onclose = (e) => {
        if (!opened) {
          reject(new Error(`voice WebSocket closed before opening (${e.code})`));
        } else if (!finished) {
          fail("connection_lost", `socket closed (${e.code})`);
        }
      };
    }).catch((e) => {
      fail("connection_failed", e.message);
    });
  }

  function stop() {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "end" }));
    finished = true;
    cleanup();
    setState("idle");
  }

  function sendEndOfSpeech() {   // reserved for tap to send, the backend ignores it for now
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "end_of_speech" }));
  }

  return { start, stop, sendEndOfSpeech };
}
