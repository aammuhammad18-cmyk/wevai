/* WAYANG KULIT: figur per golongan (bukan tokoh bernama) + tatah sebagai kode, dipanggang sekali ke sprite; tiap frame SATU kanvas digambar ulang dari tl.time() + CAM + BLENCONG. Sumber, API, biaya: references/wayang.md. Butuh atmosfer: rantaiUpdate, mulberry32, vnoise. Uji: scripts/test-wayang.mjs. */

/* BLENCONG: lampu di-tween seperti CAM. x, y = kaki di kelir (px); jarak ke kelir; nyala = lebar api (penumbra); kuat, kedip 0..1. */
const BLENCONG={x:960,y:250,jarak:620,nyala:24,kuat:1,kedip:.3,seed:3};
const wayang=(()=>{
const{PI,sin,cos,atan2,hypot,acos,max,min,abs,round,floor,ceil}=Math,RAD=PI/180,f=v=>round(v*10)/10,lerp=(a,b,k)=>a+(b-a)*k,
  ss=x=>x<=0?0:x>=1?1:x*x*(3-2*x),salah=(n,m)=>{throw new Error('wayang.'+n+': '+m);};

/* PAKEM (bersumber: dokumen). tinggi relatif alusan; gerak = jumlah lengan bersendi; tunduk derajat. */
const JENIS={
  alusan:{sikap:'bokongan',mata:'gabahan',hidung:'wali miring',mulut:'rapat',kepala:'luruh',tunduk:16,gelung:'cupit urang',muka:'hitam',tinggi:1,gerak:2,simping:'kanan'},
  gagahan:{sikap:'jangkahan',mata:'kedhelen',hidung:'bentulan',mulut:'rapat',kepala:'longok',tunduk:2,gelung:'cupit urang',muka:'hitam',tinggi:1.16,gerak:2,simping:'kanan'},
  raksasa:{sikap:'jangkahan',mata:'plelengan',hidung:'pelokan',mulut:'gusen',kepala:'lanyapan',tunduk:-7,gelung:'gembel',muka:'merah',tinggi:1.3,gerak:1,simping:'kiri'},
  putri:{sikap:'samparan',mata:'gabahan',hidung:'wali miring',mulut:'rapat',kepala:'oyi',tunduk:20,gelung:'ukel keyongan',muka:'prada',tinggi:.8,gerak:2,simping:'kanan'}},
  
  MUKA={hitam:{warna:'#1a1613'},merah:{warna:'#a4261a'},
    prada:{warna:'#d3a443'},putih:{warna:'#e6dcc4'}},
  /* menurut sisi DALANG; sisi bayang tercermin */
  PIHAK={kanan:{layar:'kiri',hadap:'kanan'},kiri:{layar:'kanan',hadap:'kiri'}},
  /* target telapak dari titik tanah, x ke arah hadap */
  POSE={belakang:[-126,-158,-1],anjujur:[84,-152,-1],angapurancang:[108,-196,1],mathentheng:[72,-510,1],nuding:[400,-610,-1],ngancam:[300,-930,-1],sembah:[120,-660,-1]};

/* ---------- geometri murni ---------- */
const tk=p=>f(p[0])+','+f(p[1]),
  /* [x,y,sudut?] → kubik halus; sudut 1 = tepi tajam */
  jalur=(p,tutup=1)=>{const n=p.length;let d='M'+tk(p[0]);for(let i=0;i<(tutup?n:n-1);i++){const a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],e=p[(i+2)%n],
      c1=b[2]||(!tutup&&!i)?b:[b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6],c2=c[2]||(!tutup&&i===n-2)?c:[c[0]-(e[0]-b[0])/6,c[1]-(e[1]-b[1])/6];
      d+=`C${tk(c1)} ${tk(c2)} ${tk(c)}`;}return d+(tutup?'Z':'');},
  
  ubah=(p,{s=1,sx=s,sy=s,r=0,dx=0,dy=0}={})=>{const c=cos(r*RAD),q=sin(r*RAD);return p.map(([x,y,k])=>{const X=x*sx,Y=y*sy,o=[X*c-Y*q+dx,X*q+Y*c+dy];if(k)o.push(k);return o;});},
  cermin=p=>p.concat(p.slice(1,-1).reverse().map(([x,y,k])=>k?[-x,y,k]:[-x,y])),
  /* titik sama jarak sepanjang polilinea */
  sepanjang=(p,jarak)=>{const o=[];let sisa=0;for(let i=0;i<p.length-1;i++){const[a,b]=[p[i],p[i+1]],L=hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/(L||1),uy=(b[1]-a[1])/(L||1);
      let s=sisa;while(s<=L){o.push([a[0]+ux*s,a[1]+uy*s,ux,uy]);s+=jarak;}sisa=s-L;}return o;};
const lingkar=(x,y,r)=>`M${f(x-r)},${f(y)}a${f(r)},${f(r)} 0 1,0 ${f(2*r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2*r)},0Z`,
  belah=(x,y,ux,uy,a,b)=>`M${f(x-ux*a)},${f(y-uy*a)}L${f(x-uy*b)},${f(y+ux*b)}L${f(x+ux*a)},${f(y+uy*a)}L${f(x+uy*b)},${f(y-ux*b)}Z`;
/* cincin = lubang bercincin (arah balik: nonzero); pita = garis lubang meruncing; ulir = spiral; gerigi = tepi bertonjolan */
const cincin=(x,y,R,r)=>lingkar(x,y,R)+`M${f(x-r)},${f(y)}a${f(r)},${f(r)} 0 1,1 ${f(2*r)},0a${f(r)},${f(r)} 0 1,1 ${f(-2*r)},0Z`,
  pita=(p,w0,w1=w0)=>{const a=[],b=[];p.forEach(([x,y],i)=>{const q=p[max(0,i-1)],s=p[min(p.length-1,i+1)],dx=s[0]-q[0],dy=s[1]-q[1],L=hypot(dx,dy)||1,w=lerp(w0,w1,i/(p.length-1))/2;a.push(tk([x-dy/L*w,y+dx/L*w]));b.unshift(tk([x+dy/L*w,y-dx/L*w]));});return'M'+a.concat(b).join('L')+'Z';},
  ulir=(x,y,r,n=2,s=1)=>Array.from({length:25},(_,i)=>{const t=i/24,a=s*t*n*2*PI,q=r*(1-t*.9);return[x+cos(a)*q,y+sin(a)*q];}),
  gerigi=(p,d,h)=>{const q=sepanjang(p,d),o=[];q.forEach(([x,y,a,b],i)=>{o.push([x,y,1]);const c=q[i+1];if(c)for(const t of[.2,.5,.8])o.push([lerp(x,c[0],t)-b*h*(t===.5?1.15:.85),lerp(y,c[1],t)+a*h*(t===.5?1.15:.85)]);});return o;};
/* TATAH: lubang sepanjang garis; u = ukuran dasar. Rupa inten/mas-masan dirancang dari namanya */
const TATAH={
  bubukan:(p,u)=>sepanjang(p,u*3.1).map(([x,y])=>lingkar(x,y,u)).join(''),                                  // bulat-bulat kecil
  tratasan:(p,u)=>sepanjang(p,u*3.6).map(([x,y,a,b])=>belah(x,y,a,b,u*1.35,u*.55)).join(''),                 // goresan sepanjang garis
  inten:(p,u)=>sepanjang(p,u*3.8).map(([x,y,a,b])=>belah(x,y,a,b,u*1.5,u*.9)).join(''),                       // belah ketupat
  seritan:(p,u)=>sepanjang(p,u*2.1).map(([x,y,a,b])=>belah(x,y,b,-a,u*4.2,u*.42)).join(''),                   // gerigi rambut: tegak lurus garis
  masmasan:(p,u)=>sepanjang(p,u*5.8).map(([x,y,a,b])=>lingkar(x,y,u*.9)+lingkar(x+a*u*1.9,y+b*u*1.9,u*.42)+lingkar(x-a*u*1.9,y-b*u*1.9,u*.42)+lingkar(x-b*u*1.9,y+a*u*1.9,u*.42)+lingkar(x+b*u*1.9,y-a*u*1.9,u*.42)).join('')};   // kuntum perhiasan
const tatah=(jenis,garis,u=4)=>{if(!TATAH[jenis])salah('tatah',`jenis tidak dikenal: ${jenis} (${Object.keys(TATAH).join(' ')})`);return TATAH[jenis](garis,u);};

/* proyeksi: m = d/(d−z), penumbra = nyala·z/(d−z); z dijepit di bawah lampu */

const proyeksi=(z,jarak=BLENCONG.jarak,nyala=BLENCONG.nyala)=>{const zz=max(0,min(z,jarak*.85)),d=jarak-zz;return{skala:jarak/d,blur:nyala*zz/d};};
/* kedip api: 3 oktaf noise murni t */
const kedipan=(t,seed=BLENCONG.seed,k=BLENCONG.kedip)=>{const a=vnoise(t*5.1,seed),b=vnoise(t*11.3,seed+1),c=vnoise(t*23.7,seed+2),n=.5*a+.3*b+.2*c;
  return{kuat:1-k*.55*n,dx:k*26*(vnoise(t*3.7,seed+3)-.5),dy:k*22*(vnoise(t*4.3,seed+4)-.5)};};
/* IK dua tulang analitik; sisi +1 siku ke depan, −1 ke belakang, nilai antara saat pose berganti */
const ik=(L1,L2,tx,ty,sisi=-1)=>{const d=hypot(tx,ty)||1e-9,dd=min(L1+L2-1e-6,max(abs(L1-L2)+1e-6,d)),a1=atan2(tx,ty)+sisi*acos(max(-1,min(1,(L1*L1+dd*dd-L2*L2)/(2*L1*dd)))),
    bx=L1*sin(a1),by=L1*cos(a1),a2=atan2(tx/d*dd-bx,ty/d*dd-by);return[a1,a2,bx,by,bx+L2*sin(a2),by+L2*cos(a2)];};

/* gerak: kunci → keadaan murni t */
const AWAL={x:960,y:0,z:6,miring:0,putar:0,tampak:1,getar:0,tanganD:'anjujur',tanganB:'belakang'},
  tangan=(v,n)=>{if(typeof v==='string'){if(!POSE[v])salah('figur',`pose tangan tidak dikenal: ${v} (${Object.keys(POSE).join(' ')})`);return POSE[v];}
    if(!Array.isArray(v)||v.length<2||v.length>3||!v.every(Number.isFinite))salah('figur',`${n} harus nama pose atau [x, y, sisi siku?]`);return v.length===3?v:[v[0],v[1],-1];};
function siapKunci(awal,kunci){const a={...AWAL,...awal};a.tanganD=tangan(a.tanganD,'tanganD');a.tanganB=tangan(a.tanganB,'tanganB');let t0=-Infinity;
  const K=(kunci||[]).map(([t,v,o={}],i)=>{if(!(typeof t==='number'&&t>=t0))salah('figur',`kunci harus urut waktu (kunci ${i}: ${t})`);t0=t;
    const w={};for(const k in v){if(!(k in AWAL))salah('figur',`kunci tidak dikenal: ${k} (${Object.keys(AWAL).join(' ')})`);w[k]=k.startsWith('tangan')?tangan(v[k],k):v[k];}return{t,v:w,o,d:o.durasi??.8};});
  K.forEach((k,i)=>{k.dari=hitung(a,K.slice(0,i),k.t);});return{a,K};}
function hitung(a,K,t){const s={...a,bob:0};for(const k of K){if(t<=k.t)break;const u=min(1,(t-k.t)/k.d),e=k.o.keras?1-(1-u)**3:k.o.langkah?u:ss(u);
    for(const n in k.v){const A=k.dari[n],B=k.v[n];s[n]=Array.isArray(B)?B.map((q,i)=>lerp(A[i],q,e)):lerp(A,B,e);}
    /* berjalan = hentakan gapit; langkah bulat kembali nol */
    if(k.o.langkah&&k.v.x!=null&&u<1){const n=max(1,round(abs(k.v.x-k.dari.x)/k.o.langkah)),p=sin(PI*u*n);s.y-=(k.o.tinggi??14)*abs(p);s.miring+=(k.o.ayun??1.6)*p;}}
  if(s.getar>0){s.miring+=s.getar*3.6*sin(t*17.3);s.putar+=s.getar*22*sin(t*9.1);}return s;}
const keadaan=(F,t)=>hitung(F.a,F.K,t);

/* rancangan figur: tinggi ±1000, telapak y 0, menghadap +x */
const KAKI=[[-14,-52],[14,-52],[24,-30],[60,-15],[102,-8],[122,-13,1],[116,-1,1],[-12,0],[-22,-20]],
  KEPALA={alusan:[[8,10],[24,2],[38,-6],[41,-16],[47,-21],[43,-25,1],[48,-31],[59,-40],[80,-48,1],[52,-66],[33,-92],[16,-118],[-20,-128],[-50,-96],[-44,-30],[-14,10]],
    gagahan:[[6,14],[28,8],[44,-2],[48,-15],[55,-20],[50,-25,1],[58,-32],[60,-38],[86,-44],[97,-58,1],[62,-84],[44,-102],[24,-122],[-20,-132],[-54,-98],[-48,-30],[-14,14]],
    raksasa:[[-30,24],[4,32],[38,30],[62,18],[76,0],[76,-12,1],[54,-14,1],[88,-26,1],[108,-36],[128,-38],[142,-52],[140,-72],[122,-84],[98,-94],[82,-110],[74,-128],[46,-136],[4,-136],[-34,-128],[-52,-104],[-56,-50],[-42,0]],
    putri:[[8,8],[22,0],[34,-6],[37,-15],[43,-20],[39,-23,1],[43,-28],[52,-37],[70,-46,1],[46,-62],[30,-88],[14,-112],[-20,-122],[-48,-92],[-42,-30],[-12,8]]};
/* gelung: garis luar (koordinat kepala); ukel = ikal ujung lungsen */
const GELUNG={
  'cupit urang':{isi:[[16,-114],[4,-138],[-10,-156],[-22,-172],[-8,-192],[18,-198,1],[-10,-214],[-42,-208],[-62,-186],[-72,-172],[-92,-180],[-108,-204,1],[-116,-172],[-102,-138],[-92,-108],[-74,-84],[-52,-74],[-46,-108],[-20,-124]],
    lungsen:[[-46,-74],[-58,-44],[-62,-8],[-54,18],[-36,26],[-26,16],[-36,8],[-44,2],[-46,-14],[-38,-44],[-32,-66]],serit:[[-84,-128],[-62,-158],[-40,-186],[-10,-202]]},
  'ukel keyongan':{isi:[[16,-108],[-6,-128],[-36,-126],[-60,-112],[-90,-118],[-114,-92],[-112,-62],[-88,-46],[-64,-54],[-52,-70],[-46,-96],[-16,-118]],
    lungsen:[[-44,-60],[-58,-20],[-60,28],[-40,44],[-26,34],[-40,20],[-40,-10],[-34,-40]],serit:[[-58,-112],[-30,-124],[-4,-118]]},
  gembel:{isi:[...gerigi([[60,-150],[30,-178],[-12,-190],[-60,-178],[-96,-142],[-118,-94],[-132,-44],[-142,10],[-142,62],[-126,104],[-92,124]],38,13),[-62,98],[-30,42],[-6,-40],[20,-130]],
    lungsen:[[-60,0],[-72,30],[-56,44],[-34,30],[-30,4]],serit:[[-100,-56],[-86,-104],[-56,-142],[-10,-160],[36,-150]]}};
/* lengan: [panjang atas, panjang bawah termasuk telapak, lebar] */
const LENGAN={alusan:[240,335,.86],gagahan:[252,345,1.2],raksasa:[262,350,1.72],putri:[214,300,.74]};

function potongLengan(L1,L2,w,cakar){const b=(x,y)=>[x*w,y],
  atas=[b(-15,-13),b(0,-20),b(15,-13),b(15,60),b(12,L1-30),b(11,L1+2),b(0,L1+13),b(-11,L1+2),b(-12,L1-30),b(-15,60)],
  hasta=[b(-11,-11),b(0,-14),b(11,-11),b(13,80),b(9,L2-90),b(9,L2-80),b(-9,L2-80),b(-9,L2-90),b(-12,80)],
  /* telapak bersatu dengan hasta (raksasa: cakar) */
  jari=cakar?[b(-10,L2-82),b(10,L2-82),b(20,L2-58),b(25,L2-28),[29*w,L2+8,1],b(15,L2-26),b(10,L2-44),b(8,L2-4),[6*w,L2+8,1],b(-1,L2-30),b(-3,L2-46),b(-5,L2-14),[-8*w,L2-2,1],b(-11,L2-44),b(-12,L2-62)]
    :[b(-9,L2-82),b(9,L2-82),b(14,L2-60),b(19,L2-34),b(24,L2-12),[33*w,L2+6,1],b(14,L2-6),b(2,L2-22),b(-5,L2-44),b(-10,L2-62)],
  jempol=[b(9,L2-74),b(22,L2-82),[36*w,L2-70,1],b(22,L2-64),b(11,L2-58)],
  kelat=[b(-19,28),b(-21,42),b(-19,58),b(0,64),b(19,58),b(21,42),b(19,28),b(0,22)],gelang=[b(-13,L2-112),b(-15,L2-100),b(-13,L2-88),b(13,L2-88),b(15,L2-100),b(13,L2-112)];
  return{atas,hasta,jari,jempol,kelat,gelang};}

/* tiap baris y → ruas di dalam poligon */
const potongBaris=(p,y)=>{const X=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if((a[1]<=y)!==(b[1]<=y))X.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}X.sort((m,n)=>m-n);return X;},
  /* garis luar disusutkan: baris tatah mengikuti bentuk */
  polaTepi=(p,j,u,k=.86)=>{let cx=0,cy=0;p.forEach(q=>{cx+=q[0];cy+=q[1];});cx/=p.length;cy/=p.length;const g=p.map(([x,y])=>[cx+(x-cx)*k,cy+(y-cy)*k]);g.push(g[0]);return tatah(j,g,u);};

