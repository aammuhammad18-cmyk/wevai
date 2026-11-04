/* PUSTAKA ASET JAWA KUNO: kontrak, API, jebakan, catatan budaya: references/pustaka.md. Satu global `pustaka`. Generator = fungsi murni
   opsi → string SVG; api, asapHidup = kait kanvas dari tl.time(); dindingRelief = DATA untuk reliefHidup(). Butuh atmosfer (+ cahaya-2d).
   Uji tanpa browser: scripts/test-pustaka.mjs, scripts/test-relief.mjs. */
const pustaka=(()=>{
const{PI:P,round,cos,sin,max,min,hypot,imul,atan2,sqrt,abs,floor,ceil}=Math,f=v=>round(v*10)/10,tk=(x,y)=>f(x)+','+f(y),
  /* searah jarum jam: tumpukan menyatu (nonzero); cw=false = lubang */
  poly=(p,cw=true)=>{let a=0;p.forEach((q,i)=>{const n=p[(i+1)%p.length];a+=q[0]*n[1]-n[0]*q[1];});
    if(cw!==(a>0))p=p.slice().reverse();return'M'+p.map(q=>tk(q[0],q[1])).join('L')+'Z';},
  kotak=(x,y,w,h)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]),
  sim=(p,x=0,y=0)=>poly(p.map(([u,v])=>[x+u,y+v]).concat(p.map(([u,v])=>[x-u,y+v]).reverse())),
  el=(x,y,rx,ry,a=0)=>{const c=cos(a)*rx,s=sin(a)*rx,e=`A${f(rx)},${f(ry)} ${f(a*180/P)} 0 1 `;return`M${tk(x+c,y+s)}${e}${tk(x-c,y-s)}${e}${tk(x+c,y+s)}Z`;},
  qb=(a,c,b,n)=>Array.from({length:n+1},(_,i)=>{const t=i/n,u=1-t;return[u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]];}),
  ruas=(p,w0,w1)=>{const A=[],B=[];p.forEach((q,i)=>{const a=p[max(0,i-1)],b=p[min(p.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],
    m=hypot(dx,dy)||1,w=(w0+(w1-w0)*i/(p.length-1||1))/2;A.push([q[0]-dy/m*w,q[1]+dx/m*w]);B.push([q[0]+dy/m*w,q[1]-dx/m*w]);});return poly(A.concat(B.reverse()));},
  spiral=(x,y,r,n,sg=1)=>ruas(Array.from({length:n*8+1},(_,i)=>{const a=sg*i/8*P/2,k=r*(1-i/(n*9));return[x+cos(a)*k,y+sin(a)*k];}),r*.32,r*.06),
  stop=(o,c,a)=>`<stop offset="${o}" stop-color="${c}"${a!=null?` stop-opacity="${a}"`:''}/>`,
  lap=(d,c,op)=>d?`<path d="${d}" fill="${c}"${op?` opacity="${op}"`:''}/>`:'',
  hex=a=>'#'+a.map(v=>max(0,min(255,round(v))).toString(16).padStart(2,'0')).join(''),
  campur=(a,b,k)=>{const A=warnaRGB(a),B=warnaRGB(b);return hex(A.map((v,i)=>v+(B[i]-v)*k));},
  hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(36);},
  salah=(n,m)=>{throw new Error('pustaka.'+n+': '+m);},
  cekWarna=(n,k,v)=>typeof v==='string'&&/^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\([\d.,\s%]+\))$/i.test(v.trim())?v:salah(n,`${k} bukan warna #rrggbb atau rgb(): ${v}`),
  BAHAN={andesit:'#423f4a',bata:'#552d22',kayu:'#30231c',daun:'#1a1f1c',batu:'#5a5650'},
  POSITIF=['tinggi','lebar','skala','lapis','baris','n','celah'],
  OPS={seed:1,detail:null,cahaya:null,jarak:0,warna:null,id:null},SG=[-1,1];

/* opsi asing ditolak; angka hingga (POSITIF > 0); larik = pilihan (bawaan pertama); null = opsional */
function opsi(n,D,o={}){
  if(!o||typeof o!=='object'||Array.isArray(o))salah(n,'opsi harus objek {…}');
  for(const k in o)if(!(k in D))salah(n,`opsi tidak dikenal: ${k} (${Object.keys(D).join(' ')})`);
  const r={};for(const k in D){const d=D[k],v=o[k]===undefined?(Array.isArray(d)?d[0]:d):o[k];
    if(Array.isArray(d)){if(!d.includes(v))salah(n,`${k} tidak dikenal: ${v} (${d.join(' ')})`);}
    else if(typeof d==='number'){if(typeof v!=='number'||!isFinite(v))salah(n,`${k} harus angka (dapat ${v})`);
      if(POSITIF.includes(k)&&!(v>0))salah(n,`${k} harus > 0 (dapat ${v})`);}
    else if(v!=null&&k==='detail'&&![0,1,2].includes(v))salah(n,`detail harus 0, 1, atau 2 (dapat ${v})`);
    else if(v!=null&&k==='warna')[].concat(v).forEach(w=>cekWarna(n,k,w));
    else if(v!=null&&k==='id'&&!/^[A-Za-z][\w-]*$/.test(v))salah(n,`id diawali huruf; hanya huruf, angka, - dan _ (dapat ${v})`);
    r[k]=v;}
  return r;}
/* → vektor satuan ke cahaya, warna, kuat */
function lampu(n,c,cx,cy,c0){
  if(c==null)c=c0||{arah:235};
  if(typeof c==='string'){if(typeof ambilSumber!=='function')salah(n,`cahaya '${c}' butuh blok cahaya-2d (SUMBER)`);
    const s=ambilSumber(c);c={x:s.x,y:s.y,warna:s.warna,jangkau:s.jangkau,kuat:min(1,s.kuat??1)};}
  if(typeof c!=='object')salah(n,`cahaya harus nama SUMBER, {x,y} atau {arah} (dapat ${c})`);
  for(const k in c)if(!['x','y','arah','warna','jangkau','kuat'].includes(k))salah(n,`cahaya: kunci tidak dikenal: ${k} (x y arah warna jangkau kuat)`);
  const t=c.x!=null||c.y!=null;
  if(t?![c.x,c.y].every(Number.isFinite):!Number.isFinite(c.arah))salah(n,'cahaya harus {x,y} (angka, px bidang) atau {arah} (angka, derajat)');
  const a=t?atan2(c.y-cy,c.x-cx):c.arah*P/180,d=t?hypot(c.x-cx,c.y-cy):0;
  if(c.kuat!=null&&!(c.kuat>=0&&c.kuat<=1))salah(n,`cahaya.kuat harus 0..1 (dapat ${c.kuat})`);
  return{x:cos(a),y:sin(a),w:cekWarna(n,'cahaya.warna',c.warna||LANGIT.warnaMatahari),k:(c.kuat??.75)*(c.jangkau?max(.3,min(1,1.6-d/(1.6*c.jangkau))):1)};}
/* skala, detail, cahaya, nada warna, id */
function siap(n,o,bahan,c0){const L=lampu(n,o.cahaya,o.x,o.y-o.tinggi/2,c0),J=c=>warnaJarak(c,o.jarak,-2000),b=[].concat(o.warna||bahan)[0],t=campur(b,L.w,.24*L.k);
  const R=mulberry32(o.seed);
  return{s:o.tinggi/1000,L,R,r:(a,b)=>a+(b-a)*R(),dt:o.detail??(o.jarak<=-600?0:o.jarak<=-250?1:2),id:o.id||`wvp-${n}-${hash(JSON.stringify([o,L,LANGIT.horizon,LANGIT.tengah]))}`,
    N:{dasar:J(b),terang:J(t),lis:J(campur(b,t,.55)),gelap:J(campur(b,'#05040a',.66)),rim:J(campur(L.w,'#fff',.25)),cahaya:J(L.w)}};}
/* rim = siluet digeser ke cahaya, badan bergradien, lapisan K (S siluet, G bayang, L lis, T terang, D gelap, U sorot) */
function rakit(n,o,A,K,{tekstur,ekstra='',isi=''}={}){
  const{s,L,N,id}=A,T=`translate(${f(o.x)},${f(o.y)}) scale(${+s.toFixed(4)})`,g=v=>+(.5+.5*v).toFixed(2),
    rw=(.7+2*L.k)*min(1.25,max(.5,sqrt(o.tinggi/600)))/s,[tw,th,ts]=tekstur||[];
  return`<g id="${id}" class="wv-pustaka" data-pustaka="${n}" transform="${T}"><defs><path id="${id}-s" d="${K.S}"/>`+
    `<linearGradient id="${id}-v" x1="${g(L.x)}" y1="${g(L.y)}" x2="${g(-L.x)}" y2="${g(-L.y)}">${stop(0,N.terang)+stop(.45,N.dasar)+stop(1,N.gelap)}</linearGradient>`+
    `<clipPath id="${id}-k"><use href="#${id}-s" transform="${T}"/></clipPath>`+
    (tekstur?`<pattern id="${id}-t" patternUnits="userSpaceOnUse" width="${tw}" height="${2*th}"><path d="M0,0H${tw}M0,${th}H${tw}M0,0V${th}M${tw/2},${th}V${2*th}" stroke="${N.gelap}" stroke-width="${ts}"/></pattern>`:'')+
    `${ekstra}</defs><use href="#${id}-s" fill="${N.rim}" transform="translate(${f(L.x*rw)},${f(L.y*rw)})"/><use href="#${id}-s" fill="url(#${id}-v)"/>`+
    (tekstur?`<use href="#${id}-s" fill="url(#${id}-t)" opacity=".45"/>`:'')+lap(K.G,N.gelap,.6)+lap(K.L,N.lis)+lap(K.T,N.terang)+lap(K.D,N.gelap)+lap(K.U,N.terang)+isi+'</g>';}
