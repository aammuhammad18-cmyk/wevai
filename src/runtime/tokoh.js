/* TOKOH (sub-proyek 4b) — rig tokoh v2: kontrak, API, jebakan, catatan budaya: references/tokoh.md. Satu global `tokoh`.
   Rangka 2,5D (konsep Spine/DragonBones): 19 tulang berarah 3D diproyeksikan menurut arah pandang (depan 0°, tigaperempat 45°,
   samping 90°) → slot datar berurutan gambar sendiri; lampiran = path bezier yang dirancang per bagian (bukan kapsul). Pose =
   fungsi murni waktu (IK dua tulang, jalan tanpa selip). buat() = string SVG diam; gerak() = kanvas yang dihapus dan digambar
   ulang dari tl.time() tiap frame (transform <g> di svg ber-will-change tidak deterministik piksel — tokoh.md). Butuh atmosfer
   (+ pustaka untuk kain bermotif, cahaya-2d untuk cahaya bernama). Diuji tanpa browser: scripts/test-tokoh.mjs. */
const tokoh=(()=>{
const{PI,sin,cos,atan2,hypot,acos,max,min,abs,round,sqrt,floor,ceil}=Math,RAD=PI/180,f=v=>round(v*10)/10,f4=v=>round(v*1e4)/1e4,
  tk=p=>f(p[0])+','+f(p[1]),lerp=(a,b,k)=>a+(b-a)*k,ss=x=>x<=0?0:x>=1?1:x*x*(3-2*x),
  salah=(n,m)=>{throw new Error('tokoh.'+n+': '+m);},
  hex=a=>'#'+a.map(v=>max(0,min(255,round(v))).toString(16).padStart(2,'0')).join(''),
  campur=(a,b,k)=>{const A=warnaRGB(a),B=warnaRGB(b);return hex(A.map((v,i)=>v+(B[i]-v)*k));},
  hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(36);},
  /* titik → path tertutup halus (Catmull-Rom → kubik) */
  halus=p=>{const n=p.length;let d='M'+tk(p[0]);for(let i=0;i<n;i++){const a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],e=p[(i+2)%n];
    d+=`C${tk([b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6])} ${tk([c[0]-(e[0]-b[0])/6,c[1]-(e[1]-b[1])/6])} ${tk(c)}`;}return d+'Z';},
  campurTitik=(A,B,k)=>A.map((p,i)=>[lerp(p[0],B[i][0],k),lerp(p[1],B[i][1],k)]),
  /* cincin depan simetris: [bawah, 6 titik +x naik, atas] → cincin penuh (sisi −x dicerminkan) */
  cermin=d=>d.concat(d.slice(1,-1).reverse().map(([x,y])=>[-x,y])),
  kotakTitik=p=>{const X=p.map(q=>q[0]),Y=p.map(q=>q[1]);return[min(...X),min(...Y),max(...X),max(...Y)];};

/* RANGKA (tinggi 1000, telapak di y 0, menghadap kanan): [nama, induk, di ujung induk?, offset x y z, panjang, arah, sisi].
   arah t = menggantung (lokal +y sepanjang tulang), n = tegak (lokal −y), m = maju (lokal +x). sisi 1 = dekat (D, −x), −1 = jauh (J) */
const TL=[['panggul',-1,0,0,-510,0,40,'n',0],['perut',0,0,0,0,0,175,'n',0],['dada',1,1,0,0,0,135,'n',0],['leher',2,1,0,0,0,48,'n',0],
  ['kepala',3,1,0,0,0,130,'n',0],
  ['lenganD',2,1,-118,14,0,185,'t',1],['hastaD',5,1,0,0,0,160,'t',1],['tanganD',6,1,0,0,0,92,'t',1],
  ['lenganJ',2,1,118,14,0,185,'t',-1],['hastaJ',8,1,0,0,0,160,'t',-1],['tanganJ',9,1,0,0,0,92,'t',-1],
  ['pahaD',0,0,-50,12,0,225,'t',1],['betisD',11,1,0,0,0,228,'t',1],['kakiD',12,1,0,0,0,120,'m',1],
  ['pahaJ',0,0,50,12,0,225,'t',-1],['betisJ',14,1,0,0,0,228,'t',-1],['kakiJ',15,1,0,0,0,120,'m',-1],
  ['sampurD',0,0,-84,-24,22,300,'t',1],['sampurJ',0,0,84,-24,-30,300,'t',-1]],
  NAMA=TL.map(t=>t[0]),IX=Object.fromEntries(NAMA.map((n,i)=>[n,i])),ARAH0={t:[0,1,0],n:[0,-1,0],m:[0,0,1]},
  PANDANG={tigaperempat:45,depan:0,samping:90};
/* Rx(a)·Rz(b): a = ayun sagital (ujung tulang menggantung ke depan), b = ayun lateral */
const rot=(a,b,[x,y,z])=>{const u=x*cos(b)-y*sin(b),v=x*sin(b)+y*cos(b);return[u,v*cos(a)-z*sin(a),v*sin(a)+z*cos(a)];};
function fk(T,th,la,ax,ay){const A=[],B=[],S=[],E=[];
  T.forEach(([,p,uj,ox,oy,oz,L,r],i)=>{const a=(p<0?0:A[p])+th[i],b=(p<0?0:B[p])+la[i];A[i]=a;B[i]=b;
    const o=p<0?[ox+ax,oy+ay,oz]:rot(A[p],B[p],[ox,oy,oz]),s=p<0?o:(uj?E[p]:S[p]).map((v,j)=>v+o[j]),d=rot(a,b,ARAH0[r]);
    S[i]=s;E[i]=s.map((v,j)=>v+d[j]*L);});
  return{A,B,S,E};}
/* proyeksi ortografis (yaw ψ) → matriks slot 2D. Tulang menggantung/tegak: putar + pendekkan (foreshortening) sepanjang
   tulang; kaki: kaku, hanya diputar sudut sagitalnya × sin ψ (tampak depan: telapak menghadap kamera tanpa dipipihkan) */
function matriks(T,F,psi){const c=cos(psi),s=sin(psi),P=v=>[v[0]*c+v[2]*s,v[1]];
  return T.map(([,,,,,,L,r],i)=>{const a=P(F.S[i]),e=P(F.E[i]),vx=e[0]-a[0],vy=e[1]-a[1],m=hypot(vx,vy);
    if(r==='m'){const q=-F.A[i]*s;return[cos(q),sin(q),-sin(q),cos(q),a[0],a[1]];}
    let ux=m>1e-6?vx/m:0,uy=m>1e-6?vy/m:(r==='n'?-1:1);const k=max(m/L,.02);if(r==='n'){ux=-ux;uy=-uy;}
    return[uy,-ux,ux*k,uy*k,a[0],a[1]];});}
const kali=(M,[x,y])=>[M[0]*x+M[2]*y+M[4],M[1]*x+M[3]*y+M[5]];

/* IK dua tulang analitik. Sudut diukur dari arah bawah (0,1) ke +x. Target di luar jangkauan dijepit (lurus menuju target),
   terlalu dekat dijepit ke |L1−L2|. sisi 1: sendi tengah di sisi +x garis akar→target (lutut ke depan), −1 = sebaliknya.
   → [a1, a2, sendi x, sendi y, ujung x, ujung y] */
function ik(L1,L2,tx,ty,sisi=1){const d=hypot(tx,ty)||1e-9,dd=min(L1+L2-1e-6,max(abs(L1-L2)+1e-6,d)),
    a1=atan2(tx,ty)+sisi*acos(max(-1,min(1,(L1*L1+dd*dd-L2*L2)/(2*L1*dd)))),bx=L1*sin(a1),by=L1*cos(a1),ex=tx/d*dd,ey=ty/d*dd;
  return[a1,atan2(ex-bx,ey-by),bx,by,ex,ey];}

/* POSE bernama (derajat, konvensi penulis: θ + = ayun/condong ke depan, λ + = menjauhi badan). tangan [D, J]; tanah 1 =
   telapak dijaga di tanah; ik {tanganD:[maju, tinggi]} (px tokoh 1000, dari telapak); bawa 1 = gagang benda di tanah */