/* kisi renda: motif berselang-seling */
const polaKisi=(p,y0,y1,dx,dy,urut,u,tepi=9)=>{let s='',i=0;for(let y=y0;y<=y1;y+=dy,i++){const X=potongBaris(p,y);if(X.length<2)continue;const a=X[0]+tepi,c=X[X.length-1]-tepi;
    for(let x=a+(i%2?dx/2:0);x<=c;x+=dx){const j=urut[((i+round(x/dx))%urut.length+urut.length)%urut.length];s+=tatah(j,[[x,y],[x+.01,y]],u*(j==='masmasan'?.95:1));}}return s;};

/* rancang → data murni. Seed mengubah motif, bukan golongan */
function rancang(jn,seed=1){const J=JENIS[jn],R=mulberry32(seed*7919+jn.length),BG=[],LB=[],ATAS=[],G={},U=.925,
    isi=(n,pts,w)=>{BG.push({n,d:jalur(pts),w});return pts;},ubin=(j,g,u)=>LB.push(tatah(j,g,u)),
    /* lapis lukis (sisi dalang, dipanggang): LK di bawah lubang, LA di atas; gradasi = stroke bertingkat RAMP; klip = dalam bentuk */
    LK=[],LA=[],LT=[],LH=[],gradasi=(p,r,l,o={},A=LK)=>{const d=jalur(p,o.tutup??0);A.push({d,c:'#1a0c06',l:l+1.6,klip:o.klip});RAMP[r].forEach((c,i)=>A.push({d,c,l:l*(1-i/4),klip:o.klip}));},
    tepi=(pts,r,l)=>gradasi(pts,r,l,{tutup:1,klip:jalur(pts)}),drenjem=(p,A=LK)=>A.push({d:jalur(p,0),c:'#1a0c06',l:1.7,titik:4.6}),
    
    gelangKaki=(x0,x1,y)=>{isi('perhiasan',[[x0-3,y-7],[(x0+x1)/2,y-9],[x1+3,y-7],[x1+4,y+6],[(x0+x1)/2,y+8],[x0-4,y+6]],prada);gradasi([[x0,y],[x1,y]],'merah',11);},
    /* uncal: juntai berlekuk meruncing */
    uncal=(x,y,L,w)=>{const U=[...gerigi([[x-w,y],[x-w*.7,y+L]],L/4.5,w*.42),[x,y+L+w,1],...gerigi([[x+w*.7,y+L],[x+w,y]],L/4.5,w*.42)];isi('uncal',U,'kain2');ubin('bubukan',[[x,y+12],[x,y+L-6]],w*.17);tepi(U,'jingga',w*.72);},
    /* motif kain serong rekaan, bukan motif bernama */
    serong=(pts,c)=>{let d='';for(let u=-900;u<900;u+=31)d+=`M${u},-600L${u+640},40`;LK.push({d,c,l:2.6,klip:jalur(pts)});},
    k0=.98+.04*R(),kain=['#4c1812','#172640','#1c3526'][floor(R()*3)],kain2=['#b9862e','#8f2c1c','#28507a'][floor(R()*3)],
    urutKain=[['bubukan','inten'],['masmasan','bubukan'],['inten','tratasan','bubukan']][floor(R()*3)],prada='prada';
  G.warnaKain=[kain,kain2];let bahuD,bahuB,leherP;
  if(jn==='alusan'||jn==='gagahan'){const b=jn==='alusan'?1:1.3;
    bahuD=[72*b,-728];bahuB=[-108*b,-738];leherP=[(jn==='alusan'?24:28)*b,-846];
    isi('badan',ubah([[38,-548],[46,-595],[60,-650],[76,-694],[86,-726],[74,-748],[40,-772],[22,-790],[-18,-792],[-48,-776],[-108,-758],[-126,-738],[-110,-714],[-74,-684],[-52,-634],[-44,-595],[-38,-548]],{sx:b*k0}),prada);
    const wN=jn==='alusan'?1:1.3,dxN=jn==='alusan'?6:18;isi('leher',ubah([[20,-788],[24,-815],[36,-856],[6,-862],[-6,-815],[-16,-786]],{sx:wN,dx:dxN}),prada);
    /* kalung (dua baris), tebah jaja, garis dada + perut */
    ubin('masmasan',[[-34*b,-776],[-12*b,-742],[14*b,-730],[40*b,-742],[60*b,-772]],3.1);ubin('bubukan',[[-22*b,-768],[0,-746],[14*b,-742],[28*b,-750],[48*b,-768]],1.8);
    ubin('bubukan',[[14*b,-722],[12*b,-660],[8*b,-590]],2.1);ubin('tratasan',[[-96*b,-762],[-46*b,-772]],2.4);ubin('tratasan',[[60*b,-694],[42*b,-612]],2.3);ubin('tratasan',[[-48*b,-680],[-36*b,-606]],2.3);
    ubin('inten',[[-46*b,-564],[46*b,-564]],3);ubin('bubukan',[[-44*b,-550],[44*b,-550]],2);}
  if(jn==='alusan'){/* bokongan: kaki merapat, kain sampai betis */
    for(const dx of[-58,0]){isi('kaki',[[42+dx,-200],[40+dx,-120],[32+dx,-46],[14+dx,-46],[8+dx,-120],[10+dx,-200]],prada);isi('kaki',ubah(KAKI,{dx:dx+22}),prada);gelangKaki(11+dx,37+dx,-70);}
    const K=isi('kain',[[42,-556],[54,-490],[64,-400],[72,-300],[78,-186],[60,-172],[10,-164],[-40,-170],[-62,-186],[-60,-250],[-72,-310],[-108,-368],[-124,-412],[-112,-462],[-74,-512],[-44,-556]],'kain');
    /* kunca belakang: jatuh dari pinggang, melengkung ke betis */
    const Kb=isi('kunca',[[-44,-552],[-92,-500],[-126,-430],[-138,-350],[-150,-260],[-168,-160,1],[-122,-242],[-100,-320],[-92,-400],[-54,-510]],'kain2');
    const Ud=isi('uncal',[[42,-556],[64,-470],[82,-360],[92,-250],[108,-120,1],[76,-200],[62,-320],[50,-450]],'kain2');
    uncal(4,-296,170,11);
    isi('manggaran',[[-40,-566],[-80,-592],[-116,-596,1],[-98,-568],[-124,-544,1],[-84,-546],[-42,-546]],'kain2');
    LB.push(polaKisi(K,-530,-186,17,14,urutKain,1.5,8));LB.push(polaTepi(K,'bubukan',1.7,.95));LB.push(tatah('bubukan',[[-40,-536],[38,-536]],1.8));serong(K,'rgba(214,170,84,.5)');tepi(K,'jingga',11);tepi(Kb,'merah',14);tepi(Ud,'hijau',12);
    LB.push(polaTepi(Kb,'tratasan',1.9,.68));LB.push(polaTepi(Ud,'bubukan',1.7,.6));ubin('tratasan',[[-90,-580],[-58,-562]],1.8);
    ubin('tratasan',[[30,-160],[24,-70]],1.8);ubin('tratasan',[[-30,-160],[-34,-70]],1.8);}
  if(jn==='gagahan'){/* jangkahan: kaki melebar, kain sampai paha, empat uncal */
    isi('kaki',[[40,-370],[96,-340],[134,-270],[146,-200],[142,-120],[142,-48],[110,-48],[104,-120],[96,-200],[60,-280],[20,-330]],prada);isi('kaki',ubah(KAKI,{dx:126}),prada);gelangKaki(106,144,-84);gelangKaki(-134,-96,-84);
    isi('kaki',[[-20,-370],[-80,-330],[-112,-266],[-126,-200],[-132,-120],[-138,-48],[-106,-48],[-96,-120],[-82,-200],[-46,-270],[10,-330]],prada);isi('kaki',ubah(KAKI,{dx:-122}),prada);
    const K=isi('kain',[[60,-556],[100,-500],[136,-420],[158,-350],[178,-316,1],[122,-334],[60,-326],[0,-344],[-66,-328],[-124,-340],[-186,-296,1],[-174,-372],[-140,-452],[-60,-556]],'kain');
    for(const[x,L]of[[140,136],[70,170],[-30,166],[-134,146]])uncal(x,-350,L,11);
    isi('kunca',[[-60,-552],[-120,-500],[-170,-420],[-210,-330],[-236,-262,1],[-196,-284],[-170,-340],[-138,-424],[-84,-506]],'kain2');
    isi('manggaran',[[-66,-566],[-110,-586],[-150,-580,1],[-128,-562],[-150,-538,1],[-108,-540],[-66,-546]],'kain2');
    LB.push(polaKisi(K,-538,-340,18,15,urutKain,1.6,9));LB.push(polaTepi(K,'bubukan',1.8,.94));serong(K,'rgba(214,170,84,.5)');tepi(K,'jingga',11);
    ubin('tratasan',[[128,-270],[122,-110]],2.3);ubin('tratasan',[[-104,-270],[-116,-110]],2.3);}
  if(jn==='raksasa'){/* tangan belakang tetap, malang kerik */
    bahuD=[118,-762];bahuB=null;leherP=[50,-826];
    isi('badan',ubah([[112,-540],[156,-596],[172,-664],[162,-730],[142,-782],[92,-818],[-20,-830],[-112,-824],[-184,-792],[-190,-744],[-140,-696],[-116,-622],[-98,-540]],{sx:k0}),prada);
    const Lt=isi('lenganTetap',[[-168,-802],[-222,-764],[-294,-690],[-322,-640],[-300,-604],[-214,-572],[-122,-548],[-92,-566],[-112,-596],[-210,-624],[-246,-652],[-204,-704],[-144,-746]],prada);
    isi('leher',[[70,-806],[86,-842],[16,-856],[-22,-816]],prada);
    isi('kaki',[[60,-380],[160,-340],[206,-266],[224,-200],[214,-120],[220,-52],[170,-52],[160,-120],[146,-200],[90,-270],[20,-330]],prada);isi('kaki',ubah(KAKI,{s:1.35,dx:186}),prada);
    isi('kaki',[[-50,-380],[-132,-330],[-176,-262],[-194,-200],[-186,-120],[-206,-52],[-156,-52],[-140,-120],[-116,-200],[-60,-270],[20,-330]],prada);isi('kaki',ubah(KAKI,{s:1.35,dx:-180}),prada);
    const Cf=isi('celana',[[60,-380],[160,-340],[206,-266],[212,-236],[214,-222],[166,-214],[118,-232],[90,-270],[20,-330]],'#6a1a12'),Cb=isi('celana',[[-50,-380],[-132,-330],[-176,-262],[-186,-232],[-184,-218],[-136,-212],[-92,-232],[-60,-270],[20,-330]],'#6a1a12');
    LB.push(polaKisi(Cf,-330,-226,19,15,['bubukan'],1.9,8),polaKisi(Cb,-330,-226,19,15,['bubukan'],1.9,8));tepi(Cf,'jingga',8);tepi(Cb,'jingga',8);
    gelangKaki(116,214,-222);gelangKaki(-186,-92,-222);gelangKaki(162,222,-92);gelangKaki(-200,-140,-92);
    const K=isi('kain',[[112,-556],[160,-486],[198,-420],[226,-362],[238,-326,1],[168,-346],[84,-330],[14,-302],[-50,-330],[-150,-348],[-226,-320,1],[-214,-378],[-168,-470],[-98,-556]],'kain'),Wa=isi('kunca',[[-22,-556],[46,-556],[58,-420],[42,-270],[14,-214,1],[-12,-270],[-32,-420]],'kain2');
    for(const[x,y,L]of[[200,-344,130],[116,-330,136],[-96,-330,136],[-190,-344,130]])uncal(x,y,L,13);
    ubin('masmasan',[[-110,-808],[-60,-750],[20,-716],[96,-748],[136,-790]],3.8);ubin('bubukan',[[-90,-802],[-40,-758],[20,-734],[86,-760],[122,-796]],2.4);
    ubin('inten',[[-96,-566],[116,-566]],3.8);ubin('bubukan',[[-98,-550],[112,-550]],2.4);ubin('tratasan',[[-92,-690],[-68,-620],[10,-596],[100,-602],[148,-650]],2.6);
    ubin('seritan',[[30,-690],[44,-650],[66,-640]],2.2);ubin('seritan',[[-44,-700],[-34,-660]],2.2);
    LB.push(polaKisi(K,-540,-340,20,16,urutKain,1.9,10));LB.push(polaTepi(K,'bubukan',2.1,.94));LB.push(tatah('bubukan',[[-178,-776],[-262,-680],[-282,-640],[-250,-612],[-150,-570]],2.6));LB.push(polaKisi(Wa,-530,-240,17,15,['inten'],1.8,7));serong(K,'rgba(214,170,84,.5)');tepi(K,'jingga',12);tepi(Wa,'merah',14);
    ubin('inten',[[-250,-642],[-214,-618]],2.8);ubin('tratasan',[[192,-270],[186,-110]],2.6);ubin('tratasan',[[-150,-270],[-170,-110]],2.6);}
  if(jn==='putri'){/* samparan: kain menjuntai ke tanah */
    bahuD=[54,-722];bahuB=[-92,-734];leherP=[14,-846];
    isi('kaki',ubah(KAKI,{s:.74,dx:46}),prada);isi('kaki',ubah(KAKI,{s:.74,dx:-22}),prada);
    const K=isi('kain',[[38,-540],[52,-440],[62,-300],[70,-120],[76,-36],[34,-26],[-46,-26],[-108,-22],[-184,-10],[-268,-2,1],[-204,-44],[-146,-160],[-112,-300],[-96,-420],[-40,-540]],'kain');
    const Kb=isi('uncal',[[-40,-540],[-74,-470],[-112,-424,1],[-68,-424],[-98,-336,1],[-44,-400],[-22,-520]],'kain2');
    isi('badan',[[38,-540],[48,-610],[60,-660],[66,-712],[56,-744],[20,-770],[-8,-772],[-58,-760],[-106,-744],[-110,-726],[-76,-704],[-46,-664],[-40,-600],[-40,-540]],prada);
    isi('pasemekan',[[58,-628],[60,-676],[46,-696],[-44,-684],[-46,-628]],'kain2');
    isi('leher',[[16,-768],[20,-800],[30,-850],[4,-856],[-6,-800],[-12,-766]],prada);
    ubin('inten',[[-46,-690],[46,-696]],2.5);ubin('bubukan',[[-42,-634],[56,-634]],2);ubin('masmasan',[[-18,-764],[8,-722],[36,-750]],2.5);ubin('inten',[[-42,-550],[38,-550]],2.6);
    LB.push(polaKisi(K,-528,-40,15,13,urutKain,1.5,7));LB.push(polaTepi(K,'bubukan',1.5,.97));LB.push(polaTepi(Kb,'bubukan',1.8,.7));ubin('bubukan',[[-108,-310],[-156,-130],[-232,-14]],2);}
  
  const sit=J.sikap==='jangkahan'?(jn==='raksasa'?[-300,350]:[-220,270]):J.sikap==='samparan'?[-120,150]:[-110,160];
  isi('siten',[[sit[0],0,1],[sit[1],0,1],[sit[1]+12,7,1],[sit[1],14,1],[sit[0],14,1],[sit[0]-12,7,1]],'kain2');ubin('bubukan',[[sit[0]+10,7],[sit[1]-10,7]],2.2);
  /* kepala: tunduk/tengadah = pakem golongan */
  const k=jn==='raksasa'?1.5:jn==='gagahan'?1.12:1.08,C={s:k,r:J.tunduk,dx:leherP[0],dy:leherP[1]},Gl=GELUNG[J.gelung],T=p=>ubah(p,C),T1=(x,y)=>T([[x,y]])[0];
  if(jn==='raksasa')BG.unshift({n:'rambut',d:jalur(T(Gl.isi)),w:'rambut'});else isi('rambut',T(Gl.isi),'rambut');isi('rambut',T(Gl.lungsen),'rambut');isi('muka',T(KEPALA[jn]),'muka');
  ubin('seritan',T(Gl.serit),2);if(jn==='raksasa'){ubin('bubukan',T([[-120,-50],[-104,-96],[-68,-150],[-14,-174],[34,-166]]),2.4);ubin('bubukan',T([[-132,60],[-128,0],[-112,-40]]),2.4);ubin('bubukan',T([[-100,84],[-96,20],[-82,-30]]),2.2);}
  if(J.gelung==='cupit urang'){/* jamang di dahi + garuda mungkur di belakang gelung */
    isi('perhiasan',T([[20,-108],[30,-120],[-2,-146],[-46,-136],[-44,-120],[-6,-126]]),prada);ubin('bubukan',T([[14,-120],[-36,-132]]),1.7);
    const Gm=T([[-96,-140],[-118,-152,1],[-124,-132],[-146,-120,1],[-134,-102],[-146,-80,1],[-120,-82],[-100,-84],[-82,-98]]);isi('perhiasan',Gm,prada);LB.push(polaTepi(Gm,'bubukan',1.7,.62));tepi(Gm,'merah',9);}
  if(J.gelung==='ukel keyongan'){const S=[];for(let a=0;a<4.4*PI;a+=.5)S.push([-84+cos(a)*(3+a*1.9),-84+sin(a)*(3+a*1.9)]);ubin('bubukan',T(S),1.6);
    isi('perhiasan',T([[16,-106],[28,-118],[-4,-138],[-38,-130],[-36,-116],[-6,-122]]),prada);ubin('bubukan',T([[10,-118],[-30,-126]]),1.5);}
  /* sumping + gradasi hijau */{const Sm=T(jn==='raksasa'?[[-30,-84],[-46,-96],[-60,-74],[-58,-50],[-44,-22,1],[-34,-52]]:[[-26,-72],[-38,-86],[-52,-68],[-48,-42],[-34,-22,1],[-28,-46]]);isi('perhiasan',Sm,prada);ubin('bubukan',T(jn==='raksasa'?[[-44,-76],[-48,-52]]:[[-34,-68],[-40,-46]]),1.5);tepi(Sm,jn==='raksasa'?'hijau':'merah',6);}
  ubin('tratasan',T([[-40,-18],[-14,-2]]),1.5);   // garis trilaksana kanta di leher
  /* mata + mulut sebagai tatah: bentuk menentukan golongan */
  if(J.mata==='gabahan'){const[a,b,c]=jn==='putri'?[14,-68,.92]:[15,-72,1];const Mt=jalur(T([[a,b,1],[a+13*c,b-5.5*c],[a+29*c,b+1.5,1],[a+13*c,b+3.5*c]]));LB.push(Mt);LA.push({d:Mt,c:'#f2ead6'},{d:Mt,c:'#1a0c06',l:1.1},{d:lingkar(...T1(a+15*c,b-1),2.1),c:'#1a0c06'});ubin('tratasan',T([[10,-90],[-6,-100]]),1.4);LA.push({d:jalur(T([[a-4,b-8],[a+14*c,b-12],[a+30*c,b-6]]),0),c:'#1a0c06',l:1.8},{d:jalur(T([[22,-26],[32,-24],[40,-26]]),0),c:'#8e2418',l:1.8});}
  if(J.mata==='kedhelen'){LB.push(jalur(T([[16,-78],[32,-88],[47,-78],[36,-66],[20,-68]])));ATAS.push({n:'mata',d:lingkar(...T1(33,-77),5),w:'hitamMata'});ubin('tratasan',T([[14,-96],[-6,-104]]),1.5);}
  if(J.mata==='plelengan'){const[x,y]=T1(44,-92),R=18*k,r=11.5*k;LB.push(cincin(x,y,R,r)+lingkar(x,y,2.6*k));for(const q of[[26,-110],[44,-115],[62,-110]])LB.push(lingkar(...T1(...q),2.5*k));ubin('seritan',T([[14,-94],[22,-118],[44,-128],[64,-124],[72,-108]]),1.4);LB.push(pita(T(ulir(12,-86,12)),2.6*k,.7*k));
    for(const[q,c]of[[R,'#f0e6cc'],[r+1.5*k,'#1a0c06'],[r,'#c4241a'],[4.4*k,'#1a0c06']])LA.push({d:lingkar(x,y,q),c});LA.push({d:lingkar(x+1.4*k,y-1.6*k,1.2*k),c:'#f0e6cc'});LA.push({d:jalur(T([[130,-80],[102,-88],[84,-102]]),0),c:'#3a0e08',l:1.6});LB.push(pita(T(ulir(-32,-40,15,.95,-1)),2.6*k,.8*k),pita(T(ulir(100,-54,8,1.6)),1.9*k,.5*k));}
  if(J.mulut==='rapat')ubin('tratasan',T([[22,-25],[40,-25]]),1.4);
  if(J.mulut==='gusen'){/* gusen: gusi, deret gigi, taring. Gigi = kulit tersisa di lubang mulut */
    LB.push(jalur(T([[56,-11,1],[38,-30],[6,-36],[-26,-26,1],[-6,-4],[30,2]])));
    ATAS.push({n:'gusi',d:jalur(T([[58,-17,1],[38,-30],[6,-36],[-26,-26,1],[2,-26],[36,-23]])),w:'merahGusi'});
    for(const x of[44,35,26,17,8,-1])ATAS.push({n:'gigi',d:jalur(T([[x,-26,1],[x+7,-26,1],[x+6.5,-17,1],[x+.5,-17,1]])),w:'gading'});for(const x of[30,21,12,3])ATAS.push({n:'gigi',d:jalur(T([[x,1,1],[x+7,1,1],[x+6,-5,1],[x+1,-5,1]])),w:'gading'});
    ATAS.push({n:'gigi',d:jalur(T([[-14,-31,1],[-4,-32,1],[-2,-16],[-8,0,1],[-11,-16]])),w:'gading'});ATAS.push({n:'gigi',d:jalur(T([[42,0,1],[52,-4,1],[52,-18],[60,-33,1],[45,-18]])),w:'gading'});   // taring
    {const Jm=T([[80,-126],[68,-146],[28,-156],[-20,-152],[-56,-128],[-50,-112],[-14,-128],[28,-136],[62,-128]]);isi('perhiasan',Jm,prada);ubin('bubukan',T([[66,-136],[28,-147],[-18,-142],[-48,-122]]),1.7);tepi(Jm,'merah',6);}ubin('bubukan',T([[-30,18],[12,26],[52,16]]),1.7);}
  /* lengan */
  const[L1,L2,w]=LENGAN[jn],Pot=potongLengan(L1,L2,w,jn==='raksasa');Object.assign(G,{L:[L1,L2],bahuD,bahuB,Pot});
  gradasi([[-20*w,43],[20*w,43]],'merah',15,{},LT);drenjem([[-18*w,43],[18*w,43]],LT);gradasi([[-14*w,L2-100],[14*w,L2-100]],'hijau',12,{},LH);
  /* kalung + sabuk: warna di bawah lubang yang sudah ada */
  if(jn==='raksasa'){gradasi([[-110,-808],[-60,-750],[20,-716],[96,-748],[136,-790]],'jingga',17);gradasi([[-98,-558],[116,-558]],'hijau',19);}else if(jn==='putri')gradasi([[-18,-764],[8,-722],[36,-750]],'jingga',11);else{const b=jn==='alusan'?1:1.3;gradasi([[-34*b,-776],[-12*b,-742],[14*b,-730],[40*b,-742],[60*b,-772]],'jingga',13);gradasi([[-44*b,-558],[44*b,-558]],'hijau',17);}
  G.lubangAtas=lingkar(0,0,3)+tatah('bubukan',[[0,16],[0,34]],1.9)+tatah('inten',[[-13*w,50],[13*w,50]],2.3)+tatah('bubukan',[[-13*w,62],[13*w,62]],1.6)+tatah('tratasan',[[0,90],[0,L1-40]],2);
  G.lubangHasta=lingkar(0,0,2.6)+tatah('tratasan',[[0,30],[0,L2-140]],2)+tatah('inten',[[-10*w,L2-112],[10*w,L2-112]],2.2)+tatah('bubukan',[[-9*w,L2-96],[9*w,L2-96]],1.5);
  Object.assign(G,{bagian:BG,atas:ATAS,lubang:LB.join(''),lukis:LK,lukisAtas:LA,lukisT:LT,lukisH:LH,J,jn,seed,U});return G;}

