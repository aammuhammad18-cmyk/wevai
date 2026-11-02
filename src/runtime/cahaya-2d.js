/* CAHAYA-2D (spec sub-proyek 2 §4.2) — cahaya bersumber untuk adegan SVG: pendar berkedip, gelap yang meredup
   menjauhi sumber, rim pada siluet, bayangan jatuh, relief. Filter dan mask DIPANGGANG sekali saat dipanggil —
   atributnya tidak pernah ditulis lagi; per frame hanya opacity/scale pendar (lapisan sendiri, will-change).
   x, y sumber = px bidang = satuan pengguna svg bidang (<svg viewBox="0 0 1920 1080"> di 0,0 bidangnya). Sumber yang
   pindah: geser pendar-nya (tl.to(SUMBER.obor.el,{x:…})); rim/redup/relief dipasang ulang di cut. Membaca tl saat
   dipanggil saja — tidak dipanggil = halaman tidak berubah sedikit pun.
   Kamera yang men-zoom (dolly) mengubah skala bidang tiap frame → Chrome me-raster ulang svg-nya dan filter yang
   dipanggang ikut dihitung ulang (adegan uji: +125–170 ms/frame). Beri <svg> bidang ber-filter will-change:transform:
   bitmap-nya diskalakan, bukan di-raster ulang (terukur ≈ biaya tanpa modul; lunaknya tak terlihat di zoom 1,25). */

/* SUMBER: nama → {x, y, bidang, warna, jangkau, kuat, kedip, el}. kuat/kedip dibaca tiap frame, jadi boleh di-tween
   seperti CAM: tl.to(SUMBER.obor1,{kuat:0},at) memadamkan obor. */
const SUMBER={};
let cahayaN=0;   // id unik wv-cahaya-N untuk filter/mask/gradien buatan modul
const elSVG=(tag,a={},p)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;};
const defsSVG=svg=>svg.querySelector(':scope>defs')||svg.insertBefore(elSVG('defs'),svg.firstChild);
const ambilSumber=n=>{if(Object.hasOwn(SUMBER,n))return SUMBER[n];throw new Error('cahaya-2d: sumber tidak dikenal: '+n+' ('+Object.keys(SUMBER).join(' ')+')');};
/* kotak kosong = el belum dirender (mis. adegan display:none): filter akan terpotong habis tanpa tanda — tolak */
const kotakEl=el=>{const b=el.getBBox();if(!b.width&&!b.height)throw new Error('cahaya-2d: kotak elemen kosong — el belum dirender (display:none?)');return b;};
/* getCTM() memberi SVGMatrix (tanpa transformPoint) — jadikan DOMMatrix */
const ctmEl=el=>DOMMatrix.fromMatrix(el.getCTM());
/* filter di defs svg pemilik el; wilayahnya kotak b ± m di ruang pengguna el — biaya filter ∝ luas pikselnya */
function filterCahaya(el,b,m,isi){const f=elSVG('filter',{id:'wv-cahaya-'+(++cahayaN),filterUnits:'userSpaceOnUse',
    x:b.x-m,y:b.y-m,width:b.width+2*m,height:b.height+2*m,'color-interpolation-filters':'sRGB'},defsSVG(el.ownerSVGElement));
  f.innerHTML=isi;el.setAttribute('filter',`url(#${f.id})`);return f;}

/* sumber(nama,{x,y,bidang,…}) → <div class="wv-pendar"> di bidang (elemen HTML: <div data-z> atau anaknya): gradien
   radial warna → transparan, screen. Inti panas + ekor panjang (dua skala glowA/glowB spike) supaya terbaca sebagai
   cahaya, bukan bulatan. Kedip dari tl.time() tanpa akumulasi; skala lewat properti CSS `scale`, bukan transform,
   supaya x/y GSAP pada pendar (sumber yang pindah) tidak saling timpa. Nama yang sama = entri baru menggantikan. */
function sumber(nama,{x,y,bidang,warna='#ffb347',jangkau=420,kuat=1,kedip=0,seed=1}={}){
  if(x==null||y==null||!(bidang instanceof HTMLElement))throw new Error('sumber: x, y (px bidang) dan bidang (elemen HTML, bukan <g> SVG) wajib');
  const w=warnaRGB(warna),c=a=>`rgba(${w},${a})`,inti=w.map(v=>Math.round(v+(255-v)*.6)),el=document.createElement('div');el.className='wv-pendar';
  el.style.cssText=`position:absolute;left:${x-jangkau}px;top:${y-jangkau}px;width:${2*jangkau}px;height:${2*jangkau}px;pointer-events:none;`+
    `mix-blend-mode:screen;will-change:transform,opacity;background:radial-gradient(closest-side,rgba(${inti},.9),${c(.55)} 8%,${c(.22)} 25%,${c(.08)} 55%,${c(0)})`;
  bidang.appendChild(el);const s=SUMBER[nama]={x,y,bidang,warna,jangkau,kuat,kedip,el};
  const kedipkan=()=>{if(!el.isConnected)return;const t=tl.time();
    el.style.opacity=s.kuat*(1-s.kedip*vnoise(t*7,seed));el.style.scale=1+s.kedip*.06*vnoise(t*5,seed+1);};
  kedipkan();rantaiUpdate(kedipkan);return el;}

