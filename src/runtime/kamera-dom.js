/* BACKEND 2.5D — membaca CAM, menulis transform ke rig (#world/#colWorld), bidang [data-z], dan
   overlay cahaya. Jalur 2D murni (tanpa pitch/yaw/roll/shake/bidang) memakai string yang PERSIS
   sama dengan kamera kolase lama dan tidak menyentuh gaya lain.
   BIDANG: pembungkus [data-z="-300"] (elemen <div>/<svg> sendiri — transform 3D DI DALAM svg diratakan
   Chrome). GSAP menganimasikan ANAK pembungkus, bukan pembungkusnya. scale((P0-z)/P0) membuat ukuran
   pada lensa 35 mm sama dengan 2D; paralaks muncul saat kamera bergerak/miring, dan lens()/dollyZoom()
   mengubah ukuran bidang relatif terhadap z=0. */
CAM.mode='dom';
const BIDANG=[...rig.querySelectorAll('[data-z]')].map(e=>({el:e,z:+e.dataset.z}));
let blurKu=0;
function applyCam(){
  const P=W*CAM.mm/36;let fx=CAM.fx,fy=CAM.fy,roll=CAM.roll;
  if(CAM.shake){const t=tl.time(),a=CAM.shake;fx+=(noise(t*1.7,CAM.seed)-.5)*40*a;fy+=(noise(t*1.3,CAM.seed+1)-.5)*30*a;roll+=(noise(t*.9,CAM.seed+2)-.5)*1.2*a;}
  if(!CAM.pitch&&!CAM.yaw&&!roll&&!CAM.shake&&!BIDANG.length)
    rig.style.transform=`translate(${W/2-CAM.fx*CAM.zoom}px,${H/2-CAM.fy*CAM.zoom}px) scale(${CAM.zoom})`;
  else rig.style.transform=`translate(${W/2}px,${H/2}px) perspective(${P}px) rotateX(${CAM.pitch}deg) rotateY(${CAM.yaw}deg) rotateZ(${roll}deg) scale(${CAM.zoom}) translate(${-fx}px,${-fy}px)`;
  if(BIDANG.length)rig.style.transformStyle='preserve-3d';
  for(const b of BIDANG){b.el.style.transform=`translateZ(${b.z}px) scale(${(P0-b.z)/P0})`;
    b.el.style.filter=CAM.aperture?`blur(${Math.min(24,Math.abs(b.z-CAM.focus)*CAM.aperture/100).toFixed(2)}px)`:'';}
  if(CAM.blur||blurKu){rig.style.filter=CAM.blur?`blur(${CAM.blur}px)`:'';blurKu=CAM.blur;}}   // hanya filter milik kamera yang dihapus
gsap.ticker.add(()=>{if(CAM.shake)applyCam();});   // handheld/pov: noise dibaca dari tl.time() tiap frame, bukan hanya saat ada tween CAM
/* rack focus: fokus = z bidang yang berisi subjek; aperture>0 mengaburkan bidang lain sebanding jaraknya */
const bidangDari=el=>{if(typeof el==='string'){const sel=el;el=$(sel);if(!el)throw new Error('focus: subjek '+sel+' tidak ada');}
  for(let n=el;n&&n!==rig;n=n.parentNode)if(n.dataset&&n.dataset.z!=null)return +n.dataset.z;return 0;};
const focus=(at,dur,el,aperture=6,ease='sine.inOut')=>camTo(at,dur,{focus:bidangDari(el),aperture},ease);
const rackFocus=(at,dur,a,b)=>{cutTo(at,{focus:bidangDari(a),aperture:6});focus(at,dur,b);};

/* CAHAYA 2.5D: overlay gradien di atas rig. Dua div bergantian supaya pergantian bisa di-tween.
   ponytail: urutan panggilan = urutan waktu — light() dengan 'at' lebih kecil dari panggilan sebelumnya ditolak. */
const CAHAYA={
  day:   {bg:'none',blend:'normal',op:0},
  golden:{bg:'linear-gradient(200deg,#ffd38a 0%,#ffb05a 45%,#5a3a6e 100%)',blend:'multiply',op:.55},
  blue:  {bg:'linear-gradient(180deg,#7fa6ff 0%,#4a63b8 60%,#1b2244 100%)',blend:'multiply',op:.6},
  night: {bg:'linear-gradient(180deg,#2a3560,#0c1020)',blend:'multiply',op:.8},
  lowkey:{bg:'radial-gradient(60% 60% at 50% 50%,transparent 15%,rgba(0,0,0,.92) 70%)',blend:'normal',op:1},
  studio:{bg:'radial-gradient(50% 50% at 30% 20%,rgba(255,255,255,.35),transparent 70%)',blend:'screen',op:1}};
