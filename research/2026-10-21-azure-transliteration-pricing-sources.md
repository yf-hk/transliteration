# Azure Translator transliteration: pricing and service limits

**Checked:** 2026-10-21  
**Scope:** Microsoft’s published Azure Translator transliteration billing, prices, quotas, request limits, latency, regional routing, and SLA. Prices below are public USD retail baselines; actual customer rates can differ by region, date, currency, agreement, or negotiated offer. No service was purchased and no performance benchmark was run.

## Pricing answer

Azure publishes **no separate transliteration price**. The [pricing page](https://azure.microsoft.com/en-us/pricing/details/translator/) lists Transliteration under the Standard Translation feature group. The [V3 billing description](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/how-to/migrate-to-v3) says `Transliterate` billing counts the characters submitted. Taken together, the best-supported interpretation is that standard transliteration uses the standard text-character meter; it is not billed per request or by output length. The sources do not show a distinct transliteration meter.

The public [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) currently returns this **Global USD** standard meter:

| Tier | Public retail price | Notes |
|---|---:|---|
| F0 | 2 million characters/month free | Transliteration is listed in the Standard Translation group. This is the free tier, not a separate transliteration allowance. |
| S1 pay-as-you-go | **$10 per 1 million characters** | Retail API meter `S1 Standard Characters`; unit `1M`; current record effective 2025-05-01. |
| S1 commitment, 250M/month | $2,055/month; $8.22 per 1M overage | 250M monthly commitment. |
| S1 commitment, 1B/month | $6,000/month; $6.00 per 1M overage | 1B monthly commitment. |
| S1 commitment, 4B/month | $22,000/month; $5.50 per 1M overage | 4B monthly commitment. |

The direct [retail-price query for S1 pay-as-you-go](https://prices.azure.com/api/retail/prices?%24filter=serviceName%20eq%20%27Foundry%20Tools%27%20and%20meterName%20eq%20%27S1%20Standard%20Characters%27%20and%20armRegionName%20eq%20%27Global%27) returns `Azure Translator` / `Foundry Tools` / `USD` / `$10` / `1M`. The [commitment-tier query](https://prices.azure.com/api/retail/prices?%24filter=serviceName%20eq%20%27Foundry%20Tools%27%20and%20productName%20eq%20%27Azure%20Translator%27%20and%20contains%28meterName%2C%20%27Commitment%20Tier%20Azure%27%29%20and%20armRegionName%20eq%20%27Global%27) returns the three monthly prices and corresponding per-million overage rates shown above. The current pricing page's fetched table shows `$-` in the per-character price cells and provides region/currency selectors; the public API makes the Global USD meters readable. Microsoft also says displayed estimates are not quotes and actual prices can vary by agreement, purchase date, and exchange rate.

The current pricing page says legacy S2/S3/S4 instance tiers are deprecated for standard translation and directs customers to S1 commitment tiers. It describes commitment tiers as discounts for customers who need consistently high standard-translation volume. Don't use old S2/S3/S4 price examples as the current public baseline.

## What Azure counts

The [Translator FAQ](https://learn.microsoft.com/en-us/azure/ai-services/translator/faq) says the billable input is the request's `Text`: letters, punctuation, whitespace, and markup inside that text field all count. JSON wrapper syntax does not. Repeated requests count again; response length, bytes, words, sentences, and request count do not determine character billing. The FAQ says Azure counts “every code point defined in Unicode as a character,” then explicitly says “surrogate pairs count as two characters.” The same FAQ includes `Transliterate` among the character-counted methods.

The V3 pricing-method table says `Transliterate` counts submitted characters. In contrast, for `Translate`, characters are multiplied by the number of target languages. Character detection and break-sentence operations are documented as no-charge, subject to a reasonableness restriction if their use exceeds other counted calls by 100×.

**Astral Unicode clarification:** Microsoft's [Unicode encoding documentation](https://learn.microsoft.com/en-us/dotnet/standard/base-types/character-encoding-introduction) explains that a UTF-16 surrogate pair “is interpreted as a supplementary code point.” So the Azure FAQ's general “code point” wording and its two-character surrogate-pair exception are inconsistent in Unicode terminology. The exception is the clearest billable instruction: treat a submitted surrogate pair representing an astral character as **two billable characters**. The likely underlying unit is UTF-16 code units, but that is an inference; the Azure billing FAQ does not explain the discrepancy or specify behavior for isolated/malformed surrogates.

## Request limits and throughput

**Per-element limit mismatch:** Microsoft's [V3 method reference](https://learn.microsoft.com/en-us/rest/api/translator/translator/transliterate?view=rest-translator-v3.0) says an element “cannot exceed 1,000 characters including spaces.” The [current 2026-06-06 method guide](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/2026-06-06/transliterate-api) and [container guide](https://learn.microsoft.com/en-us/azure/ai-services/translator/containers/transliterate-text-parameters) also say 1,000 per element, up to 10 elements and 5,000 total. But the [general service-limits table](https://learn.microsoft.com/en-us/azure/ai-services/translator/service-limits) lists `Transliterate | 5,000 | 10 | 5,000` for maximum element size, elements, and total request size. The general table was updated after the 2026 method guide, but neither page explains the discrepancy or scopes the 5,000 item limit by API version. Treat the backend's true per-element maximum as unresolved. For cross-version clients, cap each element at **1,000 characters** and the full request at **5,000** until Microsoft clarifies; this is the conservative limit supported by the method-specific docs.

None of these sources specifies a byte-size limit for the JSON body.

The same page lists subscription throughput limits and says concurrent requests are not capped. F0 is 2 million characters/hour and S1 is 40 million/hour. The hourly quota is a sliding-hour budget and should be consumed evenly; a burst that spends too much quota quickly can receive an out-of-quota response. The F0 monthly free allowance and F0 hourly throughput limit are separate constraints. The limits page also lists S2/C2, S3/C3, and S4/C4 quotas. Since the current pricing page deprecates S2/S3/S4 for standard translation, use those other quota rows only when they match the customer's actual SKU; S1 is the current public pay-as-you-go baseline for standard transliteration.

## Runtime, regions, and availability

Azure manages the runtime; Microsoft does not publish CPU or RAM per transliteration request. The service-limits page gives general Text Translator latency guidance: typically 150–300 ms for text under 100 characters, with a 15-second maximum for standard models. It does **not** give a transliteration-specific latency distribution or resource profile, so these figures are only a rough managed-service reference, not a benchmark target for a new implementation.

The [region-support guide](https://learn.microsoft.com/en-us/azure/ai-services/translator/region-support) says the standard NMT global endpoint routes to the closest available datacenter and can route outside the originating geography during a datacenter failure. Geography endpoints are available for the Americas, Asia Pacific, and Europe; Switzerland requires a resource-specific endpoint. Resource region and request processing location are different concepts. A deployment with residency requirements should select and verify its endpoint and region explicitly. Microsoft says text-submitted content is not persisted by Translator.

The current [Microsoft Online Services SLA index](https://azure.microsoft.com/en-us/support/legal/sla/cognitive-services/) links the October 2026 SLA, which says it forms part of a Microsoft volume licensing agreement. That document has an **Azure AI Translator** entry: downtime is a period when users cannot perform translations, and service credits are 25% below 99.9% uptime, 50% below 99%, and 100% below 95%. These are contractual service credits, not a promise of measured latency or uninterrupted service. The SLA’s applicable-period definition and a customer’s eligibility depend on the purchase agreement; check the terms attached to the actual subscription.

## What this says about beating Azure on price

For standard text transliteration, the public S1 reference is $10 per million input characters, with published commitment economics down to $5.50 per million at 4B/month. F0 already covers up to 2M characters/month at no charge. A private library or hosted service can beat the paid retail marginal rate only if its full cost per million is below the rate relevant to the customer’s actual volume and purchase terms. For a hosted API, that comparison must include serving compute, network, monitoring, redundancy, support, and the availability/data-residency expectations the customer needs.

Azure does not expose its per-request hardware cost, and this research contains no measured resource cost or throughput for this project. Therefore it establishes a price target and operational envelope, but does not prove that our implementation will undercut Azure or provide an equivalent managed-service guarantee.
