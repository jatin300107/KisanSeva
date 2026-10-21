import base64
import json
import os
import pathlib
import time
import wave

import httpx

URL = "https://api.vachana.ai/api/v1/tts/sse"
API_KEY = os.environ["GNANI_API_KEY"]
ENV = os.environ.get("TEST_ENV", "local")
LOG = "tts_log.jsonl"
OUT = pathlib.Path("tts_out")
OUT.mkdir(exist_ok=True)

RUNS = 3
SAMPLE_RATE = 16000
TIMEOUT = httpx.Timeout(20.0, connect=10.0)  # 20 s max wait between events

# raw container = headerless 16-bit mono PCM, so audio length can be computed
AUDIO_CONFIG = {
    "sample_rate": SAMPLE_RATE,
    "num_channels": 1,
    "sample_width": 2,
    "encoding": "linear_pcm",
    "container": "raw",
}

CONFIGS = [
    {"model": "timbre-v2.5", "voice": "Nalini", "language": "hi-IN", "speed": 1.0},
    {"model": "timbre-v2.5", "voice": "Nalini", "language": "hi-IN", "speed": 0.85},
    {"model": "timbre-v2.5", "voice": "Deepak", "language": "hi-IN", "speed": 1.0},
    {"model": "timbre-v3.0", "voice": "Shivani", "language": "hi-IN", "speed": 1.0},
    {"model": "timbre-v3.0", "voice": "Avinash", "language": "hi-IN", "speed": 1.0},
]

QUESTIONS = {
    "q01": "किस प्रकार का पशु प्रभावित हुआ है?",
    "q02": "पशु की उम्र कितनी है?",
    "q03": "पशु में कौन-कौन से लक्षण दिखाई दे रहे हैं?",
    "q04": "ये लक्षण पहली बार कब दिखाई दिए थे?",
    "q05": "क्या पशु सामान्य रूप से खा-पी रहा है?",
    "q06": "क्या हाल ही में पशु का वजन कम हुआ है?",
    "q07": "क्या पशु में बुखार के लक्षण हैं? (जैसे त्वचा गर्म होना, कांपना)",
    "q07b": "क्या पशु में बुखार के लक्षण हैं? जैसे त्वचा गर्म होना, कांपना।",
    "q08": "क्या झुंड या बाड़े के अन्य पशुओं में भी ऐसे ही लक्षण दिख रहे हैं?",
    "q09": "क्या हाल ही में पशु का टीकाकरण (वैक्सीनेशन) हुआ है?",
    "q09b": "क्या हाल ही में पशु का टीकाकरण यानी वैक्सीनेशन हुआ है?",
    "q10": "क्या पशु के गोबर या मूत्र में कोई बदलाव दिखा है?",
    "q11": "क्या पशु गर्भवती है या हाल ही में बच्चा दिया है?",
    "q12": "क्या यह पशु हाल ही में किसी नए पशु के संपर्क में आया है?",
}


def synth(client, cfg, text):
    body = {"text": text, "audio_config": AUDIO_CONFIG, **cfg}
    headers = {"X-API-Key-ID": API_KEY, "Content-Type": "application/json"}
    t0 = time.perf_counter()
    chunks, first, done, err = [], None, None, None
    event = None
    try:
        with client.stream("POST", URL, json=body, headers=headers) as resp:
            if resp.status_code != 200:
                err = f"http_{resp.status_code}: {resp.read().decode('utf-8', 'replace')[:200]}"
            else:
                for line in resp.iter_lines():
                    now = time.perf_counter() - t0
                    if line.startswith("event:"):
                        event = line[6:].strip()
                    elif line.startswith("data:"):
                        try:
                            data = json.loads(line[5:].strip())
                        except json.JSONDecodeError:
                            err = "bad_json"
                            break
                        if event == "chunk":
                            if data.get("audio"):
                                if first is None:
                                    first = now
                                chunks.append(base64.b64decode(data["audio"]))
                        elif event == "complete":
                            done = now
                            break
                        elif event == "error":
                            err = "sse_error: " + str(data)[:200]
                            break
    except httpx.TimeoutException:
        err = "timeout"
    except httpx.HTTPError as e:
        err = f"http_error: {type(e).__name__}"

    if err is None and first is None:
        err = "no_audio"
    if err is None and done is None:
        err = "no_complete_event"

    audio = b"".join(chunks)
    audio_s = round(len(audio) / (2 * SAMPLE_RATE), 3) if audio else None
    total_s = round(done, 3) if done else None
    return {
        "first_byte_s": round(first, 3) if first is not None else None,
        "total_s": total_s,
        "n_chunks": len(chunks),
        "bytes": len(audio),
        "audio_s": audio_s,
        "rtf": round(total_s / audio_s, 3) if (audio_s and total_s) else None,
        "err": err,
        "audio": audio,
    }


def save_wav(path, pcm):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)


def record(mode, cfg, qid, run, r):
    audio = r.pop("audio")
    row = {"ts": time.time(), "env": ENV, "mode": mode, "qid": qid, "run": run, **cfg, **r}
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    if run == 0 and audio:
        name = f"{mode}_{cfg['model']}_{cfg['voice']}_s{cfg['speed']}_{qid}.wav"
        save_wav(OUT / name, audio)
    print(mode, cfg["model"], cfg["voice"], cfg["speed"], qid, run,
          "fb", row["first_byte_s"], "total", row["total_s"], "err", row["err"])


def smoke():
    """One request, prints the raw stream so you can check the format."""
    cfg = CONFIGS[0]
    body = {"text": QUESTIONS["q01"], "audio_config": AUDIO_CONFIG, **cfg}
    headers = {"X-API-Key-ID": API_KEY, "Content-Type": "application/json"}
    with httpx.Client(timeout=TIMEOUT) as client:
        with client.stream("POST", URL, json=body, headers=headers) as resp:
            print("status", resp.status_code)
            if resp.status_code != 200:
                print(resp.read().decode("utf-8", "replace"))
                return
            for line in resp.iter_lines():
                print(line[:120])


def main():
    for cfg in CONFIGS:
        # warm: one connection reused, plus one throwaway request to open it
        with httpx.Client(timeout=TIMEOUT) as client:
            synth(client, cfg, "नमस्ते")
            for run in range(RUNS):
                for qid, text in QUESTIONS.items():
                    record("warm", cfg, qid, run, synth(client, cfg, text))

        # cold: new connection per request, so TLS setup is included
        for run in range(RUNS):
            for qid, text in QUESTIONS.items():
                with httpx.Client(timeout=TIMEOUT) as client:
                    record("cold", cfg, qid, run, synth(client, cfg, text))


if __name__ == "__main__":
    if os.environ.get("SMOKE"):
        smoke()
    else:
        main()