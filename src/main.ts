import './style.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { colors, backgrounds, presets } from './data/palettes';
import { cleanName, initialDesign, validateDesign, repeatPalette, orderUrl, type Design } from './lib/design';
import type { NameRenderer } from './lib/renderer';
import { CanvasNameRenderer } from './lib/canvas-renderer';

const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const icon=(name:string)=>({download:'↓',shuffle:'⤨',reset:'↺',whatsapp:'↗'}[name]);
let design:Design={...initialDesign,colors:[...initialDesign.colors]};
try{const stored=localStorage.getItem('adoc.design.v1');if(stored)design=validateDesign(JSON.parse(stored));}catch{/* Storage is optional. */}
let selected=0;let palette=[6,0,2,3];let renderer:NameRenderer|CanvasNameRenderer|undefined;let renderReady=false;let busy=false;
$('#root').innerHTML=`
<header class="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-10 sm:py-8">
  <a class="brand" href="./" aria-label="ADOC studio, faqja kryesore">adoc<span class="brand-dot">.</span></a>
  <span class="hidden text-sm text-muted sm:block">Pak ngjyrë. Shumë personalitet.</span>
  <a class="text-sm font-semibold underline decoration-coral decoration-2 underline-offset-8" href="#si-funksionon">Si funksionon <span aria-hidden="true">↗</span></a>
</header>
<main class="mx-auto max-w-7xl px-5 pb-12 sm:px-10">
  <section class="hero relative pb-8 pt-5 sm:pb-10 sm:pt-9">
    <p class="eyebrow mb-4"><span class="inline-block h-2 w-2 rounded-full bg-coral"></span> I VOGËL NË MADHËSI, I MADH NË KUJTIME</p>
    <h1 class="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Emri yt.<br class="sm:hidden"> <span class="hero-accent">Pak më magjik.</span></h1>
    <p class="mt-5 max-w-xl text-base text-muted sm:text-lg">Krijo kombinimin tënd, shkronjë pas shkronje.</p>
    <span class="hero-spark" aria-hidden="true">✳</span>
  </section>
  <div class="workspace grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
    <section class="min-w-0 lg:sticky lg:top-6" aria-label="Pamja e personalizuar">
      <div class="preview-card overflow-hidden rounded-[28px] bg-white p-2 sm:p-3">
        <div class="relative overflow-hidden rounded-[21px]">
          <div id="scene" class="scene"></div>
          <div class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5"><span class="preview-label">PAMJA JOTE</span><span id="summary" class="rounded-full bg-white/80 px-3 py-2 text-xs font-medium"></span></div>
          <div id="loading" class="absolute inset-0 flex items-center justify-center bg-cream text-sm text-muted">Po përgatisim shkronjat…</div>
          <div id="empty" class="pointer-events-none absolute inset-0 hidden items-center justify-center text-lg text-muted">Çdo krijim fillon me një emër.</div>
          <div class="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[11px] tracking-wide text-ink/55">NJË EMËR QË E BËN VENDIN TËNDIN.</div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4 px-3 py-5 sm:px-4">
          <div><p class="mb-2 text-xs text-muted">Prek një shkronjë për ta ngjyrosur</p><div id="letters" class="flex max-w-full flex-wrap gap-1.5" aria-label="Zgjidh shkronjën"></div></div>
          <div><p class="mb-2 text-xs text-muted">Sfondi</p><div id="backgrounds" class="flex gap-2" role="group" aria-label="Sfondi i pamjes"></div></div>
        </div>
      </div>
      <div class="mt-6 flex items-center justify-between"><h2 class="text-sm font-medium">Një pikënisje e bukur</h2><span class="text-xs text-muted">Kombinime të gatshme</span></div>
      <div id="presets" class="mt-3 grid grid-cols-3 gap-2 sm:gap-3"></div>
      <p class="mt-4 text-xs leading-relaxed text-muted">Pamje orientuese. Forma dhe nuancat e produktit real mund të ndryshojnë.</p>
    </section>
    <section class="controls rounded-[28px] bg-white p-6 sm:p-7" aria-label="Personalizo emrin">
      <div class="step-title"><span>01</span><label for="name">Emri</label></div>
      <input id="name" class="name-input mt-4 w-full rounded-xl border border-line bg-white px-4 py-3.5 text-xl font-medium outline-none focus:border-plum" type="text" autocomplete="off" spellcheck="false" maxlength="16" placeholder="Shkruaj emrin…" aria-describedby="name-help">
      <div id="name-help" class="mt-2 flex justify-between text-xs text-muted"><span>Edhe ë dhe ç janë të mirëpritura.</span><span id="count"></span></div>
      <div class="step-title mt-7"><span>02</span><h2>Madhësia</h2></div>
      <div id="sizes" class="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Madhësia e shkronjave">${[8,10,12].map(size=>`<button class="size-btn" data-size="${size}" aria-pressed="false">${size} cm</button>`).join('')}</div>
      <div class="step-title mt-7"><span>03</span><h2>Ngjyrat</h2></div>
      <p class="mb-4 mt-3 text-sm text-muted">Shkronja e zgjedhur: <strong id="selected-label" class="text-ink"></strong></p>
      <div id="colors" class="grid grid-cols-5 gap-x-2 gap-y-3" role="group" aria-label="Ngjyra e shkronjës"></div>
      <div class="mt-4 rounded-xl bg-lilac/50 p-3"><p class="text-xs text-muted">Paleta për përsëritje <span id="palette-dots" class="ml-1 inline-flex gap-1"></span></p><p class="mt-1 text-[11px] text-muted">Ngjyrat që zgjedh ruhen në këtë radhë.</p></div>
      <div class="mt-3 grid grid-cols-2 gap-2"><button id="repeat" class="soft-button">↻ Përsërit</button><button id="shuffle" class="soft-button">${icon('shuffle')} Përzieji</button></div>
      <button id="clear-palette" class="mt-2 text-xs text-muted underline underline-offset-4">Pastro paletën</button>
      <div class="mt-7 border-t border-line pt-5"><a id="order" class="primary-button" target="_blank" rel="noopener noreferrer">Porosit në WhatsApp <span aria-hidden="true">↗</span></a><button id="save" class="secondary-button mt-2" disabled>${icon('download')} Ruaj foton</button><button id="share" class="secondary-button mt-2 hidden" disabled>Ndaj / ruaj në galeri ↗</button></div>
      <p class="mt-3 text-center text-[11px] leading-relaxed text-muted">Porosia hapet me detajet e emrit. Bashkëngjit foton e ruajtur në bisedë.</p>
      <div class="mt-4 flex justify-center"><button id="reset" class="text-xs text-muted underline underline-offset-4">${icon('reset')} Fillo nga e para</button></div>
      <p id="status" class="mt-3 text-center text-xs leading-relaxed text-muted" role="status" aria-live="polite"></p>
    </section>
  </div>
  <section id="si-funksionon" class="mt-16 border-t border-line pt-8"><h2 class="text-2xl font-medium">Nga një ide, te një kujtim.</h2><div class="mt-6 grid gap-6 sm:grid-cols-3">${[['01','Bëje tëndin','Shkruaj emrin, zgjidh madhësinë dhe ngjyrat.'],['02','Ruaje kombinimin','Shkarko pamjen e krijimit tënd si fotografi.'],['03','Na shkruaj','Dërgo detajet në WhatsApp. Çmimin dhe afatin i konfirmojmë në bisedë.']].map(([n,title,text])=>`<div><span class="text-xs text-plum">${n} /</span><h3 class="mt-2 text-lg font-medium">${title}</h3><p class="mt-2 max-w-xs text-sm leading-relaxed text-muted">${text}</p></div>`).join('')}</div></section>
</main>
<footer class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-7 sm:px-10"><span class="brand text-2xl">adoc.</span><a href="https://wa.me/355684069999" target="_blank" rel="noopener noreferrer" class="text-sm">+355 68 406 9999 ↗</a><span class="text-xs text-muted">Emra të vegjël. Histori të mëdha.</span></footer>`;

