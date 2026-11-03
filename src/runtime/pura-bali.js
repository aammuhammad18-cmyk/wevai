/* PURA BALI — denah tri mandala GENERIK untuk diorama (bukan pura tertentu; sumber dan penyederhanaan: references/diorama.md › Akurasi).
   TRI_MANDALA = data denah; pura.bangun(R,T) merakit kepingan lewat R.kotak/R.prisma (diorama.rakit); pura.tanah(T,batas) melukis lantai tiga halaman.
   Arah: kaja (ke gunung) = −z, kelod (ke laut) = +z, kangin = +x, kauh = −x. Meter. Tanpa arca, sesajen, atau perlengkapan upacara. Diuji test-diorama.mjs. */
const TRI_MANDALA={lebar:26,
  zona:[{id:'nista',nama:'Nista mandala',jaba:'jaba sisi',z:[31,17],y:0},
    {id:'madya',nama:'Madya mandala',jaba:'jaba tengah',z:[17,-1],y:.5},
    {id:'utama',nama:'Utama mandala',jaba:'jeroan',z:[-1,-25],y:1}],
  gerbang:[{jenis:'candiBentar',dari:'nista',ke:'madya',z:17},{jenis:'koriAgung',dari:'madya',ke:'utama',z:-1}],
  bangunan:[{jenis:'wantilan',zona:'nista',x:-6.6,z:24.2},
    {jenis:'baleKulkul',zona:'madya',x:-11,z:14.8},   // kelod-kauh madya
    {jenis:'baleGong',zona:'madya',x:7,z:7.6},
    {jenis:'padmasana',zona:'utama',x:9,z:-20.8,hadap:'kauh'},   // kaja-kangin, menghadap kauh
    {jenis:'meru',zona:'utama',x:9.2,z:-12,tumpang:5,hadap:'kauh'},
    {jenis:'meru',zona:'utama',x:9.2,z:-5.4,tumpang:3,hadap:'kauh'},
    {jenis:'balePawedan',zona:'utama',x:-6,z:-14}]};
