# Transliteration service: runtime and economics

**Date:** 2026-10-21

**Status:** existing-engine measurements complete; neural-service costs are scenarios, not measurements.

## Measurement claim and limits

The local experiment measures the existing version 2.6.2 mapping engine's import overhead, title-length API cost, and loopback HTTP request cost. It does not measure a trained neural model, native-language correctness, Azure latency, or production cloud capacity.

The benchmark used the existing production bundle after comparing all 132 embedded source-map sources with the workspace source. Fixed expected-output checks and response validation confirm that conversion actually ran. Results include checksum/work counts, failures, five repetitions, median/range, and the host load. The load generator ran in a separate process from the server.

The host is shared with other work; unrelated processes will not be stopped. Short-input HTTP timings exclude internet RTT, TLS, authentication, durable metering, and multi-region operations. Repeated benchmark strings do not use an application result cache.

## What was measured

- Source revision: `e69bb1bba461c8e5cab0937f97e0ff602a931885`; package 2.6.2.
- Artifact: `dist/node/src/node/index.js`, with every source-map source matching the workspace.
- Host: Intel Xeon E5-2698 v4 at 2.20GHz, macOS, 64 reported logical CPUs, 128 GiB RAM. This engine uses a single JavaScript worker; the benchmark did not parallelize conversion across all cores.
- Node: v26.5.0. Reported 1/5/15-minute load before: 10.55/9.93/8.53; after: 9.74/9.79/8.51.
- Method: five fresh-process memory/import observations; five rotating-order warmed repetitions per language; five HTTP repetitions at each concurrency, with 1,000 requests per repetition.
- Fixtures: five title-length examples, with 32 numbered variants each. Latin 77, Chinese 42, Korean 46, Thai 70, Arabic 81 Unicode code points per input.
- Validation: 427,740 timed direct calls with output-length checksums, checksum 43,740,655 including warmup/calibration; 10,000 HTTP responses checked in full against expected outputs, zero failures. Contract checks establish current behavior, not linguistic correctness.

### Existing engine results

| Measurement | Median | Range across five observations |
|---|---:|---:|
| Import, with OS file cache uncontrolled | 65.1 ms | 53.8–79.3 ms |
| Additional heap after import and explicit GC | 3.04 MiB | 2.96–3.24 MiB |
| Total process RSS after import | 65.8 MiB | 65.3–66.2 MiB |
| Latin direct call | 5.37 µs | 5.10–8.32 µs |
| Chinese direct call | 12.53 µs | 11.29–16.44 µs |
| Korean direct call | 8.00 µs | 6.55–9.18 µs |
| Thai direct call | 11.88 µs | 11.19–13.11 µs |
| Arabic direct call | 14.18 µs | 11.46–19.62 µs |

The simple HTTP server ended at 93.4 MiB total RSS, an observation after all HTTP runs rather than a continuously sampled peak. A separate, non-reported CPU profiling run placed most conversion samples in `codeMapReplace`, `transliterate`, and regular expressions. The existing runtime is CPU/string-processing work; no GPU is used.

| Local HTTP configuration | Median observed requests/s | Range | Median run p95 latency | Range of run p95 |
|---|---:|---:|---:|---:|
| 1 outstanding request | 435 | 348–453 | 2.84 ms | 2.68–3.94 ms |
| 16 outstanding requests | 1,754 | 1,389–1,900 | 15.42 ms | 11.99–20.61 ms |

These are closed-loop loopback path observations, not maximum server capacity. Across both configurations, the client consumed 10.65 CPU-seconds and the server 4.07 CPU-seconds during 15.09 wall-seconds of HTTP measurements. Client/network scheduling materially limits this experiment; increasing conversion speed alone will not produce a proportional HTTP improvement. The measurements do not establish an internet latency SLO or a cloud instance's throughput.

The output remains the current mapping behavior. For example, `重庆银行` becomes `Chong Qing Yin Xing`, and unvowelled Arabic `كتب` becomes `ktb`. This inexpensive runtime does not establish context-sensitive Mandarin or readable Arabic pronunciation quality.

### Reproduction

From the repository root:

```sh
node research/benchmarks/service-baseline.mjs > research/benchmarks/service-baseline-results.json
```

