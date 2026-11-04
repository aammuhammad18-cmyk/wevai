/* LANSKAP 3D — dunia prosedural ber-seed untuk shot mata elang (resep: mata-elang.md): tanah fBm dari bentuk() starter,
   sawah berundak dengan air cermin, sungai berlembah, hutan dan kelapa InstancedMesh, langit Sky (Preetham) + env PMREM,
   kabut eksponensial + kabut lembah. Deterministik: seed sama → geometri sama. Statis: dibangun sekali saat setup; per frame
   hanya bayangan matahari yang ikut kamera (ikutMatahari). Butuh: THREE, scene, renderer, Sky, ImprovedNoise, mergeGeometries,
   blok kamera-three (key, LUX, kotak3, objek3) dan terbang (jalurElang). Satuan meter, y ke atas, terbang ke −z. */
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
function lanskap({seed=1,bentuk=()=>0,detail=2.5,sawah=null,ladang=null,sungai=null,luas=6000,
  matahari={az:150,el:4},langit={turbidity:8,rayleigh:2,mie:.005,mieG:.8},kabut={warna:'#b08a80',padat:.00045},lembah=null}={}){
  const N=new ImprovedNoise(),s0=seed*7.31,C=h=>new THREE.Color(h),
    fbm=(x,z,o=5)=>{let s=0,a=1,f=1;for(let k=0;k<o;k++){s+=a*N.noise(x*f,z*f,s0+k*1.7);a*=.5;f*=2.03;}return s;},
    dasar=(x,z)=>{const b=bentuk(x,z);return b+detail*(1+Math.min(300,Math.max(0,b))/60)*fbm(x/140,z/140);},   // pegunungan lebih kasar (dibatasi: puncak tanpa duri)
    /* sungai: Catmull-Rom (jalurElang) jadi garis 400 ruas; muka air turun lurus dari [awal, akhir] */
    S=sungai&&(()=>{const J=jalurElang(sungai.titik.map(([x,z])=>[x,0,z])),p=Array.from({length:401},(_,i)=>J.pos(i/400));
      return{p,lebar:sungai.lebar||14,dalam:sungai.dalam||3,muka:sungai.muka,x0:Math.min(...p.map(q=>q[0])),x1:Math.max(...p.map(q=>q[0])),
        z0:Math.min(...p.map(q=>q[2])),z1:Math.max(...p.map(q=>q[2]))};})(),
    keSungai=(x,z)=>{const m=S.lebar*4;if(x<S.x0-m||x>S.x1+m||z<S.z0-m||z>S.z1+m)return[1e9,0];let d=1e9,u=0;
      for(let i=0;i<400;i++){const a=S.p[i],b=S.p[i+1],ex=b[0]-a[0],ez=b[2]-a[2],t=Math.min(1,Math.max(0,((x-a[0])*ex+(z-a[2])*ez)/(ex*ex+ez*ez||1))),
        e=Math.hypot(x-a[0]-ex*t,z-a[2]-ez*t);if(e<d){d=e;u=(i+t)/400;}}return[d,u];},
    mukaAir=u=>S.muka[0]+(S.muka[1]-S.muka[0])*u,
    /* petak lembah: baris 12 m selebar 22 m per petak, diputar 25°, tepi berliuk, baris saling geser; rumus sama di shader, status dari tabel 64² yang sama: bentuk per piksel, bukan per verteks */
    tbl=(()=>{const a=new Uint8Array(64*64*4);for(let i=0;i<4096;i++)a.set([hash(i,seed+1)*255,hash(i,seed+2)*255,0,255],i*4);const t=new THREE.DataTexture(a,64,64);t.needsUpdate=true;t.a=a;return t;})(),
    petakDi=(x,z)=>{const m=v=>(Math.floor(v)%64+64)%64,y=Math.floor((.906*z-.423*x+14*Math.sin(x/71)+7*Math.sin(z/43))/12);return tbl.a[(m(y)*64+m((.906*x+.423*z+14*Math.sin(z/83)+7*Math.sin(x/37))/22+3.17*Math.sin(y*12.9)))*4]/255;},
    /* ubin noise 256² berulang (mipmap: menjauh → rata-rata, tanpa kilau). R fBm kasar, G butir, B fBm kisi 32 */
    ubin=(()=>{const n=256,a=new Uint8Array(n*n*4),v=(p,s,x,y)=>{const u=x/n*p,w=y/n*p,i=Math.floor(u),j=Math.floor(w),f=u-i,g=w-j,F=f*f*(3-2*f),G=g*g*(3-2*g),h=(a,b)=>hash((b%p)*p+a%p,s);
        return(h(i,j)*(1-F)+h(i+1,j)*F)*(1-G)+(h(i,j+1)*(1-F)+h(i+1,j+1)*F)*G;},
      fb=(P,s,x,y)=>P.reduce((o,p,k)=>o+v(p,s+k,x,y)/2**(k+1),0)/(1-.5**P.length);
      for(let y=0;y<n;y++)for(let x=0;x<n;x++)a.set([fb([8,16,32,64],seed+3,x,y)*255,fb([64,128],seed+9,x,y)*255,fb([32,64],seed+13,x,y)*255,255],(y*n+x)*4);
      const t=new THREE.DataTexture(a,n,n);Object.assign(t,{wrapS:THREE.RepeatWrapping,wrapT:THREE.RepeatWrapping,magFilter:THREE.LinearFilter,minFilter:THREE.LinearMipmapLinearFilter,generateMipmaps:true,anisotropy:4,needsUpdate:true});return t;})(),
    W_={air:C('#1b2019'),padi:C('#4d6a28'),jerami:C('#8b7547'),pematang:C('#43582a'),jalan:C('#7c6b4f'),hutan:C('#26311d'),
      rumput:C('#4b5730'),tebing:C('#5d4a36'),batu:C('#4b4541')},
    /* titik tanah: tinggi akhir, warna, basah (0..1, air cermin) */
    titik=(x,z)=>{let h=dasar(x,z),b=0,c=null,f=0,un=0;
      if(sawah){const q=sawah,m=Math.min(ss(q.x0,q.x0+14,x),ss(q.x1,q.x1-14,x),ss(q.z0,q.z0+14,z),ss(q.z1,q.z1-14,z))*(q.jalan?ss(1.3,2.6,Math.abs(x-q.jalan(z))):1);
        if(m>0){const U=q.undak||1.15,e=.6,g=Math.hypot(dasar(x+e,z)-dasar(x-e,z),dasar(x,z+e)-dasar(x,z-e))/(2*e),
          lv=h/U,k=Math.floor(lv),f=lv-k,w=Math.min(.45,Math.max(.06,.9*g/U)),   // tebing undak ±0,9 m mendatar
          fx=(x+9*N.noise(x/40,z/40,s0+50))/26,ix=Math.floor(fx),st=hash(k*7919+ix*104729,seed),
          batas=1-ss(.012,.03,Math.min(fx-ix,1-fx+ix)),pinggir=Math.max(ss(1-w-.06,1-w,f),1-ss(0,.03,f),batas),
          air=st<.55?1:st<.85?.35:0;
          un=1e3+lv;h=h+(U*(k+ss(1-w,1,f))-h)*m;b=m*air*(1-pinggir);
          c=(st<.55?W_.air:st<.85?W_.padi:W_.jerami).clone().lerp(W_.pematang,pinggir).lerp(W_.rumput,1-m);}
        if(q.jalan&&Math.abs(x-q.jalan(z))<2.6&&z>(q.jalanDari??q.z0)&&z<q.z1)c=W_.jalan.clone().lerp(c||W_.rumput,ss(1.2,2.6,Math.abs(x-q.jalan(z))));}
      if(S){const[d,u]=keSungai(x,z);if(d<S.lebar*3){const a=mukaAir(u),dasarS=a-S.dalam*(1-Math.min(1,(d/S.lebar)**2));
        h=Math.min(h,dasarS+(h-dasarS)*ss(S.lebar*.6,S.lebar*3,d));}}   // lembah sungai: bentuk() membuka celah di rabung
      if(!c){const g=Math.hypot(dasar(x+2,z)-dasar(x-2,z),dasar(x,z+2)-dasar(x,z-2))/4;
        if(ladang&&h<ladang.bawah&&g<ladang.miring){const st=petakDi(x,z),m=ss(ladang.miring,ladang.miring*.5,g)*ss(ladang.bawah,ladang.bawah-4,h);   // sawah lembah: rupanya di shader
          f=m;b=m*(st<.3?.7:st<.8?.2:0);c=W_.padi.clone().lerp(W_.rumput,1-m);}
        else c=W_.rumput.clone().lerp(W_.hutan,ss(.08,.3,g)+.3*fbm(x/90,z/90,2)).lerp(W_.tebing,ss(.45,.9,g)).lerp(W_.batu,ss(160,420,h));}
      const v=1+.1*N.noise(x/7,z/7,s0+9);return{h,b,f,un,c:[c.r*v,c.g*v,c.b*v]};},
    grid=(xs,zs,lubang,kulit)=>{const nx=xs.length,nz=zs.length,pos=new Float32Array(nx*nz*3),col=pos.slice(),bas=new Float32Array(nx*nz),pet=bas.slice(),und=bas.slice(),idx=[];
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const t=titik(xs[i],zs[j]),k=j*nx+i,tepi=kulit&&(i===0||j===0||i===nx-1||j===nz-1);
        pos.set([xs[i],t.h-(tepi?2.5:0),zs[j]],k*3);col.set(t.c,k*3);bas[k]=t.f?0:t.b;pet[k]=t.f;und[k]=t.un;}   // kulit: baris tepi turun 2,5 m menutup celah sambungan
      for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){if(lubang&&xs[i]>=lubang[0]&&xs[i+1]<=lubang[1]&&zs[j]>=lubang[2]&&zs[j+1]<=lubang[3])continue;
        const a=j*nx+i,b=a+1,c=a+nx,d=c+1;idx.push(a,c,b,b,c,d);}
      const g=new THREE.BufferGeometry();g.setIndex(idx);g.setAttribute('position',new THREE.BufferAttribute(pos,3));
      g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('basah',new THREE.BufferAttribute(bas,1));g.setAttribute('petak',new THREE.BufferAttribute(pet,1));g.setAttribute('undak',new THREE.BufferAttribute(und,1));g.computeVertexNormals();return g;},
    /* tanah: MeshStandard + air di petak basah (memantulkan langit env; riak memecah pantulan, pantulan dibatasi: langit dekat matahari HDR tak jadi bercak putih; pantulan rendah digelapkan: env hanya berisi langit, padahal di sana ada rabung) */
    matTanah=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,envMapIntensity:1.3}),
    tambah=(g,m,bayang)=>{const o=new THREE.Mesh(g,m);o.receiveShadow=true;o.castShadow=!!bayang;scene.add(o);return o;},
    acak=(a=>()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;})(seed),pohon=[];   // mulberry32
  matTanah.onBeforeCompile=s=>{Object.assign(s.uniforms,{uUbin:{value:ubin},uPetak:{value:tbl}});
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float basah,petak,undak;varying float vBasah,vPetak,vUndak;varying vec3 vP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBasah=basah;vPetak=petak;vUndak=undak;vP=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uUbin,uPetak;varying float vBasah,vPetak,vUndak;varying vec3 vP;')
      .replace('#include <color_fragment>',`#include <color_fragment>
vec2 p=vP.xz;vec4 n0=texture2D(uUbin,p/14.),n1=texture2D(uUbin,p/90.+.31),n2=texture2D(uUbin,p/700.+.57);float pd=smoothstep(.2,.27,vBasah)*(1.-smoothstep(.42,.5,vBasah)),wet=smoothstep(.1,.9,vBasah+.35*(n0.g-.5))*(1.-pd),dk=1.-smoothstep(.04,.13,length(fwidth(p)));
if(vUndak>500.){float e=fract(vUndak);wet*=(1.-smoothstep(.72,.8,e))*smoothstep(.0,.03,e);}   // tepi air per piksel: kisi .75 m tak tampak bergerigi
diffuseColor.rgb*=1.+pd*(.22*sin(p.x*12.57)*dk+.8*(n0.g-.5));   // padi dekat: baris tanam, pudar sebelum moiré
{float bb=mix(.3,smoothstep(.5,.95,(.5+.5*sin(p.x*25.+n0.b*3.))*(.5+.5*sin(p.y*25.+n0.r*5.))+.6*(n0.g-.5)),1.-smoothstep(.015,.05,length(fwidth(p))))*step(.5,vBasah);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.05,.08,.02),bb);wet*=1.-.8*bb;}   // bibit di air dekat
if(vPetak>.01){vec2 l=vec2(.906*p.x+.423*p.y+14.*sin(p.y/83.)+7.*sin(p.x/37.),.906*p.y-.423*p.x+14.*sin(p.x/71.)+7.*sin(p.y/43.))/vec2(22.,12.);l.x+=3.17*sin(floor(l.y)*12.9);vec2 c=floor(l),f=l-c;vec4 st=texture2D(uPetak,(mod(c.yx,64.)+.5)/64.);
  float px=max(fwidth(l.x),fwidth(l.y)),jauh=smoothstep(.15,.5,px),b=(1.-smoothstep(.03,.06+px,min(min(f.x,1.-f.x),min(f.y,1.-f.y))+.05*(n1.g-.5)))*(1.-jauh),a=step(st.r,.3),j=step(.8,st.r);
  vec3 q=mix(mix(mix(vec3(.1,.17,.04),vec3(.17,.2,.05),st.g),vec3(.2,.15,.07),j),vec3(.05,.07,.03),a);q=mix(mix(q,vec3(.12,.15,.055),jauh),vec3(.09,.11,.05),b)*(.72+.56*n1.b);
  diffuseColor.rgb=mix(diffuseColor.rgb,q,vPetak);wet=mix(wet,mix((a*(.5+.45*st.g)+(1.-a-j)*.08)*smoothstep(.2,.42,n1.r+.12*a)*(.45+1.1*n1.g),.2,jauh)*(1.-b),vPetak);}
else diffuseColor.rgb*=.62+.76*mix(n1.r,n0.g,.5);
diffuseColor.rgb*=.78+.44*n2.r;`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.07,wet);')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+mat3(viewMatrix)*vec3(n0.b-.5,0.,n1.g-.5)*mix(.45,.035,wet));')
      .replace('#include <aomap_fragment>','#include <aomap_fragment>\n{vec3 t=reflectedLight.directSpecular+reflectedLight.indirectSpecular,Rw=reflect(-inverseTransformDirection(normalize(vViewPosition),viewMatrix),inverseTransformDirection(normal,viewMatrix));float k=mix(1.,1./(1.+dot(t,vec3(.3,.6,.1))/mix(.3,1.,smoothstep(1.05,1.15,vBasah))),wet),u=mix(mix(.2,1.,smoothstep(.01,.16,Rw.y)),1.,1.-wet);reflectedLight.directSpecular*=k;reflectedLight.indirectSpecular*=k*u*mix(vec3(1.),vec3(1.,.9,.74),wet);}');};
  /* tanah kasar: grid tensor, rapat di tengah (±2 m) dan jarang di tepi (±70 m), dengan lubang tepat di petak sawah halus */
  const sumbu=(a,b)=>[...new Set([...Array.from({length:180},(_,i)=>2*i+.16*i*i).filter(c=>c<luas/2).flatMap(c=>[c,-c]),...(sawah?[a,b]:[])])].sort((p,q)=>p-q);
  tambah(grid(sumbu(sawah&&sawah.x0,sawah&&sawah.x1),sumbu(sawah&&sawah.z0,sawah&&sawah.z1),sawah&&[sawah.x0,sawah.x1,sawah.z0,sawah.z1]),matTanah);
  if(sawah){const l=sawah.langkah||.75,rentang=(a,b)=>{const n=Math.round((b-a)/l),v=Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);return[a,...v,b];};
    tambah(grid(rentang(sawah.x0,sawah.x1),rentang(sawah.z0,sawah.z1),null,true),matTanah);}
  /* sungai: pita air mengikuti garis tengah, muka miring sesuai muka[0..1] */
  if(S){const v=[],ix=[];S.p.forEach((q,i)=>{const a=S.p[Math.max(0,i-1)],b=S.p[Math.min(400,i+1)],dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz)||1,y=mukaAir(i/400);
      v.push(q[0]-dz/l*S.lebar*1.6,y,q[2]+dx/l*S.lebar*1.6,q[0]+dz/l*S.lebar*1.6,y,q[2]-dx/l*S.lebar*1.6);if(i)ix.push(2*i-2,2*i,2*i-1,2*i-1,2*i,2*i+1);});   // berlawanan jarum jam dari atas (normal +y)
    const g=new THREE.BufferGeometry();g.setIndex(ix);g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();
    const n=v.length/3,isi=k=>new THREE.BufferAttribute(new Float32Array(n).fill(k),1);g.setAttribute('color',new THREE.Float32BufferAttribute(Array(n).fill([.004,.006,.005]).flat(),3));g.setAttribute('basah',isi(1.2));g.setAttribute('petak',isi(0));g.setAttribute('undak',isi(0));
    tambah(g,matTanah);}
  /* vegetasi: tanam(n, geometri, …) — PRNG ber-seed, ditolak di sawah basah/sungai/jalur (hindari), dikelompokkan noise */
  let hindari=()=>false;const KUNING=C('#6e6a30');
  const tanam=(n,geo,mat,{tinggi:[h0,h1],kelompok=-1,boleh=()=>true,warna:[w0,w1],pusat:[px,pz]=[0,0],jari=luas*.35,bayang=true})=>{const im=new THREE.InstancedMesh(geo,mat,n),m=new THREE.Matrix4(),
      q=new THREE.Quaternion(),e=new THREE.Euler(),c=new THREE.Color();let k=0;
    for(let coba=0;k<n&&coba<n*40;coba++){const r=jari*acak()**1.6,a=acak()*6.283,x=px+r*Math.cos(a),z=pz+r*Math.sin(a),t=titik(x,z),h=h0+(h1-h0)*acak();   // rapat di pusat
      if(t.b>.05||(t.f>.5&&acak()<.985)||fbm(x/260,z/260,3)<kelompok||!boleh(x,z,t.h)||hindari(x,z,t.h+h,h*.35)||(S&&keSungai(x,z)[0]<S.lebar*1.4))continue;
      e.set((acak()-.5)*.12,acak()*6.3,(acak()-.5)*.12);m.compose(new THREE.Vector3(x,t.h-.3,z),q.setFromEuler(e),new THREE.Vector3(h*(.8+acak()*.5),h*(.85+acak()*.3),h*(.8+acak()*.5)));
      im.setMatrixAt(k,m);c.copy(w0).lerp(w1,acak()).multiplyScalar(.8+.5*acak());if(acak()<.16)c.lerp(KUNING,.4);im.setColorAt(k++,c);pohon.push([x,z,h]);}
    im.count=k;im.castShadow=bayang;im.receiveShadow=true;scene.add(im);return im;};   // bayang: InstancedMesh menggambar SEMUA instans ke peta bayang — beri hanya lapis dekat
  const warnai=(g,h)=>{const c=C(h),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set([c.r,c.g,c.b],i);g.setAttribute('color',new THREE.BufferAttribute(a,3));g.deleteAttribute('uv');return g;},
    /* tajuk: [x,y,z,r] per gumpal, y0 = tinggi batang, pipih = skala y; halus: semua gumpal detail 1 (hanya lapis dekat) */
    geoPohon=(L,y0,pipih,halus)=>mergeGeometries([warnai(new THREE.CylinderGeometry(.03,.05,y0,5,1,true).translate(0,y0/2,0).toNonIndexed(),'#4c3d30'),...L.map(([x,y,z,r],j)=>{const g=new THREE.IcosahedronGeometry(r,halus||!j?1:0),p=g.attributes.position,n=g.attributes.normal;   // normal radial: tajuk lembut, bukan segi game
      for(let i=0;i<p.count;i++){const a=p.getX(i)/r,b=p.getY(i)/r,c=p.getZ(i)/r,k=1+.16*(N.noise(a*2.3,b*2.3+j*3,c*2.3)+.5*N.noise(a*5,b*5,c*5+j));   // tajuk bergelombang
        n.setXYZ(i,a,b,c);p.setXYZ(i,a*r*k,b*r*k,c*r*k);}return warnai(g.scale(1,pipih,1).translate(x,y,z),'#ffffff');})]),
    RAGAM=[[[[0,.58,0,.4],[.22,.46,.1,.3],[-.2,.48,-.12,.31],[.04,.4,-.24,.26]],.5,.78,.5],   // bulat (mangga)
      [[[0,.5,0,.36],[.32,.46,.12,.28],[-.32,.45,-.1,.29],[.1,.47,.34,.25],[-.12,.5,-.32,.26]],.4,.6,.25],   // lebar pipih (beringin)
      [[[0,.78,0,.25],[.12,.6,.07,.2],[-.1,.66,-.09,.19],[.02,.92,.03,.15]],.62,.95,.25]],   // tinggi ramping (randu)
    geoKelapa=(()=>{const v=[],cw=[],pt=(x,y,z,c)=>{v.push(x,y,z);cw.push(...c);},bt=C('#6d6152'),dn=C('#ffffff');
      for(let i=0;i<6;i++){const a0=i/6,a1=(i+1)/6,lk=t=>.05*t*t;   // batang: 6 sisi, melengkung ke +x
        for(let s=0;s<4;s++){const y0=s/4,y1=(s+1)/4,r0=.022-.006*y0,r1=.022-.006*y1,c0=Math.cos(a0*6.283),s0_=Math.sin(a0*6.283),c1=Math.cos(a1*6.283),s1=Math.sin(a1*6.283);
          pt(lk(y0)+c0*r0,y0,s0_*r0,[bt.r,bt.g,bt.b]);pt(lk(y1)+c1*r1,y1,s1*r1,[bt.r,bt.g,bt.b]);pt(lk(y0)+c1*r0,y0,s1*r0,[bt.r,bt.g,bt.b]);
          pt(lk(y0)+c0*r0,y0,s0_*r0,[bt.r,bt.g,bt.b]);pt(lk(y1)+c0*r1,y1,s0_*r1,[bt.r,bt.g,bt.b]);pt(lk(y1)+c1*r1,y1,s1*r1,[bt.r,bt.g,bt.b]);}}
      for(let i=0;i<9;i++){const a=i/9*6.283+.3,ca=Math.cos(a),sa=Math.sin(a),p=t=>[.05+ca*.3*t,1+.08*t-.28*t*t,sa*.3*t],L=t=>.045*Math.sin(Math.PI*Math.min(1,t*1.15+.05));   // pelepah melengkung turun
        for(let s=0;s<4;s++){const[x0,y0,z0]=p(s/4),[x1,y1,z1]=p((s+1)/4),w0=L(s/4),w1=L((s+1)/4),c=[dn.r,dn.g,dn.b];
          pt(x0-sa*w0,y0,z0+ca*w0,c);pt(x1-sa*w1,y1,z1+ca*w1,c);pt(x1+sa*w1,y1,z1-ca*w1,c);pt(x0-sa*w0,y0,z0+ca*w0,c);pt(x1+sa*w1,y1,z1-ca*w1,c);pt(x0+sa*w0,y0,z0-ca*w0,c);}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cw,3));g.computeVertexNormals();return g;})(),
    /* daun: matahari di depan = sisi terlihat teduh. Tanpa ini tajuk hitam. Tembus cahaya (tepi menyala saat menatap ke matahari), balut cahaya sisi matahari,
       gumpal + rongga dari ubin di ruang objek, teduh di bawah tajuk, tepi siluet berserabut (discard: tepi = daun, bukan segi) */
    daun=(m,tepi)=>{m.onBeforeCompile=s=>{Object.assign(s.uniforms,{uUbin:{value:ubin},uSun:{value:arah}});
      s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vL,vNo;varying vec2 vO;').replace('#include <begin_vertex>','#include <begin_vertex>\nvL=position;vNo=normal;vO=fract(instanceMatrix[3].xz*.137)*7.;');
      s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uUbin;uniform vec3 uSun;varying vec3 vL,vNo;varying vec2 vO;')
        .replace('#include <color_fragment>',`#include <color_fragment>
vec3 ww=abs(vNo);ww/=ww.x+ww.y+ww.z;vec4 gg=texture2D(uUbin,(vL.zy+vO)*.55)*ww.x+texture2D(uUbin,(vL.xz+vO)*.55)*ww.y+texture2D(uUbin,(vL.xy+vO.yx)*.55)*ww.z;float g2=gg.b,gum=smoothstep(.34,.66,.45*gg.r+.25*gg.b+.3*gg.g);
${tepi?`if(vL.y>.2&&g2<.56*pow(1.-abs(dot(normalize(vNormal),normalize(vViewPosition))),2.)+.1)discard;`:''}
float gd=texture2D(uUbin,(vL.xz+vL.y*.7+vO)*3.1).g;diffuseColor.rgb*=(.5+.85*gum)*(.7+.6*gd)*mix(.5,1.1,smoothstep(.25,.8,vL.y));`)
        .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+1.6*(gg.rbg-.5)+.8*(gd-.5));')
        .replace('#include <aomap_fragment>',`#include <aomap_fragment>
{vec3 Nw=inverseTransformDirection(normal,viewMatrix),Vw=inverseTransformDirection(normalize(vViewPosition),viewMatrix);float nl=max(dot(Nw,uSun)*.6+.4,0.),bl=clamp(dot(-Vw,uSun),0.,1.),tp=1.-abs(dot(Nw,Vw));
 reflectedLight.indirectDiffuse*=.65+.6*max(Nw.y,0.);reflectedLight.directDiffuse+=diffuseColor.rgb*vec3(1.5,1.05,.5)*(.55*nl*nl*nl+bl*bl*(.12+1.5*tp*tp)*(.3+gum));}`);};return m;},
    matV=daun(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,envMapIntensity:.9}),true);
  /* langit + env: Sky (Preetham) di-bake ke PMREM sekali (statis) → ambien & pantulan air dari langit yang sama */
  const sky=new Sky(),u=sky.material.uniforms,arah=new THREE.Vector3().setFromSphericalCoords(1,(90-matahari.el)*Math.PI/180,matahari.az*Math.PI/180);
  Object.assign(sky.scale,{x:1e4,y:1e4,z:1e4});u.turbidity.value=langit.turbidity;u.rayleigh.value=langit.rayleigh;u.mieCoefficient.value=langit.mie;
  u.mieDirectionalG.value=langit.mieG;u.sunPosition.value.copy(arah);
  /* awan tipis di Sky: ubin diproyeksikan ke bidang langit, tepi hangat dekat matahari; ikut ter-bake ke env */
  u.uUbin={value:ubin};sky.material.fragmentShader=sky.material.fragmentShader.replace('void main()','uniform sampler2D uUbin;\nvoid main()').replace('gl_FragColor = vec4( retColor, 1.0 );',`vec2 ca=direction.xz/(direction.y+.14);float ct=texture2D(uUbin,ca*vec2(.035,.11)+.2).r*.7+texture2D(uUbin,ca*vec2(.13,.4)).b*.3,cv=smoothstep(.5,.68,ct)*smoothstep(.005,.1,direction.y)*.8,cs=pow(max(dot(direction,vSunDirection),0.),5.);
retColor=mix(retColor,mix(retColor*vec3(.62,.58,.64),vec3(1.55,1.12,.8),cs),cv);gl_FragColor=vec4(retColor,1.);`);
  {const es=new THREE.Scene(),pm=new THREE.PMREMGenerator(renderer);es.add(sky);scene.environment=pm.fromScene(es).texture;pm.dispose();scene.add(sky);}
  scene.fog=new THREE.FogExp2(kabut.warna,kabut.padat);
  /* kabut lembah: bidang datar tembus pandang, alfa dari fBm (DataTexture ber-seed); dibaca berlapis dari sudut rendah */
  if(lembah){const n=256,a=new Uint8Array(n*n*4);for(let j=0;j<n;j++)for(let i=0;i<n;i++){const v=ss(-.15,.55,fbm(i/40,j/40,4))*ss(0,24,Math.min(i,j,n-1-i,n-1-j));
      a.set([255,255,255,255*v],(j*n+i)*4);}
    const tx=new THREE.DataTexture(a,n,n);tx.needsUpdate=true;tx.magFilter=tx.minFilter=THREE.LinearFilter;
    for(const y of lembah.y){const m=new THREE.Mesh(new THREE.PlaneGeometry(lembah.ukuran||luas*.6,lembah.ukuran||luas*.6).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:lembah.warna||kabut.warna,map:tx,transparent:true,opacity:lembah.opasitas||.35,depthWrite:false}));
      m.position.set(lembah.x||0,y,lembah.z||0);m.renderOrder=1;scene.add(m);}}
  /* tahap 2, sesudah gapura & jalur diketahui: tumbuh({hutan, kelapa, hindari(x,z,yPuncak,jariTajuk)}); hutan/kelapa = satu lapis
     {n,pusat,jari,kelompok,boleh,bayang} atau larik lapis (mis. dekat berbayang + jauh tanpa bayang) */
  const matK=daun(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,side:THREE.DoubleSide,envMapIntensity:.9}),false),
    tumbuh=({hutan={n:5000},kelapa={n:200},hindari:h=()=>false}={})=>{hindari=h;
    for(const o of [].concat(hutan||[]))if(o.n)for(const[L,y,p,bagi]of RAGAM)tanam(Math.round(o.n*bagi),geoPohon(L,y,p,o.bayang!==false),matV,{tinggi:[9,19],kelompok:-.15,warna:[C('#293c1c'),C('#4a5c2b')],...o});
    for(const o of [].concat(kelapa||[]))if(o.n)tanam(o.n,geoKelapa,matK,{tinggi:[11,17],warna:[C('#3d5226'),C('#5b6e30')],...o});};
  return{tinggi:(x,z)=>titik(x,z).h,basah:(x,z)=>titik(x,z).b,arah,pohon,tumbuh,ubin};}