const pura=(()=>{
  const P={bata:'#8c5540',bataMuda:'#9a6450',nat:'#5c3729',paras:'#a59a85',parasTua:'#7f7768',batu:'#55534d',ijuk:'#2f2b27',ijukTepi:'#47423a',alang:'#8f7c58',alangTua:'#726248',kayu:'#624429',kayuMerah:'#6e3a2a',emas:'#97793f'},
    zona=(T,id)=>{const z=T.zona.find(q=>q.id===id);if(!z)throw new Error('pura: zona tak dikenal: '+id);return z;};
  /* atap meru: selalu ganjil (3–11). Tiap tingkat = rok landai + badan curam; kembali [{y,wb,wm,wa,hr,hb}] dari dasar atap */
  function tingkatMeru(n,{b0=2.8,b1=.95,tinggi=.92,sela=.4}={}){
    if(!Number.isInteger(n)||n%2===0||n<3||n>11)throw new Error('pura: tumpang meru harus ganjil 3–11 (dapat '+n+')');
    return Array.from({length:n},(_,k)=>{const u=k/(n-1),b=b0+(b1-b0)*u;return{y:k*(tinggi+sela),wb:b*2,wm:b*1.42,wa:b*.72,hr:tinggi*.34,hb:tinggi*.66};});}
  const tangga=(R,x,z,w,y0,y1,arah,sumbu='z',n=3,warna=P.paras)=>{const h=(y1-y0)/n,t=.42;for(let i=0;i<n;i++){const u=(n-i-.5)*t*arah;   // arah: ke mana turun
      sumbu==='z'?R.kotak(x,y0+i*h,z+u,w,h,t,warna):R.kotak(x+u,y0+i*h,z,t,h,w,warna);}};
  /* penyengker: bata + lis paras, tiang tiap ±5 m. Garis nat tanpa lambung (detail kecil, bukan siluet) */
  function tembok(R,x0,z0,x1,z1,y,h,{tiang=true,tebal=.55}={}){const pjg=Math.hypot(x1-x0,z1-z0),sbX=z0===z1,cx=(x0+x1)/2,cz=(z0+z1)/2,w=sbX?pjg:tebal,d=sbX?tebal:pjg;
    R.kotak(cx,y,cz,w+.1,.4,d+.1,P.parasTua);R.kotak(cx,y+.4,cz,w,h-.72,d,P.bata);R.kotak(cx,y+h-.32,cz,w+.16,.14,d+.16,P.paras);R.kotak(cx,y+h-.18,cz,w+.04,.18,d+.04,P.bata,{garis:false});
    for(let v=.75;v<h-.5;v+=.32)R.kotak(cx,y+v,cz,w+.025,.035,d+.025,P.nat,{garis:false,kotor:1});
    if(tiang){const n=Math.max(1,Math.round(pjg/5));for(let i=0;i<=n;i++){const u=i/n,x=x0+(x1-x0)*u,z=z0+(z1-z0)*u;
      R.kotak(x,y,z,.85,h+.2,.85,P.bataMuda);R.kotak(x,y+h+.2,z,1,.13,1,P.paras);R.prisma(x,y+h+.33,z,.72,.72,.12,.12,.46,P.bataMuda);}}}
  /* badan bata: kotak + garis nat (detail tanpa lambung) */
  const bata=(R,x,y,z,w,h,d,warna=P.bata)=>{R.kotak(x,y,z,w,h,d,warna);for(let v=.28;v<h-.1;v+=.28)R.kotak(x,y+v,z,w+.02,.03,d+.02,P.nat,{garis:false,kotor:1});};
  /* candi bentar: dua belahan serupa dan sebangun, sisi dalam rata, tanpa atap di antaranya, anak tangga di celah */
  function candiBentar(R,z,y0,y1,celah=2.8){const susun=[[.9,4.7,4.7,P.paras],[2.3,4,4,P.bata],[.2,4.4,4.4,P.paras]];
    for(let k=0;k<6;k++){const w=3.6-k*.46;susun.push([.58,w,w,P.bata],[.12,w+.2,w+.2,P.paras]);}susun.push([.42,.72,.72,P.paras]);
    for(const s of[-1,1]){let y=y0;for(const[h,w,d,c]of susun){(c===P.bata?bata:R.kotak)(...(c===P.bata?[R]:[]),s*(celah/2+w/2),y,z,w,h,d,c);y+=h;}}
    tangga(R,0,z+1.5,celah,y0,y1,1);R.kotak(0,y0,z-.3,celah,y1-y0,3,P.paras);}
  /* kori agung (paduraksa): gerbang beratap masif, kaki–badan–kepala (tri angga), pintu sempit tertutup, sayap di kiri-kanan */
  function koriAgung(R,z,y0,y1){const L=1.5,lb=2.1,d=3.4;R.kotak(0,y0,z,L+2*lb+.9,1,d+1.1,P.paras);const y=y0+1;
    for(const s of[-1,1]){bata(R,s*(L/2+lb/2),y,z,lb,3.3,d);R.kotak(s*(L/2+lb+1.2),y0,z,2.5,1,2.3,P.paras);let q=y0+1;[[1.9,2.1,1.5],[1.3,1.7,1.1],[1,1.2,.8]].forEach(([h,w,dd])=>{bata(R,s*(L/2+lb+1.2),q,z,w,h,dd);q+=h;R.kotak(s*(L/2+lb+1.2),q,z,w+.25,.14,dd+.25,P.paras);q+=.14;});}
    R.kotak(0,y,z,L,.08,d,P.parasTua);R.kotak(0,y,z,L,2.5,.28,P.kayuMerah);R.kotak(0,y+1.05,z+.16,.1,1,.04,P.emas,{garis:false});
    bata(R,0,y+2.5,z,L,.8,d);R.kotak(0,y+2.56,z+d/2+.05,L+.5,.62,.14,P.paras);R.kotak(0,y+3.3,z,L+2*lb+.45,.22,d+.45,P.paras);
    let q=y+3.52;for(let k=0;k<7;k++){const u=k/6,w=(L+2*lb)-u*3.9,dd=d-u*2.5;bata(R,0,q,z,w,.52,dd);q+=.52;R.kotak(0,q,z,w+.22,.12,dd+.22,P.paras);q+=.12;}R.prisma(0,q,z,.6,.6,.08,.08,.7,P.paras);
    tangga(R,0,z+d/2+.55,L+.6,y0+.0,y0+1,1,'z',3);R.kotak(0,y0,z-d/2-.4,L+.6,y1-y0,.5,P.paras);}
  function meru(R,x,z,y,n,hadap){const dx=hadap==='kauh'?-1:1,T=tingkatMeru(n);
    R.kotak(x,y,z,5.4,.95,5.4,P.paras);bata(R,x,y+.95,z,4.2,.42,4.2);tangga(R,x+dx*2.7,z,1.4,y,y+.95,dx,'x',3);
    const b=y+1.37;R.kotak(x,b,z,3,1.45,3,P.kayuMerah);R.kotak(x+dx*1.52,b+.1,z,.05,1.1,.8,P.kayu,{garis:false});R.kotak(x+dx*1.54,b+1.2,z,.03,.08,1,P.emas,{garis:false});for(const s of[-1,1])for(const t of[-1,1])R.kotak(x+s*1.5,b,z+t*1.5,.22,1.45,.22,P.kayu,{garis:false});
    const y0=b+1.45;for(const q of T){const yy=y0+q.y;R.kotak(x,yy-.4,z,q.wa*.8,.42,q.wa*.8,P.kayu,{garis:false});R.prisma(x,yy,z,q.wb,q.wb,q.wm,q.wm,q.hr,P.ijukTepi,{kotor:.9});R.prisma(x,yy+q.hr,z,q.wm,q.wm,q.wa,q.wa,q.hb,P.ijuk,{kotor:.82});}
    const top=y0+T.at(-1).y+T.at(-1).hr+T.at(-1).hb;R.prisma(x,top,z,.8,.8,.34,.34,.38,P.ijukTepi);R.prisma(x,top+.38,z,.34,.34,.05,.05,.62,P.emas);}
  /* padmasana: batu bertingkat tepas–batur–sancak, puncak takhta kosong bersandaran. Tanpa Bedawang Nala, naga, dan citra Acintya (penyederhanaan) */
  function padmasana(R,x,z,y,hadap){const dx=hadap==='kauh'?-1:1;let q=y;
    for(const[w,h,c]of[[6,.7,P.batu],[5.2,.5,P.paras],[4.5,.8,P.parasTua],[3.8,.55,P.paras],[3.2,1,P.parasTua],[2.7,.32,P.paras],[2.1,.55,P.batu],[2.9,.32,P.paras],[2.5,1.2,P.parasTua],[3,.28,P.paras],[2.2,.26,P.emas]]){R.kotak(x,q,z,w,h,w,c);q+=h;}
    const lima=q;R.kotak(x-dx*.85,lima,z,.42,1.6,2.1,P.paras);R.prisma(x-dx*.85,lima+1.6,z,.42,2.1,.2,1,.42,P.paras);R.kotak(x-dx*.86,lima+.3,z,.48,.9,1.2,P.emas,{garis:false});for(const s of[-1,1])R.kotak(x,lima,z+s*.95,1.3,.62,.26,P.paras);}
  function bale(R,x,z,y,{w,d,tiang=3,h=2.1,batur=.7,atap=P.alang,tepi=P.alangTua,dua=false}){R.kotak(x,y,z,w,batur,d,P.paras);R.kotak(x,y+batur,z,w-.3,.06,d-.3,P.parasTua,{garis:false});const yt=y+batur;
    for(let i=0;i<tiang;i++)for(const t of[-1,1]){const u=tiang>1?i/(tiang-1):.5,px=x+(w-.7)*(u-.5);R.kotak(px,yt,z+t*(d-.7)/2,.22,h,.22,P.kayu,{garis:false});}
    for(const s of[-1,1])R.kotak(x+s*(w-.7)/2,yt,z,.22,h,.22,P.kayu,{garis:false});
    const ya=yt+h;R.prisma(x,ya,z,w+1.6,d+1.6,w*.64,d*.64,.5,tepi,{kotor:.92});R.prisma(x,ya+.5,z,w*.64,d*.64,.36*w,.1*d+.2,1.1,atap,{kotor:.85});
    if(dua){const y2=ya+1.6;R.kotak(x,y2-.1,z,w*.34,.5,d*.34,P.kayu,{garis:false});R.prisma(x,y2+.35,z,w*.72,d*.72,w*.4,d*.4,.34,tepi);R.prisma(x,y2+.69,z,w*.4,d*.4,.16,.16,1.1,atap);}}
  /* bale kulkul: menara bata tinggi, ruang kayu berisi dua kentongan, atap limas */
  function baleKulkul(R,x,z,y){R.kotak(x,y,z,2.9,.6,2.9,P.paras);bata(R,x,y+.6,z,2.3,2.9,2.3);R.kotak(x,y+3.5,z,2.7,.2,2.7,P.paras);const t=y+3.7;
    for(const s of[-1,1])for(const u of[-1,1])R.kotak(x+s*.95,t,z+u*.95,.18,1.5,.18,P.kayu,{garis:false});for(const s of[-1,1])R.kotak(x+s*.34,t+.24,z,.26,1.06,.26,P.kayuMerah,{garis:false});
    R.prisma(x,t+1.5,z,3.1,3.1,1.7,1.7,.34,P.alangTua);R.prisma(x,t+1.84,z,1.7,1.7,.14,.14,1.15,P.alang);}
  function bangun(R,T=TRI_MANDALA){const L=T.lebar/2,N=zona(T,'nista'),M=zona(T,'madya'),U=zona(T,'utama'),hT=2.5;
    /* tembok keliling: nista rendah dan terbuka ke kelod; madya + utama penyengker penuh; antarhalaman berdiri di lantai rendah */
    for(const s of[-1,1]){tembok(R,s*L,N.z[0],s*L,N.z[1],0,1.05,{tiang:false});tembok(R,s*L,M.z[0],s*L,M.z[1],0,M.y+hT);tembok(R,s*L,U.z[0],s*L,U.z[1],0,U.y+hT);}
    tembok(R,-L,U.z[1],L,U.z[1],0,U.y+hT);
    const lepas=[[T.gerbang[0],M.y,3.4+2.2],[T.gerbang[1],U.y,5.2]];
    for(const[g,yAtas,c]of lepas){for(const s of[-1,1])tembok(R,s*c,g.z,s*L,g.z,0,yAtas+hT);}
    for(const[g]of lepas){const a=zona(T,g.dari).y,b=zona(T,g.ke).y;(g.jenis==='candiBentar'?candiBentar:koriAgung)(R,g.z,a,b);}
    for(const b of T.bangunan){const y=zona(T,b.zona).y;
      if(b.jenis==='wantilan')bale(R,b.x,b.z,y,{w:8,d:6,tiang:4,h:2.5,batur:.45,dua:true});
      else if(b.jenis==='baleKulkul')baleKulkul(R,b.x,b.z,y);
      else if(b.jenis==='baleGong')bale(R,b.x,b.z,y,{w:7,d:4.4,tiang:4,h:2.2});
      else if(b.jenis==='balePawedan')bale(R,b.x,b.z,y,{w:4.4,d:4.4,tiang:2,h:2.1,batur:.85});
      else if(b.jenis==='meru')meru(R,b.x,b.z,y,b.tumpang,b.hadap);
      else if(b.jenis==='padmasana')padmasana(R,b.x,b.z,y,b.hadap);
      else throw new Error('pura: jenis bangunan tak dikenal: '+b.jenis);}}
  /* lantai tiga halaman: satu kanvas (flok maket: bintik tiga nada, ber-seed), dibagi per ketinggian. batas = tepi alas [x0,x1,z0,z1] */
  function lukisTanah(g,[x0,x1,z0,z1],T,px,seed){const X=x=>(x-x0)*px,Z=z=>(z-z0)*px,L=T.lebar/2,flok=(a,b,c,e,warna,rapat,uk=2)=>{const[w0,w1,w2]=warna;g.fillStyle=w0;g.fillRect(X(a),Z(c),(b-a)*px,(e-c)*px);
      const n=Math.round((b-a)*(e-c)*rapat);for(let i=0;i<n;i++){const u=hash(3*i+1,seed),v=hash(3*i+2,seed),w=hash(3*i+3,seed),s=uk+(uk*1.5*w|0);g.fillStyle=w<.55?w1:w2;g.fillRect(Math.round(X(a+(b-a)*u)),Math.round(Z(c+(e-c)*v)),s,s);}seed++;},
      [N,M,U]=T.zona;
    flok(x0,x1,z0,z1,['#566333','#65733c','#49552c'],260);
    flok(-L,L,N.z[1],N.z[0]+6,['#8c7a56','#7c6b49','#9b8a65'],240);
    flok(-L,L,M.z[1],M.z[0],['#6c7842','#7a8650','#5e6a38'],300);
    flok(-L,L,U.z[1],U.z[0],['#a2977f','#93886f','#b0a58d'],300);
    /* jalan batu di sumbu kelod → kaja */
    for(const[a,b]of[[N.z[0]+6,N.z[1]],[M.z[0],M.z[1]],[U.z[0],U.z[1]+18]]){const hi=Math.min(a,b),lo=Math.max(a,b);flok(-1.25,1.25,hi,lo,['#b5ab94','#a59b84','#c2b8a1'],500);
      g.fillStyle='rgba(58,44,30,.55)';for(let z=hi;z<lo;z+=.62)g.fillRect(X(-1.25),Z(z),2.5*px,Math.max(1,.045*px));g.fillRect(X(-1.32),Z(hi),.08*px,(lo-hi)*px);g.fillRect(X(1.25),Z(hi),.08*px,(lo-hi)*px);}}
  function tanah(T=TRI_MANDALA,batas,{px=36,seed=21}={}){const[x0,x1,z0,z1]=batas,c=document.createElement('canvas');c.width=Math.round((x1-x0)*px);c.height=Math.round((z1-z0)*px);lukisTanah(c.getContext('2d'),batas,T,px,seed);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;const m=new THREE.MeshToonMaterial({map:t,gradientMap:null}),L=T.lebar/2,
      bidang=(a,b,e,f,y)=>{const g=new THREE.PlaneGeometry(b-a,f-e).rotateX(-Math.PI/2).translate((a+b)/2,y,(e+f)/2),p=g.attributes.position,u=g.attributes.uv;for(let i=0;i<p.count;i++)u.setXY(i,(p.getX(i)-x0)/(x1-x0),1-(p.getZ(i)-z0)/(z1-z0));const o=new THREE.Mesh(g,m);o.receiveShadow=true;scene.add(o);return o;};
    for(const q of T.zona)bidang(-L,L,q.z[1],q.z[0],q.y+.005);
    bidang(x0,x1,z0,T.zona[2].z[1],.002);bidang(x0,x1,T.zona[0].z[0],z1,.002);bidang(x0,-L,T.zona[2].z[1],T.zona[0].z[0],.002);bidang(L,x1,T.zona[2].z[1],T.zona[0].z[0],.002);}
  /* pemedek: kartu orang kecil berbaju adat umum (kamen, baju putih), tanpa wajah, tanpa perlengkapan upacara. Dokumen SVG 100×300 */
  function pemedek({seed=1}={}){const u=hash(seed,5),v=hash(seed,6),prm=u<.5,kamen=['#7a3b2c','#3d4a5a','#6a5a2c','#50324a'][v*4|0],kulit='#b27c54',dx=(hash(seed,7)-.5)*6;
    const d=prm?`<path d="M34 118 Q50 104 66 118 L72 178 Q50 186 28 178Z" fill="#ece5d4"/><path d="M34 176 L66 176 L68 286 L52 288 L48 288 L32 286Z" fill="${kamen}"/><path d="M38 186 h24 v14 h-24z" fill="#d9c98f"/><circle cx="50" cy="88" r="17" fill="${kulit}"/><path d="M32 86 Q50 62 68 86 Q58 78 50 80 Q42 78 32 86Z" fill="#ece5d4"/><path d="M50 72 l10 -11 l3 12z" fill="#ece5d4"/>`
      :`<path d="M36 118 Q50 106 64 118 L68 180 Q50 186 32 180Z" fill="#ece5d4"/><path d="M32 176 L68 176 L64 288 L36 288Z" fill="${kamen}"/><path d="M30 170 h40 v12 h-40z" fill="#c9a24e"/><circle cx="50" cy="88" r="16" fill="${kulit}"/><path d="M33 84 Q50 66 67 84 Q58 76 50 78 Q42 76 33 84Z" fill="#231a14"/><circle cx="60" cy="72" r="9" fill="#231a14"/>`;
    return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 300"><g transform="translate(${dx.toFixed(1)},0)">${d}<path d="M36 288 h12 v6 h-12z M52 288 h12 v6 h-12z" fill="${kulit}"/></g></svg>`;}
  return{bangun,tanah,tingkatMeru,pemedek,lukisTanah,PALET:P};})();
