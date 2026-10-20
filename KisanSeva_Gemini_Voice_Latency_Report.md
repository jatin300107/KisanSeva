# KisanSeva: Gemini Voice-Agent Latency Analysis

**Combined analysis of the original 88-call benchmark and 21 additional streaming records**

## Executive summary

The added streaming records show that the main user-experience issue is not the small gap between the first sentence and completion; it is the long wait before the first sentence arrives. For the 20 Gemini 3.5 Flash Lite streaming calls, median time to first sentence was **12.37 seconds** and median full-response time was **14.06 seconds**. A farmer using a live interview agent would experience these as long pauses.

The original 88-call benchmark had a median latency of **15.22 seconds** and P95 of **36.98 seconds**. The new streaming sample is a separate test set with different recorded timing fields, so its results should be compared cautiously rather than merged into one distribution.

### Headline findings

| Measure | Result | Interpretation |
|---|---|---|
| Original benchmark | 88 calls; median 15.22 s; P95 36.98 s | Slow tail latency in the initial test set. |
| New streaming sample — Gemini 3.5 Flash Lite | 20 calls; median total 14.06 s | Typical full response remains slow for live conversation. |
| Streaming first sentence — Gemini 3.5 Flash Lite | Median 12.37 s; P90 19.98 s | Streaming provides little practical benefit if the first sentence itself arrives late. |
| Repeated slowdown | Two consecutive turns: 45.87 s and 45.12 s | Investigate transient service/network/client issue or request path; short output alone does not explain it. |
| Gemini 3.8 Flash | One call: 232.31 s total | Insufficient data to judge model performance; inspect this record and repeat controlled tests. |

## 1. Scope and data

**Dataset A:** The uploaded `latency_log.jsonl` contains 88 records, all for `gemini-3.5-flash-lite`: 48 single-turn and 40 multi-turn calls, split evenly between low and high thinking (44 each). The file reports `latency_s` and no logged errors in these records.

**Dataset B:** The additional records contain 21 streaming calls: 20 for `gemini-3.5-flash-lite` across five four-turn conversations, plus one `gemini-3.8-flash` call. The streaming records include `first_event_s`, `first_text_s`, `first_sentence_s`, and `total_s`.

The new records were analyzed as supplied. This report does not assume that the original `latency_s` field and streaming `total_s` are perfectly equivalent measurements, and it does not combine their raw values into a single benchmark.

## 2. Original 88-call benchmark

| Metric | Result |
|---|---:|
| Calls | 88 |
| Mean latency | 17.88 s |
| Median latency | 15.22 s |
| P90 | 28.49 s |
| P95 | 36.98 s |
| P99 | 64.05 s |
| Minimum / maximum | 8.02 s / 78.64 s |

Single-turn calls (n=48) had a mean of **16.73 s** and median of **11.63 s**. Multi-turn calls (n=40) had a mean of **19.27 s** and median of **17.74 s**. This is an observed difference, not proof that conversation history alone causes slower responses.

High-thinking calls (n=44) had mean **19.44 s** and median **16.12 s**; low-thinking calls (n=44) had mean **16.33 s** and median **12.03 s**. Prompt mix and output lengths may differ, so this association should be confirmed with matched prompts.

## 3. Added streaming benchmark — Gemini 3.5 Flash Lite

The following statistics use only the 20 `gemini-3.5-flash-lite` streaming calls, excluding the single `gemini-3.8-flash` observation.

| Streaming timing field | Median | Mean | P90 | Minimum–maximum |
|---|---:|---:|---:|---:|
| First event | 11.44 s | 14.28 s | 17.27 s | 6.17–43.67 s |
| First text | 11.62 s | 14.45 s | 17.38 s | 6.29–43.77 s |
| First sentence | 11.62 s | 14.46 s | 17.38 s | 6.30–43.77 s |
| Full response | 14.06 s | 16.42 s | 18.76 s | 8.03–45.87 s |

The median gap between first sentence and full completion is **1.61 seconds** (mean gap **1.57 seconds**). This means the main delay is before the first sentence, not in finishing the rest of the short response. Streaming cannot make the experience feel responsive if the first usable text arrives after 12 seconds.

### First-turn vs subsequent turns

| Turn index | Calls | Median total | Mean total |
|---|---:|---:|---:|
| Turn 0 (first turn) | 5 | 14.53 s | 20.64 s |
| Turn 1 | 5 | 13.02 s | 21.37 s |
| Turn 2 | 5 | 13.80 s | 14.06 s |
| Turn 3 | 5 | 9.75 s | 10.47 s |