const TERBUKA=['terbuka','terbuka'],
  /* berdiri santai, kontrapposto: tumpu di kaki jauh, panggul miring, bahu berlawanan, lutut dekat sedikit menekuk */
  BERDIRI={th:{perut:-2,dada:-3,leher:5,kepala:-3,lenganD:6,hastaD:12,tanganD:4,lenganJ:-4,hastaJ:14,tanganJ:4,pahaD:7,betisD:-12,kakiD:5,pahaJ:-2,betisJ:1},
    la:{panggul:-3,perut:4,dada:2,kepala:-2,lenganD:4,lenganJ:5,pahaD:6,pahaJ:-1},tangan:TERBUKA,tanah:1},
  /* sembah: sudut dicari agar telapak bertemu di depan dagu (siku rapat ke badan) di ketiga pandang */
  SEMBAH={th:{dada:6,leher:9,kepala:12,lenganD:4,hastaD:140,tanganD:25,lenganJ:4,hastaJ:140,tanganJ:25},la:{lenganD:-16,hastaD:-5,tanganD:21,lenganJ:-16,hastaJ:-5,tanganJ:21},tangan:['sembah','sembah']},
  BERSILA={th:{perut:2,dada:-2,leher:4,kepala:-2,lenganD:14,hastaD:52,tanganD:6,lenganJ:10,hastaJ:56,tanganJ:6,pahaD:72,betisD:-150,kakiD:78,pahaJ:72,betisJ:-150,kakiJ:78},
    la:{lenganD:10,lenganJ:10,pahaD:48,betisD:-118,pahaJ:48,betisJ:-118},akar:[0,404],tangan:TERBUKA,tanah:0,duduk:1},
  gabung=(a,b)=>({...a,...b,th:{...a.th,...b.th},la:{...a.la,...b.la}}),
  POSE={berdiri:BERDIRI,
    menunjuk:gabung(BERDIRI,{th:{dada:2,leher:-2,kepala:-6,lenganD:66,hastaD:8,tanganD:-4},la:{lenganD:42},tangan:['tunjuk','terbuka']}),
    sembah:gabung(BERDIRI,{...SEMBAH,th:{perut:3,...SEMBAH.th}}),
    tombak:gabung(BERDIRI,{th:{lenganD:34,hastaD:82,tanganD:-8},la:{lenganD:16},tangan:['genggam','terbuka'],bawa:1}),
    bersila:BERSILA,silasembah:gabung(BERSILA,SEMBAH),
    meraih:gabung(BERDIRI,{th:{perut:20,dada:14,leher:-6,kepala:-2,pahaD:12,betisD:-20,kakiD:8,pahaJ:4,betisJ:-10},la:{panggul:0,perut:0,dada:0},ik:{tanganD:[380,440]}})};
POSE.bawa=gabung(POSE.tombak,{bawa:0,th:{lenganD:20,hastaD:70}});
const N=TL.length,SG=TL.map(t=>t[7]==='n'?-1:1),SL=TL.map(t=>t[8]||1);
/* pose bernama → sudut dalam (radian) + akar */
function rakitPose(p){const th=new Float64Array(N),la=new Float64Array(N);
  for(const k in p.th||{})th[IX[k]]=p.th[k]*RAD*SG[IX[k]];for(const k in p.la||{})la[IX[k]]=p.la[k]*RAD*SL[IX[k]];
  return{th,la,ax:(p.akar||[0,0])[0],ay:(p.akar||[0,0])[1],tangan:p.tangan||TERBUKA,tanah:p.tanah??1,bawa:p.bawa??0,duduk:p.duduk||0,ik:p.ik||null};}

/* siklus jalan prosedural (Rosen, GDC 2014): telapak = IK ke titik pijak per fase (tumpu 0–.5, ayun .5–1), panggul setinggi
   kaki tumpu sanggup (naik-turun 2× per siklus), lengan berlawanan kaki. φ = jarak tempuh / (2 · langkah): tanpa selip */
function jalan(G,phi,o){const P=rakitPose({th:{dada:-3,leher:4,kepala:-2}}),S=o.langkah,T=G.T,L1=T[IX.pahaD][6],L2=T[IX.betisD][6],kaki=[],ay=-45;
  for(const off of[0,.5]){const p=(phi+off)%1;let z,y=ay,r;
    if(p<.5){z=S/2-S*p/.5;r=p<.08?lerp(12,0,p/.08):p<.3?0:-34*ss((p-.3)/.2);if(r<0){y-=110*sin(-r*RAD);z+=110*(1-cos(r*RAD));}}
    else{const q=(p-.5)/.5;z=-S/2+S*ss(q);y-=o.angkat*sin(PI*q);r=lerp(-34,12,ss(q));}
    kaki.push({p,z,y,r});}
  let akar=-1e9;for(const k of kaki)if(k.p<.5||k.p>.97)akar=max(akar,k.y-sqrt(max(0,(.985*(L1+L2))**2-k.z*k.z))-12);
  if(akar<-1e8)akar=-510;P.ay=akar+510;
  kaki.forEach((k,j)=>{const s=j?'J':'D',[a1,a2]=ik(L1,L2,k.z,k.y-(akar+12),1);
    P.th[IX['paha'+s]]=a1;P.th[IX['betis'+s]]=a2-a1;P.th[IX['kaki'+s]]=k.r*RAD-a2;
    const w=cos(2*PI*kaki[1-j].p);P.th[IX['lengan'+s]]=(o.ayun*w+4)*RAD;P.th[IX['hasta'+s]]=(16+12*max(0,w))*RAD;});
  P.th[IX.perut]=-3*RAD;P.tanah=0;return P;}

/* kunci gerak [[t, pose, {durasi, laju, langkah, ik, …}], …] → fungsi murni waktu. Transisi kunci i dimulai di t_i selama
   durasi (smoothstep). Jarak jalan X(t) = ∫ laju·bobot — analitik, jadi fase kaki tetap menempel di tanah saat mulai/berhenti */
const IS=s=>s*s*s-s*s*s*s/2;
function siapkan(kunci){if(!Array.isArray(kunci)||!kunci.length)salah('gerak','kunci harus larik [[t, pose, {…}], …]');
  let t0=-Infinity;return kunci.map(([t,p,o={}],i)=>{if(!(typeof t==='number'&&t>=t0))salah('gerak',`kunci harus urut waktu (kunci ${i}: ${t})`);t0=t;
    if(p!=='jalan'&&!POSE[p])salah('gerak',`pose tidak dikenal: ${p} (jalan ${Object.keys(POSE).join(' ')})`);
    const nx=kunci[i+1];return{t,p,o:{laju:220,langkah:300,angkat:58,ayun:20,...o},d:min(o.durasi??.6,nx?nx[0]-t:9)};});}
function jarak(K,t){let X=0;K.forEach((k,i)=>{if(k.p!=='jalan'||t<=k.t)return;const nx=K[i+1],v=k.o.laju,
    e=nx?min(t,nx.t):t,s1=min(1,(e-k.t)/k.d);X+=v*(k.d*IS(s1)+max(0,e-k.t-k.d));
    if(nx&&t>nx.t){const s=min(1,(t-nx.t)/nx.d);X+=v*nx.d*(s-IS(s));}});return X;}
function sampel(G,k,t,X){const P=sampel0(G,k,t,X);P.benda=k.o.benda??1;if(k.o.tangan)P.tangan=k.o.tangan;return P;}
function sampel0(G,k,t,X){if(k.p==='jalan')return jalan(G,(X/(2*k.o.langkah))%1+1e-9,k.o);
  const P=rakitPose(POSE[k.p]),ik2=k.o.ik||P.ik,h=sin(2*PI*(t/3.7+G.fase)),g=sin(2*PI*(t/5.3+G.fase*1.7));
  P.th[IX.dada]+=1.1*h*RAD*-1;P.th[IX.kepala]+=1.4*g*RAD*-1;P.th[IX.lenganD]+=.8*h*RAD;P.th[IX.lenganJ]+=.8*g*RAD;   // napas, kepala, lengan
  if(ik2)for(const n in ik2){const s=n.slice(-1),F=fk(G.T,P.th,P.la,P.ax,P.ay),i=IX['lengan'+s],sh=F.S[i],
      [a1,a2]=ik(G.T[i][6],G.T[i+1][6],ik2[n][0]-sh[2],-ik2[n][1]-sh[1],-1);
    P.th[i]=a1-F.A[IX.dada];P.th[i+1]=a2-a1;P.th[i+2]=(k.o.sudutTangan??12)*RAD;P.la[i]=P.la[i+1]=0;}
  return P;}
