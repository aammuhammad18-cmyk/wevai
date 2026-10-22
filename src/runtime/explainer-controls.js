addEventListener('keydown',e=>{if(/^[rR]$/.test(e.key))start();if(e.code==='Space'){e.preventDefault();tl.paused()?tl.play():tl.pause();}});
if(q.has('debug')){const dbg=$('#dbg');dbg.style.display='flex';const sc=$('#dScrub'),ck=$('#dClock');let drag=false;
  gsap.ticker.add(()=>{if(!drag)sc.value=String(tl.time()/DUR*1000);ck.textContent=tl.time().toFixed(2)+'s';$('#dPlay').textContent=tl.paused()?'Play':'Pause';});
  sc.addEventListener('pointerdown',()=>{drag=true;tl.pause();});addEventListener('pointerup',()=>drag=false);
  sc.addEventListener('input',()=>{tl.pause();tl.time(sc.value/1000*DUR);});$('#dPlay').onclick=()=>tl.paused()?tl.play():tl.pause();}
