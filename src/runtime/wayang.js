/* WAYANG KULIT (sub-proyek 7) — teater bayangan yang hormat pakem; sumber pakem, API, biaya, batas: references/wayang.md.
   Tiap figur = bentuk yang DIRANCANG per golongan (bukan tokoh bernama) + tatah sebagai kode. Dipanggang SEKALI ke sprite
   (badan kaku + lengan dua sendi); tiap frame SATU kanvas layar penuh dihapus dan digambar ulang dari tl.time() + CAM + BLENCONG
   (temuan determinisme tokoh.md: transform <g> di svg ber-will-change tidak identik piksel). Rig tokoh.js tidak dipakai: rangkanya
   2,5D (19 tulang) untuk tubuh berproporsi manusia, sedangkan wayang pipih kaku dengan dua lengan; yang diwarisi = kontrak kanvas
   + rumus IK dua tulang analitik (blok 41 KB tak perlu ikut). Butuh dari atmosfer: rantaiUpdate, mulberry32, vnoise.
   Diuji tanpa browser: scripts/test-wayang.mjs. */

/* BLENCONG — lampu, satu per halaman, di-tween GSAP seperti CAM: tl.to(BLENCONG,{kedip:.6,duration:1},7). x, y = kaki tegak lurus
   lampu di kelir (px); jarak = lampu ↔ kelir (px); nyala = lebar api (px, menentukan penumbra); kuat 0..1; kedip 0..1 (seed tetap). */