function campurPose(A,B,w){const th=A.th.map((v,i)=>lerp(v,B.th[i],w)),la=A.la.map((v,i)=>lerp(v,B.la[i],w));
  return{th,la,ax:lerp(A.ax,B.ax,w),ay:lerp(A.ay,B.ay,w),tangan:w<.5?A.tangan:B.tangan,bawa:lerp(A.bawa,B.bawa,w),tanah:lerp(A.tanah,B.tanah,w),duduk:w<.5?A.duduk:B.duduk,benda:w<.5?A.benda:B.benda};}
/* telapak terendah (tumit/jari, px tokoh) — tanah 1 menggeser akar supaya menapak di y 0 */
const telapak=(F,i)=>{const d=rot(F.A[i],F.B[i],[0,0,1]),b=rot(F.A[i],F.B[i],[0,1,0]),s=F.S[i];return max(s[1]-36*d[1]+45*b[1],s[1]+118*d[1]+45*b[1]);};
/* pose(id, kunci, t) → {akar, m (string transform tiap slot), q (angka), tangan, duduk, F}: fungsi murni waktu */
function pose(id,kunci,t){const G=RIG[id]||salah('pose',`tokoh tidak dikenal: ${id}`),K=kunci[0]&&kunci[0].o?kunci:siapkan(kunci),X=jarak(K,t);
  let i=K.length-1;while(i>0&&K[i].t>t)i--;
  const cur=sampel(G,K[i],t,X),w=i?ss((t-K[i].t)/K[i].d):1,P=w<1?campurPose(sampel(G,K[i-1],t,X),cur,w):cur;
  const sw=sin(2*PI*(t/2.9+G.fase)),v=(X-jarak(K,t-.25))/.25;   // sampur: ayun + tertinggal saat berjalan
  for(const s of['D','J']){P.th[IX['sampur'+s]]=(-v*.06+4*sw)*RAD;P.la[IX['sampur'+s]]=(6+2*sw)*RAD;}
  let F=fk(G.T,P.th,P.la,P.ax,P.ay);
  if(P.tanah>0){P.ay-=P.tanah*max(telapak(F,IX.kakiD),telapak(F,IX.kakiJ));F=fk(G.T,P.th,P.la,P.ax,P.ay);}
  return{...bentuk(G,{dx:X*sin(G.psi),M:matriks(G.T,F,G.psi),bawa:P.bawa}),tangan:P.tangan,duduk:P.duduk,benda:P.benda,F};}

/* BENTUK. Anggota: profil setengah-lebar di t = 0 .2 .45 .7 .9 1 untuk tepi [maju, mundur, luar, dalam]; cincin depan ↔
   samping dicampur menurut arah pandang. Ujung membulat menutupi sendi (sambungan tersembunyi, cara wayang) */
const T6=[0,.2,.45,.7,.9,1],
  PROF={lengan:[[30,35,33,29,27,26],[34,35,31,28,26,26],[44,40,33,28,27,26],[27,29,28,27,26,25]],
    hasta:[[25,29,26,21,18,17],[27,30,26,21,18,17],[27,31,27,22,19,18],[25,28,24,20,17,17]],
    paha:[[60,62,56,47,41,39],[66,60,51,45,41,39],[64,62,54,46,41,39],[54,52,47,42,39,38]],
    betis:[[39,37,31,26,23,22],[40,51,45,31,23,21],[40,45,39,29,23,22],[40,47,39,28,22,21]],
    leher:[[34,31,29,29,31,34],[30,28,27,27,29,32],[34,32,31,31,33,36],[34,32,31,31,33,36]]},
  ruas=(L,P,M,naik)=>{const p=[[0,-(P[0]+M[0])*.38]];T6.forEach((t,i)=>p.push([P[i],t*L]));p.push([0,L+(P[5]+M[5])*.42]);
    for(let i=5;i>=0;i--)p.push([-M[i],T6[i]*L]);return naik?p.map(([x,y])=>[x,-y]):p;},
  DADA={d:[[0,32],[88,30],[100,-8],[112,-56],[128,-98],[98,-124],[40,-141],[0,-145]],
    s:[[-4,34],[48,32],[63,-6],[71,-52],[62,-98],[40,-124],[20,-142],[-4,-146],[-30,-140],[-56,-120],[-66,-74],[-62,-28],[-54,10],[-48,30]]},
  PERUT={d:[[0,44],[94,40],[90,4],[80,-46],[82,-96],[88,-140],[90,-178],[0,-184]],
    s:[[0,44],[52,42],[56,4],[50,-46],[50,-96],[56,-140],[58,-178],[0,-184],[-50,-178],[-46,-140],[-40,-96],[-44,-46],[-56,0],[-62,40]]},
  KEPALA={d:[[0,8],[26,2],[44,-24],[54,-52],[57,-82],[50,-108],[30,-126],[0,-133]],
    s:[[10,6],[33,2],[38,-17],[53,-41],[43,-55],[45,-75],[37,-104],[-4,-134],[-40,-122],[-58,-94],[-58,-64],[-47,-38],[-31,-18],[-14,0]]},
  RAMBUT={d:[[-60,-84],[-57,-112],[-34,-133],[0,-140],[34,-133],[57,-112],[60,-84],[47,-98],[25,-110],[0,-113],[-25,-110],[-47,-98]],
    s:[[-46,-28],[-62,-62],[-62,-98],[-41,-129],[-4,-141],[30,-126],[41,-106],[24,-110],[0,-117],[-22,-101],[-34,-72],[-30,-34]]},
  TANGAN={terbuka:[[-17,0],[-22,30],[-18,64],[-10,86],[2,92],[12,84],[20,52],[27,26],[25,8],[17,0]],
    genggam:[[-17,0],[-23,20],[-21,46],[-8,58],[10,57],[22,42],[25,16],[17,0]],
    tunjuk:[[-17,0],[-23,22],[-19,46],[-9,52],[-7,98],[0,104],[6,98],[8,54],[21,44],[25,16],[17,0]],
    sembah:[[-15,0],[-18,36],[-12,90],[-3,102],[6,98],[15,44],[15,8]]},
  KAKI={s:[[-24,-8],[-36,24],[-38,42],[-20,47],[60,47],[112,46],[124,40],[118,30],[80,24],[28,4]],
    d:[[-17,-10],[-21,20],[-30,40],[-26,47],[0,49],[26,47],[30,40],[22,20],[17,-10],[0,-14]]};

/* KOSTUM (konvensi di catatan budaya references/tokoh.md). Panel kain menempel di paha (ikut ayun), wiron + kain pinggang +
   sabuk menempel di panggul, sampur = tulang sekunder (ayun dari waktu) */
