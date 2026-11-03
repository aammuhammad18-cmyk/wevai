/* BABAK — banyak adegan dalam satu halaman (sinematografi.md §5 "Babak multi-adegan"; contoh hidup: starter-babak.html).
   Butuh atmosfer (rigDunia, rantaiUpdate). Tidak dipanggil = halaman tidak berubah sedikit pun.
   adegan(rentang, bangun): bangun() dipanggil SEKARANG, dalam keadaan tampil (rim/relief membaca kotak elemen). Bidang baru di rig,
   lapisan depan baru (kecuali grade), dan callback onUpdate yang didaftarkan selama bangun (partikel, kabut, sumber, api, tokoh:
   rantainya dirakit terpisah, lalu dipasang di belakang satu pengatur) jadi milik adegan. Tampil hanya saat t di [dari, sampai)
   atau salah satu [[dari, sampai], …]; di luar itu display:none dan callbacknya TIDAK dipanggil: adegan tersembunyi tak menggambar
   apa pun. Fungsi murni tl.time(). Kanvasnya menyimpan gambar terakhir (tak terlihat) dan digambar ulang begitu tampil lagi.
   panggil = frame yang menjalankan callback adegan (bukti). langit() di luar adegan: langit milik halaman.
   panggang(svg, {resolusi, area, kabur}) → Promise<canvas>: svg bidang yang sudah jadi (aset + rim/relief/redup/bayangan)
   dirasterisasi SEKALI ke kanvas di tempatnya. Lapisan will-change Chrome dirasterisasi saat DIBUAT (muat, seek langsung, tampil
   lagi, tiba berurutan) lalu hanya ditransform, jadi dolly/truck membuat piksel bergantung jalur seek dan worker ekspor (katalog
   pustaka: maks 78–97; evals/bukti/2026-11-03-babak-sinematik). Kanvas = bitmap tetap yang ditransform kompositor, nol raster SVG
   per frame. Kanvas GPU: kanvas perangkat lunak (willReadFrequently) dilukis ke lapisan bidang dan menyisakan beda ±3 bergantung riwayat
   seek (terukur). Jaga luas semua kanvas halaman: 87 MP = konteks GPU hilang, kanvas kosong (terukur). area [x,y,w,h] px bidang (bawaan frame ± 1/8);
   resolusi > 1 bila kamera mendarat dekat, < 1 untuk bidang jauh; kabur (px) = ruang tajam sempit. Isi svg yang berubah per
   frame ikut beku: jangan panggang svg itu. */
const ADEGAN=[];
function adegan(rentang,bangun){const R=typeof rentang[0]==='number'?[rentang]:rentang,rg=rigDunia(),st=$('#stage'),
    lama=new Set([...rg.children,...st.children]),langit0=$('#wv-langit'),asli=tl.eventCallback('onUpdate'),A={rentang:R,el:[],tampil:null,panggil:0};
  if(!R.length||!R.every(r=>r.length===2&&r[0]<r[1]))throw new Error('adegan: rentang harus [dari, sampai] (dari < sampai) atau larik rentang');
  tl.eventCallback('onUpdate',null);
  try{bangun(A);}finally{A.jalan=tl.eventCallback('onUpdate');tl.eventCallback('onUpdate',asli);}
  if($('#wv-langit')!==langit0)throw new Error('adegan: langit() di dalam adegan — panggil sekali, di luar adegan');
  A.el=[...rg.children,...st.children].filter(e=>!lama.has(e)&&(e.parentNode===rg||e.hasAttribute('data-wv-depan')&&!e.classList.contains('wv-pasca')));
  const atur=()=>{const t=tl.time(),on=R.some(([a,b])=>t>=a&&t<b);
    if(on!==A.tampil){A.tampil=on;for(const e of A.el)e.style.display=on?'':'none';}
    if(on&&A.jalan){A.panggil++;A.jalan();}};
  ADEGAN.push(A);atur();rantaiUpdate(atur);return A;}
function panggang(svg,{resolusi=1,area=[-W/8,-H/8,W*1.25,H*1.25],kabur=0}={}){
  if(!(svg instanceof SVGSVGElement))throw new Error('panggang: svg wajib elemen <svg> bidang (bukan <div> atau <g>)');
  const[x,y,w,h]=area,k=document.createElement('canvas'),c=svg.cloneNode(true),img=new Image();
  k.className='wv-panggang';k.width=Math.round(w*resolusi);k.height=Math.round(h*resolusi);
  k.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;pointer-events:none`+(svg.style.mixBlendMode?';mix-blend-mode:'+svg.style.mixBlendMode:'');
  c.removeAttribute('style');c.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);c.setAttribute('width',k.width);c.setAttribute('height',k.height);
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(c));
  return img.decode().then(()=>{const g=k.getContext('2d');if(kabur)g.filter=`blur(${kabur*resolusi}px)`;g.drawImage(img,0,0,k.width,k.height);svg.replaceWith(k);return k;});}

/* kait untuk scripts/test-starters.mjs — tidak dipanggil deliverable. Fixture: adegan [2, 3) berisi satu bidang + callback penghitung,
   dan svg kecil yang dipanggang; lalu dibersihkan (pengaturnya tertinggal di rantai tanpa elemen: no-op). */
window.BABAK_UJI=async()=>{const r={},O=window.OPENER;let n=0;
  const A=adegan([2,3],()=>{rigDunia().appendChild(document.createElement('div'));rantaiUpdate(()=>n++);}),b=A.el[0];
  O.seek(5);const n5=n;O.seek(5.5);r.diam=n===n5&&b.style.display==='none';
  O.seek(2.5);r.hidup=n>n5&&b.style.display==='';
  b.innerHTML='<svg viewBox="0 0 1920 1080"><rect x="10" y="10" width="20" height="20" fill="#ff0000"/></svg>';
  const sv=b.firstChild,k=await panggang(sv,{area:[0,0,40,40],resolusi:2}),g=k.getContext('2d'),tg=g.getImageData(40,40,1,1).data,sd=g.getImageData(4,4,1,1).data;
  r.panggang=!sv.isConnected&&k.parentNode===b&&k.width===80&&tg[0]>250&&tg[1]<5&&tg[3]>250&&sd[3]===0;   // merah di tengah, bening di sudut
  b.remove();ADEGAN.splice(ADEGAN.indexOf(A),1);
  r.ditolak=[()=>adegan([3,2],()=>{}),()=>panggang(b)].every(f=>{try{f();return false;}catch(e){return /rentang|elemen <svg>/.test(e.message);}});
  return r;};
