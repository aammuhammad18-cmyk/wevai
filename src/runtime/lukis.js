/* LUKIS (gaya painterly, rencana 1.4.0 §J) — kontrak, kenop, cara tidak "mendidih", biaya, batas: references/lukis.md. Satu global `lukis`.
   Bidang statis dilukis SEKALI saat setup: markup SVG → raster → sapuan Kuwahara anisotropik (Kyprianidis dkk. 2009, bobot polinomial
   2010) + cat air (Bousseau dkk. 2006: tepi gelap, granulasi, aliran, rembesan basah, kertas) di WebGL2 → <canvas class="wv-lukis"> di
   bidang [data-z]. Kamera 2.5D menggeser kanvas itu: sapuan menempel pada lukisan, nol kerja per frame. Semua derau = fungsi koordinat
   OBJEK (px bidang) + seed, tidak pernah layar atau frame. Yang hidup = sprite: tiap pose dilukis sekali, digerakkan transform/siklus().
   Butuh blok atmosfer (rantaiUpdate). Tanpa WebGL2 + EXT_color_buffer_float: raster mentah + console.warn. Diuji: scripts/test-lukis.mjs. */
const lukis=(()=>{
const{max,min,ceil,floor,PI}=Math,
  salah=(n,m)=>{throw new Error('lukis.'+n+': '+m);},
  /* kenop (references/lukis.md): bawaan = bidang tengah, cat air */
  OPS={kuas:6,panjang:.6,arah:0,liuk:.3,tajam:8,variasi:.14,sapuan:.25,tepi:.6,butir:.5,aliran:.3,basah:.3,goyang:1.5,kertas:.5,palet:'senja',nada:.25,seed:null,pad:160,res:1,kotak:null},
  RENTANG={kuas:[0,16],panjang:[0,1],arah:[-360,360],liuk:[0,1],tajam:[1,16],variasi:[0,1],sapuan:[0,1],tepi:[0,2],butir:[0,2],aliran:[0,1],basah:[0,1],goyang:[0,8],kertas:[0,1],nada:[0,1],pad:[0,800],res:[.25,2]},
  /* palet nada [gelap, tengah, terang]: peta luminans → warna, dicampur sebesar `nada` (menyerasikan warna aset ke satu lukisan) */
  PALET={senja:['#2a2036','#9c6b70','#f7dcb0'],kenang:['#2b2017','#8a6849','#f1dfbf'],fajar:['#1f2a3a','#6f8494','#eef0e6']},
  rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255);
function opsi(n,o){
  if(!o||typeof o!=='object'||Array.isArray(o))salah(n,'opsi harus objek {…}');
  for(const k in o)if(!(k in OPS))salah(n,`opsi tidak dikenal: ${k} (${Object.keys(OPS).join(' ')})`);
  const r={...OPS,...o};
  for(const k in RENTANG){const v=r[k],[a,b]=RENTANG[k];if(typeof v!=='number'||!(v>=a&&v<=b))salah(n,`${k} harus angka ${a}..${b} (dapat ${v})`);}
  if(r.seed!=null&&!Number.isInteger(r.seed))salah(n,`seed harus bilangan bulat (dapat ${r.seed})`);
  if(typeof r.palet==='string'){if(!PALET[r.palet])salah(n,`palet tidak dikenal: ${r.palet} (${Object.keys(PALET).join(' ')})`);}
  else if(!(Array.isArray(r.palet)&&r.palet.length===3&&r.palet.every(c=>/^#[0-9a-f]{6}$/i.test(c))))salah(n,'palet = nama atau [gelap, tengah, terang] #rrggbb');
  if(r.kotak!=null&&!(Array.isArray(r.kotak)&&r.kotak.length===4&&r.kotak.every(Number.isFinite)&&r.kotak[2]>0&&r.kotak[3]>0))salah(n,'kotak = [x, y, lebar, tinggi] px bidang (lebar, tinggi > 0)');
  return r;}
/* markup px bidang → dokumen SVG mandiri seukuran kanvas (viewBox = kotak) */
const dokumen=(m,[x,y,w,h],cw,ch)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none">${m}</svg>`;

/* ---------- shader: satu kepala bersama + satu fragment per pass. Tekstur baris 0 = atas raster (tanpa flip), jadi
   gl_FragCoord = px tekstur dengan y ke bawah; obj() = px bidang. Hash bilangan bulat (pcg3d, Jarzynski & Olano 2020): tepat sama
   di GPU mana pun, tidak seperti hash sin(). ---------- */
const VS='#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0,1);}',
KEPALA=`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;uniform sampler2D T0,T1,T2;uniform vec2 K;uniform vec4 O,A,B,C;uniform vec3 N0,N1,N2;out vec4 o;
uint hu(uvec3 v){v=v*1664525u+1013904223u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;v^=v>>16u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;return v.x;}
float h(vec2 p,float s){return float(hu(uvec3(ivec3(ivec2(floor(p))+32768,int(s))))>>8)/16777216.;}
float vn(vec2 p,float s){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i,s),h(i+vec2(1,0),s),f.x),mix(h(i+vec2(0,1),s),h(i+1.,s),f.x),f.y);}
float fb(vec2 p,float s){return .5333*vn(p,s)+.2667*vn(p*2.03+17.,s+1.)+.1333*vn(p*4.01+31.,s+2.)+.0667*vn(p*8.07+53.,s+3.);}
vec2 obj(vec2 f){return O.xy+f*O.z;}
ivec2 P(){return ivec2(gl_FragCoord.xy);}
vec4 tx(sampler2D t,ivec2 p){return texelFetch(t,clamp(p,ivec2(0),ivec2(K)-1),0);}
`,
FS={
/* tensor struktur (Sobel rgba premultiplied: tepi alfa = siluet ikut) */
TEN:`void main(){ivec2 p=P();vec4 a=tx(T0,p+ivec2(-1,-1)),b=tx(T0,p+ivec2(0,-1)),c=tx(T0,p+ivec2(1,-1)),d=tx(T0,p+ivec2(-1,0)),e=tx(T0,p+ivec2(1,0)),f=tx(T0,p+ivec2(-1,1)),g=tx(T0,p+ivec2(0,1)),i=tx(T0,p+ivec2(1,1));
vec4 x=(c+2.*e+i-a-2.*d-f)*.25,y=(f+2.*g+i-a-2.*b-c)*.25;o=vec4(dot(x,x),dot(y,y),dot(x,y),1);}`,
/* Gauss terpisah: A.xy arah, A.z sigma (px tekstur) */
KABUR:`void main(){ivec2 p=P(),d=ivec2(A.xy);int r=int(ceil(2.5*A.z));vec4 a=vec4(0);float w=0.;
for(int i=-r;i<=r;i++){float k=exp(-.5*float(i*i)/(A.z*A.z));a+=k*tx(T0,p+d*i);w+=k;}o=a/w;}`,
/* arah sapuan: tensor + bias aliran (A.x sudut dasar, A.y liuk, A.z bias, A.w isotropik) → garis singgung + anisotropi */
ARAH:`void main(){vec3 g=tx(T0,P()).xyz;float t=A.x+A.y*(fb(obj(gl_FragCoord.xy)/420.,O.w+7.)-.5)*3.1416;vec2 n=vec2(-sin(t),cos(t));
g+=A.z*(vec3(n.x*n.x,n.y*n.y,n.x*n.y)+A.w*vec3(1,1,0));float D=sqrt((g.x-g.y)*(g.x-g.y)+4.*g.z*g.z),l1=.5*(g.x+g.y+D),l2=.5*(g.x+g.y-D);
vec2 v=vec2(l1-g.x,-g.z);v=length(v)>0.?normalize(v):vec2(0,1);o=vec4(v*.5+.5,l1+l2>0.?(l1-l2)/(l1+l2):0.,1);}`,
/* LIC: derau dirata-rata sepanjang garis alir → r = guratan selebar sapuan (A.x langkah, A.y skala derau), g = bulu kuas (A.z langkah) */
LIC:`vec2 ta(vec2 y){return tx(T0,ivec2(y)).xy*2.-1.;}
void main(){vec2 x=gl_FragCoord.xy;float sc=0.,wc=0.,sf=0.,wf=0.;
for(int s=-1;s<=1;s+=2){vec2 y=x,tp=ta(x)*float(s);for(int i=0;i<64;i++){if(float(i)>=A.x)break;vec2 t=ta(y);if(dot(t,tp)<0.)t=-t;tp=t;
vec2 q=obj(y);float k=1.-float(i)/A.x;sc+=k*vn(q/A.y,O.w+11.);wc+=k;if(float(i)<A.z){sf+=k*h(q,O.w+13.);wf+=k;}y+=t;}}
o=vec4(clamp(.5+(sc/wc-.5)*3.,0.,1.),clamp(.5+(sf/wf-.5)*3.5,0.,1.),0,1);}`,
/* pigmen: kepekatan bervariasi sepanjang guratan (model warna Bousseau) + hangat/dingin; A.x variasi */
PIG:`void main(){ivec2 p=P();vec4 c=tx(T0,p);if(c.a<.002){o=vec4(0);return;}vec2 q=obj(gl_FragCoord.xy);vec3 r=c.rgb/c.a;
float d=1.+A.x*3.*((tx(T1,p).x-.5)*1.4+(fb(q/55.,O.w+17.)-.5)*1.6);r=r-(r-r*r)*(d-1.);
float w=(fb(q/160.,O.w+19.)-.5)*A.x*8.;r*=1.+vec3(w,w*.2,-w)*.6;o=vec4(clamp(r,0.,1.)*c.a,c.a);}`,
/* Kuwahara anisotropik, 8 sektor, bobot polinomial (Kyprianidis 2010): A.x jari-jari, A.y q (tajam), A.z alfa, A.w kekerasan */
KUWA:`void acc(inout vec4 m,inout vec4 s,inout float W,float w,vec4 c){m+=w*c;s+=w*c*c;W+=w;}
void fin(vec4 m,vec4 s,float W,inout vec4 r,inout float rw){if(W<=0.)return;m/=W;vec4 v=abs(s/W-m*m);float k=1./(1.+pow(A.w*(v.r+v.g+v.b+v.a),.5*A.y));r+=k*m;rw+=k;}
void main(){ivec2 p=P();vec4 f=tx(T1,p);vec2 t=normalize(f.xy*2.-1.+vec2(1e-5,0));float r=A.x,a=r*clamp((A.z+f.z)/A.z,.1,2.),b=r*clamp(A.z/(A.z+f.z),.1,2.);
mat2 SR=mat2(.5/a,0,0,.5/b)*mat2(t.x,-t.y,t.y,t.x);int mx=int(sqrt(a*a*t.x*t.x+b*b*t.y*t.y)),my=int(sqrt(a*a*t.y*t.y+b*b*t.x*t.x));
float ze=2./r,et=(ze+.8365)/.3006,W0=0.,W1=0.,W2=0.,W3=0.,W4=0.,W5=0.,W6=0.,W7=0.;vec4 m0=vec4(0),m1=m0,m2=m0,m3=m0,m4=m0,m5=m0,m6=m0,m7=m0,s0=m0,s1=m0,s2=m0,s3=m0,s4=m0,s5=m0,s6=m0,s7=m0;
for(int j=-my;j<=my;j++)for(int i=-mx;i<=mx;i++){vec2 v=SR*vec2(i,j);float dd=dot(v,v);if(dd>.25)continue;vec4 c=tx(T0,p+ivec2(i,j));
float vx=ze-et*v.x*v.x,vy=ze-et*v.y*v.y;vec2 u=.70710678*vec2(v.x-v.y,v.x+v.y);float ux=ze-et*u.x*u.x,uy=ze-et*u.y*u.y;
float z0=max(0.,v.y+vx),z1=max(0.,u.y+ux),z2=max(0.,-v.x+vy),z3=max(0.,-u.x+uy),z4=max(0.,-v.y+vx),z5=max(0.,-u.y+ux),z6=max(0.,v.x+vy),z7=max(0.,u.x+uy);
z0*=z0;z1*=z1;z2*=z2;z3*=z3;z4*=z4;z5*=z5;z6*=z6;z7*=z7;float g=exp(-3.125*dd)/max(z0+z1+z2+z3+z4+z5+z6+z7,1e-8);
acc(m0,s0,W0,z0*g,c);acc(m1,s1,W1,z1*g,c);acc(m2,s2,W2,z2*g,c);acc(m3,s3,W3,z3*g,c);acc(m4,s4,W4,z4*g,c);acc(m5,s5,W5,z5*g,c);acc(m6,s6,W6,z6*g,c);acc(m7,s7,W7,z7*g,c);}
vec4 q=vec4(0);float qw=0.;fin(m0,s0,W0,q,qw);fin(m1,s1,W1,q,qw);fin(m2,s2,W2,q,qw);fin(m3,s3,W3,q,qw);fin(m4,s4,W4,q,qw);fin(m5,s5,W5,q,qw);fin(m6,s6,W6,q,qw);fin(m7,s7,W7,q,qw);
o=qw>0.?q/qw:tx(T0,p);}`,
/* cat air (Bousseau): T0 sapuan, T1 sapuan kabur, T2 LIC. A = tepi, butir, aliran, basah · B = goyang (px bidang), kertas, sapuan ·
   C.x nada · N0..N2 palet. Kepekatan d > 1 menggelapkan tanpa mengotori: c − (c − c²)(d − 1) */
AIR:`float kertas(vec2 q){float s=O.w+23.;return clamp(.5*fb(q/2.6,s)+.14*vn(vec2(q.x*.7+q.y*.25,q.y*.06-q.x*.02)/1.1,s+5.)+.12*vn(vec2(q.x*.12-q.y*.5,q.x*.3+q.y*.08)/1.3,s+9.)+.28*fb(q/46.,s+13.)-.02,0.,1.);}
void main(){vec2 f=gl_FragCoord.xy,q=obj(f),w=vec2(fb(q/22.,O.w+29.),fb(q/22.,O.w+31.))-.5,fw=(f+w*2.*B.x/O.z)/K;
vec4 c=texture(T0,fw),cb=texture(T1,fw);vec2 l=tx(T2,P()).xy;float wet=A.w*smoothstep(.42,.72,fb(q/190.,O.w+37.));
c=mix(c,cb,wet*clamp(1.-abs(2.*cb.a-1.),0.,1.)*.85);float a=c.a;if(a<.003){o=vec4(0);return;}
vec3 r=c.rgb/a,rb=cb.rgb/max(cb.a,.003);float lr=dot(r,vec3(.3,.59,.11)),lb=dot(rb,vec3(.3,.59,.11)),pk=kertas(q);
float ev=vn(q/26.,O.w+43.),e=(a*(1.-cb.a)*2.6+abs(lr-lb)*4.)*(.1+1.4*ev*ev),z=(cb.a-.3)/.09,
bl=fb(q/170.,O.w+47.)+.035*vn(q/5.,O.w+53.),zb=(bl-.6)/.014,d=1.+A.x*e+wet*exp(-z*z)*1.5+A.w*(exp(-zb*zb)*.9-.35*smoothstep(.6,.66,bl));
d*=1.+A.y*((.5-pk)*.9+(vn(q/3.2,O.w+59.)-.5)*.6)*(1.-.6*lr);d*=1.+A.z*(fb(q/230.,O.w+41.)-.5)*1.6;d*=1.+B.z*(l.y-.5)*.8;
r=clamp(r-(r-r*r)*(d-1.),0.,1.);r*=1.+B.y*((pk-.5)*.12+(pk-kertas(q+1.3))*.9)*(.4+.6*lr);lr=dot(r,vec3(.3,.59,.11));
r=mix(r,lr<.5?mix(N0,N1,lr*2.):mix(N1,N2,lr*2.-1.),C.x);o=vec4(clamp(r,0.,1.)*a,a);}`,
/* salin; A.x = 1 membalik baris (tekstur → kanvas) */
SALIN:`void main(){ivec2 p=P();if(A.x>0.)p.y=int(K.y)-1-p.y;o=tx(T0,p);}`};

/* ---------- GL bersama: dibuat saat bidang pertama, dilepas di siap() ---------- */
let G=null,nSeed=0,warned=false,rantai=Promise.resolve(),gagal=null;
const STRIP=96;   // pass berat dipecah per 96 baris + finish(): tak ada satu kerja GPU yang mendekati batas TDR Windows (2 dtk)
function gl0(){if(G)return G;
  const cv=document.createElement('canvas'),gl=cv.getContext('webgl2',{premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false});
  if(!gl||!gl.getExtension('EXT_color_buffer_float'))return G={gl:null};
  const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x;},vs=sh(gl.VERTEX_SHADER,VS),P={};
  for(const k in FS){const p=gl.createProgram(),fs=sh(gl.FRAGMENT_SHADER,KEPALA+FS[k]);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('lukis: shader '+k+' gagal — '+gl.getShaderInfoLog(fs)+gl.getProgramInfoLog(p));
    P[k]={p,u:Object.fromEntries('T0 T1 T2 K O A B C N0 N1 N2'.split(' ').map(n=>[n,gl.getUniformLocation(p,n)]))};}
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  return G={gl,cv,P};}
function lepasGL(){if(G&&G.gl){const e=G.gl.getExtension('WEBGL_lose_context');if(e)e.loseContext();}G=null;}

/* satu kanvas: raster SVG (Blob URL: tanpa batas 2 MB data:) → pass GPU → kanvas 2D yang sama */
async function lukisKanvas(cv,markup,kt,q,seed){
  const url=URL.createObjectURL(new Blob([dokumen(markup,kt,cv.width,cv.height)],{type:'image/svg+xml'})),img=new Image();
  try{img.src=url;await img.decode();}catch(e){throw new Error('lukis: markup SVG tidak bisa dirender (rusak? referensi luar?) — '+e.message);}finally{URL.revokeObjectURL(url);}
  const x2=cv.getContext('2d'),w=cv.width,h=cv.height;x2.drawImage(img,0,0,w,h);
  const g=gl0();
  if(!g.gl){if(!warned){warned=true;console.warn('lukis: WebGL2 + EXT_color_buffer_float tidak tersedia — bidang tampil tanpa sapuan (raster SVG mentah)');}return;}
  const{gl,P}=g,res=q.res,rk=q.kuas*res,T=[];g.cv.width=w;g.cv.height=h;
  const tek=(f16,src)=>{const t=gl.createTexture(),f=src?null:gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,t);
      for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
      if(src){gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);}
      else{gl.texStorage2D(gl.TEXTURE_2D,1,f16?gl.RGBA16F:gl.RGBA8,w,h);gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);}
      const r={t,f};T.push(r);return r;},
    jalan=(n,out,ins,u={},strip=0)=>{const p=P[n];gl.useProgram(p.p);
      ins.forEach((t,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t.t);gl.uniform1i(p.u['T'+i],i);});
      gl.uniform2f(p.u.K,w,h);gl.uniform4f(p.u.O,kt[0],kt[1],1/res,seed);
      for(const k of'ABC')if(u[k])gl.uniform4fv(p.u[k],u[k]);if(u.N)u.N.forEach((c,i)=>gl.uniform3fv(p.u['N'+i],c));
      gl.bindFramebuffer(gl.FRAMEBUFFER,out?out.f:null);gl.viewport(0,0,w,h);
      if(!strip){gl.drawArrays(gl.TRIANGLES,0,3);gl.flush();return;}
      gl.enable(gl.SCISSOR_TEST);for(let y=0;y<h;y+=strip){gl.scissor(0,y,w,min(strip,h-y));gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();}gl.disable(gl.SCISSOR_TEST);};
  try{
    const R=tek(0,cv),A1=tek(1),A2=tek(1),AR=tek(0),LI=tek(0),KU=tek(1),sk=max(1.5,q.kuas*.6),iso=(1/max(.05,q.panjang)-1)/2;
    jalan('TEN',A1,[R]);jalan('KABUR',A2,[A1],{A:[1,0,3*res,0]});jalan('KABUR',A1,[A2],{A:[0,1,3*res,0]});
    jalan('ARAH',AR,[A1],{A:[q.arah*PI/180,q.liuk,2e-3,iso]});
    jalan('LIC',LI,[AR],{A:[max(2,ceil(max(1,rk)*(1+2*q.panjang))),sk,max(2,ceil(max(1,rk))),0]},STRIP);
    jalan('PIG',A2,[R,LI],{A:[q.variasi,0,0,0]});
    if(rk>=1)jalan('KUWA',KU,[A2,AR],{A:[rk,q.tajam,1,1500]},STRIP);else jalan('SALIN',KU,[A2],{A:[0,0,0,0]});
    jalan('KABUR',A1,[KU],{A:[1,0,4*res,0]});jalan('KABUR',A2,[A1],{A:[0,1,4*res,0]});
    jalan('AIR',A1,[KU,A2,LI],{A:[q.tepi,q.butir,q.aliran,q.basah],B:[q.goyang,q.kertas,q.sapuan,0],C:[q.nada,0,0,0],N:(typeof q.palet==='string'?PALET[q.palet]:q.palet).map(rgb)},STRIP);
    jalan('SALIN',null,[A1],{A:[1,0,0,0]});
    if(gl.isContextLost())throw new Error('lukis: konteks WebGL hilang saat melukis (GPU direset?) — muat ulang halaman');
    x2.clearRect(0,0,w,h);x2.drawImage(g.cv,0,0);
  }finally{for(const{t,f}of T){gl.deleteTexture(t);if(f)gl.deleteFramebuffer(f);}}}

