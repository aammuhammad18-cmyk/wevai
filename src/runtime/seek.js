/* seek sinkron untuk snap.mjs / export-frames.mjs / konsol: GSAP menulis gaya secara
   lazy di tick berikutnya dan kanvas menunggu rAF (yang dithrottle di tab tersembunyi),
   jadi tanpa ini screenshot tertinggal satu langkah. pause(t,false) sengaja TIDAK menekan
   callback: onUpdate (applyCam/render) harus ikut jalan saat scrub. apply() = cara starter
   ini menggambar ulang dirinya (kamera, render loop, atau keduanya). */
function makeSeek(tl, apply){ return t => {
  // lompat jauh (worker ekspor kedua, Chrome dibuka ulang): onUpdate tween jalan sebelum nilai tulis-tunda masuk → pose lama. Berhenti sesaat
  // SEBELUM t lalu maju, supaya onUpdate jalan lagi dengan nilai yang sudah masuk; dari sesudah t malah membatalkan set() yang tepat di t.
  if (Math.abs(tl.time() - t) > .1) { tl.pause(Math.max(0, t - 1e-3), false); if (gsap.ticker.tick) gsap.ticker.tick(); }
  if (tl.time() === t) tl.pause(t + 1e-4, false);   // pause(t) dari playhead yang sudah di t = no-op: set() pada t=0 tak pernah diterapkan di halaman segar
  tl.pause(t, false);
  if (gsap.ticker.tick) gsap.ticker.tick(); if (apply) apply(t); }; }