/* GUNUNGAN gapuran: gerbang berpenjaga, kalpataru dililit naga, banteng-harimau, kera, burung; balik = api. lapis bawah → atas di atas bidang dalam yang dilubangi */
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


/* gradasi sungging tua → muda (urutan: Purbasari 2012) */
const RAMP={merah:['#5c120c','#a82a1c','#d9604a','#f2b7a4'],hijau:['#123d2a','#2e7a4e','#86b46a','#e4dc8a'],jingga:['#7a3410','#c86a1c','#eca341','#f7dd7c']};
const WARNA_K={batang:'#c89838',dahan:'#a9782c',daun:'#3f7f54',naga:'#d0a640',banaspati:'#b5281c',banteng:'#2a1d18',macan:'#c47a24',kera:'#7a4a24',burung:'#c9402a',gapura:'#d5ab50',penjaga:'#8a2a1e',lapik:'#b5281c',bidang:'#14100c'};
const warnaDari=(G,w)=>w==='prada'?'#d3a443':w==='muka'?MUKA[G.muka].warna:w==='kain'?G.warnaKain[0]:w==='kain2'?G.warnaKain[1]:w==='rambut'?'#14100c':w==='gading'?'#efe6cc':w==='merahGusi'?'#a01e16':w==='hitamMata'?'#0c0806':w;