/* redup(svg, nama[], {gelap, warna, klip}) → <g> di akhir svg: rect gelap `multiply` ber-mask. Mask putih (gelap penuh)
   dilubangi satu lingkaran radial hitam per sumber selebar jangkaunya; alfa lubang yang bertumpuk MENGALIKAN luminans,
   jadi beberapa sumber = gabungan cahayanya. Memalsukan falloff yang tidak dimiliki fePointLight. Tanpa klip, bagian
   svg yang transparan ikut gelap (langit bidang lain tertutup) — klip = id <clipPath> bentuk arsitektur milik
   pemanggil. Rect ±W/2 di luar frame: kamera boleh bergeser. */
function redup(svg,nama,{gelap=.72,warna='#0b0820',klip}={}){
  const S=[].concat(nama).map(ambilSumber),d=defsSVG(svg),id='wv-cahaya-'+(++cahayaN),k={x:-W/2,y:-H/2,width:2*W,height:2*H};
  if(klip&&!document.getElementById(klip))throw new Error('redup: klip tidak ada: #'+klip+' (id <clipPath> bentuk arsitektur)');
  const lb=elSVG('radialGradient',{id:id+'-lubang'},d);
  for(const [o,a] of [[0,1],[.35,.8],[.7,.3],[1,0]])elSVG('stop',{offset:o,'stop-color':'#000','stop-opacity':a},lb);
  const m=elSVG('mask',{id,maskUnits:'userSpaceOnUse',...k},d);elSVG('rect',{...k,fill:'#fff'},m);
  for(const s of S)elSVG('circle',{cx:s.x,cy:s.y,r:s.jangkau,fill:`url(#${id}-lubang)`},m);
  const g=elSVG('g',klip?{'clip-path':`url(#${klip})`}:{},svg);
  elSVG('rect',{...k,fill:warna,opacity:gelap,mask:`url(#${id})`,style:'mix-blend-mode:multiply'},g);return g;}

/* Arah dihitung di ruang lokal el (feOffset/skew/fePointLight bekerja di ruang pengguna el, jadi grup yang dicerminkan
   atau diskalakan membalik/meregang arahnya): pusat kotak el → ruang svg (px bidang) lewat getCTM, vektor menjauhi
   sumber diukur di sana, lalu dikembalikan lewat bagian linear invers CTM. */

/* rim(el, nama, {lebar}) → <filter>: alfa siluet digeser MENJAUHI sumber sejauh lebar px, `out` = tepi yang menghadap
   sumber, dilunakkan 1 px, diwarnai warna sumber, ditumpuk di atas gambar. Salinan rim yang diburamkan (2·lebar, alfa
   ×1,2) di BAWAH gambar = pendar yang tumpah ke luar siluet di sisi terang (bahan fRim spike) — tanpanya rim terbaca
   sebagai garis kontur. Blur diukur dengan panjang geser lokal L, jadi rupa di layar sama di grup berskala. Satu filter
   per elemen (atribut filter ditimpa): untuk rim + relief, bungkus el dengan <g> dan pasang satu di tiap tingkat. */
function rim(el,nama,{lebar=3}={}){const s=ambilSumber(nama),b=kotakEl(el),m=ctmEl(el),
    c=m.transformPoint({x:b.x+b.width/2,y:b.y+b.height/2}),vx=c.x-s.x,vy=c.y-s.y,n=Math.hypot(vx,vy)||1,
    d=m.inverse().transformPoint({x:vx/n*lebar,y:vy/n*lebar,w:0}),L=Math.hypot(d.x,d.y);
  return filterCahaya(el,b,6*L+2,`<feOffset in="SourceAlpha" dx="${d.x}" dy="${d.y}" result="o"/>`+
    `<feComposite in="SourceAlpha" in2="o" operator="out"/><feGaussianBlur stdDeviation="${L/lebar}" result="e"/><feFlood flood-color="${s.warna}"/>`+
    `<feComposite in2="e" operator="in" result="r"/><feGaussianBlur stdDeviation="${2*L}"/><feComposite operator="arithmetic" k2="1.2" result="p"/>`+
    `<feMerge><feMergeNode in="p"/><feMergeNode in="SourceGraphic"/><feMergeNode in="r"/></feMerge>`);}

