const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const SV=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f=n=>n>=0?'+'+n:''+n;

let char=LS('wf_char')||{},notes=LS('wf_notes')||[];

/* ---------- navigation ---------- */
const IDS=['home','sheet','notes','compendium','about'];
function show(id){
  if(!IDS.includes(id))id='home';
  $$('.sec').forEach(e=>e.classList.toggle('on',e.id==id));
  $$('.nav').forEach(e=>e.classList.toggle('on',e.dataset.s==id));
  history.replaceState(null,'','#'+id);scrollTo(0,0);
  if(id=='home')home();
}
$$('.nav').forEach(b=>b.onclick=()=>show(b.dataset.s));

/* ---------- home ---------- */
function roll(){
  const n=Math.min(100,Math.max(1,parseInt($('#dn').value)||1)),s=+$('#dt').value;
  $('#dn').value=n;
  const r=Array.from({length:n},()=>1+Math.floor(Math.random()*s)),t=r.reduce((a,b)=>a+b,0);
  const b=$('#die'),len=String(t).length;
  b.textContent=t;b.style.fontSize=len<=2?'4.5rem':len==3?'3.5rem':'2.5rem';
  b.classList.remove('roll');void b.offsetWidth;b.classList.add('roll');
  $('#rollOut').innerHTML=`<div class="f text-3xl text-bone">${n}d${s} = ${t}</div>`+(n>1?`<div class="mt-1 break-words">${r.join(', ')}</div>`:'');
}
$('#rollBtn').onclick=roll;$('#die').onclick=roll;
$('#dn').onkeydown=e=>{if(e.key=='Enter')roll()};
function home(){
  $('#hnMsg').textContent='';
  $('#h-char').textContent=char.name||'Unnamed wayfarer';
  $('#h-sub').textContent=[char.race,char.cls,char.level?'level '+char.level:''].filter(Boolean).join(' ')||'Fill in your sheet to see it here';
  $('#h-hp').value=char.hp??'';$('#h-hpmax').value=char.hpmax??'';
  const pins=notes.filter(n=>n.pinned);
  $('#h-pins').innerHTML=pins.length?pins.map(n=>`
    <div class="wrap flex flex-col bg-ink border border-edge rounded p-3 min-h-[9rem]">
      <button data-open="${n.id}" class="wrap f text-xl text-left hover:text-ember">${esc(n.title||'Untitled')}</button>
      <div tabindex="0" role="region" aria-label="Text of ${esc(n.title||'Untitled')}" class="wrap scroll flex-1 mt-2 max-h-48 text-dim whitespace-pre-wrap">${esc(n.body)||'Empty note.'}</div>
      <button data-open="${n.id}" class="self-start mt-2 text-sm text-verd underline">Open in Notes</button>
    </div>`).join(''):'<p class="text-dim sm:col-span-2 lg:col-span-3">Nothing pinned yet. Pin a note from the Notes page and it will show up here.</p>';
}
/* HP on the home card and the sheet share one value */
['hp','hpmax'].forEach(k=>$('#h-'+k).addEventListener('input',e=>{
  char[k]=e.target.value;SV('wf_char',char);
  const el=$(`#sheetBody [data-k="${k}"]`);if(el)el.value=e.target.value;
}));
/* open a pinned note on the Notes page */
$('#h-pins').addEventListener('click',e=>{
  const b=e.target.closest('[data-open]');if(!b)return;
  open.add(+b.dataset.open);renderNotes();show('notes');
});
/* quick note goes straight to the Notes page, unpinned */
$('#hnAdd').onclick=()=>{
  const t=$('#hnT').value.trim();if(!t)return $('#hnT').focus();
  notes.unshift({id:Date.now(),title:t,body:$('#hnB').value,pinned:false});SV('wf_notes',notes);
  $('#hnT').value='';$('#hnB').value='';renderNotes();
  $('#hnMsg').textContent='Added to Notes. Pin it there to show it here.';
};