const BLENCONG={x:960,y:250,jarak:620,nyala:24,kuat:1,kedip:.3,seed:3};
const wayang=(()=>{
const{PI,sin,cos,atan2,hypot,acos,max,min,abs,round,floor,ceil}=Math,RAD=PI/180,f=v=>round(v*10)/10,lerp=(a,b,k)=>a+(b-a)*k,
  ss=x=>x<=0?0:x>=1?1:x*x*(3-2*x),salah=(n,m)=>{throw new Error('wayang.'+n+': '+m);};

/* PAKEM (references/wayang.md, tiap baris bersumber). tinggi = relatif satria alusan; gerak = jumlah lengan yang bersendi (raksasa:
   tangan belakang digambar tetap malang kerik); kepala = derajat tunduk (+) / tengadah (−). */
const JENIS={
  alusan:{sikap:'bokongan',mata:'gabahan',hidung:'wali miring',mulut:'rapat',kepala:'luruh',tunduk:16,gelung:'cupit urang',muka:'hitam',tinggi:1,gerak:2,simping:'kanan'},
  gagahan:{sikap:'jangkahan',mata:'kedhelen',hidung:'bentulan',mulut:'rapat',kepala:'longok',tunduk:2,gelung:'cupit urang',muka:'hitam',tinggi:1.16,gerak:2,simping:'kanan'},
  raksasa:{sikap:'jangkahan',mata:'plelengan',hidung:'pelokan',mulut:'gusen',kepala:'lanyapan',tunduk:-7,gelung:'gembel',muka:'merah',tinggi:1.3,gerak:1,simping:'kiri'},
  putri:{sikap:'samparan',mata:'gabahan',hidung:'wali miring',mulut:'rapat',kepala:'oyi',tunduk:20,gelung:'ukel keyongan',muka:'prada',tinggi:.8,gerak:2,simping:'kanan'}},
  /* warna muka → watak yang lazim disebut sumber; bukan hukum tunggal (lihat dokumen) */
  MUKA={hitam:{warna:'#1a1613',makna:'dewasa, tenang, sigap'},merah:{warna:'#b5281c',makna:'mudah tergugah, makin tua makin temperamental'},
    prada:{warna:'#d3a443',makna:'wayang brongsong: muka berlapis emas'},putih:{warna:'#e6dcc4',makna:'tidak seragam antarsumber'}},
  /* simpingan menurut sisi DALANG; penonton di sisi bayang melihatnya tercermin */
  PIHAK={kanan:{layar:'kiri',hadap:'kanan'},kiri:{layar:'kanan',hadap:'kiri'}},
  /* posisi tangan bernama (ITB J. Vis. Art 2007): target telapak px figur dari titik tanah, x ke arah hadap */
  POSE={anjujur:[34,-150],angapurancang:[70,-405],mathentheng:[62,-500],nuding:[370,-640],ngancam:[300,-930],sembah:[108,-700]};

/* ---------- geometri murni ---------- */
const tk=p=>f(p[0])+','+f(p[1]),
  /* titik [x,y,sudut?] → path halus (Catmull-Rom → kubik); sudut 1 = tepi tajam (ujung hidung, kuku, kunca) */
  jalur=(p,tutup=1)=>{const n=p.length;let d='M'+tk(p[0]);for(let i=0;i<(tutup?n:n-1);i++){const a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],e=p[(i+2)%n],
      c1=b[2]||(!tutup&&!i)?b:[b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6],c2=c[2]||(!tutup&&i===n-2)?c:[c[0]-(e[0]-b[0])/6,c[1]-(e[1]-b[1])/6];
      d+=`C${tk(c1)} ${tk(c2)} ${tk(c)}`;}return d+(tutup?'Z':'');},
  /* transform titik; sudut positif = searah jarum jam di layar (y ke bawah) */
  ubah=(p,{s=1,sx=s,sy=s,r=0,dx=0,dy=0}={})=>{const c=cos(r*RAD),q=sin(r*RAD);return p.map(([x,y,k])=>{const X=x*sx,Y=y*sy,o=[X*c-Y*q+dx,X*q+Y*c+dy];if(k)o.push(k);return o;});},
  cermin=p=>p.concat(p.slice(1,-1).reverse().map(([x,y,k])=>k?[-x,y,k]:[-x,y])),
  /* titik sama jarak sepanjang polilinea */
  sepanjang=(p,jarak)=>{const o=[];let sisa=0;for(let i=0;i<p.length-1;i++){const[a,b]=[p[i],p[i+1]],L=hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/(L||1),uy=(b[1]-a[1])/(L||1);
      let s=sisa;while(s<=L){o.push([a[0]+ux*s,a[1]+uy*s,ux,uy]);s+=jarak;}sisa=s-L;}return o;};
const lingkar=(x,y,r)=>`M${f(x-r)},${f(y)}a${f(r)},${f(r)} 0 1,0 ${f(2*r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2*r)},0Z`,
  belah=(x,y,ux,uy,a,b)=>`M${f(x-ux*a)},${f(y-uy*a)}L${f(x-uy*b)},${f(y+ux*b)}L${f(x+ux*a)},${f(y+uy*a)}L${f(x+uy*b)},${f(y-ux*b)}Z`;
/* TATAH: pola lubang sepanjang garis → string subpath. u = ukuran dasar (satuan figur). Nama dari sumber; rupa inten/mas-masan
   dirancang dari namanya (dokumen, bagian Akurasi). */
const TATAH={
  bubukan:(p,u)=>sepanjang(p,u*3.1).map(([x,y])=>lingkar(x,y,u)).join(''),                                  // bulat-bulat kecil
  tratasan:(p,u)=>sepanjang(p,u*3.6).map(([x,y,a,b])=>belah(x,y,a,b,u*1.35,u*.55)).join(''),                 // goresan sepanjang garis
  inten:(p,u)=>sepanjang(p,u*3.8).map(([x,y,a,b])=>belah(x,y,a,b,u*1.5,u*.9)).join(''),                       // belah ketupat
  seritan:(p,u)=>sepanjang(p,u*2.1).map(([x,y,a,b])=>belah(x,y,b,-a,u*4.2,u*.42)).join(''),                   // gerigi rambut: tegak lurus garis
  masmasan:(p,u)=>sepanjang(p,u*5.8).map(([x,y,a,b])=>lingkar(x,y,u*.9)+lingkar(x+a*u*1.9,y+b*u*1.9,u*.42)+lingkar(x-a*u*1.9,y-b*u*1.9,u*.42)+lingkar(x-b*u*1.9,y+a*u*1.9,u*.42)+lingkar(x+b*u*1.9,y-a*u*1.9,u*.42)).join('')};   // kuntum perhiasan
const tatah=(jenis,garis,u=4)=>{if(!TATAH[jenis])salah('tatah',`jenis tidak dikenal: ${jenis} (${Object.keys(TATAH).join(' ')})`);return TATAH[jenis](garis,u);};

/* ---------- fisika bayangan: lampu titik ber-api selebar `nyala`, figur sejarak z dari kelir ---------- */
/* perbesaran proyeksi pusat m = d/(d−z); penumbra = nyala·z/(d−z). z dijepit di bawah lampu. Murni, diuji */
const proyeksi=(z,jarak=BLENCONG.jarak,nyala=BLENCONG.nyala)=>{const zz=max(0,min(z,jarak*.85)),d=jarak-zz;return{skala:jarak/d,blur:nyala*zz/d,getar:zz/d};};
/* kedip api: 3 oktaf noise dari t (tanpa akumulasi); kuat 0..1 = pengali terang, dx/dy = geser api (px per kedip) */
const kedipan=(t,seed=BLENCONG.seed,k=BLENCONG.kedip)=>{const a=vnoise(t*5.1,seed),b=vnoise(t*11.3,seed+1),c=vnoise(t*23.7,seed+2),n=.5*a+.3*b+.2*c;
  return{kuat:1-k*.55*n,dx:k*26*(vnoise(t*3.7,seed+3)-.5),dy:k*22*(vnoise(t*4.3,seed+4)-.5)};};
/* cahaya di kelir pada jarak r dari kaki lampu: hukum cos³ + cahaya bias kain */
const terang=(r,d=900)=>.2+.8*(d*d/(d*d+r*r))**1.5;
/* IK dua tulang analitik (rumus sama dengan tokoh.ik). Sudut dari arah bawah ke +x; di luar jangkau dijepit lurus; sisi −1 = siku di bawah */
const ik=(L1,L2,tx,ty,sisi=-1)=>{const d=hypot(tx,ty)||1e-9,dd=min(L1+L2-1e-6,max(abs(L1-L2)+1e-6,d)),a1=atan2(tx,ty)+sisi*acos(max(-1,min(1,(L1*L1+dd*dd-L2*L2)/(2*L1*dd)))),
    bx=L1*sin(a1),by=L1*cos(a1),ex=tx/d*dd,ey=ty/d*dd;return[a1,atan2(ex-bx,ey-by),bx,by,ex,ey];};

/* ---------- gerak: kunci [[t,{x,y,z,miring,putar,tampak,getar,tanganD,tanganB},{durasi,langkah,tinggi,keras}]…] → keadaan murni t ---------- */
const AWAL={x:960,y:0,z:6,miring:0,putar:0,tampak:1,getar:0,tanganD:'anjujur',tanganB:'anjujur'},
  tangan=(v,n)=>{if(typeof v==='string'){if(!POSE[v])salah('figur',`pose tangan tidak dikenal: ${v} (${Object.keys(POSE).join(' ')})`);return POSE[v];}
    if(!Array.isArray(v)||v.length!==2||!v.every(Number.isFinite))salah('figur',`${n} harus nama pose atau [x, y]`);return v;};
function siapKunci(awal,kunci){const a={...AWAL,...awal};a.tanganD=tangan(a.tanganD,'tanganD');a.tanganB=tangan(a.tanganB,'tanganB');let t0=-Infinity;
  const K=(kunci||[]).map(([t,v,o={}],i)=>{if(!(typeof t==='number'&&t>=t0))salah('figur',`kunci harus urut waktu (kunci ${i}: ${t})`);t0=t;
    const w={};for(const k in v){if(!(k in AWAL))salah('figur',`kunci tidak dikenal: ${k} (${Object.keys(AWAL).join(' ')})`);w[k]=k.startsWith('tangan')?tangan(v[k],k):v[k];}return{t,v:w,o,d:o.durasi??.8};});
  K.forEach((k,i)=>{k.dari=hitung(a,K.slice(0,i),k.t);});return{a,K};}
function hitung(a,K,t){const s={...a,bob:0};for(const k of K){if(t<=k.t)break;const u=min(1,(t-k.t)/k.d),e=k.o.keras?1-(1-u)**3:k.o.langkah?u:ss(u);
    for(const n in k.v){const A=k.dari[n],B=k.v[n];s[n]=Array.isArray(B)?[lerp(A[0],B[0],e),lerp(A[1],B[1],e)]:lerp(A,B,e);}
    /* berjalan = hentakan gapit, bukan kaki: bilangan langkah bulat → naik-turun kembali nol di akhir, tanpa lompatan */
    if(k.o.langkah&&k.v.x!=null&&u<1){const n=max(1,round(abs(k.v.x-k.dari.x)/k.o.langkah)),p=sin(PI*u*n);s.y-=(k.o.tinggi??14)*abs(p);s.miring+=(k.o.ayun??1.6)*p;}}
  if(s.getar>0){s.miring+=s.getar*3.6*sin(t*17.3);s.putar+=s.getar*22*sin(t*9.1);}return s;}
const keadaan=(F,t)=>hitung(F.a,F.K,t);

/* ---------- rancangan figur (satuan: tinggi ±1000, telapak y 0, menghadap +x) ---------- */
const KAKI=[[-20,-50],[20,-50],[34,-30],[66,-16],[104,-9],[120,-13,1],[116,-1,1],[-14,0],[-27,-20]],
  KEPALA={alusan:[[8,10],[24,2],[38,-6],[41,-16],[47,-21],[43,-25,1],[49,-31],[46,-38],[78,-48,1],[40,-78],[30,-96],[16,-118],[-20,-128],[-50,-96],[-44,-30],[-14,10]],
    gagahan:[[6,14],[28,8],[44,-2],[48,-15],[55,-20],[50,-25,1],[58,-32],[60,-38],[86,-44],[97,-58,1],[62,-84],[44,-102],[24,-122],[-20,-132],[-54,-98],[-48,-30],[-14,14]],
    raksasa:[[-8,20],[30,24],[58,14],[74,-4],[80,-20],[70,-27,1],[80,-36],[70,-40],[92,-42],[112,-56],[108,-76],[84,-94],[62,-102],[66,-116],[42,-136],[0,-144],[-40,-134],[-70,-102],[-70,-50],[-50,-5]],
    putri:[[8,8],[22,0],[34,-6],[37,-15],[43,-20],[39,-23,1],[44,-29],[41,-36],[68,-46,1],[36,-74],[27,-92],[14,-112],[-20,-122],[-48,-92],[-42,-30],[-12,8]]};
/* gelung: garis luar (koordinat kepala); ukel = ikal ujung lungsen */
const GELUNG={
  'cupit urang':{isi:[[16,-114],[2,-142],[-12,-166],[-30,-192],[-8,-222],[26,-232,1],[-8,-244],[-46,-232],[-68,-196],[-74,-176],[-96,-190],[-116,-224,1],[-124,-182],[-104,-140],[-92,-108],[-74,-84],[-52,-74],[-46,-108],[-20,-124]],
    lungsen:[[-46,-74],[-66,-44],[-78,-4],[-72,36],[-48,52],[-30,42],[-40,28],[-56,26],[-58,-6],[-44,-40],[-34,-66]],serit:[[-84,-130],[-62,-166],[-46,-204],[-14,-230]]},
  'ukel keyongan':{isi:[[16,-108],[-6,-128],[-36,-126],[-60,-112],[-90,-118],[-114,-92],[-112,-62],[-88,-46],[-64,-54],[-52,-70],[-46,-96],[-16,-118]],
    lungsen:[[-44,-60],[-58,-20],[-60,28],[-40,44],[-26,34],[-40,20],[-40,-10],[-34,-40]],serit:[[-58,-112],[-30,-124],[-4,-118]]},
  gembel:{isi:[[42,-132],[30,-156],[6,-150],[-8,-178],[-32,-156],[-56,-176],[-72,-146],[-104,-152],[-104,-118],[-134,-108],[-118,-78],[-142,-54],[-112,-44],[-122,-10],[-92,-14],[-92,22],[-62,4],[-60,-56],[-64,-112],[-24,-140]],
    lungsen:[[-60,0],[-84,34],[-74,66],[-96,92],[-58,92],[-40,62],[-28,28]],serit:[[-112,-92],[-80,-136],[-44,-150],[-4,-156]]}};
/* lengan: [panjang atas, panjang bawah termasuk telapak, lebar] */
const LENGAN={alusan:[240,335,.86],gagahan:[252,345,1.2],raksasa:[262,350,1.72],putri:[214,300,.74]};

function potongLengan(L1,L2,w,cakar){const b=(x,y)=>[x*w,y],
  atas=[b(-15,-13),b(0,-20),b(15,-13),b(15,60),b(12,L1-30),b(11,L1+2),b(0,L1+13),b(-11,L1+2),b(-12,L1-30),b(-15,60)],
  hasta=[b(-11,-11),b(0,-14),b(11,-11),b(13,80),b(9,L2-90),b(9,L2-80),b(-9,L2-80),b(-9,L2-90),b(-12,80)],
  /* telapak: jari rapat melengkung (raksasa: cakar). Bersatu dengan hasta — pakem dua sendi: bahu + siku */
  jari=cakar?[b(-10,L2-82),b(10,L2-82),b(20,L2-58),b(25,L2-28),[29*w,L2+8,1],b(15,L2-26),b(10,L2-44),b(8,L2-4),[6*w,L2+8,1],b(-1,L2-30),b(-3,L2-46),b(-5,L2-14),[-8*w,L2-2,1],b(-11,L2-44),b(-12,L2-62)]
    :[b(-9,L2-82),b(9,L2-82),b(14,L2-60),b(19,L2-34),b(24,L2-12),[33*w,L2+6,1],b(14,L2-6),b(2,L2-22),b(-5,L2-44),b(-10,L2-62)],
  jempol=[b(9,L2-74),b(22,L2-82),[36*w,L2-70,1],b(22,L2-64),b(11,L2-58)];
  return{atas,hasta,jari,jempol};}

/* polilinea dalam poligon: tiap baris y → ruas [x kiri, x kanan] dipotong tepi (titik mentah, cukup untuk penempatan pola) */
const potongBaris=(p,y)=>{const X=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if((a[1]<=y)!==(b[1]<=y))X.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}X.sort((m,n)=>m-n);return X;},
  /* pola penuh di dalam bentuk: selang-seling baris tatah; tepi = jarak aman dari garis luar; lengkung = baris melengkung seperti wiron */
  polaIsi=(p,y0,y1,dy,urut,u,tepi=9,lengkung=0)=>{let s='',i=0;for(let y=y0;y<=y1;y+=dy,i++){const X=potongBaris(p,y);if(X.length<2)continue;const a=X[0]+tepi,c=X[X.length-1]-tepi;if(c-a<12)continue;const n=max(2,round((c-a)/30)),g=[];
      for(let k=0;k<=n;k++){const q=k/n;g.push([a+(c-a)*q,y+lengkung*sin(PI*q)]);}s+=tatah(urut[i%urut.length],g,u*(urut[i%urut.length]==='masmasan'?.92:1));}return s;},
  /* tepi: garis luar disusutkan ke titik beratnya → baris tatah mengikuti bentuk */
  polaTepi=(p,j,u,k=.86)=>{let cx=0,cy=0;p.forEach(q=>{cx+=q[0];cy+=q[1];});cx/=p.length;cy/=p.length;const g=p.map(([x,y])=>[cx+(x-cx)*k,cy+(y-cy)*k]);g.push(g[0]);return tatah(j,g,u);};

