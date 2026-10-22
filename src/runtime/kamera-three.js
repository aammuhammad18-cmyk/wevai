/* BACKEND 3D — membaca CAM, menulis ke `camera` Three.js (r161). Starter menyediakan THREE, scene, camera,
   renderer, composer SEBELUM blok ini; render() starter memanggil applyCam() lalu composer.render(0).
   Di sini fx/fy/fz = koordinat dunia Three (Y ke atas), dist dalam unit dunia, yaw/pitch/roll derajat. */
CAM.mode='three';
camDefaults({fx:0,fy:0,fz:0,dist:10,yaw:0,pitch:0,mm:35,zoom:1,rail:-1,railU:0});
/* warna dari token CSS ('--accent'), hex, atau THREE.Color — dunia 3D ikut style brief, tanpa hardcode */
const warna=c=>new THREE.Color(typeof c==='string'&&c.startsWith('--')?getComputedStyle(document.documentElement).getPropertyValue(c).trim():c);

/* ---------- KAMERA ---------- */
/* satu jalur untuk kamera render DAN kamera bayangan cek3: pose, lookAt, roll, lensa */
const RAILS=[];   // {curve,look} — dibuat saat setup; keadaan rail hanya CAM.rail (indeks, -1 = mati) dan CAM.railU (0..1)
function arahkan(cam,c,dx=0,dy=0,dz=0,roll=c.roll){let p,f;
  if(c.rail>=0){const R=RAILS[c.rail];p=R.curve.getPointAt(c.railU);f=R.look;}else{p=pose(c);f=[c.fx,c.fy,c.fz];}
  cam.position.set(p.x+dx,p.y+dy,p.z+dz);cam.lookAt(f[0],f[1],f[2]);cam.rotateZ(roll*Math.PI/180);
  cam.zoom=c.zoom;cam.filmGauge=36;cam.setFocalLength(c.mm);}   // setFocalLength = updateProjectionMatrix (zoom sudah terpasang)
/* rail: kamera meluncur sepanjang Catmull-Rom (≥ 3 titik) sambil menatap titik `look`. Di ujung, CAM kembali ke pose bola
   yang tepat di titik terakhir (kebalikan pose()), jadi camTo/shot sesudahnya berlanjut tanpa lompatan. */
function rail(at,dur,pts,{look=null,ease='sine.inOut'}={}){
  if(at<planAt)throw new Error('gerak relatif harus dipanggil urut waktu (detik '+at+' setelah '+planAt+')');
  if(pts.length<3)throw new Error('rail: butuh ≥ 3 titik (CatmullRomCurve3 2 titik rusak di r161)');
  const f=look||[PLAN.fx,PLAN.fy,PLAN.fz],curve=new THREE.CatmullRomCurve3(pts.map(q=>new THREE.Vector3(...q)),false,'centripetal'),
    e=curve.getPointAt(1),dx=e.x-f[0],dy=e.y-f[1],dz=e.z-f[2],d=Math.hypot(dx,dy,dz),i=RAILS.push({curve,look:f})-1;
  return[cutTo(at,{rail:i,railU:0}),camTo(at,dur,{railU:1},ease),
    cutTo(at+dur,{rail:-1,fx:f[0],fy:f[1],fz:f[2],dist:d,pitch:-Math.asin(dy/d)*180/Math.PI,yaw:Math.atan2(dx,dz)*180/Math.PI})];}
/* handheld: noise ber-seed dari tl.time() → goyangan sama di putar, scrub, dan ekspor. Tidak me-render. */
function applyCam(){let dx=0,dy=0,dz=0,roll=CAM.roll;
  if(CAM.shake){const t=tl.time(),a=CAM.shake,s=CAM.seed;
    dx=(noise(t*1.7,s)-.5)*.1*a;dy=(noise(t*1.3,s+1)-.5)*.1*a;dz=(noise(t*1.1,s+3)-.5)*.1*a;roll+=(noise(t*.9,s+2)-.5)*.6*a;}
  arahkan(camera,CAM,dx,dy,dz,roll);applyLux();   // lampu dihitung ulang tiap render/seek dari LUX+CAM
  bokeh.enabled=CAM.aperture>0;Object.assign(bokeh.uniforms,{focus:{value:CAM.focus},aperture:{value:CAM.aperture*.0007},maxblur:{value:.01}});}
