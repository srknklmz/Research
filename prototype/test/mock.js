// Yerel test için window.claude taklidi (bellek içi db + sahte yapay zeka).
(() => {
  const store = new Map();
  const listeners = new Set();
  const emit = (changes) => listeners.forEach((fn) => fn(changes));
  const snapDoc = (id, data) => ({ id, exists: true, data: () => data, metadata: { fromCache: false, hasPendingWrites: false } });
  const collection = (path) => ({
    path,
    doc: (id) => ({
      id, path: path + '/' + id,
      async get() { const d = store.get(id); return d ? snapDoc(id, d) : { id, exists: false, data: () => undefined }; },
      async set(data) { const type = store.has(id) ? 'modified' : 'added'; store.set(id, data); emit([{ type, doc: snapDoc(id, data) }]); },
      async update(data) { store.set(id, { ...store.get(id), ...data }); emit([{ type: 'modified', doc: snapDoc(id, store.get(id)) }]); },
      async delete() { const d = store.get(id); store.delete(id); if (d) emit([{ type: 'removed', doc: snapDoc(id, d) }]); },
    }),
    onSnapshot(next) {
      const fn = (changes) => next({ docs: [], size: store.size, empty: !store.size, docChanges: () => changes, metadata: { fromCache: false, hasPendingWrites: false } });
      listeners.add(fn);
      setTimeout(() => fn([...store].map(([id, d]) => ({ type: 'added', doc: snapDoc(id, d) }))), 50);
      return () => listeners.delete(fn);
    },
  });
  let n = 0;
  const sample = async (input, opts) => {
    const p = typeof input === 'string' ? input : input.map((m) => m.content).join('\n');
    await new Promise((r) => setTimeout(r, 120));
    n++;
    if (p.includes('"sourceType"')) {
      const variants = [
        { title: 'Büyük dil modelleri ve ajanlar', topic: 'Teknoloji & YZ', tags: ['yapay zeka', 'ajanlar', 'llm'], concepts: [{ name: 'Yapay zeka ajanı', explanation: 'Araç kullanarak görev tamamlayan model.' }, { name: 'Büyük dil modeli', explanation: 'Metin üreten büyük sinir ağı.' }], people: [{ name: 'Anthropic', role: 'Model geliştirici' }] },
        { title: 'Sağlıkta yapay zeka teşhis araçları', topic: 'Sağlık', tags: ['sağlık', 'yapay zeka', 'teşhis'], concepts: [{ name: 'Büyük dil modeli', explanation: 'Teşhis destek sistemlerinde kullanılıyor.' }], people: [] },
        { title: 'Girişimlerde fiyatlandırma stratejisi', topic: 'İş & Girişim', tags: ['girişim', 'fiyatlandırma', 'saas'], concepts: [{ name: 'Değer bazlı fiyatlandırma', explanation: 'Müşteri değerine göre fiyat.' }], people: [{ name: 'Anthropic', role: 'Örnek şirket' }] },
      ];
      const v = variants[(n / 2 | 0) % variants.length];
      return { text: JSON.stringify({ ...v, sourceType: 'makale', language: 'İngilizce', summary: 'Bu bir test özetidir: ' + v.title, longSummary: 'Uzun özet paragrafı.', keyPoints: ['Birinci fikir', 'İkinci fikir', 'Üçüncü fikir'], credibility: { score: 4, verdict: 'Genel olarak güvenilir.', notes: ['Kaynak belirtilmiş'] }, counterViews: ['Karşıt görüş'], qa: [{ q: 'Neden önemli?', a: 'Çünkü test.' }], critique: ['Örneklem küçük'], actions: ['Bir deneme yap'], events: [{ date: '2025', text: 'Olay' }], imageNotes: '' }), truncated: false };
    }
    if (p.includes('"links"')) {
      const ids = [...p.matchAll(/id: (n_[a-z0-9]+)/g)].map((m) => m[1]);
      return { text: JSON.stringify({ links: ids.slice(0, 2).map((id, i) => ({ id, type: i ? 'çelişir' : 'destekler', reason: 'Test bağlantı nedeni', strength: 2 })), ideas: [{ title: 'Test fikri ' + n, body: 'Fikir açıklaması', type: 'iş fikri', novelty: 7, feasibility: 6, potential: 8, fromNotes: ids.slice(0, 1) }], projectHints: [] }), truncated: false };
    }
    return { text: '### Başlık\n- madde bir\n- madde iki', truncated: false };
  };
  sample.limits = async () => ({ images: true });
  window.claude = {
    use: async (name) => {
      await new Promise((r) => setTimeout(r, 30));
      if (name === 'db') return { collection, doc: () => null };
      if (name === 'user') return { id: async () => 'u1', isOwner: async () => true };
      if (name === 'sample') return sample;
      return null;
    },
  };
})();