const kanvasBaru=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
/* warna 0 = siluet, 1 = lukisan */
const WARNA_BAYANG='#120805',pradaGrad=(x,a,b)=>{const g=x.createLinearGradient(0,a,0,b);g.addColorStop(0,'#e7c26a');g.addColorStop(.3,'#c9963c');g.addColorStop(.6,'#dcb45a');g.addColorStop(1,'#a97a2c');return g;};
/* prada pecah: bintik ber-seed, ditumpangkan source-atop */
const lukisLapis=(x,A,Pd)=>{for(const o of A){const P=new Path2D(o.d);x.save();if(o.klip)x.clip(new Path2D(o.klip));const c=o.c==='prada'?Pd:o.c;if(o.l){x.strokeStyle=c;x.lineWidth=o.l;x.lineCap='round';x.lineJoin='round';if(o.titik)x.setLineDash([.01,o.titik]);x.stroke(P);}else{x.fillStyle=c;x.fill(P);}x.restore();}};
let TILE=null;const bintik=()=>{if(TILE)return TILE;TILE=kanvasBaru(160,160);const q=TILE.getContext('2d'),R=mulberry32(41);for(let i=0;i<900;i++){q.fillStyle=R()<.55?`rgba(88,50,12,${.05+.13*R()})`:`rgba(255,232,160,${.05+.14*R()})`;q.fillRect(R()*160,R()*160,1+R()*2.4,1+R()*1.6);}return TILE;};
function pangkatFigur(G,res,warna){const u=res*G.U,x0=-420,y0=-1170,lebar=860,tinggi=1210,c=kanvasBaru(ceil(lebar*u),ceil(tinggi*u)),x=c.getContext('2d');
  x.setTransform(u,0,0,u,-x0*u,-y0*u);const Pd=warna&&pradaGrad(x,-1000,0);
  for(const b of G.bagian){const P=new Path2D(b.d);x.fillStyle=warna?(b.w==='prada'||b.w==='perhiasan'?Pd:warnaDari(G,b.w)):WARNA_BAYANG;x.fill(P);if(warna){x.strokeStyle='rgba(30,14,6,.8)';x.lineWidth=1.5;x.stroke(P);}}
  if(warna){x.globalCompositeOperation='source-atop';x.fillStyle=x.createPattern(bintik(),'repeat');x.fillRect(x0,y0,lebar,tinggi);x.globalCompositeOperation='source-over';lukisLapis(x,G.lukis,Pd);}
  const Lb=new Path2D(G.lubang);x.globalCompositeOperation='destination-out';x.fill(Lb);x.globalCompositeOperation='source-over';if(warna){x.strokeStyle='#e9c871';x.lineWidth=1;x.stroke(Lb);}
  for(const b of G.atas){x.fillStyle=warna?warnaDari(G,b.w):WARNA_BAYANG;x.fill(new Path2D(b.d));}if(warna)lukisLapis(x,G.lukisAtas,Pd);
  return{c,u,x0,y0};}
