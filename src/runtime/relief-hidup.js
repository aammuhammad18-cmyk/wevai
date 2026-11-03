/* RELIEF HIDUP (sub-proyek 7, gaya "relief candi hidup") — dinding batu berpahat di bawah cahaya yang BERGERAK; kontrak dan
   resep: references/relief-candi.md. Filter SVG yang dipanggang tidak bisa bergerak (techniques.md §7d), jadi yang dipanggang
   adalah PETA, bukan cahaya. Saat setup, lapisan pahatan (pustaka.dindingRelief: jalur + tinggi + jari-jari bulat) dirasterisasi
   Path2D → jarak ke tepi → profil membulat; + erosi, pori, butir batu → normal + rongga (AO) + tinggi dalam satu tekstur RGBA8;
   albedo andesit dipanggang sekali di GPU. Tiap frame WebGL2 dua pass: (1) komposit = salin peta statis + bagian yang hidup
   (sprite peta tinggi dengan transform fungsi murni tl.time(): lengan pendayung, layar, ombak, ikan, untaian, payung);
   (2) cahaya = lampu titik SINAR (Lambert, redaman, bayangan pahatan 24 langkah di peta tinggi) + ambien langit × AO.
   Keadaan = tl.time() + SINAR (di-tween GSAP seperti CAM/LANGIT) → putar = scrub = ekspor; kanvas digambar ulang penuh.
   Terukur (HD 4000, saat render pemilik berjalan, prioritas Idle): 2 pass + 24 langkah ±16 ms/frame (3400×900), 29,8 (4300×1000);
   Canvas 2D per piksel di CPU 737 ms/frame (tanpa bayangan); filter SVG dinamis 358 ms/frame (riset, tanpa bayangan jatuh).
   Butuh dari atmosfer: rantaiUpdate, vnoise, mulberry32, acak, warnaRGB (hook uji: rigDunia). */

/* SINAR — lampu relief, satu per halaman (semua dinding), di-tween GSAP: tl.to(SINAR,{x:300,duration:16,ease:'none'},0).
   x, y = px bidang dinding; z = jarak lampu dari muka dinding ke arah kamera (px): kecil = menyerempet, bayangan panjang.
   kuat (boleh > 1), jangkau = jarak (px) tempat kuat tinggal separuh, kedip 0..1 (noise ber-seed dari tl.time()),
   ambien = warna langit di sisi teduh (× ambienKuat, × AO). Nilai MUTLAK di tween (relatif '+=' bergantung jalur seek). */
const SINAR={x:960,y:540,z:230,warna:'#ffb067',kuat:2.6,jangkau:650,kedip:.1,seed:3,ambien:'#8296c8',ambienKuat:.5};
const reliefHidup=(()=>{
const{min,max,sqrt,sin,cos,PI,floor,ceil,round}=Math,sat=v=>v<0?0:v>1?1:v;
/* seperempat lingkaran: 0 di tepi (u = 0) → 1 di u ≥ 1; tegak di tepi, datar di puncak */
const profil=u=>{const v=1-sat(u);return sqrt(1-v*v);};
/* kabur kotak terpisah (jumlah berjalan, tepi diulang); r = jari-jari px. Lintasan kolom berjalan per BARIS dengan jumlah tiap kolom
   (Float64) supaya akses memori berurutan: dinding 4300 px, akses berlangkah lebar = cache meleset tiap piksel. */
function kabur(a,w,h,r){const n=1/(2*r+1),b=new Float32Array(w*h),c=new Float32Array(w*h),S=new Float64Array(w),W1=w-1,H1=h-1;
  for(let y=0;y<h;y++){const o=y*w;let s=a[o]*(r+1);for(let x=1;x<=r;x++)s+=a[o+(x<W1?x:W1)];
    for(let x=0;x<w;x++){b[o+x]=s*n;const xb=x+r+1,xa=x-r;s+=a[o+(xb<W1?xb:W1)]-a[o+(xa>0?xa:0)];}}
  for(let x=0;x<w;x++){let s=b[x]*(r+1);for(let y=1;y<=r;y++)s+=b[(y<H1?y:H1)*w+x];S[x]=s;}
  for(let y=0;y<h;y++){const o=y*w,yb=(y+r+1<H1?y+r+1:H1)*w,ya=(y-r>0?y-r:0)*w;for(let x=0;x<w;x++){c[o+x]=S[x]*n;S[x]+=b[yb+x]-b[ya+x];}}
  return c;}
/* jarak (px) tiap piksel dalam (cakupan ≥ ,5) ke piksel luar terdekat: chamfer 1/√2 dua lintasan; luar = 0, tanpa luar = 1e6 */
function jarak(c,w,h,d=new Float32Array(w*h)){const S=Math.SQRT2;for(let i=0;i<w*h;i++)d[i]=c[i]<.5?0:1e6;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!d[i])continue;let v=d[i];
    if(x)v=min(v,d[i-1]+1);if(y){v=min(v,d[i-w]+1);if(x)v=min(v,d[i-w-1]+S);if(x<w-1)v=min(v,d[i-w+1]+S);}d[i]=v;}
  for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(!d[i])continue;let v=d[i];
    if(x<w-1)v=min(v,d[i+1]+1);if(y<h-1){v=min(v,d[i+w]+1);if(x<w-1)v=min(v,d[i+w+1]+S);if(x)v=min(v,d[i+w-1]+S);}d[i]=v;}
  return d;}
