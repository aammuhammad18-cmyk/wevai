/* MATA ELANG — terbang(at,dur,titik,opsi): satu shot terbang kontinu (sinematografi.md §3; opsi + resep: mata-elang.md). Jalur
   Catmull-Rom sentripetal berparameter panjang busur; tatap = look-ahead u+ahead atau target per titik; roll tan φ = v²κ/g, dihaluskan
   jendela Hann ±halus dtk (roll tak bisa seketika; pesawat sungguhan pun) lalu dijepit lunak rollMaks·tanh(φ/rollMaks);
   guncang trauma²×noise ber-seed. Murni fungsi tl.time(); backend membaca RAILS[CAM.rail](t). 3D: titik [x,y,z]. 2.5D: titik
   [fx,fy,zoom], zoom = DOLLY (mm·zoom tetap: bidang [data-z] dekat membesar lebih cepat, z > 0 terlewati), tanpa look-ahead. */
function jalurElang(titik,{ahead=.04,look=null}={}){const n=titik.length;
  if(n<2)throw new Error('terbang: butuh ≥ 2 titik');
  if(look&&look.length!==n)throw new Error('terbang: look harus '+n+' target (satu per titik, null = otomatis)');
  const pad=Q=>[Q[0].map((v,k)=>2*v-Q[1][k]),...Q,Q[n-1].map((v,k)=>2*v-Q[n-2][k])],P=pad(titik),
    jarak=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k])),
    seg=(Q,x)=>{const i=Math.min(n-2,Math.max(0,Math.floor(x))),[a,b,c,d]=Q.slice(i,i+4),h=(p,q)=>Math.max(Math.sqrt(jarak(p,q)),1e-4),   // knot sentripetal = jarak^½
      t1=h(a,b),t2=t1+h(b,c),t3=t2+h(c,d),t=t1+(x-i)*(t2-t1),L=(p,q,u,v)=>p.map((e,k)=>((v-t)*e+(t-u)*q[k])/(v-u)),
      A=L(a,b,0,t1),B=L(b,c,t1,t2),C=L(c,d,t2,t3);return L(L(A,B,0,t2),L(B,C,t1,t3),t1,t2);},   // Barry–Goldman
    M=64*(n-1),X=[],S=[];
  for(let k=0,q;k<=M;k++){const x=k/64,p=seg(P,x);X.push(x);S.push(k?S[k-1]+jarak(p,q):0);q=p;}   // tabel panjang busur
  const Lt=S[M];if(!(Lt>1e-9))throw new Error('terbang: semua titik sama — jalur tanpa panjang');
  const xDi=u=>{const d=Math.min(1,Math.max(0,u))*Lt;let a=0,b=M;while(b-a>1){const m=a+b>>1;S[m]<=d?a=m:b=m;}return X[a]+(X[b]-X[a])*Math.min(1,(d-S[a])/(S[b]-S[a]||1));},
    ujung=(x,e)=>{const a=seg(P,x),b=seg(P,x+e),l=jarak(a,b)||1;return u=>a.map((v,k)=>v+(v-b[k])/l*u*Lt);},   // lurus keluar dari ujung
    awal=ujung(0,1e-3),akhir=ujung(n-1,-1e-3),pos=u=>u<0?awal(-u):u>1?akhir(u-1):seg(P,xDi(u)),
    satu=d=>{const l=Math.hypot(...d)||1;return d.map(e=>e/l);},   // target per titik → ARAH satuan: target dekat & jauh berpindah rata
    T=look&&pad(look.map((v,i)=>satu((v||pos(S[i*64]/Lt+ahead)).map((e,k)=>e-titik[i][k]))));
  return{L:Lt,U:titik.map((_,i)=>S[i*64]/Lt),pos,tatap:u=>{if(!T)return pos(u+ahead);const p=pos(u),d=satu(seg(T,xDi(u)));return p.map((e,k)=>e+d[k]*Lt);}};}