const lapis=()=>({S:'',G:'',L:'',T:'',D:'',U:''}),
  /* blok [x,y,w,h,lis]: sisi atas + sisi ke cahaya = lis; lis membayangi dinding di bawahnya */
  tepi=(K,B,L)=>{const a=max(0,-L.y)*4.5,b=abs(L.x)*6;
    for(const[x,y,w,h,l]of B){if(a>1)K.L+=kotak(x,y,w,a);if(b>1)K.L+=kotak(L.x>0?x+w-b:x,y,b,h);if(l)K.G+=kotak(x+l,y+h,w-2*l,l*1.8);}},
  ratna=(x,y,h)=>sim([[0,-1],[.06,-.86],[.1,-.74],[.24,-.6],[.32,-.42],[.3,-.24],[.38,-.14],[.38,0]].map(([u,v])=>[u*h,v*h]),x,y),
  simbar=(x,y,h)=>sim([[0,-h],[.22*h,-.62*h],[.34*h,-.24*h],[.2*h,0]],x,y),
  /* kala: rahang = gaya Jawa Timur */
  kala=(K,cy,k,rahang)=>{const b=rahang?.8:.42;
    K.T+=sim([[0,-.98],[.3,-.92],[.62,-.78],[.98,-.62],[1.1,-.28],[.94,.08],[.62,b],[.2,b+.06],[0,b+.06]].map(([u,v])=>[u*k,v*k]),0,cy)+
      el(-1.2*k,cy-.5*k,.24*k,.4*k)+el(1.2*k,cy-.5*k,.24*k,.4*k);
    K.D+=el(-.38*k,cy-.36*k,.19*k,.19*k)+el(.38*k,cy-.36*k,.19*k,.19*k)+kotak(-.56*k,cy+.02*k,1.12*k,.2*k)+(rahang?kotak(-.44*k,cy+.5*k,.88*k,.1*k):'');
    K.U+=el(-.35*k,cy-.4*k,.06*k,.06*k)+el(.41*k,cy-.4*k,.06*k,.06*k);
    for(let i=-2;i<=2;i++)K.U+=poly([[i*.21*k-.06*k,cy+.02*k],[i*.21*k+.06*k,cy+.02*k],[i*.21*k,cy+(i%2?.12:.2)*k]]);};

/* candi: andesit = Mataram Kuno, bata = Majapahit */
function candi(o){o=opsi('candi',{x:960,y:900,tinggi:520,varian:['andesit','bata'],...OPS},o);
  const bt=o.varian==='bata',A=siap('candi',o,bt?BAHAN.bata:BAHAN.andesit),{dt}=A,K=lapis(),B=[];let y=0;
  const blok=(w,h,l)=>{y-=h;B.push([-w/2,y,w,h,l]);K.S+=kotak(-w/2,y,w,h);};
  for(const[w,h,l]of bt?[[640,70],[662,12,8],[560,70],[582,12,8],[480,70],[502,12,8]]:[[880,34],[840,90],[884,30,12]])blok(w,h,l);
  const yk=y,yb=yk-(bt?22:28);
  for(const[w,h,l]of bt?[[384,22],[350,250],[404,26,12]]:[[606,28],[540,300],[614,34,14]])blok(w,h,l);
  for(let i=0;i<(bt?6:3);i++){const w=bt?340-44*i:470-100*i,c=w+(bt?22:40),h=bt?24-2*i:52-8*i;blok(w,bt?46-3*i:96-10*i);blok(c,bt?10:22,bt?6:10);
    for(const sg of SG){const x=sg*(c/2-(bt?8:14));K.S+=bt?simbar(x,y,h):ratna(x,y,h);if(!bt&&dt)K.T+=ratna(sg*c/4,y,h*.75);}}
  if(bt)blok(96,56);K.S+=ratna(0,y,1000+y);tepi(K,B,A.L);
  const pw=bt?84:104,ph=bt?170:214,k=bt?34:46,tw=bt?120:170;   // pintu + bingkai, kala (+ makara), tangga
  K.D+=kotak(-pw/2,yb-ph,pw,ph);K.T+=kotak(-pw/2-16,yb-ph-16,pw+32,16)+kotak(-pw/2-16,yb-ph,16,ph)+kotak(pw/2,yb-ph,16,ph)+kotak(-tw/2-22,yk,22,-yk)+kotak(tw/2,yk,22,-yk);
  for(let i=1;i*18<-yk;i++)K.D+=kotak(-tw/2,-i*18,tw,4);
  if(dt){kala(K,yb-ph-16-k*.9,k,bt);for(const sg of SG)K.L+=kotak(sg*(bt?150:236)-7,yb-(bt?220:270),14,bt?210:260);
    if(!bt){for(let i=0;i<6;i++)K.G+=kotak(-386+i*132,-118,108,72);
      for(const sg of SG)for(const x of[pw/2+8,tw/2+11]){K.T+=el(sg*x,yb-12,12,10)+spiral(sg*(x+14),yb-24,15,2,sg);K.D+=el(sg*(x+3),yb-12,3,3);}}}   // makara
  return rakit('candi',o,A,K,{tekstur:dt>1?bt?[40,13,2]:[66,30,2.4]:null});}

/* gapura bata Majapahit: bentar (Wringin Lawang), paduraksa (Bajang Ratu) */
function gapura(o){o=opsi('gapura',{x:960,y:900,tinggi:600,varian:['bentar','paduraksa'],celah:170,...OPS},o);
  const pd=o.varian==='paduraksa',A=siap('gapura',o,BAHAN.bata),{dt}=A,K=lapis(),B=[],bk=(x,y,w,h,l)=>{B.push([x,y,w,h,l]);K.S+=kotak(x,y,w,h);};
  let y=0;
  if(!pd){const c=o.celah/2,TI=[[340,34],[350,14,8],[310,330],[336,22,10]];
    for(let i=0;i<9;i++)TI.push([284-28*i,52-2*i],[298-28*i,10,6]);
    for(const[w,h,l]of TI){y-=h;for(const sg of SG){bk(sg<0?-c-w:c,y,w,h,l);if(l&&y<-400)K.S+=simbar(sg*(c+w-8),y,22-y*.012);}}
    for(const sg of SG)K.S+=kotak(sg<0?-c-34:c,y-22,34,22)+simbar(sg*(c+17),y-22,34);
    for(let i=1;i<4;i++)bk(-c-4,-i*13,2*c+8,13);
    if(dt)for(const sg of SG)for(const[yy,hh]of[[-150,70],[-290,60]])K.D+=kotak(sg*(c+155)-24,yy-hh,48,hh)+el(sg*(c+155),yy-hh,24,20);}
  else{for(const[w,h,l]of[[520,46],[540,12,8],[470,40],[490,10,6]]){y-=h;bk(-w/2,y,w,h,l);}
    const yk=y,ph=250,pw=124;bk(-180,yk-340,360,340);K.S+=poly([[-pw/2,yk],[pw/2,yk],[pw/2,yk-ph],[-pw/2,yk-ph]],false);   // pintu tembus
    y=yk-340;bk(-206,y-26,412,26,12);y-=26;
    for(let i=0;i<8;i++){const w=372-36*i;y-=50-3*i;bk(-w/2,y,w,50-3*i);y-=10;bk(-w/2-10,y,w+20,10,6);for(const sg of SG)K.S+=simbar(sg*(w/2+2),y,26-2*i);}
    bk(-44,y-56,88,56);y-=56;K.S+=ratna(0,y,1000+y);
    for(const sg of SG)for(let j=0;j<3;j++){const h=300-62*j,x=sg>0?180+90*j:-270-90*j;bk(x,-h,90,h);bk(x-4,-h-12,98,12,6);}   // sayap
    K.T+=kotak(-pw/2-14,yk-ph-14,pw+28,14);if(dt)kala(K,yk-ph-14-38,40,1);}
  tepi(K,B,A.L);
  return rakit('gapura',o,A,K,{tekstur:dt>1?[40,13,2]:null});}

/* rumah panggung ala relief Borobudur */
function rumahPanggung(o){o=opsi('rumahPanggung',{x:960,y:900,tinggi:420,tangga:1,lampu:0,...OPS},o);
  const A=siap('rumahPanggung',o,BAHAN.kayu),{dt,N}=A,K=lapis(),atap=qb([-455,-960],[0,-870],[455,-960],16);
  for(const x of[-270,-90,90,270])K.S+=kotak(x-15,-330,30,308)+poly([[x-28,0],[x+28,0],[x+19,-24],[x-19,-24]]);
  K.S+=kotak(-352,-364,704,36)+kotak(-382,-360,30,20)+kotak(352,-360,30,20)+kotak(-300,-560,600,200)+poly(atap.concat([[432,-528],[-432,-528]]));
  if(o.tangga){K.S+=ruas([[338,0],[262,-364]],11,11)+ruas([[392,0],[316,-364]],11,11);for(let i=1;i<7;i++)K.S+=kotak(330-i*11,-i*52,56,8);}
  for(const sg of SG)K.S+=ruas([[sg*438,-952],[sg*482,-1012]],11,5)+ruas([[sg*464,-955],[sg*430,-1010]],9,4);   // hiasan bubungan
  K.G+=kotak(-300,-520,600,44);K.L+=kotak(-352,-364,704,6);
  if(dt){for(let x=-260;x<300;x+=56)K.D+=kotak(x,-510,3,146);for(let i=0;i<=24;i++){const t=i/24,a=atap[round(t*16)];K.G+=ruas([[a[0],a[1]+8],[-420+840*t,-526]],4,7);}}
  return rakit('rumahPanggung',o,A,K,{isi:lap(kotak(-48,-504,96,140)+kotak(150,-490,84,52),o.lampu?warnaJarak('#ffa850',o.jarak,-2000):N.gelap)});}

