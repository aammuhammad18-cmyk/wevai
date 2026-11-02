/* ATMOSFER (spec sub-proyek 2 §4.1) — langit WebGL di belakang dunia, kabut per bidang, partikel ber-seed.
   Semua keadaan = fungsi murni tl.time() + seed (tanpa akumulasi), jadi putar = scrub = ekspor. Yang berat
   dipanggang sekali saat setup; per frame hanya satu draw shader, transform kabut, dan satu kanvas partikel.
   Membaca CAM bila ada (starter panggung belum punya). Tidak dipanggil = halaman tidak berubah sedikit pun. */

/* jam bersama: rantai tl.eventCallback('onUpdate') seperti grainHidup — callback lama tetap dipanggil. Rantai tidak
   bisa diurai, jadi callback milik elemen yang sudah dilepas dari DOM harus jadi no-op sendiri (cek isConnected). */
function rantaiUpdate(fn){const prev=tl.eventCallback('onUpdate');
  tl.eventCallback('onUpdate',function(){if(prev)prev.apply(this,arguments);fn();});}
/* acak ber-seed. Idenya sama dengan hash/noise kamera.js, namanya beda: di sana const (bentrok = SyntaxError) dan
   starter panggung tidak memuat kamera.js */
const mulberry32=s=>()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const acak=(i,s)=>{let x=(Math.imul(i,374761393)+Math.imul(s,668265263))|0;x=Math.imul(x^x>>>13,1274126177);return((x^x>>>16)>>>0)/4294967296;};
/* value noise 1D halus 0..1; p > 0 = kisi berulang tiap p sel (tile kabut menyambung di tepi) */
const vnoise=(x,s=1,p=0)=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f),k=p?(i%p+p)%p:i,a=acak(k,s);return a+(acak(p?(k+1)%p:k+1,s)-a)*u;};
const rigDunia=()=>typeof rig!=='undefined'?rig:$('#world');
/* view = anak #stage yang memuat rig (#collage di aksi kontinu; di panggung rig-nya sendiri, #world) */
const viewDunia=()=>{const st=$('#stage');let a=rigDunia();while(a.parentNode!==st)a=a.parentNode;return a;};
/* lapisan di atas dunia, di bawah #vig/#ui: sesudah anak #stage yang memuat rig — bukan di dalam rig/bidang, jadi
   tidak meratakan paralaks. Bertumpuk urut panggilan: lapisan baru di atas lapisan depan sebelumnya (ditandai
   data-wv-depan), tetap di bawah anak #stage lain. Lapisan depan hidup DI LUAR view rig: di starter aksi kontinu ia
   tetap terlihat walau #collage .view.off — sembunyikan/lepas sendiri saat ganti view. */
function lapisDepan(el){let a=viewDunia();
  while(a.nextElementSibling&&a.nextElementSibling.hasAttribute('data-wv-depan'))a=a.nextElementSibling;
  el.setAttribute('data-wv-depan','');a.after(el);return el;}