const LAMP=[0,1].map(()=>{const d=document.createElement('div');
  d.style.cssText='position:absolute;inset:0;pointer-events:none;opacity:0';rig.insertAdjacentElement('afterend',d);return d;});
let lamp=0,lampAt=-Infinity;
function light(at,dur,preset,o={}){if(!CAHAYA[preset])throw new Error('preset cahaya tidak dikenal: '+preset+' ('+Object.keys(CAHAYA).join(' ')+')');
  if(at<lampAt)throw new Error('light(): panggil urut waktu (detik '+at+' setelah '+lampAt+')');lampAt=at;
  const p={...CAHAYA[preset],...o},n=LAMP[1-lamp],c=LAMP[lamp];
  tl.set(n,{background:p.bg,mixBlendMode:p.blend,opacity:0},at);
  tl.to(n,{opacity:p.op,duration:dur,ease:'sine.inOut'},at);tl.to(c,{opacity:0,duration:dur,ease:'sine.inOut'},at);lamp=1-lamp;}

/* ?demo=1 — katalog kosakata (bukan rundown). Dipanggil starter SETELAH koreografi contoh:
   tween kamera contoh dimatikan, isinya tetap. 28 entri × DUR/30 → selesai sebelum penjaga loop. */
function demoKamera(){camReset();const O={pitch:0,yaw:0,roll:0,shake:0};cutTo(0,{fx:W/2,fy:H/2,zoom:1,...O});
  const s=rig.querySelector('[data-subjek],.cut,img,svg')||rig.firstElementChild,step=DUR/30;let t=0;
  for(const k in SHOT){shot(t,step*.7,k,s);t+=step;}home(t,W/2,H/2,step*.7);t+=step;
  for(const k in ANGLE.dom){cutTo(t,O);angle(t,step*.7,k);t+=step;}cutTo(t,O);
  for(const [f,a] of [[dolly,1.4],[truck,220],[pedestal,-120],[pan,6],[tilt,5]]){f(t,step*.8,a);t+=step;}cutTo(t,O);home(t,W/2,H/2,step*.7);t+=step;
  for(const k in CAHAYA){light(t,step*.5,k);t+=step;}handheld(t,t+step,.8);t+=step;
  window.DEMO_AKHIR=t;}
/* kait untuk scripts/test-starters.mjs — tidak dipanggil deliverable */
window.CAM_UJI=()=>{const r={};tl.pause(0);
  Object.assign(CAM,{fx:W/2,fy:H/2,zoom:1,pitch:0,yaw:0,roll:0,shake:0,blur:0,aperture:0});applyCam();
  r.gayaLain=[rig.style.filter&&'filter',rig.style.transformStyle&&'transform-style',/perspective|rotate/.test(rig.style.transform)&&'transform 3D'].filter(Boolean).join(',');
  CAM.yaw=5;applyCam();r.t3d=rig.style.transform;CAM.yaw=0;
  const b=document.createElement('div');b.dataset.z='-300';b.style.cssText='position:absolute;left:0;top:0;width:10px;height:10px';rig.appendChild(b);BIDANG.push({el:b,z:-300});
  applyCam();const kiri=()=>b.getBoundingClientRect().left-rig.getBoundingClientRect().left,k0=kiri();
  CAM.fx+=300;CAM.yaw=6;applyCam();r.paralaks=Math.abs(kiri()-k0)>1;
  CAM.fx=W/2;CAM.yaw=0;CAM.mm=20;applyCam();const w20=b.getBoundingClientRect().width;CAM.mm=85;applyCam();r.lensa=Math.abs(b.getBoundingClientRect().width-w20)>.01;CAM.mm=35;
  BIDANG.pop();b.remove();rig.style.transformStyle='';applyCam();
  rig.style.filter='blur(6px)';applyCam();r.filterAsing=rig.style.filter==='blur(6px)';rig.style.filter='';
  const h=document.createElement('div');h.style.cssText='position:absolute;left:0;top:900px;width:100px;height:50px';$('#stage').appendChild(h);
  const hr=rectIn(h,$('#stage'));r.hudStage=hr.x===0&&hr.y===900;h.remove();
  CAM.shake=.6;tl.time(.2);gsap.ticker.tick();const g1=rig.style.transform;tl.time(.4);gsap.ticker.tick();r.shakeHidup=g1!==rig.style.transform;CAM.shake=0;applyCam();
  const t0=Math.max(0,lampAt)+1;light(t0,.1,'golden');tl.time(t0+.2);r.lampu=getComputedStyle(LAMP[lamp]).mixBlendMode;
  try{light(t0-1,.1,'day');r.urutanDitolak=false;}catch(e){r.urutanDitolak=true;}
  r.DUR=DUR;r.demoAkhir=window.DEMO_AKHIR||0;return r;};