/* beringin: banir, tajuk bergerigi daun, akar gantung */
function beringin(o){o=opsi('beringin',{x:960,y:1000,tinggi:800,...OPS},o);
  const A=siap('beringin',o,BAHAN.daun),{R,r,dt}=A,K=lapis(),pt=[],uj=[];
  K.S+=poly([[-150,0],[-82,-70],[-62,-380],[62,-380],[86,-70],[160,0]]);
  for(const sg of SG)K.S+=ruas(qb([sg*40,-120],[sg*110,-40],[sg*190,6],4),34,10);
  const dahan=(x,y,a,len,w,k)=>{const b=[x+cos(a)*len,y+sin(a)*len],p=qb([x,y],[(x+b[0])/2+r(-.2,.2)*len,(y+b[1])/2+r(-.2,.2)*len],b,5);
    K.S+=ruas(p,w,w*.62);p.forEach(q=>pt.push([q[0],q[1],k]));
    if(k)for(const d of SG)dahan(b[0],b[1],a+d*r(.3,.65),len*r(.55,.7),w*.6,k-1);else uj.push(b);};
  for(const a of[-2.8,-2.3,-1.85,-1.3,-.85,-.35])dahan(r(-25,25),-350,a+r(-.1,.1),r(250,330),r(56,76),dt?2:1);
  const semak=(x,y,rx,ry)=>{const p=[];for(let i=0;i<40;i++){const a=i/40*2*P,k=1+.1*sin(a*5+x)+.05*sin(a*13+y)+(R()-.5)*.1;p.push([x+cos(a)*rx*k,y+sin(a)*ry*k]);}K.S+=poly(p);};
  for(const[x,y]of uj){for(let j=0;j<3;j++)semak(x+r(-55,55),y+r(-55,15),r(60,100),r(42,66));   // gumpal tajuk bertepi daun
    for(let j=0;j<[0,8,22][dt];j++){const a=r(0,2*P),d=r(70,125),l=dt>1?r(8,13):r(13,20);K.S+=el(x+cos(a)*d,y+sin(a)*d*.75-20,l,l*.5,r(0,P));}}
  const ak=pt.filter(p=>p[2]>(dt?1:0)&&p[1]>-760&&p[1]<-420);
  for(let i=0;i<[14,34,52][dt];i++){const p=ak[floor(R()*ak.length)],ye=min(0,p[1]+r(160,720)),s=ye>-40;
    K.S+=ruas(qb([p[0],p[1]],[p[0]+r(-14,14),(p[1]+ye)/2],[p[0]+r(-18,18),s?0:ye],6),r(2.5,5),s?r(9,16):r(1.5,3));}
  return rakit('beringin',o,A,K);}

/* lontar: daun KIPAS menjari (bukan kelapa) */
function lontar(o){o=opsi('lontar',{x:960,y:1000,tinggi:640,...OPS},o);
  const A=siap('lontar',o,BAHAN.daun),{r,dt}=A,K=lapis(),lx=r(-40,40),C=[lx,-870],bt=qb([0,0],[lx*.15,-450],C,14);
  K.S+=ruas(bt,46,30)+el(0,-10,30,16);
  const kipas=(a,p,rr,q,tn)=>{const F=[C[0]+cos(a)*p,C[1]+sin(a)*p+(tn?0:p*.2*(1+sin(a)))],ax=a+r(-.25,.25),sp=r(2.8,3.5),pts=[F];
    for(let j=0;j<=26;j++){const b=sp*(j/26-.5),rad=rr*(j%2?.86:1),u=cos(b)*rad,v=sin(b)*rad*q;pts.push([F[0]+cos(ax)*u-sin(ax)*v,F[1]+sin(ax)*u+cos(ax)*v]);}
    K.S+=ruas([C,F],9,5)+poly(pts);};
  const n=[8,10,12][dt];for(let i=0;i<n;i++)kipas(-P/2+(i/n-.5)*2*P*.94+r(-.1,.1),r(18,66),r(42,80),r(.6,1));
  if(dt)for(let i=0;i<4;i++)kipas(-P/2+r(-1.6,1.6),r(8,24),r(40,52),r(.6,1));
  if(dt)for(let i=0;i<3;i++)kipas(P/2+r(-.7,.7),r(30,50),r(36,48),r(.3,.5),1);
  if(dt)for(let i=1;i<12;i++){const p=bt[i];K.G+=kotak(p[0]-21,p[1],42,2.5);}
  return rakit('lontar',o,A,K);}

/* gunung berlapis: lapis jauh = gunung api, dekat = bukit; kaki berkabut */
function gunungBerlapis(o){o=opsi('gunungBerlapis',{x:960,y:700,lebar:2880,tinggi:360,lapis:3,puncak:2,...OPS},o);
  const A=siap('gunungBerlapis',o,'#29233a'),{s,L,N,r,dt,id}=A,Wl=o.lebar/s/2+60,st=[48,24,14][dt],n=round(o.lapis),
    G=[...Array(max(0,round(o.puncak)))].map((_,k)=>[(-.55+1.1*(k+.5)/o.puncak+r(-.1,.1))*min(Wl,1800),1000*(1-.2*k)*r(.85,1)]),
    T=`translate(${f(o.x)},${f(o.y)}) scale(${+s.toFixed(4)})`,rw=(.8+1.6*L.k)/s;
  let defs='',isi='',kl='';
  for(let i=0;i<n;i++){const sd=o.seed*31+i*7,amp=1000*(.5-.33*i/max(1,n-1)),pts=[[-Wl,400]];let top=0;
    for(let x=-Wl;x<=Wl;x+=st){let h=amp*(.35+.65*(vnoise(x/900,sd)*.6+vnoise(x/300,sd+1)*.28+vnoise(x/90,sd+2)*.12));
      if(!i)for(const[gx,gh]of G){const d=abs(x-gx);h=max(h,gh/(1+(d/(.7*gh))**1.8)-(d<34?26*(1-d/34):0)+12*vnoise(x/40,sd+3));}
      top=max(top,h);pts.push([x,-h]);}
    const c=campur(N.dasar,LANGIT.horizon,(n-1-i)/n*.42),j=`${id}-l${i}`;pts.push([Wl,400]);
    defs+=`<path id="${j}" d="${poly(pts)}"/><linearGradient id="${j}g" gradientUnits="userSpaceOnUse" x2="0" y1="${f(-top)}">${stop(0,c)+stop(1,campur(c,LANGIT.horizon,.38))}</linearGradient>`;
    isi+=`<use href="#${j}" fill="${campur(N.rim,c,.12+.3*(n-1-i)/n)}" transform="translate(${f(L.x*rw)},${f(L.y*rw)})"/><use href="#${j}" fill="url(#${j}g)"/>`;
    kl+=`<use href="#${j}" transform="${T}"/>`;
    if(!i&&dt){let D='';for(const[gx,gh]of G)for(let q=0;q<16;q++){const a=(q/15-.5)*2.2,l=gh*r(.25,.6);   // alur lereng gunung api
      D+=ruas([[gx+a*14,-gh+30],[gx+sin(a)*l*1.5,-gh+30+l*cos(a*.5)]],5,1);}isi+=lap(D,N.gelap,.35);}}
  return`<g id="${id}" class="wv-pustaka" data-pustaka="gunungBerlapis" transform="${T}"><defs>${defs}<clipPath id="${id}-k">${kl}</clipPath></defs>${isi}</g>`;}

/* sawah: pita searah kontur (air memantulkan langit, petak hijau), baris padi, pematang */
function sawahTerasering(o){o=opsi('sawahTerasering',{x:960,y:1080,lebar:1800,tinggi:380,baris:9,...OPS},o);
  const A=siap('sawahTerasering',o,'#2f4a28'),{s,R,dt,N,id}=A,Wl=o.lebar/s/2,n=round(o.baris),sd=o.seed*13,xs=[],
    pc=x=>-1000*(.62+.38*vnoise(x*s/480,sd))*(1-.8*(abs(x)/Wl)**2.5),   // skala derau dalam px: halus di ukuran berapa pun
    e=(k,x)=>k?pc(x)*(k/n)**1.25+(k<n?(6*sin(x*s/110+k*1.7)+8*(vnoise(x*s/120,sd+k)-.5))/s:0):0,
    J=c=>warnaJarak(c,o.jarak,-2000),tg=LANGIT.tengah,R2=mulberry32(sd),lx=o.cahaya&&o.cahaya.x!=null?(o.cahaya.x-o.x)/s:null,
    kv=p=>p.slice(1,-1).map((q,i)=>'Q'+tk(...q)+' '+tk((q[0]+p[i+2][0])/2,(q[1]+p[i+2][1])/2)).join('')+'L'+tk(...p[p.length-1]),   // kurva halus lewat titik tengah
    gs=(p,c,w,op)=>`<path d="M${tk(...p[0])+kv(p)}" fill="none" stroke="${c}" stroke-width="${f(w/s)}"${op?` opacity="${op}"`:''}/>`;
  for(let x=-Wl;x<=Wl;x+=[80,52,36][dt]/s)xs.push(x);
  const K=lapis();let isi='';K.S=poly(xs.map(x=>[x,pc(x)]).concat([[Wl,40],[-Wl,40]]));
  for(let k=0;k<n;k++){const a=xs.map(x=>[x,e(k+1,x)]),b=xs.map(x=>[x,e(k,x)]).reverse(),bj=R()<.6,d=`M${tk(...a[0])+kv(a)}L${tk(...b[0])+kv(b)}Z`,w=(2+4*(1-k/n)),
      ret=q=>xs.filter((_,i)=>i%2<1).map(x=>[x,e(k,x)+(e(k+1,x)-e(k,x))*q]);   // garis searah kontur petak
    isi+=`<path d="${d}" fill="${bj?J(campur(LANGIT.horizon,tg,.72)):N.dasar}"/>`;
    if(dt){const hp=abs(e(k+1,0)-e(k,0))*s,[jh,dk]=bj?[J(campur(LANGIT.horizon,tg,.15)),J(campur(tg,LANGIT.zenit||tg,.5))]:[J(campur(N.dasar,'#b8c060',.34)),N.gelap];
      isi+=gs(ret(.76),jh,hp*.46,.55)+gs(ret(.92),jh,hp*.16,.8)+gs(ret(.16),dk,hp*.34,.6);
      if(!bj||R2()<.5)isi+=`<path d="${d}" fill="url(#${id}-p)"${bj?'':' opacity=".7"'}/>`;
      if(!bj)for(const q of[.3,.62])isi+=gs(ret(q),N.gelap,1.5,.4);
      else{let c='',g='';for(let i=0;i<6;i++){const x=(R2()-.5)*1.8*Wl,q=.2+.6*R2();c+=el(x,e(k,x)+(e(k+1,x)-e(k,x))*q,(14+30*R2())/s,1/s);}
        if(lx!=null&&abs(lx)<Wl)for(let i=0;i<3;i++)g+=el(lx+(R2()-.5)*50/s,e(k,lx)+(e(k+1,lx)-e(k,lx))*(.2+.25*i),(24+40*R2())/s,1.5/s);
        isi+=lap(c,N.rim,.3)+lap(g,N.cahaya,.75);}}
    isi+=gs(ret(.06),'#05040a',w*.8,.28)+gs(b,N.gelap,w)+gs(b.map(([x,y])=>[x,y-w*.4/s]),N.lis,.9,.5);}
  return rakit('sawahTerasering',o,A,K,{isi,ekstra:`<pattern id="${id}-p" patternUnits="userSpaceOnUse" width="${f(13/s)}" height="${f(10/s)}"><path d="M0,0h${f(1.6/s)}v${f(4/s)}h${f(-1.6/s)}zM${f(6.5/s)},${f(5/s)}h${f(1.6/s)}v${f(4/s)}h${f(-1.6/s)}z" fill="${J('#26401f')}" opacity=".55"/></pattern>`});}