/* '#rgb' | '#rrggbb' | 'rgb(a)(…)' (bentuk yang ditulis GSAP saat men-tween warna) → [r,g,b] 0..255 */
const warnaRGB=c=>{c=String(c).trim();if(c[0]==='#'){if(c.length<6)c='#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3];const n=parseInt(c.slice(1,7),16);return[n>>16&255,n>>8&255,n&255];}
  const m=c.match(/[\d.]+/g);if(!/^rgb/.test(c)||!m||m.length<3)throw new Error('warna tidak dikenal: '+c+' (pakai #rrggbb atau rgb())');return m.slice(0,3).map(Number);};

/* LANGIT — di-tween GSAP seperti CAM: tl.to(LANGIT,{matahariY:.8},at). Posisi 0..1 (y = 0 di atas), matahariR dalam
   tinggi frame, pendar/bintang/awan/sinar 0..1 (0 = mati; bintang/awan/sinar 0 dilewati shader), hanyut = px/dtk awan.
   Bawaan: malam ungu berbulan (acuan evals/bukti/2026-11-01-spike-gapura/f_7.jpg). */
const LANGIT={zenit:'#0d0b24',tengah:'#2e2452',horizon:'#7c5679',matahariX:.72,matahariY:.2,matahariR:.03,
  warnaMatahari:'#ffe9c8',pendar:.45,bintang:.6,awan:.55,awanWarna:'#4a3f6e',hanyut:9,sinar:.2};
/* satu fragment shader (bahan: riset gl-shader.html pass 1–2): gradien 3 warna, cakram + pendar, bintang hash
   berkelip, awan fBm 5 oktaf yang hanyut. God rays analitik: berkas = noise menurut ARAH dari matahari, diredam awan
   yang disampel di 2 titik ke arah matahari (fBm 1 oktaf + rata-rata oktaf yang hilang). Radial blur 16–24 sampel
   terukur +20–50 ms/frame di HD 4000; versi ini ±5 ms, seluruh langit ±12–15 ms. Siluet SVG di depan kanvas
   menutup berkasnya sendiri — tanpa pre-pass. */
const LANGIT_FS=`#version 300 es
precision highp float;uniform vec2 R;uniform float T;uniform vec3 Z,M,Hz,Sc,Ac,C;uniform vec4 S,A;out vec4 o;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p,int k){float s=.5*(exp2(-float(k))-.03125),a=.5;p=vec2((p.x+A.z)*2.4,p.y*5.)/R.y;
 for(int i=0;i<5;i++){if(i>=k)break;s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float tutup(float f,float w){float lo=.7-.45*A.y;return smoothstep(lo,lo+w,f);}
void main(){vec2 c=R*.5,p=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y)-c;float cr=cos(C.z),sr=sin(C.z);
 p=mat2(cr,-sr,sr,cr)*p+c+C.xy;
 float y=p.y/R.y;vec3 col=mix(mix(Z,M,smoothstep(0.,.5,y)),Hz,smoothstep(.35,.8,y));
 vec2 s=S.xy*R;float d=length(p-s)/R.y,g=S.w*(.55*exp(-max(d-S.z,0.)*30.)+.3*exp(-d*4.5));
 if(A.x>0.){vec2 q=floor(p/12.),e=p-q*12.-2.;float r1=h(q),r2=h(q+19.7),r3=h(q+53.3);
  if(r1<.03*A.x)col+=vec3(1.,.95,.86)*(.3+.7*r3*r3)*(.65+.35*sin(T*(1.2+3.*r2)+r3*40.))
   *(1.-smoothstep(.3+.7*r2,1.3+.7*r2,length(e-vec2(r2,r3)*8.)))*(1.-smoothstep(.25,.8,y));}
 col+=Sc*g;col=mix(col,Sc,1.-smoothstep(S.z-1.5/R.y,S.z,d));
 if(A.y>0.){float f=fbm(p,5);col=mix(col,Ac*(.55+.8*tutup(f,.55))+Sc*g*1.3,tutup(f,.25)*.9);}
 if(A.w>0.){vec2 v=(p-s)/max(d*R.y,1.);
  float b=.65*n(v*6.+vec2(T*.02,0))+.35*n(v*14.+vec2(3.1,T*.03)),
   bebas=1.-.8*tutup(.5*(fbm(s+v*min(.12,d)*R.y,1)+fbm(s+v*min(.3,d)*R.y,1)),.25);
  col+=Sc*(.7*A.w)*smoothstep(.25,.9,b)*bebas*exp(-d*2.2)*smoothstep(S.z,3.*S.z,d);}
 o=vec4(col,1.);}`;
/* langit(opsi) → kanvas #wv-langit, anak PERTAMA #stage (di belakang dunia, bukan di dalamnya: langit di tak hingga).
   opsi ditimpakan ke LANGIT. Kamera: uv diputar CAM.roll di pusat frame dan digeser (CAM.fx/fy − pusat)·0,02 px;
   guncangan handheld tidak diikutkan (±0,7° tak terlihat di langit). Digambar ulang hanya lewat onUpdate tl, yang
   terpicu hanya saat tl.time() berubah. Tanpa WebGL2: <div> gradien CSS + console.warn. Panggilan kedua mengganti. */
function langit(opsi={}){
  for(const k in opsi)if(!(k in LANGIT))throw new Error('langit: opsi tidak dikenal: '+k+' ('+Object.keys(LANGIT).join(' ')+')');
  Object.assign(LANGIT,opsi);const L=LANGIT,st=$('#stage'),lama=$('#wv-langit');if(lama)lama.remove();
  const c=document.createElement('canvas');c.id='wv-langit';c.width=W;c.height=H;
  const gl=c.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true}),pr=gl&&gl.createProgram();
  if(pr){const sh=[[gl.VERTEX_SHADER,'#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0,1);}'],[gl.FRAGMENT_SHADER,LANGIT_FS]].map(([t,src])=>{
      const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);gl.attachShader(pr,s);return s;});
    gl.bindAttribLocation(pr,0,'p');gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))console.error('langit: shader gagal — '+sh.map(s=>gl.getShaderInfoLog(s)).join(' ')+gl.getProgramInfoLog(pr));}
  if(!pr||!gl.getProgramParameter(pr,gl.LINK_STATUS)){
    if(!pr)console.warn('langit: WebGL2 tidak tersedia — jatuh ke gradien CSS (tanpa bintang, awan, sinar)');
    const d=document.createElement('div');d.id='wv-langit';
    d.style.cssText=`position:absolute;inset:0;pointer-events:none;background:linear-gradient(${L.zenit},${L.tengah},${L.horizon})`;st.prepend(d);return d;}
  c.style.cssText='position:absolute;left:0;top:0;pointer-events:none';st.prepend(c);
  gl.useProgram(pr);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const U={};for(const k of ['R','T','Z','M','Hz','Sc','Ac','C','S','A'])U[k]=gl.getUniformLocation(pr,k);
  const v3=(k,w)=>gl.uniform3fv(U[k],warnaRGB(w).map(x=>x/255));gl.uniform2f(U.R,W,H);
  const gambar=()=>{if(!c.isConnected)return;const t=tl.time(),cam=typeof CAM!=='undefined';
    v3('Z',L.zenit);v3('M',L.tengah);v3('Hz',L.horizon);v3('Sc',L.warnaMatahari);v3('Ac',L.awanWarna);
    gl.uniform1f(U.T,t);gl.uniform4f(U.S,L.matahariX,L.matahariY,L.matahariR,L.pendar);gl.uniform4f(U.A,L.bintang,L.awan,t*L.hanyut,L.sinar);
    gl.uniform3f(U.C,cam?(CAM.fx-W/2)*.02:0,cam?(CAM.fy-H/2)*.02:0,cam?CAM.roll*Math.PI/180:0);gl.drawArrays(gl.TRIANGLES,0,3);};
  gambar();rantaiUpdate(gambar);return c;}