function pangkatLengan(G,res,warna){const[L1,L2]=G.L,P=G.Pot,u=res*G.U,w=120,c1=kanvasBaru(ceil(w*u),ceil((L1+50)*u)),c2=kanvasBaru(ceil(w*u),ceil((L2+50)*u)),
    gambar=(c,parts,lb,A)=>{const x=c.getContext('2d');x.setTransform(u,0,0,u,w/2*u,30*u);for(const p of parts){const q=new Path2D(jalur(p));x.fillStyle=warna?pradaGrad(x,-30,c.height/u):WARNA_BAYANG;x.fill(q);if(warna){x.strokeStyle='rgba(30,14,6,.8)';x.lineWidth=1.4;x.stroke(q);}}if(warna)lukisLapis(x,A);
      const Lb=new Path2D(lb);x.globalCompositeOperation='destination-out';x.fill(Lb);x.globalCompositeOperation='source-over';if(warna){x.strokeStyle='#e9c871';x.lineWidth=1;x.stroke(Lb);}};
  gambar(c1,[P.atas,P.kelat],G.lubangAtas,G.lukisT);gambar(c2,[P.hasta,P.gelang,P.jempol,P.jari],G.lubangHasta,G.lukisH);return{c1,c2,u,w};}
function pangkatKayon(D,res,warna,balik){const u=res,lb=660,tg=1040,c=kanvasBaru(ceil(lb*u),ceil(tg*u)),x=c.getContext('2d'),O=new Path2D(jalur(D.garis));
  x.setTransform(u,0,0,u,lb/2*u,1020*u);x.lineCap='round';x.lineJoin='round';
  if(balik){/* balik: api merah, lidah dirancang */
    const g=x.createLinearGradient(0,-1000,0,0);g.addColorStop(0,'#f2c040');g.addColorStop(.45,'#d9531e');g.addColorStop(1,'#7a140c');x.fillStyle=g;x.fill(O);
    x.fillStyle='#f6d460';const Rn=mulberry32(77);for(let i=0;i<46;i++){const X=(Rn()-.5)*460,Y=-Rn()*860-60,l=30+60*Rn();if(abs(X)>.33*(1000+Y))continue;x.fill(new Path2D(jalur([[X-l*.3,Y+l*.4],[X+l*.04,Y-l,1],[X+l*.32,Y+l*.4],[X,Y+l*.55]])));}
  }else{x.fillStyle=warna?'#c9a050':WARNA_BAYANG;x.fill(O);
    
    x.save();x.scale(.962,.975);x.translate(0,-10);x.globalCompositeOperation='destination-out';x.fill(O);x.restore();x.globalCompositeOperation='source-over';
    for(const l of D.lapis){const warnaP=warna?WARNA_K[l.w]||'#c9a050':WARNA_BAYANG,P=new Path2D(l.d);
      if(l.g||l.w==='dahan'){x.strokeStyle=warnaP;x.lineWidth=l.w==='naga'?8:5.6;x.stroke(P);}else{x.fillStyle=warnaP;x.fill(P);}}
    x.globalCompositeOperation='destination-out';x.fill(new Path2D(D.lubang));x.globalCompositeOperation='source-over';}
  if(warna){x.strokeStyle='rgba(50,24,8,.9)';x.lineWidth=2;x.stroke(O);}
  return{c,u,x0:-lb/2,y0:-1020,balik};}

