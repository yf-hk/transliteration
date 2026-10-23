# Training compact multilingual romanization models

**Research date:** 2026-10-21  
**Scope:** training approach, practical hardware, and primary data sources for Mandarin Chinese, Korean, Thai, and Arabic. Source labels, context coverage, and visible terms are distinguished below. No model/dataset downloads, installation, paid compute, or training runs were performed.

## Summary

This review did not locate a single ready-made, clean, permissively licensed sentence-to-standard-romanization corpus across these four languages. The best direct supervision located is Thai2Rom Thai-text-to-Roman data and Arabic bibliographic-entry-to-ALA-LC data. Mandarin has a sentence-context benchmark that labels one selected polyphonic character at a time; its broader Pinyin sources are character or phrase lexicons. No sizable Korean-to-Revised-Romanization aligned corpus was located. Korean and Thai IPA/G2P sets, and Arabic diacritization corpora, can inform pronunciation but are not gold romanization labels.

The practical first experiment is supervised fine-tuning of an existing compact multilingual model, such as Qwen3-0.6B, using LoRA or QLoRA. General multilingual pretraining from scratch is a much larger project. Data quality and consistent target conventions are the main unknowns here.

| Language | Direct romanization labels found | Useful but different target | Main limitation |
|---|---|---|---|
| Mandarin | g2pM/CPP selected-character readings; phrase Pinyin lexicons | Character Pinyin readings | CPP labels only one polyphonic character per sentence; lexicons do not resolve full sentence context. |
| Korean | No broad open RR corpus found | Korean G2P and WikiPron/SIGMORPHON IPA | Phonetic output and IPA cannot be treated as Revised Romanization. |
| Thai | Thai2Rom CSV, Thai text to Roman | Thai G2P/WikiPron IPA | Thai2Rom does not name a formal target standard or establish sentence-context coverage. |
| Arabic | CAMeL ALA-LC paired bibliographic entries | Tashkeela and CAMeL diacritization resources | Diacritization is an intermediate pronunciation task; ALA-LC data has catalog-domain and rights-review limits. |

## Training workflow

