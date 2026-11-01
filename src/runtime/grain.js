/* grain hidup (techniques.md §7d): lapisan butiran film teratas di #stage — di luar #world, jadi tidak
   meratakan paralaks [data-z]. Tile noise dirasterisasi sekali; per frame hanya transform di lapisannya
   sendiri, melompat 12× per detik dengan posisi fungsi murni tl.time() (bukan Math.random) — sama di
   play, scrub, dan ekspor. Memakai tl.eventCallback('onUpdate'); callback yang sudah ada tetap dipanggil,
   jadi pasang onUpdate timeline milik proyek SEBELUM grainHidup(). Latar gelap: overlay .15–.3;
   latar terang: multiply .06–.15. */
function grainHidup(tl, {opacity=.14, blend='overlay', freq=.85}={}){
  const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='2.5 0 0 0 -.75 2.5 0 0 0 -.75 2.5 0 0 0 -.75 0 0 0 0 1'/></filter><rect width='256' height='256' filter='url(%23n)'/></svg>`;
  const el=document.createElement('div'); el.className='wv-grain';
  el.style.cssText=`position:absolute;inset:-60px;pointer-events:none;z-index:50;opacity:${opacity};mix-blend-mode:${blend};will-change:transform;transform:translate(-30px,-30px);`+
    `background-image:url("data:image/svg+xml,${svg.replace(/</g,'%3C').replace(/>/g,'%3E')}")`;
  document.getElementById('stage').appendChild(el);
  const prev=tl.eventCallback('onUpdate');
  tl.eventCallback('onUpdate',function(){const k=Math.floor(tl.time()*12);
    el.style.transform=`translate(${k*37%60-30}px,${k*61%60-30}px)`;if(prev)prev.apply(this,arguments);});
  return el;
}