/* obor: badan saja; nyala = api di (x, y − tinggi) */
function obor(o){o=opsi('obor',{x:960,y:900,tinggi:260,jenis:['tiang','dinding'],kolam:0,...OPS},o);
  const A=siap('obor',o,BAHAN.kayu,{arah:270,warna:'#ffb060'}),{N,dt,id}=A,K=lapis(),tg=o.jenis==='tiang',kol=tg&&o.kolam;
  if(tg){K.S+=ruas([[0,0],[0,-860]],34,26)+sim([[0,-1000],[42,-992],[40,-900],[22,-856]]);
    if(dt){for(let y=-130;y>-860;y-=140)K.D+=kotak(-17,y,34,6);for(let y=-980;y<-880;y+=22)K.D+=kotak(-38,y,76,5);}}
  else{K.S+=sim([[0,-1000],[150,-1000],[96,-800],[20,-780]])+kotak(-16,-790,32,560)+kotak(-70,-300,140,150);if(dt)K.D+=kotak(-150,-1000,300,26)+kotak(-40,-270,80,8);}
  return rakit('obor',o,A,K,{ekstra:kol?`<radialGradient id="${id}-p">${stop(0,N.cahaya)+stop(1,N.cahaya,0)}</radialGradient>`:'',
    isi:kol?`<ellipse rx="1150" ry="250" fill="url(#${id}-p)" opacity=".5"/>`:''});}

/* api: kanvas nyala, dihapus + digambar dari tl.time() tiap frame */
const wob=(t,s)=>sin(t*7.1+s)*.5+sin(t*13.7+s*2.3)*.3+sin(t*23.3+s*.7)*.2,
  nyala=(x,y,h,w,t,s)=>{const sw=wob(t*1.3,s)*w*.45,u=[x+sw,y-h*(1+.12*wob(t*2,s+1))];
    return`M${tk(x-w,y)}C${tk(x-w*1.1,y-h*.45)} ${tk(x+sw*.4-w*.5,y-h*.7)} ${tk(u[0],u[1])}C${tk(x+sw*.4+w*.55,y-h*.66)} ${tk(x+w*1.15,y-h*.4)} ${tk(x+w,y)}Q${tk(x,y+w*.7)} ${tk(x-w,y)}Z`;},
  warnaAsap=o=>warnaJarak(o.warna||campur(LANGIT.horizon,'#6a6070',.55),o.jarak,-2000),
  kanvas=(n,bd,X,Y,w,h,kelas,blend)=>{if(!(bd instanceof HTMLElement))salah(n,'bidang wajib elemen HTML (<div data-z> atau anaknya), bukan <g> SVG');
    const c=document.createElement('canvas');c.className=kelas;c.width=ceil(w);c.height=ceil(h);
    c.style.cssText=`position:absolute;left:${f(X)}px;top:${f(Y)}px;pointer-events:none${blend?';mix-blend-mode:'+blend:''}`;bd.appendChild(c);return c;};
function api(bidang,titik,o={}){
  if(!Array.isArray(titik)||!titik.length||!titik.every(p=>Array.isArray(p)&&p.length>1&&p.length<4&&p.every(Number.isFinite)))salah('api','titik harus larik [[x,y],[x,y,skala]…] (angka, px bidang)');
  o=opsi('api',{tinggi:74,lebar:15,seed:1},o);
  const m=o.tinggi*1.4*max(...titik.map(p=>p[2]||1)),xs=titik.map(p=>p[0]),ys=titik.map(p=>p[1]),X=f(min(...xs)-m),Y=f(min(...ys)-2*m),
    c=kanvas('api',bidang,X,Y,max(...xs)-X+m,max(...ys)-Y+m*.5,'wv-api','screen'),x=c.getContext('2d');
  x.setTransform(1,0,0,1,-X,-Y);
  const gambar=()=>{if(!c.isConnected)return;const t=tl.time();x.clearRect(X,Y,c.width,c.height);
    titik.forEach(([px,py,k=1],i)=>{const q=1+.18*wob(t,i*3.1+o.seed);
      for(const[hh,ww,dt,col,a]of[[1,1,0,'#ff6a18',.92],[.68,.67,.07,'#ffae40',1],[.32,.37,.11,'#fff0c8',1]]){x.globalAlpha=a;x.fillStyle=col;
        x.fill(new Path2D(nyala(px,py,hh*o.tinggi*q*k,ww*o.lebar*k,t+dt,i*5+o.seed*11)));}});};
  gambar();rantaiUpdate(gambar);return c;}

/* asap: kepulan statis. asapHidup: kepulan di kanvas dari tl.time() */
function asap(o){o=opsi('asap',{x:960,y:600,tinggi:400,angin:.35,seed:1,cahaya:null,jarak:0,warna:null,id:null},o);
  const R=mulberry32(o.seed),r=(a,b)=>a+(b-a)*R(),L=lampu('asap',o.cahaya,o.x,o.y-o.tinggi/2),c=warnaAsap(o),
    id=o.id||`wvp-asap-${hash(JSON.stringify([o,L,LANGIT.horizon]))}`;let g='';
  for(let i=0;i<26;i++){const t=(i+r(0,.8))/26,rad=60+240*t;
    g+=`<ellipse cx="${f(o.angin*1000*t**1.5+r(-40,40)*t)}" cy="${f(-1000*t)}" rx="${f(rad*r(.95,1.3))}" ry="${f(rad*r(.7,.95))}" fill="url(#${id}-r)" opacity="${(.6*(1-t)**1.3+.05).toFixed(2)}"/>`;}
  return`<g id="${id}" class="wv-pustaka" data-pustaka="asap" transform="translate(${f(o.x)},${f(o.y)}) scale(${+(o.tinggi/1000).toFixed(4)})"><defs><radialGradient id="${id}-r" fx="${(.5+.3*L.x).toFixed(2)}" fy="${(.5+.3*L.y).toFixed(2)}">`+
    stop(0,campur(c,L.w,.35),.6)+stop(.6,c,.26)+stop(1,c,0)+`</radialGradient></defs>${g}</g>`;}
function asapHidup(bidang,o={}){o=opsi('asapHidup',{x:960,y:600,tinggi:400,angin:.35,n:14,seed:1,jarak:0,warna:null},o);
  const H=o.tinggi,m=H*.32,dx=o.angin*H,X=o.x-m+min(0,dx),Y=o.y-H-m,c=kanvas('asapHidup',bidang,X,Y,2*m+abs(dx),H+m*1.3,'wv-asap'),
    x=c.getContext('2d'),sp=document.createElement('canvas'),sx=sp.getContext('2d'),gr=sx.createRadialGradient(32,32,0,32,32,32),
    w=warnaRGB(warnaAsap(o)).join(),rnd=mulberry32(o.seed),
    G=Array.from({length:min(60,round(o.n))},()=>Array.from({length:5},rnd));
  sp.width=sp.height=64;gr.addColorStop(0,`rgba(${w},.5)`);gr.addColorStop(.5,`rgba(${w},.2)`);gr.addColorStop(1,`rgba(${w},0)`);sx.fillStyle=gr;sx.fillRect(0,0,64,64);
  const gambar=()=>{if(!c.isConnected)return;const t=tl.time();x.clearRect(0,0,c.width,c.height);
    for(const g of G){const k=t/(6+4*g[0])+g[1],p=k-floor(k),rad=(.04+.26*p)*H*(.8+.4*g[2]),a=min(1,p*6)*(1-p)**1.3*(.5+.5*g[4]);
      if(a>.004){x.globalAlpha=a;x.drawImage(sp,o.x-X+dx*p**1.5+sin(6.283*(p+g[3]))*H*.03*p-rad,o.y-Y-H*p-rad,2*rad,2*rad);}}};
  gambar();rantaiUpdate(gambar);return c;}

