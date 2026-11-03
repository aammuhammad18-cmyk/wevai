/* DIORAMA CEL-SHADED — miniatur museum: toon bertingkat + garis lambung terbalik + tilt-shift + alas + kartu 2D (references/diorama.md).
   Satu global `diorama`, plus TILT dan GARIS yang di-tween dari timeline: tl.to(TILT,{pusat:.6},t). Semua keadaan = fungsi murni kamera + timeline:
   geometri statis dirakit sekali, bayangan dipanggang sekali, kartu dirasterisasi sekali. Butuh: THREE, mergeGeometries, ShaderPass, scene, camera,
   renderer, composer, W, H, hash (kamera.js), key + LUX (kamera-three.js). Satuan meter, y ke atas. Bagian murni diuji scripts/test-diorama.mjs. */
const TILT={pusat:.5,lebar:.18,lunak:.3,kuat:14};   // y layar: 0 atas, 1 bawah; pusat ± lebar = tajam; lunak = rentang naik ke kuat (px jari-jari di 1080p); kuat 0 = pass mati
const GARIS={tebal:2.2,acuan:45,warna:'#1a120c'};   // tebal px di jarak ≤ acuan m; lebih jauh menipis sampai 55 %
const diorama=(()=>{
  const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  /* ---------- murni ---------- */
  const jariTilt=(y,{pusat,lebar,lunak,kuat}=TILT)=>kuat*ss(lebar,lebar+lunak,Math.abs(y-pusat));   // sama dengan shader TILT_FS
  /* arah lambung: normal yang dirata-rata per posisi, supaya sudut lambung menyambung (normal rata per muka = lambung robek di sudut) */
  function arahLambung(p,n){const peta=new Map(),a=new Float32Array(p.length),k=i=>Math.round(p[i]*1e3)+'/'+Math.round(p[i+1]*1e3)+'/'+Math.round(p[i+2]*1e3);
    for(let i=0;i<p.length;i+=3){const s=peta.get(k(i))||[0,0,0];s[0]+=n[i];s[1]+=n[i+1];s[2]+=n[i+2];peta.set(k(i),s);}
    for(let i=0;i<p.length;i+=3){const s=peta.get(k(i)),l=Math.hypot(...s)||1;a[i]=s[0]/l;a[i+1]=s[1]/l;a[i+2]=s[2]/l;}return a;}
  /* tata kartu ber-seed: n titik di area [x0,z0,x1,z1], jarak antarkartu ≥ jarak, hindari(x,z) menolak. Stateless: seed + n → hasil sama */
  function tataKartu({seed=1,n,area:[x0,z0,x1,z1],jarak=1,hindari=()=>false,lapis=[]}){const o=[];
    if(!(n>=0)||!(jarak>0))throw new Error('diorama.tataKartu: n ≥ 0 dan jarak > 0');
    for(let i=0;i<n*60&&o.length<n;i++){const x=x0+(x1-x0)*hash(2*i+1,seed),z=z0+(z1-z0)*hash(2*i+2,seed);
      if(hindari(x,z)||[...o,...lapis].some(q=>Math.hypot(q.x-x,q.z-z)<jarak))continue;o.push({x,z,u:hash(2*i+3,seed+7)});}
    return o;}
  /* tingkat toon: terang muka (N·L) → satu dari tangga ini. MeshToonMaterial r161 hanya membaca kanal merah */
  const TANGGA=[.34,.56,.8,1];
  const gradasi=()=>{const t=new THREE.DataTexture(new Uint8Array(TANGGA.map(v=>Math.round(v*255))),TANGGA.length,1,THREE.RedFormat);
    t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;};

  /* ---------- rakit: kepingan kotak/prisma → satu mesh toon + satu mesh lambung (2 draw call, berapa pun kepingannya) ---------- */
  const warnaC=c=>new THREE.Color(c),LAMBUNG=[];
  function rakit({seed=1,alas=.8,beda=.05}={}){const isi=[],lambung=[];let n=0;
    /* warna verteks: warna ± beda (acak per keping) dan dasar lebih gelap (cuci kotor maket: mengikat benda ke tanah) */
    const tambah=(g0,warna,{garis=true,kotor=alas}={})=>{const g=g0.toNonIndexed();g.deleteAttribute('uv');g.computeVertexNormals();n++;
      const p=g.attributes.position,col=new Float32Array(p.count*3),c=warnaC(warna),v=1+beda*(2*hash(n,seed)-1);let y0=Infinity,y1=-Infinity;
      for(let i=0;i<p.count;i++){const y=p.getY(i);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      for(let i=0;i<p.count;i++){const k=v*(kotor+(1-kotor)*(p.getY(i)-y0)/((y1-y0)||1));col.set([c.r*k,c.g*k,c.b*k],i*3);}
      g.setAttribute('color',new THREE.BufferAttribute(col,3));isi.push(g);
      if(garis){const h=new THREE.BufferGeometry();h.setAttribute('position',p);h.setAttribute('arah',new THREE.BufferAttribute(arahLambung(p.array,g.attributes.normal.array),3));lambung.push(h);}
      g0.dispose();};
    /* (x,z) = tengah, y = dasar. prisma: alas wb×db, atas wa×da setinggi h (wa,da → 0 = limas) */
    const R={kotak(x,y,z,w,h,d,warna,o){tambah(new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z),warna,o);},
      prisma(x,y,z,wb,db,wa,da,h,warna,o){const g=new THREE.BoxGeometry(wb,h,db),p=g.attributes.position;
        for(let i=0;i<p.count;i++)if(p.getY(i)>0)p.setXYZ(i,p.getX(i)*wa/wb,h/2,p.getZ(i)*da/db);
        tambah(g.translate(x,y+h/2,z),warna,o);},
      selesai(nama='diorama'){const G=new THREE.Group();G.name=nama;
        const m=new THREE.Mesh(mergeGeometries(isi),new THREE.MeshToonMaterial({vertexColors:true,gradientMap:gradasi()}));m.castShadow=m.receiveShadow=true;
        const l=new THREE.Mesh(mergeGeometries(lambung),new THREE.ShaderMaterial({side:THREE.BackSide,
          uniforms:{tebal:{value:GARIS.tebal},acuan:{value:GARIS.acuan},warna:{value:warnaC(GARIS.warna)},piksel:{value:new THREE.Vector2(1/W,1/H)}},vertexShader:LAMBUNG_VS,fragmentShader:LAMBUNG_FS}));
        LAMBUNG.push(l.material.uniforms);l.name='lambung';G.add(m,l);G.userData.toon=m;G.userData.lambung=l;for(const g of [...isi,...lambung])g.dispose();return G;}};
    return R;}
  /* lambung di ruang klip: geser sepanjang normal layar tebal px (tetap setebal pena di lensa apa pun), lalu mundur sedikit agar tidak menusuk muka depan */
  const LAMBUNG_VS=`attribute vec3 arah;uniform float tebal,acuan;uniform vec2 piksel;
void main(){vec4 v=modelViewMatrix*vec4(position,1.),c=projectionMatrix*v;vec2 n=(normalMatrix*arah).xy;float l=length(n);
if(l>1e-4)c.xy+=n/l*tebal*clamp(acuan/-v.z,.55,1.)*piksel*2.*c.w;c.z+=.00012*c.w;gl_Position=c;}`,
    LAMBUNG_FS=`uniform vec3 warna;void main(){gl_FragColor=vec4(warna,1.);}`;

  /* ---------- tilt-shift: dua pass Gauss terpisah; jari-jari per baris dari TILT (jariTilt). Linear HDR, sebelum OutputPass ---------- */
  const TILT_FS=`uniform sampler2D tDiffuse;uniform vec2 arah;uniform float pusat,lebar,lunak,kuat;varying vec2 vUv;
void main(){float t=clamp((abs(1.-vUv.y-pusat)-lebar)/max(lunak,1e-4),0.,1.),r=kuat*t*t*(3.-2.*t);vec4 c=texture2D(tDiffuse,vUv);
if(r<.25){gl_FragColor=c;return;}vec3 s=c.rgb;float b=1.;for(float i=1.;i<=6.;i+=1.){float u=i/6.,w=exp(-2.*u*u);vec2 d=arah*r*u;s+=w*(texture2D(tDiffuse,vUv+d).rgb+texture2D(tDiffuse,vUv-d).rgb);b+=2.*w;}
gl_FragColor=vec4(s/b,1.);}`;
  const VS_PENUH='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const passTilt=[[1/W,0],[0,1/H]].map(a=>new ShaderPass(new THREE.ShaderMaterial({uniforms:{tDiffuse:{value:null},arah:{value:new THREE.Vector2(...a)},pusat:{value:0},lebar:{value:0},lunak:{value:0},kuat:{value:0}},vertexShader:VS_PENUH,fragmentShader:TILT_FS})));
  for(const p of passTilt)composer.insertPass(p,composer.passes.length-1);

  /* ---------- alas: lempeng kayu + potongan tanah berstrata (potong:true) dengan bibir rumput tak rata. Muka atas y = y ---------- */
  function alas(R,{x0,x1,z0,z1,y=0,tebal=3,kayu=2.6,seed=3,warna=['#54402f','#775c43','#957957'],bibir='#5d6a39',kaki='#38261a',potong=true}){
    const w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2,h=tebal/warna.length;
    warna.forEach((c,i)=>R.kotak(cx,y-tebal+i*h,cz,w,h,d,c,{kotor:.92,garis:i===0}));
    R.kotak(cx,y-tebal-.5,cz,w+2.2,.5,d+2.2,kaki);R.prisma(cx,y-tebal-.5-kayu,cz,w+5,d+5,w+2.2,d+2.2,kayu,kaki,{kotor:.7});
    if(potong){const m=.9,sisi=[[x0,z0,x1,z0],[x0,z1,x1,z1],[x0,z0,x0,z1],[x1,z0,x1,z1]];let k=0;
      for(const[a,b,c,e]of sisi){const n=Math.ceil(Math.hypot(c-a,e-b)/m);for(let i=0;i<n;i++){k++;const u=(i+.5)/n,hh=.18+.5*hash(k,seed),t=.07,x=a+(c-a)*u,z=b+(e-b)*u;
        R.kotak(x+(a===c?(a===x0?-1:1)*t/2:0),y-hh,z+(b===e?(b===z0?-1:1)*t/2:0),a===c?t:m,hh,b===e?t:m,bibir,{garis:false,kotor:.75});}}}}
  /* meja & ruang: lantai gelap dengan kolam cahaya (kanvas, tanpa aset) */
  function meja({y=-6.1,r=420,warna='#3a3026',gelap='#0c0907',jari=.3}={}){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d'),a=g.createRadialGradient(256,256,0,256,256,256);
    a.addColorStop(0,warna);a.addColorStop(jari,warna);a.addColorStop(1,gelap);g.fillStyle=a;g.fillRect(0,0,512,512);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(2*r,2*r).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:t}));m.position.y=y;m.name='meja';scene.add(m);return m;}

  /* ---------- kartu 2D di ruang 3D: SVG dirasterisasi SEKALI (Image → kanvas → tekstur), tepi tinta dipanggang ---------- */
  const tunggu=[],simpan=new Map(),KARTU=[],LABEL=[];
  function tekstur(svg,lw,lh,tepi,warnaTepi){const k=[svg,lw,lh,tepi,warnaTepi].join('|');if(simpan.has(k))return simpan.get(k);
    const c=document.createElement('canvas');c.width=lw;c.height=lh;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;simpan.set(k,t);
    const u=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),im=new Image();im.src=u;
    tunggu.push(im.decode().then(()=>{const g=c.getContext('2d');
      if(tepi>0){const b=document.createElement('canvas');b.width=lw;b.height=lh;const q=b.getContext('2d');q.drawImage(im,0,0,lw,lh);q.globalCompositeOperation='source-in';q.fillStyle=warnaTepi;q.fillRect(0,0,lw,lh);
        for(let a=0;a<8;a++)g.drawImage(b,tepi*Math.cos(a*Math.PI/4),tepi*Math.sin(a*Math.PI/4));}
      g.drawImage(im,0,0,lw,lh);t.needsUpdate=true;URL.revokeObjectURL(u);}));
    return t;}
  /* bayangan kontak lunak: satu tekstur radial bersama, di tanah, condong menjauhi matahari */
  let bayangT=null;const teksturBayang=()=>{if(bayangT)return bayangT;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),a=g.createRadialGradient(64,64,0,64,64,64);
    a.addColorStop(0,'rgba(0,0,0,1)');a.addColorStop(.45,'rgba(0,0,0,.62)');a.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=a;g.fillRect(0,0,128,128);return bayangT=new THREE.CanvasTexture(c);};
  /* kartu(svg,{x,y,z,tinggi,lebar,hadap,resolusi,tepi,bayang}): svg = dokumen utuh ber-viewBox, dasar tengah kartu di (x,y,z).
     hadap null = billboard (berputar di sumbu y mengikuti kamera), derajat = tetap (0 menghadap +z). bayang = opasitas bayangan kontak (0 = tanpa). */
  function kartu(svg,{x=0,y=0,z=0,tinggi,lebar=tinggi,hadap=null,resolusi=720,tepi=2,warnaTepi=GARIS.warna,bayang=.5,nama=''}){
    if(!(tinggi>0))throw new Error('diorama.kartu: tinggi > 0');
    if(!/viewBox=/.test(svg))throw new Error('diorama.kartu: svg harus dokumen <svg> ber-viewBox');
    const lh=Math.round(resolusi),lw=Math.round(resolusi*lebar/tinggi),
      m=new THREE.Mesh(new THREE.PlaneGeometry(lebar,tinggi).translate(0,tinggi/2,0),new THREE.MeshBasicMaterial({map:tekstur(svg,lw,lh,tepi,warnaTepi),alphaTest:.5,alphaToCoverage:true,side:THREE.DoubleSide}));
    m.position.set(x,y,z);m.name=nama;if(hadap!=null)m.rotation.y=hadap*Math.PI/180;scene.add(m);KARTU.push({m,hadap});
    if(bayang>0){const b=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:teksturBayang(),color:'#000',transparent:true,opacity:bayang,depthWrite:false}));
      const a=LUX.kAz*Math.PI/180,g=lebar*.72;b.scale.set(g,1,g*.6);b.position.set(x-Math.sin(a)*g*.12,y+.03,z-Math.cos(a)*g*.12);b.rotation.y=a;b.renderOrder=1;scene.add(b);m.userData.bayang=b;}
    return m;}
  /* latar lukis: dinding melengkung di belakang maket (sisi kaja), ciri diorama museum. svg ber-viewBox, sudut derajat di sekitar arah −z */
  function latar(svg,{r=70,sudut=170,tinggi=40,y=-6.1,x=0,z=0,resolusi=720}){const a=sudut*Math.PI/180,g=new THREE.CylinderGeometry(r,r,tinggi,64,1,true,Math.PI-a/2,a).translate(x,y+tinggi/2,z);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tekstur(svg,Math.round(resolusi*r*a/tinggi),resolusi,0,''),side:THREE.BackSide}));m.name='latar';scene.add(m);return m;}
  /* label DOM menempel titik dunia: transform per frame dari proyeksi kamera (teks tetap tajam di atas tilt-shift) */
  const label=(el,xyz)=>{LABEL.push({el,p:new THREE.Vector3(...xyz)});return el;};
  const v3=new THREE.Vector3();

  /* ---------- per frame, sesudah applyCam(), sebelum render ---------- */
  let arahBayang='',pusatBayang=[0,0,0],rBayang=60;
  function matahari({pusat=[0,0,0],r=60}={}){pusatBayang=pusat;rBayang=r;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;arahBayang='';
    key.shadow.mapSize.set(4096,4096);Object.assign(key.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:1,far:4*r});key.shadow.camera.updateProjectionMatrix();}
  function perFrame(){camera.updateMatrixWorld();
    /* key arah tetap dari LUX, di sekitar pusat maket: applyLux menaruhnya di fokus kamera, peta bayang lalu bergeser tiap frame */
    const a=LUX.kAz*Math.PI/180,e=LUX.kEl*Math.PI/180,R=2*rBayang,[px,py,pz]=pusatBayang;
    key.target.position.set(px,py,pz);key.position.set(px+R*Math.cos(e)*Math.sin(a),py+R*Math.sin(e),pz+R*Math.cos(e)*Math.cos(a));
    const ab=LUX.kAz+'/'+LUX.kEl;if(ab!==arahBayang){arahBayang=ab;renderer.shadowMap.needsUpdate=true;}
    for(const{m,hadap}of KARTU)if(hadap==null)m.rotation.y=Math.atan2(camera.position.x-m.position.x,camera.position.z-m.position.z);
    for(const{el,p}of LABEL){v3.copy(p).project(camera);el.style.transform=`translate(${((v3.x+1)/2*W).toFixed(1)}px,${((1-v3.y)/2*H).toFixed(1)}px)`;}
    for(const u of LAMBUNG)u.tebal.value=GARIS.tebal;
    for(const p of passTilt){const u=p.uniforms;u.pusat.value=TILT.pusat;u.lebar.value=TILT.lebar;u.lunak.value=TILT.lunak;u.kuat.value=TILT.kuat;p.enabled=TILT.kuat>0;}}
  return{jariTilt,arahLambung,tataKartu,TANGGA,rakit,alas,meja,kartu,latar,label,matahari,perFrame,passTilt,siap:()=>Promise.all(tunggu)};})();
