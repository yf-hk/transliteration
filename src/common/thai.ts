/**
 * Rule-based Thai -> Latin transliteration following the Royal Thai General
 * System of Transcription (RTGS). Tones and vowel length are not represented,
 * as prescribed by RTGS.
 *
 * The romanization is derived mostly from orthography, so words whose
 * pronunciation requires lexical knowledge -- linker syllables (ราชสีมา ->
 * "ratchasima") or geminated consonants (พัทยา -> "phatthaya") -- may differ
 * slightly from their official romanization. A few small curated word lists
 * cover the most common lexical cases: geminating morphemes (GEMINATE_MORPHEMES)
 * and Pali/Sanskrit words with a silent final vowel (SILENT_FINAL_ANYWHERE /
 * SILENT_FINAL_WORD_FINAL, e.g. ชาติ -> "chat").
 */

const INITIALS: Record<string, string> = {
  ก: 'k',
  ข: 'kh',
  ฃ: 'kh',
  ค: 'kh',
  ฅ: 'kh',
  ฆ: 'kh',
  ง: 'ng',
  จ: 'ch',
  ฉ: 'ch',
  ช: 'ch',
  ซ: 's',
  ฌ: 'ch',
  ญ: 'y',
  ฎ: 'd',
  ฏ: 't',
  ฐ: 'th',
  ฑ: 'th',
  ฒ: 'th',
  ณ: 'n',
  ด: 'd',
  ต: 't',
  ถ: 'th',
  ท: 'th',
  ธ: 'th',
  น: 'n',
  บ: 'b',
  ป: 'p',
  ผ: 'ph',
  ฝ: 'f',
  พ: 'ph',
  ฟ: 'f',
  ภ: 'ph',
  ม: 'm',
  ย: 'y',
  ร: 'r',
  ล: 'l',
  ว: 'w',
  ศ: 's',
  ษ: 's',
  ส: 's',
  ห: 'h',
  ฬ: 'l',
  อ: '',
  ฮ: 'h',
};

const FINALS: Record<string, string> = {
  ก: 'k',
  ข: 'k',
  ฃ: 'k',
  ค: 'k',
  ฅ: 'k',
  ฆ: 'k',
  ง: 'ng',
  จ: 't',
  ฉ: 't',
  ช: 't',
  ซ: 't',
  ฌ: 't',
  ฎ: 't',
  ฏ: 't',
  ฐ: 't',
  ฑ: 't',
  ฒ: 't',
  ด: 't',
  ต: 't',
  ถ: 't',
  ท: 't',
  ธ: 't',
  ศ: 't',
  ษ: 't',
  ส: 't',
  ญ: 'n',
  ณ: 'n',
  น: 'n',
  ร: 'n',
  ล: 'n',
  ฬ: 'n',
  บ: 'p',
  ป: 'p',
  ผ: 'p',
  ฝ: 'p',
  พ: 'p',
  ฟ: 'p',
  ภ: 'p',
  ม: 'm',
  ย: 'i',
  ว: 'o',
};

const THAI_NUMERALS: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

