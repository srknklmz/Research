# sade.html'i kaynak.html'den üretir (01 Sade + 10 liste satırı tasarımı). Çalıştırma: prototip/ klasöründe python3 sade-uret.py
import sys
src=open('kaynak.html').read()
s=src
def R(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:90])
    s=s.replace(a,b)

R('<title>Evrak Prototipi</title>','<title>Sade Liste Satırları</title>')

# --- CSS: satır varyantları ---
R('/* ---------- 02 Lacivert ---------- */','''/* ---------- Sade: satır varyantları (rv1..rv10) ---------- */
#root{--card:#fff;--zebra:rgba(0,0,0,.028)}
#root.dark{--card:#1f1f23;--zebra:rgba(255,255,255,.03)}
.list.rows{padding:4px 8px 8px}
.row{display:flex;align-items:stretch;gap:10px;width:100%;text-align:left;border:0;background:none;padding:8px 10px 8px 8px;cursor:pointer;color:var(--sb-fg);position:relative;font:inherit;min-width:0}
.row .bd{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:4px}
.row .r1{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;column-gap:8px;font-size:11.5px;font-variant-numeric:tabular-nums;color:var(--sb-muted);line-height:1.2}
.row .no{font-weight:650;color:var(--sb-fg);display:flex;align-items:center;gap:4px;white-space:nowrap}
.row .dt{white-space:nowrap}
.row .tur{justify-self:end;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10.5px;font-weight:600;letter-spacing:.02em;color:var(--sb-muted);background:var(--sb-ctl);padding:2px 6px;border-radius:4px}
.row .r2{font-size:12.5px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--sb-fg)}
.row .pm{flex:none}
.row:hover{background:color-mix(in srgb,var(--sb-sel-bg) 40%,transparent)}
.row.sel{background:var(--sb-sel-bg)}
.row.sel .no,.row.sel .r2{color:var(--sb-sel-fg)}
.row.sel .tur{background:color-mix(in srgb,var(--sb-sel-fg) 12%,transparent);color:var(--sb-sel-fg)}
.row:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.sb-total{display:flex;align-items:center;gap:6px;padding:8px 14px;border-top:1px solid var(--sb-border);font-size:12px;color:var(--sb-muted);font-variant-numeric:tabular-nums;flex:none}
.sb-total b{color:var(--sb-fg);font-weight:650}
.sb-total .f{margin-left:auto;font-size:11px;color:var(--accent);font-weight:550}
/* ayrım biçimleri */
.sep-line .row{border-bottom:1px solid var(--sb-border);border-radius:0}
.sep-line .row.sel{border-radius:6px;border-bottom-color:transparent}
.sep-card .row{background:var(--card);border:1px solid var(--sb-border);border-radius:9px;margin-bottom:6px;box-shadow:0 1px 1px rgba(0,0,0,.03)}
.sep-card .row.sel{border-color:color-mix(in srgb,var(--accent) 55%,transparent);background:var(--sb-sel-bg)}
.sep-zebra .row{border-radius:0}
.sep-zebra .row.z{background:var(--zebra)}
.sep-zebra .row.sel{background:var(--sb-sel-bg)}
.grp{padding:12px 8px 6px}
/* 1 şerit */
.rv1 .pm{width:4px;border-radius:2px;background:var(--c);margin:1px 0}
/* 2 klasör sırtı */
.rv2 .row{padding-left:6px}
.rv2 .pm{width:20px;border-radius:5px;background:var(--c);color:#fff;writing-mode:vertical-rl;transform:rotate(180deg);font-size:9px;font-weight:700;letter-spacing:.12em;display:flex;align-items:center;justify-content:center;position:relative}
/* 3 köşe etiketi */
.rv3 .row{padding-left:22px;overflow:hidden}
.rv3 .pm{position:absolute;left:0;top:0;width:24px;height:24px;background:var(--c);clip-path:polygon(0 0,100% 0,0 100%);color:#fff;font-size:9px;font-weight:700;line-height:1;padding:3px 0 0 4px}
.sep-line.rv3 .row.sel{border-radius:6px}
/* 4 harf sütunu */
.rv4 .pm{width:18px;border-radius:5px;background:color-mix(in srgb,var(--c) 13%,transparent);color:var(--c);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px;font-weight:750;line-height:1.08}
.dark .rv4 .pm{background:color-mix(in srgb,var(--c) 26%,transparent);color:color-mix(in srgb,var(--c) 60%,#fff)}
/* 5 kenar sekmesi */
.rv5.list.rows{padding-left:20px}
.rv5 .row{overflow:visible}
.rv5 .pm{position:absolute;right:100%;top:7px;bottom:7px;width:15px;border-radius:0 5px 5px 0;background:var(--c);color:#fff;writing-mode:vertical-rl;transform:rotate(180deg);font-size:8px;font-weight:750;letter-spacing:.1em;display:flex;align-items:center;justify-content:center}
.rv5 .row.sel .pm,.rv5 .row:hover .pm{width:17px}
/* 6 desen */
.rv6 .pm{width:8px;border-radius:3px;background:var(--c);margin:1px 0}
.rv6 .pm.p1{background:repeating-linear-gradient(45deg,var(--c) 0 3px,transparent 3px 6px);box-shadow:inset 0 0 0 1px var(--c)}
.rv6 .pm.p2{background:repeating-linear-gradient(0deg,var(--c) 0 3px,transparent 3px 6px);box-shadow:inset 0 0 0 1px var(--c)}
.rv6 .pm.p3{background:radial-gradient(circle,var(--c) 1.6px,transparent 1.8px) 0 0/8px 6px;box-shadow:inset 0 0 0 1px var(--c)}
.rv6 .pm.p4{background:linear-gradient(var(--c) 50%,transparent 50%) 0 0/8px 8px;box-shadow:inset 0 0 0 1px var(--c)}
.rv6 .pm.p5{background:transparent;box-shadow:inset 0 0 0 2px var(--c)}
/* 7 monokrom kod */
.rv7 .row{padding-left:0}
.rv7 .pm{width:34px;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;letter-spacing:.05em;color:var(--sb-muted);border-right:1px solid var(--sb-border)}
.rv7 .row.sel .pm{color:var(--sb-sel-fg);border-right-color:color-mix(in srgb,var(--sb-sel-fg) 30%,transparent)}
/* 8 mühür */
.rv8 .pm{width:17px;border:1.5px solid var(--c);color:var(--c);border-radius:4px;writing-mode:vertical-rl;transform:rotate(180deg);font-size:8.5px;font-weight:750;letter-spacing:.14em;display:flex;align-items:center;justify-content:center;margin:1px 0}
.dark .rv8 .pm{color:color-mix(in srgb,var(--c) 55%,#fff);border-color:color-mix(in srgb,var(--c) 70%,#fff)}
/* 9 açılan şerit */
.rv9 .row{padding-left:16px;overflow:hidden}
.rv9 .pm{position:absolute;left:0;top:0;bottom:0;max-width:5px;width:auto;background:var(--c);color:#fff;font-size:11px;font-weight:600;white-space:nowrap;display:flex;align-items:center;padding:0;overflow:hidden;z-index:2;transition:max-width .18s ease,padding .18s ease;border-radius:9px 0 0 9px}
.rv9 .pm span{padding:0 12px}
.rv9 .row:hover .pm{max-width:220px;border-radius:9px 12px 12px 9px;box-shadow:4px 0 12px rgba(0,0,0,.15)}
/* 10 çapraz bant */
.rv10 .row{padding-left:30px;overflow:hidden}
.rv10 .pm{position:absolute;top:9px;left:-21px;width:70px;transform:rotate(-45deg);background:var(--c);color:#fff;font-size:7.5px;font-weight:750;letter-spacing:.08em;text-align:center;line-height:12px;box-shadow:0 1px 2px rgba(0,0,0,.15)}
/* ---------- 02 Lacivert ---------- */''')

