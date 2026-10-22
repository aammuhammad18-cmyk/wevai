/* ================= FOOTAGE — layer video yang terikat timeline (seperti footage di After Effects) =================
   Markup : <div class="clipbox"><video class="clip" src="assets/klip.mp4" muted playsinline preload="auto"></video></div>
   Pasang : const k = clip($('#v1'), {at:4, in:1.5, out:6, rate:1, hold:false});
            at = detik timeline klip mulai · in/out = potongan sumber (dtk) · rate = kecepatan · hold = tahan frame akhir
   Animasi: tween PEMBUNGKUSNYA dengan tl (posisi, skala, mask, opacity, filter). Isi video mengikuti jam timeline,
            bukan jamnya sendiri — scrub ?debug=1, snap.mjs, dan export-frames.mjs (OPENER.seekFrame) tetap presisi.
   Format : MP4 H.264 (yuv420p, +faststart) atau WebM VP9, tanpa suara, 720p–1080p, 3–8 dtk per klip. */
var CLIPS = CLIPS || [];
function clip(el, o){ o = o || {}; el.muted = true; el.playsInline = true; el.preload = 'auto'; el.loop = false;
  try { el.pause(); } catch(e) {}
  var c = { el: el, at: o.at || 0, inT: o.in || 0, out: (o.out == null ? null : o.out), rate: o.rate || 1, hold: !!o.hold };
  (CLIPS = CLIPS || []).push(c); return c; }
function clipTime(c, t){ var end = c.out != null ? c.out : (isFinite(c.el.duration) ? c.el.duration : 1e9);
  var lt = (t - c.at) * c.rate; if (lt < 0) return null; var vt = c.inT + lt;
  if (vt > end - 1/120) { if (!c.hold) return null; vt = end - 1/60; } return vt; }
function syncClips(t, playing){ for (var i = 0; i < CLIPS.length; i++){ var c = CLIPS[i], v = c.el, vt = clipTime(c, t);
  if (vt === null) { if (!v.paused) v.pause(); continue; }
  if (playing) { if (v.playbackRate !== c.rate) v.playbackRate = c.rate; if (v.paused) v.play().catch(function(){});
    if (Math.abs(v.currentTime - vt) > .2) v.currentTime = vt; }
  else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - vt) > 1/90) v.currentTime = vt; } } }
function seekClips(t){ return Promise.all(CLIPS.map(function(c){ return new Promise(function(res){
  var v = c.el, vt = clipTime(c, t); try { v.pause(); } catch(e) {}
  if (vt === null) return res();
  var fin = function(){ requestAnimationFrame(function(){ requestAnimationFrame(res); }); };
  if (Math.abs(v.currentTime - vt) < 1/240 && v.readyState >= 2) return fin();
  var to = setTimeout(res, 4000);
  v.addEventListener('seeked', function h(){ v.removeEventListener('seeked', h); clearTimeout(to); fin(); });
  v.currentTime = vt; }); })); }
gsap.ticker.add(function(){ if (CLIPS.length) syncClips(window.OPENER.tl.time(), !window.OPENER.tl.paused()); });
window.OPENER.clipsReady = function(){ return CLIPS.every(function(c){ return c.el.readyState >= 2; }); };
window.OPENER.seekFrame = function(t){ window.OPENER.seek(t); return seekClips(t); };   // ekspor/snap: tunggu frame klip
