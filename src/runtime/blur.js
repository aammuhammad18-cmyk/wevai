/* motion blur BERARAH (techniques.md §2): feGaussianBlur menerima stdDeviation
   "x y" terpisah, jadi kaburnya mengikuti ARAH gerak — `filter:blur()` CSS mengabur
   ke segala arah dan terbaca "tidak fokus". Filter dibuat per tween lalu DILEPAS
   saat selesai: elemen yang terus memakai filter SVG dirasterisasi ulang tiap frame. */
const defs=$('#filters defs'); let fc=0;
function makeBlur(){
  const id='mb'+(fc++), NS='http://www.w3.org/2000/svg';
  const f=document.createElementNS(NS,'filter'); f.id=id;
  f.setAttribute('x','-70%');f.setAttribute('y','-70%');           // kotak default
  f.setAttribute('width','240%');f.setAttribute('height','240%');  // memotong ekor
  const g=document.createElementNS(NS,'feGaussianBlur');
  g.setAttribute('stdDeviation','0 0'); f.appendChild(g); defs.appendChild(f);
  return {url:`url(#${id})`,node:g};
}
function blurTween(tl,targets,at,from,to,dur,{ease='power3.out',ax=1,ay=.08}={}){
  const b=makeBlur(),o={v:from};
  tl.set(targets,{filter:b.url},at);
  tl.to(o,{v:to,duration:dur,ease,onUpdate(){
    b.node.setAttribute('stdDeviation',`${(o.v*ax).toFixed(2)} ${(o.v*ay).toFixed(2)}`);}},at);
  tl.set(targets,{filter:'none'},at+dur); // lepas: filter permanen = raster ulang tiap frame
}
const VERT={ax:.1,ay:1}, HORZ={ax:1,ay:.1};