/* ---------- character sheet ---------- */
const AB=[['str','Strength'],['dex','Dexterity'],['con','Constitution'],['int','Intelligence'],['wis','Wisdom'],['cha','Charisma']];
const SK=[['Acrobatics','dex'],['Animal Handling','wis'],['Arcana','int'],['Athletics','str'],['Deception','cha'],['History','int'],['Insight','wis'],['Intimidation','cha'],['Investigation','int'],['Medicine','wis'],['Nature','int'],['Perception','wis'],['Performance','cha'],['Persuasion','cha'],['Religion','int'],['Sleight of Hand','dex'],['Stealth','dex'],['Survival','wis']];
const fld=(k,l,t='text')=>`<label class="block text-sm text-dim">${l}<input data-k="${k}" type="${t}" class="w-full text-bone"></label>`;
const box='bg-panel border border-edge rounded p-4';
function buildSheet(){
  $('#sheetBody').innerHTML=`
  <div class="${box} grid grid-cols-2 md:grid-cols-4 gap-3">
    ${fld('name','Character name')}${fld('cls','Class')}${fld('race','Race')}${fld('level','Level','number')}
    ${fld('bg','Background')}${fld('align','Alignment')}${fld('xp','Experience points')}${fld('player','Player')}
  </div>
  <div class="grid lg:grid-cols-3 gap-5">
    <div class="space-y-5">
      <div class="${box}"><h3 class="f text-xl mb-3">Abilities</h3>
        <div class="grid grid-cols-2 gap-3">${AB.map(([a,n])=>`
          <div class="border border-edge rounded p-2 text-center"><div class="text-sm text-dim">${n}</div>
          <input data-k="${a}" type="number" min="1" max="30" placeholder="10" class="w-16 text-center text-xl">
          <div class="f text-2xl text-verd" id="m-${a}">+0</div></div>`).join('')}</div>
      </div>
      <div class="${box}"><h3 class="f text-xl mb-3">Saving throws</h3>
        ${AB.map(([a,n])=>`<label class="flex items-center gap-2 py-0.5"><input type="checkbox" data-k="sp_${a}"><span id="s-${a}" class="f w-8 text-verd">+0</span>${n}</label>`).join('')}
      </div>
    </div>
    <div class="${box}"><h3 class="f text-xl mb-3">Skills</h3>
      ${SK.map(([n,a],i)=>`<label class="flex items-center gap-2 py-0.5"><input type="checkbox" data-k="kp_${i}"><span id="k-${i}" class="f w-8 text-verd">+0</span>${n} <span class="text-dim text-sm">(${a})</span></label>`).join('')}
    </div>
    <div class="space-y-5">
      <div class="${box} grid grid-cols-2 gap-3">
        ${fld('ac','Armor class','number')}${fld('speed','Speed (ft)','number')}
        <div class="text-sm text-dim">Initiative<div id="init" class="f text-2xl text-verd">+0</div></div>
        <div class="text-sm text-dim">Proficiency<div id="pb" class="f text-2xl text-verd">+2</div></div>
        <div class="text-sm text-dim col-span-2">Passive perception<div id="pp" class="f text-2xl text-verd">10</div></div>
      </div>
      <div class="${box} grid grid-cols-2 gap-3"><h3 class="f text-xl col-span-2">Hit points</h3>
        ${fld('hp','Current','number')}${fld('hpmax','Maximum','number')}${fld('hd','Hit dice')}${fld('temp','Temporary','number')}
      </div>
      <div class="${box}"><label class="text-sm text-dim">Attacks and spells<textarea data-k="atk" rows="4" class="w-full text-bone"></textarea></label></div>
    </div>
  </div>
  <div class="grid md:grid-cols-2 gap-5">
    <div class="${box}"><label class="text-sm text-dim">Features and traits<textarea data-k="feat" rows="6" class="w-full text-bone"></textarea></label></div>
    <div class="${box}"><label class="text-sm text-dim">Equipment<textarea data-k="gear" rows="6" class="w-full text-bone"></textarea></label></div>
  </div>`;
  $$('#sheetBody [data-k]').forEach(el=>{const v=char[el.dataset.k];if(el.type=='checkbox')el.checked=!!v;else el.value=v??''});
  calc();
}
function calc(){
  const lv=Math.min(20,Math.max(1,+char.level||1)),pb=2+Math.floor((lv-1)/4),m=a=>Math.floor(((+char[a]||10)-10)/2);
  $('#pb').textContent=f(pb);$('#init').textContent=f(m('dex'));
  $('#pp').textContent=10+m('wis')+(char.kp_11?pb:0);
  AB.forEach(([a])=>{$('#m-'+a).textContent=f(m(a));$('#s-'+a).textContent=f(m(a)+(char['sp_'+a]?pb:0))});
  SK.forEach(([n,a],i)=>$('#k-'+i).textContent=f(m(a)+(char['kp_'+i]?pb:0)));
}
$('#sheetBody').addEventListener('input',e=>{
  const k=e.target.dataset.k;if(!k)return;
  char[k]=e.target.type=='checkbox'?e.target.checked:e.target.value;SV('wf_char',char);calc();
});

