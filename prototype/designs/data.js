// Önizleme için örnek veri (gerçek sürümde kullanıcının notlarından gelir).
export const TOPICS = [
  { key: 'İŞ & GİRİŞİM', color: '#f5a524', lobe: [0, 0.16, 0.74] },
  { key: 'TEKNOLOJİ & YZ', color: '#8b6cff', lobe: [0, 0.5, -0.08] },
  { key: 'BİLİM', color: '#22c3ee', lobe: [0, 0.12, -0.86] },
  { key: 'SAĞLIK', color: '#2ecc8f', lobe: [-0.6, -0.14, 0.1] },
  { key: 'GENEL KÜLTÜR', color: '#ff7aa8', lobe: [0.6, -0.14, 0.1] },
  { key: 'DİĞER', color: '#9aa7bd', lobe: [0, -0.5, -0.74] },
];

export const LINK_TYPES = [
  { key: 'destekler', color: '#33d69f' },
  { key: 'çelişir', color: '#ff4d6d' },
  { key: 'örneğidir', color: '#f5a524' },
  { key: 'devamıdır', color: '#36d6ff' },
  { key: 'aynı konu', color: '#9d8bff' },
  { key: 'neden-sonuç', color: '#ffb86b' },
];

const S = [
  // [başlık, konu]
  ['Değer bazlı fiyatlandırma rehberi', 0], ['SaaS’ta ilk 100 müşteri', 0], ['Tek kişilik şirketlerin yükselişi', 0],
  ['Girişimlerde nakit akışı hataları', 0], ['Niş pazarlarda büyüme', 0], ['Abonelik yorgunluğu raporu', 0],
  ['Ürün-pazar uyumu nasıl ölçülür', 0], ['Yapay zeka ajanlarıyla operasyon', 0],
  ['Büyük dil modelleri nasıl düşünür', 1], ['Ajan mimarileri: araç kullanan modeller', 1], ['Vektör veritabanları karşılaştırması', 1],
  ['Açık kaynak modellerin durumu', 1], ['Bağlam penceresi ve hafıza', 1], ['Yapay zekada değerlendirme sorunu', 1],
  ['Kod yazan modeller ve verimlilik', 1], ['Uç cihazlarda küçük modeller', 1], ['İkinci beyin yazılımları', 1],
  ['Uykunun hafızaya etkisi', 2], ['Nöroplastisite: yetişkin beyni değişir mi', 2], ['Dikkat ve dopamin döngüsü', 2],
  ['Kuantum hesaplamada hata düzeltme', 2], ['Tekrarlanabilirlik krizi', 2], ['Karmaşık sistemlerde beliriş', 2],
  ['Sinaps budanması ve öğrenme', 2],
  ['Aralıklı oruç meta-analizi', 3], ['Yapay zekayla erken teşhis', 3], ['Bağırsak-beyin ekseni', 3],
  ['Giyilebilir cihazlarla uyku takibi', 3], ['Kuvvet antrenmanı ve uzun ömür', 3], ['Kronik stresin biyolojisi', 3],
  ['Stoacılık ve modern iş hayatı', 4], ['Zettelkasten yöntemi', 4], ['Rönesans atölyeleri nasıl çalışırdı', 4],
  ['Derin çalışma üzerine notlar', 4], ['Osmanlı’da bilgi ağları', 4], ['Okuma alışkanlığı ve dikkat süresi', 4],
  ['Okunacaklar listesi — kasım', 5], ['Podcast notları: verimlilik', 5], ['Rastgele gözlemler', 5],
];
const C = [
  // [kavram/kişi, konu, tür]
  ['Büyük dil modeli', 1, 'concept'], ['Yapay zeka ajanı', 1, 'concept'], ['Hafıza pekiştirme', 2, 'concept'],
  ['Dopamin', 2, 'concept'], ['Ürün-pazar uyumu', 0, 'concept'], ['Derin çalışma', 4, 'concept'],
  ['Niklas Luhmann', 4, 'person'], ['Ramón y Cajal', 2, 'person'], ['Tekrarlanan gelir', 0, 'concept'],
  ['Sirkadiyen ritim', 3, 'concept'], ['Gömme vektörü', 1, 'concept'], ['Bileşik etki', 0, 'concept'],
];
// Demo "Ekle" akışında beyne eklenecek yedek not.
const SPARE = [['Dikkat ekonomisinde ikinci beyin araçları', 1]];

function rng(seed) { let s = seed; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296); }