/* terapkan satu lapis ke peta tinggi t (lebar w) dari cakupan c + jarak-ke-tepi de (px, sub-piksel) di kotak (x0, y0, bw, bh):
   timbul: maks(t, z − (r/D)(1 − profil(de/r)))   rata: t → z, tepi cembung selebar r   gurat: t − z·profil(de/r).
   Tepi antialias dicampur dengan cakupan. cv = cakupan batu (timbul/rata menambah). */
function terap(t,cv,w,it,D,c,de,x0,y0,bw,bh){const r=+it.r||0,j=it.jenis,z=+it.z,tr=r/D;
  for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){const i=y*bw+x,q=c[i];if(!q)continue;
    const k=(y0+y)*w+x0+x,u=r?de[i]/r:1,h0=t[k];let v;
    if(j==='timbul'){v=z-tr*(1-profil(u));if(v>h0)t[k]=h0+(v-h0)*q;}
    else if(j==='rata')t[k]=h0+(z-h0)*(1-profil(1-u))*q;
    else t[k]=h0-z*profil(u)*q;
    if(cv&&j!=='gurat'&&q>cv[k])cv[k]=q;}}
/* penyangga kerja dipakai ulang antarlapis (setup ±800 lapis: alokasi per lapis = beban GC) */
let BC=new Float32Array(1<<16),BD=new Float32Array(1<<16);
const siapBuf=n=>{if(BC.length<n){let m=BC.length;while(m<n)m*=2;BC=new Float32Array(m);BD=new Float32Array(m);}return[BC.subarray(0,n),BD.subarray(0,n)];};
/* rasterisasi lapis it lalu terap. persegi (kotak = bentuknya): analitik — cakupan = luas irisan piksel, jarak = ke tepi terdekat; selain
   itu Path2D di kanvas lunak kx + jarak chamfer (de = jarak − 1 + cakupan). ox, oy = asal penyangga di ruang dinding */
function lapis(t,cv,w,h,it,D,kx,ox=0,oy=0){const r=+it.r||0,m=ceil(r)+2,k=it.kotak,x0=max(0,floor(k[0]-ox)-m),y0=max(0,floor(k[1]-oy)-m),
    x1=min(w,ceil(k[2]-ox)+m),y1=min(h,ceil(k[3]-oy)+m),bw=x1-x0,bh=y1-y0;if(bw<1||bh<1)return;
  if(it.persegi){const X0=k[0]-ox,Y0=k[1]-oy,X1=k[2]-ox,Y1=k[3]-oy,e=ceil(r)+1,ix0=max(x0,ceil(X0)+e),ix1=min(x1,floor(X1)-e),iy0=max(y0,ceil(Y0)+e),iy1=min(y1,floor(Y1)-e),
      pita=(xa,ya,xb,yb)=>{const sw=xb-xa,sh=yb-ya;if(sw<1||sh<1)return;const[c,de]=siapBuf(sw*sh);   // pita tepi: cakupan + jarak analitik, lalu terap
        for(let y=0;y<sh;y++){const Y=ya+y,cy=max(0,min(Y+1,Y1)-max(Y,Y0)),dy=min(Y+.5-Y0,Y1-Y-.5);
          for(let x=0;x<sw;x++){const X=xa+x,i=y*sw+x;c[i]=cy*max(0,min(X+1,X1)-max(X,X0));de[i]=max(0,min(dy,X+.5-X0,X1-X-.5));}}
        terap(t,cv,w,it,D,c,de,xa,ya,sw,sh);};
    if(ix1>ix0&&iy1>iy0){const j=it.jenis,z=+it.z;   // bagian dalam (> r + 1 px dari tepi): cakupan 1, profil 1 → isi/maks/kurang per baris
      for(let y=iy0;y<iy1;y++){const o=y*w;if(j==='rata')t.fill(z,o+ix0,o+ix1);else if(j==='timbul'){for(let x=o+ix0;x<o+ix1;x++)if(t[x]<z)t[x]=z;}else for(let x=o+ix0;x<o+ix1;x++)t[x]-=z;
        if(cv&&j!=='gurat')cv.fill(1,o+ix0,o+ix1);}
      pita(x0,y0,x1,iy0);pita(x0,iy1,x1,y1);pita(x0,iy0,ix0,iy1);pita(ix1,iy0,x1,iy1);}
    else pita(x0,y0,x1,y1);
    return;}
  const[c,de]=siapBuf(bw*bh);
  {kx.setTransform(1,0,0,1,0,0);kx.clearRect(0,0,bw,bh);kx.setTransform(1,0,0,1,-x0-ox,-y0-oy);kx.fill(new Path2D(it.d));
    const a=kx.getImageData(0,0,bw,bh).data;for(let i=0;i<bw*bh;i++)c[i]=a[i*4+3]/255;
    if(r){jarak(c,bw,bh,de);for(let i=0;i<bw*bh;i++)de[i]=max(0,de[i]-1+c[i]);}}
  terap(t,cv,w,it,D,c,de,x0,y0,bw,bh);}