/* rancang(jenis, seed) → data murni: {bagian:[{n,d,w}], lubang:string, atas:[…], bahu, panjang lengan}. Seed mengubah motif kain dan sedikit proporsi,
   tidak pernah golongan */
function rancang(jn,seed=1){const J=JENIS[jn],R=mulberry32(seed*7919+jn.length),BG=[],LB=[],ATAS=[],G={},U=.925,
    isi=(n,pts,w)=>{BG.push({n,d:jalur(pts),w});return pts;},ubin=(j,g,u)=>LB.push(tatah(j,g,u)),
    k0=.98+.04*R(),kain=['#7a1f18','#1d3a5e','#245238'][floor(R()*3)],kain2=['#c9402a','#3a6ea0','#3f8a5a'][floor(R()*3)],
    urutKain=[['bubukan','inten'],['masmasan','bubukan'],['inten','tratasan','bubukan']][floor(R()*3)],prada='prada';
  G.warnaKain=[kain,kain2];let bahuD,bahuB,leherP;
  if(jn==='alusan'||jn==='gagahan'){const b=jn==='alusan'?1:1.3;
    bahuD=[80*b,-738];bahuB=[-120*b,-748];leherP=[(jn==='alusan'?24:28)*b,-846];
    isi('badan',ubah([[42,-548],[50,-595],[64,-650],[80,-702],[92,-740],[80,-762],[34,-784],[22,-792],[-18,-794],[-70,-782],[-128,-768],[-140,-748],[-118,-728],[-78,-696],[-54,-640],[-46,-595],[-42,-548]],{sx:b*k0}),prada);
    const wN=jn==='alusan'?1:1.45,dxN=jn==='alusan'?6:18;isi('leher',ubah([[20,-788],[24,-815],[36,-856],[6,-862],[-6,-815],[-16,-786]],{sx:wN,dx:dxN}),prada);
    /* kalung (dua baris), tebah jaja, garis dada + perut */
    ubin('masmasan',[[-34*b,-776],[-12*b,-742],[14*b,-730],[40*b,-742],[60*b,-772]],3.1);ubin('bubukan',[[-22*b,-768],[0,-746],[14*b,-742],[28*b,-750],[48*b,-768]],1.8);
    ubin('bubukan',[[14*b,-722],[12*b,-660],[8*b,-590]],2.1);ubin('tratasan',[[-96*b,-762],[-46*b,-772]],2.4);ubin('tratasan',[[60*b,-694],[42*b,-612]],2.3);ubin('tratasan',[[-48*b,-680],[-36*b,-606]],2.3);
    ubin('inten',[[-46*b,-564],[46*b,-564]],3);ubin('bubukan',[[-44*b,-550],[44*b,-550]],2);}
  if(jn==='alusan'){/* bokongan: kaki merapat, pantat bulat terlihat, kain sampai betis, dua uncal, manggaran di belakang */
    for(const dx of[-64,0]){isi('kaki',[[50+dx,-262],[54+dx,-180],[42+dx,-90],[36+dx,-46],[12+dx,-46],[8+dx,-90],[12+dx,-180],[6+dx,-262]],prada);isi('kaki',ubah(KAKI,{sy:.95,dx:dx+22}),prada);}
    const K=isi('kain',[[46,-556],[62,-500],[74,-420],[80,-340],[84,-268],[70,-250],[30,-236],[-20,-234],[-62,-244],[-84,-280],[-104,-322],[-132,-368],[-138,-412],[-116,-462],[-76,-512],[-48,-556]],'kain');
    /* kunca belakang: jatuh dari pinggang, melengkung ke betis */
    const Kb=isi('kunca',[[-48,-552],[-100,-500],[-140,-430],[-160,-340],[-184,-250],[-188,-170,1],[-152,-246],[-126,-300],[-112,-352],[-96,-430],[-56,-510]],'kain2');
    const Ud=isi('uncal',[[48,-556],[72,-470],[92,-360],[100,-250],[116,-168,1],[84,-230],[70,-330],[56,-450]],'kain2');
    isi('uncal',[[10,-300],[24,-300],[20,-210],[16,-146,1],[8,-210]],'kain2');
    isi('manggaran',[[-44,-566],[-88,-590],[-128,-588,1],[-104,-566],[-132,-540,1],[-90,-542],[-46,-546]],'kain2');
    LB.push(polaIsi(K,-540,-250,16,urutKain,2.1,12,6));LB.push(polaTepi(K,'bubukan',2,.94));
    LB.push(polaTepi(Kb,'tratasan',2.1,.72));LB.push(polaTepi(Ud,'bubukan',1.9,.64));ubin('tratasan',[[-96,-580],[-64,-562]],1.9);
    ubin('tratasan',[[34,-180],[26,-80]],2);ubin('tratasan',[[-30,-180],[-38,-80]],2);}
  if(jn==='gagahan'){/* jangkahan: kaki melebar, kain sampai paha, empat uncal */
    isi('kaki',[[46,-360],[110,-322],[150,-262],[156,-220],[140,-130],[150,-48],[108,-48],[100,-130],[100,-220],[30,-300]],prada);isi('kaki',ubah(KAKI,{dx:126}),prada);
    isi('kaki',[[-30,-360],[-92,-310],[-124,-256],[-128,-214],[-128,-130],[-146,-48],[-104,-48],[-88,-130],[-74,-220],[10,-300]],prada);isi('kaki',ubah(KAKI,{dx:-122}),prada);
    const K=isi('kain',[[60,-556],[100,-500],[136,-420],[158,-350],[178,-316,1],[122,-334],[60,-326],[0,-344],[-66,-328],[-124,-340],[-186,-296,1],[-174,-372],[-140,-452],[-60,-556]],'kain');
    for(const[x,L]of[[140,-204],[70,-236],[-30,-232],[-134,-214]])isi('uncal',[[x-12,-352],[x+14,-352],[x+11,-282],[x+1,L,1],[x-10,-282]],'kain2');
    isi('kunca',[[-60,-552],[-120,-500],[-170,-420],[-210,-330],[-236,-262,1],[-196,-284],[-170,-340],[-138,-424],[-84,-506]],'kain2');
    isi('manggaran',[[-66,-566],[-110,-586],[-150,-580,1],[-128,-562],[-150,-538,1],[-108,-540],[-66,-546]],'kain2');
    LB.push(polaIsi(K,-540,-340,15,urutKain,2.3,12,8));LB.push(polaTepi(K,'bubukan',2.1,.93));
    ubin('tratasan',[[128,-270],[122,-110]],2.3);ubin('tratasan',[[-104,-270],[-116,-110]],2.3);}
  if(jn==='raksasa'){/* gemuk; pakem: hanya tangan depan bersendi, tangan belakang digambar tetap malang kerik */
    bahuD=[118,-762];bahuB=null;leherP=[50,-826];
    isi('badan',ubah([[112,-540],[156,-596],[172,-664],[162,-730],[142,-782],[92,-818],[-20,-830],[-112,-824],[-184,-792],[-190,-744],[-140,-696],[-116,-622],[-98,-540]],{sx:k0}),prada);
    const Lt=isi('lenganTetap',[[-168,-802],[-222,-764],[-294,-690],[-322,-640],[-300,-604],[-214,-572],[-122,-548],[-92,-566],[-112,-596],[-210,-624],[-246,-652],[-204,-704],[-144,-746]],prada);
    isi('leher',[[70,-806],[86,-842],[16,-856],[-22,-816]],prada);
    isi('kaki',[[70,-380],[186,-320],[234,-262],[238,-216],[214,-130],[232,-52],[166,-52],[150,-130],[140,-226],[20,-300]],prada);isi('kaki',ubah(KAKI,{s:1.4,dx:186}),prada);
    isi('kaki',[[-60,-380],[-160,-312],[-204,-256],[-210,-210],[-192,-130],[-222,-52],[-154,-52],[-130,-130],[-100,-226],[20,-300]],prada);isi('kaki',ubah(KAKI,{s:1.4,dx:-180}),prada);
    const K=isi('kain',[[112,-556],[168,-480],[214,-400],[246,-344],[266,-308,1],[176,-340],[80,-326],[0,-352],[-90,-332],[-170,-348],[-262,-286,1],[-240,-372],[-176,-470],[-98,-556]],'kain');
    for(const[x,L]of[[196,-196],[96,-234],[-44,-230],[-184,-200]])isi('uncal',[[x-16,-352],[x+18,-352],[x+14,-280],[x+1,L,1],[x-13,-280]],'kain2');
    ubin('masmasan',[[-110,-808],[-60,-750],[20,-716],[96,-748],[136,-790]],3.8);ubin('bubukan',[[-90,-802],[-40,-758],[20,-734],[86,-760],[122,-796]],2.4);
    ubin('inten',[[-96,-566],[116,-566]],3.8);ubin('bubukan',[[-98,-550],[112,-550]],2.4);ubin('tratasan',[[-92,-690],[-68,-620],[10,-596],[100,-602],[148,-650]],2.6);
    ubin('seritan',[[30,-690],[44,-650],[66,-640]],2.2);ubin('seritan',[[-44,-700],[-34,-660]],2.2);
    LB.push(polaIsi(K,-542,-340,17,urutKain,2.7,14,10));LB.push(polaTepi(K,'bubukan',2.4,.93));LB.push(tatah('bubukan',[[-178,-776],[-262,-680],[-282,-640],[-250,-612],[-150,-570]],2.6));
    ubin('inten',[[-250,-642],[-214,-618]],2.8);ubin('tratasan',[[192,-270],[186,-110]],2.6);ubin('tratasan',[[-150,-270],[-170,-110]],2.6);}
  if(jn==='putri'){/* kain panjang menjuntai menyentuh tanah (samparan), kedua kaki sejajar, tangan hampir menyentuh telapak */
    bahuD=[54,-722];bahuB=[-92,-734];leherP=[14,-846];
    isi('kaki',ubah(KAKI,{s:.74,dx:46}),prada);isi('kaki',ubah(KAKI,{s:.74,dx:-22}),prada);
    const K=isi('kain',[[38,-540],[52,-440],[62,-300],[70,-120],[76,-36],[34,-26],[-46,-26],[-108,-22],[-184,-10],[-268,-2,1],[-204,-44],[-146,-160],[-112,-300],[-96,-420],[-40,-540]],'kain');
    const Kb=isi('uncal',[[-40,-540],[-74,-470],[-112,-424,1],[-68,-424],[-98,-336,1],[-44,-400],[-22,-520]],'kain2');
    isi('badan',[[38,-540],[48,-610],[60,-660],[66,-712],[56,-744],[20,-770],[-8,-772],[-58,-760],[-106,-744],[-110,-726],[-76,-704],[-46,-664],[-40,-600],[-40,-540]],prada);
    isi('pasemekan',[[58,-628],[60,-676],[46,-696],[-44,-684],[-46,-628]],'kain2');
    isi('leher',[[16,-768],[20,-800],[30,-850],[4,-856],[-6,-800],[-12,-766]],prada);
    ubin('inten',[[-46,-690],[46,-696]],2.5);ubin('bubukan',[[-42,-634],[56,-634]],2);ubin('masmasan',[[-18,-764],[8,-722],[36,-750]],2.5);ubin('inten',[[-42,-550],[38,-550]],2.6);
    LB.push(polaIsi(K,-530,-40,15,urutKain,1.9,11,4));LB.push(polaTepi(Kb,'bubukan',1.8,.7));ubin('bubukan',[[-108,-310],[-156,-130],[-232,-14]],2);}
  /* siten-siten: pijakan kulit di bawah telapak; jangkahan lebih panjang */
  const sit=J.sikap==='jangkahan'?(jn==='raksasa'?[-300,350]:[-220,270]):J.sikap==='samparan'?[-120,150]:[-110,160];
  isi('siten',[[sit[0],0,1],[sit[1],0,1],[sit[1]+12,7,1],[sit[1],14,1],[sit[0],14,1],[sit[0]-12,7,1]],'kain2');ubin('bubukan',[[sit[0]+10,7],[sit[1]-10,7]],2.2);
  /* kepala: tunduk/tengadah = pakem golongan */
  const k=jn==='raksasa'?1.5:jn==='gagahan'?1.12:1.08,C={s:k,r:J.tunduk,dx:leherP[0],dy:leherP[1]},Gl=GELUNG[J.gelung],T=p=>ubah(p,C),T1=(x,y)=>T([[x,y]])[0];
  isi('rambut',T(Gl.isi),'rambut');isi('rambut',T(Gl.lungsen),'rambut');isi('muka',T(KEPALA[jn]),'muka');
  ubin('seritan',T(Gl.serit),jn==='raksasa'?2.7:2);
  if(J.gelung==='cupit urang'){/* jamang di dahi + garuda mungkur di belakang gelung */
    isi('perhiasan',T([[20,-108],[30,-120],[-2,-146],[-46,-136],[-44,-120],[-6,-126]]),prada);ubin('bubukan',T([[14,-120],[-36,-132]]),1.7);
    const Gm=isi('perhiasan',T([[-96,-146],[-128,-158],[-146,-136],[-138,-112],[-154,-90],[-132,-72],[-104,-80],[-80,-96]]),prada);LB.push(polaTepi(T([[-96,-146],[-128,-158],[-146,-136],[-138,-112],[-154,-90],[-132,-72],[-104,-80],[-80,-96]]),'bubukan',1.9,.66));}
  if(J.gelung==='ukel keyongan'){const S=[];for(let a=0;a<4.4*PI;a+=.5)S.push([-84+cos(a)*(3+a*1.9),-84+sin(a)*(3+a*1.9)]);ubin('bubukan',T(S),1.6);
    isi('perhiasan',T([[16,-106],[28,-118],[-4,-138],[-38,-130],[-36,-116],[-6,-122]]),prada);ubin('bubukan',T([[10,-118],[-30,-126]]),1.5);}
  /* sumping */isi('perhiasan',T(jn==='raksasa'?[[-10,-84],[-34,-104],[-52,-70],[-46,-30],[-24,-6,1],[-16,-44]]:[[-6,-76],[-24,-98],[-46,-70],[-40,-38],[-22,-20,1],[-10,-44]]),prada);ubin('bubukan',T([[-16,-82],[-30,-50]]),1.6);
  ubin('tratasan',T([[-40,-18],[-14,-2]]),1.5);   // garis trilaksana kanta di leher
  /* mata + mulut sebagai tatah: bentuk menentukan golongan */
  if(J.mata==='gabahan'){const[a,b,c]=jn==='putri'?[14,-68,.92]:[15,-72,1];LB.push(jalur(T([[a,b,1],[a+13*c,b-5.5*c],[a+29*c,b+1.5,1],[a+13*c,b+3.5*c]])));ubin('tratasan',T([[10,-90],[-6,-100]]),1.4);}
  if(J.mata==='kedhelen'){LB.push(jalur(T([[16,-78],[32,-88],[47,-78],[36,-66],[20,-68]])));ATAS.push({n:'mata',d:lingkar(...T1(33,-77),5),w:'hitamMata'});ubin('tratasan',T([[14,-96],[-6,-104]]),1.5);}
  if(J.mata==='plelengan'){const[x,y]=T1(46,-100);LB.push(lingkar(x,y,12.5*k));ATAS.push({n:'mata',d:lingkar(x,y,5.8*k),w:'hitamMata'});ubin('tratasan',T([[-2,-120],[-44,-104]]),2);ubin('tratasan',T([[26,-74],[10,-60]]),1.7);}
  if(J.mulut==='rapat')ubin('tratasan',T([[22,-25],[40,-25]]),1.4);
  if(J.mulut==='gusen'){/* gusen: mulut lebar sampai bawah mata, gusi + gigi + taring tetap kulit */
    LB.push(jalur(T([[72,-27,1],[40,-40],[10,-46],[-8,-34],[6,-14],[34,-4],[66,-12,1]])));
    ATAS.push({n:'gusi',d:jalur(T([[72,-27,1],[40,-40],[10,-46],[-8,-34],[20,-31],[60,-22]])),w:'merahGusi'});
    for(const x of[58,48,38,28,18])ATAS.push({n:'gigi',d:jalur(T([[x,-30+(58-x)*-.08,1],[x+7,-29+(58-x)*-.08,1],[x+3,-17+(58-x)*-.08,1]])),w:'gading'});
    ATAS.push({n:'gigi',d:jalur(T([[-2,-34,1],[8,-34,1],[6,-6,1]])),w:'gading'});ATAS.push({n:'gigi',d:jalur(T([[54,-12,1],[42,-8,1],[56,-44,1]])),w:'gading'});   // taring atas + bawah
    isi('perhiasan',T([[34,-124],[66,-118],[74,-104],[40,-108]]),'rambut');ubin('seritan',T([[-30,10],[12,22],[50,14]]),2.2);}
  /* lengan */
  const[L1,L2,w]=LENGAN[jn],Pot=potongLengan(L1,L2,w,jn==='raksasa');Object.assign(G,{L:[L1,L2],bahuD,bahuB,Pot});
  G.lubangAtas=lingkar(0,0,3)+tatah('bubukan',[[0,16],[0,34]],1.9)+tatah('inten',[[-13*w,50],[13*w,50]],2.3)+tatah('bubukan',[[-13*w,62],[13*w,62]],1.6)+tatah('tratasan',[[0,90],[0,L1-40]],2);
  G.lubangHasta=lingkar(0,0,2.6)+tatah('tratasan',[[0,30],[0,L2-140]],2)+tatah('inten',[[-10*w,L2-112],[10*w,L2-112]],2.2)+tatah('bubukan',[[-9*w,L2-96],[9*w,L2-96]],1.5);
  Object.assign(G,{bagian:BG,atas:ATAS,lubang:LB.join(''),J,jn,seed,U,R:null});return G;}

