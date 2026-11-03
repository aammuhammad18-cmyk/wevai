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
const KAKI=[[-20,-48],[24,-48],[46,-30],[92,-18],[118,-7,1],[92,0],[-8,0],[-26,-18]],
  KEPALA={alusan:[[8,10],[24,2],[38,-6],[41,-16],[47,-21],[43,-25,1],[49,-31],[46,-38],[76,-47,1],[40,-78],[30,-96],[16,-118],[-20,-128],[-50,-96],[-44,-30],[-14,10]],
    gagahan:[[8,14],[28,6],[44,-4],[48,-16],[54,-21],[49,-25,1],[56,-32],[60,-38],[84,-44],[94,-58,1],[62,-82],[44,-100],[24,-122],[-20,-132],[-54,-98],[-48,-30],[-14,14]],
    raksasa:[[6,16],[28,18],[48,10],[66,-6],[72,-16],[70,-24,1],[76,-34],[66,-42],[92,-44],[108,-62],[96,-84],[66,-90],[54,-100],[58,-114],[34,-132],[0,-142],[-40,-132],[-70,-100],[-70,-50],[-50,-5]],
    putri:[[8,8],[22,0],[34,-6],[37,-15],[43,-20],[39,-23,1],[44,-29],[41,-36],[68,-46,1],[36,-74],[27,-92],[14,-112],[-20,-122],[-48,-92],[-42,-30],[-12,8]]};
/* gelung: garis luar (koordinat kepala) */
const GELUNG={
  'cupit urang':{isi:[[18,-112],[8,-132],[-8,-148],[10,-196],[-2,-238,1],[-30,-206],[-46,-172],[-66,-188],[-98,-212,1],[-94,-170],[-92,-130],[-74,-92],[-52,-76],[-46,-108],[-20,-124]],
    lungsen:[[-44,-74],[-62,-40],[-72,0],[-58,38,1],[-46,6],[-38,-30]],serit:[[-74,-118],[-48,-150],[-24,-126]]},
  'ukel keyongan':{isi:[[16,-108],[-6,-128],[-36,-126],[-60,-112],[-90,-118],[-114,-92],[-112,-62],[-88,-46],[-64,-54],[-52,-70],[-46,-96],[-16,-118]],
    lungsen:[[-44,-60],[-54,-20],[-52,22,1],[-38,-8],[-34,-40]],serit:[[-58,-112],[-30,-124],[-4,-118]]},
  gembel:{isi:[[40,-128],[24,-160],[-2,-152],[-22,-186],[-46,-160],[-78,-176],[-88,-138],[-118,-132],[-108,-96],[-132,-68],[-102,-52],[-104,-16],[-74,-20],[-60,-60],[-64,-112],[-24,-138]],
    lungsen:[[-62,-20],[-86,26],[-54,12],[-44,48,1],[-30,6]],serit:[[-96,-108],[-56,-150],[-6,-160]]}};
/* lengan: [panjang atas, panjang bawah termasuk telapak, lebar] */
const LENGAN={alusan:[238,330,1],gagahan:[250,340,1.28],raksasa:[258,350,1.72],putri:[214,300,.82]};

function potongLengan(L1,L2,w){const b=(x,y)=>[x*w,y],
  atas=[b(-16,-13),b(0,-21),b(16,-13),b(16,70),b(13,L1-30),b(11,L1+2),b(0,L1+13),b(-11,L1+2),b(-13,L1-30),b(-16,70)],
  hasta=[b(-12,-11),b(0,-15),b(12,-11),b(15,70),b(11,L2-86),b(10,L2-78),b(-9,L2-78),b(-12,L2-86),b(-14,70)],
  /* telapak: empat jari panjang melengkung ke depan + ibu jari; bersatu dengan hasta (hanya bahu & siku yang bersendi) */
  jari=[b(-10,L2-80),b(10,L2-80),b(19,L2-58),b(24,L2-30),b(27,L2-2,),[27*w,L2+6,1],b(15,L2-26),b(10,L2-44),b(8,L2-4),[6*w,L2+6,1],b(-1,L2-30),b(-3,L2-46),b(-5,L2-14),[-8*w,L2-4,1],b(-11,L2-44),b(-12,L2-62)],
  jempol=[b(9,L2-72),b(26,L2-82),[38*w,L2-66,1],b(24,L2-64),b(12,L2-58)];
  return{atas,hasta,jari,jempol};}