The [harness](benchmarks/service-baseline.mjs) and [raw results](benchmarks/service-baseline-results.json) are saved together. The profiler ran separately; its timings were discarded. HTTP is intentionally a small measurement wrapper rather than production service code.

## Resources for a higher-quality engine

| Approach | Evidence or sizing arithmetic | Serving consequence |
|---|---|---|
| Current mappings/rules | Measured above: 3.04 MiB added heap, roughly 66 MiB imported Node process | CPU service; ordinary small VM is sufficient for an initial deployment of this engine |
| Small language-specific model | [g2pM](https://github.com/kakaobrain/g2pM) reports 477,228 parameters, 1.7 MB model, 2.1 MB package | A neural component can be tiny and CPU-friendly; this Mandarin polyphone model does not solve all four languages |
| Purpose-trained 5M–30M parameter model | INT8 raw weight arithmetic is about 5–30 MB, before scales/tokenizer/runtime; architecture and model size are proposals | First evaluate CPU inference with a supported ONNX export or CTranslate2 architecture; no measured latency here |
| General 0.6B LLM | Official [Qwen3-0.6B Q8 artifact](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/tree/main) is 639 MB on disk | Runtime needs weights, working memory, tokenizer, and KV cache; concurrency/context raise memory use. CPU inference is possible, GPU usefulness depends on measured load |

[ONNX Runtime](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html) supports INT8 inference and describes RNN/Transformer quantization choices. [CTranslate2](https://opennmt.net/CTranslate2/quantization.html) supports several reduced-precision formats, subject to architecture/backend compatibility. Neither makes every model exportable or guarantees faster inference after quantization; evaluate quality and the full request path.

For a CPU specialist prototype, two 2-vCPU/4-GiB replicas are a reasonable initial capacity experiment, not a measured requirement for four completed engines. For a 0.6B LLM prototype, reserve several GiB of runtime memory and measure it at the intended concurrency; the 639 MB artifact is not an RSS/VRAM estimate. Buying a 24 GB GPU for this model is a throughput choice, not a demonstrated minimum-memory requirement.

An autoregressive LLM's request time includes queueing, tokenization, prompt processing, sequential output generation, and postprocessing. For illustration only, 50 generated tokens at an assumed 100 tokens/s take 500 ms for generation alone. This is not a measured Qwen speed. Specialized aligned classifiers can avoid some sequential generation work. Generic LLM token throughput also does not directly reveal input characters/s across Chinese, Korean, Thai, and Arabic.

For an eventual LLM benchmark, report fully validated input characters/s and p50/p95/p99 completion latency under realistic arrival rates. A [llama-bench](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md) generation result excludes tokenization/sampling and cannot alone establish API economics. Batch/queue delays and cold starts belong in the service result.

## Azure price target

The separate [Azure source note](2026-10-21-azure-transliteration-pricing-sources.md) records the exact retail queries, billing evidence, request-limit inconsistencies, throughput quotas, and SLA scope.

As checked on 2026-10-21, the public Global USD S1 Standard Characters meter is **$10 per million submitted characters**. Transliteration is grouped under Standard Translation, with no distinct published transliteration price. F0 has 2M characters/month free. Monthly commitments are $2,055 for 250M, $6,000 for 1B, and $22,000 for 4B: effective rates at full use are $8.22, $6.00, and $5.50 per million. An unused commitment costs more per character actually processed. The F0 allowance should not automatically be subtracted from S1 billing. [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/translator/)

Azure's general Text Translator latency guidance is not a transliteration benchmark, and its hourly quota is not a measure of server hardware capacity. No requests to a paid Azure resource were made for this study.

## Can we charge less?

Yes, there is a credible path, especially with CPU specialists and shared demand. The current measurements do not prove comparable language quality or the complete hosted-service cost.

### Follow-up: the $100 budget is optional

The $100/month figure used below is an illustrative always-on deployment budget, not a required minimum bill. It should not be used as the default launch-cost assumption. Usage-based platforms can remove an idle CPU/GPU compute bill when configured to scale down; storage, metering, logs, networking, and other services can still cost money.

Prices and billing behavior checked 2026-10-21:

| Platform | Usage-based option | Fit and constraints |
|---|---|---|
| [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/) | Free: 100,000 requests/day, 10 ms CPU/request. Paid: $5/month minimum, including 10M requests and 30M CPU-ms; then $0.30/M requests and $0.02/M CPU-ms. | Candidate for current JavaScript engine; no deployment benchmark performed. [128 MB isolate memory limit](https://developers.cloudflare.com/workers/platform/limits/) constrains larger models. |
| [AWS Lambda Event Functions](https://aws.amazon.com/lambda/pricing/) | On-demand requests and allocated-memory duration; includes a monthly free tier of 1M requests and 400,000 GB-seconds. | Candidate for Node/Python and small CPU models. Provisioned concurrency and other AWS services can add costs. |
| [Google Cloud Run](https://cloud.google.com/run/pricing) | Request-based billing with minimum instances set to zero; idle non-minimum instances aren't charged. Monthly free allowances include 2M requests, 180,000 vCPU-seconds and 360,000 GiB-seconds at us-central1-based free-tier pricing. | Candidate for CPU model containers. Startup/shutdown are billable; time is rounded to 100 ms. Region, concurrency and free-tier sharing affect cost. |
| [Modal](https://modal.com/pricing) | Starter plan: $0 platform fee plus CPU/GPU/memory usage, with advertised monthly credits. Containers can scale to zero. | Candidate for custom models. Loading and post-request warm time are billable; default warm timeout is 60 seconds and is configurable. |
| [Runpod Serverless](https://docs.runpod.io/serverless/pricing) | Flex workers scale to zero and are billed per running second. | Candidate for GPU inference. Cold start and idle timeout (default 5 seconds) are billed; persistent storage adds costs. Serverless rates differ from the always-on Pod examples below. |

**Illustration for the existing lightweight JavaScript engine:** 100M input characters/month at 100 characters/request gives 1M requests. Assuming 3 ms average CPU/request gives 3M CPU-ms. Both fall within Cloudflare Workers Paid's $5 included usage, if the account allowances are otherwise unused. This is a conditional $5 Worker execution/subscription calculation, not a measured $5 complete product or a four-language NLP/LLM quote. A free deployment could also fit the daily request and per-invocation CPU limits; paid-plan accounting avoids assuming traffic is evenly distributed.

At the proposed $3/M selling price, that scenario produces $300 revenue and leaves $295 after the Worker charge, before database/metering, payment fees, support, development, taxes, and any model backend. Earlier fixed-budget break-even arithmetic does not describe this serverless scenario.

Recommended evaluation order: Workers for the current JavaScript engine; Cloud Run with request-based billing and zero minimum instances for CPU NLP containers; Modal/Runpod Flex for a model that actually benefits from a GPU. Measure cold starts, real language quality and the complete service bill before choosing. No deployment was created for this comparison.

Current public infrastructure examples:

- [DigitalOcean Basic](https://www.digitalocean.com/pricing/droplets): 2 vCPU, 4 GiB RAM, $24/month. Two replicas cost $48/month before load balancing, storage, metering, monitoring, and support. These are shared CPU plans; sustained production capacity needs measurement on the actual instance.
- [Runpod](https://www.runpod.io/pricing): RTX A5000 listed at $0.27/hour; RTX 4090 at $0.89/hour. At 720 running hours these are $194.40 and $640.80 per month. Regional availability, cloud offer, storage, and networking can change the bill. This is one instance; redundancy adds cost.

The following are **fixed-budget scenarios**, conditional on enough capacity for the traffic and latency target. They are not deployment quotes or predictions that one worker can serve every volume.

| Monthly input | Azure S1 pay-as-you-go | Hypothetical $100/month CPU service budget, per 1M | One always-on RTX 4090 compute only, per 1M |
|---|---:|---:|---:|
| 10M characters | $100 total / $10 per 1M | $10.00 | $64.08 |
| 100M characters | $1,000 total / $10 per 1M | $1.00 | $6.41 |
| 1B characters | $10,000 total / $10 per 1M | $0.10 | $0.64 |

At 1B/month Azure's published $6,000 commitment is a more relevant alternative for a committed customer. Always compare against the customer's actual tier. The CPU budget is an analyst-selected $100 placeholder, not a priced bill of materials; it excludes engineering/support and may need to grow with model workload, bursts, or availability requirements. The GPU column excludes frontend infrastructure, redundancy, operations, and model development.

For a business selling at **$3 per million**, 100M/month produces $300 revenue. If total direct serving cost really stayed at $100, the remaining $200 is a 66.7% gross margin before engineering, sales, support, and taxes. A $100 fixed budget needs 33.3M/month merely to cover that budget, or 111.1M/month for a 70% serving gross margin. A single $640.80/month GPU cannot support the same $3 price profitably at 100M/month even before other costs. A cheaper CPU or GPU instance can change this; benchmark it first.

For self-hosting, a $100 monthly budget breaks even with $10/M Azure at 10M/month, or $5.50/M at 18.2M/month, ignoring variable costs and equivalent-service requirements. A low-volume user within Azure's free allowance cannot be undercut on price by a paid API.

### Capacity and cost formulas

Let `q` be measured sustainable input characters/s while serving, `u` the billed-time fraction spent doing that work, and `r` the instance price/hour:

```text
compute dollars per million input characters = r × 1,000,000 / (3,600 × q × u)
```

If `q` already represents an average over all billed time, set `u = 1`; do not count idle time twice. Add per-character variable charges and divide all other monthly costs by monthly millions processed. Reserve capacity for peak traffic, failures, and latency headroom rather than sizing only to the monthly average.

At 100M/month over 30 days the average is just 38.6 characters/s, but a 100× burst reaches 3,858 characters/s. A slow sequential model or a strict queueing target can require more workers despite low average utilization. Aggregate customer demand, bounded batching, and caching can improve economics; cache hit rates are workload-specific and were not used in the local benchmark.

## Suggested service design

```text
Client
  -> API: auth, request limits, explicit language/profile, usage accounting
  -> versioned result cache
  -> language router
       -> CPU rules and small contextual models
       -> bounded inference queue -> optional resident neural worker
  -> response with profile/model version and request ID
```

1. **Define the contract first.** Offer explicit language, source/target script, romanization profile, tone/diacritic mode, punctuation/spacing behavior, and optional name overrides. Chinese, Korean, Thai, and Arabic need different linguistic pipelines. Arabic spelling transliteration and inferred-vowel pronunciation should be distinct profiles. Language should be explicit where Han characters can have several readings.
2. **Use CPU rules and specialists as the default.** Evaluate Chinese polyphone disambiguation, Korean contextual sound rules, Thai segmentation/pronunciation, and Arabic normalization/optional diacritization separately. Preserve the light synchronous npm engine; expose context models through optional packages or the hosted API. A generic LLM is a candidate fallback or offline teacher, subject to evaluation.
3. **Keep models resident.** A Node/Fastify or equivalent API can call local ONNX models or long-lived Python/native workers. Batch only within a latency budget, bucket input lengths, cap output length and queue depth, and avoid starting Python/loading weights per request. An eventual GPU queue should be separate from CPU API workers.
4. **Version output behavior.** Include language, romanization standard, model/data revision, options, and full input in cache keys. Permit clients to pin a version so a model rollout does not silently change persistent slugs. Return measured confidence only if it has been calibrated.
5. **Build the hosted product.** Use per-tenant keys/quotas, atomic durable metering, explicit retry/idempotency policy, timeouts and backpressure, health checks, and at least two replicas for a production availability target. Define the billable character unit precisely, including supplementary Unicode. Keep user text out of routine logs and apply retention rules to caches.
6. **Qualify before selling an Azure alternative.** Compare against the same romanization profile on a native-reviewed held-out corpus: names, polyphones, unvowelled Arabic, Thai ambiguity, mixed scripts, long strings, punctuation, and malformed input. Then run end-to-end load tests on intended cloud instances with real input-length/language distributions and realistic open-loop arrivals, including failures and peak bursts. Measure cost per million at the required p95/p99 latency and availability target.

## Recommendation

Build the first service around CPU specialists and a stable, versioned API. Establish language quality and measured unit economics before introducing a generic LLM to the request path. A $2–$3 per million price is a plausible target to investigate at sufficient shared volume; it is not yet a validated offer. The strongest advantage can include reproducible outputs, selectable romanization, and application-specific overrides as well as price.

No production implementation, model training/download, paid cloud deployment, or Azure comparison benchmark was performed. Research artifacts and the local benchmark harness/results are the only repository additions for this runtime study.
