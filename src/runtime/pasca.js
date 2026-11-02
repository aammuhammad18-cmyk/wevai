/* PASCA (spec sub-proyek 2 §4.3) — grading per adegan lewat LAPISAN BLEND di atas dunia, bukan filter layar penuh
   (filter yang berubah = raster ulang seluruh stage). GRADE di-tween GSAP seperti CAM: grade(at,dur,preset|nilai).
   Lapisan dibuat saat grade() pertama lewat lapisDepan: di luar rig/bidang (paralaks tak rata), menutupi view di
   bawahnya (bukan #map/#ui), bertumpuk urut panggilan — partikel 'depan' yang dipasang SEBELUM grade() ikut ter-grade.
   Tidak dipanggil = halaman tidak berubah sedikit pun. */

/* bayangan = `lighten`: hanya mengangkat piksel yang LEBIH GELAP dari warnanya, jadi bayangan bernuansa warna itu dan
   terang tak tersentuh. sorot = `darken`: hanya menurunkan piksel yang LEBIH TERANG dari warnanya (sorotan hangat).
   ...Kuat = opacity 0..1 (≈0 = lapisan disembunyikan, tanpa biaya blend). vignette = gelap di tepi (multiply hitam).
   halation = kuat pendar jingga di tiap SUMBER (ikut opacity pendar dan semua leluhurnya). Warna string hex: GSAP
   menginterpolasinya (jadi rgba() di tengah tween). */
const GRADE={bayangan:'#1a1440',bayanganKuat:0,sorot:'#ffd9a8',sorotKuat:0,vignette:0,halation:0};
const GRADE_KUNCI=Object.keys(GRADE);   // dicatat sekarang: tween pertama menambahkan _gsap ke GRADE
/* Grade di atas cahaya sungguhan, bukan filter Instagram: sengaja tipis (lift bayangan > .4 meratakan siluet jadi bidang
   ungu). Enam kunci penuh per preset, jadi pindah preset tak menyisakan nilai lama. malam-api = acuan f_7 (ungu pekat,
   sorotan api, vignette kuat, halation obor); arsip = film tua (hitam terangkat cokelat-kelabu, sorotan menguning). */
const PRESET_GRADE={
  senja:{bayangan:'#3a2250',bayanganKuat:.2,sorot:'#ffd09a',sorotKuat:.22,vignette:.3,halation:.3},
  'malam-api':{bayangan:'#2a1848',bayanganKuat:.32,sorot:'#ffc890',sorotKuat:.3,vignette:.7,halation:.6},
  fajar:{bayangan:'#2a3558',bayanganKuat:.2,sorot:'#ffdccc',sorotKuat:.2,vignette:.22,halation:.15},
  'siang-kering':{bayangan:'#3b3226',bayanganKuat:.2,sorot:'#fff2d8',sorotKuat:.15,vignette:.14,halation:0},
  arsip:{bayangan:'#3a332b',bayanganKuat:.5,sorot:'#eadcc0',sorotKuat:.35,vignette:.5,halation:.1}};

/* grade(at,dur,preset|nilai,ease): tween GRADE di tl, tanpa nilai kembali (tl.to mengembalikan tl induk: .kill() akan
   mematikan seluruh timeline). preset = nama di PRESET_GRADE; nilai = objek sebagian (hanya kunci yang disebut yang
   di-tween). Awal tween dibaca GSAP saat pertama dirender, jadi panggil urut waktu seperti camTo dan JANGAN tumpang
   tindih dalam waktu: seek langsung ke tengah rentang (worker export-frames) memberi frame berbeda dari putar berurutan. */
function grade(at,dur,nilai,ease='sine.inOut'){
  const v=typeof nilai==='string'?Object.hasOwn(PRESET_GRADE,nilai)&&PRESET_GRADE[nilai]:nilai;
  if(!v||typeof v!=='object')throw new Error('grade: preset tidak dikenal: '+nilai+' ('+Object.keys(PRESET_GRADE).join(' ')+')');
  for(const k in v)if(!GRADE_KUNCI.includes(k))throw new Error('grade: kunci tidak dikenal: '+k+' ('+GRADE_KUNCI.join(' ')+')');
  lapisPasca();tl.to(GRADE,{...v,duration:dur,ease},at);}

/* lapisan singleton, urut bawah→atas: bayangan, sorot, vignette, halation (di atas vignette: pendar di tepi tak digelapkan).
   pascaL null = belum ada apa pun di halaman. H = nama sumber → <div> halation. */