/* perspektif udara: campur warna ke LANGIT.horizon sebanding z/zJauh (0..1) — bidang makin jauh, makin pudar */
function warnaJarak(warna,z,zJauh=-800){const k=Math.max(0,Math.min(1,z/zJauh)),a=warnaRGB(warna),b=warnaRGB(LANGIT.horizon);
  return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*k).toString(16).padStart(2,'0')).join('');}

/* kabut(bidang,{y,…}) → <div class="wv-kabut"> anak bidang (ikut paralaks). Tile fBm 2D ber-seed lebar×tebal
   dipanggang SEKALI (kisi berperiode → menyambung di tepi; alfa memudar ke atas/bawah), ditampilkan sebagai
   background repeat-x; per frame hanya translateX dari t. y = garis tengah pita (px bidang). Bidang jauh: rapat
   lebih besar + warna warnaJarak(…, z). Elemen = 3 tile mulai x −lebar/2: di SETIAP fase hanyut pita menutup
   [−lebar/2, 3·lebar/2] bidangnya, jadi kamera boleh bergeser ±lebar/2 (truck, zoom < 1, roll, handheld) tanpa
   ujung pita masuk frame. */
function kabut(bidang,{y,tebal=180,warna=LANGIT.horizon,rapat=.6,hanyut=20,seed=1,lebar=W}={}){
  if(!(bidang instanceof HTMLElement))throw new Error('kabut: bidang wajib elemen HTML (bukan <g> SVG)');
  if(y==null)throw new Error('kabut: y (garis tengah pita, px bidang) wajib');
  const c=document.createElement('canvas');c.width=lebar;c.height=tebal;
  const x=c.getContext('2d'),im=x.createImageData(lebar,tebal),d=im.data,[r,g,b]=warnaRGB(warna),p0=Math.max(1,Math.round(lebar/300)),S=new Float32Array(lebar*tebal);
  /* fBm 2D 5 oktaf (sel pertama ±300×60 px): tiap baris kisi = vnoise 1D ber-seed sendiri, dihitung SEKALI per baris
     (bukan per piksel), lalu diinterpolasi halus antarbaris. Loop polos: ±40 ms untuk 1920×180. */
  for(let k=0;k<5;k++){const fy=2**k/60,a=.5**(k+1),p=p0*2**k,R=[];
    for(let j=0;j<=tebal*fy+1;j++){const q=R[j]=new Float32Array(lebar);for(let i=0;i<lebar;i++)q[i]=vnoise(i*p/lebar,seed*7+k+j*7919,p);}
    for(let j=0;j<tebal;j++){const v=j*fy,q=Math.floor(v),w=v-q,e=w*w*(3-2*w),u=R[q],z=R[q+1];for(let i=0;i<lebar;i++)S[j*lebar+i]+=a*(u[i]+(z[i]-u[i])*e);}}
  for(let j=0;j<tebal;j++){const tepi=Math.sin(Math.PI*(j+.5)/tebal)**1.5;   // memudar ke atas/bawah
    for(let i=0;i<lebar;i++){const o=(j*lebar+i)*4;d[o]=r;d[o+1]=g;d[o+2]=b;d[o+3]=255*rapat*tepi*(.2+.8*Math.min(1,Math.max(0,S[o/4]*2.6-1.05)));}}   // kabut tipis + gumpalan
  x.putImageData(im,0,0);
  const el=document.createElement('div');el.className='wv-kabut';
  el.style.cssText=`position:absolute;left:${-lebar/2}px;top:${y-tebal/2}px;width:${3*lebar}px;height:${tebal}px;pointer-events:none;will-change:transform;`+
    `background:url("${c.toDataURL()}") repeat-x;background-size:${lebar}px ${tebal}px`;
  bidang.appendChild(el);
  const geser=()=>{if(el.isConnected)el.style.transform=`translateX(${-(((tl.time()*hanyut)%lebar+lebar)%lebar)}px)`;};
  geser();rantaiUpdate(geser);return el;}