/* ---------- panggung: satu kanvas layar penuh ---------- */
const PANGGUNG={c:null,figur:[],opsi:null};
function panggung(o={}){const D={dasar:980,sisi:'bayang',simping:true,seed:5,res:1.25,tinggi:560};for(const k in o)if(!(k in D))salah('panggung',`opsi tidak dikenal: ${k} (${Object.keys(D).join(' ')})`);
  const p={...D,...o};if(!['bayang','dalang'].includes(p.sisi))salah('panggung',`sisi tidak dikenal: ${p.sisi} (bayang dalang)`);
  const c=kanvasBaru(W,H);c.className='wv-wayang';c.style.cssText='position:absolute;left:0;top:0;pointer-events:none';$('#stage').prepend(c);
  const S=kanvasBaru(W,H);Object.assign(PANGGUNG,{c,x:c.getContext('2d'),S,xs:S.getContext('2d'),figur:[],opsi:p,kelir:bakeKelir(p)});
  if(p.simping)bakeSimpingan(p);
  rantaiUpdate(gambar);gambar();return c;}

/* kelir + serat + kolam cahaya + lis; debog = bayangan batang pisang */
function bakeKelir(p){const c=kanvasBaru(W,H),x=c.getContext('2d'),B=BLENCONG,g=x.createRadialGradient(B.x,B.y,0,B.x,B.y,1300);
  for(const[r,w]of[[0,'#fff6d8'],[.1,'#ffe8b2'],[.28,'#f8cf88'],[.5,'#e4a258'],[.74,'#a9612a'],[1,'#532611']])g.addColorStop(r,w);x.fillStyle=g;x.fillRect(0,0,W,H);
  
  const im=x.getImageData(0,0,W,H),d=im.data,R=mulberry32(p.seed);
  for(let j=0,i=0;j<H;j++){const a=.985+.015*Math.sin(j*2.09),kerut=1+.018*(vnoise(j/170,p.seed+9)-.5);for(let q=0;q<W;q++,i+=4){const v=a*(.992+.012*R())*(.985+.015*Math.sin(q*1.91))*kerut;d[i]*=v;d[i+1]*=v;d[i+2]*=v;}}
  x.putImageData(im,0,0);
  /* lis kelir atas (hitam/merah menurut sumber) */
  x.fillStyle='#1b0a06';x.fillRect(0,0,W,30);
  /* bayangan debog (sisi bayang) */
  const y=p.dasar;
  x.filter='blur(5px)';x.fillStyle='#0c0503';x.fillRect(-20,y+2,W+40,H-y+30);x.filter='none';
  return c;}
