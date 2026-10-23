# Independent challenge of alphabetic findings

Read-only review of alphabetic/findings.json against the locally saved Unicode 17 UnicodeData.txt. No sibling findings were modified.

All 28 listed character identities agree with Unicode 17. The five decomposition-based diagnoses are especially direct: Ý decomposes to Y plus acute; ǲ to D plus z; ʰ to h; lunate sigma to final sigma; and Cyrillic Ѐ to IE plus grave. The two decomposable case findings likewise preserve their underlying case. There is no credible ordinary phonetic scheme making Ý → U, ʰ → k, Ѐ → Jo, Lao TO → h, or the consonant swaps correct.

No purported fixed-string finding needs retraction based on this independent pass. Important qualifications:

- UnicodeData alone proves character identity, not common pronunciation. Assamese wa, Pashto letters, Bengali vocalic L, Thai initial/final readings, and Punjabi bha need the external language tables already cited by the first reviewer. I did not independently re-download every language table on this pass.
- Punjabi bha may have tone-related realized pronunciation in modern Punjabi; bh is an established transliteration convention. This does not rescue bb, but the report should not claim that everyone pronounces the letter as an aspirated bh sound.
- Case errors are library-consistency errors, not changed linguistic pronunciation. Lowercasing an entire romanization is a valid separate policy; this library otherwise preserves case.
- Empty Lao HO TAM, Pashto E, and Odia VA are missing mappings. Classify these separately from wrong existing nonempty readings. Odia VA has specialized/historical usage; an isolated universal spoken value was not established here.
- Arabic shadda and Gurmukhi addak require context to represent gemination. W and H can be retained as arbitrary encoding tokens only under an explicitly reversible/orthographic encoding contract; they are not common readable romanizations. Keep these in the context category.
- Thai lakkhangyao cannot generally be fixed by replacing ao with aa: the mark modifies the preceding syllabic-vowel sequence, so the contextual operation is the substantive recommendation.
- U+038E, U+01B1, Gujarati YA, and Devanagari DDDHA were appropriately retained as scheme/context/reviewer questions rather than universally invalid readings. U+095C has canonical decomposition to DDA plus nukta and represents a retroflex flap; r/rr is a plausible ASCII policy, not a unique standard spelling.
- U+05F2 unpointed double yod commonly represents ey; ay is also possible according to the LC table and lexicon. Neither supports a blanket i fallback. This is separate from U+FB1F, whose explicit patah correctly supports ay and must not be blindly normalized through the flawed ordinary double-yod map.

## Why the 916 normalized strings are mechanical proposals

The compatibility-decomposition list applies the existing table after NFKD. It does not validate the base table, recover unwritten vowels, resolve dialects, identify lexical readings, or perform contextual operations. Twenty of its suggestions include base code points independently flagged by the alphabetic reviewer:

- U+FB8A–FB8B propose j because ordinary Persian JEH is currently wrongly j; the usual reading is zh.
- U+FB8E–FB91 propose kh because ordinary KEHEH is currently wrongly kh; k is the expected base reading.
- U+FBF6–FBF8 lose their written E vowel because U+06D0 is currently empty. Their suggested y' is incomplete; these are Uyghur ligatures, so a language-aware correction also needs an Uyghur scheme.
- U+FC5E–FC63, U+FCF2–FCF4, and U+FE7C–FE7D propagate W from Arabic shadda. Proper reading doubles a consonant where that context exists; a bare W is not a gold romanization.

Other obvious non-gold examples include U+FDF2 Allah → llh because the ordinary Arabic alef is empty, and U+FDFA → Sl~ llh aalyh wslm because base Arabic mappings contain transliteration placeholders and omit unwritten vowels. The normalization test proves that a form is inconsistently omitted relative to mapped constituents, not that the generated output is linguistically correct. Presentation forms may still inherit contextual ambiguity after their base mappings are corrected. The list must remain labeled mechanical NFKD-plus-current-table proposals.
