/* KAMERA — satu objek keadaan, fungsi murni dari tl.time() (SKILL.md Hukum #2).
   Inti ini TIDAK menyentuh DOM/WebGL: ia hanya menulis angka ke CAM lewat tween GSAP berdetik
   absolut. Backend (kamera-dom / kamera-three) mendefinisikan applyCam() yang membaca CAM dan
   menggambar. Kosakata: techniques.md §3b. */
const CAM={mode:'dom',          // 'dom' (2.5D) | 'three' — diisi backend
  fx:W/2,fy:H/2,fz:0,           // titik fokus (koordinat dunia)
  zoom:1,                       // 2.5D: skala rig; 3D: camera.zoom
  dist:10,yaw:0,pitch:0,roll:0, // kamera relatif ke fokus (derajat); 2.5D: yaw/pitch kecil = tilt/paralaks
  mm:35,                        // lensa (filmGauge 36); 2.5D: perspective = W*mm/36 px
  focus:0,aperture:0,           // rack focus (aperture 0 = mati)
  shake:0,seed:1,               // handheld: value-noise ber-seed, bukan Math.random
  blur:0};                      // blur berarah saat whip
/* RENCANA: bayangan CAM saat setup. Nilai relatif ('+=220', '*=1.4') diselesaikan DI SINI menjadi angka
   absolut — GSAP menyelesaikan nilai relatif saat tween pertama kali dirender, sehingga hasilnya bergantung
   jalur seek (putar ≠ lompat ≠ worker export). Karena itu gerak relatif wajib dipanggil urut waktu. */
const PLAN={...CAM},P0=W*35/36;let planAt=-Infinity;
const mutlak=(at,v)=>{const o={};for(const k in v){let x=v[k];
  if(typeof x==='string'){if(at<planAt)throw new Error('gerak relatif harus dipanggil urut waktu (detik '+at+' setelah '+planAt+')');
    x=x[0]==='*'?PLAN[k]*parseFloat(x.slice(2)):PLAN[k]+parseFloat(x.slice(2));}
  o[k]=PLAN[k]=x;}planAt=Math.max(planAt,at);return o;};
const camTo=(at,dur,v,ease='power2.inOut')=>tl.to(CAM,{...mutlak(at,v),duration:dur,ease,onUpdate:applyCam},at);
const cutTo=(at,v)=>tl.set(CAM,{...mutlak(at,v),onUpdate:applyCam},at);                       // lompat di titik cut
const camReset=()=>{gsap.killTweensOf(CAM);Object.assign(PLAN,CAM);planAt=-Infinity;};       // buang semua gerak kamera yang sudah ditulis
/* alias kamera KOLASE (explainer.md "Resep kamera kolase") — angka & easing persis yang lama */
const look=(at,x,y,z,dur=1.6,ease='sine.inOut')=>camTo(at,dur,{fx:x,fy:y,zoom:z},ease);     // meluncur ke aset lain
const home=(at,x=W/2,y=H/2,dur=1.2)=>look(at,x,y,1,dur,'power2.inOut');                     // zoom out ke frame adegan, lalu DIAM
const into=(cutAt,x,y,z)=>camTo(cutAt-.9,.9,{fx:x,fy:y,zoom:z},'power2.in');                // push-through sebelum cut
const settle=(cutAt,x,y,z)=>camTo(cutAt,1.1,{fx:x,fy:y,zoom:z*.94},'power3.out');           // mendarat setelah cut
const breath=(a,b,z)=>camTo(a,b-a,{zoom:z},'sine.inOut');                                   // napas halus saat "diam"
/* value-noise 1D ber-seed: hash bilangan bulat → interpolasi smoothstep. Dipakai handheld.
   Bukan Math.random: t yang sama selalu memberi nilai yang sama (scrub & export reproducible). */
const hash=(i,s)=>{let x=(Math.imul(i,374761393)+Math.imul(s,668265263))|0;x=Math.imul(x^x>>>13,1274126177);return((x^x>>>16)>>>0)/4294967296;};
const noise=(t,s=1)=>{const i=Math.floor(t),f=t-i,u=f*f*(3-2*f),a=hash(i,s);return a+(hash(i+1,s)-a)*u;};