const objek3=o=>{if(typeof o==='string'){const n=o;o=scene.getObjectByName(n);if(!o)throw new Error('shot: subjek 3D '+n+' tidak ada');}return o;};
const kotak3=o=>{const b=new THREE.Box3().setFromObject(o);if(b.isEmpty())throw new Error('shot: subjek 3D kosong — '+(o.name||o.type));return b;};
/* shot() di inti memanggil ini: fokus = pusat Box3, jarak dari tinggi/lebar kotak pada lensa RENCANA */
CAM.frame3d=(fill,o)=>{const b=kotak3(objek3(o)),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3());
  return{fx:c.x,fy:c.y,fz:c.z,dist:jarakBingkai(s.y,s.x,fill,PLAN.mm)};};
/* ZONA AMAN HUD 3D: proyeksikan 8 sudut kotak subjek dari pose AKHIR shot ke piksel panggung, bandingkan
   dengan kotak elemen HUD di #stage. Sudut di belakang kamera = subjek menelan frame. */
CAM.cek3=(at,dur,o,v)=>{const hs=HUD.filter(h=>!(at+dur<h.at||at>h.to));if(!hs.length)return;
  const b=kotak3(objek3(o)),c=new THREE.PerspectiveCamera(35,W/H,.01,1e4);arahkan(c,{...PLAN,...v});c.updateMatrixWorld();
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(let i=0;i<8;i++){const p=new THREE.Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z);
    if(p.clone().applyMatrix4(c.matrixWorldInverse).z>-c.near){x0=y0=-Infinity;x1=y1=Infinity;break;}
    p.project(c);const px=(p.x+1)/2*W,py=(1-p.y)/2*H;x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);}
  for(const h of hs){const r=rectIn(h.el,$('#stage'));
    if(x0<r.x+r.w&&x1>r.x&&y0<r.y+r.h&&y1>r.y)
      throw new Error('zona aman: subjek shot pada detik '+at+' masuk kantong teks '+h.sel+' — geser fokus, ganti ukuran shot, atau pindahkan teks');}};

/* ---------- CAHAYA, LAMPU PRAKTIS, FOKUS ---------- */
/* rig key/fill/rim: satu set lampu, nilainya di-tween di LUX (fungsi murni tl.time() lewat onUpdate). */
const LUX={kAz:45,kEl:50,kI:0,kR:1,kG:1,kB:1,fI:0,fsR:1,fsG:1,fsB:1,fgR:1,fgG:1,fgB:1,rI:0};
const key=new THREE.DirectionalLight(0xffffff,0),fill=new THREE.HemisphereLight(0xffffff,0xffffff,0),rim=new THREE.DirectionalLight(0xffffff,0);
key.name='key';key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:80});
scene.add(key,key.target,fill,rim,rim.target);
function applyLux(){const a=LUX.kAz*Math.PI/180,e=LUX.kEl*Math.PI/180,R=30,c=new THREE.Vector3(CAM.fx,0,CAM.fz);
  key.position.set(c.x+R*Math.cos(e)*Math.sin(a),R*Math.sin(e),c.z+R*Math.cos(e)*Math.cos(a));key.target.position.copy(c);
  key.color.setRGB(LUX.kR,LUX.kG,LUX.kB);key.intensity=LUX.kI;
  fill.color.setRGB(LUX.fsR,LUX.fsG,LUX.fsB);fill.groundColor.setRGB(LUX.fgR,LUX.fgG,LUX.fgB);fill.intensity=LUX.fI;
  rim.position.set(c.x-R*.5,R*.6,c.z-R*.8);rim.target.position.copy(c);rim.intensity=LUX.rI;}
/* [key az, el, warna, I | fill sky, ground, I | rim I] — heuristik riset §Pencahayaan */
const CAHAYA3={
  day:   [45,50,'#FFF6E8',2.5,'#DDEBFF','#C9B79C',1.0,.6],
  golden:[60,6,'#FFB46B',2.8,'#FFD9A8','#6B4A3A',.5,1.2],
  blue:  [0,30,'#6FA8FF',0,'#6FA8FF','#1B2244',.8,.4],
  night: [200,40,'#9DB7FF',.3,'#2A3560','#0C1020',.25,.5],
  lowkey:[35,35,'#FFFFFF',3.0,'#FFFFFF','#000000',.12,.8],
  studio:[45,35,'#FFFFFF',2.5,'#FFFFFF','#B0B0B0',.7,1.5]};
function nilaiLux(n){const [kAz,kEl,k,kI,s,g,fI,rI]=CAHAYA3[n],K=new THREE.Color(k),S=new THREE.Color(s),G=new THREE.Color(g);
  return{kAz,kEl,kI,kR:K.r,kG:K.g,kB:K.b,fI,fsR:S.r,fsG:S.g,fsB:S.b,fgR:G.r,fgG:G.g,fgB:G.b,rI};}