/* relief: panel batu berbingkai, pahatan timbul, bevel dipanggang */
function relief(o){o=opsi('relief',{x:960,y:800,lebar:900,tinggi:420,isi:['prosesi','kalpataru','perahu'],...OPS},o);
  const A=siap('relief',o,BAHAN.batu),{s,r,dt,L,N,id}=A,w=o.lebar/s/2,K=lapis(),Y=-120;let I='';
  /* sosok samping (100 = tinggi): pose 0 menyembah, 1 turun, 2 menjunjung, 3 berlutut */
  const sosok=(x,y,h,hd,ps)=>{const u=h/100,X=v=>x+hd*v*u,j=ps>2?30:0,Q=(...p)=>p.map(([a,b])=>[X(a),y-(b-j*(b>50))*u]);
    I+=el(X(2),y-(89-j)*u,7.5*u,8.5*u)+el(X(-6),y-(95-j)*u,4.5*u,4.5*u)+poly(Q([-8,80],[8,80],[7,52],[-6,52]))+
      (ps>2?poly(Q([-12,54],[10,54],[24,6],[-16,0])):poly(Q([-9,54],[10,54],[14,22],[-11,22]))+ruas(Q([-3,24],[-10,0]),7*u,5*u)+ruas(Q([4,24],[13,1]),7*u,5*u))+
      ruas(Q(...[[[5,76],[17,60],[27,66]],[[5,76],[9,58],[12,46]],[[5,76],[14,90],[9,104]],[[5,76],[19,70],[24,80]]][ps]),5*u,4*u)+(ps===2?el(X(4),y-107*u,12*u,7*u):'');},
    pohon=(x,y,h)=>{I+=sim([[0,-.18*h],[.16*h,-.12*h],[.1*h,0]],x,y)+ruas([[x,y-.15*h],[x,y-.82*h]],.07*h,.04*h)+sim([[0,-h],[.3*h,-.86*h],[.26*h,-.8*h]],x,y);
      for(let i=0;i<3;i++)for(const sg of SG){const sx=x+sg*(.15+.05*i)*h,sy=y-(.34+.17*i)*h;I+=ruas(qb([x,sy+.06*h],[x+sg*.04*h,sy-.04*h],[sx,sy],4),.035*h,.02*h)+spiral(sx,sy,.1*h*(1-.15*i),1.6,sg);}};
  if(!dt);else if(o.isi==='prosesi'){pohon(-w+190,Y,700);const n=max(2,floor((2*w-420)/170));
    for(let i=0;i<n;i++){const x=-w+380+(i+r(-.15,.15))*(2*w-520)/max(1,n-1),u=5.6*r(.88,1.04);sosok(x,Y,100*u,1,[1,0,2,1,0][i%5]);
      if(i===1)I+=ruas([[x+27*u,Y-66*u],[x+30*u,Y-150*u]],16,16)+sim([[0,-70],[190,-8],[190,20]],x+30*u,Y-150*u);}}   // payung kebesaran
  else if(o.isi==='kalpataru'){pohon(0,Y,760);for(const sg of SG)sosok(sg*w*.5,Y,520,-sg,3);}
  else{const ka=-w*.62,kb=w*.62;   // perahu: lambung, cadik, layar tanja, ombak
    I+=poly(qb([ka,-430],[0,-250],[kb,-430],14).concat([[kb+30,-520],[kb-20,-470],[ka+10,-470],[ka-40,-520]]))+el(0,-290,w*.5,22)+ruas([[-w*.32,-410],[-w*.3,-295]],14,14)+ruas([[w*.3,-410],[w*.32,-295]],14,14);
    for(const[mx,lc]of[[-w*.22,-.1],[w*.16,.08]]){const t=[mx+lc*500,-920];I+=ruas([[mx,-470],t],12,8)+poly([[t[0]-170,-870],[t[0]+40,-930],[t[0]+120,-590],[t[0]-110,-545]]);}
    for(let i=0;i<3;i++)sosok(-w*.36+i*w*.22,-470,230,1,i%2);
    for(let x=-w+90;x<w-60;x+=110)I+=spiral(x,-200,34,1.3,1)+kotak(x-55,-186,112,24);}
  const u=(i,c,k)=>`<use href="#${id}-${i}" fill="${c}" transform="translate(${f(L.x*9*k)},${f(L.y*9*k)})"/>`,tb=i=>u(i,N.terang,1)+u(i,N.gelap,-1)+u(i,campur(N.dasar,N.terang,.45),0);
  K.S=kotak(-w,-1000,2*w,1000);K.G=kotak(-w+60,-940,2*w-120,880);
  return rakit('relief',o,A,K,{ekstra:`<path id="${id}-f" d="${kotak(-w,-1000,2*w,60)+kotak(-w,-60,2*w,60)+kotak(-w,-1000,60,1000)+kotak(w-60,-1000,60,1000)+kotak(-w+72,Y-18,2*w-144,18)}"/><path id="${id}-i" d="${I}"/>`,isi:tb('f')+tb('i')});}

/* ---- RELIEF HIDUP: dindingRelief() = DATA pahatan (bukan SVG) untuk reliefHidup() (src/runtime/relief-hidup.js;
   references/relief-candi.md). lapis = {jenis, d, kotak, z, r}: jenis 'timbul' (naik ke z, maks dengan yang di bawahnya),
   'rata' (bidang diset ke z: dinding, panel yang dipahat ke dalam), 'gurat' (alur sedalam z: nat, lipatan); d = jalur Path2D
   (px dinding, y ke bawah); kotak = [x0,y0,x1,y1]; z = tinggi 0..1 (1 = muka lis terluar); r = jari-jari tepi membulat (px).
   gerak = bagian yang hidup: {lapis, poros:[x,y], ayun:[derajat,periode,fase], kembang:[skala,periode,fase],
   geser:[dx,dy,periode,fase], alir:[px/dtk, periode px], klip:[x0,y0,x1,y1]} — reliefHidup menghitungnya dari t. */
const kt=Rs=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const p of Rs)for(const[x,y]of p){a=min(a,x);b=min(b,y);c=max(c,x);d=max(d,y);}return[f(a),f(b),f(c),f(d)];},
  LP=(jenis,Rs,z,r=0)=>({jenis,d:Rs.map(p=>poly(p)).join(''),kotak:kt(Rs),z:round(z*1000)/1000,r:f(r)}),
  elp=(x,y,rx,ry=rx,a=0,n=24)=>Array.from({length:n},(_,i)=>{const t=i/n*2*P,u=cos(t)*rx,v=sin(t)*ry;return[x+u*cos(a)-v*sin(a),y+u*sin(a)+v*cos(a)];}),
  /* poligon selebar w (angka, atau larik per titik) di sepanjang polyline p */
  gp=(p,w)=>{const A=[],B=[];p.forEach((q,i)=>{const a=p[max(0,i-1)],b=p[min(p.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],m=hypot(dx,dy)||1,
    h=(Array.isArray(w)?w[i]:w)/2;A.push([q[0]-dy/m*h,q[1]+dx/m*h]);B.push([q[0]+dy/m*h,q[1]-dx/m*h]);});return A.concat(B.reverse());},
  tgk=(a,b,wa,wb)=>[gp([a,b],[wa,wb]),elp(a[0],a[1],wa/2),elp(b[0],b[1],wb/2)],   // ruas tubuh berujung bulat
  kot=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],
  LK=(jenis,x,y,w,h,z,r=0)=>({...LP(jenis,[kot(x,y,w,h)],z,r),persegi:1}),   // satu persegi: kotak = bentuknya (dirasterisasi analitik)
  simP=(p,x,y)=>p.map(([u,v])=>[x+u,y+v]).concat(p.map(([u,v])=>[x-u,y+v]).reverse()),   // setengah profil dicerminkan
  spP=(x,y,r,n,sg,k=1)=>{const p=Array.from({length:round(n*8)+1},(_,i)=>{const a=sg*i/8*P/2,k=r*(1-i/(n*9));return[x+cos(a)*k,y+sin(a)*k];});
    return gp(p,p.map((_,i)=>k*r*(.34-.26*i/(p.length-1))));},
  ISI_R=['prosesi','perahu','kalpataru'],
  /* sudut sendi (derajat dari tegak ke bawah, + = ke depan): pg = tinggi pinggul × t, cd = condong badan, kd/kj = [paha, betis]
     kaki dekat/jauh, ld/lj = [lengan atas, bawah] dekat/jauh. sembah: siku terangkat, lengan bawah menekuk balik ke wajah */
  POSE={jalan:{pg:.47,cd:0,kd:[16,4],kj:[-14,-22],ld:[-12,12],lj:[20,42]},junjung:{pg:.47,cd:-2,kd:[12,2],kj:[-12,-20],ld:[166,212],lj:[16,34]},
    baki:{pg:.47,cd:0,kd:[12,2],kj:[-12,-20],ld:[34,96],lj:[18,38]},payung:{pg:.47,cd:-2,kd:[10,0],kj:[-10,-16],ld:[130,174],lj:[14,30]},
    pikul:{pg:.47,cd:3,kd:[14,2],kj:[-12,-20],ld:[40,170],lj:[24,46]},tunjuk:{pg:.47,cd:-1,kd:[10,0],kj:[-10,-16],ld:[96,100],lj:[14,30]},
    sembah:{pg:.13,cd:6,kd:[72,270],kj:[68,268],ld:[60,200],lj:[56,196]},duduk:{pg:.16,cd:0,kd:[84,264],kj:[80,276],ld:[26,82],lj:[34,150]},
    dayung:{pg:.15,cd:20,kd:[82,8],kj:[78,4],ld:[66,30],lj:[58,24]}};
/* sosok: (x, y) = telapak di tanah; t = tinggi berdiri px; s = 1 menghadap kanan, −1 kiri; z = tinggi pahatan badan. Tubuh berisi
   (bukan lidi): kaki/lengan jauh lebih rendah (di belakang), lengan dekat paling tinggi dan dikembalikan terpisah: boleh jadi bagian
   bergerak (poros bahu). Kepala bulat telur + tudung rambut, hidung kecil, dagu; kain berlipat (panjang: sampai betis). */