/* UKURAN SHOT (techniques.md §3b): berapa bagian frame yang diisi subjek. ECU 6,7× frame … EWS 0,1×. */
const SHOT={ECU:6.7,CU:2.86,MCU:1.67,MS:1.11,WS:.45,EWS:.1};
/* kotak elemen dalam koordinat root (dunia tanpa transform kamera, atau #stage untuk HUD). HTML: rantai
   offset. Elemen tanpa offsetLeft (SVG — bersarang, ber-viewBox, ber-transform): kotak layarnya relatif ke
   root, dibagi skala panggung. ponytail: mengandaikan root belum di-transform kamera — benar saat setup. */
function rectIn(el,root){
  if(typeof el.offsetLeft!=='number'){const a=el.getBoundingClientRect(),b=root.getBoundingClientRect(),k=b.width/root.offsetWidth||1;
    return{x:(a.left-b.left)/k,y:(a.top-b.top)/k,w:a.width/k,h:a.height/k};}
  let x=0,y=0,n=el;while(n&&n!==root){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent;}
  return{x,y,w:el.offsetWidth,h:el.offsetHeight};}
let lastShot=null;
function shot(at,dur,size,el,{ease='power2.inOut',fill=SHOT[size]}={}){
  if(!fill)throw new Error('ukuran shot tidak dikenal: '+size+' (ECU CU MCU MS WS EWS)');
  if(typeof el==='string'){const sel=el;el=$(sel);if(!el)throw new Error('shot: subjek '+sel+' tidak ada');}
  if(CAM.mode==='three'&&CAM.frame3d){const v=CAM.frame3d(fill,el);camTo(at,dur,v,ease);return v;}
  const r=rectIn(el,rig);let cx=r.x+r.w/2,cy=r.y+r.h/2;
  /* subjek di dalam bidang [data-z]: bidang diskalakan (P0-z)/P0 dari pusatnya, jadi titik fokusnya ikut bergeser (tepat di 35 mm) */
  for(let n=el.parentNode;n&&n!==rig;n=n.parentNode)if(n.dataset&&n.dataset.z!=null){
    const p=rectIn(n,rig),s0=(P0-n.dataset.z)/P0,ox=p.x+p.w/2,oy=p.y+p.h/2;cx=ox+s0*(cx-ox);cy=oy+s0*(cy-oy);break;}
  const v={fx:cx,fy:cy,zoom:Math.max(.1,Math.min(6,Math.min(W*fill/r.w,H*fill/r.h)))};
  hud.check(at,dur,r,v);
  if(dur===0&&lastShot&&lastShot.el===el&&lastShot.size===size&&Math.abs(lastShot.yaw-PLAN.yaw)<30)
    console.warn('aturan 30°: cut ke subjek yang sama dengan ukuran '+size+' tanpa beda sudut ≥ 30° terasa jump cut (detik '+at+')');
  lastShot={el,size,yaw:PLAN.yaw};
  camTo(at,dur,v,ease);return v;}

/* SUDUT KAMERA. 2.5D: sudut kecil (dunia pipih); 3D: sudut film sungguhan. */
const ANGLE={
  dom:{eye:{pitch:0,yaw:0,roll:0},high:{pitch:-8},low:{pitch:8},overhead:{pitch:-8,zoom:'*=.8'},worm:{pitch:8,zoom:'*=1.3'},
       dutch:{roll:12},ots:{yaw:6,pitch:-3},pov:{pitch:0,yaw:0,roll:0,shake:.6}},
  three:{eye:{pitch:0,roll:0},high:{pitch:-30},low:{pitch:25,mm:24},overhead:{pitch:-89.9},worm:{pitch:60,mm:16},
         dutch:{roll:15},ots:{yaw:35,pitch:-8,mm:50},pov:{pitch:0,roll:0,mm:28,shake:.5}}};