const TONE_MARKS = new Set(['่', '้', '๊', '๋']);
const KARANT = '์';
const LEADING_VOWELS = new Set(['เ', 'แ', 'โ', 'ใ', 'ไ']);
const VOWEL_SIGNS = new Set(['ะ', 'ั', 'า', 'ำ', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู', '็']);
const SONORANTS = new Set(['ง', 'ญ', 'ณ', 'น', 'ม', 'ย', 'ร', 'ล', 'ว', 'ฬ']);

const TRUE_CLUSTERS = new Set([
  'กร',
  'กล',
  'กว',
  'ขร',
  'ขล',
  'ขว',
  'คร',
  'คล',
  'คว',
  'ตร',
  'ปร',
  'ปล',
  'ผล',
  'พร',
  'พล',
]);

// C + silent ร pronounced as C alone: จริง -> ching, ศรี -> si, สร้าง -> sang
const SILENT_R_LEADERS = new Set(['จ', 'ซ', 'ศ', 'ส']);

interface Rime {
  signs: string[];
  vowel: string;
  final: boolean; // whether a final consonant may follow
}

// Vowel signs following the onset when there is no leading vowel.
// Final glides are handled by the finals table (ย -> i, ว -> o), so e.g.
// -าย = a + i = "ai" and -ิว = i + o = "io" need no patterns of their own.
const BARE_RIMES: Rime[] = [
  { signs: ['ั', 'ว', 'ะ'], vowel: 'ua', final: false },
  { signs: ['ั', 'ว'], vowel: 'ua', final: true },
  { signs: ['ั'], vowel: 'a', final: true },
  { signs: ['ำ'], vowel: 'am', final: false },
  { signs: ['า'], vowel: 'a', final: true },
  { signs: ['ะ'], vowel: 'a', final: false },
  { signs: ['ิ'], vowel: 'i', final: true },
  { signs: ['ี'], vowel: 'i', final: true },
  { signs: ['ึ'], vowel: 'ue', final: true },
  { signs: ['ื', 'อ'], vowel: 'ue', final: true },
  { signs: ['ื'], vowel: 'ue', final: true },
  { signs: ['ุ'], vowel: 'u', final: true },
  { signs: ['ู'], vowel: 'u', final: true },
  { signs: ['็', 'อ'], vowel: 'o', final: true },
  { signs: ['็'], vowel: 'o', final: true },
];

// Sign combinations following the onset for each leading vowel.
const LEAD_RIMES: Record<string, Rime[]> = {
  เ: [
    { signs: ['ี', 'ย', 'ะ'], vowel: 'ia', final: false },
    { signs: ['ี', 'ย'], vowel: 'ia', final: true },
    { signs: ['ื', 'อ', 'ะ'], vowel: 'uea', final: false },
    { signs: ['ื', 'อ'], vowel: 'uea', final: true },
    { signs: ['ื'], vowel: 'uea', final: true },
    { signs: ['ิ'], vowel: 'oe', final: true },
    { signs: ['็'], vowel: 'e', final: true },
    { signs: ['อ', 'ะ'], vowel: 'oe', final: false },
    { signs: ['อ'], vowel: 'oe', final: true },
    { signs: ['า', 'ะ'], vowel: 'o', final: false },
    { signs: ['า'], vowel: 'ao', final: false },
    { signs: ['ะ'], vowel: 'e', final: false },
  ],
  แ: [
    { signs: ['็'], vowel: 'ae', final: true },
    { signs: ['ะ'], vowel: 'ae', final: false },
  ],
  โ: [{ signs: ['ะ'], vowel: 'o', final: false }],
};

// Vowel when a leading vowel has no further signs (เท -> the, แมว -> maeo).
const LEAD_DEFAULTS: Record<string, string> = { เ: 'e', แ: 'ae', โ: 'o' };

function isThaiChar(char: string): boolean {
  return char >= 'ก' && char <= '๛';
}

function isConsonant(char: string | undefined): boolean {
  // ฤ and ฦ sit in the ก-ฮ range but are vowels (sara rue / lue).
  return !!char && char >= 'ก' && char <= 'ฮ' && char !== 'ฤ' && char !== 'ฦ';
}

function skipTones(chars: string[], i: number): number {
  let p = i;
  while (p < chars.length && TONE_MARKS.has(chars[p])) {
    p++;
  }
  return p;
}

// Remove characters that are never pronounced: paiyannoi (ฯ) and every
// consonant silenced by the karant mark (์) together with its attached signs.
// A silenced ร also takes a preceding dental with it, so that จันทร์ -> จัน
// and ศาสตร์ -> ศาส. Mai yamok (ๆ) is kept; it is handled during parsing.
function stripSilent(chars: string[]): string[] {
  const out: string[] = [];
  for (const char of chars) {
    if (char === 'ฯ') {
      continue;
    }
    if (char === KARANT) {
      popSilenced(out);
    } else {
      out.push(char);
    }
  }
  return out;
}

// Pop the consonant silenced by a karant mark, along with its attached signs.
function popSilenced(out: string[]): void {
  let last = out.at(-1);
  while (last && (TONE_MARKS.has(last) || VOWEL_SIGNS.has(last))) {
    out.pop();
    last = out.at(-1);
  }
  if (out.length === 0 || !isConsonant(out.at(-1))) {
    return;
  }
  const dead = out.pop();
  const prev = out.at(-1);
  if (dead === 'ร' && prev && 'ตทฎฏด'.includes(prev)) {
    out.pop();
  }
  // ลักษณ์ -> ลัก: the Sanskrit stem -กษณ loses both ษ and ณ.
  if (dead === 'ณ' && prev === 'ษ') {
    out.pop();
  }
}

// Match a sequence of signs starting at `start`, allowing tone marks in
// between. Returns the index after the sequence, or -1 if it does not match.
function matchSigns(chars: string[], start: number, signs: string[]): number {
  let i = start;
  for (const sign of signs) {
    i = skipTones(chars, i);
    if (chars[i] !== sign) {
      return -1;
    }
    i++;
  }
  return i;
}

// Whether the syllable whose onset ends at `i` carries an explicit vowel:
// a vowel sign, a vowel-holder อ, sara rue/lue, the รร ligature, or ว acting
// as the "ua" vowel. Used to decide if a consonant starts a new syllable.
function hasExplicitRime(chars: string[], i: number): boolean {
  const p = skipTones(chars, i);
  const char = chars[p];
  if (!char) {
    return false;
  }
  if (VOWEL_SIGNS.has(char) || char === 'ฤ' || char === 'ฦ') {
    return true;
  }
  if (char === 'อ') {
    return isVowelHolderO(chars, p);
  }
  if (char === 'ร' && isRrLigature(chars, p)) {
    return true;
  }
  if (char === 'ว') {
    const q = skipTones(chars, p + 1);
    const next = chars[q];
    if (!next) {
      return true;
    }
    if (VOWEL_SIGNS.has(next)) {
      return false; // ว is the next syllable's onset
    }
    if (next === 'ร' && isRrLigature(chars, q)) {
      return false; // สุวรรณ
    }
    return true; // ว is this syllable's "ua" vowel (ทวน -> thuan)
  }
  return false;
}

// อ at `p` holds the "o" vowel of the previous consonant (สอง -> song) unless
// it starts the next syllable instead: when a vowel sign follows it (ร้านอาหาร
// -> ran + ahan) or the next consonant carries its own vowel (วัดอรุณ ->
// wat + arun).
function isVowelHolderO(chars: string[], p: number): boolean {
  const q = skipTones(chars, p + 1);
  const next = chars[q];
  if (!next) {
    return true;
  }
  if (VOWEL_SIGNS.has(next)) {
    return false;
  }
  if (isConsonant(next) && hasExplicitRime(chars, q + 1)) {
    return false;
  }
  return true;
}

// รร at `p` is the "a(n)" ligature (กรรม -> kam) only when no vowel sign
// follows; otherwise the second ร starts the next syllable
// (นครราชสีมา -> ...khon + rat...).
function isRrLigature(chars: string[], p: number): boolean {
  const q = skipTones(chars, p + 1);
  if (chars[q] !== 'ร') {
    return false;
  }
  const after = chars[skipTones(chars, q + 1)];
  return !(after && VOWEL_SIGNS.has(after));
}

interface Onset {
  roman: string;
  end: number;
}

// ห นำ: silent ห before a sonorant (หมา -> ma). Before ว it only applies
// when ว is a consonant onset (เหวี่ยง -> wiang); otherwise ว is the "ua"
// vowel and ห is pronounced (หวย -> huai).
function silentHoOnset(chars: string[], j: number, lead: string): Onset | null {
  const c2 = chars[j];
  if (!(isConsonant(c2) && SONORANTS.has(c2))) {
    return null;
  }
  if (c2 === 'ว' && lead !== 'ใ' && lead !== 'ไ') {
    const afterC2 = chars[skipTones(chars, j + 1)];
    if (!(afterC2 && VOWEL_SIGNS.has(afterC2))) {
      return null;
    }
  }
  return { roman: INITIALS[c2], end: j + 1 };
}

// Consonant pairs read together: true clusters (กร -> kr) and pairs whose ร
// is silent (จริง -> ching, ทราบ -> sap).
function pairOnset(
  chars: string[],
  i: number,
  j: number,
  lead: string,
  atWordStart: boolean
): Onset | null {
  const c1 = chars[i];
  const c2 = chars[j];
  const rimeAfterPair = hasExplicitRime(chars, j + 1);

  if (c2 === 'ร' && SILENT_R_LEADERS.has(c1) && rimeAfterPair) {
    return { roman: INITIALS[c1], end: j + 1 };
  }
  // ทร- with a vowel is pronounced "s" (ทราบ -> sap, เทรา -> sao), also with
  // an implicit vowel at the start of a word (ทรง -> song), but it is
  // ท + ร final elsewhere (สุนทร -> sunthon).
  if (c1 === 'ท' && c2 === 'ร' && (rimeAfterPair || (!lead && atWordStart))) {
    return { roman: 's', end: j + 1 };
  }

  if (TRUE_CLUSTERS.has(c1 + c2)) {
    // After a leading vowel the cluster needs no explicit rime (ใคร, ไกล),
    // except that a word-final ว is the "o" glide, not a cluster (แก้ว).
    const clusterInLead =
      !!lead &&
      (c2 === 'ร' ||
        c2 === 'ล' ||
        (c2 === 'ว' && isConsonant(chars[skipTones(chars, j + 1)])));
    if (
      rimeAfterPair ||
      clusterInLead ||
      wordStartImplicitCluster(chars, j, lead, atWordStart)
    ) {
      return { roman: INITIALS[c1] + INITIALS[c2], end: j + 1 };
    }
  }
  return null;
}

// At the very start of a word the pair is a cluster even with an implicit
// vowel (ตรง -> trong, กลม -> klom, ครก -> khrok). But ว after the onset is
// the "ua" vowel, not a cluster (ควง -> khuang), and the pair is only a
// cluster when what follows is a lone final; if the next consonant starts its
// own syllable, the second letter is a final instead (พรทิพย์ -> phon + thip).
function wordStartImplicitCluster(
  chars: string[],
  j: number,
  lead: string,
  atWordStart: boolean
): boolean {
  if (!atWordStart || lead || chars[j] === 'ว') {
    return false;
  }
  const m = skipTones(chars, j + 1);
  return !(isConsonant(chars[m]) && hasExplicitRime(chars, m + 1));
}

// Parse the initial consonant (or cluster) of a syllable starting at `i`.
function parseOnset(
  chars: string[],
  i: number,
  lead: string,
  atWordStart: boolean
): Onset {
  const c1 = chars[i];
  const j = skipTones(chars, i + 1);
  const c2 = chars[j];

  if (c1 === 'ห') {
    const ho = silentHoOnset(chars, j, lead);
    if (ho) {
      return ho;
    }
  }

  // อ นำ: silent อ in the four อย- words (อย่า, อยู่, อย่าง, อยาก).
  // Only at the start of a word; elsewhere อ is a syllable of its own
  // (อยุธยา -> a + yut...).
  if (
    c1 === 'อ' &&
    c2 === 'ย' &&
    atWordStart &&
    hasExplicitRime(chars, j + 1)
  ) {
    return { roman: 'y', end: j + 1 };
  }

  if (isConsonant(c2)) {
    const pair = pairOnset(chars, i, j, lead, atWordStart);
    if (pair) {
      return pair;
    }
  }

  return { roman: INITIALS[c1] ?? '', end: i + 1 };
}

interface BareUnit {
  char: string; // the pronounced consonant of the unit
  end: number;
  pair: boolean; // true for multi-consonant units like a silent-ห pair
}

interface BareRun {
  units: BareUnit[];
  atBoundary: boolean; // ended at a word/segment boundary, not a next syllable
  atLead: boolean; // ended at a leading vowel (which starts the next syllable)
}

// Collect the run of "bare" consonants (no vowel of their own) after `i`,
// stopping at a syllable that carries an explicit vowel or at a boundary.
function collectBare(chars: string[], i: number): BareRun {
  const units: BareUnit[] = [];
  let p = skipTones(chars, i);
  while (p < chars.length && units.length < 6) {
    if (!isConsonant(chars[p])) {
      // A leading vowel announces a following syllable, not a boundary.
      const atLead = LEADING_VOWELS.has(chars[p]);
      return { units, atBoundary: !atLead, atLead };
    }
    const onset = parseOnset(chars, p, '', false);
    if (hasExplicitRime(chars, onset.end)) {
      break;
    }
    units.push({
      char: chars[onset.end - 1],
      end: onset.end,
      pair: onset.end > p + 1,
    });
    p = skipTones(chars, onset.end);
  }
  return { units, atBoundary: p >= chars.length, atLead: false };
}

interface Final {
  roman: string;
  char: string;
  end: number;
}

// Decide which (if any) of the bare consonants after the vowel is this
// syllable's final. One bare consonant is the final (มาก -> mak). Two at a
// word boundary form the next syllable (อุดร -> u + don) unless a silent ร is
// involved (สามารถ -> samat, บัตร -> bat); two before a vowelled syllable
// give the first as the final (สุขสวัสดิ์ -> suk + sa + wat), except a
// trailing ร pair which keeps its "-on" reading (อุดรธานี -> u + don + ...).
// Of three or more, the first is the final after a short vowel
// (สุนทร -> sun + thon), while a long open vowel stays open
// (มหานคร -> ma + ha + na + khon).
// Leaders of final clusters whose ร is silent: บัตร -> bat, สมุทร -> samut,
// เพชร -> phet. The ones in the short set only apply after a short vowel
// (สมัคร -> samak, จักร -> chak), since after a long vowel the pair reads
// "-on" instead (สาทร -> sathon, สาคร -> sakhon).
const SILENT_R_FINAL_LEADERS = new Set(['ต', 'ช']);
const SILENT_R_FINAL_LEADERS_SHORT = new Set(['ท', 'ก', 'ค']);

// Consonants that link syllables with an "a" after a long open vowel:
// สารคาม -> sa + ra + kham, กาฬสินธุ์ -> ka + la + sin.
const LINKER_CONSONANTS = new Set(['ร', 'ล', 'ฬ']);

function resolveFinal(chars: string[], i: number, longVowel = false): Final {
  const none: Final = { roman: '', char: '', end: i };
  const { units, atBoundary, atLead } = collectBare(chars, i);
  if (units.length === 0) {
    return none;
  }

  const finalOf = (u: BareUnit): Final =>
    !u.pair && FINALS[u.char]
      ? { roman: FINALS[u.char], char: u.char, end: u.end }
      : none;

  const [u1, u2] = units;
  // Final cluster with silent ร (บัตร -> bat, สมุทรสาคร -> samut + sakhon).
  const silentR =
    units.length >= 2 &&
    !(u1.pair || u2.pair) &&
    u2.char === 'ร' &&
    (SILENT_R_FINAL_LEADERS.has(u1.char) ||
      (!longVowel && SILENT_R_FINAL_LEADERS_SHORT.has(u1.char)));
  if (silentR && FINALS[u1.char]) {
    return { roman: FINALS[u1.char], char: u1.char, end: u2.end };
  }

  if (units.length === 1) {
    // Linker syllable (สารคาม -> sa + ra + kham), but not before a leading
    // vowel, which starts a fresh word-like syllable (อาหารไทย -> ahan thai).
    if (
      !(atBoundary || atLead) &&
      longVowel &&
      LINKER_CONSONANTS.has(u1.char)
    ) {
      return none;
    }
    return finalOf(u1);
  }
  if (units.length === 2) {
    return resolvePairFinal(u1, u2, atBoundary, longVowel, finalOf, none);
  }
  // A glide final (ย/ว) attaches even after a long vowel (ข้าวต้ม -> khao +
  // tom); other consonants leave a long vowel open (มหานคร -> ma + ha + na...).
  if (longVowel && u1.char !== 'ย' && u1.char !== 'ว') {
    return none;
  }
  return finalOf(u1);
}

// Final resolution when exactly two bare consonants follow the vowel.
function resolvePairFinal(
  u1: BareUnit,
  u2: BareUnit,
  atBoundary: boolean,
  longVowel: boolean,
  finalOf: (u: BareUnit) => Final,
  none: Final
): Final {
  if (!u1.pair && u1.char === 'ร' && !u2.pair && FINALS[u2.char]) {
    // silent ร before the true final: สามารถ -> samat
    return { roman: FINALS[u2.char], char: u2.char, end: u2.end };
  }
  // A short-vowel syllable pulls the first consonant in as its final
  // (สุขสวัสดิ์ -> suk + sa + wat). After a long vowel the syllable is already
  // complete, so a two-consonant pair starts the next word instead
  // (อยู่บนปุ่ม -> yu + bon + pum) -- unless the two are identical, a
  // gemination that splits as final + onset (ราชช -> rat + cha).
  if (
    !atBoundary &&
    u2.char !== 'ร' &&
    u2.char !== 'ล' &&
    (!longVowel || u1.char === u2.char)
  ) {
    return finalOf(u1);
  }
  return none; // the pair forms the next syllable (อุดร -> u + don)
}

// Handle characters that form no regular syllable: orphan signs (skipped),
// the standalone vowels ฤ/ฦ, and mai yamok (ๆ). Returns -1 when `i` starts a
// real syllable.
function parseLoneChar(chars: string[], i: number, out: string[]): number {
  const char = chars[i];
  if (TONE_MARKS.has(char) || VOWEL_SIGNS.has(char) || char === 'ๅ') {
    return i + 1;
  }
  if (char === 'ฤ' || char === 'ฦ') {
    out.push(char === 'ฤ' ? 'rue' : 'lue');
    return chars[i + 1] === 'ๅ' ? i + 2 : i + 1;
  }
  // Mai yamok repeats the preceding word. Without word segmentation we repeat
  // the preceding syllable (correct for the common single-syllable case, e.g.
  // เล็กๆ -> lek lek), space-separated per RTGS.
  if (char === 'ๆ') {
    const prev = out.at(-1);
    if (prev) {
      out.push(` ${prev.trimStart()}`);
    }
    return i + 1;
  }
  return -1;
}

// Parse one syllable starting at `i`, push its romanization, and return the
// index of the next unparsed character.
function parseSyllable(chars: string[], i: number, out: string[]): number {
  const char = chars[i];

  const lone = parseLoneChar(chars, i, out);
  if (lone >= 0) {
    return lone;
  }

  let lead = '';
  let k = i;
  if (LEADING_VOWELS.has(char)) {
    lead = char;
    k = skipTones(chars, i + 1);
  }

  let onset = '';
  if (k < chars.length && isConsonant(chars[k])) {
    const parsed = parseOnset(chars, k, lead, i === 0);
    onset = parsed.roman;
    k = skipTones(chars, parsed.end);
  } else if (!lead) {
    return i + 1; // stray character that cannot start a syllable
  }

  if (lead === 'ใ' || lead === 'ไ') {
    const p = skipTones(chars, k);
    if (chars[p] === 'ย' && !hasExplicitRime(chars, p + 1)) {
      k = p + 1; // ไทย: the ย belongs to the vowel (but not ไก่ย่าง's ย)
    }
    out.push(`${onset}ai`);
    return k;
  }

  const rime = resolveRime(chars, k, lead);
  out.push(onset + rime.vowel + rime.finalRoman);
  return rime.end > k ? rime.end : k;
}

interface ResolvedRime {
  vowel: string;
  finalRoman: string;
  end: number;
}

// Determine the syllable's vowel and final consonant starting right after
// the onset.
function resolveRime(chars: string[], k: number, lead: string): ResolvedRime {
  const rime = matchRime(chars, k, lead);
  const p = rime.end;

  if (rime.vowel) {
    const final = rime.final
      ? resolveFinal(chars, p, rime.long)
      : { roman: '', char: '', end: p };
    if (rime.rrOpen && !final.roman) {
      // รร with no final reads "an" (สวรรค์ -> sawan)
      return { vowel: rime.vowel, finalRoman: 'n', end: p };
    }
    return { vowel: rime.vowel, finalRoman: final.roman, end: final.end };
  }

  if (lead) {
    const final = resolveFinal(chars, p);
    // เ-ย with no other sign is the "oei" vowel (เลย -> loei)
    const vowel =
      lead === 'เ' && final.char === 'ย' ? 'oe' : LEAD_DEFAULTS[lead];
    return { vowel, finalRoman: final.roman, end: final.end };
  }

  // Implicit vowel: "o" in a closed syllable (นก -> nok), "a" in an open
  // one (สบาย -> sabai; นคร -> na + khon).
  const { units, atBoundary } = collectBare(chars, p);
  const u = units[0];
  if (u && !u.pair && FINALS[u.char] && implicitClosed(units, atBoundary)) {
    return { vowel: 'o', finalRoman: FINALS[u.char], end: u.end };
  }
  return { vowel: 'a', finalRoman: '', end: p };
}

// Whether a syllable with no written vowel is closed (takes the next bare
// consonant as its final). A run of n bare consonants ending the word parses
// as "Ca" / "CoC" syllables: pairs when it divides evenly (จุฬาลงกร[ณ์] ->
// ...long + kon), an open "Ca" first when a syllable would be left over
// (นครปฐม -> na + khon + pa + thom), i.e. open when n is 1 or divides by 3.
// Mid-word, a lone bare consonant closes (สมชาย -> som + chai) and a pair
// closes on its first consonant (นนทบุรี -> non + tha + buri) unless the pair
// keeps its own "-on" reading (นคร + สวรรค์ -> na + khon + sawan).
function implicitClosed(units: BareUnit[], atBoundary: boolean): boolean {
  if (atBoundary) {
    const n = units.length + 1;
    return n > 1 && n % 3 !== 0;
  }
  if (units.length === 1) {
    return true;
  }
  if (units.length === 2) {
    return units[1].char !== 'ร' && units[1].char !== 'ล';
  }
  return false;
}

interface MatchedRime {
  vowel: string; // '' when no explicit vowel was found
  end: number;
  final: boolean;
  long: boolean;
  rrOpen: boolean;
}

const LONG_VOWEL_SIGNS = new Set(['า', 'ี', 'ู', 'ื']);

// Match the explicit vowel of a syllable at `k` (right after the onset).
function matchRime(chars: string[], k: number, lead: string): MatchedRime {
  const rimes = lead ? LEAD_RIMES[lead] : BARE_RIMES;
  for (const rime of rimes) {
    const end = matchSigns(chars, k, rime.signs);
    if (end >= 0) {
      return {
        vowel: rime.vowel,
        end,
        final: rime.final,
        long: !lead && LONG_VOWEL_SIGNS.has(rime.signs[0]),
        rrOpen: false,
      };
    }
  }
  return matchSpecialRime(chars, k, lead);
}

// Vowels written with consonant letters: the รร ligature, sara rue/lue and
// the vowel uses of อ and ว.
function matchSpecialRime(
  chars: string[],
  k: number,
  lead: string
): MatchedRime {
  const none: MatchedRime = {
    vowel: '',
    end: k,
    final: true,
    long: false,
    rrOpen: false,
  };

  const p = skipTones(chars, k);
  const q = skipTones(chars, p + 1);
  const next = chars[q];
  if (chars[p] === 'ร' && isRrLigature(chars, p)) {
    // รร ligature supplies "a" (กรรม -> kam)
    return { ...none, vowel: 'a', end: q + 1, rrOpen: true };
  }
  if (chars[p] === 'ฤ') {
    // กฤต -> krit, ฤๅ -> rue
    const long = chars[p + 1] === 'ๅ';
    return { ...none, vowel: long ? 'rue' : 'ri', end: long ? p + 2 : p + 1 };
  }
  if (lead || (next && VOWEL_SIGNS.has(next))) {
    return none;
  }
  if (chars[p] === 'อ' && isVowelHolderO(chars, p)) {
    // vowel-holder อ: สอง -> song
    return { ...none, vowel: 'o', end: p + 1 };
  }
  if (
    chars[p] === 'ว' &&
    !(next === 'ร' && chars[skipTones(chars, q + 1)] === 'ร')
  ) {
    // ว as vowel: ทวน -> thuan, หวย -> huai
    return { ...none, vowel: 'ua', end: p + 1 };
  }
  return none;
}

// Split a run of Thai text into romanized syllables.
// Sanskrit compound morphemes whose final consonant is also read as the
// onset of the next syllable. Doubling the letter lets the regular rules
// produce the geminated reading: ราชบุรี -> rat + cha + buri.
const GEMINATE_MORPHEMES: [RegExp, string][] = [
  [/ราช(?=[ก-ฮเ-ไ])/g, 'ราชช'], // ราชบุรี -> ratchaburi, ราชเทวี -> ratchathewi
  [/เพชร(?=[ก-ฮเ-ไ])/g, 'เพชรช'], // เพชรบุรี -> phetchaburi
  [/ธรรม(?=[ก-ฮเ-ไ])/g, 'ธรรมม'], // ธรรมราช -> thammarat
  [/จักร(?=[ก-ฮเ-ไ])/g, 'จักกระ'], // จักรยาน -> chakkrayan
  [/วิทยา/g, 'วิทธยา'], // มหาวิทยาลัย -> mahawitthayalai
];

// Pali/Sanskrit loanwords whose written final short vowel (ิ/ุ) is silent, so
// the preceding consonant is pronounced as the syllable's final: ชาติ -> chat
// (not "chati"), เหตุ -> het. This cannot be derived from spelling -- the
// identically shaped สติ (sati), อายุ (ayu), ครุ (khru), วัตถุ (watthu),
// มติ (mati) keep their final vowel -- so it needs a curated word list.
//
// Each entry is matched as a word-final morpheme (so compounds work too:
// ธรรมชาติ -> thammachat, ประวัติ -> prawat via วัติ) and its trailing vowel
// sign is dropped, letting the normal rules produce the final-consonant
// reading. The list is high-frequency and verified against thai2english; it is
// deliberately not exhaustive (the dictionary has ~1,200 matching the pattern,
// only ~half of them actually silent). Words normally written with a karant
// (สิทธิ์, ศักดิ์, พันธุ์) already read correctly and are not listed here.
// Always silent, even mid-word (เหตุผล -> hetphon, ชาตินิยม -> chatniyom):
// these morphemes never take a linking vowel.
const SILENT_FINAL_ANYWHERE = [
  'ชาติ', // chat
  'ญาติ', // yat
  'เหตุ', // het
  'ธาตุ', // that
  'บัญญัติ', // banyat
  'บัติ', // bat (ปฏิบัติ, สมบัติ, อุบัติ, พิบัติ, ปรนนิบัติ)
  'มัติ', // mat (อนุมัติ, อัตโนมัติ)
];

// Silent only at the end of a word; mid-word these keep a linking vowel
// (ประวัติ -> prawat but ประวัติศาสตร์ -> prawatisat; ภูมิ -> phum but
// ภูมิภาค -> phumiphak; เกียรติ -> kiat but เกียรตินิยม -> kiattiniyom).
const SILENT_FINAL_WORD_FINAL = [
  'เกตุ', // ket
  'เกียรติ', // kiat
  'ภูมิ', // phum
  'โชติ', // chot
  'เมรุ', // men
  'กุฏิ', // kut
  'วิกฤติ', // wikrit
  'วัติ', // wat (ประวัติ -> prawat, ปฏิวัติ -> patiwat)
  'สมมุติ', // sommut
  'มังสวิรัติ', // mangsawirat
  'จักรพรรดิ', // chakkraphat
  'จักรวรรดิ', // chakkrawat
];

// Longest morphemes first so the most specific alternative matches.
const byLength = (a: string, b: string) => b.length - a.length;
const SILENT_ANYWHERE_RE = new RegExp(
  `(${[...SILENT_FINAL_ANYWHERE].sort(byLength).join('|')})`,
  'g'
);
// The lookahead limits this set to word-final position: not followed by another
// Thai consonant or vowel sign (i.e. before a space, punctuation, Latin or end).
const SILENT_WORD_FINAL_RE = new RegExp(
  `(${[...SILENT_FINAL_WORD_FINAL].sort(byLength).join('|')})(?![\\u0E01-\\u0E4E])`,
  'g'
);

function stripSilentFinalVowels(text: string): string {
  return text
    .replace(SILENT_ANYWHERE_RE, (m) => m.slice(0, -1))
    .replace(SILENT_WORD_FINAL_RE, (m) => m.slice(0, -1));
}

export function parseThai(text: string): string[] {
  let expanded = stripSilentFinalVowels(text);
  for (const [pattern, replacement] of GEMINATE_MORPHEMES) {
    expanded = expanded.replace(pattern, replacement);
  }
  const chars = stripSilent(Array.from(expanded));
  const syllables: string[] = [];
  let i = 0;
  while (i < chars.length) {
    const next = parseSyllable(chars, i, syllables);
    i = next > i ? next : i + 1;
  }
  return syllables;
}

export function transliterateThai(text: string): string {
  const normalized = text
    .normalize('NFC')
    .replace(/เเ/g, 'แ') // เเ typed as two เ is equivalent to แ
    .replace(/[๐-๙]/g, (d) => THAI_NUMERALS[d]);

  let result = '';
  let run = '';
  for (const char of normalized) {
    if (isThaiChar(char)) {
      run += char;
      continue;
    }
    if (run) {
      result += parseThai(run).join('');
      run = '';
    }
    result += char;
  }
  if (run) {
    result += parseThai(run).join('');
  }
  return result;
}

export function isThai(text: string): boolean {
  return Array.from(text).some(isThaiChar);
}