/* panggang(t, w, h, D) → RGBA8: r,g = normal x,y ((n+1)·127,5; z = √(1−x²−y²)), b = AO (255 terbuka), a = tinggi 0..1. D = kedalaman
   relief px (tinggi 1 = D px): turunan pusat × D. AO = berapa px titik di bawah rata-rata sekitarnya (r 3: celah, r 14: cekungan). */
function panggang(t,w,h,D){const o=new Uint8Array(w*h*4),k1=kabur(t,w,h,3),k2=kabur(t,w,h,14),f1=D/4,f2=D/14;
  for(let y=0;y<h;y++){const ya=(y?y-1:y)*w,yb=(y<h-1?y+1:y)*w,yo=y*w,fy=yb-ya?D*w/(yb-ya):0;
    for(let x=0;x<w;x++){const i=yo+x,xa=x?i-1:i,xb=x<w-1?i+1:i,dx=(t[xb]-t[xa])*(xb-xa>1?D*.5:D),dy=(t[yb+x]-t[ya+x])*fy,m=1/sqrt(dx*dx+dy*dy+1),j=i<<2,ti=t[i];
      let a=(k1[i]-ti)*f1,b=(k2[i]-ti)*f2;a=a<0?0:a>1?1:a;b=b<0?0:b>1?1:b;
      o[j]=(1-dx*m)*127.5+.5;o[j+1]=(1-dy*m)*127.5+.5;o[j+2]=255.5-255*(.45*a+.4*b);o[j+3]=ti<=0?0:ti>=1?255:ti*255+.5;}}
  return o;}
/* redaman lampu: 1 di d = 0, ½ di d = jangkau (sama dengan shader) */
const redam=(d,j)=>1/(1+d*d/(j*j));
/* pose(g, t, ox, oy) → affine [a,b,c,d,e,f] (x = a·u + c·v + e, y = b·u + d·v + f) dari px sprite (u, v; asal di (ox, oy) dinding)
   ke px dinding: p = poros + Rθ·diag(k,1)·(p₀ − poros) + geser. θ = ayun°·sin(2πt/periode + fase), k = 1 + kembang·sin(…),
   geser = [dx, dy]·sin(…), alir = (kecepatan·t) mod periode. Fungsi murni t — tanpa akumulasi. */
function pose(g,t,ox=0,oy=0){const T=2*PI,sn=(p,f)=>sin(T*t/p+(f||0)),th=g.ayun?g.ayun[0]*PI/180*sn(g.ayun[1],g.ayun[2]):0,
    k=g.kembang?1+g.kembang[0]*sn(g.kembang[1],g.kembang[2]):1,gs=g.geser?sn(g.geser[2],g.geser[3]):0,
    dx=(g.geser?g.geser[0]*gs:0)+(g.alir?(g.alir[0]*t)%g.alir[1]:0),dy=g.geser?g.geser[1]*gs:0,
    c=cos(th),s=sin(th),[px,py]=g.poros||[0,0],a=c*k,b=s*k,qx=ox-px,qy=oy-py;
  return[a,b,-s,c,px+a*qx-s*qy+dx,py+b*qx+c*qy+dy];}