function sosok(x,y,t,s,z,pose,{mahkota=0,panjang=0}={}){
  const u=t/100,Q=POSE[pose],rd=a=>a*P/180,ke=(o,a,l)=>[o[0]+s*sin(rd(a))*l*u,o[1]+cos(rd(a))*l*u],c=rd(Q.cd),
    pg=[x,y-Q.pg*t],bh=[pg[0]+s*sin(c)*30*u,pg[1]-cos(c)*30*u],lh=[bh[0]+s*sin(c)*4*u,bh[1]-cos(c)*4*u],kp=[lh[0]+s*1.4*u,lh[1]-6.8*u],
    pt=[pg[0]+s*sin(c)*9*u,pg[1]-cos(c)*9*u],L=[],lr=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k],
    kaki=(k,o)=>{const l=ke(o,k[0],24),a=ke(l,k[1],23);return[o,l,a,ke(a,k[1]>180?k[1]:90,7.5)];},
    lgn=(k,o)=>{const e=ke(o,k[0],16),h=ke(e,k[1],14);return[o,e,h,ke(e,k[1],17)];},
    KD=kaki(Q.kd,[pg[0]+s*1.6*u,pg[1]]),KJ=kaki(Q.kj,[pg[0]-s*1.6*u,pg[1]]),LD=lgn(Q.ld,[bh[0]+s*1.6*u,bh[1]+2.4*u]),LJ=lgn(Q.lj,[bh[0]-s*2*u,bh[1]+2*u]),
    kakiR=K=>[...tgk(K[0],K[1],10.5*u,7.4*u),...tgk(K[1],K[2],7*u,4.6*u),...tgk(K[2],K[3],4.8*u,3.2*u)],
    lgnR=A=>[...tgk(A[0],A[1],6*u,4.8*u),...tgk(A[1],A[2],4.8*u,3.8*u),elp(A[3][0],A[3][1],3*u,2.3*u,atan2(A[3][1]-A[2][1],A[3][0]-A[2][0]))];
  L.push(LP('timbul',kakiR(KJ),z-.14,3.4*u),LP('timbul',lgnR(LJ),z-.12,2.6*u),
    LP('timbul',[gp([pg,pt,[(pt[0]+bh[0])/2+s*1.5*u,(pt[1]+bh[1])/2],bh],[16.5*u,12.5*u,15.5*u,13*u]),elp(bh[0],bh[1],6.6*u)],z-.02,6*u),
    LP('timbul',kakiR(KD),z-.05,3.4*u));
  /* kain pinggang → lutut (panjang: → 60 % betis, mengikuti langkah), wiru di depan, alur lipatan, ikat pinggang */
  const bw=[pt[0]-s*8*u,pt[1]],fw=[pt[0]+s*8*u,pt[1]],kd=panjang?lr(KD[1],KD[2],.6):KD[1],kj=panjang?lr(KJ[1],KJ[2],.6):KJ[1],
    wm=[(kd[0]+kj[0])/2+s*2*u,(kd[1]+kj[1])/2],lip=[],
    kn=panjang?[bw,fw,[KD[1][0]+s*5.5*u,KD[1][1]],[kd[0]+s*4*u,kd[1]],[kj[0]-s*4*u,kj[1]],[KJ[1][0]-s*5.5*u,KJ[1][1]]]:[bw,fw,[kd[0]+s*5.5*u,kd[1]],[kj[0]-s*5.5*u,kj[1]]];
  for(let i=1;i<4;i++){const k=i/4;lip.push(gp(qb(lr(bw,kj,k),[(pt[0]+wm[0])/2,(pt[1]+wm[1])/2+i*3*u],lr(fw,kd,k),6),1.1*u));}
  L.push(LP('timbul',[kn],z,4*u),LP('gurat',lip,.03,.6*u),LP('timbul',[gp([[fw[0]-s*3*u,fw[1]+2*u],wm],[2.8*u,4.6*u])],z+.03,1.4*u),LP('timbul',[gp([bw,fw],2.6*u)],z+.02,u));
  /* kepala, tudung rambut, mahkota (diadem + jatamakuta bergurat) atau sanggul, anting, kalung, mata */
  L.push(LP('timbul',[gp([lh,kp],5.6*u),elp(kp[0],kp[1],5.9*u,7.2*u,c*.6*s),[[kp[0]+s*5.4*u,kp[1]-.8*u],[kp[0]+s*6.6*u,kp[1]+1.8*u],[kp[0]+s*5.2*u,kp[1]+2.8*u]],
    elp(kp[0]+s*3.2*u,kp[1]+5.3*u,2.6*u,2*u)],z+.02,4.4*u),LP('timbul',[elp(kp[0]-s*1.6*u,kp[1]-2.8*u,5.2*u,4.8*u)],z+.035,3*u));
  if(mahkota)L.push(LP('timbul',[[[kp[0]-s*4.6*u,kp[1]-4*u],[kp[0]+s*3.8*u,kp[1]-5.6*u],[kp[0]+s*2.6*u,kp[1]-13.5*u],[kp[0]+s*.6*u,kp[1]-17.5*u],[kp[0]-s*2.6*u,kp[1]-16.5*u],[kp[0]-s*4*u,kp[1]-11*u]]],z+.03,2.4*u),
    LP('timbul',[gp([[kp[0]-s*5*u,kp[1]-3.4*u],[kp[0]+s*4.6*u,kp[1]-5*u]],2*u)],z+.05,.8*u),
    LP('gurat',[gp([[kp[0]-s*4*u,kp[1]-8.5*u],[kp[0]+s*3*u,kp[1]-9.5*u]],.9*u),gp([[kp[0]-s*3.4*u,kp[1]-12.5*u],[kp[0]+s*2.4*u,kp[1]-13.2*u]],.9*u)],.025,.5*u));
  else L.push(LP('timbul',[elp(kp[0]-s*4.8*u,kp[1]-4.4*u,3.3*u,3*u)],z+.045,2.2*u));
  L.push(LP('timbul',[elp(kp[0]-s*1.2*u,kp[1]+1.8*u,1.7*u,2.1*u)],z+.055,u),LP('timbul',[gp(qb([lh[0]-s*3*u,lh[1]+u],[lh[0]+s*u,lh[1]+6*u],[lh[0]+s*5*u,lh[1]+2*u],6),1.6*u)],z+.005,.7*u),
    LP('gurat',[elp(kp[0]+s*3*u,kp[1]-.9*u,1.3*u,.5*u)],.025,.4*u));
  return{lapis:L,lengan:[LP('timbul',lgnR(LD),z+.045,2.6*u),LP('timbul',[gp([ke(LD[0],Q.ld[0],4),ke(LD[0],Q.ld[0],6.5)],6.6*u)],z+.065,u)],bahu:LD[0],tangan:LD[3],kepala:kp,u};}
/* pohon latar (relief rendah): batang, tajuk dari gumpal daun, alur helai daun */
function pohonR(L,x,y,t,z,r){const lb=[elp(x,y-t*.62,t*.18,t*.14)],v=[];
  for(let i=0;i<13;i++){const a=-P/2+(i/12-.5)*2.6,d=t*r(.16,.26),q=t*r(.09,.13),c=[x+cos(a)*d*1.1,y-t*.64+sin(a)*d*.85];lb.push(elp(c[0],c[1],q,q*r(.75,.95),r(0,P)));
    for(let j=0;j<3;j++){const b=r(0,2*P),e=q*r(.2,.7);v.push(elp(c[0]+cos(b)*e,c[1]+sin(b)*e,6,2.2,r(0,P)));}}
  L.push(LP('timbul',[gp([[x,y],[x+r(-6,6),y-t*.35],[x+r(-8,8),y-t*.6]],[t*.075,t*.05,t*.035])],z-.02,t*.02),LP('timbul',lb,z,t*.04),LP('gurat',v,.03,1.2));}
const awanR=(L,x,y,k)=>L.push(LP('timbul',[elp(x,y,34*k,20*k),elp(x-38*k,y+8*k,24*k,16*k),elp(x+40*k,y+6*k,26*k,17*k),spP(x-58*k,y+20*k,14*k,1.1,1,1.4),spP(x+62*k,y+18*k,14*k,1.1,-1,1.4)],.3,8*k));
/* A · prosesi berangkat: pembawa kendi, pembawa baki, bangsawan bermahkota di bawah payung kebesaran (bergoyang), dua pemikul peti
   (peti berayun); pohon latar di kedua ujung. u = jarak dari tepi depan arak-arakan (arah cerita s). */
function prosesiR(L,G,[x0,y0,w,h],s,r){const X=v=>s<0?x0+v:x0+w-v,yt=y0+h-24;
  L.push(LK('timbul',x0,yt,w,24,.3,4));pohonR(L,X(70),yt,300,.28,r);pohonR(L,X(w-60),yt,270,.27,r);
  const a=sosok(X(150),yt,300,s,.6,'junjung'),kd=[a.kepala[0]-s*.6*a.u,a.kepala[1]-15.5*a.u];L.push(...a.lapis,...a.lengan,
    LP('timbul',[elp(kd[0],kd[1],9*a.u,7.6*a.u),kot(kd[0]-3.4*a.u,kd[1]-11*a.u,6.8*a.u,5*a.u),elp(kd[0],kd[1]-11*a.u,5*a.u,1.8*a.u)],.63,3*a.u),
    LP('gurat',[gp([[kd[0]-8*a.u,kd[1]-a.u],[kd[0]+8*a.u,kd[1]-a.u]],a.u)],.02,.5*a.u));
  const b=sosok(X(290),yt,300,s,.62,'baki'),tb=b.tangan;L.push(...b.lapis,...b.lengan,LP('timbul',[gp([[tb[0]-s*18,tb[1]-4],[tb[0]+s*20,tb[1]-4]],6),
    elp(tb[0]-s*6,tb[1]-14,8),elp(tb[0]+s*9,tb[1]-13,7.5),elp(tb[0]+s*1,tb[1]-25,7)],.7,3));
  const n=sosok(X(470),yt,345,s,.66,'jalan',{mahkota:1,panjang:1});L.push(...n.lapis,...n.lengan);
  const p=sosok(X(615),yt,300,s,.5,'payung'),hp=p.tangan,pc=[X(470)+s*6,yt-392],dx=pc[0]-hp[0],dy=pc[1]-hp[1],m=hypot(dx,dy),ub=[hp[0]-dx/m*60,hp[1]-dy/m*60],rb=[];
  L.push(...p.lapis,...p.lengan);for(let i=0;i<8;i++)rb.push(elp(pc[0]-63+i*18,pc[1]+5,9.5,7));
  G.push({lapis:[LP('timbul',[gp([ub,pc],6.5)],.55,3),LP('timbul',[[...qb([pc[0]-72,pc[1]+2],[pc[0],pc[1]-64],[pc[0]+72,pc[1]+2],14)],elp(pc[0],pc[1]-38,6.5)],.58,10),
    LP('timbul',rb,.6,3),LP('gurat',[gp(qb([pc[0]-54,pc[1]-8],[pc[0],pc[1]-44],[pc[0]+54,pc[1]-8],8),2.2),gp(qb([pc[0]-32,pc[1]-14],[pc[0],pc[1]-34],[pc[0]+32,pc[1]-14],6),2)],.03,1)],
    poros:hp,ayun:[2.2,4.4,r(0,6)]});
  const k1=sosok(X(775),yt,290,s,.58,'pikul'),k2=sosok(X(930),yt,290,s,.56,'pikul'),b1=k1.bahu,b2=k2.bahu,yp=(b1[1]+b2[1])/2-2*k1.u,mp=[(b1[0]+b2[0])/2,yp];
  L.push(...k1.lapis,...k1.lengan,...k2.lapis,...k2.lengan,LP('timbul',[gp([[b1[0]+s*46,yp],[b2[0]-s*34,yp]],7)],.66,3));   // pikulan di bahu
  G.push({lapis:[LP('timbul',[gp([[mp[0]-16,mp[1]],[mp[0]-20,mp[1]+52]],3.2),gp([[mp[0]+16,mp[1]],[mp[0]+20,mp[1]+52]],3.2)],.6,1.4),
    LP('timbul',[kot(mp[0]-34,mp[1]+50,68,44),[...qb([mp[0]-36,mp[1]+52],[mp[0],mp[1]+30],[mp[0]+36,mp[1]+52],8)]],.63,5),
    LP('gurat',[gp([[mp[0]-30,mp[1]+68],[mp[0]+30,mp[1]+68]],2.4),gp([[mp[0],mp[1]+54],[mp[0],mp[1]+90]],2.4)],.03,1.2)],poros:mp,ayun:[3,2.8,r(0,6)]});}
/* ombak: dua baris puncak gelombang yang menggulung (bibir condong ke arah aliran dir) dengan ikal di lekuknya; belakang rendah, depan
   tinggi (menutup lambung dan cadik); pola persis berperiode λ supaya alir menyambung */