1. **Freeze the output contract.** Choose one named convention per language: Mandarin Pinyin with explicit tone/ü/word-spacing policy, Korean RR, Thai RTGS, and a chosen Arabic scheme. Include the language and scheme in every input. Keep final URL punctuation/case cleanup deterministic.
2. **Build input/output pairs.** Use original words, phrases, or sentences with the correct romanized output. Retain provenance, scheme, source ID, and review status in the training manifest. Word lexicons provide basic coverage; contextual sentences are needed for ambiguous readings.
3. **Prepare an independent evaluation set first.** Split by word/phrase/name families before generating variants. Deduplicate across splits. Keep a fluent-reviewed set of unseen names, compounds, mixed scripts, digits, punctuation, and known ambiguity cases. A model that reproduces a teacher's labels has not independently proved language correctness.
4. **Measure the pretrained baseline.** Determine whether prompting alone already meets the selected use case. If it fails, train a supervised adapter. A starting pilot budget could be 10,000–50,000 clean examples per language where suitable pairs are available; this is a proposed experiment size, not a claim that this amount produces broad accuracy.
5. **Fine-tune only the output task.** Hugging Face [TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer) supports Qwen3-0.6B, prompt/completion datasets, and completion-only loss. [PEFT/QLoRA](https://huggingface.co/docs/peft/developer_guides/quantization) freezes a quantized base model while training small added adapter weights. Initial settings to evaluate include LoRA rank 16 or 32, short sequences around 256–512 tokens, small batches with gradient accumulation, and a learning rate around 1e-4. These settings are starting hypotheses, not tuned results.
6. **Evaluate each language separately.** Measure exact match, character edit error, accuracy on the intended ambiguous readings, and content preservation. Check for added commentary, unwanted translation, deleted names, and missing numerals. Report unseen-input results separately from examples already represented in lexicons.
7. **Compress after quality is established.** Re-evaluate after quantization. If the download target is only a few megabytes, try distillation into a small character/byte-level encoder-decoder, following the general approach demonstrated by [CharsiuG2P](https://github.com/lingjzhu/CharsiuG2P). That project predicts pronunciation and requires tokenized words, so its output is not already a complete four-language romanization pipeline.

Example of the proposed prompt/completion format, under an explicitly selected toneless Mandarin convention:

```json
{"prompt":"Romanize Mandarin as lowercase Pinyin, without tones, with word spaces. Output only the result.\n重庆银行","completion":"chongqing yinhang"}
```

Teacher-generated labels can expand coverage, but need sampling and fluent review. Training on the current library's output alone would preserve its existing mapping errors. Existing source dictionaries can be training inputs without becoming runtime lookup files; their source conditions still need to be tracked.

**LoRA reduces training work, not the base model size.** Deployment still needs the base model and adapter, or a merged equivalent. A 0.6B model remains a substantial download. A proposed 5–30M-parameter student would have roughly 5–30 MB of raw int8 weights before runtime/format overhead; that is parameter-count arithmetic, not a measured artifact or a guarantee that such a student retains sufficient accuracy.

## Hardware and cost

The following are conservative planning targets for short sequences and small batches. They are not measured minima or benchmark results.

| Experiment | Practical initial hardware target | Main caveat |
|---|---|---|
| Fine-tune a 0.6B model with LoRA/QLoRA | One NVIDIA GPU with 16–24 GB VRAM | Smaller GPUs may work with shorter sequences/checkpointing; actual memory depends on the configuration. |
| Train a small character/byte-level student | One NVIDIA GPU with roughly 8–16 GB VRAM | Feasibility and quality depend on architecture, sequence length, batch size, and training data. |
| Data preparation and small diagnostic runs | Ordinary CPU machine with adequate RAM | CPU-only LLM training is possible but is not the practical starting recommendation here. |
| Pretrain a general multilingual LLM | Substantially more data and compute | Outside the proposed experiment. |

The memory-saving mechanism is documented in [Hugging Face PEFT](https://huggingface.co/docs/peft/developer_guides/quantization); the exact targets above are my engineering estimates. Measure a short run before committing to a full training budget.

For a concrete rental example, [Runpod's published pricing](https://www.runpod.io/pricing), checked 2026-10-21, lists RTX 4090 24 GB at **USD 0.89/hour**. A hypothetical 20 GPU-hours at that rate costs **USD 17.80 for compute**, plus applicable storage/other charges. This is a cost illustration; no evidence here establishes that the model will finish training in 20 hours. Availability and the chosen rental configuration can change the price.

**Current local host:** read-only hardware inspection reports Intel Xeon, 128 GiB system RAM, and AMD Radeon RX 6800 XT with 16 GB VRAM. This is suitable for preparation and CPU experiments. The latest [Apple PyTorch MPS setup](https://developer.apple.com/metal/pytorch/) requires Apple silicon; the current [bitsandbytes compatibility list](https://huggingface.co/docs/transformers/quantization/bitsandbytes) lists NVIDIA, Intel accelerators, and CPU rather than this AMD/macOS combination. A rented NVIDIA environment is the simpler route for the proposed QLoRA pilot. This does not claim that no alternative or older AMD/Metal training stack can work.

## Candidate sources

### Mandarin Chinese

- **g2pM / CPP — closest to contextual training data.** The [official repository](https://github.com/kakaobrain/g2pM) stores sentence files paired with a label for a marked polyphonic character. Its README says that where a sentence contains several polyphones, only one is randomly selected and annotated. The accompanying [Interspeech paper](https://www.isca-archive.org/interspeech_2020/park20c_interspeech.pdf) describes a 99,000-plus sentence polyphone-disambiguation benchmark. This is useful for learning contextual character readings, but it does not directly supply a complete sentence-to-Pinyin target for every character. The repo exposes an Apache-2.0 license; its cited dataset description does not establish a separate license for every upstream text/dictionary source, so review data provenance before repackaging it.
- **pinyin-data — character readings.** [mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data) maps code points to one or more Pinyin readings. It draws from Unihan fields including `kHanyuPinyin`, `kXHC1983`, `kHanyuPinlu`, and `kMandarin`; the README describes `kMandarin` as one common Mandarin reading. This is a character lexicon, not context-labeled text. The repository advertises MIT, while [Unicode's terms](https://www.unicode.org/policies/licensing_policy.html) separately govern Unihan data.
- **phrase-pinyin-data and CC-CEDICT — phrase candidates.** [phrase-pinyin-data](https://github.com/mozillazg/phrase-pinyin-data) stores phrase → per-character Pinyin rows and permits more than one reading for a phrase. Its README lists manual corrections, Zdic dictionaries, and CC-CEDICT as sources. [CC-CEDICT's own license page](https://cc-cedict.org/editor/editor.php?handler=Download) identifies CC BY-SA 4.0; that obligation should be tracked separately from the phrase repository's MIT notice. These sources can seed a phrase lexicon, but dictionary entries are not sentence-level labels and do not resolve unseen words or names by themselves.

### Korean

- **NIKL Revised Romanization — rules and conformance examples, not a training set.** The [National Institute of Korean Language guide](https://www.korean.go.kr/front_eng/roman/roman_01.do) says RR is based on standard Korean pronunciation. Its examples cover sound changes, while its naming guidance distinguishes personal names and says family-name transcriptions are established separately. The official guide is suitable for defining targets and building a small conformance set; it is not a large aligned corpus.
- **g2pK — contextual pronunciation, not Romanization.** [g2pK](https://github.com/Kyubyong/g2pK) outputs Hangul rewritten as pronounced. Its README says it uses MeCab morphological analysis to distinguish context-sensitive readings, and it exposes a prescriptive/descriptive pronunciation choice. This illustrates why Korean pronunciation can require context, but its output alphabet is Korean, not RR.
- **WikiPron and SIGMORPHON — IPA, not RR.** [WikiPron](https://github.com/CUNY-CL/wikipron) mines word → IPA pronunciation pairs from Wiktionary and explicitly says its scraped data has licensing terms separate from the Apache-2.0 code. The [SIGMORPHON 2021 G2P task](https://github.com/sigmorphon/2021-task1) includes Korean among its medium-resource languages; examples are word → roughly phonemic IPA sequences and the data is CC BY-SA 3.0 inherited from Wiktionary. These are useful pronunciation resources, but using them to train RR would require a reliable IPA-to-RR conversion and would not reproduce RR's spelling/name conventions. No large, open Korean → RR pair corpus was identified in this pass.

### Thai

- **Thai2Rom — direct Thai-text-to-Roman pairs.** PyThaiNLP's [model card](https://pythainlp.org/Model-Cards/transliteration/) links the training dataset and notebook, describes Thai-text-to-Roman output, and declares CC0. The [PyThaiNLP corpus catalog](https://github.com/PyThaiNLP/pythainlp-corpus/blob/master/db.json) independently lists `thai2rom-dataset` as CC0-1.0 and links the CSV. This is the most directly usable Thai parallel source found. The model card does not name a formal romanization standard, document dialect normalization, or establish sentence-context coverage; if the product target is RTGS, inspect and normalize the labels against that scheme before training. If using these as word-level pairs, ordinary Thai text needs a separate segmentation step; the model card leaves sentence coverage unclear.
- **Thai G2P/WikiPron — pronunciation only.** The [Thai G2P Wiktionary corpus](https://github.com/PyThaiNLP/thai-g2p-wiktionary-corpus) says its target is IPA phonemes and lists CC BY-SA 3.0 for the corpus. PyThaiNLP's [Thai G2P model card](https://pythainlp.org/Model-Cards/transliteration/) describes a word-to-phoneme task and warns the source mix may not match everyday dialect. This can help model pronunciation, but it is not an RTGS or other Latin spelling corpus and the share-alike terms need review.

### Arabic

- **CAMeL ALA-LC — direct standard romanization pairs.** The [project repository](https://github.com/CAMeL-Lab/Arabic_ALA-LC_Romanization) and its [paper](https://aclanthology.org/2021.wanlp-1.23.pdf) provide aligned Arabic and ALA-LC Romanized bibliographic entries. The paper reports 107,439 records, 599,442 entries and about 2.5 million words, split into train/dev/test. This is the strongest direct corpus found for an explicitly named Arabic romanization standard. Its domain is library catalog records, not general conversational Arabic. The paper identifies unwritten short vowels, gemination, nunnation, clitics, case and name capitalization as sources of ambiguity; it uses morphological disambiguation and contextual models in addition to character mapping. The project calls the data public and documents LOC, University of Michigan, and Arabic Collections Online sources, but the reviewed materials do not establish one blanket redistribution license for all source records. Treat data reuse as a rights review, distinct from the code license.
- **Tashkeela — vowel-restoration supervision, not Roman labels.** [Tashkeela's project page](https://sourceforge.net/projects/tashkeela/) describes 75.6 million words of vocalized Arabic text and lists GPLv2. It is an auto-diacritization resource, not Arabic-to-Latin aligned pairs; the [corpus paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC5310197/) characterizes its source material as mostly Classical Arabic. It may help a separate Arabic vowel-restoration component, but it does not teach ALA-LC spelling directly, and its license is a material constraint.
- **CAMeL morphology/diacritization — potentially gated resource.** The [CAMeL Tools database instructions](https://camel-tools.readthedocs.io/en/stable/reference/db_install.html) require purchasing SAMA 3.1 from the Linguistic Data Consortium for the `calima-msa-s31` resource. This can support morphological disambiguation and diacritization, but it is not a free ready-made romanization corpus and introduces a paid-data dependency.

## Implications for a compact model

1. Define one target convention per language before mixing examples: for example, Mandarin Pinyin tone and `ü` policy, Korean Revised Romanization, a named Thai standard such as RTGS, and Arabic ALA-LC or another explicit scheme. “Romanization” alone is not a consistent label space.
2. Keep training targets separate by task. Train from actual romanization pairs where available. Use IPA/G2P and Arabic diacritization data only for a separately specified pronunciation/intermediate task, or for carefully reviewed synthetic labels; do not silently merge these targets.
3. Mandarin phrase dictionaries can fill known ambiguities, but CPP is polyphone-centric and character/phrase resources alone do not provide complete context-labeled sentence outputs. Korean remains the largest direct-supervision gap in this four-language set.
4. Track license by underlying data file and source, not only the repo's code license. The clearest constraints found are CC BY-SA for CC-CEDICT and Wiktionary-derived IPA corpora, GPLv2 for Tashkeela, paid LDC access for SAMA 3.1, and unresolved source-record redistribution terms for CAMeL ALA-LC.

Dataset findings support data selection and scoping; they do not establish achievable language accuracy. Hardware targets, pilot sizes, and student sizes above are explicitly proposed estimates. No training timing, memory, quality, or deployment-size benchmark has been performed.