/* PARTIKEL — satu kanvas 2D seukuran area per panggilan. Tiap partikel punya r[] dari mulberry32(seed) saat setup;
   tiap frame fase = frac(t/umur + r), posisi/alfa = fungsi (r, fase) saja → seek ke mana pun memberi piksel sama.
   gerak(r,f,w,h) → [x, y, jari sprite, alfa]; alfa 0 di fase 0 dan 1 (atau gerak periodik) → tidak ada lompatan. */
const JENIS_PARTIKEL={
  bara:{umur:[2.4,5],warna:'#ff9a3c',aditif:1,     // naik berkelok dari dasar area, berkedip, memudar
    gerak:(r,f,w,h)=>[r[1]*w+Math.sin(6.283*(f*(1+r[2])+r[3]))*(10+30*r[4])*f,h*(1-f*(.55+.45*r[5])),(1.2+2*r[4])*(1-.4*f)*3,Math.min(1,f*8)*(1-f)*(.7+.3*Math.sin(f*70+r[3]*9))]},
  debu:{umur:[8,16],warna:'#ffe6c0',aditif:1,      // melayang lambat di berkas cahaya
    gerak:(r,f,w,h)=>[r[1]*w+(f-.5)*(30+50*r[2])*(r[6]<.5?-1:1)+4*Math.sin(6.283*(2*f+r[3])),r[5]*h+(f-.5)*(20*r[4]-10)+3*Math.sin(6.283*(3*f+r[2])),(.8+1.2*r[4])*2.5,Math.sin(Math.PI*f)*(.2+.4*r[2])]},
  asap:{umur:[6,10],warna:'#8c7c8c',               // gumpalan radial besar, naik & melebar, alfa ≤ .12
    gerak:(r,f,w,h)=>[r[1]*w+f*(r[2]-.5)*80,h*(1-f*(.4+.5*r[3])),(40+50*r[4])*(1+1.4*f),.12*Math.sin(Math.PI*f)*(.5+.5*r[5])]},
  kunang:{umur:[3,6],warna:'#d6ff7a',aditif:1,     // nyaris diam, berkedip; gerak periodik penuh per umur
    gerak:(r,f,w,h)=>[r[1]*w+18*Math.sin(6.283*(f+r[2])),r[3]*h+12*Math.sin(6.283*(2*f+r[4])),(1.5+1.5*r[5])*3,Math.max(0,Math.sin(6.283*(2*f+r[6])))**6]}};