let pascaL=null;
const PASCA_HAL='position:absolute;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(closest-side,rgba(255,126,48,.6),rgba(255,96,28,.22) 38%,rgba(255,76,16,.06) 72%,rgba(255,60,10,0))';
function lapisPasca(){if(pascaL)return pascaL;
  const buat=css=>{const e=document.createElement('div');e.className='wv-pasca';e.style.cssText='position:absolute;inset:0;pointer-events:none;'+css;return lapisDepan(e);};
  pascaL={bay:buat('mix-blend-mode:lighten'),sor:buat('mix-blend-mode:darken'),
    vig:buat('mix-blend-mode:multiply;background:radial-gradient(rgba(0,0,0,0) 38%,rgba(0,0,0,.14) 68%,rgba(0,0,0,.45) 88%,rgba(0,0,0,.8))'),
    hal:buat(''),H:{}};   // hal: wadah tanpa stacking context, jadi anak `screen` memadu dengan seluruh stage
  gsap.ticker.add(gambarPasca);gambarPasca();return pascaL;}

/* Digambar dari gsap.ticker, BUKAN onUpdate tl yang dirantai: posisi halation = rect pendar, dan rect baru final sesudah
   semua callback tl (kedip/skala pendar yang didaftarkan sesudah grade()) serta guncangan handheld (applyCam di ticker).
   Di rantai onUpdate hasilnya tertinggal satu frame dan bergantung urutan pendaftaran → putar ≠ ekspor (terukur: handheld
   di kamera diam, seek 5→6 vs .1→6 memberi piksel berbeda). Seek memanggil gsap.ticker.tick() sesudah tl, jadi scrub =
   ekspor. Geser pendar lewat tween tl, bukan ticker lain (urutannya tak terjamin). Ukur semua rect dulu, baru tulis. */
function gambarPasca(){const P=pascaL,G=GRADE;if(!P||!P.hal.isConnected)return;   // sudah dilepas (PASCA_UJI): no-op
  const hal=G.halation>.004,A=[];
  if(hal){const se=$('#stage'),st=se.getBoundingClientRect(),k=st.width/W;   // px layar → px stage (fit() men-scale #stage)
    for(const n in SUMBER){const e=SUMBER[n].el,r=e.getBoundingClientRect();let o=G.halation*(+e.style.opacity||0);   // opacity pendar = kuat·kedip
      /* lapisan ini di luar view, jadi alfa efektif pendar dihitung di sini: opacity SETIAP leluhur sampai #stage dikalikan
         (fly/fadeUp/show memudarkan aset yang memuat pendar: pendar ikut pudar sebagai turunan, halation tidak), dan
         pendar di view tersembunyi (visibility diwarisi, mis. #collage.off) tak diberi halation */
      for(let a=e.parentElement;a&&a!==se;a=a.parentElement)o*=+getComputedStyle(a).opacity;
      A.push([n,r.width&&o>.004&&getComputedStyle(e).visibility!=='hidden'&&[(r.left+r.width/2-st.left)/k,(r.top+r.height/2-st.top)/k,r.width/k/2*.8,o]]);}}   // jari = .8 × jari pendar
  const on=(e,k,c)=>{const s=e.style;s.display=k>.004?'':'none';s.opacity=k;if(c)s.backgroundColor=c;};
  on(P.bay,G.bayanganKuat,G.bayangan);on(P.sor,G.sorotKuat,G.sorot);on(P.vig,G.vignette);P.hal.style.display=hal?'':'none';
  for(const [n,g] of A){let d=P.H[n];   // dibuat saat sumber pertama dijumpai, urut SUMBER (urutan DOM tetap → piksel sama di tiap jalur seek)
    if(!d){d=P.H[n]=document.createElement('div');d.style.cssText=PASCA_HAL;P.hal.appendChild(d);}
    const s=d.style;s.display=g?'':'none';
    if(g){const [x,y,r,o]=g;s.left=x-r+'px';s.top=y-r+'px';s.width=s.height=2*r+'px';s.opacity=o;}}
  if(hal)for(const n in P.H)if(!Object.hasOwn(SUMBER,n)){P.H[n].remove();delete P.H[n];}}   // sumbernya dihapus

/* kait untuk scripts/test-starters.mjs — tidak dipanggil deliverable. Fixture sendiri (satu bidang + satu sumber
   sementara, didaftarkan SESUDAH lapisan dibuat), lalu semuanya dibersihkan — juga lapisan singleton dan listener ticker,
   supaya grade() sungguhan sesudahnya mulai dari nol. Callback kedip yang tertinggal di rantai tl jadi no-op (isConnected). */