const input=$<HTMLInputElement>('#name');input.value=design.name;
const setStatus=(message:string)=>$('#status').textContent=message;
$('#colors').innerHTML=colors.map((color,i)=>`<button class="color-choice" data-color="${i}" aria-label="${color.name}" title="${color.name}" aria-pressed="false"><span style="background:${color.hex}"></span><small>${color.name}</small></button>`).join('');
$('#backgrounds').innerHTML=backgrounds.map((bg,i)=>`<button class="background-choice" data-bg="${i}" aria-label="Sfond ${bg.name}" title="${bg.name}" style="background:${bg.hex}" aria-pressed="false"></button>`).join('');
$('#presets').innerHTML=presets.map((preset,i)=>`<button class="preset" data-preset="${i}"><span class="mb-3 flex justify-center -space-x-1">${preset.colors.map(c=>`<span class="h-7 w-7 rounded-full border-2 border-white" style="background:${colors[c].hex}"></span>`).join('')}</span><span class="text-xs font-medium sm:text-sm">${preset.name}</span></button>`).join('');
function update(render=true){
  if(!design.name[selected]||design.name[selected]===' ')selected=Math.max(0,Array.from(design.name).findIndex(char=>char!==' '));
  const valid=Boolean(design.name.trim());
  $('#count').textContent=`${design.name.length}/16`;
  $('#summary').textContent=`${design.name.replaceAll(' ','').length} shkronja · ${design.size} cm`;
  $('#selected-label').textContent=design.name[selected]||'—';
  $('#letters').innerHTML=Array.from(design.name).map((char,i)=>char===' '?'':`<button class="letter-choice" data-letter="${i}" aria-label="Shkronja ${char}, pozicioni ${i+1}" aria-pressed="${selected===i}">${char}</button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(button=>{button.setAttribute('aria-pressed',String(Number(button.dataset.color)===design.colors[selected]));button.disabled=!valid;});
  document.querySelectorAll<HTMLElement>('[data-bg]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.bg)===design.background)));
  document.querySelectorAll<HTMLElement>('[data-size]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.size)===design.size)));
  $('#palette-dots').innerHTML=palette.map(c=>`<span class="h-2.5 w-2.5 rounded-full border border-black/10" style="background:${colors[c].hex}"></span>`).join('');
  $<HTMLButtonElement>('#repeat').disabled=!valid||!palette.length;
  $<HTMLButtonElement>('#shuffle').disabled=!valid;
  $<HTMLButtonElement>('#save').disabled=!valid||!renderReady||busy;
  $<HTMLButtonElement>('#share').disabled=!valid||!renderReady||busy;
  const order=$<HTMLAnchorElement>('#order');order.setAttribute('aria-disabled',String(!valid));if(valid)order.href=orderUrl(design);else order.removeAttribute('href');
  $('#empty').classList.toggle('hidden',valid);$('#empty').classList.toggle('flex',!valid);
  try{localStorage.setItem('adoc.design.v1',JSON.stringify(design));}catch{/* Private mode can disable persistence. */}
  if(render)renderer?.update(design);
}
input.addEventListener('input',()=>{const cursor=input.selectionStart;design.name=cleanName(input.value);input.value=design.name;if(cursor!==null)input.setSelectionRange(Math.min(cursor,design.name.length),Math.min(cursor,design.name.length));design.colors=Array.from(design.name).map((_,i)=>design.colors[i]??palette[i%palette.length]??1);update();});
$('#letters').addEventListener('click',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-letter]');if(target){selected=Number(target.dataset.letter);update(false);}});
$('#colors').addEventListener('click',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-color]');if(target&&design.name.trim()){const color=Number(target.dataset.color);design.colors[selected]=color;if(!palette.includes(color))palette.push(color);update();}});
$('#backgrounds').addEventListener('click',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-bg]');if(target){design.background=Number(target.dataset.bg);update();}});
$('#sizes').addEventListener('click',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-size]');if(target){design.size=Number(target.dataset.size);update();}});
$('#presets').addEventListener('click',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-preset]');if(target){palette=[...presets[Number(target.dataset.preset)].colors];design.colors=repeatPalette(design.name,palette);update();}});
$('#repeat').addEventListener('click',()=>{design.colors=repeatPalette(design.name,palette);update();});
$('#shuffle').addEventListener('click',()=>{const pool=palette.length?palette:colors.map((_,i)=>i);design.colors=Array.from(design.name).map(()=>pool[Math.floor(Math.random()*pool.length)]);update();});
$('#clear-palette').addEventListener('click',()=>{palette=[];update(false);});
$('#reset').addEventListener('click',()=>{design={...initialDesign,colors:[...initialDesign.colors]};palette=[6,0,2,3];selected=0;input.value=design.name;setStatus('');update();});
function download(file:File){const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('#save').addEventListener('click',async()=>{if(!renderer||busy)return;busy=true;update(false);try{download(await renderer.export());setStatus('Fotoja u shkarkua. Në telefon, hape dhe zgjidh “Ruaj imazhin” për ta shtuar në galeri.');}catch{setStatus('Fotoja nuk u ruajt. Provo përsëri ose rifresko faqen.');}finally{busy=false;update(false);}});
// Prepare the file before the share tap to preserve Safari's user-activation requirement.
let shareFile:File|undefined;
$('#share').addEventListener('pointerdown',()=>{shareFile=undefined;void renderer?.export().then(file=>{shareFile=file;}).catch(()=>{});});
$('#share').addEventListener('click',async()=>{if(!renderer||busy)return;try{const file=shareFile??await renderer.export();if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Krijimi im ADOC'});setStatus('');}else{download(file);setStatus('Fotoja u shkarkua. Hape për ta ruajtur në galeri.');}}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))setStatus('Përdor “Ruaj foton” për ta shkarkuar në këtë pajisje.');}});
if(typeof navigator.share==='function'&&typeof navigator.canShare==='function')$('#share').classList.remove('hidden');
$('#scene').addEventListener('rendererror',()=>{renderReady=false;setStatus('Pamja 3D u ndërpre. Rifresko faqen për ta ringarkuar.');update(false);});
update(false);
async function start(){try{try {const {NameRenderer:Renderer}=await import('./lib/renderer');renderer=new Renderer($('#scene'));await renderer.load();} catch {renderer=new CanvasNameRenderer($('#scene'));await renderer.load();}renderReady=true;renderer.onSelect=index=>{selected=index;update(false);};$('#loading').classList.add('hidden');update();}catch(error){console.error(error);$('#loading').textContent='Pamja 3D nuk u ngarkua. Provo një shfletues me WebGL ose rifresko faqen.';setStatus('Detajet mund t’i dërgosh ende në WhatsApp.');}}
void start();