# --- veri: proje harfi + tür ---
R("const P={'KÇK':{ad:'Kartal Konutları',c:'#2563eb'},'ATŞ':{ad:'Ataşehir Ofis',c:'#0d9488'},'BYL':{ad:'Beylikdüzü Okul',c:'#d97706'},'MRM':{ad:'Marmara Yolu',c:'#7c3aed'},'GBZ':{ad:'Gebze Fabrika',c:'#16a34a'},'MRK':{ad:'Merkez',c:'#64748b'}};",
  "const P={'KÇK':{ad:'Kartal Konutları',c:'#2563eb',h:'K',pat:0},'ATŞ':{ad:'Ataşehir Ofis',c:'#0d9488',h:'A',pat:1},'BYL':{ad:'Beylikdüzü Okul',c:'#d97706',h:'B',pat:2},'MRM':{ad:'Marmara Yolu',c:'#7c3aed',h:'Y',pat:3},'GBZ':{ad:'Gebze Fabrika',c:'#16a34a',h:'G',pat:4},'MRK':{ad:'Merkez',c:'#64748b',h:'M',pat:5}};\nconst TURLER=['Yazı','Sözleşme','Tutanak','Rapor','Protokol','Başvuru','İzin','Hakediş'];\nfunction turOf(k){k=k.toLocaleLowerCase('tr');if(/sözleşme/.test(k))return'Sözleşme';if(/tutanak/.test(k))return'Tutanak';if(/rapor/.test(k))return'Rapor';if(/protokol/.test(k))return'Protokol';if(/hakediş/.test(k))return'Hakediş';if(/başvuru|talep/.test(k))return'Başvuru';if(/izn|izin|ruhsat/.test(k))return'İzin';return'Yazı'}")
