import type {
  Converter,
  Fallback,
  Fixture,
  Probe,
  ProbeResult,
} from './types.js';

const ascii = [
  'A practical guide to building reliable software',
  'Release notes for the next production deployment',
  'Customers orders invoices and payments',
  'What happens when the application restarts',
  'Simple text with numbers 12345 and punctuation!',
  'How to make small packages load quickly',
  'A product title for a modern online store',
  'Search indexing and URL generation for websites',
];
const latin = [
  'Crème brûlée et café à Montréal',
  'São Paulo e coração brasileiro',
  'École française à Québec',
  'España Málaga y Córdoba',
  'Dvořák Český Krumlov a příběh',
  'À bientôt très chère amie',
  'Hôtel élégant près du marché',
  'Smörgåsbord Straße Göteborg',
];
const cyrillic = [
  'Привет мир Москва и Санкт Петербург',
  'Новая статья о разработке программ',
  'Добро пожаловать на наш сайт',
  'България София и български език',
  'Україна Київ та українська мова',
  'Србија Београд и српски језик',
  'Поиск информации и создание адресов',
  'Проверка качества обработки текста',
];
const chinese = [
  '你好世界北京上海广州深圳',
  '2022年中文01英文nihao02',
  '如何构建快速可靠的软件系统',
  '这是一个包含中文的产品标题',
  'hello世界与数字123相遇',
  '欢迎来到我们的在线商店',
  '数据结构算法和性能优化',
  '中华人民共和国和繁體中文測試',
];
const japanese = [
  'こんにちは世界',
  '東京の朝と新しい記事',
  '大阪から京都への旅',
  'ひらがなとカタカナ',
  '日本語の商品タイトル',
  '新しいソフトウェアの開発',
  '日本の文化と暮らし',
  '東京2026とhello世界',
];
const korean = [
  '안녕하세요 세계 대한민국 서울',
  '한국어 문자를 영문으로 변환합니다',
  '빠르고 안정적인 소프트웨어 개발',
  '상품 제목과 검색 주소를 만들기',
  '부산 대구 인천 광주 대전 울산',
  '메모리 사용량과 실행 속도 측정',
  '오늘의 새로운 기사와 소식',
  '컴퓨터 프로그램 데이터 처리',
];
const mixed = [
  'Café 北京 Tokyo 서울 Москва مرحبا',
  'こんにちは世界 เชียงใหม่ வணக்கம்',
  'Rust Python JavaScript 中文 한국어',
  'مرحبا بالعالم שלום עולם',
  'கன்னியாகுமரி สวัสดีเชียงใหม่',
  '2026年 nouvelles Überstraße ① ẞ',
  'Emoji 🚀 and supplementary 𠮷 text',
  'Mixed scripts Ελληνικά العربية ไทย',
];

// These small probes expose dropped/retained/fallback output. They are not a
// pronunciation corpus or proof that every character in a fixture is supported.
export const probes: Record<string, Probe> = {
  latin: { input: 'Crème brûlée São Paulo', readings: ['cremebruleesaopaulo'] },
  cyrillic: { input: 'Привет мир', readings: ['privetmir'] },
  chinese: { input: '你好世界', readings: ['nihaoshijie'], cjk: true },
  japanese: {
    input: '東京へ行く',
    readings: ['tokyoheiku', 'toukyouheiku', 'tokyoeiku', 'toukyoueiku'],
    cjk: true,
  },
  korean: { input: '안녕하세요', readings: ['annyeonghaseyo'], cjk: true },
  arabic: { input: 'مرحبا بالعالم' },
  thai: { input: 'เชียงใหม่' },
  tamil: { input: 'கன்னியாகுமரி' },
  supplementary: { input: '𠮷𠬠' },
};

const mixedProbes = [
  'latin',
  'cyrillic',
  'chinese',
  'japanese',
  'korean',
  'arabic',
  'thai',
  'tamil',
  'supplementary',
];
export const fixtures: Fixture[] = [
  { id: 'ascii', texts: ascii, probes: [] },
  { id: 'latin', texts: latin, probes: ['latin'] },
  { id: 'cyrillic', texts: cyrillic, probes: ['cyrillic'] },
  { id: 'chinese', texts: chinese, probes: ['chinese'] },
  { id: 'japanese', texts: japanese, probes: ['japanese'] },
  { id: 'korean', texts: korean, probes: ['korean'] },
  { id: 'mixed', texts: mixed, probes: mixedProbes },
  {
    id: 'long',
    texts: mixed.map((text) => `${text} `.repeat(64)),
    probes: mixedProbes,
  },
];

export function inspectOutput(
  input: string,
  output: string,
  isFallback?: Fallback
): string[] {
  const flags: string[] = [];
  if (output.trim() === '') flags.push('dropped');
  if (/[^\p{ASCII}]/u.test(output)) flags.push('retained-unicode');
  if (/\[\?\]/u.test(output)) flags.push('placeholder');
  if (isFallback?.(input, output)) flags.push('fallback-encoding');
  return flags;
}

export function inspectProbe(
  id: string,
  convert: Converter,
  isFallback?: Fallback
): ProbeResult {
  const probe = probes[id];
  const output = convert(probe.input);
  if (typeof output !== 'string')
    throw new TypeError(`Non-string output for probe ${id}`);
  const flags = inspectOutput(probe.input, output, isFallback);
  const normalized = output
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/gu, '');
  if (probe.readings && !probe.readings.includes(normalized))
    flags.push('reading-mismatch');
  return {
    id,
    input: probe.input,
    output,
    flags,
    assessment: flags.length
      ? 'not-valid-reading'
      : probe.readings
        ? 'probe-matched-only'
        : 'reading-unverified',
    cjk: probe.cjk ?? false,
  };
}