The turn-index pattern is descriptive only: there are five observations per index and prompts are not identical. Do not infer that turn 3 is inherently faster from this sample alone.

## 4. Notable outliers

### Two consecutive slow turns in conversation `1ffe24a2`

- Turn 0 took **45.868 s** total, with first-sentence time **43.770 s**.
- Turn 1 took **45.118 s** total, with first-sentence time **43.364 s**.
- Outputs were only 26 and 33 characters.
- Turns 2 and 3 then took **18.759 s** and **9.221 s**.

This within-conversation change is consistent with a transient slowdown or a different request/runtime condition, but the log fields do not identify the cause. Correlate these timestamps with provider request IDs, retries, timeouts, network conditions, prompt/history size, and concurrent requests.

### Single Gemini 3.8 Flash call

The only `gemini-3.8-flash` record has first event at **231.492 s**, first sentence at **231.796 s**, and total at **232.307 s**. One observation is not a fair model comparison. Check whether this was a cold start, queueing, timeout/retry behavior, a client timer issue, or a service-side delay; then repeat with several matched prompts.

## 5. What this means for KisanSeva

KisanSeva's voice agent asks follow-up questions about animal or crop health before producing a report. In that interaction, latency between the user's answer and the next spoken question is the key conversational metric. A **12-second median wait before the first sentence** will feel like a stalled conversation even if the full response finishes only about two seconds later.

These are API-stream timings. They do not necessarily include audio capture, speech-to-text, text-to-speech, playback startup, or the user's turn-taking delay. Measure end-to-end user-perceived latency separately.

## 6. Recommended next steps

1. **P0 — Instrument end-to-end timing.** Record timestamps for end of user speech, request sent, first stream event, first text token, first sentence ready, TTS start, and first audible audio. Report median, P90 and P95 per stage.
2. **P0 — Investigate the two 45-second turns.** Correlate them with provider request IDs, retries, timeouts, network conditions, prompt/history size, and concurrent requests. Re-run the same scenario several times.
3. **P1 — Optimize for short next-question generation.** Use a strict prompt contract: ask exactly one concise follow-up question, avoid explanations unless needed, and cap output tokens. Preserve safety-critical questions.
4. **P1 — Benchmark low vs high thinking fairly.** Use the same prompts and history, alternate the order, run repeated trials, and compare both latency and question quality. Do not choose low thinking solely from latency.
5. **P1 — Test prompt/history size.** Compare full history with a structured summary of prior answers while keeping the current question and relevant symptoms. Verify that diagnostic quality does not degrade.
6. **P2 — Compare models under controlled conditions.** Test Gemini 3.5 Flash Lite and Gemini 3.8 Flash on the same prompts, settings, region, concurrency, and timing method. Use enough repetitions to estimate P50/P90; do not decide based on one 232-second sample.
7. **P2 — Design for pauses.** If supported by the product design, use a short, non-misleading acknowledgement or visible progress indicator while waiting. Avoid fabricated spoken filler that could confuse farmers.

## 7. Conclusions and limitations

The data supports a clear engineering priority: **reduce time-to-first-sentence**. For the 20 Gemini 3.5 Flash Lite streaming calls, first-sentence median is **11.62 s** and P90 is **17.38 s**; this is too slow for a natural back-and-forth voice interview. The gap from first sentence to full completion is comparatively small, so optimizing only the final tail of generation is unlikely to solve the perceived delay.

The sample does not prove the cause of latency, establish a reliable winner between models, or establish production reliability. No logged errors appeared in the original 88-call file, and the 21 additional records show `error=null`, but this is not a full reliability test. Controlled repeat tests and end-to-end instrumentation are needed before attributing the delay to the model, prompt, network, or application.

## Appendix: streaming data summary

For the 20 Gemini 3.5 Flash Lite streaming calls:
- Full response: mean **16.42 s**, median **14.06 s**, P90 **18.76 s**, P95 **45.12 s**.
- First sentence: mean **14.46 s**, median **11.62 s**, P90 **17.38 s**.
- Median time from first sentence to full response: **1.61 s**.

The single Gemini 3.8 Flash record is reported separately and is not included in these statistics.

*Prepared from the uploaded `latency_log.jsonl` and the additional streaming records supplied in chat. Interpretations are limited to the recorded fields.*