/* ubin derau nilai 2D berperiode (T px, sel px) −,5..,5 untuk butir batu */
function butir(T,sel,s){const p=T/sel,o=new Float32Array(T*T),g=(a,b)=>acak(((a%p+p)%p)+((b%p+p)%p)*p,s);
  for(let y=0;y<T;y++)for(let x=0;x<T;x++){const fx=x/sel,fy=y/sel,ix=floor(fx),iy=floor(fy),ux=fx-ix,uy=fy-iy,sx=ux*ux*(3-2*ux),sy=uy*uy*(3-2*uy);
    o[y*T+x]=(g(ix,iy)*(1-sx)+g(ix+1,iy)*sx)*(1-sy)+(g(ix,iy+1)*(1-sx)+g(ix+1,iy+1)*sx)*sy-.5;}return o;}
/* peta tinggi lapis-lapis → erosi (kabur r 1) → pori → butir (dua ubin, periode 128 & 90: tak berulang terlihat) */
function petaTinggi(L,w,h,D,kx,seed,cv,ox=0,oy=0){let t=new Float32Array(w*h);
  for(const it of L){if(!['timbul','rata','gurat'].includes(it.jenis))throw new Error('reliefHidup: jenis lapis tidak dikenal: '+it.jenis+' (timbul rata gurat)');lapis(t,cv,w,h,it,D,kx,ox,oy);}
  t=kabur(t,w,h,1);const R=mulberry32(seed*31+7),A=butir(128,8,seed),B=butir(90,3,seed+5);
  for(let i=0,n=floor(w*h/1400);i<n;i++){const px=R()*w,py=R()*h,q=.8+R()*1.6,dz=(.3+R()*.9)/D;
    for(let y=max(0,floor(py-q));y<min(h,ceil(py+q+1));y++)for(let x=max(0,floor(px-q));x<min(w,ceil(px+q+1));x++){const e=((x-px)**2+(y-py)**2)/(q*q);if(e<1)t[y*w+x]-=dz*(1-e);}}
  const cA=new Int32Array(w),cB=new Int32Array(w);for(let x=0;x<w;x++){cA[x]=(x+ox)&127;cB[x]=(((x+ox)%90)+90)%90;}
  for(let y=0;y<h;y++){const Y=y+oy,rA=(Y&127)*128,rB=(((Y%90)+90)%90)*90,o=y*w;
    for(let x=0;x<w;x++)if(t[o+x]>.01)t[o+x]+=(A[rA+cA[x]]*.8+B[rB+cB[x]]*.3)/D;}
  return t;}

