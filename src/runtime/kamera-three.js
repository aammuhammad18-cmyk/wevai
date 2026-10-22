/* BACKEND 3D — membaca CAM, menulis ke `camera` Three.js (r161). Starter menyediakan THREE, scene, camera,
   renderer, composer SEBELUM blok ini; render() starter memanggil applyCam() lalu composer.render(0).
   Di sini fx/fy/fz = koordinat dunia Three (Y ke atas), dist dalam unit dunia, yaw/pitch/roll derajat. */
CAM.mode='three';
camDefaults({fx:0,fy:0,fz:0,dist:10,yaw:0,pitch:0,mm:35,zoom:1});
/* warna dari token CSS ('--accent'), hex, atau THREE.Color — dunia 3D ikut style brief, tanpa hardcode */
const warna=c=>new THREE.Color(typeof c==='string'&&c.startsWith('--')?getComputedStyle(document.documentElement).getPropertyValue(c).trim():c);

/* ---------- KAMERA ---------- */
/* satu jalur untuk kamera render DAN kamera bayangan cek3: pose, lookAt, roll, lensa */
function arahkan(cam,c,dx=0,dy=0,dz=0,roll=c.roll){const p=pose(c);
  cam.position.set(p.x+dx,p.y+dy,p.z+dz);cam.lookAt(c.fx,c.fy,c.fz);cam.rotateZ(roll*Math.PI/180);
  cam.zoom=c.zoom;cam.filmGauge=36;cam.setFocalLength(c.mm);}   // setFocalLength = updateProjectionMatrix (zoom sudah terpasang)
/* handheld: noise ber-seed dari tl.time() → goyangan sama di putar, scrub, dan ekspor. Tidak me-render. */
function applyCam(){let dx=0,dy=0,dz=0,roll=CAM.roll;
  if(CAM.shake){const t=tl.time(),a=CAM.shake,s=CAM.seed;
    dx=(noise(t*1.7,s)-.5)*.1*a;dy=(noise(t*1.3,s+1)-.5)*.1*a;dz=(noise(t*1.1,s+3)-.5)*.1*a;roll+=(noise(t*.9,s+2)-.5)*.6*a;}
  arahkan(camera,CAM,dx,dy,dz,roll);}
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
  Object.assign(CAM,c0);applyCam();composer.render(0);return r;};