function ombakR(x0,x1,yw,l,dir){const B=[];
  for(const j of[0,1]){const y=yw+j*40,A=l*(j?.42:.36),R=[],I=[];
    for(let x=x0-l+(j?l/2:0);x<x1+l;x+=l){const X=v=>x+dir*v;
      R.push([...qb([X(-A*1.3),y+A*.6],[X(-A*.25),y-A*1.25],[X(A*.8),y-A*.2],10),...qb([X(A*.8),y-A*.2],[X(A*.15),y-A*.45],[X(A*.05),y+A*.15],6).slice(1),
        ...qb([X(A*.05),y+A*.15],[X(A*.4),y+A*.55],[X(A*1.1),y+A*.6],5).slice(1)]);
      I.push(spP(X(A*.5),y-A*.12,A*.26,1.35,dir,1.6));}
    B.push(LP('timbul',R,j?.7:.42,5),LP('timbul',I,j?.72:.44,2));}
  return B;}
/* B · perahu bercadik berlayar ke arah s: lambung berhaluan tinggi, cadik + batang penyangga, rumah geladak, dua tiang kaki-dua dengan
   layar tanja menggembung (berkembang + berayun), tali-temali tipis, pengintai di haluan, dua pendayung (lengan + dayung bergerak),
   juru mudi; ombak mengalir; dua ikan; awan. */
function perahuR(L,G,[x0,y0,w,h],s,r){const X=v=>s<0?x0+v:x0+w-v,yw=y0+h*.64,yg=yw-44,q=qb;
  awanR(L,X(120),y0+74,1);awanR(L,X(880),y0+66,.9);
  L.push(LP('timbul',[[...q([X(70),yg-118],[X(92),yg-30],[X(170),yg],10),...q([X(170),yg],[X(520),yg+8],[X(840),yg-4],12).slice(1),...q([X(840),yg-4],[X(905),yg-12],[X(930),yg-80],8).slice(1),
    ...q([X(930),yg-80],[X(920),yg+20],[X(800),yg+52],8).slice(1),...q([X(800),yg+52],[X(480),yg+70],[X(190),yg+50],10).slice(1),...q([X(190),yg+50],[X(100),yg+30],[X(70),yg-118],10).slice(1,-1)]],.6,10),
    LP('gurat',[0,1,2].map(j=>gp(q([X(160),yg+12+j*15],[X(520),yg+22+j*15],[X(850),yg+8+j*15],12),2)),.035,1),
    LP('timbul',[spP(X(80),yg-108,17,1.4,-s,1.4),spP(X(924),yg-74,14,1.3,s,1.4)],.64,3),
    LP('timbul',[gp([[X(600),yg-4],[X(600),yg-58]],6),kot(min(X(612),X(732)),yg-58,120,58)],.44,4),
    LP('timbul',[[...q([X(592),yg-56],[X(672),yg-136],[X(752),yg-56],12)]],.47,6),LP('gurat',[gp(q([X(612),yg-62],[X(672),yg-112],[X(732),yg-62],8),2.2)],.03,1));
  const T=[];for(const um of[300,505]){const tp=[X(um),yg-262];T.push(tp);L.push(LP('timbul',[gp([[X(um-16),yg],tp],6),gp([[X(um+16),yg],tp],6)],.5,3));
    const tf=[um-34,yg-244],tb2=[um+88,yg-218],bb=[um+72,yg-104],bf=[um-50,yg-124],P2=([a,b])=>[X(a),b],lerp=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k],bt=[];
    for(let i=1;i<4;i++){const k=i/4;bt.push(gp([P2(lerp(tf,bf,k)),P2(lerp(tb2,bb,k))],3));}
    G.push({lapis:[LP('timbul',[[tf,tb2,bb,bf].map(P2)],.56,22),LP('timbul',[gp([P2(tf),P2(tb2)],6),gp([P2(bf),P2(bb)],6)],.62,3),LP('gurat',bt,.05,1.6)],
      poros:tp,ayun:[1.3,5.2,r(0,6)],kembang:[.022,3.6,r(0,6)]});}
  L.push(LP('timbul',[gp([T[0],[X(78),yg-112]],2.6),gp([T[0],T[1]],2.6),gp([T[1],[X(922),yg-80]],2.6)],.34,1.2));
  const lk=sosok(X(205),yg+14,226,s,.5,'tunjuk');L.push(...lk.lapis,...lk.lengan);
  [[395,0],[455,1.2]].forEach(([ur,fa])=>{const d=sosok(X(ur),yg+22,226,s,.5,'dayung'),hd=d.tangan,v=[-s*.42,.91];L.push(...d.lapis);
    G.push({lapis:[...d.lengan,LP('timbul',[gp([[hd[0]-v[0]*16,hd[1]-v[1]*16],[hd[0]+v[0]*118,hd[1]+v[1]*118]],5),elp(hd[0]+v[0]*124,hd[1]+v[1]*124,7,17,atan2(v[1],v[0])+P/2)],.66,2.5)],
      poros:d.bahu,ayun:[10,2.6,fa]});});
  const jm=sosok(X(820),yg+14,226,s,.5,'baki'),hm=jm.tangan,vm=[-s*.5,.87];L.push(...jm.lapis);
  G.push({lapis:[...jm.lengan,LP('timbul',[gp([[hm[0]-vm[0]*20,hm[1]-vm[1]*20],[hm[0]+vm[0]*150,hm[1]+vm[1]*150]],7),elp(hm[0]+vm[0]*156,hm[1]+vm[1]*156,9,24,atan2(vm[1],vm[0])+P/2)],.66,3)],
    poros:jm.bahu,ayun:[2.5,6,r(0,6)]});
  L.push(LP('timbul',[gp([[X(240),yw+10],[X(760),yw+10]],15),...[300,480,660].map(v=>gp([[X(v),yg+2],[X(v+6),yw+8]],8))],.68,6));
  G.push({lapis:ombakR(x0,x0+w,yw,72,-s),poros:[x0+w/2,yw],alir:[-s*7,72],geser:[0,2,4.6,0],klip:[x0,y0,x0+w,y0+h]});
  for(const[ui,fs]of[[250,-s],[700,s]]){const c=[X(ui),yw+100];G.push({lapis:[LP('timbul',[elp(c[0],c[1],22,8),[[c[0]-fs*18,c[1]],[c[0]-fs*34,c[1]-11],[c[0]-fs*34,c[1]+11]],
    [[c[0]-fs*2,c[1]-6],[c[0]+fs*6,c[1]-6],[c[0]-fs*6,c[1]-15]]],.5,4),LP('gurat',[elp(c[0]+fs*13,c[1]-1.5,2.2)],.03,1)],poros:c,ayun:[5,1.6,r(0,6)],geser:[fs*36,3,17,r(0,6)]});}}
/* C · tiba di bawah kalpataru: pohon kalpataru (jambangan, tajuk kubah dari ikal daun bertumpuk, payung, untaian permata yang berayun,
   dua burung bertengger, satu mengepak), resi duduk berlingkar cahaya di atas lapik menghadap tamu, dua pelancong menyembah (tangan
   bergerak), pengiring berbaki. */
function kalpataruR(L,G,[x0,y0,w,h],s,r){const X=v=>s<0?x0+v:x0+w-v,yt=y0+h-24,cx=X(172),cy=yt-310,tj=[],dn=[];
  L.push(LK('timbul',x0,yt,w,24,.3,4));awanR(L,X(640),y0+82,.95);
  L.push(LP('timbul',[elp(cx,yt-36,36,32),kot(cx-14,yt-84,28,18),elp(cx,yt-86,22,6),kot(cx-26,yt-8,52,8)],.55,8),
    LP('gurat',[gp([[cx-33,yt-44],[cx+33,yt-44]],2.2),gp([[cx-35,yt-28],[cx+35,yt-28]],2.2)],.03,1),
    LP('timbul',[gp([[cx,yt-82],[cx+4,yt-160],[cx-3,yt-230]],[20,15,12])],.5,6),
    LP('timbul',[elp(cx,cy+6,134,78),...Array.from({length:15},(_,i)=>{const a=P*(1.08-1.16*i/14);return elp(cx+cos(a)*140,cy+6-sin(a)*84,24+6*(i%2),22+5*(i%2));})],.42,8));   // tajuk: gumpal bergerigi di tepi (relief rendah)
  for(let j=0;j<4;j++){const yy=cy+56-j*42,hw=146-j*34,m=6-j;
    for(let i=0;i<m;i++){const k=m>1?i/(m-1)-.5:0,lx=cx+k*2*hw,ly=yy+k*k*30,sg=k<0?-1:1;
      tj.push(spP(lx,ly,21-j*1.5,1.4,sg,2),elp(lx-sg*13,ly+12,16,7,-sg*.6));dn.push(gp(qb([lx-sg*20,ly+8],[lx-sg*12,ly+4],[lx-sg*4,ly+14],4),1.8));}}
  L.push(LP('timbul',tj,.56,4),LP('gurat',dn,.03,1),LP('timbul',[gp([[cx,cy-88],[cx,cy-126]],6),[...qb([cx-34,cy-118],[cx,cy-156],[cx+34,cy-118],8)],elp(cx,cy-142,6)],.5,5));
  [-125,-70,70,125].forEach((dx,i)=>{const a=[cx+dx,cy+92*sqrt(1-(dx/158)**2)-8],B=[gp([a,[a[0],a[1]+100]],1.6)],e=a[1]+102;
    for(let k=0;k<6;k++)B.push(elp(a[0],a[1]+6+k*16,4.3-k*.15));B.push([[a[0],e-6],[a[0]+6,e+4],[a[0],e+16],[a[0]-6,e+4]]);
    G.push({lapis:[LP('timbul',B,.56,2.5)],poros:a,ayun:[2.6,3.4+i*.37,i*1.3]});});
  for(const sg of[-1,1]){const b=[cx+sg*74,cy-100],m2=-sg,sy=[b[0]+m2*4,b[1]-4],   // bertengger di puncak kubah, menghadap batang
      sw=LP('timbul',[[sy,[sy[0]-m2*10,sy[1]-12],[sy[0]-m2*32,sy[1]-6],[sy[0]-m2*26,sy[1]+5],[sy[0]-m2*4,sy[1]+6]]],.575,3);
    L.push(LP('timbul',[elp(b[0],b[1],22,12,-.2*m2),elp(b[0]+m2*19,b[1]-13,8.5),[[b[0]+m2*25,b[1]-16],[b[0]+m2*37,b[1]-12],[b[0]+m2*25,b[1]-9]],
      [[b[0]-m2*14,b[1]-4],[b[0]-m2*44,b[1]+4],[b[0]-m2*42,b[1]+12],[b[0]-m2*14,b[1]+8]]],.54,4),LP('gurat',[elp(b[0]+m2*21,b[1]-15,1.8)],.03,1));
    if(sg>0)G.push({lapis:[sw],poros:sy,ayun:[8,2.3,0]});else L.push(sw);}
  const ds=X(345);L.push(LP('timbul',[kot(ds-82,yt-50,164,50),elp(ds,yt-52,78,9)],.42,6));
  const rs=sosok(ds,yt-50,300,-s,.62,'duduk',{mahkota:1});L.push(LP('timbul',[elp(rs.kepala[0],rs.kepala[1]-4*rs.u,15*rs.u,15*rs.u)],.32,6),...rs.lapis,...rs.lengan);
  [[575,300,.6,0],[730,290,.58,1.7]].forEach(([ut,t,z,fa])=>{const d=sosok(X(ut),yt,t,s,z,'sembah');L.push(...d.lapis);G.push({lapis:d.lengan,poros:d.bahu,ayun:[3.5,4.8,fa]});});
  const p=sosok(X(895),yt,300,s,.52,'baki'),tb=p.tangan;L.push(...p.lapis,...p.lengan,LP('timbul',[gp([[tb[0]-s*18,tb[1]-4],[tb[0]+s*20,tb[1]-4]],6),elp(tb[0]-s*5,tb[1]-14,7.5),elp(tb[0]+s*8,tb[1]-13,7)],.66,3));}