const panel=(hem,k,sisi)=>{const s=[[-72,-64],[-80,-10],[-78,60],[-70,hem*.6],[-64,hem],[-20,hem+8],[30,hem+4],[62,hem],[66,hem*.6],[68,30],[62,-40],[30,-68]],
    d=[[-60,-66],[-66,-10],[-64,60],[-60,hem*.6],[-58,hem],[-20,hem+6],[20,hem+6],[52,hem],[54,hem*.6],[54,30],[52,-40],[30,-70]];
    return campurTitik(sisi>0?d:d.map(([x,y])=>[-x,y]).reverse(),sisi>0?s:s,k);},
  ARKETIPE={raja:{badan:1.04,kepala:'mahkota',kain:1,motif:'kawung',warnaKain:['#2c2018','#b89a5a','#6e4a24'],sabuk:'#9a7438',sampur:'#6a2a24',emas:1,keris:1},
    prajurit:{badan:1.1,kepala:'ikat',kain:0,warnaKain:'#4a2420',sabuk:'#2a1a14',sampur:'#5a2a20',kelat:1,keris:1,bawa:['tombak','perisai']},
    resi:{badan:.94,kepala:'jata',jenggot:1,kain:1,warnaKain:'#8a7a5c',upawita:1,bawa:['tongkat',null]},
    petani:{badan:1,kepala:'ikat',kain:0,warnaKain:'#3a3024',sabuk:'#2a2018',bawa:['cangkul',null]},
    putri:{badan:.86,putri:1,kepala:'jamang',kain:1,motif:'ceplok',warnaKain:['#1e2034','#c4ad78','#7a3428'],sabuk:'#9a7438',sampur:'#5a2e3a',emas:1,kemben:'#3a1c24'},
    rakyat:{badan:1,kepala:'ikat',kain:0,warnaKain:'#3e3428'}},
  DUDUK={kainD:0,kainJ:0,wiron:0,sampurD:0,sampurJ:0,pangku:1},
  BENDA={tombak:[60,1130],tongkat:[0,600],cangkul:[60,760],payung:[260,1280],perisai:[80,340],sesaji:[46,90]},
  URUT={samping:['bawaJ','lenganJ','hastaJ','tanganJ','pahaJ','betisJ','kakiJ','kainJ','sampurJ','perut','dada','leher','kepala','keris','panggul','pahaD','betisD','kakiD','pangku','kainD','wiron','sabuk','sampurD','bawaD','lenganD','hastaD','tanganD'],
    depan:['pahaJ','betisJ','kakiJ','pahaD','betisD','kakiD','kainJ','kainD','wiron','keris','perut','dada','panggul','pangku','sabuk','sampurJ','sampurD','leher','kepala','bawaJ','lenganJ','hastaJ','tanganJ','bawaD','lenganD','hastaD','tanganD']},
  TULANG_SLOT={kainD:'pahaD',kainJ:'pahaJ',pangku:'panggul',wiron:'panggul',sabuk:'panggul',keris:'panggul',bawaD:'tanganD',bawaJ:'tanganJ'};

const RIG={};   // id → rig: rangka + bagian (data murni) — dibaca pose(), SVG, dan kanvas
function opsi(n,D,o={}){if(!o||typeof o!=='object'||Array.isArray(o))salah(n,'opsi harus objek {…}');
  for(const k in o)if(!(k in D))salah(n,`opsi tidak dikenal: ${k} (${Object.keys(D).join(' ')})`);
  const r={};for(const k in D){const d=D[k],v=o[k]===undefined?(Array.isArray(d)?d[0]:d):o[k];
    if(Array.isArray(d)&&!d.includes(v))salah(n,`${k} tidak dikenal: ${v} (${d.join(' ')})`);
    if(typeof d==='number'&&!(typeof v==='number'&&isFinite(v)))salah(n,`${k} harus angka (dapat ${v})`);
    if(v!=null&&['tinggi','n','badan','resolusi'].includes(k)&&!(v>0))salah(n,`${k} harus > 0 (dapat ${v})`);
    if(k==='id'&&v!=null&&!/^[A-Za-z][\w-]*$/.test(v))salah(n,`id diawali huruf; hanya huruf, angka, - dan _ (dapat ${v})`);
    r[k]=v;}return r;}
/* cahaya (konvensi pustaka: nama SUMBER | {x,y,warna,kuat} | {arah}) → arah satuan dari (cx,cy) ke sumber, warna, kuat, titik */
function lampu(n,c,cx,cy){if(c==null)c={arah:235};
  if(typeof c==='string'){if(typeof ambilSumber!=='function')salah(n,`cahaya '${c}' butuh blok cahaya-2d (SUMBER)`);const s=ambilSumber(c);c={x:s.x,y:s.y,warna:s.warna,kuat:min(1,s.kuat??1),jangkau:s.jangkau};}
  if(typeof c!=='object')salah(n,`cahaya harus nama SUMBER, {x,y} atau {arah} (dapat ${c})`);
  const t=c.x!=null,a=t?atan2(c.y-cy,c.x-cx):(c.arah??235)*RAD,d=t?hypot(c.x-cx,c.y-cy):0;
  return{x:cos(a),y:sin(a),w:c.warna||LANGIT.warnaMatahari,k:(c.kuat??.75)*(c.jangkau?max(.3,min(1,1.6-d/(1.6*c.jangkau))):1),t:t?[c.x,c.y,c.jangkau]:null};}

/* RAKIT: opsi → rig + bagian per slot. bagian = {d, f (warna | gradien | 'pola'), s/w (garis), m (matriks lokal), t (varian tangan), k (kotak)} */
const BUAT={x:960,y:900,tinggi:600,arketipe:['rakyat','raja','prajurit','resi','petani','putri'],arah:Object.keys(PANDANG),hadap:['kanan','kiri'],pose:'berdiri',
  seed:1,detail:2,cahaya:null,jarak:0,id:null,badan:null,kulit:null,kostum:null,fase:null};