/* partikel(bidang | 'depan', {jenis,…}) → <canvas class="wv-partikel"> di (area[0], area[1]) bidang itu; 'depan' =
   lapisDepan (koordinat #stage). Jepitan 400 PER PANGGILAN; total per HALAMAN dijaga pemanggil: callback partikel/kabut/sumber menggambar tiap
   frame, tersembunyi atau di luar frame sekalipun. */
function partikel(bidang,{jenis,n=60,area=[0,0,W,H],seed=1,warna}={}){
  if(bidang!=='depan'&&!(bidang instanceof HTMLElement))throw new Error("partikel: bidang wajib elemen HTML (bukan <g> SVG) atau 'depan'");
  const J=JENIS_PARTIKEL[jenis];if(!J)throw new Error('partikel: jenis tidak dikenal: '+jenis+' ('+Object.keys(JENIS_PARTIKEL).join(' ')+')');
  if(n>400){console.warn('partikel: n '+n+' melewati jepitan 400 per panggilan — dijepit ke 400 (total di halaman dijaga pemanggil)');n=400;}
  const [ax,ay,w,h]=area,cv=document.createElement('canvas');cv.className='wv-partikel';cv.width=w;cv.height=h;
  cv.style.cssText=`position:absolute;left:${ax}px;top:${ay}px;pointer-events:none`;
  /* sprite radial dipanggang sekali; per partikel hanya drawImage + globalAlpha */
  const sp=document.createElement('canvas');sp.width=sp.height=64;const sx=sp.getContext('2d'),gr=sx.createRadialGradient(32,32,0,32,32,32),
    [cr,cg,cb]=warnaRGB(warna||J.warna),ca=a=>`rgba(${cr},${cg},${cb},${a})`;
  if(J.aditif)gr.addColorStop(0,'rgba(255,250,235,1)');   // inti panas
  gr.addColorStop(J.aditif?.18:0,ca(1));gr.addColorStop(.45,ca(J.aditif?.3:.5));gr.addColorStop(1,ca(0));sx.fillStyle=gr;sx.fillRect(0,0,64,64);
  const cx=cv.getContext('2d'),rnd=mulberry32(seed),P=Array.from({length:n},()=>{const r=Array.from({length:8},rnd);r[0]=J.umur[0]+(J.umur[1]-J.umur[0])*r[0];return r;});
  cx.globalCompositeOperation=J.aditif?'lighter':'source-over';
  if(bidang==='depan')lapisDepan(cv);else bidang.appendChild(cv);
  const gambar=()=>{if(!cv.isConnected)return;const t=tl.time();cx.clearRect(0,0,w,h);
    for(const r of P){const k=t/r[0]+r[7],[x,y,s,a]=J.gerak(r,k-Math.floor(k),w,h);
      if(a>.003){cx.globalAlpha=Math.min(1,a);cx.drawImage(sp,x-s,y-s,2*s,2*s);}}};
  gambar();rantaiUpdate(gambar);return cv;}