/* bayangan(el, nama, {lantai, panjang, gelap}) → <use> salinan el tepat di belakangnya: siluet hitam ber-alfa gelap
   (hitam di atas apa pun = multiply), blur 4 sekali, dicerminkan ke bawah garis lantai (y, px bidang), dipendekkan
   panjang, dan dimiringkan menjauhi sumber sebesar kemiringan sinar sumber→lantai (dijepit ±2). Dibangun di ruang svg
   lalu dikonjugasi ke ruang induk (P⁻¹·S·P), jadi benar juga di grup yang dicerminkan. <use> hidup: pose el ikut. */
function bayangan(el,nama,{lantai,panjang=.6,gelap=.55}={}){const s=ambilSumber(nama);
  if(lantai==null)throw new Error('bayangan: lantai (y garis lantai, px bidang) wajib');
  if(!el.id)el.id='wv-cahaya-'+(++cahayaN);
  const u=elSVG('use',{href:'#'+el.id});el.before(u);
  const P=ctmEl(u),b=kotakEl(u),c=P.transformPoint({x:b.x+b.width/2,y:b.y+b.height/2}),
    k=Math.max(-2,Math.min(2,(c.x-s.x)/Math.max(1,lantai-s.y))),p=panjang,
    T=P.inverse().multiply(new DOMMatrix([1,0,-k*p,-p,k*p*lantai,lantai*(1+p)])).multiply(P);
  u.setAttribute('transform',`matrix(${T.a},${T.b},${T.c},${T.d},${T.e},${T.f})`);
  filterCahaya(u,b,12,`<feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${gelap} 0"/><feGaussianBlur stdDeviation="4"/>`);
  return u;}

/* relief(el, {tinggi, sumber | arah, spekular}) → <filter>: luminans gambar = peta tinggi (bobot spike: bata terang
   jenuh = timbul, nat gelap = cekung) + butir feTurbulence ber-seed tetap (tanpanya bata tampak plastik), lalu
   gambar × (penguat·feDiffuseLighting + isi .35) — isi menjaga sisi teduh tidak hitam pekat (spike: cahaya bulan).
   Hasil feDiffuseLighting dijepit 0..1, jadi penguatnya di k1 komposit, bukan di diffuseConstant (terukur: kd > 1
   terpotong, cahaya tak pernah lebih terang dari gambar). sumber → fePointLight di posisinya (ruang lokal el),
   rendah (z = jangkau/5): sinar menyerempet = relief tegas + kolam cahaya yang memudar (Lambert z/√(d²+z²)), warna
   sumber, penguat 2,2. arah {az, el} → feDistantLight putih, penguat (1 − isi)/sin(el): bidang datar tetap warnanya,
   hanya lerengnya terang/teduh. spekular > 0 = kilap. */
function relief(el,{tinggi=3,sumber:nama,arah={az:225,el:45},spekular=0}={}){
  const s=nama!=null&&ambilSumber(nama),b=kotakEl(el),m=ctmEl(el),p=s&&m.inverse().transformPoint({x:s.x,y:s.y}),
    lampu=s?`<fePointLight x="${p.x}" y="${p.y}" z="${s.jangkau/5/Math.sqrt(Math.abs(m.a*m.d-m.b*m.c))}"/>`:`<feDistantLight azimuth="${arah.az}" elevation="${arah.el}"/>`,
    warna=s?s.warna:'#fff',kuat=s?2.2:.65/Math.sin(arah.el*Math.PI/180);
  return filterCahaya(el,b,4,`<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.5 2.3 .6 0 0"/>`+
    `<feGaussianBlur stdDeviation="1.2" result="h0"/><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="3" seed="7"/>`+
    `<feComposite in="h0" operator="arithmetic" k2=".85" k3=".3" k4="-.08" result="h"/>`+
    `<feDiffuseLighting in="h" surfaceScale="${tinggi}" lighting-color="${warna}" result="d">${lampu}</feDiffuseLighting>`+
    `<feColorMatrix in="SourceGraphic" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0 1"/>`+   // salinan buram (warna asli, α 1): aritmetika jalan di premultiplied, jadi α tembus pandang ikut ×(penguat+isi)
    `<feComposite in2="d" operator="arithmetic" k1="${kuat}" k2=".35" result="l"/>`+
    (spekular>0?`<feSpecularLighting in="h" surfaceScale="${tinggi}" specularConstant="${spekular}" specularExponent="20" lighting-color="${warna}" result="k">${lampu}</feSpecularLighting>`+
      `<feComposite in="l" in2="k" operator="arithmetic" k2="1" k3="1"/>`:'')+
    `<feComposite in2="SourceAlpha" operator="in"/>`);}   // kedua cabang: α keluaran = α sumber (kilap juga jatuh di luar alfa)