export function buildData() {
  const r = rng(7);
  const nodes = [];
  S.forEach(([title, topic], i) => nodes.push({ id: i, title, topic, type: 'source', days: Math.floor(r() * 220) }));
  C.forEach(([title, topic, type]) => nodes.push({ id: nodes.length, title, topic, type, days: Math.floor(r() * 60) }));
  SPARE.forEach(([title, topic]) => nodes.push({ id: nodes.length, title, topic, type: 'source', days: 0, spare: true }));
  const links = [];
  const has = new Set();
  const add = (a, b, type, spare) => {
    if (a === b) return;
    const k = Math.min(a, b) + '-' + Math.max(a, b);
    if (has.has(k)) return;
    has.add(k);
    links.push({ id: links.length, a, b, type, spare: !!spare });
  };
  const src = nodes.filter((n) => n.type === 'source' && !n.spare);
  for (const n of src) {
    const same = src.filter((m) => m.topic === n.topic && m.id !== n.id);
    add(n.id, same[Math.floor(r() * same.length)].id, Math.floor(r() * 6));
    if (r() < 0.45) add(n.id, same[Math.floor(r() * same.length)].id, Math.floor(r() * 6));
    if (r() < 0.3) add(n.id, src[Math.floor(r() * src.length)].id, r() < 0.4 ? 1 : 4);
  }
  for (const c of nodes.filter((n) => n.type !== 'source')) {
    const k = 3 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) {
      const pool = r() < 0.75 ? src.filter((m) => m.topic === c.topic) : src;
      add(c.id, pool[Math.floor(r() * pool.length)].id, 4);
    }
  }
  const spare = nodes.find((n) => n.spare);
  add(spare.id, 16, 3, true); add(spare.id, 33, 0, true); add(spare.id, 19, 5, true); add(spare.id, 39 + 5, 4, true);
  return { nodes, links };
}

export const IDEAS = {
  title: 'ARŞİV',
  branches: [
    { type: 'SENTEZ', items: [
      { title: 'Uyku + aralıklı tekrar = kişisel öğrenme takvimi', body: 'Uykunun hafıza pekiştirmedeki rolü ile Zettelkasten’in tekrar mantığını birleştir: notlar, uykudan önceki son 30 dakikada yeniden gösterilsin.', s: [8, 7, 6], from: [17, 31] },
      { title: 'Dikkat süresi, model bağlam penceresi gibi yönetilebilir', body: 'Dil modellerindeki bağlam yönetimi teknikleri (özetleme, önceliklendirme) insan dikkatine uyarlanabilir.', s: [9, 5, 7], from: [12, 35] },
      { title: 'Sinaps budanması bir bilgi yönetimi ilkesi', body: 'Beyin kullanılmayan bağlantıları budar; not arşivi de aynı şekilde seyreltilmeli.', s: [7, 8, 5], from: [23, 31] },
    ] },
    { type: 'İŞ FİKRİ', items: [
      { title: 'Tek kişilik şirketler için ajan operasyon paketi', body: 'Fatura, destek ve raporlamayı yürüten hazır ajan seti. Değer bazlı fiyatlandırma: kazandırdığı saate göre ücret.', s: [6, 8, 9], from: [2, 7, 0] },
      { title: 'Giyilebilir veriden kişisel sağlık özeti', body: 'Uyku ve antrenman verisini haftalık, sade bir “vücut raporu”na çeviren abonelik.', s: [5, 7, 7], from: [27, 28] },
    ] },
    { type: 'ARAŞTIRMA', items: [
      { title: 'Küçük modeller niş görevlerde büyükleri geçer mi?', body: 'Uç cihazlardaki küçük modellerin belirli görevlerde maliyet/başarı dengesini ölç.', s: [6, 9, 6], from: [15, 13] },
      { title: 'Abonelik yorgunluğu hangi fiyat eşiğinde başlıyor?', body: 'Raporlardaki bulgular birbirini tutmuyor; eşik sektöre göre değişiyor olabilir.', s: [5, 8, 7], from: [5, 0] },
    ] },
    { type: 'HİPOTEZ', items: [
      { title: 'Ajanlar yaygınlaştıkça “ürün-pazar uyumu” süresi kısalacak', body: 'Deneme maliyeti düştükçe girişimler uyumu daha hızlı bulacak; farklılaşma dağıtıma kayacak.', s: [8, 4, 9], from: [6, 7, 9] },
      { title: 'Kronik stres, öğrenmeyi dopamin üzerinden bozuyor', body: 'Stres biyolojisi ile dikkat döngüsü notları aynı mekanizmaya işaret ediyor.', s: [7, 5, 6], from: [29, 19] },
    ] },
  ],
};
