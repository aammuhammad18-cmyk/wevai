/* seek sinkron untuk snap.mjs / export-frames.mjs / konsol: GSAP menulis gaya secara
   lazy di tick berikutnya dan kanvas menunggu rAF (yang dithrottle di tab tersembunyi),
   jadi tanpa ini screenshot tertinggal satu langkah. pause(t,false) sengaja TIDAK menekan
   callback: onUpdate (applyCam/render) harus ikut jalan saat scrub. apply() = cara starter
   ini menggambar ulang dirinya (kamera, render loop, atau keduanya). */
function makeSeek(tl, apply){ return t => { tl.pause(t, false);
  if (gsap.ticker.tick) gsap.ticker.tick(); if (apply) apply(t); }; }