/* kait untuk scripts/test-starters.mjs — tidak dipanggil deliverable. Fixture sendiri (bidang + svg + dua sumber
   ber-kedip), semua pemanggang dijalankan sekali (error-nya tertangkap, filternya ikut diuji statis), lalu bidang
   dilepas dan entri SUMBER-nya dihapus; callback kedip yang tertinggal jadi no-op (isConnected). Async: alfa relief
   dibaca dari piksel svg kecil yang dirender sebagai gambar ke kanvas. */
window.CAHAYA_UJI=async()=>{const r={},O=window.OPENER,b=document.createElement('div');
  b.style.cssText=`position:absolute;left:0;top:0;width:${W}px;height:${H}px`;rigDunia().appendChild(b);
  b.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0;overflow:visible">`+
    `<defs><clipPath id="wv-uji-klip"><rect x="1400" y="400" width="200" height="300"/></clipPath></defs>`+
    `<rect x="1450" y="400" width="100" height="300" fill="#7a4a30"/>`+   // pusat x 1500
    `<g transform="matrix(-1,0,0,1,3000,0)"><rect x="1450" y="400" width="100" height="300" fill="#7a4a30"/></g></svg>`;   // tercermin, pusat tetap x 1500
  const svg=b.firstChild,[el,cer]=svg.querySelectorAll('rect[fill]'),
    A=sumber('wv-uji-a',{x:500,y:550,bidang:b,kedip:.5}),B=sumber('wv-uji-b',{x:2500,y:550,bidang:b,kedip:.5,seed:2}),
    dx=(e,n)=>+rim(e,n).querySelector('feOffset').getAttribute('dx'),
    foto=()=>[...$('#stage').querySelectorAll('filter,mask')].map(f=>f.outerHTML).join(),
    op=()=>[A,B].map(p=>p.style.opacity+' '+p.style.scale).join();
  r.rimArah=dx(el,'wv-uji-a')>0&&dx(el,'wv-uji-b')<0&&dx(cer,'wv-uji-a')<0&&dx(cer,'wv-uji-b')>0;
  relief(el,{sumber:'wv-uji-a',spekular:.5});relief(cer,{arah:{az:200,el:30}});
  bayangan(el,'wv-uji-a',{lantai:700});redup(svg,['wv-uji-a','wv-uji-b'],{klip:'wv-uji-klip'});
  O.seek(2);const f2=foto();O.seek(8);r.statis=f2===foto();
  O.seek(4);const a=op(),o4=A.style.opacity;O.seek(9);O.seek(.1);O.seek(4);r.kedipSama=a===op();
  O.seek(4.5);r.kedipHidup=A.style.opacity!==o4;
  try{rim(el,'tidakada');r.namaDitolak=false;}catch(e){r.namaDitolak=/tidak dikenal: tidakada \(.*wv-uji-a/.test(e.message);}
  /* relief tidak boleh mengubah alfa (tepi antialias, cat tembus pandang): rect fill-opacity .3 dengan relief sumber,
     relief sumber+spekular, dan tanpa filter (acuan) */
  b.insertAdjacentHTML('beforeend',`<svg width="120" height="40" viewBox="0 0 120 40" style="position:absolute;left:0;top:0">`+
    [0,40,80].map(x=>`<rect x="${x}" width="40" height="40" fill="#7a4a30" fill-opacity=".3"/>`).join('')+'</svg>');
  const kecil=b.lastChild,[t1,t2]=kecil.querySelectorAll('rect'),img=new Image(),kv=document.createElement('canvas'),kx=kv.getContext('2d');
  relief(t1,{sumber:'wv-uji-a'});relief(t2,{sumber:'wv-uji-a',spekular:.5});
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(kecil));await img.decode();
  kv.width=120;kv.height=40;kx.drawImage(img,0,0);
  const [a1,a2,acuan]=[20,60,100].map(x=>kx.getImageData(x,20,1,1).data[3]);
  r.alfaRelief=[acuan,a1,a2];r.reliefAlfa=acuan>50&&Math.abs(a1-acuan)<=2&&Math.abs(a2-acuan)<=2;
  b.remove();delete SUMBER['wv-uji-a'];delete SUMBER['wv-uji-b'];return r;};