R("  return {no,date:r[0],","  return {tur:turOf(r[1]),no,date:r[0],")
R("function matches(d,q){if(!q)return true;q=low(q.trim());return low(d.no).includes(q)||","function matches(d,q){if(!q)return true;q=low(q.trim());return low(d.no).includes(q)||low(d.tur).includes(q)||")

# --- satır çizimi ---
R("""function listItems(o){
  const items=visible();""","""const RV=[
 {ad:'Şerit',ayr:'line',desc:'İnce renkli dikey şerit, satırlar arası çizgi'},
 {ad:'Klasör Sırtı',ayr:'card',desc:'Arşiv klasörü sırtı gibi; proje kodu dikey yazılı, satırlar kart'},
 {ad:'Köşe Etiketi',ayr:'line',desc:'Sol üst çaprazda renkli üçgen, içinde proje harfi'},
 {ad:'Harf Sütunu',ayr:'line',desc:'Proje kodu harfleri alt alta, açık renkli dar sütun'},
 {ad:'Kenar Sekmesi',ayr:'card',desc:'Kartın dışına taşan dosya sekmesi, üzerinde dikey proje kodu'},
 {ad:'Desen',ayr:'line',desc:'Her projenin kendi deseni (çizgili, noktalı…); renk körlüğünde de ayırt edilir'},
 {ad:'Monokrom Kod',ayr:'zebra',desc:'Renksiz; solda gri proje kodu, satırlar sırayla gölgeli'},
 {ad:'Mühür',ayr:'line',desc:'Çerçeveli dikey kaşe içinde proje kodu'},
 {ad:'Açılan Şerit',ayr:'card',desc:'İnce şerit; üzerine gelince proje adını gösterecek şekilde açılır'},
 {ad:'Çapraz Bant',ayr:'card',desc:'Sol üst köşeden geçen çapraz kurdele, üzerinde proje kodu'},
];
function marker(d){const p=P[d.proj],r=S.rv+1;
  if(r===2||r===8)return `<span class="pm">${d.proj}</span>`;
  if(r===3)return `<span class="pm">${p.h}</span>`;
  if(r===4)return `<span class="pm">${[...d.proj].map(c=>`<span>${c}</span>`).join('')}</span>`;
  if(r===5)return `<span class="pm">${d.proj}</span>`;
  if(r===6)return `<span class="pm p${p.pat}"></span>`;
  if(r===7)return `<span class="pm">${d.proj}</span>`;
  if(r===9)return `<span class="pm"><span>${p.ad}</span></span>`;
  if(r===10)return `<span class="pm">${d.proj}</span>`;
  return `<span class="pm"></span>`}
function rowsHTML(){
  const items=visible();
  if(!items.length)return `<div class="empty">Bu filtreyle eşleşen evrak yok.${S.q||S.df?'<br>Aramayı veya tarih filtresini temizleyin.':''}</div>`;
  let out='',last='',z=0;const sel=S.drawer==='new'?'':S.sel[S.dir];
  items.forEach(d=>{const m=monthOf(d.date);
    if(m!==last){out+=`<div class="grp">${m}</div>`;last=m;z=0}
    out+=`<button class="row${d.no===sel?' sel':''}${z++%2?' z':''}" data-a="sel" data-v="${d.no}" title="${d.no} · ${d.date} · ${d.tur} · ${P[d.proj].ad}&#10;${esc(d.konu)}" style="--c:${P[d.proj].c}">${marker(d)}<span class="bd"><span class="r1"><span class="no">${d.no}${d.gizli?ic('lock',10,2.2):''}</span><span class="dt">${d.date}</span><span class="tur">${d.tur}</span></span><span class="r2">${esc(d.konu)}</span></span></button>`});
  return out;
}
function totalHTML(){const all=DOCS.filter(d=>!d.deleted&&d.dir===S.dir).length,n=visible().length;
  return n===all?`<div class="sb-total" id="total">Toplam <b>${n}</b> ${S.dir==='gelen'?'gelen':'giden'} evrak</div>`:`<div class="sb-total" id="total"><b>${n}</b> / ${all} ${S.dir==='gelen'?'gelen':'giden'} evrak<span class="f">filtre açık</span></div>`}
function listCls(){return `list rows rv${S.rv+1} sep-${RV[S.rv].ayr}`}
function listItems(o){
  const items=visible();""")