const VS='#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}',
  HASH='float h1(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}\n',
  /* pass 1a: salin peta statis ke komposit */
  FS_SALIN='#version 300 es\nprecision highp float;uniform sampler2D S;uniform vec2 R;out vec4 o;void main(){o=texture(S,gl_FragCoord.xy/R);}',
  /* pass 1b: bagian hidup — quad sprite ber-transform M; menang bila lebih tinggi dari peta statis; normal ikut diputar Q */
  VS_BAGIAN='#version 300 es\nin vec2 a;uniform vec2 R,Z;uniform mat3 M;out vec2 v;void main(){v=a*Z;vec2 p=(M*vec3(v,1.)).xy;gl_Position=vec4(p/R*2.-1.,0.,1.);}',
  FS_BAGIAN=`#version 300 es
precision highp float;uniform sampler2D T,S;uniform vec2 R,Z,Q;uniform vec4 K;in vec2 v;out vec4 o;
void main(){vec2 p=gl_FragCoord.xy;if(p.x<K.x||p.y<K.y||p.x>K.z||p.y>K.w)discard;
 vec4 c=texture(T,v/Z);if(c.a<=texture(S,p/R).a)discard;
 vec2 n=c.rg*2.-1.;o=vec4(vec2(Q.x*n.x-Q.y*n.y,Q.y*n.x+Q.x*n.y)*.5+.5,c.b,c.a);}`,
  /* albedo andesit (sekali): dua kelabu berbelang besar, butir sedang, nada per blok batu, lumut di cekungan, bintik feldspar terang + pori
     gelap, alur bekas air hujan (derau memanjang tegak), kotor di AO. V = cakupan (r) + nada blok (g) */
  FS_ALBEDO=`#version 300 es
precision highp float;uniform sampler2D S,V;uniform vec2 R;uniform vec3 B0,B1,Lm;uniform float Sd;out vec4 o;
${HASH}float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s/.9375;}
void main(){vec2 p=gl_FragCoord.xy,u=p/R,cb=texture(V,u).rg;float ao=texture(S,u).b,m=fbm(p/190.+Sd),f=fbm(p/23.+Sd*3.1),li=fbm(p/64.+Sd*7.7);
 vec3 c=mix(B0,B1,smoothstep(.32,.72,m))*(.84+.32*f)*(.92+.16*cb.g);c=mix(c,Lm,smoothstep(.58,.82,li)*(.25+.75*(1.-ao)));
 c*=1.+.2*step(.976,h1(floor(p/1.5)+Sd))-.32*step(.983,h1(floor(p/1.3)+Sd+9.));c*=1.-.2*smoothstep(.56,.86,fbm(vec2(p.x/9.+Sd,p.y/240.)));
 o=vec4(c*mix(.6,1.04,ao),cb.r);}`,
  /* pass 2: cahaya. Bayangan = 24 langkah ke arah lampu di peta tinggi komposit (bergetar per piksel, penumbra lunak), redaman
     1/(1 + d²/J²), langit = ambien × AO (lebih terang di muka yang menghadap atas), nada 1 − e^(−x), sRGB, alfa = cakupan */
  FS_CAHAYA=`#version 300 es
precision highp float;uniform sampler2D C,A;uniform vec2 R;uniform vec3 L,Lc,Ac;uniform float D,J;out vec4 o;
${HASH}float hh(vec2 p){return texture(C,p/R).a*D;}
void main(){vec2 p=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y),u=p/R;vec4 a=texture(A,u);if(a.a<.004){o=vec4(0);return;}
 vec4 c=texture(C,u);vec3 n=vec3(c.rg*2.-1.,0.);n.z=sqrt(max(0.,1.-dot(n.xy,n.xy)));
 vec3 P=vec3(p,c.a*D),V=L-P;float d=length(V);vec3 l=V/d;float ndl=max(dot(n,l),0.),sh=1.;
 if(ndl>0.){float lh=max(length(l.xy),1e-4),tz=l.z/lh,jl=min(240.,max(D*1.02-P.z,1.)/max(tz,.02)),ds=jl/24.,s=1.5+ds*h1(p);vec2 dr=l.xy/lh;
  for(int i=0;i<24;i++){sh=min(sh,clamp(.5+8.*(P.z+tz*s-hh(p+dr*s))/s,0.,1.));s+=ds;}}
 vec3 sky=Ac*c.b*(.5+.5*clamp(.6*n.z-.8*n.y,0.,1.)),col=pow(a.rgb,vec3(2.2))*(Lc*ndl*sh/(1.+d*d/(J*J))+sky);
 o=vec4(pow(1.-exp(-col*1.25),vec3(1./2.2))*a.a,a.a);}`;
function prog(g,vs,fs){const p=g.createProgram();
  for(const[t,s]of[[g.VERTEX_SHADER,vs],[g.FRAGMENT_SHADER,fs]]){const h=g.createShader(t);g.shaderSource(h,s);g.compileShader(h);g.attachShader(p,h);
    if(!g.getShaderParameter(h,g.COMPILE_STATUS)&&!g.isContextLost())throw new Error('reliefHidup: shader gagal — '+g.getShaderInfoLog(h));}
  g.bindAttribLocation(p,0,'a');g.linkProgram(p);
  if(!g.getProgramParameter(p,g.LINK_STATUS)&&!g.isContextLost())throw new Error('reliefHidup: shader gagal — '+g.getProgramInfoLog(p));const U={};return{p,u:n=>n in U?U[n]:(U[n]=g.getUniformLocation(p,n))};}
const tekstur=(g,w,h,data,k=4)=>{const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);
  for(const[k,v]of[[g.TEXTURE_MIN_FILTER,g.LINEAR],[g.TEXTURE_MAG_FILTER,g.LINEAR],[g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE],[g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE]])g.texParameteri(g.TEXTURE_2D,k,v);
  g.pixelStorei(g.UNPACK_ALIGNMENT,1);g.texImage2D(g.TEXTURE_2D,0,k<4?g.RG8:g.RGBA8,w,h,0,k<4?g.RG:g.RGBA,g.UNSIGNED_BYTE,data);return t;},
  fbo=(g,t)=>{const f=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t,0);return f;},
  vao=(g,d)=>{const v=g.createVertexArray();g.bindVertexArray(v);g.bindBuffer(g.ARRAY_BUFFER,g.createBuffer());g.bufferData(g.ARRAY_BUFFER,new Float32Array(d),g.STATIC_DRAW);
    g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);return v;},
  lin=c=>warnaRGB(c).map(v=>(v/255)**2.2),rgb01=c=>warnaRGB(c).map(v=>v/255);
const OPSI=['x','y','dinding','dalam','batu','lumut','seed'];