/* GUNUNGAN (kayon, jenis gapuran): siluet gunung meruncing; satu sisi = gerbang berpenjaga, kalpataru dililit naga, banteng berhadapan
   harimau, kera, burung; sisi balik = api merah. Data simetris kecuali hewan berhadapan. lapis urut bawah → atas: positif digambar di atas
   bidang dalam yang dilubangi seluruhnya */
const GARIS_K=cermin([[0,-1000,1],[24,-935],[62,-830],[132,-700],[226,-545],[292,-410],[304,-300],[272,-195],[196,-132],[150,-104,1],[172,-84],[172,-38],[226,-20],[226,0,1],[0,0,1]]);
function rancangKayon(seed=1){const R=mulberry32(seed*104729),L=[],c=(d,w,g)=>L.push({d,w,g}),garis=(p,w,lb)=>L.push({d:jalur(p,0),w,g:lb});
  /* batang tapering + dahan spiral berpasangan */
  c(jalur([[-22,-210],[-15,-380],[-9,-600],[-4,-800],[0,-905,1],[4,-800],[9,-600],[15,-380],[22,-210]]),'batang');
  const daun=[],dahan=[];
  for(let i=0;i<9;i++){const y=-270-i*72,len=(1-i/10)*(.6+.4*sin(PI*(i+2.5)/10)),A=250*len;
    for(const s of[-1,1]){const j=.92+.16*R(),a=[[s*5,y],[s*A*.35*j,y-46*j],[s*A*.72*j,y-58],[s*A*j,y-18],[s*A*.84*j,y+24],[s*A*.58*j,y+6],[s*A*.66*j,y-22]];
      dahan.push(a);const u=[[s*A*.28,y-30],[s*A*.42,y+26],[s*A*.46,y+58]];dahan.push(u);
      for(const[q,o]of[[a,0],[u,1]])for(let k=1;k<q.length;k++){const[x,yy]=q[k],th=atan2(q[k][1]-q[k-1][1],q[k][0]-q[k-1][0]),n=o?2:3;
        for(let m=0;m<n;m++){const b=th+(m-1)*1.05+(R()-.5)*.25,l=(19+12*R())*(.72+.3*len),px=x+cos(b)*l*.3,py=yy+sin(b)*l*.3;
          daun.push(jalur(ubah([[0,0,1],[l*.55,-l*.3],[l*1.15,0,1],[l*.55,l*.3]],{r:b/RAD,dx:px,dy:py})));}}}}
  for(const a of dahan)garis(a,'dahan');
  c(daun.join(''),'daun');
  /* naga melilit batang */
  const N=[];for(let t=0;t<=1;t+=.025){const y=-250-470*t,x=(14+9*sin(t*PI))*sin(t*PI*9);N.push([x,y]);}garis(N,'naga');c(jalur(ubah([[0,-13],[24,-12],[34,0,1],[20,8],[0,10]],{dx:N[N.length-1][0],dy:N[N.length-1][1]})),'naga');
  /* banaspati: wajah kala di tengah batang */
  const by=-560,By=(p,s=1)=>ubah(p,{s,dy:by});
  c(jalur(By([[-72,-36],[-54,-78],[-20,-64],[0,-84],[20,-64],[54,-78],[72,-36],[60,16],[32,48],[0,60],[-32,48],[-60,16]])),'banaspati');
  /* banteng ↔ harimau berhadapan di kaki pohon */
  const banteng=[[-186,-276],[-172,-302],[-130,-310],[-92,-306],[-70,-318],[-56,-338,1],[-50,-314],[-34,-308,1],[-44,-288],[-54,-276],[-66,-272],[-74,-240],[-84,-222,1],[-96,-240],[-100,-262],[-150,-262],[-156,-240],[-168,-222,1],[-176,-246],[-178,-262],[-200,-278],[-204,-250,1]],
    macan=[[186,-280],[160,-300],[120,-302],[86,-300],[64,-316],[42,-308],[34,-292],[46,-284],[48,-274],[70,-268],[80,-240],[90,-222,1],[100,-240],[108,-262],[152,-262],[160,-240],[172,-222,1],[180,-246],[184,-268],[208,-296],[232,-308,1],[216,-280],[196,-266]];
  c(jalur(banteng),'banteng');c(jalur(macan),'macan');
  /* kera di dahan tengah + sepasang burung dekat puncak */
  const kera=(x,y,s)=>jalur(ubah([[0,-20],[12,-14],[14,0],[22,14],[16,24,1],[8,12],[0,16],[-8,12],[-16,24,1],[-20,10],[-14,0],[-12,-14]],{s:Math.abs(s),sx:s,dx:x,dy:y})),
    burung=(x,y,s)=>jalur(ubah([[0,0],[18,-12],[34,-12],[46,-6,1],[34,-2],[24,4],[10,20,1],[-4,8],[-28,4,1],[-12,0]],{sx:s,dx:x,dy:y}));
  c(kera(-120,-480,1.05)+kera(120,-480,-1.05),'kera');c(burung(-52,-812,1)+burung(52,-812,-1)+burung(-86,-668,1)+burung(86,-668,-1),'burung');
  /* gapura + atap bertingkat + pintu tertutup, dua penjaga bersenjata, dua kepala naga bersayap, tangga */
  c(jalur(cermin([[0,-236,1],[34,-226],[44,-208],[72,-204,1],[58,-186],[84,-180,1],[66,-160],[52,-158],[52,-92],[66,-92,1],[66,-74,1],[0,-74,1]])),'gapura');
  const penjaga=s=>jalur(ubah([[0,-128],[14,-118],[14,-100],[32,-92],[44,-66],[40,-40],[30,-30],[34,-4,1],[10,-4,1],[6,-30],[-6,-30],[-10,-4,1],[-34,-4,1],[-30,-30],[-38,-62],[-30,-90],[-14,-100],[-14,-118]],{sx:s,dx:s*118,dy:-52}))
    +jalur(ubah([[-4,-90],[8,-90],[12,-160,1],[0,-168,1],[-6,-160,1]],{sx:s,dx:s*162,dy:-60}));
  c(penjaga(1)+penjaga(-1),'penjaga');
  c(jalur(ubah([[-20,-30],[-60,-58],[-96,-48],[-112,-20,1],[-82,-24],[-66,-6],[-40,-8]],{dx:-62,dy:-190}))+jalur(ubah([[20,-30],[60,-58],[96,-48],[112,-20,1],[82,-24],[66,-6],[40,-8]],{dx:62,dy:-190})),'naga');
  c(jalur(cermin([[0,-74,1],[160,-74,1],[172,-44,1],[226,-20,1],[226,0,1],[0,0,1]])),'lapik');
  /* lubang atas positif: pintu, mata kala, mulut kala, bubukan */
  const lub=jalur(ubah([[-22,-30],[-10,-44],[10,-44],[22,-30],[22,14],[-22,14]],{dy:-116}))+lingkar(-26,by-26,12)+lingkar(26,by-26,12)+jalur(By([[-34,8],[34,8],[20,34],[-20,34]]))
    +tatah('bubukan',[[-38,-178],[38,-178]],2.6)+tatah('bubukan',[[-150,-54],[150,-54]],3.2)+tatah('inten',[[-210,-10],[210,-10]],3.4)
    +tatah('tratasan',[[-54,by-44],[-34,by-60]],2)+tatah('tratasan',[[54,by-44],[34,by-60]],2)+tatah('bubukan',[[-58,by+4],[-34,by+40],[34,by+40],[58,by+4]],2.2);
  return{garis:GARIS_K,lapis:L,lubang:lub};}

