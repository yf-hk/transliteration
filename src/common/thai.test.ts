import { describe, expect, it } from 'vitest';
import { isThai, parseThai, transliterateThai } from './thai';

function runCases(cases: [string, string][], label: string) {
  for (const [input, expected] of cases) {
    it(`${label} "${input}" -> "${expected}"`, () => {
      expect(transliterateThai(input)).toBe(expected);
    });
  }
}

describe('Thai transliteration (RTGS)', () => {
  describe('Core issue cases (from GitHub #67)', () => {
    runCases(
      [
        ['สวัสดี', 'sawatdi'],
        ['เชียงใหม่', 'chiangmai'],
        ['กรุงเทพ', 'krungthep'],
        ['ไทย', 'thai'],
      ],
      'should transliterate'
    );
  });

  describe('Thai names and surnames', () => {
    runCases(
      [
        ['สมชาย', 'somchai'],
        ['สมหญิง', 'somying'],
        ['มานี', 'mani'],
        ['สมศักดิ์', 'somsak'],
        ['วิชัย', 'wichai'],
        ['สุนทร', 'sunthon'],
        ['พิชิต', 'phichit'],
        ['อรุณ', 'arun'],
        ['นภา', 'napha'],
        ['สุดา', 'suda'],
        ['พรทิพย์', 'phonthip'],
        ['สุขสวัสดิ์', 'suksawat'],
        ['ศรีสุข', 'sisuk'],
        ['ศิริพงศ์', 'siriphong'],
        ['สุขใจ', 'sukchai'],
        ['พิทักษ์', 'phithak'],
        ['ธนะกิจ', 'thanakit'],
        ['แสงสุวรรณ', 'saengsuwan'],
        ['ประเสริฐ', 'prasoet'],
        ['กิตติพงศ์', 'kittiphong'],
        ['ปิยะดา', 'piyada'],
        ['มาลี', 'mali'],
        ['วิริยะ', 'wiriya'],
        ['อรุณรัตน์', 'arunrat'],
        ['อัมพร', 'amphon'],
        ['สุภาพ', 'suphap'],
        ['ประยุทธ์', 'prayut'],
        ['กมล', 'kamon'],
        ['อานนท์', 'anon'],
        ['จุฬาลงกรณ์', 'chulalongkon'],
        ['สุวรรณ', 'suwan'],
        ['วรรณา', 'wanna'],
        ['นิพนธ์', 'niphon'],
        ['ประชา', 'pracha'],
        ['สายฝน', 'saifon'],
        ['ดวงใจ', 'duangchai'],
        ['บุญมี', 'bunmi'],
        ['ทองดี', 'thongdi'],
        ['ศักดิ์สิทธิ์', 'saksit'],
      ],
      'should transliterate name'
    );
  });

  // Official romanizations from the list of provinces of Thailand.
  // Not covered (their reading needs a dictionary): อำนาจเจริญ (charoen),
  // ชัยภูมิ, กาญจนบุรี, พัทลุง, พิษณุโลก, พระนครศรีอยุธยา, สระบุรี, อุตรดิตถ์.
  describe('Thai provinces (official romanization)', () => {
    runCases(
      [
        ['กรุงเทพมหานคร', 'krungthepmahanakhon'],
        ['อ่างทอง', 'angthong'],
        ['บึงกาฬ', 'buengkan'],
        ['บุรีรัมย์', 'buriram'],
        ['ฉะเชิงเทรา', 'chachoengsao'],
        ['ชัยนาท', 'chainat'],
        ['จันทบุรี', 'chanthaburi'],
        ['เชียงใหม่', 'chiangmai'],
        ['เชียงราย', 'chiangrai'],
        ['ชลบุรี', 'chonburi'],
        ['ชุมพร', 'chumphon'],
        ['กาฬสินธุ์', 'kalasin'],
        ['กำแพงเพชร', 'kamphaengphet'],
        ['ขอนแก่น', 'khonkaen'],
        ['กระบี่', 'krabi'],
        ['ลำปาง', 'lampang'],
        ['ลำพูน', 'lamphun'],
        ['เลย', 'loei'],
        ['ลพบุรี', 'lopburi'],
        ['แม่ฮ่องสอน', 'maehongson'],
        ['มหาสารคาม', 'mahasarakham'],
        ['มุกดาหาร', 'mukdahan'],
        ['นครนายก', 'nakhonnayok'],
        ['นครปฐม', 'nakhonpathom'],
        ['นครพนม', 'nakhonphanom'],
        ['นครราชสีมา', 'nakhonratchasima'],
        ['นครสวรรค์', 'nakhonsawan'],
        ['นครศรีธรรมราช', 'nakhonsithammarat'],
        ['น่าน', 'nan'],
        ['นราธิวาส', 'narathiwat'],
        ['หนองบัวลำภู', 'nongbualamphu'],
        ['หนองคาย', 'nongkhai'],
        ['นนทบุรี', 'nonthaburi'],
        ['ปทุมธานี', 'pathumthani'],
        ['ปัตตานี', 'pattani'],
        ['พังงา', 'phangnga'],
        ['พะเยา', 'phayao'],
        ['เพชรบูรณ์', 'phetchabun'],
        ['เพชรบุรี', 'phetchaburi'],
        ['พิจิตร', 'phichit'],
        ['แพร่', 'phrae'],
        ['ภูเก็ต', 'phuket'],
        ['ปราจีนบุรี', 'prachinburi'],
        ['ประจวบคีรีขันธ์', 'prachuapkhirikhan'],
        ['ระนอง', 'ranong'],
        ['ราชบุรี', 'ratchaburi'],
        ['ระยอง', 'rayong'],
        ['ร้อยเอ็ด', 'roiet'],
        ['สระแก้ว', 'sakaeo'],
        ['สกลนคร', 'sakonnakhon'],
        ['สมุทรปราการ', 'samutprakan'],
        ['สมุทรสาคร', 'samutsakhon'],
        ['สมุทรสงคราม', 'samutsongkhram'],
        ['สตูล', 'satun'],
        ['สิงห์บุรี', 'singburi'],
        ['ศรีสะเกษ', 'sisaket'],
        ['สงขลา', 'songkhla'],
        ['สุโขทัย', 'sukhothai'],
        ['สุพรรณบุรี', 'suphanburi'],
        ['สุราษฎร์ธานี', 'suratthani'],
        ['สุรินทร์', 'surin'],
        ['ตาก', 'tak'],
        ['ตรัง', 'trang'],
        ['ตราด', 'trat'],
        ['อุบลราชธานี', 'ubonratchathani'],
        ['อุดรธานี', 'udonthani'],
        ['อุทัยธานี', 'uthaithani'],
        ['ยะลา', 'yala'],
        ['ยโสธร', 'yasothon'],
        ['หัวหิน', 'huahin'],
      ],
      'should transliterate place'
    );
  });

  // Official romanizations of Bangkok districts (khet) and landmarks.
  describe('Bangkok districts and landmarks', () => {
    runCases(
      [
        ['บางบอน', 'bangbon'],
        ['บางกะปิ', 'bangkapi'],
        ['บางแค', 'bangkhae'],
        ['บางเขน', 'bangkhen'],
        ['บางคอแหลม', 'bangkholaem'],
        ['บางขุนเทียน', 'bangkhunthian'],
        ['บางนา', 'bangna'],
        ['บางพลัด', 'bangphlat'],
        ['บางรัก', 'bangrak'],
        ['บางซื่อ', 'bangsue'],
        ['บางกอกน้อย', 'bangkoknoi'],
        ['บางกอกใหญ่', 'bangkokyai'],
        ['บึงกุ่ม', 'buengkum'],
        ['จตุจักร', 'chatuchak'],
        ['จอมทอง', 'chomthong'],
        ['ดินแดง', 'dindaeng'],
        ['ดอนเมือง', 'donmueang'],
        ['ดุสิต', 'dusit'],
        ['ห้วยขวาง', 'huaikhwang'],
        ['คันนายาว', 'khannayao'],
        ['คลองสามวา', 'khlongsamwa'],
        ['คลองสาน', 'khlongsan'],
        ['คลองเตย', 'khlongtoei'],
        ['หลักสี่', 'laksi'],
        ['ลาดกระบัง', 'latkrabang'],
        ['ลาดพร้าว', 'latphrao'],
        ['มีนบุรี', 'minburi'],
        ['หนองจอก', 'nongchok'],
        ['หนองแขม', 'nongkhaem'],
        ['ปทุมวัน', 'pathumwan'],
        ['พญาไท', 'phayathai'],
        ['พระนคร', 'phranakhon'],
        ['ประเวศ', 'prawet'],
        ['ราษฏร์บูรณะ', 'ratburana'],
        ['ราชเทวี', 'ratchathewi'],
        ['สายไหม', 'saimai'],
        ['สะพานสูง', 'saphansung'],
        ['สาทร', 'sathon'],
        ['สวนหลวง', 'suanluang'],
        ['ตลิ่งชัน', 'talingchan'],
        ['ธนบุรี', 'thonburi'],
        ['ทุ่งครุ', 'thungkhru'],
        ['วังทองหลาง', 'wangthonglang'],
        ['ยานนาวา', 'yannawa'],
        ['สุขุมวิท', 'sukhumwit'],
        ['สีลม', 'silom'],
        ['ข้าวสาร', 'khaosan'],
        ['เกาะสมุย', 'kosamui'],
        ['เกาะช้าง', 'kochang'],
        ['เขาใหญ่', 'khaoyai'],
        ['ดอยสุเทพ', 'doisuthep'],
        ['วัดโพธิ์', 'watpho'],
        ['วัดอรุณ', 'watarun'],
        ['สนามหลวง', 'sanamluang'],
        ['แม่สาย', 'maesai'],
        ['ปาย', 'pai'],
      ],
      'should transliterate district'
    );
  });

  // Given names of Thai prime ministers whose official spelling matches RTGS.
  describe('Famous people (RTGS given names)', () => {
    runCases(
      [
        ['ทักษิณ', 'thaksin'],
        ['ยิ่งลักษณ์', 'yinglak'],
        ['เศรษฐา', 'settha'],
        ['แพทองธาร', 'phaethongthan'],
        ['อนุทิน', 'anuthin'],
        ['ชวน', 'chuan'],
        ['เปรม', 'prem'],
        ['ปรีดี', 'pridi'],
        ['เสนีย์', 'seni'],
        ['ควง', 'khuang'],
        ['ผิน', 'phin'],
        ['ถนอม', 'thanom'],
        ['สมัคร', 'samak'],
        ['สนธิ', 'sonthi'],
        ['ประวิตร', 'prawit'],
        ['อภิสิทธิ์', 'aphisit'],
        ['ธานินทร์', 'thanin'],
        ['มีชัย', 'michai'],
        ['บรรหาร', 'banhan'],
        ['ทวีสิน', 'thawisin'],
      ],
      'should transliterate person'
    );
  });

  describe('Everyday phrases and things', () => {
    runCases(
      [
        ['สวัสดีค่ะ', 'sawatdikha'],
        ['ขอบคุณมาก', 'khopkhunmak'],
        ['กินข้าว', 'kinkhao'],
        ['น้ำแข็ง', 'namkhaeng'],
        ['อากาศดี', 'akatdi'],
        ['เท่าไหร่', 'thaorai'],
        ['ไม่แพง', 'maiphaeng'],
        ['น่ารัก', 'narak'],
        ['รถติด', 'rottit'],
        ['ห้องน้ำ', 'hongnam'],
        ['โรงแรม', 'rongraem'],
        ['ร้านอาหาร', 'ranahan'],
        ['ตำรวจ', 'tamruat'],
        ['เผ็ดมาก', 'phetmak'],
        ['ไม่เผ็ด', 'maiphet'],
        ['กาแฟ', 'kafae'],
        ['ชาเย็น', 'chayen'],
        ['น้ำปลา', 'nampla'],
        ['หมูกรอบ', 'mukrop'],
        ['ไก่ย่าง', 'kaiyang'],
        ['ข้าวเหนียวมะม่วง', 'khaoniaomamuang'],
        ['เสื้อ', 'suea'],
        ['กางเกง', 'kangkeng'],
        ['รองเท้า', 'rongthao'],
        ['หนังสือ', 'nangsue'],
      ],
      'should transliterate phrase'
    );
  });

  describe('Numbers, colors, days, and time', () => {
    runCases(
      [
        // cardinal numbers
        ['ศูนย์', 'sun'],
        ['หนึ่ง', 'nueng'],
        ['สอง', 'song'],
        ['สาม', 'sam'],
        ['สี่', 'si'],
        ['ห้า', 'ha'],
        ['หก', 'hok'],
        ['เจ็ด', 'chet'],
        ['แปด', 'paet'],
        ['เก้า', 'kao'],
        ['สิบ', 'sip'],
        ['ยี่สิบ', 'yisip'],
        ['ร้อย', 'roi'],
        ['พัน', 'phan'],
        ['หมื่น', 'muen'],
        ['แสน', 'saen'],
        ['ล้าน', 'lan'],
        // colors
        ['แดง', 'daeng'],
        ['เขียว', 'khiao'],
        ['เหลือง', 'lueang'],
        ['ขาว', 'khao'],
        ['ดำ', 'dam'],
        ['ส้ม', 'som'],
        ['เทา', 'thao'],
        // days of the week
        ['วันจันทร์', 'wanchan'],
        ['วันอังคาร', 'wanangkhan'],
        ['วันพุธ', 'wanphut'],
        ['วันศุกร์', 'wansuk'],
        ['วันเสาร์', 'wansao'],
        ['วันอาทิตย์', 'wanathit'],
        // time
        ['เดือน', 'duean'],
        ['ปี', 'pi'],
        ['กลางคืน', 'klangkhuen'],
        ['กลางวัน', 'klangwan'],
      ],
      'should transliterate'
    );
  });

  // Core vocabulary from the Wiktionary Thai Swadesh list, with RTGS spellings.
  describe('Swadesh core vocabulary', () => {
    runCases(
      [
        // pronouns and question words
        ['ฉัน', 'chan'],
        ['คุณ', 'khun'],
        ['เรา', 'rao'],
        ['อะไร', 'arai'],
        ['เมื่อไร', 'muearai'],
        ['อย่างไร', 'yangrai'],
        ['ทั้งหมด', 'thangmot'],
        ['หลาย', 'lai'],
        ['อื่น', 'uen'],
        // adjectives
        ['ใหญ่', 'yai'],
        ['ยาว', 'yao'],
        ['กว้าง', 'kwang'],
        ['หนา', 'na'],
        ['หนัก', 'nak'],
        ['เล็ก', 'lek'],
        ['สั้น', 'san'],
        ['แคบ', 'khaep'],
        ['บาง', 'bang'],
        ['เต็ม', 'tem'],
        ['ใหม่', 'mai'],
        ['เน่า', 'nao'],
        ['ตรง', 'trong'],
        ['กลม', 'klom'],
        ['คม', 'khom'],
        ['เรียบ', 'riap'],
        ['เปียก', 'piak'],
        ['ถูก', 'thuk'],
        ['ร้อน', 'ron'],
        ['หนาว', 'nao'],
        // people and family
        ['หญิง', 'ying'],
        ['ชาย', 'chai'],
        ['เด็ก', 'dek'],
        ['เมีย', 'mia'],
        ['ผัว', 'phua'],
        ['พ่อ', 'pho'],
        ['ลูก', 'luk'],
        ['พี่', 'phi'],
        ['น้อง', 'nong'],
        // animals and nature
        ['สัตว์', 'sat'],
        ['ปลา', 'pla'],
        ['งู', 'ngu'],
        ['หนอน', 'non'],
        ['ต้นไม้', 'tonmai'],
        ['ใบไม้', 'baimai'],
        ['ดอกไม้', 'dokmai'],
        ['หญ้า', 'ya'],
        ['เชือก', 'chueak'],
        ['หนัง', 'nang'],
        ['เนื้อ', 'nuea'],
        ['เลือด', 'lueat'],
        ['กระดูก', 'kraduk'],
        ['ไข่', 'khai'],
        ['หาง', 'hang'],
        // body parts
        ['ผม', 'phom'],
        ['หัว', 'hua'],
        ['หู', 'hu'],
        ['ตา', 'ta'],
        ['จมูก', 'chamuk'],
        ['ปาก', 'pak'],
        ['ฟัน', 'fan'],
        ['ลิ้น', 'lin'],
        ['เล็บ', 'lep'],
        ['เท้า', 'thao'],
        ['ขา', 'kha'],
        ['เข่า', 'khao'],
        ['มือ', 'mue'],
        ['ปีก', 'pik'],
        ['ท้อง', 'thong'],
        ['คอ', 'kho'],
        ['หลัง', 'lang'],
        ['ตับ', 'tap'],
        // verbs
        ['ดื่ม', 'duem'],
        ['กิน', 'kin'],
        ['กัด', 'kat'],
        ['ดูด', 'dut'],
        ['พัด', 'phat'],
        ['เห็น', 'hen'],
        ['รู้', 'ru'],
        ['คิด', 'khit'],
        ['กลัว', 'klua'],
        ['นอน', 'non'],
        ['อยู่', 'yu'],
        ['ตาย', 'tai'],
        ['ฆ่า', 'kha'],
        ['สู้', 'su'],
        ['ตี', 'ti'],
        ['ตัด', 'tat'],
        ['แทง', 'thaeng'],
        ['เกา', 'kao'],
        ['ขุด', 'khut'],
        ['บิน', 'bin'],
        ['เดิน', 'doen'],
        ['นั่ง', 'nang'],
        ['ยืน', 'yuen'],
        ['ตก', 'tok'],
        ['ให้', 'hai'],
        ['บีบ', 'bip'],
        ['ล้าง', 'lang'],
        ['ดึง', 'dueng'],
        ['ผลัก', 'phlak'],
        ['ผูก', 'phuk'],
        ['เย็บ', 'yep'],
        ['นับ', 'nap'],
        ['พูด', 'phut'],
        ['ร้อง', 'rong'],
        ['เล่น', 'len'],
        ['ลอย', 'loi'],
        ['ไหล', 'lai'],
        // world and function words
        ['ดาว', 'dao'],
        ['ฝน', 'fon'],
        ['หิน', 'hin'],
        ['ฝุ่น', 'fun'],
        ['ดิน', 'din'],
        ['เมฆ', 'mek'],
        ['หมอก', 'mok'],
        ['ฟ้า', 'fa'],
        ['ลม', 'lom'],
        ['ไฟ', 'fai'],
        ['เผา', 'phao'],
        ['ทาง', 'thang'],
        ['ใน', 'nai'],
        ['กับ', 'kap'],
        ['และ', 'lae'],
        ['ถ้า', 'tha'],
        ['เพราะ', 'phro'],
        ['ชื่อ', 'chue'],
      ],
      'should transliterate word'
    );
  });

  // Reference romanizations from Wikipedia (Thai cuisine and related pages).
  describe('Common words validated against reference romanizations', () => {
    runCases(
      [
        ['ต้ม', 'tom'],
        ['ยำ', 'yam'],
        ['ตำ', 'tam'],
        ['อาหารไทย', 'ahanthai'],
        ['น้ำตกหมู', 'namtokmu'],
        ['ข้าวเช้า', 'khaochao'],
        ['โจ๊ก', 'chok'],
        ['ข้าวไข่เจียว', 'khaokhaichiao'],
        ['ข้าวต้ม', 'khaotom'],
        ['น้ำเต้าหู้', 'namtaohu'],
        ['ข้าวซอย', 'khaosoi'],
        ['ก๋วยเตี๋ยว', 'kuaitiao'],
        ['บะหมี่', 'bami'],
        ['วุ้นเส้น', 'wunsen'],
        ['ไก่ผัดขิง', 'kaiphatkhing'],
        ['แกงพะแนง', 'kaengphanaeng'],
        ['แกงเผ็ด', 'kaengphet'],
        ['น้ำพริก', 'namphrik'],
        ['ผัดคะน้า', 'phatkhana'],
        ['ต้มจืด', 'tomchuet'],
        ['ต้มข่าไก่', 'tomkhakai'],
        ['ผัดกะเพรา', 'phatkaphrao'],
        ['ประเทศไทย', 'prathetthai'],
        ['ภาษาไทย', 'phasathai'],
        ['สนามบิน', 'sanambin'],
        ['โรงพยาบาล', 'rongphayaban'],
        ['ตลาด', 'talat'],
        ['ถนน', 'thanon'],
        ['แม่น้ำ', 'maenam'],
        ['ทะเล', 'thale'],
        ['ภูเขา', 'phukhao'],
        ['สถานี', 'sathani'],
        ['มะม่วง', 'mamuang'],
        ['มะพร้าว', 'maphrao'],
        ['จักรยาน', 'chakkrayan'],
        ['มหาวิทยาลัย', 'mahawitthayalai'],
      ],
      'should transliterate word'
    );
  });

  describe('Thai food names', () => {
    runCases(
      [
        ['ผัดไทย', 'phatthai'],
        ['ต้มยำ', 'tomyam'],
        ['ต้มยำกุ้ง', 'tomyamkung'],
        ['ส้มตำ', 'somtam'],
        ['ข้าวผัด', 'khaophat'],
        ['แกง', 'kaeng'],
        ['แกงเขียวหวาน', 'kaengkhiaowan'],
        ['ข้าวเหนียว', 'khaoniao'],
      ],
      'should transliterate food'
    );
  });

  describe('Common Thai words and phrases', () => {
    runCases(
      [
        ['สบายดี', 'sabaidi'],
        ['ขอบคุณ', 'khopkhun'],
        ['ไม่เป็นไร', 'maipenrai'],
        ['เข้าใจ', 'khaochai'],
        ['อร่อย', 'aroi'],
        ['ยินดี', 'yindi'],
        ['โชคดี', 'chokdi'],
        ['สวัสดีครับ', 'sawatdikhrap'],
      ],
      'should transliterate phrase'
    );
  });

  describe('Consonants - initial position', () => {
    runCases(
      [
        ['กา', 'ka'],
        ['ขา', 'kha'],
        ['คา', 'kha'],
        ['งา', 'nga'],
        ['จา', 'cha'],
        ['ชา', 'cha'],
        ['ซา', 'sa'],
        ['ญา', 'ya'],
        ['ดา', 'da'],
        ['ตา', 'ta'],
        ['ถา', 'tha'],
        ['ทา', 'tha'],
        ['นา', 'na'],
        ['บา', 'ba'],
        ['ปา', 'pa'],
        ['ผา', 'pha'],
        ['ฟา', 'fa'],
        ['พา', 'pha'],
        ['มา', 'ma'],
        ['ยา', 'ya'],
        ['รา', 'ra'],
        ['ลา', 'la'],
        ['วา', 'wa'],
        ['ศา', 'sa'],
        ['ษา', 'sa'],
        ['สา', 'sa'],
        ['หา', 'ha'],
        ['ฮา', 'ha'],
      ],
      'should map initial consonant'
    );
  });

  describe('Consonants - final position (RTGS final mapping)', () => {
    runCases(
      [
        ['นก', 'nok'],
        ['คน', 'khon'],
        ['ใจ', 'chai'],
        ['บ้าน', 'ban'],
        ['เมือง', 'mueang'],
        ['รัก', 'rak'],
        ['น้ำ', 'nam'],
        ['หก', 'hok'],
        ['กอก', 'kok'],
        ['กอด', 'kot'],
        ['กบ', 'kop'],
        ['กาง', 'kang'],
        ['กัน', 'kan'],
        ['กำ', 'kam'],
        ['กาย', 'kai'],
        ['กาว', 'kao'],
        ['บาด', 'bat'],
        ['บาน', 'ban'],
        ['บาม', 'bam'],
        ['บาย', 'bai'],
        ['บาว', 'bao'],
      ],
      'should map final consonant in'
    );
  });

  describe('Consonant clusters (RTGS true clusters)', () => {
    runCases(
      [
        ['กราบ', 'krap'],
        ['กลาง', 'klang'],
        ['กวาง', 'kwang'],
        ['กล้วย', 'kluai'],
        ['ขวา', 'khwa'],
        ['ขวาง', 'khwang'],
        ['ขวัญ', 'khwan'],
        ['ครู', 'khru'],
        ['ครับ', 'khrap'],
        ['คลอง', 'khlong'],
        ['ความ', 'khwam'],
        ['ควาย', 'khwai'],
        ['ตรวจ', 'truat'],
        ['ปรับ', 'prap'],
        ['ปลา', 'pla'],
        ['ปลาย', 'plai'],
        ['ปลุก', 'pluk'],
        ['พระ', 'phra'],
        ['พราว', 'phrao'],
        ['เพราะ', 'phro'],
        ['เพลง', 'phleng'],
        ['เพลิน', 'phloen'],
        ['โปรด', 'prot'],
        ['ไกล', 'klai'],
        ['ใคร', 'khrai'],
      ],
      'should handle cluster'
    );
  });

  describe('False clusters and silent ร', () => {
    runCases(
      [
        ['ทราบ', 'sap'],
        ['ทราย', 'sai'],
        ['ทรง', 'song'],
        ['จริง', 'ching'],
        ['ศรี', 'si'],
        ['สร้าง', 'sang'],
        ['เศร้า', 'sao'],
        ['สตรี', 'satri'],
        ['สวรรค์', 'sawan'],
        ['ทวี', 'thawi'],
        ['ทวน', 'thuan'],
        ['กวาด', 'kwat'],
        ['ทอง', 'thong'],
      ],
      'should handle false cluster'
    );
  });

  describe('Leading vowels (sara e, ae, o, ai)', () => {
    runCases(
      [
        ['เอน', 'en'],
        ['แก', 'kae'],
        ['เลย', 'loei'],
        ['เหลอ', 'loe'],
        ['เมนู', 'menu'],
        ['เขียว', 'khiao'],
        ['เริง', 'roeng'],
        ['เร็ว', 'reo'],
        ['แก้ว', 'kaeo'],
        ['แมว', 'maeo'],
        ['แขวน', 'khwaen'],
        ['ใบ', 'bai'],
        ['ไหม', 'mai'],
        ['ใหญ่', 'yai'],
        ['โต้', 'to'],
        ['เหมา', 'mao'],
        ['แม่', 'mae'],
        ['เล่า', 'lao'],
        ['เหล่า', 'lao'],
        ['แสง', 'saeng'],
        ['แซว', 'saeo'],
        ['แสน', 'saen'],
        ['แฮน', 'haen'],
        ['แอ็ก', 'aek'],
        ['เเอก', 'aek'],
        ['เเอ็ม', 'aem'],
        ['เเอ', 'ae'],
        ['ไก่', 'kai'],
        ['ไก', 'kai'],
        ['ไข่', 'khai'],
        ['ไข', 'khai'],
        ['ใบ้', 'bai'],
        ['ใกล้', 'klai'],
        ['ใกล้ชิด', 'klaichit'],
      ],
      'should handle leading vowel in'
    );
  });

  describe('Following vowels (sara a, i, ue, u, ...)', () => {
    runCases(
      [
        ['กึ', 'kue'],
        ['กื', 'kue'],
        ['กุหลาบ', 'kulap'],
        ['หนึ่ง', 'nueng'],
        ['สอง', 'song'],
        ['หก', 'hok'],
        ['กิ', 'ki'],
        ['กี', 'ki'],
        ['กุ', 'ku'],
        ['กู', 'ku'],
        ['เกะ', 'ke'],
        ['เก', 'ke'],
        ['แกะ', 'kae'],
        ['แก', 'kae'],
        ['โกะ', 'ko'],
        ['โก', 'ko'],
        ['เกาะ', 'ko'],
        ['เกอะ', 'koe'],
        ['เกอ', 'koe'],
        ['เกิน', 'koen'],
        ['เกิด', 'koet'],
        ['เกี้ยน', 'kian'],
        ['เกี้ยว', 'kiao'],
        ['เกี๊ยว', 'kiao'],
        ['เกือก', 'kueak'],
        ['เกลอะ', 'kloe'],
        ['เกลอ', 'kloe'],
        ['เกลือ', 'kluea'],
      ],
      'should handle following vowel in'
    );
  });

  describe('Sara Am (ำ)', () => {
    runCases(
      [
        ['กำ', 'kam'],
        ['กำลัง', 'kamlang'],
        ['รำ', 'ram'],
        ['สาม', 'sam'],
        ['ทำ', 'tham'],
        ['กำหนด', 'kamnot'],
        ['จำ', 'cham'],
        ['จำกัด', 'chamkat'],
        ['น้ำ', 'nam'],
        ['อำนาจ', 'amnat'],
      ],
      'should handle sara am in'
    );
  });

  describe('Tone marks (ignored)', () => {
    runCases(
      [
        ['ข้าว', 'khao'],
        ['ข่า', 'kha'],
        ['ข้า', 'kha'],
        ['ข๊า', 'kha'],
        ['ข๋า', 'kha'],
        ['กา', 'ka'],
        ['ก่า', 'ka'],
        ['ก้า', 'ka'],
        ['ก๊า', 'ka'],
        ['ก๋า', 'ka'],
        ['ม้า', 'ma'],
        ['หม่า', 'ma'],
        ['หม้า', 'ma'],
        ['หม๊า', 'ma'],
        ['หม๋า', 'ma'],
      ],
      'should ignore tone marks in'
    );
  });

  describe('Silencing mark (karant)', () => {
    runCases(
      [
        ['รถ', 'rot'],
        ['สามารถ', 'samat'],
        ['สุขสันต์', 'suksan'],
        ['สัตว์', 'sat'],
        ['รถไฟ', 'rotfai'],
        ['รถเมล์', 'rotme'],
        ['มานุษย์', 'manut'],
        ['บัตร', 'bat'],
        ['เพชร', 'phet'],
        ['จันทร์', 'chan'],
        ['ศาสตร์', 'sat'],
        ['อาจารย์', 'achan'],
        ['พิธี', 'phithi'],
        ['พิธีฯ', 'phithi'],
      ],
      'should handle silencing mark in'
    );
  });

  describe('Silent ห before sonorants', () => {
    runCases(
      [
        ['หมา', 'ma'],
        ['หมอ', 'mo'],
        ['หมู', 'mu'],
        ['หมุน', 'mun'],
        ['หมด', 'mot'],
        ['หมวก', 'muak'],
        ['หม่ำ', 'mam'],
        ['หมี', 'mi'],
        ['หยุด', 'yut'],
        ['หยาบ', 'yap'],
        ['หรู', 'ru'],
        ['หรือ', 'rue'],
        ['หรี่', 'ri'],
        ['เหลือ', 'luea'],
        ['เหล็ก', 'lek'],
        ['เหวี่ยง', 'wiang'],
        ['เหว่า', 'wao'],
        ['หงอน', 'ngon'],
        ['หงาย', 'ngai'],
        ['หงุดหงิด', 'ngutngit'],
        ['กะหรี่', 'kari'],
        // ห before ว that carries the "ua" vowel stays pronounced
        ['หวง', 'huang'],
        ['หวย', 'huai'],
        ['หวาน', 'wan'],
      ],
      'should handle silent ห in'
    );
  });

  describe('Silent initials อ (O Ang) and อ นำ', () => {
    runCases(
      [
        ['อากาศ', 'akat'],
        ['อาหาร', 'ahan'],
        ['อรุณ', 'arun'],
        ['อ่อน', 'on'],
        ['อ้อม', 'om'],
        ['อี', 'i'],
        ['อุ', 'u'],
        ['เอา', 'ao'],
        ['อาวุธ', 'awut'],
        ['อิ่ม', 'im'],
        ['อึม', 'uem'],
        ['อาจ', 'at'],
        ['อย่า', 'ya'],
        ['อยู่', 'yu'],
        ['อย่าง', 'yang'],
        ['อยาก', 'yak'],
      ],
      'should handle silent อ in'
    );
  });

  describe('Special vowel combinations', () => {
    runCases(
      [
        ['ค่ะ', 'kha'],
        ['เชื่อ', 'chuea'],
        ['เลี้ยง', 'liang'],
        ['เปลี่ยน', 'plian'],
        ['ซื่อ', 'sue'],
        ['อู้', 'u'],
        ['อื้อ', 'ue'],
        ['เอีย', 'ia'],
        ['เอียะ', 'ia'],
        ['เอี้ยว', 'iao'],
        ['เอี้ยง', 'iang'],
        ['เอื้อ', 'uea'],
        ['เอื่อย', 'ueai'],
        ['เอื้อง', 'ueang'],
        ['เอือ', 'uea'],
        ['เอย', 'oei'],
        ['เอว', 'eo'],
        ['แอว', 'aeo'],
        ['โอะ', 'o'],
        ['โอ', 'o'],
        ['ออ', 'o'],
        ['เอาะ', 'o'],
        ['หัว', 'hua'],
        ['หัวใจ', 'huachai'],
        ['หิว', 'hio'],
        ['ด้วย', 'duai'],
        ['กฤต', 'krit'],
      ],
      'should handle special vowels in'
    );
  });

  describe('Thai numerals', () => {
    runCases(
      [
        ['๐', '0'],
        ['๑', '1'],
        ['๒', '2'],
        ['๓', '3'],
        ['๔', '4'],
        ['๕', '5'],
        ['๖', '6'],
        ['๗', '7'],
        ['๘', '8'],
        ['๙', '9'],
        ['๑๒๓', '123'],
        ['๒๐๒๔', '2024'],
        ['ปี ๒๐๒๔', 'pi 2024'],
      ],
      'should convert Thai numerals'
    );
  });

  describe('Mixed Thai and Latin text', () => {
    runCases(
      [
        ['สวัสดี Hello', 'sawatdi Hello'],
        ['Hello เชียงใหม่', 'Hello chiangmai'],
        ['Test ไทย Test', 'Test thai Test'],
        ['กรุงเทพฯ', 'krungthep'],
      ],
      'should handle mixed text'
    );
  });

  describe('RTGS specific vowel rules', () => {
    runCases(
      [
        ['เ', 'e'],
        ['เระ', 're'],
        ['เริง', 'roeng'],
        ['เริ่ม', 'roem'],
        ['เริ่มต้น', 'roemton'],
        ['แ', 'ae'],
        ['แระ', 'rae'],
        ['แรง', 'raeng'],
        ['แตก', 'taek'],
        ['โ', 'o'],
        ['โระ', 'ro'],
        ['โรง', 'rong'],
        ['โรงเรียน', 'rongrian'],
        ['ใ', 'ai'],
        ['ไ', 'ai'],
        ['กะ', 'ka'],
        ['กา', 'ka'],
        ['กิ', 'ki'],
        ['กี', 'ki'],
        ['กึ', 'kue'],
        ['กื', 'kue'],
        ['กุ', 'ku'],
        ['กู', 'ku'],
        ['เกะ', 'ke'],
        ['แกะ', 'kae'],
        ['โกะ', 'ko'],
      ],
      'should handle RTGS vowel'
    );
  });

  describe('isThai()', () => {
    it('should return true for Thai text', () => {
      expect(isThai('สวัสดี')).toBe(true);
      expect(isThai('ไทย')).toBe(true);
      expect(isThai('๑')).toBe(true);
      expect(isThai('สบายดีไหม')).toBe(true);
    });

    it('should return false for non-Thai text', () => {
      expect(isThai('Hello')).toBe(false);
      expect(isThai('你好')).toBe(false);
      expect(isThai('123')).toBe(false);
      expect(isThai('')).toBe(false);
    });

    it('should return true for mixed text containing Thai', () => {
      expect(isThai('Hello สวัสดี')).toBe(true);
      expect(isThai('Test ไทย Test')).toBe(true);
    });
  });

  describe('parseThai() syllable segmentation', () => {
    it('should split "สวัสดี" into syllables', () => {
      expect(parseThai('สวัสดี')).toEqual(['sa', 'wat', 'di']);
    });

    it('should split "กรุงเทพ" keeping the cluster together', () => {
      expect(parseThai('กรุงเทพ')).toEqual(['krung', 'thep']);
    });

    it('should split leading-vowel words', () => {
      expect(parseThai('เชียงใหม่')).toEqual(['chiang', 'mai']);
    });

    it('should handle silent ห', () => {
      expect(parseThai('ห้อง')).toEqual(['hong']);
    });

    it('should handle silent อ', () => {
      expect(parseThai('อากาศ')).toEqual(['a', 'kat']);
    });

    it('should not let a long-vowel syllable absorb the next word', () => {
      expect(parseThai('อยู่บนปุ่ม')).toEqual(['yu', 'bon', 'pum']);
    });
  });

  describe('Mai yamok (ๆ) reduplication', () => {
    runCases(
      [
        ['เล็กๆ', 'lek lek'],
        ['เด็กๆ', 'dek dek'],
        ['ต่างๆ', 'tang tang'],
        ['เร็วๆ', 'reo reo'],
        ['บ่อยๆ', 'boi boi'],
        ['ช้าๆ', 'cha cha'],
        ['ใหญ่ๆ', 'yai yai'],
      ],
      'should repeat the preceding syllable for'
    );

    it('should ignore a leading ๆ with nothing to repeat', () => {
      expect(transliterateThai('ๆ')).toBe('');
    });
  });

  // Word boundaries derived without a dictionary, validated against
  // thai2english.com's segmentation on a real news paragraph.
  describe('Multi-word phrases (real text)', () => {
    runCases(
      [
        // A long-vowel syllable must not absorb the next word's onset:
        // อยู่ + บน + ปุ่ม, not "yup + na + pum".
        ['อยู่บนปุ่ม', 'yubonpum'],
        ['ต่างจากปุ่มอื่น', 'tangchakpumuen'],
        ['ที่เรียบสนิท', 'thiriapsanit'],
        ['แป้นพิมพ์คอมพิวเตอร์', 'paenphimkhomphiotoe'],
        ['หลายคนอาจคิด', 'laikhonatkhit'],
        ['เป็นเพียงดีไซน์', 'penphiangdisai'],
        ['มีขีดนูนเล็กๆ', 'mikhitnunlek lek'],
      ],
      'should transliterate phrase'
    );
  });

  // Individual words from a real news article (thairath.co.th, on keyboard
  // F/J bumps), each verified word-by-word against thai2english's reading.
  // Not covered (lexical, need a dictionary): เหตุผล (hetphon), โดยเฉพาะ
  // (dochapho), มาตรฐาน (matrathan).
  describe('Words from a news article', () => {
    runCases(
      [
        ['แป้นพิมพ์', 'paenphim'],
        ['คอมพิวเตอร์', 'khomphiotoe'],
        ['สังเกต', 'sangket'],
        ['ขีดนูน', 'khitnun'],
        ['ฟังก์ชัน', 'fangchan'],
        ['ออกแบบ', 'okbaep'],
        ['ตั้งใจ', 'tangchai'],
        ['แม่นยำ', 'maenyam'],
        ['สัมผัส', 'samphat'],
        ['คีย์บอร์ด', 'khibot'],
        ['เรียกว่า', 'riakwa'],
        ['จุดสัมผัส', 'chutsamphat'],
        ['อ้างอิง', 'anging'],
        ['ตำแหน่ง', 'tamnaeng'],
        ['ถูกต้อง', 'thuktong'],
        ['นิ้วชี้', 'niochi'],
        ['นิ้วก้อย', 'niokoi'],
        ['นิ้วนาง', 'nionang'],
        ['นิ้วกลาง', 'nioklang'],
        ['เรียง', 'riang'],
        ['แถวกลาง', 'thaeoklang'],
        ['ปลายนิ้ว', 'plainio'],
        ['ทันที', 'thanthi'],
        ['หน้าจอ', 'nacho'],
        ['ระบบ', 'rabop'],
        ['เบื้องต้น', 'bueangton'],
        ['ท่องจำ', 'thongcham'],
        ['กึ่งกลาง', 'kuengklang'],
        ['เริ่มต้น', 'roemton'],
        ['สากล', 'sakon'],
        ['มืออาชีพ', 'mueachip'],
        ['โปรแกรมเมอร์', 'prokraemmoe'],
        ['นักเขียน', 'nakkhian'],
        ['พนักงาน', 'phanakngan'],
        ['ออฟฟิศ', 'opfit'],
        ['จำนวน', 'chamnuan'],
        ['ประสิทธิภาพ', 'prasitthiphap'],
        ['เคลื่อนไหว', 'khlueanwai'],
        ['จำเป็น', 'champen'],
        ['ความเร็ว', 'khwamreo'],
        ['โอกาส', 'okat'],
        ['ต่อเนื่อง', 'tonueang'],
        ['โฟกัส', 'fokat'],
        ['โน้ตบุ๊ก', 'notbuk'],
        ['เหมือนเดิม', 'mueandoem'],
        ['ความสำคัญ', 'khwamsamkhan'],
        ['สายตา', 'saita'],
        ['เลือนราง', 'lueanrang'],
        ['ตัวอักษร', 'tuaakson'],
        ['สะดวก', 'saduak'],
        ['เข้าถึง', 'khaothueng'],
        ['รายละเอียด', 'railaiat'],
        ['สวยงาม', 'suaingam'],
        ['รวดเร็ว', 'ruatreo'],
        ['ประโยชน์', 'prayot'],
        ['แนวคิด', 'naeokhit'],
        ['เรียบง่าย', 'riapngai'],
      ],
      'should transliterate article word'
    );
  });

  // Pali/Sanskrit loanwords with a lexically-silent final vowel, handled by the
  // curated SILENT_FINAL_VOWEL_MORPHEMES list (verified against thai2english).
  describe('Silent final vowel (Pali/Sanskrit)', () => {
    runCases(
      [
        ['ชาติ', 'chat'],
        ['ญาติ', 'yat'],
        ['เหตุ', 'het'],
        ['ธาตุ', 'that'],
        ['เกตุ', 'ket'],
        ['เกียรติ', 'kiat'],
        ['ภูมิ', 'phum'],
        ['โชติ', 'chot'],
        ['เมรุ', 'men'],
        ['กุฏิ', 'kut'],
        ['วิกฤติ', 'wikrit'],
        ['ประวัติ', 'prawat'],
        ['ปฏิวัติ', 'patiwat'],
        ['ปฏิบัติ', 'patibat'],
        ['สมบัติ', 'sombat'],
        ['อุบัติ', 'ubat'],
        ['อนุมัติ', 'anumat'],
        ['อัตโนมัติ', 'atnomat'],
        ['บัญญัติ', 'banyat'],
        ['สมมุติ', 'sommut'],
        ['มังสวิรัติ', 'mangsawirat'],
        ['จักรพรรดิ', 'chakkraphat'],
        ['จักรวรรดิ', 'chakkrawat'],
        // matched compound-final too
        ['ธรรมชาติ', 'thammachat'],
        ['สาเหตุ', 'sahet'],
        ['คุณสมบัติ', 'khunsombat'],
        ['พระราชบัญญัติ', 'phraratchabanyat'],
        ['เหตุผล', 'hetphon'],
      ],
      'should drop the silent final vowel in'
    );
  });

  // Identically shaped words whose final vowel IS pronounced must be untouched
  // by the silent-final-vowel list.
  describe('Pronounced final vowel (not silenced)', () => {
    runCases(
      [
        ['สติ', 'sati'],
        ['อายุ', 'ayu'],
        ['ครุ', 'khru'],
        ['วัตถุ', 'watthu'],
        ['มติ', 'mati'],
        ['สันติ', 'santi'],
        ['นิติ', 'niti'],
        ['สมาธิ', 'samathi'],
        ['ระบุ', 'rabu'],
        ['เมนู', 'menu'],
      ],
      'should keep the final vowel in'
    );
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(transliterateThai('')).toBe('');
    });

    it('should handle only tone marks', () => {
      expect(transliterateThai('่้๊๋')).toBe('');
    });

    it('should handle only silencing marks', () => {
      expect(transliterateThai('์์์')).toBe('');
    });

    it('should handle words with only vowels', () => {
      expect(transliterateThai('อา')).toBe('a');
      expect(transliterateThai('เอา')).toBe('ao');
    });

    it('should handle single consonants (implicit a)', () => {
      expect(transliterateThai('ก')).toBe('ka');
      expect(transliterateThai('ม')).toBe('ma');
      expect(transliterateThai('น')).toBe('na');
      expect(transliterateThai('ห')).toBe('ha');
    });

    it('should drop ฯ (paiyannoi)', () => {
      expect(transliterateThai('กรุงเทพฯ')).toBe('krungthep');
    });
  });
});