R("""</div>${o.thd?'<div class="thd"><span>NO</span><span>TARİH</span></div>':''}<div class="list" id="list">${listItems(D())}</div>${o.noBot?'':sbBottom()}</""","""</div><div class="${listCls()}" id="list">${rowsHTML()}</div>${totalHTML()}${o.noBot?'':sbBottom()}</""")

# arama yazıldıkça liste + toplam güncellensin
R("""  if(t.id==='q'){S.q=t.value;const l=$('#list');if(l)l.innerHTML=listItems(D());return}""","""  if(t.id==='q'){S.q=t.value;const l=$('#list');if(l)l.innerHTML=rowsHTML();const tt=$('#total');if(tt)tt.outerHTML=totalHTML();return}""")

# detay panelinde tür
R("""<label>Sayısı</label><div class="v" style="font-variant-numeric:tabular-nums">${esc(d.sayi)}</div>""","""<label>Tür</label><div class="v">${d.tur}</div><label>Sayısı</label><div class="v" style="font-variant-numeric:tabular-nums">${esc(d.sayi)}</div>""")
R("""    <div class="ff"><label for="e-tags">Etiketler (virgülle)</label>""","""    <div class="ff"><label for="e-tur">Tür</label><select class="sel2" id="e-tur">${TURLER.map(t=>`<option${t===d.tur?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="ff"><label for="e-tags">Etiketler (virgülle)</label>""")
R("""d.tags=$('#e-tags').value""","""d.tur=$('#e-tur').value;d.tags=$('#e-tags').value""")
R("""    <div class="ff"><label for="n-tags">Etiketler (virgülle)</label>""","""    <div class="ff"><label for="n-tur">Tür<span class="ai-b">${ic('sparkles',11)}PDF’ten</span></label><select class="sel2" id="n-tur">${TURLER.map(t=>`<option${t===turOf(q.konu)?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="ff"><label for="n-tags">Etiketler (virgülle)</label>""")
R("""  const d={no,date:'03.11.2026',""","""  const d={tur:$('#n-tur').value,no,date:'03.11.2026',""")
R("""['n-tarih','n-proj','n-konu','n-tags',""","""['n-tarih','n-proj','n-konu','n-tur','n-tags',""")
R("""function newPseudo(){const q=S.newQ[S.newI];return {no:nextNo(),""","""function newPseudo(){const q=S.newQ[S.newI];return {tur:turOf(q.konu),no:nextNo(),""")