/* ---------- WARNA sisi dalang (sunggingan disederhanakan: warna rata + gradien + tepi) ---------- */
const WARNA_K={batang:'#c89838',dahan:'#a9782c',daun:'#3f7f54',naga:'#d0a640',banaspati:'#b5281c',banteng:'#2a1d18',macan:'#c47a24',kera:'#7a4a24',burung:'#c9402a',gapura:'#d5ab50',penjaga:'#8a2a1e',lapik:'#b5281c',bidang:'#14100c'};
const warnaDari=(G,w)=>w==='prada'?'#d3a443':w==='muka'?MUKA[G.muka].warna:w==='kain'?G.warnaKain[0]:w==='kain2'?G.warnaKain[1]:w==='rambut'?'#14100c':w==='gading'?'#efe6cc':w==='merahGusi'?'#a01e16':w==='hitamMata'?'#0c0806':w;

const kanvasBaru=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
/* panggang satu lapis wayang ke kanvas: warna 0 = siluet bayang (warna gelap kelir), 1 = lukisan */
const WARNA_BAYANG='#120805';
function pangkatFigur(G,res,warna){const u=res*G.U,x0=-420,y0=-1120,lebar=860,tinggi=1160,c=kanvasBaru(ceil(lebar*u),ceil(tinggi*u)),x=c.getContext('2d');
  x.setTransform(u,0,0,u,-x0*u,-y0*u);
  for(const b of G.bagian){const P=new Path2D(b.d);x.fillStyle=warna?warnaDari(G,b.w):WARNA_BAYANG;x.fill(P);if(warna){x.strokeStyle='rgba(40,20,8,.75)';x.lineWidth=1.6;x.stroke(P);}}
  x.globalCompositeOperation='destination-out';x.fill(new Path2D(G.lubang));x.globalCompositeOperation='source-over';
  for(const b of G.atas){x.fillStyle=warna?warnaDari(G,b.w):WARNA_BAYANG;x.fill(new Path2D(b.d));}
  return{c,u,x0,y0};}