function rakit(o){o=opsi('buat',BUAT,o);if(!POSE[o.pose])salah('buat',`pose tidak dikenal: ${o.pose} (${Object.keys(POSE).join(' ')})`);
  if(![0,1,2].includes(o.detail))salah('buat',`detail harus 0, 1, atau 2 (dapat ${o.detail})`);
  if(o.kostum!=null&&typeof o.kostum!=='object')salah('buat','kostum harus objek (kunci ARKETIPE)');
  const A={...ARKETIPE[o.arketipe],...(o.kostum||{})},Rn=mulberry32(o.seed),bw=o.badan??A.badan,pt=A.putri?1:0,
    psi=PANDANG[o.arah]*RAD,k=PANDANG[o.arah]/90,h=o.hadap==='kiri'?-1:1,
    id=o.id||`wvt-${o.arketipe}-${hash(JSON.stringify(o)+LANGIT.horizon)}`,
    T=TL.map(t=>{const u=t.slice();if(u[1]===2&&u[3])u[3]*=(pt?.86:1)*bw;if(u[1]===0&&u[3]&&u[0].startsWith('paha'))u[3]*=(pt?1.1:1)*bw;return u;}),
    L=lampu('buat',[].concat(o.cahaya)[0]??null,o.x,o.y-o.tinggi/2),Lx=L.x*h,Ly=L.y,J=c=>warnaJarak(c,o.jarak,-2000),dt=o.detail,
    kulit=o.kulit||['#6a4430','#5e3a28','#72482e'][floor(Rn()*3)],B={},
    G=RIG[id]={id,o,T,psi,k,h,s:o.tinggi/1000,x:o.x,y:o.y,fase:o.fase??Rn(),slot:[],bawa:[],B,L,dt,
      rim:J(L.w),siluet:J('#150f12')},
    M=pose(id,[[0,o.pose]],0).M,
    /* bahan = warna rata bernada malam. TANPA gradien per slot: tiap segmen berbayang sendiri = manekin kayu bersendi bola (terukur
       di katalog). Volume = satu gradien layar per tokoh searah cahaya (kanvas gerak) */
    bahan=c=>dt?J(campur(c,'#08060c',.32)):null,
    P=(n,pts,f,x={})=>(B[n]=B[n]||[]).push({d:typeof pts==='string'?pts:halus(pts),f:dt?f:null,k:typeof pts==='string'?x.k:kotakTitik(pts),...x}),
    garis=(n,d,c,w)=>dt&&P(n,d,null,{s:c,w}),
    Mb=n=>M[IX[TULANG_SLOT[n]||n]],bagian=(n,c,pts)=>P(n,pts,bahan(c)),emas=J('#b8873a'),rambut=J('#120c0a'),urat=rgba(J(campur(kulit,'#000',.55)),.55);
  /* tubuh */
  for(const sd of['D','J']){const sg=sd==='D'?1:-1;
    for(const b of['lengan','hasta','paha','betis']){const[mj,md,lu,da]=PROF[b],tb=T[IX[b+sd]][6],
        w=(pt&&b!=='betis'?.86:1)*bw,P2=(sg>0?da:lu).map((v,i)=>lerp(v,mj[i],k)*w),M2=(sg>0?lu:da).map((v,i)=>lerp(v,md[i],k)*w);
      bagian(b+sd,kulit,ruas(tb,P2,M2));
      if(b==='lengan'&&(A.kelat||A.emas)&&dt){const y=.3*tb,a=P2[1]*1.04,c=M2[1]*1.04;P(b+sd,[[-c,y-9],[a,y-9],[a,y+9],[-c,y+9]],emas);
        if(A.emas)P(b+sd,[[-c*.1,y-9],[(a-c)/2,y-26],[a*.3,y-9]],emas);}
      if(b==='hasta'&&A.emas&&dt){const y=.86*tb;P(b+sd,[[-M2[4]-2,y],[P2[4]+2,y],[P2[4]+2,y+14],[-M2[4]-2,y+14]],emas);}}
    for(const v in TANGAN)P('tangan'+sd,TANGAN[v].map(([x,y])=>[x*bw,y]),bahan(kulit),{t:v});
    bagian('kaki'+sd,kulit,campurTitik(KAKI.d,KAKI.s,k));}
  const ring=(R,sc)=>campurTitik(cermin(R.d).map(([x,y])=>[x*sc,y]),R.s.map(([x,y])=>[x*(sc*.5+.5),y]),k);
  bagian('perut',kulit,ring(PERUT,(pt?.88:1)*bw));bagian('dada',kulit,ring(DADA,(pt?.86:1)*bw));
  const urat3=(n,a,b,w=4)=>{if(dt<2)return;const q=campurTitik(a,b,k);garis(n,`M${tk(q[0])}Q${tk(q[1])} ${tk(q[2])}`,urat,w);};
  if(!pt){urat3('dada',[[-74,-46],[-38,-26],[-4,-42]],[[16,-46],[44,-34],[66,-54]]);urat3('dada',[[74,-46],[38,-26],[4,-42]],[[16,-46],[44,-34],[66,-54]]);
    urat3('dada',[[0,-114],[0,-82],[0,-46]],[[40,-112],[40,-112],[40,-112]],3);urat3('perut',[[0,-160],[2,-110],[0,-56]],[[46,-150],[46,-150],[46,-150]],3);}
  urat3('dada',[[-16,-134],[-58,-124],[-100,-128]],[[16,-136],[36,-130],[54,-124]],3);urat3('dada',[[16,-134],[58,-124],[100,-128]],[[16,-136],[36,-130],[54,-124]],3);
  urat3('perut',[[-6,-36],[0,-30],[6,-36]],[[50,-36],[52,-32],[50,-28]],3);
  if(A.kemben){const kb=campurTitik([[-104,-84],[0,-90],[104,-84],[100,34],[0,38],[-94,34]],[[-62,-78],[18,-88],[74,-74],[62,34],[0,38],[-52,34]],k);
    P('dada',kb,bahan(A.kemben));if(dt)P('dada',kb.slice(0,3).concat(kb.slice(0,3).reverse().map(([x,y])=>[x,y+10])),emas);}
  const kal=(a,b,c,w)=>{const q=campurTitik(a,b,k);garis('dada',`M${tk(q[0])}Q${tk(q[1])} ${tk(q[2])}`,c,w);};
  if(A.emas)kal([[-44,-136],[0,-60],[44,-136]],[[12,-142],[44,-102],[66,-92]],emas,9);
  if(A.upawita)kal([[-96,-118],[-10,-40],[80,30]],[[-24,-140],[34,-60],[58,26]],J('#d8ccb0'),5);
  bagian('leher',kulit,ruas(48,...[0,1].map(i=>PROF.leher[i].map((v,j)=>lerp(PROF.leher[i+2][j],v,k))),1));
  /* kepala: wajah (profil ↔ depan), telinga, rambut + gelung, penutup kepala, jenggot, anting */
  bagian('kepala',kulit,campurTitik(cermin(KEPALA.d),KEPALA.s,k));
  const tel=campurTitik([[-56,-58]],[[-8,-60]],k)[0],bel=(x,y,rx,ry)=>[[x-rx,y],[x,y-ry],[x+rx,y],[x,y+ry]];
  P('kepala',[[tel[0]-8,tel[1]-14],[tel[0]+6,tel[1]-12],[tel[0]+8,tel[1]+10],[tel[0]-6,tel[1]+14]],J(campur(kulit,'#000',.3)));
  P('kepala',campurTitik(RAMBUT.d,RAMBUT.s,k),rambut);
  const gel=(pt?campurTitik([[0,-118]],[[-66,-62]],k):campurTitik([[0,-138]],[[-44,-122]],k))[0];
  if(A.kepala!=='mahkota'&&A.kepala!=='jata')P('kepala',bel(gel[0],gel[1],pt?34:26,pt?26:20),rambut);
  const pita=(d,s)=>campurTitik(d,s,k);
  if(A.kepala==='ikat'){P('kepala',pita([[-61,-90],[0,-98],[61,-90],[59,-114],[0,-122],[-59,-114]],[[-61,-92],[-4,-96],[43,-96],[39,-116],[-4,-126],[-60,-114]]),bahan(J('#3a2a22')));
    if(k>.3)P('kepala',[[-58,-110],[-104,-84],[-112,-66],[-94,-78],[-60,-98]],J('#3a2a22'));}
  if(A.kepala==='jamang'||A.kepala==='mahkota'){P('kepala',pita([[-60,-92],[0,-100],[60,-92],[58,-112],[0,-120],[-58,-112]],[[-60,-94],[-4,-98],[42,-98],[40,-114],[-4,-122],[-60,-112]]),emas);
    const c=campurTitik([[0,-118]],[[34,-116]],k)[0];P('kepala',[[c[0]-16,c[1]],[c[0],c[1]-36],[c[0]+16,c[1]]],emas);}
  /* mahkota (kirita makuta): silinder bertingkat yang meruncing tumpul + sumping di belakang telinga */
  if(A.kepala==='mahkota'){P('kepala',pita(cermin([[0,-104],[54,-104],[56,-150],[50,-196],[44,-232],[30,-258],[12,-272],[0,-276]]),
      [[-8,-102],[44,-104],[44,-150],[38,-196],[30,-232],[16,-258],[-2,-272],[-16,-276],[-34,-262],[-50,-234],[-56,-196],[-60,-150],[-60,-106],[-34,-102]]),bahan(J('#a07a34')));
    for(const y of[-150,-196,-232])garis('kepala',`M${f(-52+k*-6)},${y}Q${f(-6*k)},${y+12} ${f(52-k*14)},${y}`,J('#4a3418'),6);
    P('kepala',[[tel[0]-6,tel[1]-34],[tel[0]-30,tel[1]-50],[tel[0]-26,tel[1]-12],[tel[0]-10,tel[1]+4]],emas);}
  if(A.kepala==='jata'){P('kepala',pita([[-48,-104],[-44,-150],[-28,-196],[0,-214],[28,-196],[44,-150],[48,-104]],[[-58,-98],[-60,-146],[-46,-190],[-16,-210],[12,-192],[24,-150],[30,-110]]),rambut);
    for(const y of[-130,-160,-188])garis('kepala',`M${f(-44+k*-10)},${y}Q${f(-6*k)},${y-10} ${f(42-k*18)},${y}`,'#2c221c',5);}
  if(A.jenggot)P('kepala',pita([[-38,-34],[38,-34],[34,30],[16,78],[0,90],[-16,78],[-34,30]],[[36,-26],[42,6],[34,52],[18,84],[4,88],[-6,46],[-8,-10]]),J('#8a8070'));
  if(A.emas&&dt)P('kepala',[[tel[0]-5,tel[1]+12],[tel[0]+5,tel[1]+12],[tel[0]+4,tel[1]+34],[tel[0]-4,tel[1]+34]],emas);
  /* kain: panel di paha (pola pustaka.kain bila blok pustaka ada), pangku (duduk), kain pinggang, wiron, sabuk, sampur, keris */
  const hem=A.kain?478:250,warnaKain=[].concat(A.warnaKain);
  if(dt>1&&A.motif&&typeof pustaka!=='undefined')G.pola=pustaka.kain({motif:A.motif,id:`${id}-kain`,skala:1.35,warna:warnaKain.map(J)});
  const kain=(n,pts)=>{const m=Mb(n),sg=Math.sign(m[0]*Lx+m[1]*Ly)||1;P(n,pts,G.pola?'pola':bahan(warnaKain[0]));
      if(dt)P(n,pts,{id:`${id}-l${n}`,x1:sg>0?1:0,y1:0,x2:sg>0?0:1,y2:0,st:[[0,'#05030a',.05],[.18,'#05030a',.3],[.32,'#05030a',.12],[.5,'#05030a',.42],[.66,'#05030a',.22],[.84,'#05030a',.55],[1,'#05030a',.72]]});},
    pk=A.kain?1:.86,hp=hem+12;
  kain('kainD',panel(hem,k,1));kain('kainJ',panel(hem,k,-1));
  kain('pangku',campurTitik([[-100,-44],[100,-44],[180,16],[246,66],[232,100],[0,110],[-232,100],[-246,66],[-180,16]].map(([x,y])=>[x*pk,y]),
    [[-72,-44],[62,-44],[132,24],[204,66],[198,100],[60,110],[-62,106],[-86,60],[-82,8]].map(([x,y])=>[x*pk,y]),k));
  kain('panggul',pita([[-104,-56],[104,-56],[110,20],[96,84],[0,96],[-96,84],[-110,20]],[[-72,-56],[62,-56],[66,20],[56,92],[0,106],[-62,100],[-82,40]]));
  kain('wiron',pita([[-24,-48],[24,-48],[26,40],[30,hp],[16,hp+16],[0,hp],[-16,hp+16],[-30,hp]],[[40,-48],[66,-46],[68,40],[74,hp],[62,hp+16],[54,hp],[46,hp+14],[38,hp]]));
  {const w=campurTitik([[-12,40],[12,40]],[[52,40],[60,40]],k);garis('wiron',`M${tk(w[0])}L${f(w[0][0]-6)},${hp}M${tk(w[1])}L${f(w[1][0]+6)},${hp}`,J('#140c0c'),4);}
  if(A.sabuk){const sb=pita([[-100,-68],[100,-68],[102,-32],[0,-24],[-102,-32]],[[-70,-68],[64,-68],[66,-32],[0,-30],[-72,-32]]),tm=campurTitik([[0,-48]],[[62,-48]],k)[0];
    P('sabuk',sb,bahan(A.sabuk));if(A.emas&&dt)P('sabuk',[[tm[0]-15,tm[1]-12],[tm[0]+15,tm[1]-12],[tm[0]+15,tm[1]+12],[tm[0]-15,tm[1]+12]],emas);}
  if(A.sampur)for(const sd of['D','J'])bagian('sampur'+sd,A.sampur,[[-14,-10],[14,-10],[20,120],[24,282],[10,300],[0,288],[-12,306],[-24,280],[-18,120]]);
  /* keris di sabuk belakang: hulu condong, warangka (ladrang) melintang, gandar tersembunyi di balik kain pinggang (urutan gambar) */
  if(A.keris){const a=lerp(0,-28,k)*RAD,m=[f4(cos(a)),f4(sin(a)),f4(-sin(a)),f4(cos(a)),f(lerp(0,-72,k)),-58];
    P('keris',[[-5,2],[-9,-22],[-4,-44],[6,-50],[12,-38],[6,-20],[7,2]],J('#2e1c12'),{m});
    P('keris',[[-70,8],[-76,-4],[-56,-2],[0,4],[46,-2],[70,-10],[66,8],[20,18],[-24,18]],bahan(J('#5a3a22')),{m});
    P('keris',[[-8,14],[8,14],[6,180],[0,196],[-6,180]],J('#3e2616'),{m});}
  /* benda di tangan, selalu tegak: gagang di tanah (pose bawa 1) atau ikut genggaman */
  [A.bawa||[]].flat().forEach((b,j)=>{if(!b)return;const n=j?'bawaJ':'bawaD',[lb,pj]=BENDA[b]||salah('buat',`benda tidak dikenal: ${b} (${Object.keys(BENDA).join(' ')})`),
      c=J('#3a2618'),bs=J('#7a7a80'),g1=[[1,0,0,1]][0],R=(x0,x1,y0,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
    if(b==='tombak'){P(n,R(-5,5,0,110-pj),bahan(c),{k:[-5,110-pj,5,0]});P(n,[[0,-pj],[13,40-pj],[9,92-pj],[0,108-pj],[-9,92-pj],[-13,40-pj]],bs);
      P(n,[[-8,112-pj],[8,112-pj],[14,170-pj],[0,186-pj],[-14,170-pj]],J('#6a1e18'));}
    if(b==='tongkat')P(n,[[-6,0],[6,0],[7,20-pj],[14,-pj],[0,-pj-10],[-12,8-pj],[-6,24-pj]],bahan(c));
    if(b==='cangkul'){P(n,R(-5,5,0,10-pj),c);P(n,[[-4,-pj],[58,26-pj],[66,92-pj],[4,60-pj]],bs);}
    if(b==='payung'){P(n,R(-5,5,0,100-pj),c);P(n,[[-240,150-pj],[-210,96-pj],[-110,48-pj],[0,36-pj],[110,48-pj],[210,96-pj],[240,150-pj],[0,124-pj]],bahan(J('#6a2420')));
      P(n,[[-150,70-pj],[0,-pj],[150,70-pj],[0,56-pj]],J('#8a3a24'));garis(n,`M-238,${150-pj}Q0,${104-pj} 238,${150-pj}`,emas,8);}
    if(b==='perisai'){P(n,[[0,-175],[52,-120],[72,-20],[60,90],[0,165],[-60,90],[-72,-20],[-52,-120]],bahan(J('#4a2c1a')));
      if(dt)P(n,[[0,-24],[22,0],[0,24],[-22,0]],emas);garis(n,'M0,-150V-36M0,36V140',J('#2a180e'),5);}
    if(b==='sesaji'){P(n,[[-44,-6],[44,-6],[32,22],[-32,22]],J('#5a3a20'));P(n,[[-36,-8],[0,-80],[36,-8]],J('#a0502a'));if(dt)P(n,[[-6,-90],[6,-90],[6,-78],[-6,-78]],J('#e8c070'));}
    G.bawa.push([n.slice(-1),b,lb,pj,b==='perisai'||b==='sesaji'?0:1]);});
  G.slot=URUT[k>.3?'samping':'depan'].filter(n=>B[n]);
  G.kotak=G.slot.map(n=>B[n].reduce((a,p)=>p.k?[min(a[0],p.k[0]),min(a[1],p.k[1]),max(a[2],p.k[2]),max(a[3],p.k[3])]:a,[1e9,1e9,-1e9,-1e9]));
  return G;}

/* pose → transform tiap slot (+ akar = penempatan + jalan); benda tegak di genggaman atau di tanah */
function bentuk(G,R){const{s,h,x,y,slot,bawa}=G,m=[],Q=[];
  for(const n of slot){let q=R.M[IX[TULANG_SLOT[n]||n]];
    if(n.startsWith('bawa')){const b=bawa.find(v=>v[0]===n.slice(-1)),g=kali(R.M[IX['tangan'+n.slice(-1)]],[0,32]);
      q=[1,0,0,1,g[0],b&&b[4]?lerp(g[1]+b[3]*.42,0,R.bawa):g[1]];}
    Q.push(q);m.push(`matrix(${f4(q[0])},${f4(q[1])},${f4(q[2])},${f4(q[3])},${f(q[4])},${f(q[5])})`);}
  return{akar:`translate(${f(x+R.dx*s*h)},${f(y)}) scale(${f4(s*h)},${f4(s)})`,W:[s*h,0,0,s,x+R.dx*s*h,y],m,q:Q,M:R.M};}
const tampak=(G,n,R)=>(!(n in DUDUK)||DUDUK[n]===R.duduk)&&(R.benda!==0||!n.startsWith('bawa'));

/* SVG statis (pose awal) — untuk still, thumbnail, tokoh diam; rim()/bayangan() cahaya-2d boleh dipasang padanya. Yang BERGERAK:
   gerak() (kanvas). detail 0 = siluet satu isi + rim salinan bergeser (tanpa filter) */
function buat(o){const G=rakit(o),{id,dt,L,h}=G,R=pose(id,[[0,G.o.pose]],0),defs=new Map(),
    url=f=>{if(!f)return'';if(typeof f==='string')return` fill="${f}"`;if(f==='pola')return` fill="url(#${id}-kain)"`;defs.set(f.id,f);return` fill="url(#${f.id})"`;},
    jalur=(p,n)=>{const a=`<path d="${p.d}"${p.s?` fill="none" stroke="${p.s}" stroke-width="${p.w}" stroke-linecap="round"`:url(p.f)}${p.t?` data-tangan="${p.t}"${R.tangan[n.endsWith('D')?0:1]===p.t?'':' display="none"'}`:''}/>`;
      return p.m?`<g transform="matrix(${p.m})">${a}</g>`:a;},
    badan=G.slot.map((n,i)=>`<g id="${id}-${n}" transform="${R.m[i]}"${tampak(G,n,R)?'':' display="none"'}>${G.B[n].map(p=>jalur(p,n)).join('')}</g>`).join(''),
    gr=[...defs.values()].map(g=>`<linearGradient id="${g.id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${g.st.map(([o,c,a])=>`<stop offset="${o}" stop-color="${c}"${a!=null?` stop-opacity="${a}"`:''}/>`).join('')}</linearGradient>`).join(''),
    v='';
  return`<g id="${id}" class="wv-tokoh" data-tokoh="${G.o.arketipe}" transform="${R.akar}"><defs>${gr}${G.pola||''}${v}</defs>`+
    (dt?badan:`<use href="#${id}-b" fill="${G.rim}" transform="translate(${f(L.x*h*4)},${f(L.y*4)})"/><g fill="${G.siluet}"><g id="${id}-b">${badan}</g></g>`)+'</g>';}

/* GERAK: tokoh bergerak digambar di SATU <canvas class="wv-tokoh"> per bidang yang dihapus PENUH dan digambar ulang dari tl.time()
   tiap frame. Bukan transform <g> di svg ber-will-change: raster dirty-rect + skala raster Chrome membuat piksel bergantung jalur
   seek (terukur: tepi ±1–2, rim/bayangan berfilter sampai ±12 — references/tokoh.md). Cahaya = port kanvas rim()/bayangan()
   cahaya-2d: pita tepi menghadap sumber (siluet dikurangi siluet bergeser), pendar buram di bawahnya, bayangan jatuh di lantai. */
const kanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},
  kalikan=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]],
  rgba=(c,a)=>a==null?c:`rgba(${warnaRGB(c).join(',')},${a})`;