let lampAt=-Infinity;
function light(at,dur,preset,o={}){if(!CAHAYA3[preset])throw new Error('preset cahaya tidak dikenal: '+preset+' ('+Object.keys(CAHAYA3).join(' ')+')');
  if(at<lampAt)throw new Error('light(): panggil urut waktu (detik '+at+' setelah '+lampAt+')');lampAt=at;
  return tl.to(LUX,{...nilaiLux(preset),...o,duration:dur,ease:'sine.inOut'},at);}
/* lampu praktis: PointLight di posisi dunia mesh + bahan berpendar (tidak kena tone mapping) */
function practical(mesh,color,intensity=2,distance=8){const c=warna(color),L=new THREE.PointLight(c,intensity,distance);
  mesh.getWorldPosition(L.position);scene.add(L);
  Object.assign(mesh.material,{emissive:c,emissiveIntensity:1,toneMapped:false});mesh.material.emissive.copy(c);return L;}
/* DOF: BokehPass dibuat sekali, sebelum OutputPass; hidup hanya bila CAM.aperture>0.
   ponytail: CAM.focus dihitung saat setup dari pose(PLAN) — tidak mengikuti kamera yang bergerak sesudahnya. */
const bokeh=new BokehPass(scene,camera,{focus:0,aperture:0,maxblur:.01});bokeh.enabled=false;
composer.insertPass(bokeh,composer.passes.length-1);
const jarakFokus=o=>{const p=pose(PLAN),c=kotak3(objek3(o)).getCenter(new THREE.Vector3());return Math.hypot(c.x-p.x,c.y-p.y,c.z-p.z);};
const focus=(at,dur,obj,aperture=6,ease='sine.inOut')=>camTo(at,dur,{focus:jarakFokus(obj),aperture},ease);
const rackFocus=(at,dur,a,b)=>{cutTo(at,{focus:jarakFokus(a),aperture:6});focus(at,dur,b);};

/* ---------- MATERIAL & ASET ---------- */
/* warna brand tepat lewat composer WAJIB renderer.toneMapping=NoToneMapping: OutputPass menerapkan tone mapping ke
   seluruh frame dan mengabaikan toneMapped:false. Flag itu tetap dipasang untuk render langsung (renderer.render). */
const TOON=new THREE.DataTexture(new Uint8Array([90,170,255]),3,1,THREE.RedFormat);   // 3 tingkat bayangan kartun
TOON.minFilter=TOON.magFilter=THREE.NearestFilter;TOON.needsUpdate=true;
const MAT={
  flat:     c=>new THREE.MeshBasicMaterial({color:c,toneMapped:false}),
  toon:     c=>new THREE.MeshToonMaterial({color:c,gradientMap:TOON,toneMapped:false}),
  clay:     c=>new THREE.MeshStandardMaterial({color:c,roughness:.9,metalness:0,toneMapped:false}),
  glossy:   c=>new THREE.MeshPhysicalMaterial({color:c,roughness:.25,clearcoat:1,toneMapped:false}),
  realistis:c=>new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.1,toneMapped:false})};
function mat(family,color){if(!MAT[family])throw new Error('mat: family tidak dikenal: '+family+' ('+Object.keys(MAT).join(' ')+')');return MAT[family](warna(color));}
/* logo/ikon SVG (string, bukan berkas — file:// memblokir loader) → grup 3D. depth/bevel dalam unit DUNIA
   (dibagi scale karena geometri dibangun dalam unit SVG). Geometri dipusatkan, jadi grup.position bebas dipakai. */
function fromSVG(svg,{depth=.2,bevel=.02,family='toon',scale=.01}={}){const g=new THREE.Group();
  for(const p of new SVGLoader().parse(svg).paths){if(p.userData&&p.userData.style&&p.userData.style.fill==='none')continue;   // garis saja: tak punya isi untuk diekstrusi
    const m=mat(family,p.color);
    for(const s of SVGLoader.createShapes(p))
      g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:depth/scale,bevelEnabled:bevel>0,bevelSize:bevel/scale,bevelThickness:bevel/scale}),m));}
  const c=kotak3(g).getCenter(new THREE.Vector3());for(const m of g.children)m.geometry.translate(-c.x,-c.y,-c.z);
  g.scale.set(scale,-scale,scale);return g;}   // SVG y ke bawah → balik