function pangkatLengan(G,res,warna){const[L1,L2]=G.L,P=G.Pot,u=res*G.U,w=120,c1=kanvasBaru(ceil(w*u),ceil((L1+50)*u)),c2=kanvasBaru(ceil(w*u),ceil((L2+50)*u)),
    gambar=(c,parts,lb,warnaI)=>{const x=c.getContext('2d');x.setTransform(u,0,0,u,w/2*u,30*u);for(const p of parts){const q=new Path2D(jalur(p));x.fillStyle=warna?warnaI:WARNA_BAYANG;x.fill(q);if(warna){x.strokeStyle='rgba(40,20,8,.75)';x.lineWidth=1.4;x.stroke(q);}}
      x.globalCompositeOperation='destination-out';x.fill(new Path2D(lb));x.globalCompositeOperation='source-over';},pr=warnaDari(G,'prada');
  gambar(c1,[P.atas],G.lubangAtas,pr);gambar(c2,[P.hasta,P.jempol,P.jari],G.lubangHasta,pr);return{c1,c2,u,w};}
function pangkatKayon(D,res,warna,balik){const u=res,lb=660,tg=1040,c=kanvasBaru(ceil(lb*u),ceil(tg*u)),x=c.getContext('2d'),O=new Path2D(jalur(D.garis));
  x.setTransform(u,0,0,u,lb/2*u,1020*u);x.lineCap='round';x.lineJoin='round';
  if(balik){/* sisi balik: hanya api merah (Wikipedia, Gunungan) — lidah api dirancang dari kode */
    const g=x.createLinearGradient(0,-1000,0,0);g.addColorStop(0,'#f2c040');g.addColorStop(.45,'#d9531e');g.addColorStop(1,'#7a140c');x.fillStyle=g;x.fill(O);
    x.fillStyle='#f6d460';const Rn=mulberry32(77);for(let i=0;i<46;i++){const X=(Rn()-.5)*460,Y=-Rn()*860-60,l=30+60*Rn();if(abs(X)>.33*(1000+Y))continue;x.fill(new Path2D(jalur([[X-l*.3,Y+l*.4],[X+l*.04,Y-l,1],[X+l*.32,Y+l*.4],[X,Y+l*.55]])));}
  }else{x.fillStyle=warna?'#c9a050':WARNA_BAYANG;x.fill(O);
    /* bidang dalam: lubangi seluruhnya, sisakan bingkai; positif digambar kembali */
    x.save();x.scale(.962,.975);x.translate(0,-10);x.globalCompositeOperation='destination-out';x.fill(O);x.restore();x.globalCompositeOperation='source-over';
    for(const l of D.lapis){const warnaP=warna?WARNA_K[l.w]||'#c9a050':WARNA_BAYANG,P=new Path2D(l.d);
      if(l.g||l.w==='dahan'){x.strokeStyle=warnaP;x.lineWidth=l.w==='naga'?8:5.6;x.stroke(P);}else{x.fillStyle=warnaP;x.fill(P);}}
    x.globalCompositeOperation='destination-out';x.fill(new Path2D(D.lubang));x.globalCompositeOperation='source-over';}
  if(warna){x.strokeStyle='rgba(50,24,8,.9)';x.lineWidth=2;x.stroke(O);}
  return{c,u,x0:-lb/2,y0:-1020,balik};}