/* ---------- notes ---------- */
const open=new Set();
const pinBtn=(n,cls)=>`<button data-act="p" data-id="${n.id}" aria-pressed="${!!n.pinned}" class="${cls} rounded border px-2 py-0.5 text-sm ${n.pinned?'border-ember text-ember':'border-edge text-dim hover:border-verd'}">${n.pinned?'Pinned':'Pin'}</button>`;
function renderNotes(){
  const g=$('#grid');
  if(!notes.length){g.innerHTML='<p class="text-dim md:col-span-3">No cards yet. Give your first one a title above.</p>';return}
  g.innerHTML=notes.map(n=>open.has(n.id)?`
    <div class="bg-panel border ${n.pinned?'border-ember':'border-verd'} rounded md:col-span-2 p-4 space-y-3">
      <button data-act="t" data-id="${n.id}" class="wrap f text-xl w-full text-left" aria-expanded="true">${esc(n.title||'Untitled')} <span class="text-dim text-base">(close)</span></button>
      <input data-f="title" data-id="${n.id}" class="w-full" value="${esc(n.title)}" aria-label="Title">
      <textarea data-f="body" data-id="${n.id}" rows="9" class="w-full" placeholder="Write here...">${esc(n.body)}</textarea>
      <div class="flex items-center justify-between">
        <button data-act="d" data-id="${n.id}" class="text-ember text-sm underline">Delete card</button>
        ${pinBtn(n,'')}
      </div>
    </div>`:`
    <div class="relative bg-panel border ${n.pinned?'border-ember':'border-edge hover:border-verd'} rounded">
      <button data-act="t" data-id="${n.id}" aria-expanded="false" class="block w-full text-left p-4 pr-20">
        <div class="wrap f text-xl">${esc(n.title||'Untitled')}</div>
        <div class="wrap text-dim mt-1 line-clamp-2">${esc(n.body)||'Empty. Tap to start writing.'}</div>
      </button>
      ${pinBtn(n,'absolute top-3 right-3')}
    </div>`).join('');
}
function addNote(){
  const t=$('#nt').value.trim();if(!t)return $('#nt').focus();
  const n={id:Date.now(),title:t,body:'',pinned:false};notes.unshift(n);open.add(n.id);
  SV('wf_notes',notes);$('#nt').value='';renderNotes();
  const ta=$(`textarea[data-id="${n.id}"]`);ta&&ta.focus();
}
$('#addNote').onclick=addNote;
$('#nt').onkeydown=e=>{if(e.key=='Enter')addNote()};
$('#grid').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const id=+b.dataset.id;
  if(b.dataset.act=='t'){open.has(id)?open.delete(id):open.add(id)}
  else if(b.dataset.act=='p'){const n=notes.find(n=>n.id==id);if(n){n.pinned=!n.pinned;SV('wf_notes',notes)}}
  else if(confirm('Delete this card?')){notes=notes.filter(n=>n.id!=id);SV('wf_notes',notes)}
  renderNotes();
});
$('#grid').addEventListener('input',e=>{
  const fl=e.target.dataset.f;if(!fl)return;
  const n=notes.find(n=>n.id==e.target.dataset.id);if(n){n[fl]=e.target.value;SV('wf_notes',notes)}
});