/* simpingan: tinggi menurun ke tengah, membelakangi tempat perkeliran. x = layar sisi BAYANG */
function bakeSimpingan(p){const Lb=kanvasBaru(W,H),xB=Lb.getContext('2d'),warna=p.sisi==='dalang',Lw=warna?kanvasBaru(W,H):null,xW=warna?Lw.getContext('2d'):null,R=mulberry32(p.seed*31);
  const baris=(ragam,x0,dx,hadap)=>{for(let i=0;i<8;i++){const jn=ragam[i%ragam.length],G=rancang(jn,floor(R()*1e4)),k=(1.04-.055*i)*JENIS[jn].tinggi*p.tinggi/1000;
      G.muka=JENIS[jn].muka;gambarDiam(xB,G,x0+i*dx,p.dasar,k,hadap,p,0);if(warna)gambarDiam(xW,G,x0+i*dx,p.dasar,k,hadap,p,1);}};
  baris(['gagahan','gagahan','gagahan','alusan','alusan','alusan','putri','putri'],36,58,-1);
  baris(['raksasa','raksasa','raksasa','gagahan','gagahan','gagahan','alusan','alusan'],W-36,-58,1);
  /* siluet masuk kelir; warna lapisan terpisah */
  PANGGUNG.kelir.getContext('2d').globalAlpha=.82;PANGGUNG.kelir.getContext('2d').drawImage(Lb,0,0);PANGGUNG.kelir.getContext('2d').globalAlpha=1;PANGGUNG.simpingWarna=Lw;}
/* figur diam ke kanvas pemanggang: lengan menjuntai (simpingan) */
function gambarDiam(x,G,gx,gy,k,hadap,p,warna){const s=pangkatFigur(G,p.res,warna),u=s.u,L=pangkatLengan(G,p.res,warna),U=G.U,[L1]=G.L,
    pakai=(q,bx,by)=>{const c=cos(q),n=sin(q);x.setTransform(k*hadap*c,k*n,-k*hadap*n,k*c,gx+k*hadap*bx,gy+k*by);},
    lengan=(b,sudut)=>{if(!b)return;const bx=b[0]*U,by=b[1]*U,a=-sudut*RAD;pakai(a,bx,by);x.drawImage(L.c1,-L.w/2*U,-30*U,L.c1.width/u*U,L.c1.height/u*U);
      pakai(a-.14,bx-sin(a)*L1*U,by+cos(a)*L1*U);x.drawImage(L.c2,-L.w/2*U,-30*U,L.c2.width/u*U,L.c2.height/u*U);};
  lengan(G.bahuB,-6);x.setTransform(k*hadap,0,0,k,gx,gy);x.drawImage(s.c,s.x0*U,s.y0*U,s.c.width/u*U,s.c.height/u*U);lengan(G.bahuD,6);x.setTransform(1,0,0,1,0,0);}


function figur(o={}){const p=PANGGUNG.opsi||salah('figur','panggil wayang.panggung() dulu');const D={jenis:'alusan',x:960,z:6,y:0,seed:1,muka:null,hadap:'kanan',tinggi:null,kunci:null,tanganD:'anjujur',tanganB:'belakang',miring:0,putar:0,tampak:1,getar:0};
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

const poseLengan=(G,bahu,tgt)=>{const U=G.U,[L1,L2]=G.L,bx=bahu[0]*U,by=bahu[1]*U,[a1,a2,ex,ey,hx,hy]=ik(L1*U,L2*U,tgt[0]-bx,tgt[1]-by,tgt[2]??-1);return{a1,a2,bahu:[bx,by],siku:[bx+ex,by+ey],telapak:[bx+hx,by+hy]};};

function gambarFigur(x,F,S,M,warna,p){const res=warna?F.sw:F.sb;
  const pakai=(m)=>x.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]);
  if(F.kayon){const balik=warna&&cos(S.putar*RAD)<0,sp=balik?F.swb:res;pakai(M);x.drawImage(sp.c,sp.x0,sp.y0,sp.c.width/sp.u,sp.c.height/sp.u);
    /* gapit: batang tanduk memanjang di tengah */
    x.strokeStyle=warna?'#6a4628':WARNA_BAYANG;x.lineWidth=5;x.beginPath();x.moveTo(0,-880);x.lineTo(0,200);x.stroke();return;}
  const G=F.G,U=G.U,L=warna?F.lw:F.lb,lengan=(P)=>{const m1=kali(M,[cos(-P.a1),sin(-P.a1),-sin(-P.a1),cos(-P.a1),P.bahu[0],P.bahu[1]]);pakai(m1);x.drawImage(L.c1,-L.w/2*U,-30*U,L.c1.width/L.u*U,L.c1.height/L.u*U);
      const m2=kali(M,[cos(-P.a2),sin(-P.a2),-sin(-P.a2),cos(-P.a2),P.siku[0],P.siku[1]]);pakai(m2);x.drawImage(L.c2,-L.w/2*U,-30*U,L.c2.width/L.u*U,L.c2.height/L.u*U);},
    rotan=(P,c)=>{pakai(M);x.strokeStyle=c;x.lineWidth=3.2;x.beginPath();x.moveTo(P.telapak[0],P.telapak[1]);const dx=P.telapak[0]*.14+18,y1=460;x.lineTo(P.telapak[0]+dx,y1);x.stroke();};
  const warnaR=warna?'#5a3a20':WARNA_BAYANG,D=G.bahuD&&poseLengan(G,G.bahuD,S.tanganD),B=G.bahuB&&poseLengan(G,G.bahuB,S.tanganB);
  if(B){lengan(B);rotan(B,warnaR);}
  pakai(M);x.drawImage(res.c,res.x0*U,res.y0*U,res.c.width/res.u*U,res.c.height/res.u*U);
  /* gapit berhenti di dada: muka tidak tercoret */
  pakai(M);x.strokeStyle=warnaR;x.lineWidth=warna?3.6:5;x.beginPath();x.moveTo(4,-700);x.lineTo(2,-520);x.lineTo(0,240);x.stroke();
  if(D){lengan(D);rotan(D,warnaR);}}

/* kotak layar figur + ekor blur, dipotong frame */
const kotakLayar=(M,r)=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const[X,Y]of[[-640,-1240],[640,-1240],[-640,520],[640,520]]){const px=M[0]*X+M[2]*Y+M[4],py=M[1]*X+M[3]*Y+M[5];a=min(a,px);b=min(b,py);c=max(c,px);d=max(d,py);}
    const e=ceil(3*r)+2,x0=max(0,floor(a-e)),y0=max(0,floor(b-e));return[x0,y0,min(W,ceil(c+e))-x0,min(H,ceil(d+e))-y0];};