# --- seçici: satır varyantları ---
R("""function switcher(){
  const d=D(),n=String(S.d+1).padStart(2,'0');
  if(S.swHide)return `<button class="sw-mini" data-a="swshow">${ic('layout-grid',15)}Tasarım ${n}</button>`;
  return `<div class="sw" role="toolbar" aria-label="Tasarım seçici"><button data-a="swstep" data-v="-1" title="Önceki tasarım">${ic('chevron-left',18,2)}</button>
  <button class="cur" data-a="swgrid" title="Tüm tasarımlar"><span class="num">${n}</span><b>${d.ad}</b><span>${d.tip}</span>${ic('chevron-up',14,2)}</button>
  <button data-a="swstep" data-v="1" title="Sonraki tasarım">${ic('chevron-right',18,2)}</button><button data-a="swhide" title="Seçiciyi gizle" style="color:#a9b0c0">${ic('eye-off',15)}</button></div>
  ${S.swGrid?`<div class="swgrid">${DESIGNS.map((x,i)=>`<button class="${i===S.d?'on':''}" data-a="sw" data-v="${i}"><b><span class="num">${String(i+1).padStart(2,'0')}</span>${x.ad}</b><span>${x.desc}</span></button>`).join('')}</div>`:''}`;
}""","""function switcher(){
  const d=RV[S.rv],n=String(S.rv+1).padStart(2,'0');
  if(S.swHide)return `<button class="sw-mini" data-a="swshow">${ic('layout-grid',15)}Satır ${n}</button>`;
  return `<div class="sw" role="toolbar" aria-label="Satır tasarımı seçici"><button data-a="swstep" data-v="-1" title="Önceki satır tasarımı">${ic('chevron-left',18,2)}</button>
  <button class="cur" data-a="swgrid" title="Tüm satır tasarımları"><span class="num">${n}</span><b>${d.ad}</b><span>${d.desc}</span>${ic('chevron-up',14,2)}</button>
  <button data-a="swstep" data-v="1" title="Sonraki satır tasarımı">${ic('chevron-right',18,2)}</button><button data-a="swhide" title="Seçiciyi gizle" style="color:#a9b0c0">${ic('eye-off',15)}</button></div>
  ${S.swGrid?`<div class="swgrid">${RV.map((x,i)=>`<button class="${i===S.rv?'on':''}" data-a="sw" data-v="${i}"><b><span class="num">${String(i+1).padStart(2,'0')}</span>${x.ad}</b><span>${x.desc}</span></button>`).join('')}</div>`:''}`;
}
function setRv(i){S.rv=(i+RV.length)%RV.length;S.swGrid=false;try{localStorage.setItem('evrak-rv',String(S.rv))}catch(e){}render({scrollSel:true})}""")
R("""    case 'swstep':applyDesign(S.d+(+v));return;
    case 'sw':applyDesign(+v);return;""","""    case 'swstep':setRv(S.rv+(+v));return;
    case 'sw':setRv(+v);return;""")
R("const S={sbw:SBW0,d:0,","const S={rv:(()=>{try{const v=+localStorage.getItem('evrak-rv');if(v>=0&&v<10)return v}catch(e){}return 0})(),sbw:SBW0,d:0,")
R("const SB_DEF=280,SB_WIDE=440;","const SB_DEF=300,SB_WIDE=440;")
R("if(v>=200&&v<=700)return v}catch(e){}return 280}","if(v>=200&&v<=700)return v}catch(e){}return 300}")
open('sade.html','w').write(s)
print('ok')