/* dindingRelief: dinding galeri berpahat — antefiks (simbar ber-ikal) di langit, lis atas bergigi, panel (isi kiri → kanan) dipahat ke
   dalam berbingkai, pilaster berroset, lis bawah berkelopak padma, nat blok batu (memotong pahatan, seperti di Borobudur) + nada tiap
   blok, gompal. arah = ke mana cerita mengalir (−1: ke kiri = pradaksina bila menghadap dinding). Metrik vertikal untuk tinggi 1000. */
function dindingRelief(o={}){
  const isi=o&&o.isi!==undefined?o.isi:['kalpataru','perahu','prosesi'];
  if(!Array.isArray(isi)||!isi.length||isi.some(v=>!ISI_R.includes(v)))salah('dindingRelief',`isi harus larik nama panel (${ISI_R.join(' ')}) (dapat ${isi})`);
  o=opsi('dindingRelief',{lebar:4300,tinggi:1000,lebarPanel:1000,arah:[-1,1],seed:1,isi:null},{...o,isi:undefined});
  const{lebar:Wd,tinggi:Td,arah:s,lebarPanel:pw}=o,R=mulberry32(o.seed*7919+11),r=(a,b)=>a+(b-a)*R(),k=Td/1000,Y=v=>v*k,n=isi.length,gap=150,
    mx=(Wd-n*pw-(n-1)*gap)/2,py=Y(236),ph=Y(520),L=[],G=[],BL=[],pita=(y0,y1,z,q)=>L.push(LK('timbul',-20,Y(y0),Wd+40,Y(y1-y0),z,q));
  if(pw<700)salah('dindingRelief',`lebarPanel harus ≥ 700 px (dapat ${pw}): tokoh dirancang untuk panel setinggi 520 px desain`);
  if(mx<80)salah('dindingRelief',`lebar ${Wd} terlalu kecil untuk ${n} panel × ${pw} px (+ celah ${gap}, tepi ≥ 80): perlu ≥ ${ceil(n*pw+(n-1)*gap+160)}`);
  L.push(LK('rata',0,Y(110),Wd,Td-Y(110),.8));
  for(let x=56;x<Wd;x+=112)L.push(LP('timbul',[simP([[0,-Y(90)],[7,-Y(80)],[13,-Y(66)],[22,-Y(52)],[25,-Y(38)],[19,-Y(26)],[24,-Y(14)],[27,0]],x,Y(112)),kot(x-31,Y(104),62,Y(10))],.95,7),
    LP('gurat',[spP(x-7,Y(54),8,1.2,1,1.3),spP(x+7,Y(54),8,1.2,-1,1.3),elp(x,Y(30),4.5)],.04,1.5));
  pita(110,124,1,4);pita(124,152,.95,Y(10));pita(152,160,.9,2);pita(192,202,.9,3);
  for(let x=8;x<Wd;x+=34)L.push(LK('timbul',x,Y(163),22,Y(26),.92,4));
  const PN=isi.map((_,i)=>[mx+i*(pw+gap),py,pw,ph]);
  for(const[x0,y0,w,h]of PN)L.push(LK('timbul',x0-14,y0-14,w+28,h+28,.86,3),LK('rata',x0,y0,w,h,.07,6));
  for(let i=0;i<=n;i++){const xc=mx+i*(pw+gap)-gap/2,ro=[],kl=[];L.push(LK('timbul',xc-34,Y(214),68,Y(556),.9,5));
    for(let y=Y(262);y<Y(740);y+=Y(76)){ro.push(elp(xc,y,15));for(let j=0;j<6;j++)kl.push(elp(xc+cos(j*P/3)*9,y+sin(j*P/3)*9,5,2.4,j*P/3));}
    L.push(LP('timbul',ro,.96,6),LP('gurat',kl,.03,1.5));}
  pita(772,784,.9,3);pita(800,812,.96,3);pita(872,882,.97,3);pita(882,912,.9,Y(10));
  for(let x=-10;x<Wd+20;x+=40)L.push(LP('timbul',[simP([[0,-Y(58)],[8,-Y(50)],[15,-Y(30)],[17,0]],x,Y(872))],.93,Y(9)));
  isi.forEach((v,i)=>({prosesi:prosesiR,perahu:perahuR,kalpataru:kalpataruR})[v](L,G,PN[i],s,r));
  /* nat blok: baris 96–128 tinggi desain, sambungan tegak tiap 170–300 px, garis bergetar ±0,7 px; blok = [x0,y0,x1,y1,nada 0..1] */
  const gtr=(a,b)=>Array.from({length:9},(_,i)=>{const t=i/8;return[a[0]+(b[0]-a[0])*t+(i%8?r(-.7,.7):0),a[1]+(b[1]-a[1])*t+(i%8?r(-.7,.7):0)];});
  for(let y=Y(110);y<Td;){const y1=min(Td,y+Y(r(96,128)));if(y>Y(110))L.push(LP('gurat',[gp(gtr([-10,y],[Wd+10,y]),2.2)],.045,1.1));
    for(let xa=0,x=r(40,200);xa<Wd;xa=x,x+=r(170,300)){BL.push([f(xa),f(y),f(min(Wd,x)),f(y1),round(r(0,1)*100)/100]);if(x<Wd)L.push(LP('gurat',[gp(gtr([x,y],[x,y1]),2.2)],.045,1.1));}
    y=y1;}
  for(let i=0;i<14;i++){const[x0,y0,w,h]=PN[floor(r(0,n))],e=floor(r(0,4)),c=e<2?[x0+r(0,w),e?y0:y0+h]:[e<3?x0:x0+w,y0+r(0,h)],q=r(5,13);   // gompal di tepi panel
    L.push(LP('gurat',[elp(c[0],c[1],q,q*r(.5,.9),r(0,P),9).map(([x,y])=>[x+r(-2,2),y+r(-2,2)])],r(.05,.14),3));}
  return{lebar:Wd,tinggi:Td,panel:PN,blok:BL,lapis:L,gerak:G};}

/* kain: <pattern> ubin 40 px untuk kostum (4b) */
function kain(o){o=opsi('kain',{motif:['kawung','parang','ceplok','truntum'],skala:1,sudut:0,seed:1,warna:null,id:null},o);
  const m=o.motif,id=o.id||`kain-${m}-${hash(JSON.stringify(o))}`,R=mulberry32(o.seed),k=R()<.5?8:6,
    [lt,fg,ak]=({kawung:['#2a2230','#d9c79a','#8a5a3a'],parang:['#3a2418','#dcc89c','#6e3a20'],ceplok:['#1e2238','#d4c191','#9a3e2e'],truntum:['#1c1814','#e6d6aa','#a0703a']})[m].map((c,i)=>[].concat(o.warna||[])[i]||c);
  let a='',b='',c='';
  if(m==='kawung'){for(let i=0;i<4;i++){const t=P/4+i*P/2,x=20+cos(t)*12,y=20+sin(t)*12;a+=el(x,y,10.5,6.4,t);b+=el(x,y,2.4,1.2,t);}
    for(const[x,y]of[[20,20],[0,0],[40,0],[0,40],[40,40]])c+=el(x,y,2.6,2.6);}
  else if(m==='parang'){a=kotak(0,7,40,26);b=ruas(qb([0,27],[20,32],[20,20],5).concat(qb([20,20],[20,8],[40,13],5).slice(1)),6,6);
    c=kotak(0,7,40,2)+kotak(0,31,40,2)+poly([[20,-4],[24,0],[20,4],[16,0]])+poly([[20,36],[24,40],[20,44],[16,40]]);}
  else if(m==='ceplok'){for(let i=0;i<k;i++){const t=i*2*P/k;a+=el(20+cos(t)*8,20+sin(t)*8,7,3,t);}
    b=el(20,20,3,3);c=[[0,0],[40,0],[0,40],[40,40]].map(([x,y])=>poly([[x,y-7],[x+7,y],[x,y+7],[x-7,y]])).join('')+kotak(0,19.4,3,1.2)+kotak(37,19.4,3,1.2);}
  else{for(const[x,y]of[[10,10],[30,30]]){for(let i=0;i<k;i++){const t=i*2*P/k;a+=el(x+cos(t)*3.6,y+sin(t)*3.6,2.6,1.2,t);}c+=el(x,y,1.4,1.4);}
    for(const[x,y]of[[30,10],[10,30]])b+=poly([[x,y-3],[x+.8,y],[x,y+3],[x-.8,y]])+poly([[x-3,y],[x,y-.8],[x+3,y],[x,y+.8]]);}
  return`<pattern id="${id}" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(${f(o.sudut-(m==='parang'?45:0))}) scale(${o.skala})">`+
    `<rect width="40" height="40" fill="${lt}"/>${lap(a,fg)}${lap(b,m==='parang'?lt:ak)}${lap(c,m==='parang'?ak:fg)}</pattern>`;}

return{candi,gapura,rumahPanggung,beringin,lontar,gunungBerlapis,sawahTerasering,obor,api,asap,asapHidup,relief,kain,dindingRelief};})();