/* kait untuk scripts/test-starters.mjs — tidak dipanggil deliverable. Fixture sendiri (dua bidang, langit, keempat
   jenis partikel, dua kabut, dua lapisan depan), lalu semuanya dibersihkan seperti CAM_UJI; callback rantai yang
   tertinggal jadi no-op. */
window.ATM_UJI=()=>{const r={},O=window.OPENER,cam=typeof CAM!=='undefined',buang=[],
    bidang=z=>{const b=document.createElement('div');b.dataset.z=z;b.style.cssText=`position:absolute;left:0;top:0;width:${W}px;height:${H}px`;
      rigDunia().appendChild(b);buang.push(b);if(cam)BIDANG.push({el:b,z});return b;},jauh=bidang(-600),dekat=bidang(0),L=langit(),
    P=['bara','debu','asap','kunang'].map((jenis,i)=>partikel(i?jauh:'depan',{jenis,n:40,area:[200,200,480,360],seed:i+1})),
    k1=kabut(jauh,{y:700,seed:2,hanyut:W/4}),k0=kabut(dekat,{y:760,seed:3,hanyut:W/4}),   // satu siklus hanyut = lebar/hanyut = 4 dtk
    L1=lapisDepan(document.createElement('div')),L2=lapisDepan(document.createElement('div')),
    foto=()=>[...document.querySelectorAll('.wv-partikel,#wv-langit,.wv-kabut')].map(e=>e.toDataURL?e.toDataURL():e.style.transform);
  buang.push(L,...P,L1,L2);
  r.lapisUrut=P[0].nextElementSibling===L1&&L1.nextElementSibling===L2&&!!L2.nextElementSibling;   // bara 'depan' → L1 → L2 → anak #stage lain
  O.seek(5);const a=foto();O.seek(9);O.seek(.1);O.seek(5);const b=foto();r.seekSama=a.length===b.length&&a.every((x,i)=>x===b[i]);
  if(cam){const simpan={...CAM},kiri=e=>e.getBoundingClientRect().left;
    Object.assign(CAM,{fx:W/2,fy:H/2,zoom:1,pitch:0,yaw:0,roll:0,shake:0});applyCam();const j0=kiri(k1),d0=kiri(k0);
    CAM.fx+=300;applyCam();r.kabutParalaks=Math.abs((kiri(k1)-j0)-(kiri(k0)-d0))>1;
    /* ujung pita tidak boleh masuk frame: 6 fase satu siklus hanyut × kamera ±300 px */
    const fr=$('#stage').getBoundingClientRect();r.kabutMenutup=true;
    for(let i=0;i<6;i++){O.seek((i+.5)/6*4);for(const dx of [-300,300]){CAM.fx=W/2+dx;applyCam();
      for(const k of [k1,k0]){const e=k.getBoundingClientRect();if(e.left>fr.left+1||e.right<fr.right-1)r.kabutMenutup=false;}}}
    Object.assign(CAM,simpan);}
  else r.kabutParalaks=r.kabutMenutup=null;
  const gl=L.getContext&&L.getContext('webgl2'),lepas=gl&&gl.getExtension('WEBGL_lose_context');if(lepas)lepas.loseContext();
  for(const e of buang)e.remove();
  if(cam){for(const e of [jauh,dekat])BIDANG.splice(BIDANG.findIndex(x=>x.el===e),1);if(!BIDANG.length)rig.style.transformStyle='';applyCam();}
  const gc=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=()=>null;let f;
  try{f=langit();}finally{HTMLCanvasElement.prototype.getContext=gc;}
  r.fallback=f instanceof HTMLDivElement&&/gradient/.test(f.style.background);f.remove();
  try{partikel(dekat,{jenis:'salju'});r.jenisDitolak=false;}catch(e){r.jenisDitolak=/bara debu asap kunang/.test(e.message);}
  const g=document.createElementNS('http://www.w3.org/2000/svg','g'),tolak=f=>{try{f();return false;}catch(e){return /elemen HTML/.test(e.message);}};
  r.kabutDitolak=tolak(()=>kabut(g,{y:700}));r.partikelDitolak=[g,'Depan'].every(b=>tolak(()=>partikel(b,{jenis:'bara'})));
  return r;};
