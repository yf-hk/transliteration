export const workloads = {
  ascii: [
    'A practical guide to building reliable software',
    'Release notes for the next production deployment',
    'Customers orders invoices and payments',
    'What happens when the application restarts',
    'Simple text with numbers 12345 and punctuation!',
    'How to make small packages load quickly',
    'A product title for a modern online store',
    'Search indexing and URL generation for websites',
  ],
  latin: [
    'Crème brûlée et café à Montréal', 'São Paulo e coração brasileiro',
    'École française à Québec', 'España Málaga y Córdoba',
    'Dvořák Český Krumlov a příběh', 'À bientôt très chère amie',
    'Hôtel élégant près du marché', 'Smörgåsbord Straße Göteborg',
  ],
  cyrillic: [
    'Привет мир Москва и Санкт Петербург', 'Новая статья о разработке программ',
    'Добро пожаловать на наш сайт', 'България София и български език',
    'Україна Київ та українська мова', 'Србија Београд и српски језик',
    'Поиск информации и создание адресов', 'Проверка качества обработки текста',
  ],
  chinese: [
    '你好世界北京上海广州深圳', '2022年中文01英文nihao02',
    '如何构建快速可靠的软件系统', '这是一个包含中文的产品标题',
    'hello世界与数字123相遇', '欢迎来到我们的在线商店',
    '数据结构算法和性能优化', '中华人民共和国和繁體中文測試',
  ],
  korean: [
    '안녕하세요 세계 대한민국 서울', '한국어 문자를 영문으로 변환합니다',
    '빠르고 안정적인 소프트웨어 개발', '상품 제목과 검색 주소를 만들기',
    '부산 대구 인천 광주 대전 울산', '메모리 사용량과 실행 속도 측정',
    '오늘의 새로운 기사와 소식', '컴퓨터 프로그램 데이터 처리',
  ],
  mixed: [
    'Café 北京 Tokyo 서울 Москва مرحبا', 'こんにちは世界 เชียงใหม่ வணக்கம்',
    'Rust Python JavaScript 中文 한국어', 'مرحبا بالعالم שלום עולם',
    'கன்னியாகுமரி สวัสดีเชียงใหม่', '2026年 nouvelles Überstraße ① ẞ',
    'Emoji 🚀 and supplementary 𠮷 text', 'Mixed scripts Ελληνικά العربية ไทย',
  ],
};
workloads.long = workloads.mixed.map(s => `${s} `.repeat(256));
export const samples = {
  ascii: 'Hello World 123', latin: 'Crème brûlée São Paulo',
  german: 'STRAẞE für Öl', czech: 'ýÝ', compat: 'ᴀ ₐ ①',
  greek: 'Αθήνα', russian: 'Привет мир', bulgarian: 'България',
  chinese: '你好世界', chineseMixed: '2022年中文01英文nihao02',
  korean: '안녕하세요', japanese: 'こんにちは世界',
  thai: 'เชียงใหม่', arabic: 'مرحبا بالعالم', tamil: 'கன்னியாகுமரி',
  supplementary: '𠮷𠬠', emoji: 'Hello 🚀 World',
};