/* ---------- compendium ---------- */
const API='https://www.dnd5eapi.co',CATS=['spells','monsters','equipment','magic-items','classes','races','conditions','features','skills','weapon-properties'];
const cache={};
$('#cat').innerHTML=CATS.map(c=>`<option value="${c}">${c.replace('-',' ')}</option>`).join('');
async function getJSON(u){const r=await fetch(API+u);if(!r.ok)throw new Error(r.status);return r.json()}
async function list(){
  const c=$('#cat').value,q=$('#q').value.trim().toLowerCase(),res=$('#res');
  try{
    if(!cache[c]){res.textContent='Loading...';cache[c]=(await getJSON('/api/2014/'+c)).results}
    const hits=cache[c].filter(x=>x.name.toLowerCase().includes(q));
    res.innerHTML=hits.length?hits.map(x=>`<button data-u="${x.url}" class="block w-full text-left px-3 py-1.5 rounded hover:bg-edge">${esc(x.name)}</button>`).join(''):'<p class="p-3 text-dim">Nothing matches that name. Try a shorter search or another category.</p>';
  }catch(e){res.innerHTML='<p class="p-3 text-ember">Could not reach dnd5eapi.co. Check your connection and try again.</p>'}
}
function rend(v,d=0){
  if(v==null)return '';
  if(typeof v!='object')return esc(v);
  if(Array.isArray(v)){
    if(v.every(x=>typeof x!='object'))return v.map(x=>`<p class="mb-1">${esc(x)}</p>`).join('');
    return v.map(x=>x&&x.name&&x.desc?`<div class="mb-2"><b class="text-bone">${esc(x.name)}.</b> ${rend(x.desc,d+1)}</div>`:`<div class="mb-1">${rend(x,d+1)}</div>`).join('');
  }
  if(v.name&&v.url&&Object.keys(v).length<=3)return esc(v.name);
  return Object.entries(v).filter(([k])=>!['index','url','updated_at'].includes(k)&&!(d==0&&k=='name')).map(([k,x])=>{
    const h=rend(x,d+1);return h?`<div class="mb-1"><span class="text-verd capitalize">${k.replace(/_/g,' ')}:</span> ${h}</div>`:'';
  }).join('');
}
$('#res').addEventListener('click',async e=>{
  const b=e.target.closest('[data-u]');if(!b)return;
  $('#det').textContent='Loading...';
  try{const d=await getJSON(b.dataset.u);$('#det').innerHTML=`<h3 class="f text-3xl text-bone mb-3">${esc(d.name||'')}</h3>${rend(d)}`;$('#det').scrollTop=0}
  catch(err){$('#det').innerHTML='<p class="text-ember">Could not load that entry. Try again.</p>'}
});
$('#cat').onchange=list;$('#q').oninput=list;

/* ---------- about ---------- */
$('#wipe').onclick=()=>{if(confirm('Erase your character sheet and all notes? This cannot be undone.')){try{localStorage.removeItem('wf_char');localStorage.removeItem('wf_notes')}catch(e){}char={};notes=[];open.clear();buildSheet();renderNotes();show('home')}};

/* ---------- init ---------- */
buildSheet();renderNotes();list();
show(location.hash.slice(1));