/* reliefHidup(bidang, {x, y, dinding, dalam, batu, lumut, seed}) → <canvas class="wv-relief"> di (x, y) bidang (elemen HTML: <div data-z>
   atau anaknya), seukuran dinding (px bidang, 1:1). dinding = pustaka.dindingRelief({…}) atau {lebar, tinggi, lapis[], gerak[], blok[]}.
   dalam = kedalaman relief px (tinggi 1); batu = [kelabu A, kelabu B] andesit; lumut = warna noda lumut. Menggambar tiap perubahan
   tl.time() dari SINAR. Tanpa WebGL2: console.warn + gambar diam sekali (CPU, cahaya SINAR saat setup). */
function pasang(bidang,o={}){
  if(!(bidang instanceof HTMLElement))throw new Error('reliefHidup: bidang wajib elemen HTML (<div data-z> atau anaknya), bukan <g> SVG');
  for(const k in o)if(!OPSI.includes(k))throw new Error('reliefHidup: opsi tidak dikenal: '+k+' ('+OPSI.join(' ')+')');
  const{x=0,y=0,dinding:dd,dalam:D=56,batu=['#6b6870','#8a857e'],lumut='#3e4636',seed=1}=o;
  if(!dd||!(dd.lebar>0)||!(dd.tinggi>0)||!Array.isArray(dd.lapis))throw new Error('reliefHidup: dinding wajib {lebar, tinggi, lapis[]} — pakai pustaka.dindingRelief({…})');
  if(!(D>0))throw new Error('reliefHidup: dalam harus > 0 (px; dapat '+D+')');
  const w=ceil(dd.lebar),h=ceil(dd.tinggi),cv=document.createElement('canvas'),sk=document.createElement('canvas');
  cv.className='wv-relief';cv.width=sk.width=w;cv.height=sk.height=h;cv.style.cssText=`position:absolute;left:${x}px;top:${y}px;pointer-events:none`;
  const kx=sk.getContext('2d',{willReadFrequently:true}),cov=new Float32Array(w*h),S=panggang(petaTinggi(dd.lapis,w,h,D,kx,seed,cov),w,h,D),
    V=new Uint8Array(w*h*2);   // r = cakupan batu, g = nada blok (dinding.blok [x0,y0,x1,y1,nada 0..1]; tanpa blok = 128)
  for(let i=0;i<w*h;i++){V[2*i]=round(cov[i]*255);V[2*i+1]=128;}
  for(const[x0,y0,x1,y1,n]of dd.blok||[]){const v=round(sat(n)*255);for(let yy=max(0,floor(y0));yy<min(h,ceil(y1));yy++)for(let xx=max(0,floor(x0));xx<min(w,ceil(x1));xx++)V[2*(yy*w+xx)+1]=v;}
  /* bagian hidup: sprite sendiri (kotak gabungan lapisnya + tepi), dipanggang dengan erosi/pori/butir yang sama */
  const BG=(dd.gerak||[]).map(g=>{if(!Array.isArray(g.lapis)||!g.lapis.length)throw new Error('reliefHidup: gerak[] wajib {lapis[], poros:[x,y], …}');
    const m=max(...g.lapis.map(it=>+it.r||0))+4,ox=floor(min(...g.lapis.map(it=>it.kotak[0]))-m),oy=floor(min(...g.lapis.map(it=>it.kotak[1]))-m),
      bw=ceil(max(...g.lapis.map(it=>it.kotak[2]))+m)-ox,bh=ceil(max(...g.lapis.map(it=>it.kotak[3]))+m)-oy;
    return{g,ox,oy,w:bw,h:bh,data:panggang(petaTinggi(g.lapis,bw,bh,D,kx,seed,null,ox,oy),bw,bh,D)};});
  sk.width=sk.height=0;bidang.appendChild(cv);
  const g=cv.getContext('webgl2',{premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
  if(!g){console.warn('reliefHidup: WebGL2 tidak tersedia — relief digambar diam sekali (cahaya SINAR saat setup, tanpa bayangan)');
    const x2=cv.getContext('2d'),im=x2.createImageData(w,h),q=im.data,[r0,g0,b0]=warnaRGB(batu[0]),lx=SINAR.x-x,ly=SINAR.y-y,lz=D+SINAR.z;
    for(let i=0,j=0;i<w*h;i++,j+=4){const nx=S[j]/127.5-1,ny=S[j+1]/127.5-1,nz=sqrt(max(0,1-nx*nx-ny*ny)),vx=lx-i%w,vy=ly-floor(i/w),vz=lz-S[j+3]/255*D,dl=sqrt(vx*vx+vy*vy+vz*vz)||1,
      e=max(0,(nx*vx+ny*vy+nz*vz)/dl)*redam(dl,SINAR.jangkau)*SINAR.kuat*.6+.3*S[j+2]/255;q[j]=r0*e;q[j+1]=g0*e;q[j+2]=b0*e;q[j+3]=V[2*i];}
    x2.putImageData(im,0,0);return cv;}
  const mt=g.getParameter(g.MAX_TEXTURE_SIZE);if(w>mt||h>mt)throw new Error(`reliefHidup: dinding ${w}×${h} px melewati batas tekstur GPU ${mt} px — pecah jadi dua dinding`);
  const Pr={salin:prog(g,VS,FS_SALIN),bagian:prog(g,VS_BAGIAN,FS_BAGIAN),albedo:prog(g,VS,FS_ALBEDO),cahaya:prog(g,VS,FS_CAHAYA)},
    vP=vao(g,[-1,-1,3,-1,-1,3]),vQ=vao(g,[0,0,1,0,0,1,1,1]),tS=tekstur(g,w,h,S),tV=tekstur(g,w,h,V,2),tA=tekstur(g,w,h,null),tC=tekstur(g,w,h,null),
    fA=fbo(g,tA),fC=fbo(g,tC),TB=BG.map(b=>tekstur(g,b.w,b.h,b.data)),
    ikat=(p,daftar)=>daftar.forEach(([n,t],i)=>{g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,t);g.uniform1i(p.u(n),i);});
  {const p=Pr.albedo,[b0,b1,lm]=[batu[0],batu[1],lumut].map(rgb01);g.bindFramebuffer(g.FRAMEBUFFER,fA);g.viewport(0,0,w,h);g.useProgram(p.p);g.bindVertexArray(vP);
    ikat(p,[['S',tS],['V',tV]]);g.uniform2f(p.u('R'),w,h);g.uniform3fv(p.u('B0'),b0);g.uniform3fv(p.u('B1'),b1);g.uniform3fv(p.u('Lm'),lm);
    g.uniform1f(p.u('Sd'),seed*13.37%97);g.drawArrays(g.TRIANGLES,0,3);}
  const gambar=()=>{if(!cv.isConnected)return;const t=tl.time();
    g.bindFramebuffer(g.FRAMEBUFFER,fC);g.viewport(0,0,w,h);
    let p=Pr.salin;g.useProgram(p.p);g.bindVertexArray(vP);ikat(p,[['S',tS]]);g.uniform2f(p.u('R'),w,h);g.drawArrays(g.TRIANGLES,0,3);
    if(BG.length){p=Pr.bagian;g.useProgram(p.p);g.bindVertexArray(vQ);g.uniform2f(p.u('R'),w,h);
      BG.forEach((b,i)=>{const m=pose(b.g,t,b.ox,b.oy),k=b.g.klip||[-1e6,-1e6,1e6,1e6];ikat(p,[['T',TB[i]],['S',tS]]);g.uniform2f(p.u('Z'),b.w,b.h);
        g.uniformMatrix3fv(p.u('M'),false,[m[0],m[1],0,m[2],m[3],0,m[4],m[5],1]);g.uniform2f(p.u('Q'),m[3],-m[2]);g.uniform4f(p.u('K'),k[0],k[1],k[2],k[3]);
        g.drawArrays(g.TRIANGLE_STRIP,0,4);});}
    g.bindFramebuffer(g.FRAMEBUFFER,null);p=Pr.cahaya;g.useProgram(p.p);g.bindVertexArray(vP);ikat(p,[['C',tC],['A',tA]]);
    const kk=SINAR.kuat*(1-SINAR.kedip*vnoise(t*7,SINAR.seed)),lc=lin(SINAR.warna),ac=lin(SINAR.ambien);
    g.uniform2f(p.u('R'),w,h);g.uniform1f(p.u('D'),D);g.uniform1f(p.u('J'),SINAR.jangkau);g.uniform3f(p.u('L'),SINAR.x-x,SINAR.y-y,D+SINAR.z);
    g.uniform3f(p.u('Lc'),lc[0]*kk,lc[1]*kk,lc[2]*kk);g.uniform3f(p.u('Ac'),ac[0]*SINAR.ambienKuat,ac[1]*SINAR.ambienKuat,ac[2]*SINAR.ambienKuat);
    g.drawArrays(g.TRIANGLES,0,3);};
  gambar();rantaiUpdate(gambar);return cv;}
pasang.mat={profil,kabur,jarak,terap,lapis,panggang,redam,pose,butir};   // inti murni (diuji tanpa browser: scripts/test-relief.mjs)
return pasang;})();

