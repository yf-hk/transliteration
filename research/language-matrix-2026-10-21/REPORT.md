# Supported languages and recommended transliteration methods

**Snapshot date: 2026-10-21.** Research and engineering recommendations; no new language engines were implemented or quality-benchmarked.

## Result

All **305 normalized language/script/locale entries** have an individual assessment. This count includes regional variants and generic/specific language tags; it is not a count of distinct human languages. Every original vendor row/code remains available in the saved catalogs.

| Recommended starting method | Entries | Meaning |
|---|---:|---|
| A — preserve Latin spelling | 206 | No romanization NLP; optional locale-aware ASCII folding |
| B — mapping tables | 31 | Character/symbol-to-string mappings, normalization and a selected scheme |
| C — mapping plus algorithms | 20 | Syllable parsing, combining signs, digraphs or finite contextual rules |
| D — lexical/contextual processing | 48 | For reliable readable output, use word/phrase readings, morphology, segmentation or vowel recovery; a learned model is optional |

These are recommended starting methods for the defined output contract, not quality scores or proofs that a neural model is necessary. In particular, a D language may have a fully deterministic **orthographic** transliteration but need lexical knowledge for **pronunciation-based** romanization. A–C classifications do not promise recovery of every name or unmarked pronunciation detail.

## Saved inventories

| Source/catalog | Saved rows | File |
|---|---:|---|
| Google Translate consumer language picker | 249, excluding Detect language | [Consumer list](vendor-lists/google_consumer.csv) |
| Google Cloud NMT | 194 | [NMT list](vendor-lists/google_cloud_nmt.csv) |
| Google Cloud Translation LLM | 127, including 14 experimental entries and locale/alias rows | [TLLM list](vendor-lists/google_cloud_tllm.csv) |
| Azure Translator translation, live public API | 138 | [Azure translation list](vendor-lists/azure_translation_api.csv) |
| Azure translation documentation | 135 | [Documentation list](vendor-lists/azure_translation_docs.csv) |
| Azure transliteration, live public API | 42 language entries, 86 directed language/script pairs | [Language list](vendor-lists/azure_transliteration_api.csv), [directed pairs](vendor-lists/azure-directed-transliteration-pairs.csv) |
| Google Cloud romanization / romanized-input translation table | 14 rows: 10 romanization and 9 romanized-input translation flags | [Capabilities](vendor-lists/google_cloud_romanization_table.csv) |

The consumer list was read from the public Google Translate HTML language picker (`data-language-code` plus its displayed English label), not an undocumented translation endpoint. It is a consumer UI snapshot, not a promise of Google Cloud API availability. Google Cloud model lists and Azure API metadata were collected separately. Counts above are derived from saved source records; the providers can change them.