function gerak(bidang,daftar,o={}){
  if(!(typeof HTMLElement!=='undefined'&&bidang instanceof HTMLElement))salah('gerak','bidang wajib elemen HTML (<div data-z> atau anaknya), bukan <g> SVG');
  if(!Array.isArray(daftar)||!daftar.length)salah('gerak','daftar harus larik tokoh [{…opsi buat, kunci:[[t, pose, {…}], …]}]');
  o=opsi('gerak',{cahaya:null,lantai:null,rim:4,gelap:.55,panjang:.6,resolusi:1,sampai:30},o);
  const F=daftar.map((d,i)=>{if(!d||typeof d!=='object')salah('gerak',`daftar[${i}] harus objek opsi tokoh`);const{kunci,...b}=d,G=rakit({cahaya:o.cahaya,...b});
      return{G,K:siapkan(kunci||[[0,G.o.pose]])};}).sort((a,b)=>a.G.y-b.G.y),
    r=o.resolusi,ada=o.lantai!=null;
  /* kotak kanvas = jangkauan semua tokoh (dan bayangannya) sepanjang kunci, disampel tiap 0,25 dtk */
  let b=[1e9,1e9,-1e9,-1e9];const tambah=(p)=>{b=[min(b[0],p[0]),min(b[1],p[1]),max(b[2],p[0]),max(b[3],p[1])];};
  for(const{G,K}of F){const akhir=min(o.sampai,K[K.length-1].t+K[K.length-1].d+1.5);
    for(let t=0;t<=akhir;t+=.25){const R=pose(G.id,K,t);G.kotak.forEach((q,i)=>{const m=kalikan(R.W,R.q[i]);
      for(const c of[[q[0],q[1]],[q[2],q[1]],[q[0],q[3]],[q[2],q[3]]]){const p=kali(m,c);tambah(p);if(ada)for(const kk of[-2,2])tambah([p[0]+kk*o.panjang*(o.lantai-p[1]),o.lantai+o.panjang*(o.lantai-p[1])]);}});}}
  const X=floor(b[0]-40),Y=floor(b[1]-40),Wc=ceil(b[2]-X+40),Hc=ceil(b[3]-Y+40),c=kanvas(round(Wc*r),round(Hc*r)),S=kanvas(c.width,c.height),Bd=kanvas(c.width,c.height),Fc=kanvas(c.width,c.height),
    x=c.getContext('2d'),xs=S.getContext('2d'),xb=Bd.getContext('2d'),xf=Fc.getContext('2d'),base=[r,0,0,r,-X*r,-Y*r];
  c.className='wv-tokoh';c.style.cssText=`position:absolute;left:${X}px;top:${Y}px;width:${Wc}px;height:${Hc}px;pointer-events:none`;bidang.appendChild(c);
  /* gaya isi kanvas, sekali: gradien bbox per bagian (= objectBoundingBox SVG), pola kain dari ubin pustaka.kain */
  const gaya=(G,p)=>{const f=p.f;if(!f)return null;if(typeof f==='string')return f;if(f==='pola')return G.polaK||(G.polaK=pola(G.pola));
    const[a,b2,c2,d]=p.k,g=x.createLinearGradient(a+f.x1*(c2-a),b2+f.y1*(d-b2),a+f.x2*(c2-a),b2+f.y2*(d-b2));f.st.forEach(([q,w,al])=>g.addColorStop(q,rgba(w,al)));return g;},
    pola=s=>{const u=kanvas(80,80),ux=u.getContext('2d'),tr=/rotate\(([-\d.]+)\) scale\(([-\d.]+)\)/.exec(s)||[0,0,1];ux.scale(2,2);
      for(const[,t,a]of s.matchAll(/<(rect|path)([^>]*)\/>/g)){const d=/ d="([^"]+)"/.exec(a),w=/ fill="([^"]+)"/.exec(a)[1];ux.fillStyle=w;
        if(t==='rect')ux.fillRect(0,0,40,40);else ux.fill(new Path2D(d[1]));}
      const q=x.createPattern(u,'repeat');q.setTransform(new DOMMatrix().rotateSelf(+tr[1]).scaleSelf(tr[2]/2));return q;};
  for(const{G}of F)G.slot.forEach(n=>G.B[n].forEach(p=>{p.P=new Path2D(p.d);p.F=gaya(G,p);}));
  const isi=(cx,G,R,lapis,M0)=>G.slot.forEach((n,i)=>{if(!tampak(G,n,R))return;const m=kalikan(M0,R.q[i]),tg=R.tangan[n.endsWith('D')?0:1];
      for(const p of G.B[n]){if(p.t&&p.t!==tg)continue;const q=p.m?kalikan(m,p.m):m;cx.setTransform(q[0],q[1],q[2],q[3],q[4],q[5]);
        if(p.s){if(lapis)continue;cx.strokeStyle=p.s;cx.lineWidth=p.w;cx.lineCap='round';cx.stroke(p.P);}else{if(lapis)cx.fillStyle=lapis;else if(p.F)cx.fillStyle=p.F;else continue;cx.fill(p.P);}}}),
    nol=cx=>{cx.setTransform(1,0,0,1,0,0);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;cx.filter='none';},
    kotakR=(G,R,M0,m)=>{let a=[1e9,1e9,-1e9,-1e9];G.kotak.forEach((q,i)=>{const n=kalikan(M0,R.q[i]);for(const c of[[q[0],q[1]],[q[2],q[1]],[q[0],q[3]],[q[2],q[3]]]){const p=kali(n,c);
      a=[min(a[0],p[0]),min(a[1],p[1]),max(a[2],p[0]),max(a[3],p[1])];}});const x0=max(0,floor(a[0]-m)),y0=max(0,floor(a[1]-m));return[x0,y0,min(c.width,ceil(a[2]+m))-x0,min(c.height,ceil(a[3]+m))-y0];};
  let akhir=null;   // bidang tersembunyi (leluhur display:none) = pose t 0, sekali — isi kanvas tetap fungsi murni (t, tampil)
  const gambar=()=>{if(!c.isConnected)return;let tampil=1;for(let n=bidang;n&&n.style;n=n.parentNode)if(n.style.display==='none')tampil=0;
    const t=tampil?tl.time():0;if(!tampil&&akhir===0)return;akhir=t;const RR=F.map(({G,K})=>pose(G.id,K,t));nol(x);x.clearRect(0,0,c.width,c.height);
    /* bayangan jatuh semua tokoh: siluet ditransformasi ke lantai (cermin, dipendekkan, miring menjauhi sumber), satu blur */
    if(ada){nol(xs);xs.clearRect(0,0,S.width,S.height);F.forEach(({G},j)=>{const L=lampuT(G,RR[j]);if(!L.t)return;
        const cxp=RR[j].W[4],kk=max(-2,min(2,(cxp-L.t[0])/max(1,o.lantai-L.t[1]))),p=o.panjang,
          Tb=[1,0,-kk*p,-p,kk*p*o.lantai,o.lantai*(1+p)];isi(xs,G,RR[j],'#000',kalikan(base,kalikan(Tb,RR[j].W)));});
      nol(x);x.filter=`blur(${f(4*r)}px)`;x.globalAlpha=o.gelap;x.drawImage(S,0,0);nol(x);}
    F.forEach(({G},j)=>{const R=RR[j],M0=kalikan(base,R.W),L=lampuT(G,R),kuat=L.k*(L.kedip?1-L.kedip*vnoise(t*7,3):1);
      if(!G.dt){/* siluet: salinan tipis bergeser ke cahaya (rim murah, tanpa blur) + isi gelap rata */
        x.globalAlpha=.9;isi(x,G,R,G.rim,kalikan([1,0,0,1,L.x*3.5*r,L.y*3.5*r],M0));nol(x);isi(x,G,R,G.siluet,M0);nol(x);return;}
      const v=o.rim*r,[kx,ky,kw,kh]=kotakR(G,R,M0,6*v+4),k4=[kx,ky,kw,kh,kx,ky,kw,kh];if(kw<1||kh<1)return;
      /* pita rim: siluet − siluet bergeser menjauhi sumber, diwarnai warna sumber */
      nol(xs);xs.clearRect(kx,ky,kw,kh);isi(xs,G,R,'#000',M0);nol(xs);nol(xb);xb.clearRect(kx,ky,kw,kh);xb.drawImage(S,...k4);
      xb.globalCompositeOperation='destination-out';xb.drawImage(S,kx,ky,kw,kh,kx-L.x*v,ky-L.y*v,kw,kh);xb.globalCompositeOperation='source-in';xb.fillStyle=L.w;xb.fillRect(kx,ky,kw,kh);
      /* volume: tokoh berwarna rata di lapisan sendiri, lalu SATU gradien layar searah cahaya (hangat → gelap) + oklusi tanah,
         source-atop — bersambung di semua sendi */
      nol(xf);xf.clearRect(kx,ky,kw,kh);isi(xf,G,R,null,M0);nol(xf);xf.globalCompositeOperation='source-atop';
      const e=max(kw,kh)/2,cx=kx+kw/2,cy=ky+kh/2,g=xf.createLinearGradient(cx+L.x*e,cy+L.y*e,cx-L.x*e,cy-L.y*e),g2=xf.createLinearGradient(0,ky+kh*.5,0,ky+kh);
      g.addColorStop(0,rgba(L.w,f4(.34*kuat)));g.addColorStop(.4,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(4,3,8,.62)');xf.fillStyle=g;xf.fillRect(kx,ky,kw,kh);
      g2.addColorStop(0,'rgba(4,3,8,0)');g2.addColorStop(1,'rgba(4,3,8,.4)');xf.fillStyle=g2;xf.fillRect(kx,ky,kw,kh);
      /* susun: pendar (pita buram) di bawah, tokoh, pita tajam di atas */
      nol(x);x.filter=`blur(${f(1.6*v)}px)`;x.globalAlpha=min(1,.9*kuat);x.drawImage(Bd,...k4);nol(x);x.drawImage(Fc,...k4);
      x.filter=`blur(${f(r)}px)`;x.globalAlpha=kuat;x.drawImage(Bd,...k4);nol(x);});};
  gambar();rantaiUpdate(gambar);return c;}
/* cahaya per frame untuk tokoh G pada pose R: arah dari pusat tokoh ke sumber (ikut tokoh yang berjalan), redup di luar jangkau */
function lampuT(G,R){const c=G.o.cahaya,cx=R.W[4],cy=G.y-G.o.tinggi/2;
  if(c==null||(!Array.isArray(c)&&typeof c!=='string'&&c.x==null))return{...G.L,t:null};
  let x=0,y=0,b=null,tx=0,ty=0,sw=0;for(const n of[].concat(c)){const L=lampu('gerak',n,cx,cy),w=L.k*L.k,s=typeof n==='string'?ambilSumber(n):null;
    x+=L.x*w;y+=L.y*w;tx+=L.t[0]*w;ty+=L.t[1]*w;sw+=w;if(!b||L.k>b.k)b={...L,kedip:s?s.kedip||0:0};}
  const q=hypot(x,y)||1;return{...b,x:x/q,y:y/q,t:[tx/sw,ty/sw,b.t[2]]};}

/* kerumunan ber-seed → daftar opsi tokoh (untuk gerak() atau buat()): tinggi, badan, arketipe (dari ragam), pandang, hadap, pose,
   dan fase napas berbeda tiap anggota; baris belakang lebih kecil. Seed sama = daftar sama */
function kerumunan(o){o=opsi('kerumunan',{seed:1,n:12,area:null,ragam:null,arah:Object.keys(PANDANG),hadap:['kanan','kiri'],
    tinggi:320,detail:0,cahaya:null,jarak:0,id:null},o);
  o.area=o.area||[460,820,1000,160];if(!Array.isArray(o.area)||o.area.length!==4||!o.area.every(Number.isFinite))salah('kerumunan','area harus [x, y, lebar, tinggi] (angka, px bidang)');
  const ragam=[].concat(o.ragam||'rakyat');ragam.forEach(a=>ARKETIPE[a]||salah('kerumunan',`ragam tidak dikenal: ${a} (${Object.keys(ARKETIPE).join(' ')})`));
  const R=mulberry32(o.seed),[ax,ay,aw,ah]=o.area,id=o.id||`wvk${hash(JSON.stringify(o))}`;
  return Array.from({length:round(o.n)},(_,i)=>{const yy=ay+ah*R(),a=ragam[floor(R()*ragam.length)],u=R(),
      pose=a==='prajurit'?(u<.6?'tombak':'berdiri'):u<.16?'sembah':u<.26?'menunjuk':'berdiri';
    return{id:`${id}-${i}`,x:f(ax+aw*R()),y:f(yy),arketipe:a,pose,tinggi:f(o.tinggi*(.74+.26*(yy-ay)/(ah||1))*(.92+.14*R())),badan:f4(ARKETIPE[a].badan*(.9+.2*R())),
      arah:R()<.2?(o.arah==='samping'?'tigaperempat':'samping'):o.arah,hadap:R()<.12?(o.hadap==='kanan'?'kiri':'kanan'):o.hadap,
      seed:floor(R()*1e6),fase:f4(R()),detail:o.detail,cahaya:o.cahaya,jarak:o.jarak};}).sort((a,b)=>a.y-b.y);}

return{buat,gerak,kerumunan,pose,ik,POSE,ARKETIPE,RIG};})();