/* ---------- kait untuk scripts/test-starters.mjs — tidak dipanggil deliverable ---------- */
window.CAM3_UJI=()=>{const r={},c0={...CAM},V=()=>new THREE.Vector3();tl.pause(0);
  Object.assign(CAM,{yaw:30,pitch:-15,roll:0,shake:0,zoom:1,mm:PLAN.mm},CAM.frame3d(SHOT.MS,'subjek'));applyCam();composer.render(0);
  const p=pose(CAM);r.poseCocok=camera.position.distanceTo(new THREE.Vector3(p.x,p.y,p.z))<1e-6;
  const n=kotak3(objek3('subjek')).getCenter(V()).project(camera);r.ndc=[n.x,n.y];
  const bid=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6));scene.add(bid);   // datar: tanpa distorsi perspektif kedalaman
  Object.assign(CAM,{yaw:0,pitch:0},CAM.frame3d(SHOT.WS,bid));applyCam();camera.updateMatrixWorld();
  const y=v=>new THREE.Vector3(0,v,0).project(camera).y;r.isiTinggi=(y(.8)-y(-.8))/2;scene.remove(bid);bid.geometry.dispose();
  hud.reserve('#hud .lbl',0,99);
  try{shot(0,.1,'CU','subjek');r.hudTabrakDitolak=false;}catch(e){r.hudTabrakDitolak=/zona aman/.test(e.message);}HUD.pop();
  /* piksel dibaca di task yang SAMA dengan render: tanpa preserveDrawingBuffer buffer kosong setelah komposit */
  const m=new THREE.Mesh(new THREE.PlaneGeometry(10,10),mat('flat','#EE1C25'));
  m.position.copy(camera.position);m.quaternion.copy(camera.quaternion);m.translateZ(-1);scene.add(m);composer.render(0);
  const gl=renderer.getContext(),px=new Uint8Array(4);gl.readPixels(W/2,H/2,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
  r.pikselBrand=[px[0],px[1],px[2]].join(',');scene.remove(m);m.geometry.dispose();m.material.dispose();
  try{shot(0,0,'MS',new THREE.Group());r.kosongDitolak=false;}catch(e){r.kosongDitolak=/kosong/.test(e.message);}
  try{mat('neon','#fff');r.familyDitolak=false;}catch(e){r.familyDitolak=/neon/.test(e.message);}
  const L0={...LUX},la0=lampAt,t0=lampAt+1,tw=light(t0,.1,'golden');tl.time(t0+.2);r.keyGolden=LUX.kI;r.elGolden=LUX.kEl;
  try{light(t0-1,.1,'day');r.lightUrutDitolak=false;}catch(e){r.lightUrutDitolak=/urut/.test(e.message);}
  tw.kill();tl.remove(tw);tl.time(0);Object.assign(LUX,L0);lampAt=la0;applyLux();
  CAM.aperture=0;applyCam();r.bokehSaatNol=bokeh.enabled;CAM.aperture=6;applyCam();r.bokehSaatEnam=bokeh.enabled;
  const jp=pose(PLAN),jc=kotak3(objek3('subjek')).getCenter(V());r.jarakHarapan=Math.hypot(jc.x-jp.x,jc.y-jp.y,jc.z-jp.z);r.jarakFokus=jarakFokus('subjek');
  Object.assign(LUX,nilaiLux('day'));applyLux();const kx=key.target.position.x;CAM.fx+=10;applyCam();r.keyIkutKamera=Math.abs(key.target.position.x-kx-10)<1e-6;Object.assign(LUX,L0);
  const P1={...PLAN},pa1=planAt,nR=RAILS.length,tA=Math.max(planAt,0)+1,pts=[[0,2,12],[6,3,8],[10,4,0]];
  try{rail(tA,2,pts.slice(0,2));r.railDuaDitolak=false;}catch(e){r.railDuaDitolak=/≥ 3/.test(e.message);}
  const tws=rail(tA,2,pts,{look:[0,1,0],ease:'none'}),cv=RAILS[nR].curve;
  tl.time(tA+1);applyCam();r.railTengah=camera.position.distanceTo(cv.getPointAt(.5));
  tl.time(tA+2+1e-3);applyCam();r.railSambung=camera.position.distanceTo(V().set(10,4,0));
  const nR2=RAILS.length;try{rail(planAt-1,2,pts);r.railUrutDitolak=false;}catch(e){r.railUrutDitolak=/urut waktu/.test(e.message)&&RAILS.length===nR2;}
  tl.time(0);for(const w of tws){w.kill();tl.remove(w);}RAILS.length=nR;Object.assign(PLAN,P1);planAt=pa1;
  Object.assign(CAM,c0);applyCam();composer.render(0);return r;};