Primary sources: [Google Translate](https://translate.google.com/?hl=en), [Google Cloud language support](https://docs.cloud.google.com/translate/docs/languages), [Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support), [Azure public Languages API](https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation,transliteration,dictionary). The exact URLs, timestamps, byte counts and SHA-256 digests are saved in [the source manifest](sources/manifest.json).

### Vendor differences that matter

- Azure live translation metadata includes `be`, `es-MX`, and `lb`, which were absent from the 135-row translation documentation table at retrieval. The report uses the 138-entry live API as the Azure translation inventory while preserving both snapshots.
- Google Cloud `romanizeText` means source script to Latin. Its `enableTransliteration` translation option means romanized Latin input feeding a translation request. It is not a general reverse transliteration API. The saved support flags preserve this distinction.
- Google Cloud currently lists romanization for Arabic, Amharic, Bengali, Belarusian, Hindi, Japanese, Myanmar, Russian, Serbian and Ukrainian. Chinese and Korean translation support does not imply support in this Cloud romanization table. Consumer UI pronunciation features are a separate capability.
- Azure lists explicit language/from-script/to-script directions. Its public list does not establish which named national romanization standard, pronunciation method or model it uses. Latin-to-native directions can require ambiguity resolution even where forward spelling conversion is deterministic.
- Google Cloud romanization/transliteration features are marked Preview; Google TLLM experimental entries are explicitly labeled in the saved list.

## What is being classified

The target is **written input to a declared Latin romanization**, as needed by this module and a future service. Each entry distinguishes (1) spelling-preserving orthographic conversion and (2) readable, pronunciation-based output. Translation, IPA transcription, speech recognition, OCR, reverse input methods, and all historical/alternative scripts are not silently included.

A literal one-to-one character map is too narrow: a character can produce several Latin letters, several code points can form one orthographic unit, and combining marks may need normalization. B covers table-driven character-to-string methods; C adds bounded algorithms. D denotes lexical/contextual knowledge, which can be supplied by dictionaries and rules, compact neural models, or a combination. It does **not** mean a general LLM is required.

For Latin input, retaining the source spelling is already the romanization result. English or Irish spelling-to-pronunciation conversion would be a different product. ASCII slug normalization is lossy and must not be confused with a reversible or pronunciation-preserving transform.

### Script and alias policy

- Explicit script variants take precedence. Otherwise [CLDR likelySubtags](sources/cldr-likelySubtags.json) supplies a **default-script inference**, not an API input guarantee. [CLDR languageData](sources/cldr-supplementalData.xml) provides alternate-script metadata. The downloaded likely-subtag file identifies CLDR 48 / Unicode 16 data; these are recorded data versions, not a claim that every source uses one Unicode release.
- Original codes are preserved. Normalized IDs are internal report keys, not replacement API request parameters. Deprecated/overlong aliases such as `iw/he`, `jw/jv`, `tl/fil`, `lug/lg`, `nya/ny`, `run/rn`, and `prs/fa-AF` are documented through CLDR or explicit vendor aliases.
- The literal `ku` is provider-dependent: Google means Kurmanji; Azure means Central Kurdish/Sorani. These become separate `kmr` and `ckb` assessment keys.
- Script-qualified internal keys preserve NKo, Tifinagh, Ol Chiki, Inuktitut syllabics, Crimean Tatar Cyrillic, Meitei Mayek, and Latin Hmong Daw. Azure Meitei script inference comes from its live transliteration metadata; Latin Hmong Daw is explicit in Azure documentation.
- Generic codes and regional/script codes remain separate where merging would invent equivalence, for example `zh`, `zh-CN`, `zh-Hans`, `zh-TW`, `zh-Hant`, `zh-HK`; `no/nb`; and generic/Brazilian/European Portuguese.
- Mixed scripts need per-span script handling. The Latin-first classification for Fulani, Javanese, Balinese, Sundanese, Hausa, Malay, Uzbek and others applies to the catalog default/explicit input script. Their other scripts require additional profiles. Historical CLDR alternatives are recorded but are not a claim of vendor acceptance or completed research for every alternative writing system.

## Recommendations for this module and service

1. Ship deterministic A–C profiles as small tables and finite-state/structural algorithms, with explicit language/script/standard and versioned output behavior.
2. For D profiles, establish dictionary/rule baselines and use specialist reading models only where held-out evaluation shows a benefit. Keep name/phrase overrides and an honest ambiguity policy.
3. Split orthographic and pronunciation modes. For example, Sanskrit IAST and Tibetan Wylie are bounded spelling contracts; inferred vowels in Arabic/Hebrew and Kanji readings are lexical problems.
4. Keep Hanyu Pinyin, Jyutping, Korean RR and Thai RTGS as separate named profiles. Chinese script variants do not identify a spoken reading language; Korean Hangul support does not automatically cover Hanja.
5. Train/evaluate in Python if convenient, but implement portable tables/rules and exportable compact models for the chosen production runtime. Model export does not port tokenizers, lexicons and morphology automatically.
6. No general LLM is selected as the mandatory default for any entry. Compare one only if it improves the same native-reviewed accuracy/latency/cost evaluation.

## Every language and variant

The table below contains every normalized entry. The [CSV](language-assessments.csv) includes full orthographic/readable methods, NLP requirements, provider codes, capability flags, source URLs and evidence limits; the [JSON](language-assessments.json) additionally retains original provider rows. Profile links below expand the shared algorithm and source rationale. The language-specific note makes exceptions explicit.

| Language / normalized key | Default script | Class / method profile | Provider translation catalogs | Language-specific recommendation |
|---|---|---|---|---|
| Abkhaz (`ab`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N | Abkhaz needs its own extended Cyrillic alphabet and multigraph repertoire; use a named non-Slavic table, not Russian pronunciation rules. |
| Acehnese (`ace`) | Latn | A / [latin](#profile-latin) | G, N | Acehnese is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Acholi (`ach`) | Latn | A / [latin](#profile-latin) | G, N | Acholi is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Afar (`aa`) | Latn | A / [latin](#profile-latin) | G | Afar is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Afrikaans (`af`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Afrikaans is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Albanian (`sq`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Albanian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Alur (`alz`) | Latn | A / [latin](#profile-latin) | G, N | Alur is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Amharic (`am`) | Ethi | C / [ethiopic](#profile-ethiopic) | G, N, L, A | Amharic Ethiopic syllable mapping can be compact. Sixth-order vowel interpretation and unmarked gemination limit a full pronunciation guarantee. |
| Arabic (`ar`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | G, N, L, A | Unvowelled Arabic supports several lexical readings. Expose consonantal spelling and inferred-pronunciation modes; select dialect/standard and allow name overrides. |
| Arabic (Saudi Arabia) (`ar-SA`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | L | Unvowelled Arabic supports several lexical readings. Expose consonantal spelling and inferred-pronunciation modes; select dialect/standard and allow name overrides. |
| Armenian (`hy`) | Armn | C / [armenian](#profile-armenian) | G, N, L, A | Armenian Eastern/Western pronunciation and legacy/reformed orthography can differ; the language code alone does not select a spoken convention. |
| Assamese (`as`) | Beng | D / [indic-lexical](#profile-indic-lexical) | G, N, A | Assamese and Bengali share the script but not all letters/readings. Use Assamese-specific inventory and vowel/phonology rules after a shared structural parser. |
| Avar (`av`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G | Avar includes extended letters and multigraph combinations; pin the Avar alphabet/version and longest-match behavior. |
| Awadhi (`awa`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N | Awadhi can reuse a Devanagari structural parser, but its pronunciation rules must be validated separately from Hindi. |
| Aymara (`ay`) | Latn | A / [latin](#profile-latin) | G, N | Aymara is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Azerbaijani (`az`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Azerbaijani defaults to Latin here, but Arabic/Cyrillic inputs need distinct profiles; dotted/dotless I and other letters need locale-aware handling. |
| Balinese (`ban`) | Latn | A / [latin](#profile-latin) | G, N | Balinese is Latin-primary here; Balinese-script input requires a separate consonant/vowel/cluster parser. |
| Baluchi (`bal`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | G | Baluchi/Balochi has regional orthographies. The catalog default is Arabic-derived; choose a variety and a vowel policy before training a pronunciation model. |
| Bambara (`bm`) | Latn | A / [latin](#profile-latin) | G, N | Bambara is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Baoulé (`bci`) | Latn | A / [latin](#profile-latin) | G | Baoulé is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Bashkir (`ba`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, A | Bashkir-specific Cyrillic letters need explicit entries; select the chosen Bashkir Latin standard rather than borrowing Tatar or Russian outputs. |
| Basque (`eu`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Basque is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Batak Karo (`btx`) | Latn | A / [latin](#profile-latin) | G, N | Batak Karo is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Batak Simalungun (`bts`) | Latn | A / [latin](#profile-latin) | G, N | Batak Simalungun is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Batak Toba (`bbc`) | Latn | A / [latin](#profile-latin) | G, N | Batak Toba is Latin-primary here; Batak-script input requires a separate syllabic/abugida transform. |
| Belarusian (`be`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L, A | Belarusian practical schemes and ISO-style scholarly transliteration differ; specify the selected scheme and treatment of the apostrophe/soft sign. |
| Bemba (`bem`) | Latn | A / [latin](#profile-latin) | G, N | Bemba is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Bengali (`bn`) | Beng | D / [indic-lexical](#profile-indic-lexical) | G, N, L, A | Bengali structural transliteration is algorithmic; conventional spoken romanization requires Bengali inherent-vowel and lexical-reading choices. |
| Bengali (India) (`bn-IN`) | Beng | D / [indic-lexical](#profile-indic-lexical) | L | Bengali structural transliteration is algorithmic; conventional spoken romanization requires Bengali inherent-vowel and lexical-reading choices. |
| Betawi (`bew`) | Latn | A / [latin](#profile-latin) | G, N | Betawi is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Bhojpuri (`bho`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N, A | Bhojpuri needs its own inherent-vowel/word-reading policy; a Devanagari spelling output is the low-risk bounded baseline. |
| Bikol (`bik`) | Latn | A / [latin](#profile-latin) | G, N | Bikol is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Bodo (`brx`) | Deva | D / [indic-lexical](#profile-indic-lexical) | A | Bodo's catalog default is Devanagari and can use a structural script mapper. Hindi schwa deletion is not evidence of correct Bodo pronunciation; validate Bodo-specific rules. |
| Bosnian (`bs`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Bosnian is Latin-primary here; the separately listed Cyrillic variant needs a different conversion route. |
| Bosnian (Cyrillic) (`bs-Cyrl`) | Cyrl | B / [cyrillic](#profile-cyrillic) | L | Bosnian Cyrillic can use a standard Bosnian/Serbo-Croatian script conversion; the Latin entry needs no romanization. |
| Breton (`br`) | Latn | A / [latin](#profile-latin) | G, N | Breton is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Bulgarian (`bg`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L, A | Bulgarian needs a selected national/practical or scholarly table; letters such as hard sign and digraph outputs must follow that scheme. |
| Buryat (`bua`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N | Buryat needs extended Cyrillic vowel/consonant entries and alphabet-version policy; bounded spelling conversion is table-driven. |
| Cantonese (`yue`) | Hant | D / [cantonese](#profile-cantonese) | G, N, A | Cantonese requires Cantonese lexical readings and a named scheme such as Jyutping; Mandarin Pinyin data is inappropriate. |
| Catalan (`ca`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Catalan is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Cebuano (`ceb`) | Latn | A / [latin](#profile-latin) | G, N | Cebuano is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Chamorro (`ch`) | Latn | A / [latin](#profile-latin) | G | Chamorro is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Chechen (`ce`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G | Chechen multigraphs and extended letters require language-aware matching; a generic Russian table is incomplete. |
| Chhattisgarhi (`hne`) | Deva | D / [indic-lexical](#profile-indic-lexical) | A | Chhattisgarhi shares Devanagari structure with Hindi but requires language-specific word readings and vowel behavior for pronunciation output. |
| Chichewa (`ny`) | Latn | A / [latin](#profile-latin) | G, N, A | Chichewa is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Chinese (`zh`) | Hans | D / [han-policy](#profile-han-policy) | L | Require the reading language/profile; if the caller chooses Mandarin, use phrase/polyphone processing and Hanyu Pinyin. A Han script tag alone is insufficient. |
| Chinese (Hong Kong) (`zh-HK`) | Hant | D / [han-policy](#profile-han-policy) | L | Hong Kong locale is not proof of a unique pronunciation language. Offer explicit Cantonese/Jyutping versus Mandarin/Pinyin profiles. |
| Chinese (Literary) (`lzh`) | Hant | D / [han-policy](#profile-han-policy) | A | Literary Chinese requires a declared reading tradition (for example modern Mandarin reading versus another tradition); a generic Han character table cannot make that choice. |
| Chinese (Simplified) (`zh-CN`) | Hans | D / [mandarin](#profile-mandarin) | G, N, L | For an explicitly selected Mandarin profile use Hanyu Pinyin with polyphone/phrase readings. Simplified script does not remove reading ambiguity. |
| Chinese (Simplified) (`zh-Hans`) | Hans | D / [han-policy](#profile-han-policy) | L, A | Select Mandarin or another reading language explicitly; then use its lexicon/context model. Simplified/traditional conversion is a separate phrase-sensitive task. |
| Chinese (Traditional) (`zh-Hant`) | Hant | D / [han-policy](#profile-han-policy) | L, A | Traditional characters may represent different languages. Choose the language and romanization scheme before selecting readings. |
| Chinese (Traditional) (`zh-TW`) | Hant | D / [mandarin](#profile-mandarin) | G, N, L | For a Mandarin/Taiwan profile use Mandarin lexical readings and selected regional/naming conventions. Traditional script is not a pronunciation specification. |
| Chuukese (`chk`) | Latn | A / [latin](#profile-latin) | G | Chuukese is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Chuvash (`cv`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N | Chuvash-specific Cyrillic characters and combining equivalents need their own table; preserve distinctions under the selected standard. |
| Corsican (`co`) | Latn | A / [latin](#profile-latin) | G, N | Corsican is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Crimean Tatar (`crh`) | Cyrl | B / [cyrillic](#profile-cyrillic) | N | Crimean Tatar has separately listed Cyrillic and Latin variants. Use script detection and a named conversion table; alphabet conversion is not a pronunciation model. |
| Crimean Tatar (Cyrillic) (`crh-Cyrl`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G | Crimean Tatar has separately listed Cyrillic and Latin variants. Use script detection and a named conversion table; alphabet conversion is not a pronunciation model. |
| Crimean Tatar (Latin) (`crh-Latn`) | Latn | A / [latin](#profile-latin) | G | Crimean Tatar has separately listed Cyrillic and Latin variants. Use script detection and a named conversion table; alphabet conversion is not a pronunciation model. |
| Croatian (`hr`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Croatian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Czech (`cs`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Czech is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Danish (`da`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Danish is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Dari (`fa-AF`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | G, A | Dari is stored under original fa-AF/prs vendor codes. Use Dari-specific readings and names even where its Persian-derived script mapper is shared. |
| Dhivehi (`dv`) | Thaa | C / [thaana](#profile-thaana) | G, N, A | Thaana uses written vowel signs and sukun; combine them with base letters and apply Dhivehi-specific positional rules. |
| Dinka (`din`) | Latn | A / [latin](#profile-latin) | G, N | Dinka is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Dogri (`doi`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N, A | Dogri is Devanagari-primary here, with Takri/Arabic alternatives in CLDR metadata. Orthographic conversion can share a parser; actual alternate-script input needs another profile. |
| Dombe (`dov`) | Latn | A / [latin](#profile-latin) | G, N | Dombe is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Dutch (`nl`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Dutch is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Dutch (Belgium) (`nl-BE`) | Latn | A / [latin](#profile-latin) | L | Dutch (Belgium) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Dyula (`dyu`) | Latn | A / [latin](#profile-latin) | G | Dyula is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Dzongkha (`dz`) | Tibt | D / [dzongkha](#profile-dzongkha) | G, N | Dzongkha needs its own Roman Dzongkha/readable convention; Tibetan Wylie spelling is not a substitute for Dzongkha pronunciation. |
| English (`en`) | Latn | A / [latin](#profile-latin) | G, N, L, A | English is already Latin. Converting English spelling to pronunciation is a separate G2P task and should not be added to romanization. |
| English (Australia) (`en-AU`) | Latn | A / [latin](#profile-latin) | L | English is already Latin. Converting English spelling to pronunciation is a separate G2P task and should not be added to romanization. |
| English (Canada) (`en-CA`) | Latn | A / [latin](#profile-latin) | L | English is already Latin. Converting English spelling to pronunciation is a separate G2P task and should not be added to romanization. |
| English (New Zealand) (`en-NZ`) | Latn | A / [latin](#profile-latin) | L | English is already Latin. Converting English spelling to pronunciation is a separate G2P task and should not be added to romanization. |
| English (Philippines) (`en-PH`) | Latn | A / [latin](#profile-latin) | L | English is already Latin. Converting English spelling to pronunciation is a separate G2P task and should not be added to romanization. |
| English (South Africa) (`en-ZA`) | Latn | A / [latin](#profile-latin) | L | English is already Latin. Converting English spelling to pronunciation is a separate G2P task and should not be added to romanization. |
| English (United Kingdom) (`en-GB`) | Latn | A / [latin](#profile-latin) | L | English is already Latin. Converting English spelling to pronunciation is a separate G2P task and should not be added to romanization. |
| English (United States) (`en-US`) | Latn | A / [latin](#profile-latin) | L | English is already Latin. Converting English spelling to pronunciation is a separate G2P task and should not be added to romanization. |
| Esperanto (`eo`) | Latn | A / [latin](#profile-latin) | G, N | Esperanto is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Estonian (`et`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Estonian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Ewe (`ee`) | Latn | A / [latin](#profile-latin) | G, N | Ewe is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Faroese (`fo`) | Latn | A / [latin](#profile-latin) | G, A | Faroese is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Fijian (`fj`) | Latn | A / [latin](#profile-latin) | G, N, A | Fijian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Filipino (`fil`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Filipino is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Finnish (`fi`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Finnish is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Fon (`fon`) | Latn | A / [latin](#profile-latin) | G | Fon is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| French (`fr`) | Latn | A / [latin](#profile-latin) | G, N, L, A | French is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| French (Canada) (`fr-CA`) | Latn | A / [latin](#profile-latin) | G, N, L, A | French (Canada) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| French (French) (`fr-FR`) | Latn | A / [latin](#profile-latin) | N | French (French) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| French (Switzerland) (`fr-CH`) | Latn | A / [latin](#profile-latin) | L | French (Switzerland) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Frisian (`fy`) | Latn | A / [latin](#profile-latin) | G, N, L | Frisian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Friulian (`fur`) | Latn | A / [latin](#profile-latin) | G | Friulian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Fulani (`ff`) | Latn | A / [latin](#profile-latin) | G, N | Fulani/Fula is Latin-primary in the catalog. Adlam is an additional writing system and must not be silently passed through a Latin-only route. |
| Ga (`gaa`) | Latn | A / [latin](#profile-latin) | G, N | Ga is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Galician (`gl`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Galician is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Georgian (`ka`) | Geor | B / [georgian](#profile-georgian) | G, N, L, A | Georgian letter-to-string conversion is compact and deterministic once the scheme is chosen; preserve ejective markers and handle uppercase/legacy forms deliberately. |
| German (`de`) | Latn | A / [latin](#profile-latin) | G, N, L, A | German is already Latin. If ASCII folding is requested, expose a policy such as umlaut digraphs versus accent removal and explicit sharp-s handling. |
| Greek (`el`) | Grek | C / [greek](#profile-greek) | G, N, L, A | Greek practical romanization may need neighboring-letter/digraph rules. State Modern versus Ancient and the named convention. |
| Guarani (`gn`) | Latn | A / [latin](#profile-latin) | G, N, L | Guarani is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Gujarati (`gu`) | Gujr | D / [indic-lexical](#profile-indic-lexical) | G, N, L, A | Gujarati has dependent vowels and inherent-vowel behavior; reliable readable forms require Gujarati rules and lexical exceptions. |
| Haitian Creole (`ht`) | Latn | A / [latin](#profile-latin) | G, N, A | Haitian Creole is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Hakha Chin (`cnh`) | Latn | A / [latin](#profile-latin) | G, N | Hakha Chin is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Hausa (`ha`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Hausa is Latin-primary here, with Ajami alternatives; dotted/hooked Latin letters and Arabic-derived inputs require different handling. |
| Hawaiian (`haw`) | Latn | A / [latin](#profile-latin) | G, N | Hawaiian is already Latin. Okina and macrons are spelling distinctions; deleting punctuation/marks is an explicit slug policy. |
| Hebrew (`he`) | Hebr | D / [hebrew](#profile-hebrew) | G, N, L, A | Pointed Hebrew provides more reading information than unpointed text. A spelling mapper must not silently invent vowels for an unpointed word. |
| Hiligaynon (`hil`) | Latn | A / [latin](#profile-latin) | G, N | Hiligaynon is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Hindi (`hi`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N, L, A | Hindi readable romanization needs schwa deletion and exceptions/morphology; full inherent-vowel spelling transliteration is a separate algorithmic mode. |
| Hmong (`hmn`) | Latn | A / [latin](#profile-latin) | G, N | Google's generic Hmong label is Latin-primary under CLDR here. Hmong Daw mww and non-Latin Hmong scripts are distinct scopes. |
| Hmong Daw (`mww-Latn`) | Latn | A / [latin](#profile-latin) | A | Azure documentation explicitly labels Hmong Daw Latin; this overrides the different CLDR likely script for unqualified mww. Original vendor code remains mww. |
| Hungarian (`hu`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Hungarian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Hunsrik (`hrx`) | Latn | A / [latin](#profile-latin) | G, N | Hunsrik is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Iban (`iba`) | Latn | A / [latin](#profile-latin) | G | Iban is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Icelandic (`is`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Icelandic is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Igbo (`ig`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Igbo is already Latin; preserve its vowel/consonant marks where the output format allows them. |
| Ilocano (`ilo`) | Latn | A / [latin](#profile-latin) | G, N | Ilocano is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Indonesian (`id`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Indonesian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Inuinnaqtun (`ikt`) | Latn | A / [latin](#profile-latin) | A | Inuinnaqtun is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Inuktut (Latin) (`iu-Latn`) | Latn | A / [latin](#profile-latin) | G, A | Inuktut/Inuktitut already in Latin needs preservation, not syllabic conversion. Select the regional orthography for optional normalization. |
| Inuktut (Syllabics) (`iu-Cans`) | Cans | C / [syllabics](#profile-syllabics) | G, A | Inuktut/Inuktitut syllabics need syllable-to-string and final/length rules with regional selection. Latin input has its own identity path. |
| Irish (`ga`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Irish is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Italian (`it`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Italian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Jamaican Patois (`jam`) | Latn | A / [latin](#profile-latin) | G | Jamaican Patois is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Japanese (`ja`) | Jpan | D / [japanese](#profile-japanese) | G, N, L, A | Kana alone is algorithmic; Kanji words and names need lexical/morphological readings before Hepburn or another selected renderer. The current government guidance changed in December 2025; version naming rules. |
| Javanese (`jv`) | Latn | A / [latin](#profile-latin) | G, N | Javanese is Latin-primary in this catalog. Javanese-script text needs a separate abugida parser and language rules. |
| Jingpo (`kac`) | Latn | A / [latin](#profile-latin) | G | Jingpo is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Kalaallisut (`kl`) | Latn | A / [latin](#profile-latin) | G | Kalaallisut is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Kannada (`kn`) | Knda | C / [indic-structural](#profile-indic-structural) | G, N, L, A | Kannada standard orthographic romanization is a structural rule problem; pronunciation refinements and name conventions should be separately evaluated. |
| Kanuri (`kr`) | Latn | A / [latin](#profile-latin) | G | Kanuri is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Kapampangan (`pam`) | Latn | A / [latin](#profile-latin) | G, N | Kapampangan is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Kashmiri (`ks`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | A | Kashmiri Arabic-derived writing uses language-specific letters and vowel marks; optional/omitted marks and other scripts need explicit handling and lexical validation. |
| Kazakh (`kk`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, A | Kazakh has multiple historical/proposed Latin conventions. Version the selected table and support its extra Cyrillic letters; do not promise an unspecified universal Latin spelling. |
| Khasi (`kha`) | Latn | A / [latin](#profile-latin) | G | Khasi is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Khmer (`km`) | Khmr | D / [khmer](#profile-khmer) | G, N, L, A | Khmer consonant series/register affects vowel readings. Parse orthographic clusters and add lexical readings/segmentation for pronunciation output. |
| Kiga (`cgg`) | Latn | A / [latin](#profile-latin) | G, N | Kiga is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Kikongo (`kg`) | Latn | A / [latin](#profile-latin) | G | Kikongo is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Kinyarwanda (`rw`) | Latn | A / [latin](#profile-latin) | G, N, A | Kinyarwanda is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Kituba (`ktu`) | Latn | A / [latin](#profile-latin) | G, N | Kituba is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Klingon (Latin) (`tlh-Latn`) | Latn | A / [latin](#profile-latin) | A | Klingon's designed Latin orthography has meaningful case and apostrophes; a generic lowercasing slug policy loses information. |
| Klingon (pIqaD) (`tlh-Piqd`) | Piqd | B / [piqad](#profile-piqad) | A | Require the declared pIqaD glyph encoding/font convention. The conversion is table-driven only after that choice; no listed Azure transliteration pair was found for this script. |
| Kokborok (`trp`) | Latn | A / [latin](#profile-latin) | G | Kokborok is Latin-primary under CLDR here. Its being an Indic-region language does not imply Devanagari or Bengali input; route by the actual script. |
| Komi (`kv`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G | Komi needs the appropriate Cyrillic alphabet/version and language-specific extensions; no learned model is implied for orthographic output. |
| Konkani (`gom`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N, A | Konkani has several writing traditions. This catalog's default is Devanagari; choose a language/orthography standard and validate pronunciation independently of Marathi. |
| Korean (`ko`) | Kore | C / [korean](#profile-korean) | G, N, L, A | Hangul needs syllable decomposition and standard-specific sound-change rules. Hanja needs lexical readings, and personal names may use conventional spellings. |
| Krio (`kri`) | Latn | A / [latin](#profile-latin) | G, N | Krio is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Kurdish (Kurmanji) (`kmr`) | Latn | A / [latin](#profile-latin) | G, N, A | Kurmanji is Latin-primary in this catalog. Google's literal ku is normalized to this northern Kurdish entry; Azure's literal ku is Sorani and is kept separate. |
| Kurdish (Sorani) (`ckb`) | Arab | C / [arabic-vowels-written](#profile-arabic-vowels-written) | G, N, A | Sorani writes most vowels, but short i is often unwritten. Use rule-first spelling conversion and optional lexical recovery for that missing-vowel case. Azure's literal ku means Sorani; Google's ku means Kurmanji. |
| Kyrgyz (`ky`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L, A | Kyrgyz-specific vowels and nasal consonant need explicit mappings; legacy Latin conventions should be separately selectable. |
| Lao (`lo`) | Laoo | D / [lao](#profile-lao) | G, N, L, A | Use Lao-specific syllable and initial/final rules with a lexical exception layer where needed; orthographic ALA-LC and readable-name conventions are different targets. |
| Latgalian (`ltg`) | Latn | A / [latin](#profile-latin) | G, N | Latgalian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Latin (`la`) | Latn | A / [latin](#profile-latin) | G, N | Latin is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Latvian (`lv`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Latvian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Ligurian (`lij`) | Latn | A / [latin](#profile-latin) | G, N | Ligurian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Limburgish (`li`) | Latn | A / [latin](#profile-latin) | G, N | Limburgish is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Lingala (`ln`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Lingala is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Lithuanian (`lt`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Lithuanian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Lombard (`lmo`) | Latn | A / [latin](#profile-latin) | G, N | Lombard is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Lower Sorbian (`dsb`) | Latn | A / [latin](#profile-latin) | A | Lower Sorbian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Luganda (`lg`) | Latn | A / [latin](#profile-latin) | G, N, A | Luganda is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Luo (`luo`) | Latn | A / [latin](#profile-latin) | G, N | Luo is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Luxembourgish (`lb`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Luxembourgish is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Macedonian (`mk`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L, A | Macedonian uses its own Cyrillic letters and practical conventions; a small language-specific map is sufficient for standard spelling romanization. |
| Madurese (`mad`) | Latn | A / [latin](#profile-latin) | G | Madurese is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Maithili (`mai`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N, A | Maithili is Devanagari-primary here, with historical Tirhuta alternatives. A readable engine needs Maithili-specific vowel/readings data. |
| Makassar (`mak`) | Latn | A / [latin](#profile-latin) | G, N | Makassar is Latin-primary here; Lontara/Buginese-family input has a different spelling/reading problem and must be separately specified. |
| Malagasy (`mg`) | Latn | A / [latin](#profile-latin) | G, N, A | Malagasy is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Malay (`ms`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Malay is Latin-primary here. Jawi is separately listed as ms-Arab and requires a different lexical conversion path. |
| Malay (Jawi) (`ms-Arab`) | Arab | D / [jawi](#profile-jawi) | G, N | Jawi-to-Rumi should recover standard Malay words, including omitted-vowel choices, rather than emit generic Arabic letter names. |
| Malayalam (`ml`) | Mlym | C / [indic-structural](#profile-indic-structural) | G, N, L, A | Malayalam needs consonant-vowel state, conjunct/chillu handling and orthographic-version normalization. Conservative spelling romanization is rule-first. |
| Maltese (`mt`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Maltese is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Mam (`mam`) | Latn | A / [latin](#profile-latin) | G | Mam is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Manx (`gv`) | Latn | A / [latin](#profile-latin) | G | Manx is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Maori (`mi`) | Latn | A / [latin](#profile-latin) | G, N, A | Maori is already Latin. Preserve macrons in normal spelling, with a separate documented ASCII mode. |
| Marathi (`mr`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N, L, A | Marathi has its own vowels, consonant inventory and inherent-vowel conventions; reuse Devanagari parsing, not Hindi pronunciation rules. |
| Marshallese (`mh`) | Latn | A / [latin](#profile-latin) | G | Marshallese is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Marwadi (`mwr`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G | Marwari/Marwadi uses several orthographies; CLDR default Devanagari is a routing assumption. Choose the actual script and variety before guaranteeing pronunciation. |
| Mauritian Creole (`mfe`) | Latn | A / [latin](#profile-latin) | G | Mauritian Creole is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Meadow Mari (`chm`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N | Meadow Mari requires extended Cyrillic vowel entries. Keep other Mari varieties outside this code's pronunciation promise. |
| Meiteilon (Manipuri) (`mni-Mtei`) | Mtei | C / [meetei](#profile-meetei) | G, N, A | Meitei Mayek uses dependent signs and distinct final forms. Azure's unqualified mni transliteration metadata identifies Mtei; Bengali-script Meitei is a separate profile. |
| Minang (`min`) | Latn | A / [latin](#profile-latin) | G, N | Minang is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Mizo (`lus`) | Latn | A / [latin](#profile-latin) | G, N | Mizo is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Mongolian (`mn`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L | Cyrillic Mongolian and traditional Mongolian are distinct input profiles; a Latin table for Cyrillic does not implement traditional-script reading. |
| Mongolian (Cyrillic) (`mn-Cyrl`) | Cyrl | B / [cyrillic](#profile-cyrillic) | A | Cyrillic Mongolian and traditional Mongolian are distinct input profiles; a Latin table for Cyrillic does not implement traditional-script reading. |
| Mongolian (Traditional) (`mn-Mong`) | Mong | D / [traditional-mongolian](#profile-traditional-mongolian) | A | Traditional Mongolian requires positional/variant processing and, for conventional lexical readings, vowel-harmony/context/dictionary information. Keep it separate from Cyrillic Mongolian. |
| Myanmar (Burmese) (`my`) | Mymr | D / [myanmar](#profile-myanmar) | G, N, L, A | Burmese spelling romanization can follow a named scheme; spoken-style reading needs lexical/contextual processing. Legacy Zawgyi conversion is a separate concern. |
| Nahuatl (Eastern Huasteca) (`nhe`) | Latn | A / [latin](#profile-latin) | G | Nahuatl (Eastern Huasteca) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Ndau (`ndc-ZW`) | Latn | A / [latin](#profile-latin) | G | Ndau is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Ndebele (South) (`nr`) | Latn | A / [latin](#profile-latin) | G, N | Ndebele (South) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Nepalbhasa (Newari) (`new`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N | Nepalbhasa/Newari is Devanagari-primary in this catalog but has other script traditions. Its phonology must not be replaced by a Nepali reading model. |
| Nepali (`ne`) | Deva | D / [indic-lexical](#profile-indic-lexical) | G, N, L, A | Nepali requires its own schwa/word-reading policy. A shared Devanagari transducer is only the structural first stage. |
| NKo (`bm-Nkoo`) | Nkoo | C / [nko](#profile-nko) | G | The vendor label NKo refers to a script-based Manding catalog entry; apply a declared language/romanization policy and preserve tone/length distinctions as required. |
| Norwegian (`no`) | Latn | A / [latin](#profile-latin) | G, N, L | Google's generic Norwegian code is retained separately from Azure/Google Bokmal nb; both are Latin and need no romanization. |
| Norwegian Bokmal (`nb`) | Latn | A / [latin](#profile-latin) | L, A | Norwegian Bokmal is Latin; normalize existing spelling rather than treating it as a phonetic conversion task. |
| Nuer (`nus`) | Latn | A / [latin](#profile-latin) | G, N | Nuer is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Occitan (`oc`) | Latn | A / [latin](#profile-latin) | G, N | Occitan is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Odia (Oriya) (`or`) | Orya | D / [indic-lexical](#profile-indic-lexical) | G, N, L, A | Odia/Oriya requires its own syllable parser and vowel rules; alphabetic substitution is insufficient even when no learned model is needed for a named spelling scheme. |
| Oromo (`om`) | Latn | A / [latin](#profile-latin) | G, N | Oromo is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Ossetian (`os`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G | Ossetian includes its own Cyrillic inventory, including the ae letter; use an Ossetian table and make ASCII folding an explicit lossy option. |
| Pangasinan (`pag`) | Latn | A / [latin](#profile-latin) | G, N | Pangasinan is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Papiamento (`pap`) | Latn | A / [latin](#profile-latin) | G, N | Papiamento is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Pashto (`ps`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | G, N, A | Pashto has extended letters and dialect-sensitive readings; spelling conversion is bounded, while inferred short vowels and names need a Pashto lexical layer. |
| Persian (`fa`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | G, N, L, A | Persian short vowels are commonly omitted; readable forms require lexical/contextual readings. Written transliteration can remain deterministic under a named Persian scheme. |
| Polish (`pl`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Polish is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Portuguese (`pt`) | Latn | A / [latin](#profile-latin) | N, L | Generic Portuguese and Brazil/Portugal regional entries remain separate catalog keys. All use the same identity-first Latin approach. |
| Portuguese (Brazil) (`pt-BR`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Brazilian Portuguese is already Latin. Regional translation support does not imply a distinct transliteration model. |
| Portuguese (Portugal) (`pt-PT`) | Latn | A / [latin](#profile-latin) | G, N, L, A | European Portuguese is already Latin; preserve its spelling and expose ASCII folding separately. |
| Punjabi (Gurmukhi) (`pa`) | Guru | D / [indic-lexical](#profile-indic-lexical) | G, N, L, A | Gurmukhi Punjabi needs vowel-sign, nasalization, gemination and tone-related conventions under the selected scheme; its pipeline differs from Shahmukhi. |
| Punjabi (Pakistan) (`pa-PK`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | L | CLDR's default-script inference for Google's Pakistan Punjabi variant is Arabic-derived/Shahmukhi; this is not an explicit provider input-script guarantee. Keep the route distinct from Gurmukhi Punjabi and use Punjabi-specific lexical readings. |
| Punjabi (Shahmukhi) (`pa-Arab`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | G, N | Shahmukhi Punjabi has omitted-vowel ambiguity. Share low-level Arabic-script parsing, then apply Punjabi word readings and the chosen Latin convention. |
| Quechua (`qu`) | Latn | A / [latin](#profile-latin) | G, N | Quechua is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Querétaro Otomi (`otq`) | Latn | A / [latin](#profile-latin) | A | Querétaro Otomi is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Qʼeqchiʼ (`kek`) | Latn | A / [latin](#profile-latin) | G | Qʼeqchiʼ is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Romani (`rom`) | Latn | A / [latin](#profile-latin) | G, N | Romani is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Romanian (`ro`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Romanian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Rundi (`rn`) | Latn | A / [latin](#profile-latin) | G, N, A | Rundi is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Russian (`ru`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L, A | Russian spelling romanization is rule/table-driven. Recovering an omitted yo distinction, stress or conventional personal-name spelling may require lexical information. |
| Sami (North) (`se`) | Latn | A / [latin](#profile-latin) | G | Sami (North) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Samoan (`sm`) | Latn | A / [latin](#profile-latin) | G, N, A | Samoan is already Latin; retain glottal-stop and vowel-length notation when present. |
| Sango (`sg`) | Latn | A / [latin](#profile-latin) | G, N | Sango is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Sanskrit (`sa`) | Deva | C / [sanskrit](#profile-sanskrit) | G, N | IAST-style Sanskrit transliteration can follow written consonants, vowels and conjuncts algorithmically. Word segmentation/sandhi analysis should be optional features. |
| Santali (Latin) (`sat-Latn`) | Latn | A / [latin](#profile-latin) | G | Santali already written in Latin needs preservation. Ol Chiki and other scripts need separate transformations. |
| Santali (Ol Chiki) (`sat-Olck`) | Olck | C / [ol-chiki](#profile-ol-chiki) | G | Ol Chiki is alphabetic, with modifiers, rather than a Devanagari-style abugida. Apply a Santali-specific Latin scheme. |
| Scots Gaelic (`gd`) | Latn | A / [latin](#profile-latin) | G, N, L | Scots Gaelic is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Sepedi (`nso`) | Latn | A / [latin](#profile-latin) | G, N, A | Sepedi is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Serbian (`sr`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L | Select Cyrillic-to-Latin conversion or preserve Latin spelling according to the actual script. Reverse Latin digraphs can be ambiguous at letter boundaries. |
| Serbian (Cyrillic) (`sr-Cyrl`) | Cyrl | B / [cyrillic](#profile-cyrillic) | A | Select Cyrillic-to-Latin conversion or preserve Latin spelling according to the actual script. Reverse Latin digraphs can be ambiguous at letter boundaries. |
| Serbian (Latin) (`sr-Latn`) | Latn | A / [latin](#profile-latin) | A | Serbian already in Latin needs preservation. Latin-to-Cyrillic is another direction and may require care with digraph boundaries. |
| Sesotho (`st`) | Latn | A / [latin](#profile-latin) | G, N, A | Sesotho is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Seychellois Creole (`crs`) | Latn | A / [latin](#profile-latin) | G, N | Seychellois Creole is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Shan (`shn`) | Mymr | C / [shan](#profile-shan) | G, N | Shan ALA-LC spelling romanization is rule-first: inherent vowel, syllable boundaries and tone/final marks. Do not apply Burmese pronunciation to Shan text. |
| Shona (`sn`) | Latn | A / [latin](#profile-latin) | G, N, A | Shona is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Sicilian (`scn`) | Latn | A / [latin](#profile-latin) | G, N | Sicilian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Silesian (`szl`) | Latn | A / [latin](#profile-latin) | G, N | Silesian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Sindhi (`sd`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | G, N, A | Sindhi's extended Perso-Arabic inventory must be mapped explicitly. Select Arabic versus Devanagari input and do not borrow Urdu pronunciation wholesale. |
| Sinhala (`si`) | Sinh | C / [indic-structural](#profile-indic-structural) | G, N, A | Sinhala has inherent-vowel and dependent-sign structure; use a Sinhala-specific table/rule engine, not an unmodified Sanskrit/Hindi parser. |
| Slovak (`sk`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Slovak is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Slovenian (`sl`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Slovenian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Somali (`so`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Somali is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (`es`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Spanish is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Argentina) (`es-AR`) | Latn | A / [latin](#profile-latin) | L | Spanish (Argentina) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Chile) (`es-CL`) | Latn | A / [latin](#profile-latin) | L | Spanish (Chile) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Colombia) (`es-CO`) | Latn | A / [latin](#profile-latin) | L | Spanish (Colombia) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Costa Rica) (`es-CR`) | Latn | A / [latin](#profile-latin) | L | Spanish (Costa Rica) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Ecuador) (`es-EC`) | Latn | A / [latin](#profile-latin) | L | Spanish (Ecuador) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (El Salvador) (`es-SV`) | Latn | A / [latin](#profile-latin) | L | Spanish (El Salvador) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Guatemala) (`es-GT`) | Latn | A / [latin](#profile-latin) | L | Spanish (Guatemala) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Haiti) (`es-HT`) | Latn | A / [latin](#profile-latin) | L | Spanish (Haiti) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Honduras) (`es-HN`) | Latn | A / [latin](#profile-latin) | L | Spanish (Honduras) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Latin America) (`es-419`) | Latn | A / [latin](#profile-latin) | L | Spanish (Latin America) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Mexico) (`es-MX`) | Latn | A / [latin](#profile-latin) | L, A | Spanish (Mexico) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Nicaragua) (`es-NI`) | Latn | A / [latin](#profile-latin) | L | Spanish (Nicaragua) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Panama) (`es-PA`) | Latn | A / [latin](#profile-latin) | L | Spanish (Panama) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Paraguay) (`es-PY`) | Latn | A / [latin](#profile-latin) | L | Spanish (Paraguay) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Peru) (`es-PE`) | Latn | A / [latin](#profile-latin) | L | Spanish (Peru) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Puerto Rico) (`es-PR`) | Latn | A / [latin](#profile-latin) | L | Spanish (Puerto Rico) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Spain) (`es-ES`) | Latn | A / [latin](#profile-latin) | L | Spanish (Spain) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (United States) (`es-US`) | Latn | A / [latin](#profile-latin) | L | Spanish (United States) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Uruguay) (`es-UY`) | Latn | A / [latin](#profile-latin) | L | Spanish (Uruguay) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Spanish (Venezuela) (`es-VE`) | Latn | A / [latin](#profile-latin) | L | Spanish (Venezuela) is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Sundanese (`su`) | Latn | A / [latin](#profile-latin) | G, N | Sundanese is Latin-primary here; native Sundanese-script input requires a separate structural transform. |
| Susu (`sus`) | Latn | A / [latin](#profile-latin) | G | Susu is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Swahili (`sw`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Swahili is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Swati (`ss`) | Latn | A / [latin](#profile-latin) | G, N | Swati is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Swedish (`sv`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Swedish is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Tahitian (`ty`) | Latn | A / [latin](#profile-latin) | G, A | Tahitian is already Latin; apostrophe/glottal and vowel-length handling belongs to spelling/slug policy. |
| Tajik (`tg`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L | Tajik uses Persian-derived vocabulary but Cyrillic spelling; its extra letters need a Tajik map. This is not the same task as vowel recovery from Persian script. |
| Tamazight (`ber-Latn`) | Latn | A / [latin](#profile-latin) | G | Latin Tamazight needs preservation and optional mark policy; the Tifinagh entry is assessed separately. |
| Tamazight (Tifinagh) (`ber-Tfng`) | Tfng | B / [tifinagh](#profile-tifinagh) | G | Use a named Tifinagh/Tamazight table and variety scope; do not imply every Amazigh variety has identical alphabet/romanization conventions. |
| Tamil (`ta`) | Taml | D / [indic-lexical](#profile-indic-lexical) | G, N, L, A | Tamil orthographic transliteration can be deterministic; pronunciation-oriented voicing/allophones and loanwords need Tamil-specific context and exceptions. |
| Tatar (`tt`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, A | Tatar Cyrillic and Latin conventions need distinct profiles. Verify the input script rather than inferring it solely from a translation/OCR table label. |
| Telugu (`te`) | Telu | C / [indic-structural](#profile-indic-structural) | G, N, L, A | Telugu standard spelling romanization can use syllable/vowel rules; a learned model is optional for measured pronunciation exceptions. |
| Tetum (`tet`) | Latn | A / [latin](#profile-latin) | G, N | Tetum is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Thai (`th`) | Thai | D / [thai](#profile-thai) | G, N, L, A | Readable RTGS needs word/syllable identification and pronunciation knowledge, including silent letters. Compare lexicon/rule and small neural baselines. |
| Tibetan (`bo`) | Tibt | D / [tibetan](#profile-tibetan) | G, A | Tibetan Wylie is a stack-aware spelling representation; an extended Wylie output scheme must be specified separately. A modern spoken reading requires dialect and lexical/phonological processing. |
| Tigrinya (`ti`) | Ethi | C / [ethiopic](#profile-ethiopic) | G, N, A | Tigrinya needs its own Ethiopic reading/convention profile. Shared syllabic code points do not justify Amharic word readings. |
| Tiv (`tiv`) | Latn | A / [latin](#profile-latin) | G | Tiv is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Tok Pisin (`tpi`) | Latn | A / [latin](#profile-latin) | G | Tok Pisin is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Tongan (`to`) | Latn | A / [latin](#profile-latin) | G, A | Tongan is already Latin; glottal-stop and vowel-length marks require a deliberate preservation/folding policy. |
| Tshiluba (`lua`) | Latn | A / [latin](#profile-latin) | G | Tshiluba is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Tsonga (`ts`) | Latn | A / [latin](#profile-latin) | G, N | Tsonga is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Tswana (`tn`) | Latn | A / [latin](#profile-latin) | G, N, A | Tswana is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Tulu (`tcy`) | Knda | C / [indic-structural](#profile-indic-structural) | G | Tulu is Kannada-script-primary under CLDR here. Use Tulu-specific readings; Tulu-Tigalari or other input scripts require separate support rather than a Kannada-language model. |
| Tumbuka (`tum`) | Latn | A / [latin](#profile-latin) | G | Tumbuka is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Turkish (`tr`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Turkish is already Latin. Locale-aware casing must preserve dotted/dotless I distinctions before any optional ASCII folding. |
| Turkmen (`tk`) | Latn | A / [latin](#profile-latin) | G, N, A | Turkmen is Latin-primary here; Cyrillic/Arabic variants need separate mapping tables and script detection. |
| Tuvan (`tyv`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G | Tuvan uses extended Cyrillic letters; a named non-Slavic table is a bounded target, while pronunciation/name preference remains a separate feature. |
| Twi (`ak`) | Latn | A / [latin](#profile-latin) | G, N | Twi is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Udmurt (`udm`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G | Udmurt-specific Cyrillic and combining variants need explicit mappings; avoid silently collapsing distinctions in a generic Slavic transform. |
| Ukrainian (`uk`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G, N, L, A | Ukrainian letters and word-position rules differ from Russian. Choose a Ukrainian scheme; preserve proper-name overrides separately. |
| Upper Sorbian (`hsb`) | Latn | A / [latin](#profile-latin) | A | Upper Sorbian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Urdu (`ur`) | Arab | D / [arabic-missing-vowels](#profile-arabic-missing-vowels) | G, N, L, A | Urdu needs Urdu-specific letters, word readings and vowel recovery for readable output; a literal spelling profile can preserve only the information present. |
| Uyghur (`ug`) | Arab | C / [arabic-vowels-written](#profile-arabic-vowels-written) | G, N, A | Uyghur's modern Arabic alphabet writes vowels explicitly. Start with its alphabet/positional-vowel rules; routine Arabic-style full vowel restoration is unnecessary for that bounded script conversion. |
| Uzbek (`uz`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Uzbek is Latin-primary here; apostrophe-like letters/marks must be normalized deliberately. Cyrillic and Arabic Uzbek require separate input profiles. |
| Venda (`ve`) | Latn | A / [latin](#profile-latin) | G | Venda is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Venetian (`vec`) | Latn | A / [latin](#profile-latin) | G | Venetian is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Vietnamese (`vi`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Vietnamese is already Latin. Preserve tone/vowel marks for normal spelling; an ASCII slug requires explicitly lossy accent and stroked-letter handling. |
| Waray (`war`) | Latn | A / [latin](#profile-latin) | G | Waray is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Welsh (`cy`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Welsh is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Wolof (`wo`) | Latn | A / [latin](#profile-latin) | G | Wolof is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Xhosa (`xh`) | Latn | A / [latin](#profile-latin) | G, N, A | Xhosa is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Yakut (`sah`) | Cyrl | B / [cyrillic](#profile-cyrillic) | G | Yakut/Sakha needs its own extended Cyrillic inventory and combination rules; baseline romanization can use a small table with finite rules. |
| Yiddish (`yi`) | Hebr | C / [yiddish](#profile-yiddish) | G, N | Use Yiddish-specific digraph/pointing rules under the selected standard; narrow exceptions such as traditionally Hebrew-spelled forenames may need a dictionary. Do not require a lexicon for every Hebrew-derived word. |
| Yoruba (`yo`) | Latn | A / [latin](#profile-latin) | G, N, A | Yoruba is already Latin. Tone and underdot distinctions should be preserved unless the caller explicitly requests lossy ASCII output. |
| Yucatec Maya (`yua`) | Latn | A / [latin](#profile-latin) | G, N, A | Yucatec Maya is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Zapotec (`zap`) | Latn | A / [latin](#profile-latin) | G | Zapotec is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |
| Zulu (`zu`) | Latn | A / [latin](#profile-latin) | G, N, L, A | Zulu is Latin-script in this catalog's default profile. Preserve its spelling; apply any ASCII folding only under an explicit locale/output policy. |

Catalog abbreviations: **G** Google consumer; **N** Google Cloud NMT; **L** Google Cloud Translation LLM (official/experimental status in CSV); **A** Azure live translation API. These letters indicate translation catalog membership, not romanization endpoint support.

## Method profiles and primary evidence

<a id="profile-latin"></a>

### Already Latin: preserve spelling; optional locale-aware ASCII folding

**Class A; 206 catalog entries.**

**Orthographic method:** NFC normalization and identity; optional explicit character-to-string folding for an ASCII slug.

**Recommended readable method:** Preserve the existing Latin spelling, including meaningful marks where the output contract permits.

**NLP requirement:** No for romanization; pronunciation/IPA transcription would be a different task.

**Mapping shape:** Identity for normalized Latin spelling; ASCII folding is often one-to-many or many-to-one.

**Implementation:** Unicode normalization plus small locale-specific tables; no neural model.

**Limits:** Do not replace normal Latin spelling with English phonetics. Diacritics, tone marks, apostrophes and case can distinguish words. A language can use additional scripts even when CLDR's default is Latin.

Primary sources: [Source 1](https://www.unicode.org/reports/tr15/), [Source 2](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Acehnese (`ace`), Acholi (`ach`), Afar (`aa`), Afrikaans (`af`), Albanian (`sq`), Alur (`alz`), Aymara (`ay`), Azerbaijani (`az`), Balinese (`ban`), Bambara (`bm`), Baoulé (`bci`), Basque (`eu`), Batak Karo (`btx`), Batak Simalungun (`bts`), Batak Toba (`bbc`), Bemba (`bem`), Betawi (`bew`), Bikol (`bik`), Bosnian (`bs`), Breton (`br`), Catalan (`ca`), Cebuano (`ceb`), Chamorro (`ch`), Chichewa (`ny`), Chuukese (`chk`), Corsican (`co`), Crimean Tatar (Latin) (`crh-Latn`), Croatian (`hr`), Czech (`cs`), Danish (`da`), Dinka (`din`), Dombe (`dov`), Dutch (`nl`), Dutch (Belgium) (`nl-BE`), Dyula (`dyu`), English (`en`), English (Australia) (`en-AU`), English (Canada) (`en-CA`), English (New Zealand) (`en-NZ`), English (Philippines) (`en-PH`), English (South Africa) (`en-ZA`), English (United Kingdom) (`en-GB`), English (United States) (`en-US`), Esperanto (`eo`), Estonian (`et`), Ewe (`ee`), Faroese (`fo`), Fijian (`fj`), Filipino (`fil`), Finnish (`fi`), Fon (`fon`), French (`fr`), French (Canada) (`fr-CA`), French (French) (`fr-FR`), French (Switzerland) (`fr-CH`), Frisian (`fy`), Friulian (`fur`), Fulani (`ff`), Ga (`gaa`), Galician (`gl`), German (`de`), Guarani (`gn`), Haitian Creole (`ht`), Hakha Chin (`cnh`), Hausa (`ha`), Hawaiian (`haw`), Hiligaynon (`hil`), Hmong (`hmn`), Hmong Daw (`mww-Latn`), Hungarian (`hu`), Hunsrik (`hrx`), Iban (`iba`), Icelandic (`is`), Igbo (`ig`), Ilocano (`ilo`), Indonesian (`id`), Inuinnaqtun (`ikt`), Inuktut (Latin) (`iu-Latn`), Irish (`ga`), Italian (`it`), Jamaican Patois (`jam`), Javanese (`jv`), Jingpo (`kac`), Kalaallisut (`kl`), Kanuri (`kr`), Kapampangan (`pam`), Khasi (`kha`), Kiga (`cgg`), Kikongo (`kg`), Kinyarwanda (`rw`), Kituba (`ktu`), Klingon (Latin) (`tlh-Latn`), Kokborok (`trp`), Krio (`kri`), Kurdish (Kurmanji) (`kmr`), Latgalian (`ltg`), Latin (`la`), Latvian (`lv`), Ligurian (`lij`), Limburgish (`li`), Lingala (`ln`), Lithuanian (`lt`), Lombard (`lmo`), Lower Sorbian (`dsb`), Luganda (`lg`), Luo (`luo`), Luxembourgish (`lb`), Madurese (`mad`), Makassar (`mak`), Malagasy (`mg`), Malay (`ms`), Maltese (`mt`), Mam (`mam`), Manx (`gv`), Maori (`mi`), Marshallese (`mh`), Mauritian Creole (`mfe`), Minang (`min`), Mizo (`lus`), Nahuatl (Eastern Huasteca) (`nhe`), Ndau (`ndc-ZW`), Ndebele (South) (`nr`), Norwegian (`no`), Norwegian Bokmal (`nb`), Nuer (`nus`), Occitan (`oc`), Oromo (`om`), Pangasinan (`pag`), Papiamento (`pap`), Polish (`pl`), Portuguese (`pt`), Portuguese (Brazil) (`pt-BR`), Portuguese (Portugal) (`pt-PT`), Quechua (`qu`), Querétaro Otomi (`otq`), Qʼeqchiʼ (`kek`), Romani (`rom`), Romanian (`ro`), Rundi (`rn`), Sami (North) (`se`), Samoan (`sm`), Sango (`sg`), Santali (Latin) (`sat-Latn`), Scots Gaelic (`gd`), Sepedi (`nso`), Serbian (Latin) (`sr-Latn`), Sesotho (`st`), Seychellois Creole (`crs`), Shona (`sn`), Sicilian (`scn`), Silesian (`szl`), Slovak (`sk`), Slovenian (`sl`), Somali (`so`), Spanish (`es`), Spanish (Argentina) (`es-AR`), Spanish (Chile) (`es-CL`), Spanish (Colombia) (`es-CO`), Spanish (Costa Rica) (`es-CR`), Spanish (Ecuador) (`es-EC`), Spanish (El Salvador) (`es-SV`), Spanish (Guatemala) (`es-GT`), Spanish (Haiti) (`es-HT`), Spanish (Honduras) (`es-HN`), Spanish (Latin America) (`es-419`), Spanish (Mexico) (`es-MX`), Spanish (Nicaragua) (`es-NI`), Spanish (Panama) (`es-PA`), Spanish (Paraguay) (`es-PY`), Spanish (Peru) (`es-PE`), Spanish (Puerto Rico) (`es-PR`), Spanish (Spain) (`es-ES`), Spanish (United States) (`es-US`), Spanish (Uruguay) (`es-UY`), Spanish (Venezuela) (`es-VE`), Sundanese (`su`), Susu (`sus`), Swahili (`sw`), Swati (`ss`), Swedish (`sv`), Tahitian (`ty`), Tamazight (`ber-Latn`), Tetum (`tet`), Tiv (`tiv`), Tok Pisin (`tpi`), Tongan (`to`), Tshiluba (`lua`), Tsonga (`ts`), Tswana (`tn`), Tumbuka (`tum`), Turkish (`tr`), Turkmen (`tk`), Twi (`ak`), Upper Sorbian (`hsb`), Uzbek (`uz`), Venda (`ve`), Venetian (`vec`), Vietnamese (`vi`), Waray (`war`), Welsh (`cy`), Wolof (`wo`), Xhosa (`xh`), Yoruba (`yo`), Yucatec Maya (`yua`), Zapotec (`zap`), Zulu (`zu`).

<a id="profile-cyrillic"></a>

### Cyrillic: language-specific letter-to-string maps plus finite context

**Class B; 28 catalog entries.**

**Orthographic method:** Select a named language/standard table; normalize combining signs, match multigraphs where applicable, preserve case and soft/hard signs according to that standard.

**Recommended readable method:** Use a language-specific practical romanization; add finite word-position/context rules. Lexical pronunciation belongs in an optional separate profile.

**NLP requirement:** No for standard spelling romanization; optional lexicon for pronunciation and conventional proper names.

**Mapping shape:** Frequently character-to-string, not strict one-to-one; some schemes need digraph/context rules.

**Implementation:** Compiled tables or finite-state transducer; language-specific ICU/CLDR rules where verified.

**Limits:** The same Cyrillic letter can have different outputs across languages. A standard orthographic transform cannot reconstruct omitted distinctions or stress. Latin-to-Cyrillic ambiguity is a separate problem.

Primary sources: [Source 1](https://www.iso.org/standard/3589.html), [Source 2](https://www.loc.gov/catdir/cpso/romanization/nonslav.pdf), [Source 3](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Abkhaz (`ab`), Avar (`av`), Bashkir (`ba`), Belarusian (`be`), Bosnian (Cyrillic) (`bs-Cyrl`), Bulgarian (`bg`), Buryat (`bua`), Chechen (`ce`), Chuvash (`cv`), Crimean Tatar (`crh`), Crimean Tatar (Cyrillic) (`crh-Cyrl`), Kazakh (`kk`), Komi (`kv`), Kyrgyz (`ky`), Macedonian (`mk`), Meadow Mari (`chm`), Mongolian (`mn`), Mongolian (Cyrillic) (`mn-Cyrl`), Ossetian (`os`), Russian (`ru`), Serbian (`sr`), Serbian (Cyrillic) (`sr-Cyrl`), Tajik (`tg`), Tatar (`tt`), Tuvan (`tyv`), Udmurt (`udm`), Ukrainian (`uk`), Yakut (`sah`).

<a id="profile-greek"></a>

### Greek: standard-aware contextual rules

**Class C; 1 catalog entries.**

**Orthographic method:** Apply the selected ELOT/ISO or bibliographic spelling scheme, including combining accents and digraph rules.

**Recommended readable method:** Finite context for practical Modern Greek romanization; distinguish ancient/polytonic input and conventional names.

**NLP requirement:** No learned model for the standard baseline; optional name overrides.

**Mapping shape:** No: digraphs and context-sensitive combinations.

**Implementation:** Finite-state rules plus explicit Modern/Ancient policy.

**Limits:** A transliteration standard and a full phonetic transcription are different contracts.

Primary sources: [Source 1](https://www.iso.org/standard/5215.html), [Source 2](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Greek (`el`).

<a id="profile-armenian"></a>

### Armenian: orthographic tables with ligature and variety handling

**Class C; 1 catalog entries.**

**Orthographic method:** Normalize ligatures and combining forms, then apply a named Armenian romanization table.

**Recommended readable method:** Select Eastern/Western Armenian pronunciation policy explicitly; add finite contextual rules and conventional-name overrides.

**NLP requirement:** No for bibliographic spelling; pronunciation needs variety information and possibly a lexicon.

**Mapping shape:** Not uniformly: multigraphs/ligatures and scheme-dependent outputs.

**Implementation:** Table plus longest-match/context rules; separate variety option.

**Limits:** The generic language code does not identify Eastern versus Western pronunciation.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/roman.html), [Source 2](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Armenian (`hy`).

<a id="profile-georgian"></a>

### Georgian: small standard-specific mapping

**Class B; 1 catalog entries.**

**Orthographic method:** Normalize script/case forms and use the chosen Georgian-to-Latin table.

**Recommended readable method:** Use the selected practical scheme, preserving its ejective/distinction markers.

**NLP requirement:** No for standard romanization.

**Mapping shape:** Character-to-string mapping; some letters become multicharacter Latin sequences.

**Implementation:** Small tables and Unicode case/script normalization.

**Limits:** ASCII punctuation removal can destroy distinctions in the selected scheme.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/roman.html), [Source 2](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Georgian (`ka`).

<a id="profile-arabic-missing-vowels"></a>

### Arabic-derived scripts with missing vowels: separate spelling from pronunciation

**Class D; 11 catalog entries.**

**Orthographic method:** Normalize presentation forms and combining marks conservatively; apply a language-specific spelling transliteration table without inventing omitted vowels.

**Recommended readable method:** Tokenization, morphology/lexical readings and contextual vowel prediction, followed by deterministic romanization; use a compact specialist model when it improves held-out accuracy.

**NLP requirement:** Yes for inferred-vowel readable output; no for source-faithful spelling conversion.

**Mapping shape:** Possible only for a spelling representation; source text may not contain enough information for one unique spoken reading.

**Implementation:** Rules plus language-specific lexicon/morphology and optional small contextual model; expose spelling and pronunciation modes separately.

**Limits:** Dialect, names, loanwords and short inputs remain ambiguous. Arabic rules must not be reused unchanged for Persian, Urdu, Pashto, Sindhi or other languages.

Primary sources: [Source 1](https://camel-tools.readthedocs.io/en/latest/cli/camel_transliterate.html), [Source 2](https://camel-tools.readthedocs.io/en/latest/api/disambig/bert.html), [Source 3](https://www.loc.gov/catdir/cpso/roman.html).

Entries: Arabic (`ar`), Arabic (Saudi Arabia) (`ar-SA`), Baluchi (`bal`), Dari (`fa-AF`), Kashmiri (`ks`), Pashto (`ps`), Persian (`fa`), Punjabi (Pakistan) (`pa-PK`), Punjabi (Shahmukhi) (`pa-Arab`), Sindhi (`sd`), Urdu (`ur`).

<a id="profile-arabic-vowels-written"></a>

### Arabic-derived alphabets that explicitly encode most vowels

**Class C; 2 catalog entries.**

**Orthographic method:** Language-specific letter-to-string mapping with finite rules for vowel carriers, joins and combining marks.

**Recommended readable method:** Use the selected Latin orthography; add exceptions for loans and names if required.

**NLP requirement:** No learned model as the baseline; optional lexicon for exceptional readings.

**Mapping shape:** Mostly table-driven, with context/normalization rather than a universal Arabic mapping.

**Implementation:** Tables and a small finite-state rule layer.

**Limits:** This profile applies to the identified language and orthography, not to all Arabic-script text.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/uighur.pdf), [Source 2](https://assets.publishing.service.gov.uk/media/636cd877e90e07618b9f499c/ROMANIZATION_OF_KURDISH_2022.pdf).

Entries: Kurdish (Sorani) (`ckb`), Uyghur (`ug`).

<a id="profile-jawi"></a>

### Malay Jawi: spelling conversion plus lexical vowel recovery

**Class D; 1 catalog entries.**

**Orthographic method:** Map Jawi-specific letters and preserve the vowels actually written.

**Recommended readable method:** Recover standard Rumi word spellings using a Malay lexicon and contextual disambiguation; train a small model only after assessing dictionary/rule baselines.

**NLP requirement:** Lexical/contextual processing for conventional Rumi output; no for a literal spelling representation.

**Mapping shape:** No for standard Malay word spellings because Jawi does not uniquely spell out every Rumi vowel.

**Implementation:** Jawi-specific normalization and mapping, lexicon, optional sequence model.

**Limits:** A generic Arabic romanizer will mishandle additional Jawi letters and missing-vowel choices.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/roman.html).

Entries: Malay (Jawi) (`ms-Arab`).

<a id="profile-hebrew"></a>

### Hebrew: pointed spelling rules; lexical/contextual readings for unpointed text

**Class D; 1 catalog entries.**

**Orthographic method:** Map consonants and written niqqud under a named scheme, with combining-mark normalization.

**Recommended readable method:** Use word readings/morphology and a vowel-restoration model or lexicon for unpointed text; then render the chosen romanization standard.

**NLP requirement:** Yes for reliable inferred pronunciation of unpointed words; no for consonantal spelling conversion.

**Mapping shape:** No for readable output: vowels and some pronunciation distinctions may be absent.

**Implementation:** Rules plus lexicon/context model; proper-name override support.

**Limits:** A chosen name spelling can be conventional rather than mechanically recoverable.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/hebrew.pdf).

Entries: Hebrew (`he`).

<a id="profile-yiddish"></a>

### Yiddish: standard-specific digraph rules with limited lexical exceptions

**Class C; 1 catalog entries.**

**Orthographic method:** Normalize pointing and longest-match Yiddish letter combinations under the selected standard.

**Recommended readable method:** Apply the selected standard's Yiddish rules; use a dictionary/list for traditionally Hebrew-spelled forenames and other demonstrated exceptions.

**NLP requirement:** No learned model for the standard rule-first baseline; narrow lexical exceptions may need a dictionary.

**Mapping shape:** No: longest-match digraph/pointing rules and limited lexical exceptions.

**Implementation:** Finite-state rules plus a curated name/exception layer.

**Limits:** ALA-LC's standardized Yiddish table ignores etymology; do not require a lexicon for the whole Hebrew/Aramaic-derived component. Other pronunciation targets may choose different rules.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/hebrew.pdf), [Source 2](https://www.loc.gov/aba/publications/FreeCSB/CSB_099.pdf).

Entries: Yiddish (`yi`).

<a id="profile-indic-lexical"></a>

### Indic abugidas: deterministic spelling transliteration; language-specific reading rules

**Class D; 19 catalog entries.**

**Orthographic method:** Parse orthographic syllables: consonants, dependent vowels, virama, conjuncts, nukta and nasal signs; render a named scheme.

**Recommended readable method:** Apply the language's inherent-vowel/schwa behavior, syllable rules and lexical exceptions; morphology or a small G2P model where validated.

**NLP requirement:** Language-specific rules and often lexicon/morphology for pronunciation; no learned model required for structural spelling transliteration.

**Mapping shape:** No: consonant-vowel state, combining signs and conjuncts require an algorithm.

**Implementation:** Shared script parser plus separate language phonology profiles; optional compact G2P.

**Limits:** A Hindi schwa-deletion rule is not a universal Devanagari or Indic rule. Low-resource languages require native review and language-specific evidence before a pronunciation guarantee.

Primary sources: [Source 1](https://www.iso.org/standard/28333.html), [Source 2](https://www.loc.gov/catdir/cpso/roman.html), [Source 3](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Assamese (`as`), Awadhi (`awa`), Bengali (`bn`), Bengali (India) (`bn-IN`), Bhojpuri (`bho`), Bodo (`brx`), Chhattisgarhi (`hne`), Dogri (`doi`), Gujarati (`gu`), Hindi (`hi`), Konkani (`gom`), Maithili (`mai`), Marathi (`mr`), Marwadi (`mwr`), Nepalbhasa (Newari) (`new`), Nepali (`ne`), Odia (Oriya) (`or`), Punjabi (Gurmukhi) (`pa`), Tamil (`ta`).

<a id="profile-indic-structural"></a>

### Indic abugidas with a rule-first romanization baseline

**Class C; 5 catalog entries.**

**Orthographic method:** Parse consonant-vowel sequences, virama/conjuncts, vowel marks and orthographic variants before Latin rendering.

**Recommended readable method:** Use language-specific contextual phonology; add a lexicon/model only for measured exceptions or pronunciation requirements.

**NLP requirement:** No learned model for conservative standard romanization; optional lexical processing for fuller pronunciation.

**Mapping shape:** No: syllable and combining-sign algorithms are needed.

**Implementation:** Script parser and finite-state language rules; optional name exceptions.

**Limits:** The script parser can be shared, but each language's reading rules and standard must be separate.

Primary sources: [Source 1](https://www.iso.org/standard/28333.html), [Source 2](https://www.loc.gov/catdir/cpso/roman.html), [Source 3](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Kannada (`kn`), Malayalam (`ml`), Sinhala (`si`), Telugu (`te`), Tulu (`tcy`).

<a id="profile-sanskrit"></a>

### Sanskrit: structural conversion to IAST or another named scheme

**Class C; 1 catalog entries.**

**Orthographic method:** Parse Devanagari vowel/consonant state, virama, conjuncts and Vedic/combining signs; render IAST or a selected alternative.

**Recommended readable method:** Preserve the written Sanskrit forms under the chosen standard; splitting sandhi or recovering words is an optional separate analysis.

**NLP requirement:** No for standard written transliteration; sandhi segmentation is a different NLP feature.

**Mapping shape:** No code-point substitution: inherent vowels and combining signs require state.

**Implementation:** Indic structural transliterator with Sanskrit-specific conventions.

**Limits:** Keep diacritics for scholarly output; ASCII modes are alternate schemes, not reversible accent stripping.

Primary sources: [Source 1](https://www.iso.org/standard/28333.html), [Source 2](https://www.loc.gov/catdir/cpso/roman.html), [Source 3](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Sanskrit (`sa`).

<a id="profile-ethiopic"></a>

### Ethiopic: syllable tables with language-specific conventions

**Class C; 2 catalog entries.**

**Orthographic method:** Map the encoded syllabic series/order, punctuation and numerals using the language's standard.

**Recommended readable method:** Add sixth-order vowel/zero-vowel and other language-specific conventions; lexical information is needed if unmarked gemination/full pronunciation must be reconstructed.

**NLP requirement:** No learned model for standard spelling romanization; lexical/phonological layer for fuller pronunciation.

**Mapping shape:** Syllable-to-string table plus rules, not letter-to-letter.

**Implementation:** Compact syllabary map with separate Amharic/Tigrinya profiles.

**Limits:** Shared Ethiopic characters do not make Amharic and Tigrinya pronunciation identical.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/roman.html).

Entries: Amharic (`am`), Tigrinya (`ti`).

<a id="profile-mandarin"></a>

### Mandarin option when selected: word readings and polyphone disambiguation

**Class D; 2 catalog entries.**

**Orthographic method:** A character-reading fallback is possible but is not a reliable word pronunciation; choose the reading language explicitly.

**Recommended readable method:** Mandarin phrase/word readings plus polyphone disambiguation and a deterministic Hanyu Pinyin renderer; optional tone and word-boundary policies.

**NLP requirement:** Lexical/contextual reading selection; a small classifier is an appropriate candidate.

**Mapping shape:** No: Han characters can have multiple readings, and word boundaries/readings require context.

**Implementation:** Phrase lexicon plus compact polyphone model; deterministic Pinyin formatting.

**Limits:** Use for zh-CN/zh-TW in this report is conditional on an explicitly selected Mandarin reading profile, not inferred solely from locale. Hans/Hant identifies writing form, not spoken language. Names/regional readings need overrides. Simplified/traditional conversion is separate.

Primary sources: [Source 1](https://www.iso.org/standard/61420.html), [Source 2](https://github.com/kakaobrain/g2pM), [Source 3](https://github.com/mozillazg/python-pinyin), [Source 4](https://github.com/BYVoid/OpenCC).

Entries: Chinese (Simplified) (`zh-CN`), Chinese (Traditional) (`zh-TW`).

<a id="profile-cantonese"></a>

### Cantonese Han text: Cantonese readings and a chosen standard

**Class D; 1 catalog entries.**

**Orthographic method:** Select Cantonese lexical readings; generic Mandarin character data is unsuitable.

**Recommended readable method:** Cantonese word/phrase lexicon and contextual pronunciation selection followed by a Jyutping or selected-standard renderer.

**NLP requirement:** Lexical/contextual processing; specialist model optional after a lexicon baseline.

**Mapping shape:** No for contextually correct readings.

**Implementation:** Cantonese-specific data and disambiguation, shared Han segmentation infrastructure where useful.

**Limits:** Traditional Chinese characters do not imply Cantonese; explicit yue/romanization selection is required.

Primary sources: [Source 1](https://jyutping.org/en/), [Source 2](https://www.loc.gov/catdir/cpso/roman.html).

Entries: Cantonese (`yue`).

<a id="profile-han-policy"></a>

### Han language/reading policy must be selected

**Class D; 5 catalog entries.**

**Orthographic method:** Preserve written text or require a reading-language/profile selection before pronunciation romanization.

**Recommended readable method:** Route to Mandarin, Cantonese, another reading tradition, or a Literary Chinese profile according to an explicit contract.

**NLP requirement:** Lexicon/context after selecting the reading language; language choice is not recoverable from script alone.

**Mapping shape:** No universal Han-to-Latin mapping.

**Implementation:** Explicit profile routing, language-specific lexicons and compact reading models.

**Limits:** A locale such as Hong Kong or a Literary Chinese label does not uniquely determine the intended pronunciation system.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/roman.html), [Source 2](https://jyutping.org/en/), [Source 3](https://github.com/kakaobrain/g2pM).

Entries: Chinese (`zh`), Chinese (Hong Kong) (`zh-HK`), Chinese (Literary) (`lzh`), Chinese (Simplified) (`zh-Hans`), Chinese (Traditional) (`zh-Hant`).

<a id="profile-japanese"></a>

### Japanese: morphological readings, then kana romanization

**Class D; 1 catalog entries.**

**Orthographic method:** Kana-to-Latin is algorithmic; arbitrary Kanji cannot be assigned reliable readings by a character table.

**Recommended readable method:** Morphological tokenizer with lexical readings, name handling and optional disambiguation; then render Hepburn or another chosen scheme with long-vowel/gemination rules.

**NLP requirement:** Lexicon/morphological analysis for Kanji; no learned model necessary for kana-only input.

**Mapping shape:** No for Kanji text; kana uses multi-character/context rules.

**Implementation:** Sudachi/MeCab-class reading pipeline plus deterministic kana renderer; user-provided readings for names.

**Limits:** Names and unusual readings can remain unresolved even with a large dictionary; accept reading overrides rather than claiming certainty.

Primary sources: [Source 1](https://github.com/WorksApplications/SudachiPy), [Source 2](https://www.loc.gov/catdir/cpso/romanization/japanese.pdf), [Source 3](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/roma/index2.html).

Entries: Japanese (`ja`).

<a id="profile-korean"></a>

### Korean: Hangul decomposition and standard-specific sound rules

**Class C; 1 catalog entries.**

**Orthographic method:** Decompose Hangul syllables/Jamo consistently, then apply the selected spelling/romanization standard.

**Recommended readable method:** Apply Revised Romanization-specific contextual rules and boundary/morphology handling; resolve Hanja with Korean lexical readings when present.

**NLP requirement:** Rules first for Hangul; morphology/lexicon for exceptional boundaries, Hanja and conventional names.

**Mapping shape:** No: syllable decomposition and cross-syllable rules.

**Implementation:** Algorithmic Hangul core plus finite-state RR rules and optional lexical analysis.

**Limits:** A general phonetic G2P output is not automatically Revised Romanization. A Hangul implementation does not cover all Hanja under composite script Kore.

Primary sources: [Source 1](https://www.korean.go.kr/front_eng/roman/roman_01.do), [Source 2](https://github.com/Kyubyong/g2pK).

Entries: Korean (`ko`).

<a id="profile-thai"></a>

### Thai: segmentation and lexical pronunciation

**Class D; 1 catalog entries.**

**Orthographic method:** A reversible spelling scheme can be rule-based, but should not be labeled readable RTGS pronunciation.

**Recommended readable method:** Word/syllable segmentation, lexical pronunciations and contextual reading followed by RTGS rendering; compare dictionary and compact neural engines.

**NLP requirement:** Lexical/segmentation processing for reliable readable output; learned model optional.

**Mapping shape:** No: vowel placement, syllable structure, silent letters and lexical readings.

**Implementation:** PyThaiNLP-style tokenizer and pronunciation engine; evaluate thai2rom/ONNX against rule baselines.

**Limits:** RTGS omits distinctions such as tone and is not a reversible source encoding. Names can use conventional spellings.

Primary sources: [Source 1](https://pythainlp.org/docs/5.1/api/transliterate.html), [Source 2](https://assets.publishing.service.gov.uk/media/5ab4e60aed915d78b9a459f5/ROMANIZATION_OF_THAI.pdf).

Entries: Thai (`th`).

<a id="profile-lao"></a>

### Lao: syllable rules with lexical exception handling

**Class D; 1 catalog entries.**

**Orthographic method:** Use a named spelling romanization with consonant/vowel-order and syllable rules.

**Recommended readable method:** Language-specific syllable/word segmentation and pronunciation rules, with a lexicon for exceptions and ambiguous boundaries.

**NLP requirement:** Rules plus segmentation/lexicon for reliable readable output; a neural model is not established as mandatory.

**Mapping shape:** No: distributed vowel signs and syllable structure.

**Implementation:** Finite-state syllable parser and Lao pronunciation lexicon; train a small model only for remaining errors.

**Limits:** Do not apply Thai rules unchanged. Standard choice and tone preservation must be explicit.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/lao.pdf).

Entries: Lao (`lo`).

<a id="profile-khmer"></a>

### Khmer: orthographic syllables, register and lexical readings

**Class D; 1 catalog entries.**

**Orthographic method:** Parse base/subscript consonants, vowel signs, series/register and modifiers using a named spelling scheme.

**Recommended readable method:** Combine syllable/register rules with word readings and exceptions; evaluate a specialist G2P model if lexical coverage is insufficient.

**NLP requirement:** Rules plus lexicon/segmentation for pronunciation-oriented output.

**Mapping shape:** No: consonant series changes vowel interpretation and words can have irregular readings.

**Implementation:** Khmer-specific orthographic parser plus lexical pronunciation layer.

**Limits:** A generic Brahmic/Indic transform is not a complete Khmer pronunciation engine.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/roman.html).

Entries: Khmer (`km`).

<a id="profile-myanmar"></a>

### Myanmar/Burmese: structural spelling versus spoken readings

**Class D; 1 catalog entries.**

**Orthographic method:** Normalize encoding under an explicit policy, parse orthographic syllables and render MLCTS or another named spelling scheme.

**Recommended readable method:** Use Burmese lexical pronunciation and contextual syllable/tone rules; consider compact G2P for vocabulary generalization.

**NLP requirement:** Lexicon/context for spoken-style romanization; rules for spelling conversion.

**Mapping shape:** No: syllables, medials, combining signs and historical spellings.

**Implementation:** Myanmar-specific parser, lexical readings and optional compact model.

**Limits:** Zawgyi-to-Unicode detection/conversion is a separate preprocessing feature. Shared script does not permit reuse of Burmese phonology for Shan.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/burmese.pdf), [Source 2](https://github.com/google/myanmar-tools).

Entries: Myanmar (Burmese) (`my`).

<a id="profile-shan"></a>

### Shan: language-specific syllable and tone rules

**Class C; 1 catalog entries.**

**Orthographic method:** Map Shan-specific letters and tone/vowel marks with syllable-aware ordering under a chosen scheme.

**Recommended readable method:** Apply Shan-specific readings and exceptions; evaluate lexical needs on native data before promising pronunciation coverage.

**NLP requirement:** Rule-first baseline; lexical pronunciation requirements need language-specific validation.

**Mapping shape:** No: syllabic context and combining signs.

**Implementation:** Shan tables and finite-state syllable rules; no default Burmese reading model.

**Limits:** A script-family inference supports implementation direction, not an accuracy claim for all Shan text.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/shan.pdf).

Entries: Shan (`shn`).

<a id="profile-tibetan"></a>

### Tibetan Wylie spelling: stack parsing, with separate phonetic readings

**Class D; 1 catalog entries.**

**Orthographic method:** Use the explicitly selected Tibetan Wylie scheme and parse stacked letters consistently; an extended Wylie scheme must be separately specified if offered.

**Recommended readable method:** Select language/dialect, then use syllable/word lexicons and pronunciation rules or a specialist model.

**NLP requirement:** No for structural spelling conversion; lexical/contextual processing for pronunciation.

**Mapping shape:** No: stacks and historical spelling-to-speech differences.

**Implementation:** Rule-based stack parser plus a separately selected Tibetan dialect/pronunciation layer.

**Limits:** Wylie is not a phonetic spelling. Wylie and extended Wylie are distinct output contracts. Dzongkha has a separate profile despite sharing the script.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/tibetan.pdf), [Source 2](https://arhiiv.eki.ee/wgrs/).

Entries: Tibetan (`bo`).

<a id="profile-dzongkha"></a>

### Dzongkha: Roman Dzongkha convention with lexical pronunciation work

**Class D; 1 catalog entries.**

**Orthographic method:** Parse the Tibetan-derived Dzongkha orthography with a declared spelling scheme; share only the low-level stack parser where appropriate.

**Recommended readable method:** Select the Dzongkha-specific Roman Dzongkha convention and supply Dzongkha lexical/phonological readings rather than Tibetan Wylie strings.

**NLP requirement:** Lexical/phonological processing for readable pronunciation; no general LLM is established as necessary.

**Mapping shape:** No: historical/stacked orthography does not directly spell every modern spoken form.

**Implementation:** Dzongkha-specific rules and reading data, with optional compact G2P if evaluation justifies it.

**Limits:** The named geographic romanization source has a bounded scope; native-reviewed ordinary-text and name coverage remains necessary. Do not treat a Tibetan pronunciation model as a Dzongkha model.

Primary sources: [Source 1](https://arhiiv.eki.ee/wgrs/v2_2/rom2_dz.htm), [Source 2](https://www.loc.gov/catdir/cpso/roman.html).

Entries: Dzongkha (`dz`).

<a id="profile-traditional-mongolian"></a>

### Traditional Mongolian: structural spelling with separate lexical reading conversion

**Class D; 1 catalog entries.**

**Orthographic method:** Map abstract letters under a chosen scheme; process variation selectors, joiners and suffix boundaries explicitly.

**Recommended readable method:** Use Mongolian lexical/morphological information for modern pronunciation or Cyrillic correspondence; do not conflate glyph shaping and pronunciation.

**NLP requirement:** No for source-spelling romanization; lexical/morphological processing for modern readable forms.

**Mapping shape:** Not uniformly: control characters, variants and historical spelling.

**Implementation:** Mongolian-specific structural rules plus optional lexical converter.

**Limits:** This is distinct from straightforward Cyrillic Mongolian romanization.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/mongolian.pdf), [Source 2](https://unicode-org.github.io/icu/userguide/transforms/general/).

Entries: Mongolian (Traditional) (`mn-Mong`).

<a id="profile-syllabics"></a>

### Inuktitut syllabics: deterministic syllable-to-Latin conversion

**Class C; 1 catalog entries.**

**Orthographic method:** Map syllables and final consonants, vowel length and n/ng/nng sequences using the selected regional orthography.

**Recommended readable method:** Use the corresponding standard Latin orthography; select dialect/region explicitly for orthographic differences.

**NLP requirement:** No learned model for the script conversion baseline.

**Mapping shape:** Syllable-to-string plus sequence rules, not letter-to-letter.

**Implementation:** Tables and longest-match rules with explicit regional variants.

**Limits:** Script conversion does not translate between Inuit language varieties or reconstruct a preferred personal-name spelling.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/inuktitut.pdf), [Source 2](https://www.unicode.org/versions/latest/).

Entries: Inuktut (Syllabics) (`iu-Cans`).

<a id="profile-thaana"></a>

### Dhivehi Thaana: consonant/vowel-mark algorithm

**Class C; 1 catalog entries.**

**Orthographic method:** Combine consonant letters with written vowel signs/sukun and apply the selected Dhivehi romanization scheme.

**Recommended readable method:** Language-specific contextual rules and conventional-name exceptions as needed.

**NLP requirement:** No learned model for standard spelling conversion.

**Mapping shape:** No: base letters plus combining vowel/absence-of-vowel marks.

**Implementation:** Small tables and vowel-state rules.

**Limits:** Although written right-to-left, Thaana is not an Arabic-script transform.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/divehi.pdf), [Source 2](https://www.unicode.org/versions/latest/).

Entries: Dhivehi (`dv`).

<a id="profile-meetei"></a>

### Meetei Mayek: structural conversion with language-specific finals

**Class C; 1 catalog entries.**

**Orthographic method:** Map letters, dependent vowels, lonsum/final forms and punctuation under a selected scheme.

**Recommended readable method:** Apply Meitei syllable/reading conventions; add lexical exceptions only where required by evaluation.

**NLP requirement:** No learned model for structural romanization; pronunciation coverage requires native validation.

**Mapping shape:** No: dependent signs and final forms require rules.

**Implementation:** Meetei-specific parser/table; separate Bengali-script Meitei input mode.

**Limits:** Do not silently apply Bengali-language pronunciation to Bengali-script Meitei.

Primary sources: [Source 1](https://www.unicode.org/versions/latest/), [Source 2](https://www.loc.gov/catdir/cpso/roman.html).

Entries: Meiteilon (Manipuri) (`mni-Mtei`).

<a id="profile-ol-chiki"></a>

### Santali Ol Chiki: alphabetic mapping and modifier rules

**Class C; 1 catalog entries.**

**Orthographic method:** Map Ol Chiki letters and phonetic modifiers under a chosen Santali Latin scheme.

**Recommended readable method:** Preserve the selected Santali spelling conventions and significant marks.

**NLP requirement:** No learned model for a standard script conversion baseline.

**Mapping shape:** Mostly letter-to-string with modifier sequences.

**Implementation:** Small table and sequence rules; separate from Santali Latin identity profile.

**Limits:** Do not handle Ol Chiki as a Devanagari-style inherent-vowel script.

Primary sources: [Source 1](https://www.unicode.org/versions/latest/), [Source 2](https://www.loc.gov/catdir/cpso/romanization/santali.pdf).

Entries: Santali (Ol Chiki) (`sat-Olck`).

<a id="profile-nko"></a>

### NKo: alphabetic conversion with combining tone/length marks

**Class C; 1 catalog entries.**

**Orthographic method:** Normalize letters and combining marks, then apply a named NKo-to-Latin table preserving its tone/length policy.

**Recommended readable method:** Use the chosen Manding language and Latin orthography where language-specific formatting differs.

**NLP requirement:** No learned model for source-script conversion; explicit underlying-language policy may be needed.

**Mapping shape:** Not strictly: marks and multicharacter outputs; reverse conversion can be ambiguous.

**Implementation:** Table plus combining-mark and sequence rules.

**Limits:** Google's bm-Nkoo label is a vendor catalog entry, not proof that NKo is a separate spoken language. The LOC table is not designed to be reversible.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/mandekan-nko-2026.pdf).

Entries: NKo (`bm-Nkoo`).

<a id="profile-tifinagh"></a>

### Tifinagh Tamazight: standard-specific alphabet mapping

**Class B; 1 catalog entries.**

**Orthographic method:** Use a selected IRCAM/ALA-LC-compatible alphabet table and normalize punctuation/combining sequences.

**Recommended readable method:** Use the selected Tamazight variety's Latin orthography; conventional-name exceptions are optional.

**NLP requirement:** No learned model for alphabetic romanization.

**Mapping shape:** Character-to-string baseline, with scheme-specific distinctions.

**Implementation:** Small mapping table with a declared variety and standard.

**Limits:** A Tamazight macrolabel does not identify every Amazigh variety or its exact spelling conventions.

Primary sources: [Source 1](https://www.loc.gov/catdir/cpso/romanization/tamazight.pdf).

Entries: Tamazight (Tifinagh) (`ber-Tfng`).

<a id="profile-piqad"></a>

### Klingon pIqaD: declared glyph/encoding conversion

**Class B; 1 catalog entries.**

**Orthographic method:** Require the precise vendor/private glyph encoding, then map to Klingon's Latin spelling.

**Recommended readable method:** Preserve the designed Klingon Latin orthography, including meaningful case and apostrophes.

**NLP requirement:** No language model for a declared glyph encoding conversion.

**Mapping shape:** Table-driven only after the encoding/font convention is known.

**Implementation:** Explicit encoding adapter and table; never guess arbitrary private-use glyph meanings.

**Limits:** The pIqaD mapping is not a universal Unicode character contract. Vendor translation support alone does not prove its public transliteration endpoint supports this conversion.

Primary sources: [Source 1](https://www.kli.org/about-klingon/writing-klingon/).

Entries: Klingon (pIqaD) (`tlh-Piqd`).

## Research depth and remaining uncertainty

Every saved vendor entry is assessed, but this is **not** a claim that 305 independent linguistic evaluations were performed. Latin entries are classified from their selected/default script and Unicode behavior. Other entries use authoritative script/romanization standards, language-specific notes, and tool documentation. The shared profiles identify reusable work without equating languages that share a script.

For lower-resource languages and dialects, a script standard is firmer evidence than a pronunciation model recommendation. Awadhi, Bodo, Chhattisgarhi, Dogri, Konkani, Maithili, Marwari, Newari, Tulu, Meitei, Shan and similar rows require native-reviewed fixtures and orthography selection before a readable-output quality promise. Candidate tools were researched, not all installed or benchmarked. No training, paid translation calls or language-output comparison against vendor services was performed.

The [companion source analysis](../2026-10-21-language-methods-sources.md) records finer standards details, including current Japanese government guidance, Indic scope exclusions, Sorani/Uyghur exceptions, and distinctions between spelling and speech.

## Reproduction and provenance

The collectors use only Python standard-library modules. `collect_sources.py` reuses saved inputs unless `--refresh` is supplied; refreshing deliberately changes the snapshot. `build_catalog.py` retains vendor rows/aliases and computes script assumptions. `build_report.py` applies the reviewed profile and per-language note files. `audit_inventory.py` checks inventory completeness, source hashes, aliases and report links; its [saved result](inventory-audit.json) is a data integrity audit, not an implementation test of transliteration quality.

```sh
python3 research/language-matrix-2026-10-21/collect_sources.py
python3 research/language-matrix-2026-10-21/build_catalog.py
python3 research/language-matrix-2026-10-21/build_report.py
python3 research/language-matrix-2026-10-21/audit_inventory.py
```