window.PASCA_UJI=()=>{const r={},O=window.OPENER,st=$('#stage'),g0={...GRADE},ind=document.createElement('div'),b=document.createElement('div'),
    /* gaya rig + pembungkus [data-z] pada t yang sama, sebelum dan sesudah lapisan ada: tak boleh berubah. Bukan === '' —
       #world panggung memang ber-filter blur(0px) dari animasi cut-nya sendiri */
    gaya=()=>[rigDunia(),...document.querySelectorAll('[data-z]')].map(e=>['filter','opacity','mixBlendMode','clipPath','mask'].map(k=>e.style[k]).join('|')).join();
  r.awalBersih=!pascaL&&!$('.wv-pasca');O.seek(5);const g1=gaya();
  ind.style.cssText='position:absolute;left:0;top:0';   // induk bidang: leluhur BUKAN induk langsung pendar
  b.style.cssText=`position:absolute;left:0;top:0;width:${W}px;height:${H}px;visibility:visible`;   // visible: menembus #collage.off
  rigDunia().appendChild(ind);ind.appendChild(b);
  const P=lapisPasca(),pendar=sumber('wv-uji-pasca',{x:960,y:540,bidang:b,kedip:.3}),
    kiriPada=k=>{st.style.transform=`translate(-50%,-50%) scale(${k})`;O.seek(5);const d=P.H['wv-uji-pasca'];return d?parseFloat(d.style.left):NaN;};
  Object.assign(GRADE,{bayanganKuat:.5,sorotKuat:.5,vignette:.5,halation:.5});
  const a=kiriPada(.5),c=kiriPada(1);
  r.halationSkala=Math.abs(a-c)<=1;r.halationKiri=[a,c];
  r.blend=[P.bay,P.sor,P.vig,P.H['wv-uji-pasca']].map(e=>e?getComputedStyle(e).mixBlendMode:'-').join();
  r.rigBersih=gaya()===g1;r.lapisBenar=r.blend==='lighten,darken,multiply,screen'&&r.rigBersih;
  pendar.style.left=parseFloat(pendar.style.left)+200+'px';   // pendar bergeser 200 px bidang → halation ikut
  r.halationIkut=Math.abs(kiriPada(1)-c)>1;
  /* opacity leluhur (fly/fadeUp/show di starter) memudarkan pendar; halation di luar view harus ikut: .5 → setengah, 0 → display:none */
  const alfa=k=>{ind.style.opacity=k;O.seek(5);const d=P.H['wv-uji-pasca'];return d?d.style.display==='none'?'none':+d.style.opacity:'tak ada';},a1=alfa(1),a5=alfa(.5),a0=alfa(0);
  ind.style.opacity='';r.halationLeluhur=a1>0&&Math.abs(a5/a1-.5)<.02&&a0==='none';r.alfaLeluhur=[a1,a5,a0];
  ind.remove();delete SUMBER['wv-uji-pasca'];O.seek(5);r.halationIkut=r.halationIkut&&!P.H['wv-uji-pasca'];   // sumber lepas → halation hilang
  /* grade() sungguhan: tl → seek → GRADE → lapisan. ease 'none' di tengah rentang = titik tengah persis; tween dibuang lagi */
  r.gradeKosong=grade(6,2,{bayangan:'#ffffff',bayanganKuat:1},'none')===undefined;O.seek(7);
  const cs=getComputedStyle(P.bay),m=warnaRGB(GRADE.bayangan),w0=warnaRGB(g0.bayangan),bg=warnaRGB(cs.backgroundColor);
  r.tengah=[GRADE.bayangan,GRADE.bayanganKuat,cs.backgroundColor,cs.opacity].join(' ');
  r.warnaTween=m.every((v,i)=>Math.abs(v-(w0[i]+255)/2)<=1&&Math.abs(bg[i]-v)<=1)&&Math.abs(+cs.opacity-.75)<.01;   // .5 → 1 di tengah = .75
  tl.getTweensOf(GRADE).forEach(t=>tl.remove(t));
  try{grade(0,1,'neon');r.presetDitolak=false;}catch(e){r.presetDitolak=Object.keys(PRESET_GRADE).every(n=>e.message.includes(n));}
  r.presetLengkap=Object.values(PRESET_GRADE).every(p=>GRADE_KUNCI.every(k=>k in p)&&Object.keys(p).length===GRADE_KUNCI.length);   // enam kunci persis
  gsap.ticker.remove(gambarPasca);for(const e of document.querySelectorAll('.wv-pasca'))e.remove();pascaL=null;
  Object.assign(GRADE,g0);fit();   // fit() = skala stage persis seperti saat dimuat
  r.dibersihkan=!pascaL&&!$('.wv-pasca')&&!Object.hasOwn(SUMBER,'wv-uji-pasca')&&GRADE_KUNCI.every(k=>GRADE[k]===g0[k]);return r;};