const angle=(at,dur,name,o={},ease='power2.inOut')=>{const p=ANGLE[CAM.mode][name];
  if(!p)throw new Error('sudut tidak dikenal: '+name+' ('+Object.keys(ANGLE[CAM.mode]).join(' ')+')');
  return camTo(at,dur,{...p,...o},ease);};

/* GERAK — relatif terhadap RENCANA ('+=', '*=' diselesaikan saat setup), jadi bisa dirantai tanpa tahu nilai sebelumnya */
const dolly=(at,dur,k,ease)=>camTo(at,dur,CAM.mode==='three'?{dist:'*='+(1/k)}:{zoom:'*='+k},ease);   // k>1 mendekat
const truck=(at,dur,dx,ease)=>camTo(at,dur,{fx:'+='+dx},ease);
const pedestal=(at,dur,dy,ease)=>camTo(at,dur,{fy:'+='+dy},ease);                                      // dy>0 = turun (sumbu layar)
const pan=(at,dur,dYaw,ease)=>camTo(at,dur,{yaw:'+='+dYaw},ease);
const tilt=(at,dur,dPitch,ease)=>camTo(at,dur,{pitch:'+='+dPitch},ease);
const crane=(at,dur,{dy=0,dPitch=0}={},ease)=>camTo(at,dur,{fy:'+='+dy,pitch:'+='+dPitch},ease);
let AXIS=null;const rule180=a=>{AXIS=a;};                                                             // garis aksi (yaw); null = bebas
const arc=(at,dur,toYaw,ease='sine.inOut')=>camTo(at,dur,{yaw:AXIS==null?toYaw:Math.max(AXIS-89,Math.min(AXIS+89,toYaw))},ease);
const lens=(at,dur,mm,ease)=>camTo(at,dur,{mm},ease);
/* vertigo. 2.5D: subjek di z=0 tidak terpengaruh perspective, bidang data-z bergeser → cukup tween mm. */
const dollyZoom=(at,dur,mm,ease)=>camTo(at,dur,{mm},ease);
/* whip pan (techniques.md §4c #6; bernama whipPan karena starter aksi kontinu sudah punya whip(t,dari,ke) antar-view): dunia bergeser 180 px + blur 0,28 dtk; panggil cutTo(at+.28, …) untuk shot berikutnya */
const whipPan=(at,dir=1)=>{camTo(at,.28,{fx:'+='+(-180*dir)},'power2.in');cutTo(at,{blur:18});cutTo(at+.28,{blur:0});};
/* handheld: backend memanggil applyCam dari ticker selama CAM.shake ≠ 0, jadi goyangan hidup saat diputar DAN saat seek */
const handheld=(a,b,amp=.5)=>{camTo(a,.3,{shake:amp},'sine.out');camTo(b-.3,.3,{shake:0},'sine.in');};
/* ZONA AMAN HUD: kamera tahu kantong teks, sehingga shot() tidak membawa subjek ke bawah label.
   Elemen di dalam rig = koordinat dunia; di luar rig (HUD #stage) = koordinat layar, dikonversi
   ke dunia memakai kamera shot itu. */
const HUD=[];
const hud={
  reserve(sel,at,dur){const e=$(sel);if(!e)throw new Error('hud.reserve: '+sel+' tidak ada');HUD.push({sel,el:e,at,to:at+dur});},
  check(at,dur,r,v){for(const h of HUD){if(at+dur<h.at||at>h.to)continue;
    const dalam=rig.contains(h.el);let p=rectIn(h.el,dalam?rig:$('#stage'));
    if(!dalam)p={x:(p.x-W/2)/v.zoom+v.fx,y:(p.y-H/2)/v.zoom+v.fy,w:p.w/v.zoom,h:p.h/v.zoom};   // layar → dunia
    if(r.x<p.x+p.w&&r.x+r.w>p.x&&r.y<p.y+p.h&&r.y+r.h>p.y)
      throw new Error('zona aman: subjek shot pada detik '+at+' masuk kantong teks '+h.sel+' — geser fokus, ganti ukuran shot, atau pindahkan teks');}}};