/* frame: kelir → bayangan (proyeksi + blur z) → lukisan → cahaya kedip */
function gambar(){const P=PANGGUNG;if(!P.c||!P.c.isConnected)return;const t=tl.time(),x=P.x,xs=P.xs,p=P.opsi,B=BLENCONG,K=kedipan(t,B.seed,B.kedip),warna=p.sisi==='dalang',
    z=typeof CAM!=='undefined'?CAM.zoom:1,fx=typeof CAM!=='undefined'?CAM.fx:W/2,fy=typeof CAM!=='undefined'?CAM.fy:H/2,
    V=warna?[-z,0,0,z,W/2+fx*z,H/2-fy*z]:[z,0,0,z,W/2-fx*z,H/2-fy*z];
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.filter='none';x.globalCompositeOperation='source-over';x.fillStyle='#050302';x.fillRect(0,0,W,H);x.imageSmoothingQuality='high';
  x.setTransform(...V);x.drawImage(P.kelir,0,0);
  const Lx=B.x+K.dx,Ly=B.y+K.dy;
  /* bayangan */
  for(const F of P.figur){const S=keadaan(F,t);F.S=S;if(S.tampak<=.004)continue;const q=proyeksi(S.z,B.jarak,B.nyala),M0=mFigur(F,S,p.dasar),T=[q.skala,0,0,q.skala,Lx*(1-q.skala),Ly*(1-q.skala)],M=kali(V,kali(T,M0)),rp=q.blur*z;
    
    const[kx,ky,kw,kh]=kotakLayar(M,rp);if(kw<=0||kh<=0)continue;
    xs.setTransform(1,0,0,1,0,0);xs.clearRect(kx,ky,kw,kh);xs.imageSmoothingQuality='high';gambarFigur(xs,F,S,M,0,p);
    x.setTransform(1,0,0,1,0,0);x.globalAlpha=.94*S.tampak;x.filter=rp>.3?`blur(${f(rp)}px)`:'none';x.drawImage(P.S,kx,ky,kw,kh,kx,ky,kw,kh);x.filter='none';x.globalAlpha=1;}
  /* sisi dalang: lukisan di depan kelir */
  if(warna){x.setTransform(...V);if(P.simpingWarna)x.drawImage(P.simpingWarna,0,0);
    for(const F of P.figur){const S=F.S;if(!S||S.tampak<=.004)continue;x.globalAlpha=S.tampak;const k=1+S.z/2600,M0=mFigur(F,S,p.dasar),M=kali(V,kali([k,0,0,k,(1-k)*fx,(1-k)*fy],M0)),[,,kw,kh]=kotakLayar(M,0);if(kw>0&&kh>0)gambarFigur(x,F,S,M,1,p);x.globalAlpha=1;}
    debog(x,V,p);lampu(x,K,V,Lx);}
  /* cahaya: pengali kedip + kolam yang ikut api */
  x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='multiply';const c0=warna?W-(W/2-fx*z+Lx*z):W/2-fx*z+Lx*z,c1=H/2-fy*z+Ly*z,g=x.createRadialGradient(c0,c1,40*z,c0,c1,1250*z),a=max(0,min(1,B.kuat*K.kuat));
  const nada=(q)=>`rgb(${round(255*q)},${round(236*q)},${round(205*q)})`;g.addColorStop(0,nada(a));g.addColorStop(.55,nada(a*.86));g.addColorStop(1,nada(a*.6));x.fillStyle=g;x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';
  /* vignette + bagian terang api tembus kelir */
  const v=x.createRadialGradient(W/2,H/2,H*.46,W/2,H/2,H*1.06);v.addColorStop(0,'rgba(5,2,1,0)');v.addColorStop(1,'rgba(5,2,1,.72)');x.fillStyle=v;x.fillRect(0,0,W,H);}
function debog(x,V,p){x.setTransform(...V);const y=p.dasar,g=x.createLinearGradient(0,y,0,y+70);g.addColorStop(0,'#55512a');g.addColorStop(.35,'#3a3a1c');g.addColorStop(1,'#141408');x.fillStyle=g;x.fillRect(-40,y,W+80,H-y+60);
  x.strokeStyle='rgba(20,18,6,.5)';x.lineWidth=1.4;for(let i=0;i<7;i++){x.beginPath();x.moveTo(-40,y+6+i*10);x.bezierCurveTo(600,y+3+i*10,1300,y+9+i*10,W+40,y+5+i*10);x.stroke();}}
/* blencong sisi dalang, paralaks 1,5× kelir */
function lampu(x,K,V,Lx){const cx=W/2+(V[0]*Lx+V[4]-W/2)*1.5+150,cy=64+(V[5]+V[3]*BLENCONG.y-120)*.2,a=K.kuat;x.setTransform(1,0,0,1,cx,cy);x.strokeStyle='#2a1a0c';x.lineWidth=3;x.beginPath();x.moveTo(0,-400);x.lineTo(0,0);x.stroke();
  const g=x.createLinearGradient(-40,0,40,0);g.addColorStop(0,'#3a2410');g.addColorStop(.5,'#b98b3a');g.addColorStop(1,'#4a2e12');x.fillStyle=g;x.fill(new Path2D(jalur([[-34,0],[34,0],[44,14],[86,20],[100,34,1],[60,42],[20,56],[-24,52],[-44,22]])));
  const fy=18-K.dy*.5,fx=102+K.dx*.3,t=30+26*a,gl=x.createRadialGradient(fx,fy-18,2,fx,fy-18,190);gl.addColorStop(0,`rgba(255,226,150,${.7*a})`);gl.addColorStop(.2,`rgba(255,180,80,${.3*a})`);gl.addColorStop(1,'rgba(255,150,50,0)');
  x.globalCompositeOperation='lighter';x.fillStyle=gl;x.fillRect(fx-200,fy-210,400,400);x.fillStyle='#fff0b8';x.fill(new Path2D(jalur([[fx-9,fy+8],[fx+K.dx*.2,fy-t,1],[fx+9,fy+8],[fx,fy+13]])));x.globalCompositeOperation='source-over';}

return{panggung,figur,gambar,rancang,rancangKayon,tatah,jalur,proyeksi,kedipan,ik,keadaan,siapKunci,poseLengan,JENIS,MUKA,PIHAK,POSE,TATAH,PANGGUNG};})();
/* kait test-starters, ?kosong=1, fixture sendiri */
window.WAYANG_UJI=()=>{const r={},O=window.OPENER,P=wayang.PANGGUNG,b0={...BLENCONG},lum=(d,i)=>.3*d[i]+.59*d[i+1]+.11*d[i+2],
    bersih=()=>{if(P.c)P.c.remove();Object.assign(P,{c:null,figur:[],opsi:null,simpingWarna:null});},
    baris=(c,y,x0,x1)=>{const d=c.getContext('2d').getImageData(x0,y,x1-x0,1).data,o=[];for(let i=0;i<d.length;i+=4)o.push(lum(d,i));return o;};
  /* keras = lompatan piksel terbesar; skala = puncak kepala ke kaki lampu */
  Object.assign(BLENCONG,{kedip:0,kuat:1,x:960,y:250});let c=wayang.panggung({simping:false,seed:2,res:1,tinggi:520});
  wayang.figur({jenis:'gunungan',x:300,z:4,seed:1,tinggi:460});wayang.figur({jenis:'alusan',x:800,z:4,seed:2,kunci:[[1,{tanganD:'ngancam'},{durasi:2}]]});wayang.figur({jenis:'alusan',x:1200,z:240,seed:2});
  const seek=t=>O.seek(t),keras=a=>{let m=0;for(let i=1;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-a[i-1]));return m;};seek(.5);
  const m=wayang.proyeksi(240,BLENCONG.jarak,BLENCONG.nyala).skala,y0=980-Math.round(520*.67),y1=Math.round(250+(y0-250)*m),puncak=(x0,x1)=>{const q=c.getContext('2d').getImageData(x0,0,x1-x0,H).data,n=x1-x0;for(let y=40;y<H;y++)for(let i=0;i<n;i++){const k=(y*n+i)*4;if(lum(q,k)<60)return y;}return H;};
  r.keras=[+keras(baris(c,y0,640,1020)).toFixed(1),+keras(baris(c,y1,1050,1700)).toFixed(1)];r.tepiTajam=r.keras[0]>2*r.keras[1];
  r.puncak=[puncak(640,1020),puncak(1050,1700)];r.skalaJarak=(r.puncak[1]-250)/(r.puncak[0]-250)>1.3;
  /* baris memotong tajuk = renda */
  const a=baris(c,980-Math.round(460*1.5*.55),90,510);let g=0;for(let i=1;i<a.length;i++)if((a[i]<90)!==(a[i-1]<90))g++;r.kayonGanti=g;r.kayonAda=g>=12;
  /* dua jalur seek + kedip hidup + lengan bergerak */
  BLENCONG.kedip=.6;seek(3);const f1=c.toDataURL();seek(7);seek(.1);seek(3);r.seekSama=f1===c.toDataURL();
  seek(3.3);r.kedipHidup=f1!==c.toDataURL();BLENCONG.kedip=0;seek(.5);const f3=c.toDataURL();seek(2);r.lenganHidup=f3!==c.toDataURL();
  const t=(f,re)=>{try{f();return false;}catch(e){return re.test(e.message);}};r.ditolak=t(()=>wayang.figur({jenis:'panakawan'}),/panakawan belum ada/)&&t(()=>wayang.figur({jenis:'x'}),/jenis tidak dikenal/)&&t(()=>wayang.panggung({sisi:'atas'}),/sisi tidak dikenal/);
  bersih();
  /* sisi dalang: tercermin + lukisan */
  c=wayang.panggung({simping:false,seed:2,res:1,tinggi:520,sisi:'dalang'});wayang.figur({jenis:'alusan',x:500,z:4,seed:2});seek(.5);
  const lompat=q=>{const o=[];for(let i=1;i<q.length;i++)if(Math.abs(q[i]-q[i-1])>25)o.push(i);return o;},dada=980-Math.round(520*.62),Bc=baris(c,dada,1250,1590),Jb=lompat(Bc),Jk=lompat(baris(c,dada,330,670));
  r.lompat=[Jb.length,Jk.length];r.dalangCermin=Jb.length>=2&&Jk.length<=1;const tengah=Jb.length?Bc.slice(Jb[0]+2,Jb[Jb.length-1]-1).sort((m,n)=>m-n):[0];r.pradaL=+(tengah[tengah.length>>1]||0).toFixed(1);r.dalangLukis=r.pradaL>70;bersih();
  Object.assign(BLENCONG,b0);return r;};