/* ---------- panggung: satu kanvas layar penuh ---------- */
const PANGGUNG={c:null,figur:[],opsi:null};
const SISI=['bayang','dalang'];
function panggung(o={}){const D={dasar:980,sisi:'bayang',simping:true,seed:5,res:1.25,tinggi:560};for(const k in o)if(!(k in D))salah('panggung',`opsi tidak dikenal: ${k} (${Object.keys(D).join(' ')})`);
  const p={...D,...o};if(!SISI.includes(p.sisi))salah('panggung',`sisi tidak dikenal: ${p.sisi} (${SISI.join(' ')})`);
  const c=kanvasBaru(W,H);c.className='wv-wayang';c.style.cssText='position:absolute;left:0;top:0;pointer-events:none';$('#stage').prepend(c);
  const S=kanvasBaru(W,H);Object.assign(PANGGUNG,{c,x:c.getContext('2d'),S,xs:S.getContext('2d',{}),figur:[],opsi:p,kelir:bakeKelir(p)});
  if(p.simping)bakeSimpingan(p);
  rantaiUpdate(gambar);gambar();return c;}

/* kelir: kain putih + serat + kolam cahaya statis + lis gelap; debog di dasar = bayangan batang pisang */
function bakeKelir(p){const c=kanvasBaru(W,H),x=c.getContext('2d'),B=BLENCONG,g=x.createRadialGradient(B.x,B.y,0,B.x,B.y,1300);
  for(const[r,w]of[[0,'#fff6d8'],[.1,'#ffe8b2'],[.28,'#f8cf88'],[.5,'#e4a258'],[.74,'#a9612a'],[1,'#532611']])g.addColorStop(r,w);x.fillStyle=g;x.fillRect(0,0,W,H);
  /* serat + kerut: dipanggang per piksel sekali (setup), noise ber-seed */
  const im=x.getImageData(0,0,W,H),d=im.data,R=mulberry32(p.seed);
  for(let j=0,i=0;j<H;j++){const a=.985+.015*Math.sin(j*2.09),kerut=1+.018*(vnoise(j/170,p.seed+9)-.5);for(let q=0;q<W;q++,i+=4){const v=a*(.992+.012*R())*(.985+.015*Math.sin(q*1.91))*kerut;d[i]*=v;d[i+1]*=v;d[i+2]*=v;}}
  x.putImageData(im,0,0);
  /* lis kelir atas (hitam/merah menurut sumber) */
  x.fillStyle='#1b0a06';x.fillRect(0,0,W,30);
  /* bayangan debog (sisi bayang) */
  const y=p.dasar;
  x.filter='blur(5px)';x.fillStyle='#0c0503';x.fillRect(-20,y+2,W+40,H-y+30);x.filter='none';
  return c;}
/* simpingan: wayang simpingan menancap di debog di kedua sisi; tinggi menurun dari ujung debog ke tengah; muka membelakangi tempat
   perkeliran (sumber: Subagya 2013). x = koordinat layar sisi BAYANG, jadi simpingan kanan dalang ada di kiri layar */
function bakeSimpingan(p){const Lb=kanvasBaru(W,H),xB=Lb.getContext('2d'),warna=p.sisi==='dalang',Lw=warna?kanvasBaru(W,H):null,xW=warna?Lw.getContext('2d'):null,R=mulberry32(p.seed*31);
  const baris=(sisi,ragam,x0,dx,hadap)=>{for(let i=0;i<9;i++){const jn=ragam[i%ragam.length],G=rancang(jn,floor(R()*1e4)),k=(1.12-.06*i)*JENIS[jn].tinggi*p.tinggi/1000;
      G.muka=JENIS[jn].muka;gambarDiam(xB,G,x0+i*dx,p.dasar,k,hadap,p,0);if(warna)gambarDiam(xW,G,x0+i*dx,p.dasar,k,hadap,p,1);}};
  baris('kanan',['gagahan','alusan','alusan','putri','gagahan','alusan','putri','alusan','putri'],36,44,-1);
  baris('kiri',['raksasa','raksasa','gagahan','raksasa','gagahan','gagahan','raksasa','gagahan','gagahan'],W-36,-44,1);
  /* siluet simpingan masuk kelir dipanggang (tajam: menempel kelir), warnanya lapisan terpisah di sisi dalang */
  PANGGUNG.kelir.getContext('2d').globalAlpha=.94;PANGGUNG.kelir.getContext('2d').drawImage(Lb,0,0);PANGGUNG.kelir.getContext('2d').globalAlpha=1;PANGGUNG.simpingWarna=Lw;}
/* figur diam: gambar langsung vektor (tanpa sprite) ke kanvas pemanggang, lengan menjuntai */
function gambarDiam(x,G,gx,gy,k,hadap,p,warna){const s=pangkatFigur(G,p.res,warna),u=s.u,L=pangkatLengan(G,p.res,warna),S=k*G.U/u/G.U;
  x.setTransform(k*hadap,0,0,k,gx,gy);const dA=[0,0],draw=(c,cx,cy)=>{x.drawImage(c,cx,cy,c.width/u,c.height/u);};
  /* semua dalam satuan figur × U */
  x.setTransform(k*hadap,0,0,k,gx,gy);
  const lengan=(b,sudut)=>{if(!b)return;const[L1,L2]=G.L,bx=b[0]*G.U,by=b[1]*G.U,a=sudut*RAD,ca=cos(-a),sa=sin(-a);
    x.setTransform(k*hadap*ca,k*sa,-k*hadap*sa,k*ca,gx+k*hadap*bx,gy+k*by);x.drawImage(L.c1,-L.w/2*G.U,-30*G.U,L.c1.width/u*G.U,L.c1.height/u*G.U);
    const ex=-sin(-a)*L1*G.U,ey=cos(-a)*L1*G.U,a2=(sudut+8)*RAD,c2=cos(-a2),s2=sin(-a2);
    x.setTransform(k*hadap*c2,k*s2,-k*hadap*s2,k*c2,gx+k*hadap*(bx+ex),gy+k*(by+ey));x.drawImage(L.c2,-L.w/2*G.U,-30*G.U,L.c2.width/u*G.U,L.c2.height/u*G.U);};
  if(G.bahuB)lengan(G.bahuB,-6);x.setTransform(k*hadap,0,0,k,gx,gy);x.drawImage(s.c,s.x0*G.U,s.y0*G.U,s.c.width/u*G.U,s.c.height/u*G.U);lengan(G.bahuD,6);x.setTransform(1,0,0,1,0,0);}

/* figur(o) → objek; digambar tiap frame. o: jenis alusan|gagahan|raksasa|putri|gunungan, x, seed, muka, hadap kanan|kiri, tinggi (px, bawaan pakem × panggung.tinggi), kunci */
function figur(o={}){const p=PANGGUNG.opsi||salah('figur','panggil wayang.panggung() dulu');const D={jenis:'alusan',x:960,z:6,y:0,seed:1,muka:null,hadap:'kanan',tinggi:null,kunci:null,tanganD:'anjujur',tanganB:'anjujur',miring:0,putar:0,tampak:1,getar:0};
  for(const k in o)if(!(k in D))salah('figur',`opsi tidak dikenal: ${k} (${Object.keys(D).join(' ')})`);
  const O={...D,...o};if(O.jenis==='panakawan')salah('figur','panakawan belum ada: bentuknya khas per tokoh bernama (Semar, Gareng, Petruk, Bagong), lihat references/wayang.md');
  if(O.jenis!=='gunungan'&&!JENIS[O.jenis])salah('figur',`jenis tidak dikenal: ${O.jenis} (${Object.keys(JENIS).join(' ')} gunungan)`);
  if(!['kanan','kiri'].includes(O.hadap))salah('figur',`hadap tidak dikenal: ${O.hadap} (kanan kiri)`);
  if(O.muka&&!MUKA[O.muka])salah('figur',`muka tidak dikenal: ${O.muka} (${Object.keys(MUKA).join(' ')})`);
  const F=siapKunci({x:O.x,y:O.y,z:O.z,miring:O.miring,putar:O.putar,tampak:O.tampak,getar:O.getar,tanganD:O.tanganD,tanganB:O.tanganB},O.kunci),warna=p.sisi==='dalang',
    kayon=O.jenis==='gunungan',s=(kayon?1.5:JENIS[O.jenis].tinggi)*(O.tinggi||p.tinggi)/1000;
  Object.assign(F,{jenis:O.jenis,k:s,h:O.hadap==='kiri'?-1:1,kayon});
  if(kayon){const D2=rancangKayon(O.seed);F.G=D2;F.sb=pangkatKayon(D2,p.res*1.15,0);if(warna){F.sw=pangkatKayon(D2,p.res*1.15,1);F.swb=pangkatKayon(D2,p.res*1.15,1,1);}}
  else{const G=rancang(O.jenis,O.seed);G.muka=O.muka||JENIS[O.jenis].muka;F.G=G;F.sb=pangkatFigur(G,p.res,0);F.lb=pangkatLengan(G,p.res,0);if(warna){F.sw=pangkatFigur(G,p.res,1);F.lw=pangkatLengan(G,p.res,1);}}
  PANGGUNG.figur.push(F);return F;}

