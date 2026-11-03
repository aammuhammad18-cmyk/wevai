/* PUSTAKA ASET JAWA KUNO (sub-proyek 4a) — kontrak, API, jebakan, catatan budaya: references/pustaka.md. Satu global `pustaka`.
   Generator = fungsi murni opsi → string SVG untuk <svg viewBox="0 0 1920 1080" style="will-change:transform"> bidang [data-z]:
   <g class="wv-pustaka" transform="translate(x,y) scale(tinggi/1000)">, dipanggang sekali; sama seed/opsi/cahaya/LANGIT → sama
   byte. api, asapHidup = kait kanvas dari tl.time(). pustaka.relief = panel batu, BUKAN relief() cahaya-2d. Butuh atmosfer
   (+ cahaya-2d bila cahaya = nama SUMBER). Diuji tanpa browser: scripts/test-pustaka.mjs. */
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
  const semak=(x,y,rx,ry)=>{const p=[];for(let i=0;i<40;i++){const a=i/40*2*P,k=(1+(R()-.5)*.2)*(i%2?.88:1.04);p.push([x+cos(a)*rx*k,y+sin(a)*ry*k]);}K.S+=poly(p);};
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
    for(let j=0;j<=26;j++){const b=sp*(j/26-.5),rad=rr*(j%2?.72:1),u=cos(b)*rad,v=sin(b)*rad*q;pts.push([F[0]+cos(ax)*u-sin(ax)*v,F[1]+sin(ax)*u+cos(ax)*v]);}
    K.S+=ruas([C,F],9,5)+poly(pts);};
  const n=[10,15,21][dt];for(let i=0;i<n;i++)kipas(-P/2+(i/n-.5)*2*P*.94+r(-.15,.15),r(12,40),r(60,86),r(.35,1));
  if(dt)for(let i=0;i<3;i++)kipas(-P/2+r(-1.3,1.3),r(70,100),r(52,70),r(.4,.9));
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

/* sawah: petak air memantulkan langit / petak tanam, pematang, kilau */
function sawahTerasering(o){o=opsi('sawahTerasering',{x:960,y:1080,lebar:1800,tinggi:380,baris:9,...OPS},o);
  const A=siap('sawahTerasering',o,'#1d261f'),{s,R,dt,N,id}=A,Wl=o.lebar/s/2,n=round(o.baris),sd=o.seed*13,xs=[],
    pc=x=>-1000*(.62+.38*vnoise(x*s/480,sd))*(1-.8*(abs(x)/Wl)**2.5),   // skala derau dalam px: halus di ukuran berapa pun
    e=(k,x)=>k?pc(x)*(k/n)**1.25+(k<n?(6*sin(x*s/110+k*1.7)+8*(vnoise(x*s/120,sd+k)-.5))/s:0):0,
    air=campur(LANGIT.horizon,LANGIT.tengah,.25),J=c=>warnaJarak(c,o.jarak,-2000),
    kv=p=>p.slice(1,-1).map((q,i)=>'Q'+tk(...q)+' '+tk((q[0]+p[i+2][0])/2,(q[1]+p[i+2][1])/2)).join('')+'L'+tk(...p[p.length-1]),   // kurva halus lewat titik tengah
    gs=(p,c,w,op)=>`<path d="M${tk(...p[0])+kv(p)}" fill="none" stroke="${c}" stroke-width="${f(w/s)}"${op?` opacity="${op}"`:''}/>`;
  for(let x=-Wl;x<=Wl;x+=[80,52,36][dt]/s)xs.push(x);
  const K=lapis();let isi='';K.S=poly(xs.map(x=>[x,pc(x)]).concat([[Wl,40],[-Wl,40]]));
  for(let k=0;k<n;k++){const a=xs.map(x=>[x,e(k+1,x)]),b=xs.map(x=>[x,e(k,x)]).reverse(),bj=R()<.6;   // petak air (memantulkan langit) / tanam
    isi+=`<path d="M${tk(...a[0])+kv(a)}L${tk(...b[0])+kv(b)}Z" fill="${bj?`url(#${id}-a)`:dt?`url(#${id}-p)`:N.dasar}"/>`+gs(b,N.gelap,3.4-2*k/n)+(bj?gs(a,N.rim,1.5,(.55-.3*k/n).toFixed(2)):'');}
  return rakit('sawahTerasering',o,A,K,{isi,ekstra:`<linearGradient id="${id}-a" x2="0" y2="1">${stop(0,J(campur(air,'#fff',.1)))+stop(1,J(campur(air,N.dasar,.6)))}</linearGradient>`+
    `<pattern id="${id}-p" patternUnits="userSpaceOnUse" width="${f(11/s)}" height="${f(9/s)}"><rect width="${f(11/s)}" height="${f(9/s)}" fill="${N.dasar}"/><rect width="${f(2/s)}" height="${f(5/s)}" fill="${N.gelap}" opacity=".7"/></pattern>`});}

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
    g+=`<ellipse cx="${f(o.angin*1000*t**1.5+r(-40,40)*t)}" cy="${f(-1000*t)}" rx="${f(rad*r(.95,1.3))}" ry="${f(rad*r(.7,.95))}" fill="url(#${id}-r)" opacity="${(.4*(1-t)**1.4+.04).toFixed(2)}"/>`;}
  return`<g id="${id}" class="wv-pustaka" data-pustaka="asap" transform="translate(${f(o.x)},${f(o.y)}) scale(${+(o.tinggi/1000).toFixed(4)})"><defs><radialGradient id="${id}-r" fx="${(.5+.3*L.x).toFixed(2)}" fy="${(.5+.3*L.y).toFixed(2)}">`+
    stop(0,campur(c,L.w,.3),.45)+stop(.6,c,.18)+stop(1,c,0)+`</radialGradient></defs>${g}</g>`;}
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

return{candi,gapura,rumahPanggung,beringin,lontar,gunungBerlapis,sawahTerasering,obor,api,asap,asapHidup,relief,kain};})();