/* figur(jenis, seed) → data murni: {bagian:[{n,d,w}], lubang:string, atas:[…], tinggi kotak, bahu, panjang lengan}. Seed mengubah motif dan
   sedikit proporsi, tidak pernah golongan */
function rancang(jn,seed=1){const J=JENIS[jn],R=mulberry32(seed*7919+jn.length),BG=[],LB=[],ATAS=[],U=.925,G={BG,LB},
    isi=(n,pts,w,o)=>BG.push({n,d:jalur(pts),w,...o}),ubin=(j,g,u)=>LB.push(tatah(j,g,u)),garisL=(a,b,c)=>[a,b,c],v=R(),
    k0=.98+.04*R(),kain=['#7a1f18','#1d3a5e','#245238'][floor(R()*3)],kain2=['#c9402a','#3a6ea0','#3f8a5a'][floor(R()*3)];
  G.warnaKain=[kain,kain2];
  const prada='prada';let bahuD,bahuB,leherP;
  /* badan atas + bawah per golongan */
  if(jn==='alusan'||jn==='gagahan'){const b=jn==='alusan'?1:1.28;
    bahuD=[70*b,-742];bahuB=[-112*b,-762];leherP=[16*b,-848];
    isi('badan',ubah([[52,-545],[60,-600],[72,-655],[86,-705],[88,-752],[58,-782],[22,-792],[-20,-792],[-80,-790],[-128,-782],[-136,-758],[-105,-735],[-66,-695],[-56,-620],[-52,-545]],{sx:b*k0}),prada);
    const wN=jn==='alusan'?1:1.5;isi('leher',ubah([[24,-788],[28,-815],[34,-850],[-2,-856],[-8,-815],[-16,-786]],{sx:wN,dx:jn==='alusan'?0:10}),prada);
    /* kalung tanggalan + tebah jaja (ulur-ulur di dada) */
    ubin('masmasan',[[-20*b,-772],[20*b,-728],[62*b,-772]],3.4);ubin('bubukan',[[6*b,-722],[10*b,-640],[8*b,-580]],2.5);
    ubin('tratasan',[[-90*b,-776],[-40*b,-772]],3);ubin('tratasan',[[60*b,-690],[52*b,-610]],2.6);
    ubin('tratasan',[[-52*b,-690],[-40*b,-610]],2.6);
    /* sabuk */ubin('inten',[[-54*b,-556],[58*b,-556]],3.6);}
  if(jn==='alusan'){/* bokongan: kaki merapat tertutup kain, pantat terlihat, dua uncal */
    for(const dx of[-70,0])isi('kaki',[[46+dx,-262],[58+dx,-170],[44+dx,-70],[46+dx,-40],[10+dx,-40],[10+dx,-70],[20+dx,-170],[10+dx,-262]],prada),isi('kaki',ubah(KAKI,{dx:dx+22,dy:0}),prada);
    isi('kain',[[60,-552],[76,-470],[86,-380],[96,-300],[106,-246,1],[70,-262],[42,-246],[6,-236],[-38,-240],[-72,-268],[-118,-232],[-152,-176,1],[-134,-262],[-142,-330],[-140,-400],[-112,-474],[-62,-552]],'kain');
    isi('uncal',[[64,-550],[92,-440],[110,-300],[118,-186],[132,-136,1],[96,-178],[86,-300],[70,-430]],'kain2');
    isi('manggaran',[[-60,-560],[-104,-578],[-146,-552,1],[-112,-540],[-142,-500,1],[-96,-510],[-62,-530]],'kain2');
    ubin('tratasan',[[86,-470],[98,-320],[110,-210]],3);ubin('bubukan',[[-60,-500],[-118,-420],[-128,-300],[-128,-250]],3.2);
    ubin('bubukan',[[62,-510],[74,-380],[86,-280]],3);ubin('inten',[[-96,-264],[-40,-256],[10,-250],[60,-266]],3.4);
    for(let i=0;i<4;i++){const y=-500+i*56;ubin('masmasan',[[-82+i*6,y],[50-i*4,y+8]],3);}
    ubin('tratasan',[[20,-180],[30,-90]],2.5);ubin('tratasan',[[-50,-180],[-40,-90]],2.5);}
  if(jn==='gagahan'){/* jangkahan: kaki melebar seperti melangkah, kain sampai paha, empat uncal */
    isi('kaki',[[50,-360],[132,-300],[150,-250],[142,-130],[146,-40],[106,-40],[100,-130],[92,-240],[30,-300]],prada);isi('kaki',ubah(KAKI,{dx:122}),prada);
    isi('kaki',[[-30,-360],[-90,-300],[-104,-250],[-122,-130],[-130,-40],[-90,-40],[-78,-130],[-52,-230],[10,-300]],prada);isi('kaki',ubah(KAKI,{dx:-104}),prada);
    isi('kain',[[92,-552],[130,-480],[166,-390],[186,-322,1],[126,-345],[60,-336],[0,-352],[-66,-338],[-120,-352],[-178,-292,1],[-184,-372],[-146,-462],[-82,-552]],'kain');
    for(const[x,L]of[[130,-214],[64,-240],[-30,-232],[-122,-224]])isi('uncal',[[x-14,-350],[x+16,-350],[x+13,-280],[x+1,L,1],[x-12,-280]],'kain2');
    ubin('inten',[[-128,-356],[-60,-352],[0,-364],[60,-350],[130,-352]],3.6);ubin('bubukan',[[-92,-500],[-154,-400],[-160,-334]],3.2);ubin('bubukan',[[92,-510],[138,-420],[160,-356]],3.2);
    for(let i=0;i<3;i++){const y=-500+i*50;ubin('masmasan',[[-104-i*14,y],[110+i*14,y]],3.1);}
    ubin('tratasan',[[120,-280],[122,-110]],2.8);ubin('tratasan',[[-90,-280],[-106,-110]],2.8);}
  if(jn==='raksasa'){/* gemuk; tangan belakang tetap malang kerik (hanya tangan depan bersendi) */
    bahuD=[112,-768];bahuB=null;leherP=[52,-822];
    isi('badan',ubah([[118,-540],[156,-600],[170,-672],[150,-742],[128,-792],[66,-824],[-20,-822],[-120,-816],[-178,-784],[-176,-738],[-128,-690],[-110,-620],[-96,-540]],{sx:k0}),prada);
    isi('lenganTetap',[[-176,-798],[-218,-764],[-300,-682],[-322,-640],[-296,-602],[-214,-568],[-118,-540],[-90,-566],[-110,-590],[-214,-622],[-252,-650],[-208,-704],[-140,-746]],prada);
    isi('leher',[[66,-810],[78,-838],[20,-846],[-16,-812]],prada);
    isi('kaki',[[70,-380],[196,-300],[222,-250],[204,-130],[216,-44],[158,-44],[146,-130],[132,-240],[20,-300]],prada);isi('kaki',ubah(KAKI,{s:1.35,dx:176}),prada);
    isi('kaki',[[-60,-380],[-150,-300],[-180,-250],[-186,-130],[-204,-44],[-146,-44],[-128,-130],[-92,-230],[20,-300]],prada);isi('kaki',ubah(KAKI,{s:1.35,dx:-168}),prada);
    isi('kain',[[126,-552],[176,-470],[222,-390],[250,-322,1],[176,-348],[80,-338],[0,-356],[-90,-340],[-160,-356],[-240,-290,1],[-236,-372],[-180,-470],[-110,-552]],'kain');
    for(const[x,L]of[[186,-200],[90,-236],[-40,-232],[-168,-212]])isi('uncal',[[x-20,-352],[x+22,-352],[x+18,-280],[x+1,L,1],[x-17,-280]],'kain2');
    ubin('masmasan',[[-120,-790],[-20,-716],[112,-780]],4.2);ubin('inten',[[-98,-556],[120,-556]],4.2);ubin('tratasan',[[-90,-690],[-60,-600],[40,-580],[132,-612]],3.2);
    ubin('tratasan',[[30,-740],[60,-690]],3);ubin('bubukan',[[-182,-756],[-270,-660],[-250,-610],[-130,-566]],3.2);
    for(let i=0;i<3;i++){const y=-500+i*50;ubin('masmasan',[[-144-i*18,y],[150+i*18,y]],3.6);}
    ubin('bubukan',[[180,-260],[176,-90]],3.2);ubin('bubukan',[[-140,-260],[-164,-90]],3.2);ubin('inten',[[-200,-360],[0,-372],[210,-356]],4);}
  if(jn==='putri'){/* kain panjang menjuntai menyentuh tanah (samparan), kedua kaki sejajar, tangan hampir menyentuh telapak */
    bahuD=[50,-722];bahuB=[-84,-738];leherP=[12,-842];
    isi('kaki',ubah(KAKI,{s:.72,dx:42}),prada);isi('kaki',ubah(KAKI,{s:.72,dx:-30}),prada);
    isi('kain',[[42,-540],[52,-440],[62,-300],[70,-120],[74,-34],[34,-22],[-46,-22],[-108,-20],[-184,-8],[-258,-2,1],[-200,-40],[-142,-160],[-110,-300],[-96,-420],[-44,-540]],'kain');
    isi('uncal',[[-40,-540],[-74,-470],[-108,-430,1],[-68,-426],[-92,-340,1],[-40,-400],[-20,-520]],'kain2');
    isi('badan',[[42,-540],[52,-610],[62,-660],[64,-716],[46,-756],[14,-772],[-10,-772],[-56,-768],[-96,-758],[-102,-736],[-72,-712],[-46,-670],[-42,-600],[-44,-540]],prada);
    isi('pasemekan',[[60,-632],[62,-678],[46,-700],[-44,-690],[-46,-632]],'kain2');
    isi('leher',[[18,-768],[22,-800],[28,-846],[-2,-850],[-6,-800],[-12,-766]],prada);
    ubin('inten',[[-46,-692],[46,-700]],3);ubin('bubukan',[[-42,-636],[58,-636]],2.6);ubin('masmasan',[[-20,-766],[8,-720],[36,-752]],2.8);ubin('inten',[[-44,-548],[42,-548]],3);
    for(let i=0;i<8;i++){const y=-490+i*56;ubin('masmasan',[[-60-i*7,y],[46+i*2,y+6]],2.9);}
    ubin('bubukan',[[-108,-310],[-156,-130],[-230,-12]],3);ubin('tratasan',[[60,-400],[70,-60]],2.8);}
  /* siten-siten: pijakan kulit di bawah telapak; jangkahan lebih panjang */
  const sit=J.sikap==='jangkahan'?(jn==='raksasa'?[-290,330]:[-210,260]):[-120,160];
  isi('siten',[[sit[0],-1,1],[sit[1],-1,1],[sit[1]+12,6,1],[sit[1],13,1],[sit[0],13,1],[sit[0]-12,6,1]],'kain2');ubin('bubukan',[[sit[0]+10,6],[sit[1]-10,6]],2.6);
  /* kepala: tunduk/tengadah = pakem golongan */
  const k=jn==='raksasa'?1.52:jn==='gagahan'?1.14:1.05,C={s:k,r:J.tunduk,dx:leherP[0],dy:leherP[1]},Gl=GELUNG[J.gelung],T=p=>ubah(p,C),T1=(x,y)=>T([[x,y]])[0];
  isi('rambut',T(Gl.isi),'rambut');isi('rambut',T(Gl.lungsen),'rambut');isi('muka',T(KEPALA[jn]),'muka');
  ubin('seritan',T(Gl.serit),jn==='raksasa'?3.2:2.5);
  if(J.gelung==='cupit urang'){/* jamang + garuda mungkur di belakang gelung (raja/ksatria), sumping waderan */
    isi('perhiasan',T([[20,-110],[32,-122],[-6,-142],[-46,-132],[-40,-118],[-6,-124]]),prada);ubin('bubukan',T([[12,-122],[-32,-128]]),2);
    isi('perhiasan',T([[-92,-132],[-128,-152,1],[-114,-112],[-152,-118,1],[-124,-88],[-150,-72,1],[-108,-72],[-78,-90]]),prada);ubin('bubukan',T([[-90,-112],[-118,-96]]),2.4);}
  if(J.gelung==='ukel keyongan'){const S=[];for(let a=0;a<4.4*PI;a+=.5)S.push([-84+cos(a)*(3+a*1.9),-84+sin(a)*(3+a*1.9)]);ubin('bubukan',T(S),1.8);
    isi('perhiasan',T([[16,-108],[28,-120],[-4,-138],[-38,-128],[-36,-116],[-6,-122]]),prada);}
  isi('perhiasan',T([[-8,-74],[-26,-96],[-44,-66],[-36,-34],[-20,-20,1],[-12,-44]]),prada);ubin('bubukan',T([[-18,-80],[-28,-50]]),1.9);  // sumping
  ubin('tratasan',T([[-44,-22],[-14,-4]]),1.8);  // garis trilaksana kanta di leher: tiga lipatan tampak di bahu leher
  /* mata + mulut sebagai tatah: bentuk menentukan golongan */
  const mata=(g)=>{const[a,b,c]=g;LB.push(jalur(T([[a,b,1],[a+13*c,b-5*c],[a+27*c,b+1,1],[a+13*c,b+4*c]])));};
  if(J.mata==='gabahan')mata(jn==='putri'?[15,-68,.92]:[16,-71,1]);
  if(J.mata==='kedhelen')LB.push(jalur(T([[18,-82],[34,-90],[48,-78],[36,-68],[20,-72]])));
  if(J.mata==='plelengan'){const[x,y]=T1(40,-93);LB.push(lingkar(x,y,15.5*k));ATAS.push({n:'mata',d:lingkar(x,y,7.5*k),w:'hitamMata'});}
  if(J.mulut==='rapat')ubin('tratasan',T([[24,-25],[42,-25]]),1.6);
  if(J.mulut==='gusen'){LB.push(jalur(T([[70,-23,1],[24,-30],[12,-14],[28,-2],[66,-10,1]])));
    /* gusi + gigi + taring tetap kulit: dilukis sesudah dilubangi */
    ATAS.push({n:'gusi',d:jalur(T([[70,-23,1],[26,-30],[20,-22],[66,-19]])),w:'merahGusi'});
    for(const x of[62,52,42,32])ATAS.push({n:'gigi',d:jalur(T([[x,-20,1],[x+6,-20,1],[x+3,-10,1]])),w:'gading'});
    ATAS.push({n:'gigi',d:jalur(T([[66,-10,1],[52,-8,1],[60,-40,1]])),w:'gading'});   // taring
    isi('perhiasan',T([[30,-126],[60,-122],[68,-108],[38,-110]]),'rambut');ubin('seritan',T([[-30,6],[10,18],[46,14]]),2.6);}
  if(jn==='gagahan')ubin('tratasan',T([[6,6],[22,4]]),1.8);
  ubin('tratasan',T(jn==='raksasa'?[[-4,-120],[-48,-110]]:[[14,-88],[-8,-100]]),1.8);
  /* lengan */
  const[L1,L2,w]=LENGAN[jn],Pot=potongLengan(L1,L2,w);G.L=[L1,L2];G.bahuD=bahuD;G.bahuB=bahuB;G.Pot=Pot;
  G.lubangAtas=lingkar(0,0,3.1*(w>1?1.2:1))+tatah('bubukan',[[0,18],[0,42]],2.4*(w>1?1.2:1))+tatah('inten',[[-14*w,56],[14*w,56]],2.9)+tatah('inten',[[-14*w,74],[14*w,74]],2.6)+tatah('tratasan',[[0,100],[0,L1-40]],2.6);
  G.lubangHasta=lingkar(0,0,2.8)+tatah('tratasan',[[0,30],[0,L2-130]],2.5)+tatah('inten',[[-12*w,L2-104],[12*w,L2-104]],2.7)+tatah('bubukan',[[-10*w,L2-90],[10*w,L2-90]],1.9);
  G.bagian=BG;G.atas=ATAS;G.lubang=LB.join('');G.J=J;G.jn=jn;G.seed=seed;G.U=U;G.tinggiPuncak=1000;
  return G;}

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
  for(const[r,w]of[[0,'#fff3cf'],[.1,'#ffe4a8'],[.26,'#f6c478'],[.48,'#d68c44'],[.72,'#8e4f22'],[1,'#3a1c0c']])g.addColorStop(r,w);x.fillStyle=g;x.fillRect(0,0,W,H);
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