function terbang(at,dur,titik,{ease='sine.inOut',ahead=.04,look=null,rollMaks=30,halus=.4,g,guncang=2,trauma0=.2,trauma=[],luruh=1,seed=7}={}){
  if(at<planAt)throw new Error('terbang: panggil urut waktu (detik '+at+' setelah '+planAt+')');
  if(!(dur>0))throw new Error('terbang: dur harus > 0');
  const tiga=CAM.mode==='three',E=gsap.parseEase(ease),z0=PLAN.zoom,m0=PLAN.mm,Pm=W*m0/36,r=Math.PI/180,G=g||(tiga?9.81:700),
    J=jalurElang(tiga?titik:titik.map(([x,y,z])=>{if(!(z>0))throw new Error('terbang 2.5D: zoom harus > 0');return[x,-y,-Pm*(1-z0/z)];}),{ahead,look}),
    laju=p=>{const a=Math.max(0,p-1e-3),b=Math.min(1,p+1e-3);return J.L*(E(b)-E(a))/(b-a)/dur;},
    vMaks=Math.max(...Array.from({length:101},(_,i)=>laju(i/100)))||1,
    detik=J.U.map(u=>{let a=0,b=1;for(let k=0;k<40;k++){const m=(a+b)/2;E(m)<u?a=m:b=m;}return at+dur*(a+b)/2;}),
    ev=typeof trauma=='function'?trauma(detik):trauma,
    P_=t=>Math.min(1,Math.max(0,(t-at)/dur)),
    bank=t=>{const p=P_(t),u=E(p),v=laju(p),[a,b,c]=[u-ahead,u,u+ahead].map(J.pos),x1=b[0]-a[0],z1=b[2]-a[2],x2=c[0]-b[0],z2=c[2]-b[2];
      return -Math.atan(v*v*Math.atan2(x1*z2-z1*x2,x1*x2+z1*z2)/(ahead*J.L)/G)/r;},   // κ horizontal (rata-rata ±ahead); belok kanan → negatif
    dt=1/240,n0=Math.max(1,Math.round(halus/dt)),M=Math.max(1,Math.ceil(dur/dt)),idl=Array.from({length:M+2*n0+1},(_,i)=>bank(at+(i-n0)*dt)),
    hw=Array.from({length:2*n0+1},(_,i)=>.5+.5*Math.cos(Math.PI*(i-n0)/(n0+1))),sw=hw.reduce((a,b)=>a+b),   // tabel 240 Hz ⊛ Hann, sekali saat setup
    RL=Array.from({length:M+1},(_,i)=>{let q=0;for(let k=0;k<=2*n0;k++)q+=hw[k]*idl[i+k];return rollMaks*Math.tanh(q/sw/rollMaks);}),
    R=t=>{const p=P_(t),u=E(p),v=laju(p),b=J.pos(u),x=Math.min(M,Math.max(0,(t-at)/dt)),j=Math.min(M-1,Math.floor(x)),
      roll=RL[j]+(RL[j+1]-RL[j])*(x-j),
      tr=Math.min(1,trauma0*v/vMaks+ev.reduce((s,[te,k])=>s+(t>=te?Math.max(0,k-(t-te)*luruh):0),0)),
      gz=i=>tr*tr*guncang*(2*noise(t*9,seed+i)+noise(t*19,seed+i+3)-1.5);
      if(tiga)return{p:b,look:J.tatap(u),roll:roll+gz(2),gy:gz(0),gp:gz(1)};
      const zoom=z0*Pm/Math.max(Pm*.02,Pm+b[2]),mm=m0*z0/zoom,P=W*mm/36;
      return{fx:b[0]+P*Math.tan(gz(0)*r)/zoom,fy:-b[1]+P*Math.tan(gz(1)*r)/zoom,zoom,mm,roll:roll+gz(2)};};
  const i=RAILS.push(R)-1,e=R(at+dur),roll=PLAN.roll+e.roll;   // ujung: CAM berlanjut dari pose akhir, tanpa lompatan
  cutTo(at,{rail:i,railU:0});camTo(at,dur,{railU:1},'none');
  if(tiga){const f=e.look,dx=e.p[0]-f[0],dy=e.p[1]-f[1],dz=e.p[2]-f[2],d=Math.hypot(dx,dy,dz);
    cutTo(at+dur,{rail:-1,fx:f[0],fy:f[1],fz:f[2],dist:d,pitch:-Math.asin(dy/d)/r,yaw:Math.atan2(dx,dz)/r,roll});}
  else cutTo(at+dur,{rail:-1,fx:e.fx,fy:e.fy,zoom:e.zoom,mm:e.mm,roll});
  R.detik=detik;return R;}