const kali=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]],
  /* matriks ruang figur (telapak di 0,0, satuan figur) → px kelir */
  mFigur=(F,S,dasar)=>{const a=S.miring*RAD,cp=cos(S.putar*RAD),h=F.h*F.k*cp,k=F.k,c=cos(a),s=sin(a);return[h*c,h*s,-k*s,k*c,S.x,dasar+S.y];};
/* lengan sebagai data murni: sudut bahu & siku menurut target telapak (posisi tuding) */
const poseLengan=(G,bahu,tgt)=>{const U=G.U,[L1,L2]=G.L,bx=bahu[0]*U,by=bahu[1]*U,[a1,a2,ex,ey,hx,hy]=ik(L1*U,L2*U,tgt[0]-bx,tgt[1]-by);return{a1,a2,bahu:[bx,by],siku:[bx+ex,by+ey],telapak:[bx+hx,by+hy]};};

function gambarFigur(x,F,S,M,warna,p){const res=warna?F.sw:F.sb;
  const pakai=(m)=>x.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]);
  if(F.kayon){const balik=warna&&cos(S.putar*RAD)<0,sp=balik?F.swb:res;pakai(M);x.drawImage(sp.c,sp.x0,sp.y0,sp.c.width/sp.u,sp.c.height/sp.u);
    /* gapit: batang tanduk memanjang di tengah */
    if(!warna||1){x.strokeStyle=warna?'#6a4628':WARNA_BAYANG;x.lineWidth=5;x.beginPath();x.moveTo(0,-880);x.lineTo(0,200);x.stroke();}return;}
  const G=F.G,U=G.U,L=warna?F.lw:F.lb,lengan=(P)=>{const m1=kali(M,[cos(-P.a1),sin(-P.a1),-sin(-P.a1),cos(-P.a1),P.bahu[0],P.bahu[1]]);pakai(m1);x.drawImage(L.c1,-L.w/2*U,-30*U,L.c1.width/L.u*U,L.c1.height/L.u*U);
      const m2=kali(M,[cos(-P.a2),sin(-P.a2),-sin(-P.a2),cos(-P.a2),P.siku[0],P.siku[1]]);pakai(m2);x.drawImage(L.c2,-L.w/2*U,-30*U,L.c2.width/L.u*U,L.c2.height/L.u*U);},
    rotan=(P,c)=>{pakai(M);x.strokeStyle=c;x.lineWidth=3.2;x.beginPath();x.moveTo(P.telapak[0],P.telapak[1]);const dx=P.telapak[0]*.14+18,y1=460;x.lineTo(P.telapak[0]+dx,y1);x.stroke();};
  const warnaR=warna?'#5a3a20':WARNA_BAYANG,D=G.bahuD&&poseLengan(G,G.bahuD,S.tanganD),B=G.bahuB&&poseLengan(G,G.bahuB,S.tanganB);
  if(B){lengan(B);rotan(B,warnaR);}
  pakai(M);x.drawImage(res.c,res.x0*U,res.y0*U,res.c.width/res.u*U,res.c.height/res.u*U);
  /* gapit: dua bilah tanduk mengapit badan dari kepala menembus telapak ke debog */
  pakai(M);x.strokeStyle=warnaR;x.lineWidth=5.5;x.beginPath();x.moveTo(6,-880);x.lineTo(2,-520);x.lineTo(0,240);x.stroke();
  if(D){lengan(D);rotan(D,warnaR);}}

/* frame: kelir → bayangan semua figur (proyeksi + blur menurut z) → lukisan figur (sisi dalang) → cahaya kedip */
function gambar(){const P=PANGGUNG;if(!P.c||!P.c.isConnected)return;const t=tl.time(),x=P.x,xs=P.xs,p=P.opsi,B=BLENCONG,K=kedipan(t,B.seed,B.kedip),warna=p.sisi==='dalang',
    z=typeof CAM!=='undefined'?CAM.zoom:1,fx=typeof CAM!=='undefined'?CAM.fx:W/2,fy=typeof CAM!=='undefined'?CAM.fy:H/2,
    V=warna?[-z,0,0,z,W/2+fx*z,H/2-fy*z]:[z,0,0,z,W/2-fx*z,H/2-fy*z];
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.filter='none';x.globalCompositeOperation='source-over';x.fillStyle='#050302';x.fillRect(0,0,W,H);x.imageSmoothingQuality='high';
  x.setTransform(...V);x.drawImage(P.kelir,0,0);
  const Lx=B.x+K.dx,Ly=B.y+K.dy;
  /* bayangan */
  for(const F of P.figur){const S=keadaan(F,t);F.S=S;if(S.tampak<=.004)continue;const q=proyeksi(S.z,B.jarak,B.nyala),M0=mFigur(F,S,p.dasar),T=[q.skala,0,0,q.skala,Lx*(1-q.skala),Ly*(1-q.skala)],M=kali(V,kali(T,M0)),rp=q.blur*z;
    xs.setTransform(1,0,0,1,0,0);xs.clearRect(0,0,W,H);xs.imageSmoothingQuality='high';gambarFigur(xs,F,S,M,0,p);
    x.setTransform(1,0,0,1,0,0);x.globalAlpha=.94*S.tampak;x.filter=rp>.3?`blur(${f(rp)}px)`:'none';x.drawImage(P.S,0,0);x.filter='none';x.globalAlpha=1;}
  /* sisi dalang: lukisan di depan kelir */
  if(warna){x.setTransform(...V);if(P.simpingWarna)x.drawImage(P.simpingWarna,0,0);
    for(const F of P.figur){const S=F.S;if(!S||S.tampak<=.004)continue;x.globalAlpha=S.tampak;const k=1+S.z/2600,M0=mFigur(F,S,p.dasar),M=kali(V,kali([k,0,0,k,(1-k)*fx,(1-k)*fy],M0));gambarFigur(x,F,S,M,1,p);x.globalAlpha=1;}
    bakeDebog(x,V,p);}
  /* cahaya: pengali kedip + kolam yang ikut api */
  x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='multiply';const c0=warna?W-(W/2-fx*z+Lx*z):W/2-fx*z+Lx*z,c1=H/2-fy*z+Ly*z,g=x.createRadialGradient(c0,c1,40*z,c0,c1,1250*z),a=max(0,min(1,B.kuat*K.kuat));
  const nada=(q)=>`rgb(${round(255*q)},${round(236*q)},${round(205*q)})`;g.addColorStop(0,nada(a));g.addColorStop(.55,nada(a*.86));g.addColorStop(1,nada(a*.6));x.fillStyle=g;x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';
  /* vignette + bagian terang api tembus kelir */
  const v=x.createRadialGradient(W/2,H/2,H*.46,W/2,H/2,H*1.06);v.addColorStop(0,'rgba(5,2,1,0)');v.addColorStop(1,'rgba(5,2,1,.72)');x.fillStyle=v;x.fillRect(0,0,W,H);}
function bakeDebog(x,V,p){x.setTransform(...V);const y=p.dasar,g=x.createLinearGradient(0,y,0,y+70);g.addColorStop(0,'#6b6a2c');g.addColorStop(.4,'#4d5024');g.addColorStop(1,'#1c1d0c');x.fillStyle=g;x.fillRect(-40,y,W+80,H-y+60);
  x.strokeStyle='rgba(20,18,6,.5)';x.lineWidth=1.4;for(let i=0;i<7;i++){x.beginPath();x.moveTo(-40,y+6+i*10);x.bezierCurveTo(600,y+3+i*10,1300,y+9+i*10,W+40,y+5+i*10);x.stroke();}}

return{panggung,figur,gambar,rancang,rancangKayon,tatah,jalur,proyeksi,kedipan,terang,ik,keadaan,siapKunci,poseLengan,JENIS,MUKA,PIHAK,POSE,TATAH,PANGGUNG};})();