/* kait untuk scripts/test-starters.mjs — tidak dipanggil deliverable. Fixture sendiri (dinding 320×200: panel dipahat, satu kubah
   timbul, satu batang yang berayun ±30°), SINAR disimpan lalu dipulihkan, kanvas + konteks dilepas. Piksel dibaca lewat kanvas 2D. */
window.RELIEF_UJI=()=>{const r={},O=window.OPENER,simpan={...SINAR},b=document.createElement('div'),
    it=(jenis,d,kotak,z,q)=>({jenis,d,kotak,z,r:q}),
    dd={lebar:320,tinggi:200,lapis:[it('rata','M0,0H320V200H0Z',[0,0,320,200],.8,0),it('rata','M20,20H300V180H20Z',[20,20,300,180],.08,5),
      it('timbul','M150,100A40,40 0 1 0 70,100A40,40 0 1 0 150,100Z',[70,60,150,140],.8,40)],
      gerak:[{lapis:[it('timbul','M226,60H234V140H226Z',[226,60,234,140],.7,4)],poros:[230,100],ayun:[30,2,0]}]};
  b.style.cssText=`position:absolute;left:0;top:0;width:${W}px;height:${H}px`;rigDunia().appendChild(b);
  Object.assign(SINAR,{x:-200,y:100,z:120,kuat:2,jangkau:2000,kedip:0});
  const c=reliefHidup(b,{dinding:dd,seed:3}),kv=document.createElement('canvas');kv.width=320;kv.height=200;
  const kx=kv.getContext('2d',{willReadFrequently:true}),baca=t=>{O.seek(t);kx.clearRect(0,0,320,200);kx.drawImage(c,0,0);return kx.getImageData(0,0,320,200).data;},
    Lu=(d,x,y)=>{const i=(y*320+x)*4;return .3*d[i]+.59*d[i+1]+.11*d[i+2];};
  let d=baca(1);const kiri=[Lu(d,84,100),Lu(d,136,100)];SINAR.x=520;d=baca(1);const kanan=[Lu(d,84,100),Lu(d,136,100)];
  r.sisi=[kiri,kanan].map(v=>v.map(Math.round));r.sisiBenar=kiri[0]>kiri[1]+12&&kanan[1]>kanan[0]+12;
  Object.assign(SINAR,{x:-100,z:24});d=baca(1);r.bayang=[Lu(d,178,100),Lu(d,178,166)].map(Math.round);r.bayangJatuh=r.bayang[0]<r.bayang[1]-8;
  Object.assign(SINAR,{x:160,z:200,kedip:.3});const a=baca(3).join();baca(7);baca(.1);r.seekSama=a===baca(3).join();
  SINAR.kedip=0;const g1=baca(.5),g2=baca(1);let beda=0;for(let y=56;y<144;y++)for(let x=196;x<266;x++)if(Math.abs(Lu(g1,x,y)-Lu(g2,x,y))>8)beda++;r.gerakHidup=beda>40;
  r.alfa=Math.round(baca(1)[3]);   // pojok kiri atas: batu (dinding) = opak
  const tolak=(f,re)=>{try{f();return false;}catch(e){return re.test(e.message);}};
  r.ditolak=tolak(()=>reliefHidup(document.createElementNS('http://www.w3.org/2000/svg','g'),{dinding:dd}),/elemen HTML/)&&
    tolak(()=>reliefHidup(b,{dinding:{lebar:10,tinggi:10}}),/lapis/)&&tolak(()=>reliefHidup(b,{dinding:dd,warna:'#fff'}),/opsi tidak dikenal: warna \(x y dinding/)&&
    tolak(()=>reliefHidup(b,{dinding:{...dd,lapis:[{...dd.lapis[0],jenis:'cekung'}]}}),/jenis lapis tidak dikenal: cekung/);
  const gc=HTMLCanvasElement.prototype.getContext,w0=console.warn;let pesan='';
  HTMLCanvasElement.prototype.getContext=function(t,o){return t==='webgl2'?null:gc.call(this,t,o);};console.warn=m=>{pesan=String(m);};
  try{const f=reliefHidup(b,{dinding:dd});r.fallback=f instanceof HTMLCanvasElement&&/WebGL2 tidak tersedia/.test(pesan)&&f.getContext('2d').getImageData(160,100,1,1).data[3]===255;}
  finally{HTMLCanvasElement.prototype.getContext=gc;console.warn=w0;}
  const gl=c.getContext('webgl2'),lepas=gl&&gl.getExtension('WEBGL_lose_context');if(lepas)lepas.loseContext();
  b.remove();Object.assign(SINAR,simpan);return r;};