/* antrean: satu GPU, satu kerja pada satu waktu. Galat pertama disimpan dan dilempar siap() */
const antre=(cv,markup,kt,q,seed)=>{rantai=rantai.then(()=>gagal?0:lukisKanvas(cv,markup,kt,q,seed)).catch(e=>{gagal=gagal||e;});};
const kanvas=(n,markup,kt,q,kelas)=>{if(typeof markup!=='string')salah(n,'markup harus string SVG');
  const c=document.createElement('canvas');c.width=ceil(kt[2]*q.res);c.height=ceil(kt[3]*q.res);if(kelas)c.className=kelas;
  antre(c,markup,kt,q,q.seed??++nSeed*7919);return c;};
const posisi=(e,[x,y,w,h])=>{e.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;pointer-events:none`;return e;};

/* bidang(el, markup, opsi) → <canvas class="wv-lukis"> di el (bidang [data-z]); kotak bawaan = frame + pad (data-penuh: wajib
   menutup frame sepanjang gerak kamera) */
function bidang(el,markup,o={}){const q=opsi('bidang',o);
  if(!(el instanceof HTMLElement))salah('bidang','el wajib elemen HTML (<div data-z>), bukan <g> SVG');
  const kt=q.kotak||[-q.pad,-q.pad,W+2*q.pad,H+2*q.pad],c=posisi(kanvas('bidang',markup,kt,q,'wv-lukis'),kt);
  if(!q.kotak)c.dataset.penuh='';el.appendChild(c);return c;}
/* sprite(el, markup | [pose…], {kotak, …}) → <div class="wv-lukis-sprite"> berisi satu kanvas per pose (pose 0 tampil). Seed sama
   untuk semua pose: sapuan di bagian yang sama tidak berganti saat pose berganti. Gerakkan div-nya (GSAP x/y/rotation/opacity). */
function sprite(el,markup,o={}){const q=opsi('sprite',o),M=[].concat(markup);
  if(!(el instanceof HTMLElement))salah('sprite','el wajib elemen HTML (bidang [data-z] atau anaknya)');
  if(!q.kotak)salah('sprite','kotak [x, y, lebar, tinggi] wajib (px bidang yang memuat markup)');
  if(!M.length)salah('sprite','markup kosong');
  const d=posisi(document.createElement('div'),q.kotak),s=q.seed??++nSeed*7919;d.className='wv-lukis-sprite';
  M.forEach((m,i)=>{const c=kanvas('sprite',m,q.kotak,{...q,seed:s});c.style.cssText=`position:absolute;left:0;top:0;width:100%;height:100%${i?';visibility:hidden':''}`;d.appendChild(c);});
  el.appendChild(d);return d;}
/* pose aktif = floor(t·fps + fase) mod n: fungsi murni tl.time() (animasi "on twos" ala gambar tangan, bukan derau per frame) */
const pose=(t,fps,n,fase=0)=>((floor(t*fps+fase)%n)+n)%n;
function siklus(sp,fps,{fase=0}={}){const k=[...sp.children];if(!(fps>0)||!k.length)salah('siklus','fps > 0 dan sprite berpose wajib');
  const f=()=>{if(!sp.isConnected)return;const i=pose(tl.time(),fps,k.length,fase);k.forEach((c,j)=>c.style.visibility=j===i?'':'hidden');};f();rantaiUpdate(f);return sp;}
/* siap() → Promise: semua kanvas yang diantre sudah dilukis (lalu konteks GL dilepas). Galat GL/raster = reject */
const siap=()=>rantai.then(()=>{lepasGL();if(gagal)throw gagal;});

/* kait untuk scripts/test-starters.mjs — tidak dipanggil deliverable. Fixture sendiri di luar rig, dibersihkan: lukis ulang = byte sama;
   markup sama di kotak tergeser (24, 16) = piksel sama di ruang objek (sapuan menempel pada objek, bukan pada kanvas/layar); seed
   lain = sapuan lain; tanpa WebGL2 = raster mentah (beda dari hasil lukis); opsi salah ditolak. */
window.LUKIS_UJI=async()=>{const r={},d=document.createElement('div'),Z=288,
    m='<rect x="30" y="40" width="160" height="96" fill="#c87a50"/><circle cx="170" cy="160" r="70" fill="#3b4f7a"/><path d="M0,220 L288,180 L288,288 L0,288Z" fill="#6a8a4a"/>',
    px=c=>c.getContext('2d').getImageData(0,0,Z,Z).data,L=(k,x,y)=>bidang(d,m,{kotak:[x,y,Z,Z],seed:k});
  document.body.appendChild(d);
  try{const a=L(5,0,0),b=L(5,24,16),c=L(5,0,0),e=L(6,0,0);await siap();const A=px(a),B=px(b),C=px(c),E=px(e);
    r.ulangSama=A.every((v,i)=>v===C[i]);r.seedBeda=A.some((v,i)=>v!==E[i]);r.kosong=!A.some(v=>v);
    let n=0,beda=0;for(let y=72;y<Z-56;y++)for(let x=80;x<Z-56;x++)for(let k=0;k<4;k++){n++;if(Math.abs(A[(y*Z+x)*4+k]-B[((y-16)*Z+x-24)*4+k])>1)beda++;}
    r.geserSama=beda/n<.001;r.geserBeda=beda;
    const gc=HTMLCanvasElement.prototype.getContext;lepasGL();
    HTMLCanvasElement.prototype.getContext=function(t,...a){return t==='webgl2'?null:gc.call(this,t,...a);};
    let f;try{f=L(5,0,0);await siap();}finally{HTMLCanvasElement.prototype.getContext=gc;G=null;}
    const F=px(f);r.mentah=F.some(v=>v)&&F.some((v,i)=>v!==A[i]);
    try{bidang(d,m,{kuas:-1});r.opsiDitolak=false;}catch(x){r.opsiDitolak=/kuas harus angka/.test(x.message);}
  }finally{d.remove();}
  return r;};
return{bidang,sprite,siklus,siap,pose,dokumen,opsi,PALET};})();