/* bayangan matahari ikut kamera: kotak bayang ±r di sekitar titik `maju` m di depan kamera, posisi dibulatkan ke texel ruang
   cahaya (bayangan diam tidak berkedip saat kamera terbang). Panggil sesudah applyCam(), sebelum render. */
function ikutMatahari(arah,{r=70,maju=45,jauh=450}={}){key.shadow.normalBias=.06*r/70;const f=camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize(),
  c=camera.position.clone().addScaledVector(f,maju),ka=new THREE.Vector3().crossVectors(arah,new THREE.Vector3(0,1,0)).normalize(),
  at=new THREE.Vector3().crossVectors(ka,arah).normalize(),tx=2*r/key.shadow.mapSize.x,bul=(v,s)=>c.addScaledVector(v,Math.round(c.dot(v)/s)*s-c.dot(v));
  bul(ka,tx);bul(at,tx);key.target.position.copy(c);key.position.copy(c).addScaledVector(arah,jauh);
  const sc=key.shadow.camera;if(sc.right!==r||sc.far!==jauh*2){Object.assign(sc,{left:-r,right:r,top:r,bottom:-r,near:1,far:jauh*2});sc.updateProjectionMatrix();}}
/* lewati(objek,{tinggi,jarak,dari}) → 3 titik terbang() segaris menembus pusat kotak objek (gapura bentar: celah di tengah) searah
   sumbu z lokalnya, `tinggi` di atas dasar kotak, ±`jarak`; diurutkan dari arah `dari` (titik jalur sebelumnya). Periksa jarak bebas. */
function lewati(o,{tinggi=2,jarak=10,dari=null}={}){o=objek3(o);const b=kotak3(o),c=b.getCenter(new THREE.Vector3()),
  d=o.getWorldDirection(new THREE.Vector3()).setY(0).normalize().multiplyScalar(jarak),q=[-1,0,1].map(k=>[c.x+d.x*k,b.min.y+tinggi,c.z+d.z*k]);
  return dari&&Math.hypot(dari[0]-q[2][0],dari[2]-q[2][2])<Math.hypot(dari[0]-q[0][0],dari[2]-q[0][2])?q.reverse():q;}
