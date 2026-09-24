const legacyCompleted=JSON.parse(localStorage.getItem('ielts-completed-questions')||'[]');
const progressRecords=JSON.parse(localStorage.getItem('ielts-progress-v2')||'{}');
if(!Object.keys(progressRecords).length)legacyCompleted.forEach(id=>{progressRecords[id]={completed:true,updated_at:1}});
const state={view:'current',currentFamily:'p1',categoryFamily:'p1',categoryTopic:'',search:'',writingTab:'questions',browseMode:localStorage.getItem('ielts-browse-mode')==='list'?'list':'deck',completed:new Set(Object.entries(progressRecords).filter(([,item])=>item.completed).map(([id])=>id))};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const api=async(path,options={})=>{const r=await fetch(path,{headers:{'Content-Type':'application/json'},...options});const data=await r.json();if(!r.ok)throw new Error(data.error||'请求失败');return data};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let resourceHighlights={};
try{resourceHighlights=JSON.parse(localStorage.getItem('ielts-resource-highlights-v1')||'{}')||{}}catch(_error){resourceHighlights={}}
function sentenceChunks(text){const result=[];String(text||'').split(/\n{2,}/).forEach(paragraph=>{const value=paragraph.replace(/\s+/g,' ').trim();if(!value)return;if(/^(?:[-–—•]|\d+[.)]\s)/.test(value)){result.push(value);return}const pieces=value.match(/[^.!?。！？]+(?:[.!?。！？]+["'’”)]*)?|[^.!?。！？]+$/g)||[value];pieces.map(item=>item.trim()).filter(Boolean).forEach(item=>result.push(item))});return result}
function resourceTextMarkup(resource,page,toc){if(toc)return `<div class="resource-page-text">${esc(page.text.replace(/\n{2,}/g,'\n'))}</div>`;return `<div class="resource-page-text resource-sentences">${sentenceChunks(page.text).map((sentence,index)=>{const key=`${resource.id}:${page.page_number}:${index}`;const heading=sentence.length<105&&(/^(?:IELTS (?:Writing Task 2|Advice):|Note:|Task:|第[一二三四五六七八九十]+种类型|[一二三四五六七八九十]+、|\d+、)/i.test(sentence)||/[?:：]$/.test(sentence)||(/（[^）]+）/.test(sentence)&&sentence.length<55));return `<button type="button" class="reading-line${resourceHighlights[key]?' is-highlighted':''}${heading?' is-heading':''}" data-highlight-key="${esc(key)}">${esc(sentence)}</button>`}).join('')}</div>`}
function resourceOutlineMarkup(resource){const items=resource.outline||[];if(!items.length)return'';const groups={};items.forEach(item=>(groups[item.group]||(groups[item.group]=[])).push(item));return `<details class="resource-outline"><summary><span>章节导航</span><small>${items.length} 个分类</small></summary><div class="resource-outline-body">${Object.entries(groups).map(([group,entries])=>`<section><h3>${esc(group)}</h3><div>${entries.map(item=>`<button type="button" data-outline-page="${item.page}">${esc(item.title)}</button>`).join('')}</div></section>`).join('')}</div></details>`}
function bindResourceTools(resource){let markerMode=false;const marker=$('#resource-marker');marker.onclick=()=>{markerMode=!markerMode;marker.setAttribute('aria-pressed',String(markerMode));marker.textContent=markerMode?'记号笔 开':'记号笔';$('#detail-content').classList.toggle('marker-mode',markerMode)};$$('[data-outline-page]').forEach(button=>button.onclick=()=>{document.querySelector(`#resource-page-${button.dataset.outlinePage}`)?.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'start'});button.closest('details').open=false});$$('.reading-line').forEach(line=>line.onclick=()=>{if(!markerMode)return;const key=line.dataset.highlightKey;const enabled=!line.classList.contains('is-highlighted');line.classList.toggle('is-highlighted',enabled);if(enabled)resourceHighlights[key]=true;else delete resourceHighlights[key];localStorage.setItem('ielts-resource-highlights-v1',JSON.stringify(resourceHighlights))})}
const coverThumb=url=>String(url||'').replace(/(\/assets\/(?:topic|category)-covers\/)([^/]+\.webp)$/,'$1thumbs/$2');
const writingThumb=url=>String(url||'').replace('/assets/writing-illustrations/','/assets/writing-illustrations/thumbs/');
const partName=p=>({part1:'Part 1',part2:'Part 2',part3:'Part 3',task1:'写作 Task 1',task2:'写作 Task 2'}[p]||p);
const topicName=k=>window.topicCache?.find(t=>t.key===k)?.name||k||'未分类';
const seasonRange=(date=new Date())=>{const month=date.getMonth()+1;const start=month<=4?1:month<=8?5:9;return{year:date.getFullYear(),start,end:start+3}};
const monthAbbr=month=>['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][month-1];
const currentSeasonEnglish=()=>{const s=seasonRange();return`${monthAbbr(s.start)} — ${monthAbbr(s.end)} ${s.year}`};
const currentSeasonChinese=()=>{const s=seasonRange();return`${s.year}年${s.start}–${s.end}月`};
function groupSeasonLabel(value){const match=String(value||'').match(/^(\d{4})-(\d{1,2})\/(\d{1,2})$/);return match?`${match[1]}年${Number(match[2])}–${Number(match[3])}月`:currentSeasonChinese()}
function updateSeasonLabel(){const label=$('#season-label');if(label)label.textContent=currentSeasonEnglish()}
let questionNotes={};
try{questionNotes=JSON.parse(localStorage.getItem('ielts-question-notes-v1')||'{}')||{}}catch(_error){questionNotes={}}
const lastStudyKey='ielts-last-study-v1';
function lastStudy(){try{return JSON.parse(localStorage.getItem(lastStudyKey)||'null')}catch(_error){return null}}
function rememberStudy(groupId,questionId='',family=''){
  if(!groupId)return;
  const previous=lastStudy();
  localStorage.setItem(lastStudyKey,JSON.stringify({groupId,questionId:questionId||(previous?.groupId===groupId?previous.questionId:''),family:family||(previous?.groupId===groupId?previous.family:''),updatedAt:Date.now()}));
}
function noteMarkup(questionId){const has=Boolean(String(questionNotes[questionId]||'').trim());return `<div class="question-note ${has?'has-note':''}"><button class="note-toggle" type="button" data-note-toggle="${questionId}" aria-expanded="false">✎ 备忘录</button><div class="note-editor" data-note-editor="${questionId}" hidden><textarea data-note-input="${questionId}" rows="4" maxlength="3000" placeholder="写下关键词、表达思路或自己的例子…">${esc(questionNotes[questionId]||'')}</textarea><small>自动保存在当前设备</small></div></div>`}
function bindNoteEditors(groupId=''){
  $$('[data-note-toggle]').forEach(button=>button.onclick=()=>{const id=button.dataset.noteToggle;const editor=document.querySelector(`[data-note-editor="${CSS.escape(id)}"]`);const input=editor.querySelector('textarea');const opening=editor.hidden;if(!opening)input?.blur();editor.hidden=!opening;button.setAttribute('aria-expanded',String(opening));rememberStudy(groupId,id);if(opening){input?.focus({preventScroll:true});input?.scrollIntoView({block:'nearest'});if(!reduceMotion())editor.animate([{opacity:0,transform:'translateY(-5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.23,1,.32,1)'})}});
  $$('[data-note-input]').forEach(input=>input.oninput=()=>{const id=input.dataset.noteInput;questionNotes[id]=input.value;rememberStudy(groupId,id);localStorage.setItem('ielts-question-notes-v1',JSON.stringify(questionNotes));input.closest('.question-note')?.classList.toggle('has-note',Boolean(input.value.trim()))});
}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
function saveProgress(questionId,completed){progressRecords[questionId]={completed,updated_at:Date.now()};localStorage.setItem('ielts-progress-v2',JSON.stringify(progressRecords));localStorage.setItem('ielts-completed-questions',JSON.stringify([...state.completed]))}
async function syncProgress(){
  const syncKey=localStorage.getItem('ielts-sync-key')||'';
  const headers={'Content-Type':'application/json',...(syncKey?{'X-Sync-Key':syncKey}:{})};
  try{
    await api('/api/progress',{method:'POST',headers,body:JSON.stringify({changes:Object.entries(progressRecords).map(([question_id,item])=>({question_id,...item}))})});
    const response=await fetch('/api/progress',{headers:syncKey?{'X-Sync-Key':syncKey}:{}});
    if(!response.ok)throw new Error('进度同步失败');
    const remote=await response.json();
    remote.forEach(item=>{const local=progressRecords[item.question_id];if(!local||item.updated_at>=local.updated_at)progressRecords[item.question_id]=item});
    state.completed=new Set(Object.entries(progressRecords).filter(([,item])=>item.completed).map(([id])=>id));
    localStorage.setItem('ielts-progress-v2',JSON.stringify(progressRecords));
    localStorage.setItem('ielts-completed-questions',JSON.stringify([...state.completed]));
  }catch(_error){}
}
function completedCount(g){return (g.question_ids||g.questions?.map(q=>q.id)||[]).filter(id=>state.completed.has(id)).length}
function dailyOrderValue(group,family){
  const seed=`${new Date().toLocaleDateString('en-CA')}|${family}|${group.id}`;
  let value=2166136261;
  for(let i=0;i<seed.length;i++){value^=seed.charCodeAt(i);value=Math.imul(value,16777619)}
  return value>>>0;
}
function orderGroupsForStudy(groups,family){
  const bucket=group=>{
    const done=completedCount(group);
    const total=group.question_count||(group.question_ids||group.questions||[]).length;
    if(group.season_status==='new'&&done<total)return 0;
    if(done>0&&done<total)return 1;
    if(done===0)return 2;
    return 3;
  };
  return [...groups].sort((a,b)=>bucket(a)-bucket(b)||dailyOrderValue(a,family)-dailyOrderValue(b,family));
}
function toggleCompleted(questionId,groupId){state.completed.has(questionId)?state.completed.delete(questionId):state.completed.add(questionId);rememberStudy(groupId,questionId);saveProgress(questionId,state.completed.has(questionId));void syncProgress();openSpeakingTopic(groupId);loadSpeakingGroups('#current-topic-list',state.currentFamily);if(state.categoryTopic)loadSpeakingGroups('#category-topic-list',state.categoryFamily,state.categoryTopic)}
let backdropCloseTimer;
let drawerSwipe=null;
let drawerSwipeTimer;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function setDetailContent(markup){const drawer=$('#detail-drawer');const content=$('#detail-content');const wasOpen=drawer.classList.contains('open');const previousScroll=drawer.scrollTop;content.innerHTML=markup;if(wasOpen){drawer.scrollTop=previousScroll;if(!reduceMotion())animateSurface(content)}else drawer.scrollTop=0}
function resetDrawerSwipe(){
  const drawer=$('#detail-drawer');const backdrop=$('#drawer-backdrop');
  clearTimeout(drawerSwipeTimer);drawerSwipe=null;drawer.classList.remove('is-swipe-dragging','is-swipe-settling');
  drawer.style.removeProperty('transform');drawer.style.removeProperty('transition');backdrop.style.removeProperty('opacity');backdrop.style.removeProperty('transition');
}
function openDrawer(immediate=false){const drawer=$('#detail-drawer');const backdrop=$('#drawer-backdrop');if(drawer.classList.contains('open'))return;resetDrawerSwipe();clearTimeout(backdropCloseTimer);drawer.inert=false;backdrop.hidden=false;const reveal=()=>{drawer.classList.add('open');backdrop.classList.add('visible')};immediate?reveal():requestAnimationFrame(reveal);drawer.setAttribute('aria-hidden','false')}
function closeDrawer(){const drawer=$('#detail-drawer');const backdrop=$('#drawer-backdrop');if(!drawer.classList.contains('open'))return;if(activeTopicTransition)activeTopicTransition.skipTransition();activeCoverMorph?.cancel();drawer.classList.remove('morph-open','open');resetDrawerSwipe();backdrop.classList.remove('visible');drawer.setAttribute('aria-hidden','true');drawer.inert=true;clearTimeout(backdropCloseTimer);backdropCloseTimer=setTimeout(()=>{if(!drawer.classList.contains('open'))backdrop.hidden=true},260)}
function bindDrawerSwipe(){
  const drawer=$('#detail-drawer');const backdrop=$('#drawer-backdrop');
  drawer.addEventListener('pointerdown',event=>{
    if(drawerSwipe||!drawer.classList.contains('open')||!matchMedia('(max-width: 680px)').matches)return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    if(event.target.closest('button,a,input,select,textarea,summary'))return;
    drawerSwipe={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastAt:performance.now(),velocity:0,distance:0,dragging:false};
  });
  drawer.addEventListener('pointermove',event=>{
    if(!drawerSwipe||event.pointerId!==drawerSwipe.id)return;
    const dx=event.clientX-drawerSwipe.startX;const dy=event.clientY-drawerSwipe.startY;
    if(!drawerSwipe.dragging){
      if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){drawerSwipe=null;return}
      if(dx<=8||dx<Math.abs(dy)*1.15)return;
      drawerSwipe.dragging=true;drawer.classList.add('is-swipe-dragging');drawer.setPointerCapture?.(event.pointerId);
    }
    if(event.cancelable)event.preventDefault();
    const now=performance.now();const elapsed=Math.max(1,now-drawerSwipe.lastAt);
    drawerSwipe.velocity=(event.clientX-drawerSwipe.lastX)/elapsed;drawerSwipe.lastX=event.clientX;drawerSwipe.lastAt=now;
    drawerSwipe.distance=Math.max(0,Math.min(dx,drawer.offsetWidth));
    if(!reduceMotion()){
      drawer.style.transform=`translate3d(${drawerSwipe.distance}px,0,0)`;
      backdrop.style.opacity=String(Math.max(0,1-drawerSwipe.distance/drawer.offsetWidth));
    }
  },{passive:false});
  const finish=(event,cancelled=false)=>{
    if(!drawerSwipe||event.pointerId!==drawerSwipe.id)return;
    const swipe=drawerSwipe;drawerSwipe=null;
    if(!swipe.dragging)return;
    if(drawer.hasPointerCapture?.(event.pointerId))drawer.releasePointerCapture(event.pointerId);
    const dismiss=!cancelled&&(swipe.distance>=Math.min(180,drawer.offsetWidth*.28)||swipe.velocity>0.11);
    drawer.classList.remove('is-swipe-dragging');
    if(reduceMotion()){dismiss?closeDrawer():resetDrawerSwipe();return}
    drawer.classList.add('is-swipe-settling');
    drawer.style.transition='transform 260ms var(--ease-drawer)';
    backdrop.style.transition='opacity 220ms var(--ease-out)';
    if(dismiss){
      drawer.style.transform='translate3d(105%,0,0)';backdrop.style.opacity='0';
      drawerSwipeTimer=setTimeout(closeDrawer,260);
    }else{
      drawer.style.transform='translate3d(0,0,0)';backdrop.style.opacity='1';
      drawerSwipeTimer=setTimeout(resetDrawerSwipe,260);
    }
  };
  drawer.addEventListener('pointerup',event=>finish(event));
  drawer.addEventListener('pointercancel',event=>finish(event,true));
}

async function loadStats(){const [p1,p23]=await Promise.all([api('/api/speaking-topics?part_group=p1'),api('/api/speaking-topics?part_group=p23')]);const questions=[...p1,...p23].reduce((n,g)=>n+g.question_count,0);$('#stats').innerHTML=`<div class="stat"><strong>${p1.length+p23.length}</strong><small>口语话题</small></div><div class="stat"><strong>${questions}</strong><small>独立小题</small></div>`}
async function loadTopics(){const topics=await api('/api/topics');window.topicCache=topics;$('#topic-grid').innerHTML=topics.map((t,i)=>{const inks=t.palette?.inks||['#2148B8','#C65F38'];const visual=t.cover_url?`<span class="category-visual"><img src="${esc(coverThumb(t.cover_url))}" alt="" loading="lazy" decoding="async"></span>`:'<span class="category-visual category-placeholder"></span>';return `<button class="topic-card" data-topic="${t.key}" style="--cover-a:${esc(inks[0])};--cover-b:${esc(inks[1])}">${visual}<span class="topic-card-content"><span class="topic-icon">${String(i+1).padStart(2,'0')}</span><strong>${t.count}</strong><h2>${esc(t.name)}</h2><p>${esc(t.description)}</p></span></button>`}).join('');$$('.topic-card').forEach(card=>card.onclick=()=>showCategory(card.dataset.topic))}
function coverVisual(g,loading='lazy'){const keys=(g.keywords||[]).slice(0,3);const inks=g.palette?.inks||['#2148B8','#C65F38'];const priority=loading==='eager'?' fetchpriority="high"':'';const image=g.cover_url?`<img src="${esc(coverThumb(g.cover_url))}" alt="" loading="${loading}" decoding="async"${priority} draggable="false">`:'<span class="cover-plate" aria-hidden="true"></span><span class="cover-pending">封面生成中</span>';return `<div class="topic-cover ${g.cover_url?'has-cover':'is-placeholder'}" style="--cover-a:${esc(inks[0])};--cover-b:${esc(inks[1])}">${image}<div class="cover-keywords" aria-label="主题关键词：${keys.map(esc).join('、')}">${keys.map((k,i)=>`<span class="cover-keyword k${i+1}">${esc(k)}</span>`).join('')}</div><span class="cover-number" aria-hidden="true">${g.family==='p1'?'P1':'P2·3'}</span></div>`}
function groupCard(g,coverLoading='lazy'){
  const count=g.family==='p1'?`共 ${g.question_count} 个问题`:`1 道 Part 2 · ${g.p3_count} 道 Part 3`;
  const done=completedCount(g);
  const percent=g.question_count?Math.round(done/g.question_count*100):0;
  const status=g.season_status==='new'?'<span class="new-badge">当季新题</span>':'<span class="keep-badge">本季在考</span>';
  const inks=g.palette?.inks||['#2148B8','#C65F38'];
  const previews=(g.preview_questions||[]).map((q,i)=>`<li><span>${String(i+1).padStart(2,'0')} · ${partName(q.part)}</span><strong>${esc(q.text)}</strong></li>`).join('');
  return `<article class="speaking-topic-card ${done===g.question_count?'topic-complete':''}" style="--cover-a:${esc(inks[0])};--cover-b:${esc(inks[1])}" data-group-id="${g.id}" tabindex="0">${coverVisual(g,coverLoading)}<div class="topic-card-copy"><div class="topic-card-top"><div>${status}<h2>${esc(g.title)}</h2></div><span class="season">${esc(groupSeasonLabel(g.season))}</span></div><p>${count} · 已练 <b>${done}/${g.question_count}</b></p><div class="progress-track" aria-label="练习进度 ${percent}%"><span style="width:${percent}%"></span></div><div class="topic-preview" aria-hidden="true"><div class="preview-label"><span>题目速览</span><span>PREVIEW / ${g.question_count}</span></div><ol>${previews}</ol></div><div class="topic-card-foot"><span>${g.family==='p1'?'Part 1':'P2 · P3'}</span><span>${esc(topicName(g.topic))}</span><button>去练习 →</button></div></div></article>`;
}
const finePointer=()=>matchMedia('(hover: hover) and (pointer: fine)').matches;
let spotlightObserver;
function setSpotlight(card,instant=false){
  if(!card||$('#detail-drawer').classList.contains('open'))return;
  const box=card.parentElement;
  box.querySelectorAll('.speaking-topic-card.is-spotlight').forEach(other=>{
    if(other===card)return;
    other.classList.remove('is-spotlight','instant-spotlight');
    other.querySelector('.topic-preview')?.setAttribute('aria-hidden','true');
  });
  card.classList.toggle('instant-spotlight',instant);
  card.classList.add('is-spotlight');
  card.querySelector('.topic-preview')?.setAttribute('aria-hidden','false');
  if(box.classList.contains('deck-track')){
    const cards=[...box.querySelectorAll('.speaking-topic-card')];
    const index=cards.indexOf(card);
    if(box._layerCards){
      box._layerCards.forEach(layer=>layer.classList.remove('is-deck-prev','is-deck-next','is-deck-prev-2','is-deck-next-2'));
    }
    const layers=[
      [index-2,'is-deck-prev-2'],
      [index-1,'is-deck-prev'],
      [index+1,'is-deck-next'],
      [index+2,'is-deck-next-2'],
    ];
    box._layerCards=layers.map(([at,className])=>{
      const layer=cards[at];
      layer?.classList.add(className);
      return layer;
    }).filter(Boolean);
    const shell=box.closest('.deck-shell');
    const counter=shell.querySelector('.deck-counter');
    counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
    shell.querySelector('.deck-prev').disabled=index===0;
    shell.querySelector('.deck-next').disabled=index===cards.length-1;
    shell.style.setProperty('--deck-a',card.style.getPropertyValue('--cover-a'));
    shell.style.setProperty('--deck-b',card.style.getPropertyValue('--cover-b'));
  }
}
function clearSpotlight(card){card.classList.remove('is-spotlight','instant-spotlight');card.querySelector('.topic-preview')?.setAttribute('aria-hidden','true')}
function centerDeckCard(track,card,behavior=reduceMotion()?'auto':'smooth'){
  if(!track||!card)return;
  track.scrollTo({left:card.offsetLeft+card.offsetWidth/2-track.clientWidth/2,behavior});
}
function spotlightFromViewport(box){
  if($('#detail-drawer').classList.contains('open'))return;
  const track=box.querySelector('.deck-track');
  if(track&&!box.classList.contains('is-list')){
    const center=track.scrollLeft+track.clientWidth/2;
    const nearest=[...track.querySelectorAll('.speaking-topic-card')]
      .reduce((best,card)=>!best||Math.abs(card.offsetLeft+card.offsetWidth/2-center)<Math.abs(best.offsetLeft+best.offsetWidth/2-center)?card:best,null);
    if(nearest)setSpotlight(nearest);
    return;
  }
  const hovered=finePointer()?box.querySelector('.speaking-topic-card:hover'):null;
  if(hovered){setSpotlight(hovered);return}
  const center=window.innerHeight*.52;
  const cards=[...box.querySelectorAll('.speaking-topic-card')];
  const nearest=cards.filter(card=>{const r=card.querySelector('.topic-cover').getBoundingClientRect();return r.bottom>0&&r.top<window.innerHeight})
    .sort((a,b)=>{const ar=a.querySelector('.topic-cover').getBoundingClientRect();const br=b.querySelector('.topic-cover').getBoundingClientRect();return Math.abs((ar.top+ar.bottom)/2-center)-Math.abs((br.top+br.bottom)/2-center)})[0];
  if(nearest)setSpotlight(nearest);else box.querySelectorAll('.speaking-topic-card.is-spotlight').forEach(clearSpotlight);
}
function bindGroupCards(box){
  box.querySelectorAll('[data-group-id]').forEach(card=>{
    card.onclick=e=>{
      if(Date.now()-(box.querySelector('.deck-track')?._lastDragAt||0)<280)return;
      if(!box.classList.contains('is-list')&&!card.classList.contains('is-spotlight')){
        centerDeckCard(box.querySelector('.deck-track'),card);
        return;
      }
      openSpeakingTopic(card.dataset.groupId,e.detail===0?null:card);
    };
    card.onkeydown=e=>{if(e.key==='Enter'&&e.target===card){e.preventDefault();openSpeakingTopic(card.dataset.groupId)}};
    card.onpointerenter=()=>{if(finePointer()&&box.classList.contains('is-list'))setSpotlight(card)};
    card.onpointerleave=()=>{if(finePointer()&&box.classList.contains('is-list')&&!card.matches(':focus-within'))spotlightFromViewport(box)};
    card.onfocus=()=>{if(!box.classList.contains('is-list'))centerDeckCard(track,card,'auto');setSpotlight(card,true)};
    card.onblur=()=>{if(finePointer()&&box.classList.contains('is-list'))clearSpotlight(card)};
  });
  const track=box.querySelector('.deck-track');
  if(track){
    track.ondragstart=e=>e.preventDefault();
    let pending=false;
    track.onscroll=()=>{if(pending||box.classList.contains('is-list'))return;pending=true;requestAnimationFrame(()=>{pending=false;spotlightFromViewport(box)})};
    let drag=null;
    track.onpointerdown=e=>{
      if(box.classList.contains('is-list')||(e.pointerType!=='touch'&&e.button!==0)||drag)return;
      const cards=[...track.querySelectorAll('.speaking-topic-card')];
      const active=track.querySelector('.is-spotlight')||cards[0];
      drag={id:e.pointerId,x:e.clientX,scroll:track.scrollLeft,index:cards.indexOf(active),step:cards[1]?.offsetLeft-cards[0]?.offsetLeft||track.clientWidth*.25,moved:false};
    };
    track.onpointermove=e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const distance=e.clientX-drag.x;
      if(!drag.moved&&Math.abs(distance)<5)return;
      if(!drag.moved){drag.moved=true;track.setPointerCapture(e.pointerId);track.classList.add('is-dragging')}
      e.preventDefault();
      const reach=track.clientWidth/2;
      track.scrollLeft=drag.scroll-Math.sign(distance)*Math.min(Math.abs(distance)/reach,1)*drag.step;
    };
    const endDrag=e=>{
      if(!drag||e.pointerId!==drag.id)return;
      if(drag.moved){
        track._lastDragAt=Date.now();
        track.classList.remove('is-dragging');
        if(track.hasPointerCapture(e.pointerId))track.releasePointerCapture(e.pointerId);
        const cards=[...track.querySelectorAll('.speaking-topic-card')];
        const distance=e.clientX-drag.x;
        const delta=Math.abs(distance)>track.clientWidth*.2?-Math.sign(distance):0;
        centerDeckCard(track,cards[Math.max(0,Math.min(cards.length-1,drag.index+delta))]);
      }
      drag=null;
    };
    track.onpointerup=endDrag;
    track.onpointercancel=endDrag;
    const move=step=>{
      const cards=[...track.querySelectorAll('.speaking-topic-card')];
      const active=track.querySelector('.is-spotlight')||cards[0];
      const next=cards[cards.indexOf(active)+step];
      centerDeckCard(track,next);
    };
    track.onwheel=e=>{
      if(box.classList.contains('is-list')||Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;
      e.preventDefault();
      if(Date.now()<(track._wheelLockUntil||0))return;
      track._wheelLockUntil=Date.now()+450;
      move(Math.sign(e.deltaX));
    };
    box.querySelector('.deck-prev').onclick=()=>move(-1);
    box.querySelector('.deck-next').onclick=()=>move(1);
    box.querySelector('.deck-mode-switch').onclick=()=>{
      box.classList.toggle('is-list');
      state.browseMode=box.classList.contains('is-list')?'list':'deck';
      localStorage.setItem('ielts-browse-mode',state.browseMode);
      box.querySelector('.deck-mode-switch').textContent=state.browseMode==='list'?'◫ 卡片浏览':'▤ 列表浏览';
      box.querySelector('.deck-bottom>span').textContent=state.browseMode==='list'?'向下浏览 · 点开话题逐题练习':'左右滑动 · 当前卡片可预览题目';
      if(state.browseMode==='deck'){
        const active=track.querySelector('.is-spotlight')||track.firstElementChild;
        if(active){
          const trackRect=track.getBoundingClientRect();
          const cardRect=active.getBoundingClientRect();
          track.scrollLeft+=cardRect.left+cardRect.width/2-(trackRect.left+trackRect.width/2);
        }
        box.querySelector('.deck-shell').scrollIntoView({behavior:'auto',block:'start'});
      }
      bindGroupCards(box);
    };
  }
  if(spotlightObserver)spotlightObserver.disconnect();
  if(!box.closest('.view.active'))return;
  if(box.classList.contains('is-list')){
    spotlightObserver=new IntersectionObserver(()=>spotlightFromViewport(box),{threshold:[.1,.5,.9]});
    box.querySelectorAll('.speaking-topic-card').forEach(card=>spotlightObserver.observe(card));
  }
  spotlightFromViewport(box);
}
async function loadSpeakingGroups(target,family,topic=''){
  if(family==='materials')return loadSpeakingMaterials(target);
  const box=$(target);
  const toolbar=box.closest('.view')?.querySelector('.speaking-tabs');
  toolbar?.querySelector('.deck-toolbar-navigation')?.remove();
  toolbar?.classList.remove('has-deck-navigation','is-list-mode');
  box.innerHTML='<div class="empty-state"><strong>正在整理话题…</strong></div>';
  const q=new URLSearchParams({part_group:family});
  if(topic)q.set('topic',topic);
  if(state.search)q.set('q',state.search);
  const groups=orderGroupsForStudy(await api('/api/speaking-topics?'+q),family);
  box.className='topic-list deck-browser';
  box.classList.toggle('is-list',state.browseMode==='list');
  box.innerHTML=groups.length?`<div class="deck-shell" style="--deck-a:${esc(groups[0].palette?.inks?.[0]||'#2148b8')};--deck-b:${esc(groups[0].palette?.inks?.[1]||'#c65f38')}"><div class="deck-ambient deck-ambient-a" aria-hidden="true"></div><div class="deck-ambient deck-ambient-b" aria-hidden="true"></div><div class="deck-navigation deck-toolbar-navigation"><button class="deck-prev" aria-label="上一个话题">←</button><span class="deck-counter" aria-live="polite">01 / ${String(groups.length).padStart(2,'0')}</span><button class="deck-next" aria-label="下一个话题">→</button></div><div class="deck-track" tabindex="0" aria-label="口语话题封面牌组，左右滑动切换">${groups.slice(0,3).map(g=>groupCard(g,'eager')).join('')}</div><div class="deck-bottom"><span>滑动或点封面换题 · 点击去练习查看小题</span><button class="deck-mode-switch">${state.browseMode==='list'?'◫ 卡片浏览':'▤ 列表浏览'}</button></div><div class="deck-list">${groups.map(groupCard).join('')}</div></div>`:'<div class="empty-state"><strong>没有匹配的话题</strong><span>清除筛选或换个关键词试试。</span></div>';
  if(groups.length){
    const navigation=box.querySelector('.deck-toolbar-navigation');
    toolbar?.append(navigation);
    toolbar?.classList.add('has-deck-navigation');
    toolbar?.classList.toggle('is-list-mode',state.browseMode==='list');
    bindPhotoDeck(box,groups,navigation,toolbar);
    if(topic)revealCategoryDeck(box);
  }
}
function materialCard(material,index){
  const inks=material.palette?.inks||['#315cc1','#c65f38'];
  return `<article class="material-card" data-material-id="${esc(material.id)}" tabindex="0" style="--material-a:${esc(inks[0])};--material-b:${esc(inks[1])}"><div class="material-card-number">${String(index+1).padStart(2,'0')}</div><div><span class="material-card-label">PART 2 万能语料</span><h2>${esc(material.title)}</h2><p>${esc(material.preview||'打开查看完整故事提纲与可套用题目。')}</p><div class="material-card-meta"><span>${material.variants.length} 个版本</span><span>适配 ${material.question_count} 道题</span></div></div><button type="button" aria-label="打开 ${esc(material.title)}">→</button></article>`;
}
async function loadSpeakingMaterials(target){
  const box=$(target);
  const toolbar=box.closest('.view')?.querySelector('.speaking-tabs');
  toolbar?.querySelector('.deck-toolbar-navigation')?.remove();
  toolbar?.classList.remove('has-deck-navigation','is-list-mode');
  box.className='topic-list material-library';
  box.innerHTML='<div class="empty-state"><strong>正在整理万能语料…</strong></div>';
  let materials=await api('/api/speaking-materials');
  window.speakingMaterialCache=materials;
  const term=state.search.trim().toLowerCase();
  if(term)materials=materials.filter(material=>(material.title+' '+material.preview+' '+material.topics.map(topic=>topic.title).join(' ')).toLowerCase().includes(term));
  box.innerHTML=materials.length?`<header class="material-library-intro"><span>10 STORY BANKS</span><h2>十组故事母题</h2><p>先熟悉完整故事，再查看它能套用到哪些 Part 2 题目。</p></header><div class="material-grid">${materials.map(materialCard).join('')}</div>`:'<div class="empty-state"><strong>没有匹配的万能语料</strong><span>换个关键词试试。</span></div>';
  $$('.material-card').forEach(card=>{const open=()=>openSpeakingMaterial(card.dataset.materialId);card.onclick=open;card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}}});
  animateSurface(box);
}
async function openSpeakingMaterial(id){
  let materials=window.speakingMaterialCache||await api('/api/speaking-materials');
  const material=materials.find(item=>item.id===id);
  if(!material){toast('没有找到这组语料');return}
  const drawer=$('#detail-drawer');
  drawer.classList.remove('writing-detail','resource-detail');
  drawer.classList.add('material-detail');
  const variants=material.variants.map((variant,index)=>`<section class="material-variant"><div class="material-variant-head"><span>版本 ${String(index+1).padStart(2,'0')}</span><strong>${esc(variant.label)}</strong></div>${resourceTextMarkup({id:`material-${material.id}`},{page_number:index+1,text:variant.text},false)}</section>`).join('');
  const topics=material.topics.map(topic=>`<button type="button" data-material-topic="${esc(topic.id)}">${esc(topic.title)}</button>`).join('');
  setDetailContent(`<article class="material-reader"><header><span class="detail-label">PART 2 · 万能语料</span><h2>${esc(material.title)}</h2><p>${material.variants.length} 个版本 · 可套用 ${material.question_count} 道题</p></header><div class="resource-tools simple"><button type="button" id="resource-marker" class="resource-marker" aria-pressed="false">记号笔</button></div>${variants}<section class="material-related"><span>RELATED CUE CARDS</span><h3>可套用题目</h3><div>${topics}</div></section></article>`);
  openDrawer();bindResourceTools();
  $$('[data-material-topic]').forEach(button=>button.onclick=()=>openSpeakingTopic(button.dataset.materialTopic));
}
const deckPose=[
  'translate3d(0,0,96px) rotateY(0deg) rotateZ(0deg) scale(1)',
  'translate3d(28px,14px,40px) rotateY(-5deg) rotateZ(3deg) scale(.94)',
  'translate3d(-26px,25px,-12px) rotateY(5deg) rotateZ(-4deg) scale(.88)'
];
function bindPhotoDeck(box,groups,navigation,toolbar){
  if(spotlightObserver)spotlightObserver.disconnect();
  const shell=box.querySelector('.deck-shell');
  const track=box.querySelector('.deck-track');
  const cards=[...track.querySelectorAll('.speaking-topic-card')];
  let order=cards.map((_,slot)=>slot),active=0,busy=false,gesture=null;
  const ambientA=shell.querySelector('.deck-ambient-a');
  const ambientB=shell.querySelector('.deck-ambient-b');
  const gs=window.gsap;
  const index=n=>(n+groups.length)%groups.length;
  const image=g=>g.cover_url?`url("${coverThumb(g.cover_url).replace(/["\\]/g,'')}")`:'none';
  const syncTrackHeight=()=>{
    const front=track.querySelector('.speaking-topic-card.is-spotlight')||cards[order[0]];
    if(!front||(busy&&!track.querySelector('.speaking-topic-card.is-spotlight')))return;
    const trackTop=track.getBoundingClientRect().top;
    const visualBottom=front.getBoundingClientRect().bottom;
    track.style.height=`${Math.ceil(visualBottom-trackTop+14)}px`;
  };
  const cardSizeObserver=new ResizeObserver(syncTrackHeight);
  cards.forEach(card=>cardSizeObserver.observe(card));
  const pose=(card,rank)=>{
    if(gs)gs.set(card,{transform:deckPose[rank],zIndex:3-rank});
    else{card.style.transform=deckPose[rank];card.style.zIndex=String(3-rank)}
  };
  const replaceCard=(card,g)=>{
    const template=document.createElement('template');template.innerHTML=groupCard(g,'eager');
    const fresh=template.content.firstElementChild;
    card.className=fresh.className;card.style.cssText=fresh.style.cssText;
    card.dataset.groupId=fresh.dataset.groupId;card.innerHTML=fresh.innerHTML;
  };
  const revealPreview=frontCard=>{
    cards.forEach(card=>{
      const visible=card===frontCard;
      card.classList.toggle('is-spotlight',visible);
      card.querySelector('.topic-preview')?.setAttribute('aria-hidden',visible?'false':'true');
    });
  };
  const showFront=()=>{
    track.dataset.order=order.join(',');
    revealPreview(cards[order[0]]);
    order.forEach((slot,rank)=>{
      const card=cards[slot];
      card.setAttribute('aria-hidden',rank===0?'false':'true');
      card.tabIndex=rank===0?0:-1;
      pose(card,rank);
    });
    navigation.querySelector('.deck-counter').textContent=`${String(active+1).padStart(2,'0')} / ${String(groups.length).padStart(2,'0')}`;
    navigation.querySelector('.deck-prev').disabled=groups.length<2;
    navigation.querySelector('.deck-next').disabled=groups.length<2;
    const g=groups[active];
    shell.style.setProperty('--deck-a',g.palette?.inks?.[0]||'#2148b8');
    shell.style.setProperty('--deck-b',g.palette?.inks?.[1]||'#c65f38');
    window.setIeltsBackgroundTheme?.(g.palette?.inks?.[0]||'#2148b8',g.palette?.inks?.[1]||'#c65f38');
    ambientA.style.backgroundImage=image(g);
    ambientA.style.opacity='1';ambientB.style.opacity='0';
    requestAnimationFrame(syncTrackHeight);
  };
  const complete=(nextOrder,nextActive,refresh)=>{
    order=nextOrder;active=nextActive;
    if(refresh)replaceCard(refresh.card,groups[refresh.groupIndex]);
    busy=false;showFront();
  };
  const advance=(direction=1,extractSign=1,instant=false)=>{
    if(busy||groups.length<2||box.classList.contains('is-list'))return;
    if(cards.length===2&&direction<0)direction=1;
    busy=true;
    const front=cards[order[0]],second=cards[order[1]],third=cards[order[2]];
    const nextActive=index(active+direction);
    const rear=direction>0?front:third||front;
    const nextOrder=direction>0?(third?[order[1],order[2],order[0]]:[order[1],order[0]]):(third?[order[2],order[0],order[1]]:[order[1],order[0]]);
    if(direction<0&&third){replaceCard(third,groups[nextActive]);pose(third,2)}
    const refresh=direction>0&&groups.length>cards.length?{card:front,groupIndex:index(active+cards.length)}:null;
    const finish=()=>complete(nextOrder,nextActive,refresh);
    ambientB.style.backgroundImage=image(groups[nextActive]);
    window.setIeltsBackgroundTheme?.(groups[nextActive].palette?.inks?.[0]||'#2148b8',groups[nextActive].palette?.inks?.[1]||'#c65f38');
    if(instant||reduceMotion()||!gs){finish();return}
    revealPreview(null);
    gs.set(ambientB,{opacity:0});
    const tl=gs.timeline({onComplete:finish});
    const exit=`translate3d(${extractSign*78}%, -7%, 132px) rotateY(${extractSign*13}deg) rotateZ(${extractSign*7}deg) scale(.92)`;
    tl.to(front,{transform:exit,duration:.46,ease:'power2.in'},0);
    tl.set(front,{zIndex:0},.4);
    if(direction>0){
      tl.to(front,{transform:deckPose[third?2:1],duration:.84,ease:'power3.inOut'},.4);
      tl.to(second,{transform:deckPose[0],zIndex:3,duration:1.02,ease:'power3.inOut'},.22);
      if(third)tl.to(third,{transform:deckPose[1],zIndex:2,duration:.9,ease:'power3.out'},.34);
    }else{
      tl.to(front,{transform:deckPose[1],duration:.84,ease:'power3.inOut'},.4);
      tl.to(rear,{transform:deckPose[0],zIndex:3,duration:1.02,ease:'power3.inOut'},.22);
      if(third)tl.to(second,{transform:deckPose[2],zIndex:1,duration:.9,ease:'power3.out'},.34);
    }
    tl.call(()=>revealPreview(direction>0?second:rear),null,.38);
    tl.to(ambientA,{opacity:0,duration:.68,ease:'power3.inOut'},.25);
    tl.to(ambientB,{opacity:1,duration:.68,ease:'power3.inOut'},.25);
  };
  track._ttsAdvance=()=>advance(1,1);
  track._ttsNavigate=direction=>advance(direction,direction);
  track.onclick=e=>{
    if(Date.now()-(track._lastSwipeAt||0)<350||busy)return;
    const card=e.target.closest('.speaking-topic-card');
    if(!card)return;
    if(e.target.closest('.topic-card-foot button')){openSpeakingTopic(card.dataset.groupId,e.detail===0?null:card);return}
    if(card!==cards[order[0]]){const center=card.getBoundingClientRect();const direction=center.left+center.width/2<track.getBoundingClientRect().left+track.clientWidth/2?-1:1;advance(direction,direction);return}
    const rect=card.getBoundingClientRect();const direction=e.clientX<rect.left+rect.width/2?-1:1;
    advance(direction,direction);
  };
  track.onkeydown=e=>{
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();advance(e.key==='ArrowRight'?1:-1,e.key==='ArrowRight'?1:-1,true)}
    if(e.key==='Enter'&&e.target===cards[order[0]]){e.preventDefault();openSpeakingTopic(cards[order[0]].dataset.groupId)}
  };
  track.onpointerdown=e=>{
    if(busy||(e.pointerType!=='touch'&&e.button!==0))return;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  };
  track.onpointermove=e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(!gesture.moved&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){
      gesture.moved=true;track.setPointerCapture(e.pointerId);
    }
    if(gesture.moved)e.preventDefault();
  };
  const endGesture=e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x;
    if(gesture.moved&&track.hasPointerCapture(e.pointerId))track.releasePointerCapture(e.pointerId);
    if(gesture.moved&&Math.abs(dx)>track.clientWidth*.16){track._lastSwipeAt=Date.now();advance(dx>0?-1:1,Math.sign(dx))}
    gesture=null;
  };
  track.onpointerup=endGesture;track.onpointercancel=endGesture;
  track.onwheel=e=>{
    if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)||box.classList.contains('is-list'))return;
    e.preventDefault();advance(1,-Math.sign(e.deltaX));
  };
  navigation.querySelector('.deck-prev').onclick=()=>advance(-1,-1);
  navigation.querySelector('.deck-next').onclick=()=>advance(1,1);
  shell.querySelector('.deck-mode-switch').onclick=()=>{
    box.classList.toggle('is-list');state.browseMode=box.classList.contains('is-list')?'list':'deck';
    localStorage.setItem('ielts-browse-mode',state.browseMode);
    toolbar?.classList.toggle('is-list-mode',state.browseMode==='list');
    shell.querySelector('.deck-mode-switch').textContent=state.browseMode==='list'?'◫ 卡片浏览':'▤ 列表浏览';
    shell.querySelector('.deck-bottom>span').textContent=state.browseMode==='list'?'全部话题 · 点击卡片逐题练习':'滑动或点封面换题 · 点击去练习查看小题';
  };
  box.querySelector('.deck-list').onclick=e=>{
    const card=e.target.closest('[data-group-id]');if(card)openSpeakingTopic(card.dataset.groupId,e.detail===0?null:card);
  };
  box.querySelector('.deck-list').onkeydown=e=>{
    const card=e.target.closest('[data-group-id]');if(card&&e.key==='Enter'){e.preventDefault();openSpeakingTopic(card.dataset.groupId)}
  };
  showFront();
}
let activeTopicTransition;
let activeCoverMorph;
function morphCoverFallback(sourceCover,destinationCover){
  const source=sourceCover.getBoundingClientRect();
  const target=destinationCover.getBoundingClientRect();
  const drawer=$('#detail-drawer');
  if(!source.width||!source.height||!target.width||!target.height){drawer.classList.remove('morph-open');return}
  const ghost=document.createElement('div');
  ghost.className='speaking-topic-card morph-ghost';
  ghost.style.left=`${source.left}px`;
  ghost.style.top=`${source.top}px`;
  ghost.style.width=`${source.width}px`;
  ghost.style.height=`${source.height}px`;
  ghost.style.setProperty('--cover-a',getComputedStyle(sourceCover).getPropertyValue('--cover-a'));
  ghost.style.setProperty('--cover-b',getComputedStyle(sourceCover).getPropertyValue('--cover-b'));
  ghost.append(sourceCover.cloneNode(true));
  document.body.append(ghost);
  destinationCover.style.opacity='0';
  const dx=target.left-source.left;
  const dy=target.top-source.top;
  const scaleX=target.width/source.width;
  const scaleY=target.height/source.height;
  if(!ghost.animate){
    ghost.style.setProperty('--morph-x',`${dx}px`);
    ghost.style.setProperty('--morph-y',`${dy}px`);
    ghost.style.setProperty('--morph-sx',scaleX);
    ghost.style.setProperty('--morph-sy',scaleY);
    ghost.classList.add('morph-css');
    destinationCover.classList.add('morph-destination');
    let cleaned=false;
    const timeout=setTimeout(cleanup,320);
    function cleanup(){
      if(cleaned)return;
      cleaned=true;
      clearTimeout(timeout);
      ghost.remove();
      destinationCover.classList.remove('morph-destination');
      destinationCover.style.opacity='';
      drawer.classList.remove('morph-open');
      if(activeCoverMorph?.cancel===cleanup)activeCoverMorph=undefined;
    }
    activeCoverMorph={cancel:cleanup};
    ghost.addEventListener('animationend',cleanup,{once:true});
    return;
  }
  const ghostAnimation=ghost.animate([
    {transform:'translate(0, 0) scale(1, 1)',opacity:1},
    {transform:`translate(${dx*.72}px, ${dy*.72}px) scale(${1+(scaleX-1)*.72}, ${1+(scaleY-1)*.72})`,opacity:1,offset:.72},
    {transform:`translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,opacity:0,offset:1},
  ],{duration:260,easing:'cubic-bezier(0.77, 0, 0.175, 1)',fill:'forwards'});
  const destinationAnimation=destinationCover.animate([{opacity:0},{opacity:1}],{duration:90,delay:170,easing:'cubic-bezier(0.23, 1, 0.32, 1)',fill:'forwards'});
  let cleaned=false;
  const cleanup=()=>{
    if(cleaned)return;
    cleaned=true;
    ghostAnimation.cancel();
    destinationAnimation.cancel();
    ghost.remove();
    destinationCover.style.opacity='';
    drawer.classList.remove('morph-open');
    if(activeCoverMorph?.cancel===cleanup)activeCoverMorph=undefined;
  };
  activeCoverMorph={cancel:cleanup};
  ghostAnimation.finished.then(cleanup,cleanup);
}
function bindPracticeActions(id){
  $$('[data-complete-id]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleCompleted(b.dataset.completeId,id)});
  $$('.generate-answer').forEach(b=>b.onclick=async()=>{b.disabled=true;await api('/api/generate-answer',{method:'POST',body:JSON.stringify({question_id:b.dataset.questionId})});openSpeakingTopic(id)});
  bindNoteEditors(id);
  if($('#resource-marker'))bindResourceTools();
}
async function openSpeakingTopic(id,trigger=null){
  const g=await api('/api/speaking-topics/'+id);
  rememberStudy(g.id,'',g.family);
  $('#detail-drawer').classList.remove('writing-detail','resource-detail','material-detail');
  const done=completedCount(g);
  const questions=g.questions.map((q,i)=>{
    const answer=q.answer?.answer_text||'';
    const label=q.answer?.source==='user_provided_document'?'资料示范答案':'本地练习草稿';
    const finished=state.completed.has(q.id);
    return `<article class="practice-question ${finished?'is-complete':''}" data-question-id="${q.id}"><div class="question-number"><span>${partName(q.part)}</span><strong>${q.part==='part2'?'Cue Card':`Q${i+1}`}</strong><button class="done-toggle" data-complete-id="${q.id}" aria-pressed="${finished}">${finished?'✓ 已做':'○ 标记已做'}</button></div><div class="question-body"><div class="question-text">${resourceTextMarkup({id:`speaking-${g.id}`},{page_number:`${q.id}-question`,text:q.question_text},false)}</div>${answer?`<details><summary>查看答案</summary><span class="answer-source">${label}</span><div class="answer-text">${resourceTextMarkup({id:`speaking-${g.id}`},{page_number:`${q.id}-answer`,text:answer},false)}</div></details>`:`<button class="secondary generate-answer" data-question-id="${q.id}">生成答案</button>`}${noteMarkup(q.id)}</div></article>`;
  }).join('');
  const markup=`<div class="drawer-cover">${coverVisual(g)}</div><span class="detail-label">${g.family==='p1'?'PART 1':'PART 2 & 3'} · ${esc(topicName(g.topic))}</span><h2>${esc(g.title)}</h2><p class="drawer-intro">关键词 · ${(g.keywords||[]).map(esc).join(' / ')}<br>练习进度 ${done}/${g.question_count} · 每道题单独作答。</p><div class="resource-tools simple"><button type="button" id="resource-marker" class="resource-marker" aria-pressed="false">记号笔</button></div><div class="practice-list">${questions}</div>`;
  if(activeTopicTransition)activeTopicTransition.skipTransition();
  activeCoverMorph?.cancel();
  const sourceCover=trigger?.querySelector('.topic-cover');
  const canMorph=sourceCover&&trigger.isConnected&&!$('#detail-drawer').classList.contains('open')&&!reduceMotion();
  if(!canMorph){$('#detail-drawer').dataset.transitionMode='instant';setDetailContent(markup);openDrawer();bindPracticeActions(id);return}
  const drawer=$('#detail-drawer');
  if(!document.startViewTransition){
    drawer.dataset.transitionMode=sourceCover.animate?'waapi':'css';
    setDetailContent(markup);
    drawer.classList.add('morph-open');
    openDrawer(true);
    bindPracticeActions(id);
    morphCoverFallback(sourceCover,$('#detail-content .topic-cover'));
    return;
  }
  let destinationCover;
  let transition;
  sourceCover.style.viewTransitionName='topic-cover';
  drawer.dataset.transitionMode='native';
  const cleanup=()=>{sourceCover.style.viewTransitionName='';if(destinationCover)destinationCover.style.viewTransitionName='';drawer.classList.remove('morph-open');if(activeTopicTransition===transition)activeTopicTransition=undefined};
  try{
    transition=document.startViewTransition(()=>{
      sourceCover.style.viewTransitionName='none';
      setDetailContent(markup);
      destinationCover=$('#detail-content .topic-cover');
      destinationCover.style.viewTransitionName='topic-cover';
      drawer.classList.add('morph-open');
      openDrawer(true);
      bindPracticeActions(id);
    });
    activeTopicTransition=transition;
    transition.finished.then(cleanup,cleanup);
    await transition.updateCallbackDone;
  }catch(e){cleanup();setDetailContent(markup);openDrawer();bindPracticeActions(id)}
}

function animateSurface(el){const duration=reduceMotion()?160:220;if(el.animate){el.getAnimations?.().forEach(animation=>animation.cancel());el.animate([{opacity:0},{opacity:1}],{duration,easing:'cubic-bezier(0.23, 1, 0.32, 1)'})}else{el.classList.remove('surface-enter');void el.offsetWidth;el.classList.add('surface-enter');setTimeout(()=>el.classList.remove('surface-enter'),duration)}}
function revealCategoryDeck(box){
  const shell=box.querySelector('.deck-shell');
  const cards=[...box.querySelectorAll('.deck-track .speaking-topic-card')];
  if(!shell||!cards.length)return;
  const reduced=reduceMotion();
  shell.dataset.reveal='water';
  requestAnimationFrame(()=>{
    if(!reduced){
      shell.classList.remove('water-reveal');
      void shell.offsetWidth;
      shell.classList.add('water-reveal');
      setTimeout(()=>shell.classList.remove('water-reveal'),480);
    }
    cards.forEach((card,index)=>{
      if(!card.animate)return;
      const computedTransform=getComputedStyle(card).transform;
      const finalTransform=computedTransform==='none'?'translate3d(0, 0, 0)':computedTransform;
      const frames=reduced
        ?[{opacity:0},{opacity:1}]
        :[{opacity:0,clipPath:'inset(88% 0 0 0 round 28px)',transform:`translate3d(0, 28px, 0) ${finalTransform}`},{opacity:1,clipPath:'inset(0 0 0 0 round 28px)',transform:finalTransform}];
      const animation=card.animate(frames,{duration:reduced?160:300,delay:reduced?0:index*80,easing:'cubic-bezier(0.23, 1, 0.32, 1)',fill:'both'});
      animation.finished.then(()=>animation.cancel(),()=>animation.cancel());
    });
  });
}
function showCategory(topic){state.categoryTopic=topic;$('#topic-grid').hidden=true;$('#category-result').hidden=false;$('#category-title').textContent=topicName(topic);animateSurface($('#category-result'));loadSpeakingGroups('#category-topic-list',state.categoryFamily,topic)}
function clearCategory(){const grid=$('#topic-grid');grid.hidden=false;$('#category-result').hidden=true;state.categoryTopic='';animateSurface(grid)}

async function openQuestion(id){const q=await api('/api/questions/'+id);const drawer=$('#detail-drawer');drawer.classList.remove('resource-detail','material-detail');drawer.classList.add('writing-detail');const answer=q.answer?`<div class="answer-block writing-answer-card"><div class="writing-section-label">${q.answer.kind==='model_essay'?'参考范文':'参考答案'}</div><div class="answer-text">${resourceTextMarkup({id:`writing-${q.id}`},{page_number:'answer',text:q.answer.answer_text},false)}</div></div>`:'<div class="answer-block writing-answer-card writing-answer-empty"><button class="primary" id="generate-button">生成一份本地草稿</button></div>';setDetailContent(`<div class="resource-tools simple"><button type="button" id="resource-marker" class="resource-marker" aria-pressed="false">记号笔</button></div><section class="writing-prompt-card"><span class="detail-label">${partName(q.part)} · ${esc(topicName(q.topic))}</span><h2>${esc(q.title||q.question_text.split('\n')[0])}</h2><div class="question-text">${resourceTextMarkup({id:`writing-${q.id}`},{page_number:'question',text:q.question_text},false)}</div>${noteMarkup(q.id)}</section>${answer}`);openDrawer();bindNoteEditors();bindResourceTools();const gen=$('#generate-button');if(gen)gen.onclick=async()=>{gen.disabled=true;await api('/api/generate-answer',{method:'POST',body:JSON.stringify({question_id:id})});openQuestion(id)}}
function resourceMarkup(d){const meta=d.metadata||{};const image=(d.illustrations||[])[0]||d.cover_url;return `<article class="resource-card" data-resource-id="${esc(d.id)}" tabindex="0">${image?`<img class="resource-card-image" src="${esc(writingThumb(image))}" alt="" loading="lazy" decoding="async">`:''}<div class="resource-title"><div><span class="resource-kind">${esc(meta.category_label||'写作资料')}</span><h2>${esc(d.title)}</h2><p>${d.page_count||1} 页 · App 内阅读</p></div><button type="button">阅读全文 →</button></div>${(d.matches||[]).map(m=>`<div class="match"><strong>第 ${m.page_number} 页</strong><br>${esc(m.text.slice(0,240))}…</div>`).join('')}</article>`}
async function openResource(id){const d=await api('/api/resources/'+id);const drawer=$('#detail-drawer');drawer.classList.remove('writing-detail','material-detail');drawer.classList.add('resource-detail');const images=d.illustrations||[];const hero=images[0]||d.cover_url;const inks=d.palette?.inks||['#315cc1','#c65f38'];window.setIeltsBackgroundTheme?.(inks[0],inks[1]);const pages=(d.pages||[]).filter(page=>String(page.text||'').trim()||page.image_url);const body=pages.map((page,index)=>{const text=String(page.text||'');const toc=(text.match(/· p\./g)||[]).length>=3;const interlude=index>0&&index%2===0&&images.length>1&&!toc&&!page.image_url?`<figure class="resource-interlude"><img src="${esc(images[1+Math.floor(index/2-1)%(images.length-1)])}" alt="" loading="lazy" decoding="async"></figure>`:'';const label=pages.length>1?`<span>PAGE ${String(page.page_number).padStart(2,'0')}</span>`:'';const scan=page.image_url?`<figure class="resource-source-page"><img src="${esc(page.image_url)}" alt="${esc(d.title)} 第 ${page.page_number} 页" ${index===0?'fetchpriority="high"':'loading="lazy"'} decoding="async"></figure>`:'';const extracted=text.trim()?resourceTextMarkup(d,{...page,text},toc):'';return `${interlude}<section class="resource-page${toc?' is-toc':''}${page.image_url?' has-source-page':''}" id="resource-page-${page.page_number}">${label}${scan}${extracted}</section>`}).join('');const mode=pages.some(page=>page.image_url)&&!pages.some(page=>String(page.text||'').trim())?'原版扫描页':'已整理为 App 阅读';setDetailContent(`<article class="resource-reader">${hero?`<figure class="resource-reader-hero"><img src="${esc(hero)}" alt="" fetchpriority="high" decoding="async"></figure>`:''}<header><span class="detail-label">${esc(d.metadata?.category_label||'写作资料')}</span><h2>${esc(d.title)}</h2><p>${pages.length} 页 · ${mode}</p></header><div class="resource-tools">${resourceOutlineMarkup(d)}<button type="button" id="resource-marker" class="resource-marker" aria-pressed="false">记号笔</button></div>${body||'<div class="empty-state"><strong>这份资料暂时无法显示</strong></div>'}</article>`);openDrawer();bindResourceTools(d)}
async function loadWriting(){const box=$('#writing-list');const tab=state.writingTab;const searchWrap=$('#writing-search-wrap');searchWrap.hidden=tab==='questions';box.innerHTML='<div class="empty-state"><strong>正在读取写作内容…</strong></div>';if(tab==='questions'){const items=await api('/api/questions?skill=writing&limit=200');box.innerHTML=items.map(q=>`<article class="question-card writing-question" data-id="${q.id}" tabindex="0"><div class="card-top"><span class="badge">${partName(q.part)}</span><span class="answer-dot">${q.has_answer?'● 有范文':'○ 待生成'}</span></div><h3>${esc(q.question_text.split('\n')[0])}</h3><div class="card-meta"><span>${esc(topicName(q.topic))}</span><span>·</span><span>${esc(q.title)}</span></div></article>`).join('');$$('.writing-question').forEach(card=>card.onclick=()=>openQuestion(card.dataset.id));animateSurface(box);return}const term=$('#writing-search').value.trim();const section=tab==='simon'?'simon':'writing_library';const q=new URLSearchParams({section});if(term)q.set('q',term);let docs=await api('/api/resources?'+q);if(tab==='task1')docs=docs.filter(d=>(d.metadata.category||'').startsWith('task1_'));if(tab==='task2')docs=docs.filter(d=>(d.metadata.category||'').startsWith('task2_'));box.innerHTML=docs.length?docs.map(resourceMarkup).join(''):'<div class="empty-state"><strong>没有匹配的资料</strong></div>';$$('.resource-card').forEach(card=>{const open=()=>openResource(card.dataset.resourceId);card.onclick=open;card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}}});animateSurface(box)}

function switchView(view){if(state.view===view)return;state.view=view;$$('.view').forEach(v=>v.classList.toggle('active',v.id===view+'-view'));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));$('#search-input').placeholder=view==='writing'?'搜索写作题目或资料':'搜索口语话题';if(view==='current')loadSpeakingGroups('#current-topic-list',state.currentFamily);if(view==='categories'&&!state.categoryTopic)loadTopics();if(view==='writing')loadWriting()}
async function resumeStudy(){
  const button=$('#resume-button');button.disabled=true;
  try{
    let saved=lastStudy();let group;
    if(saved?.groupId){try{group=await api('/api/speaking-topics/'+saved.groupId)}catch(_error){saved=null}}
    if(!group){
      const family='p1';const groups=orderGroupsForStudy(await api('/api/speaking-topics?part_group='+family),family);
      group=groups[0];saved=group?{groupId:group.id,questionId:'',family}:null;
    }
    if(!group||!saved)throw new Error('当前没有可继续的口语题目');
    state.view='current';state.currentFamily=saved.family||group.family||'p1';state.search='';$('#search-input').value='';
    $$('.view').forEach(view=>view.classList.toggle('active',view.id==='current-view'));
    $$('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.view==='current'));
    $$('[data-family]').forEach(item=>item.classList.toggle('active',item.dataset.family===state.currentFamily));
    await loadSpeakingGroups('#current-topic-list',state.currentFamily);
    await openSpeakingTopic(group.id);
    if(saved.questionId)setTimeout(()=>document.querySelector(`.practice-question[data-question-id="${CSS.escape(saved.questionId)}"]`)?.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'center'}),reduceMotion()?0:280);
  }catch(error){toast(error.message)}finally{button.disabled=false}
}
async function sync(){const b=$('#sync-button');b.disabled=true;b.textContent='正在更新…';try{const r=await api('/api/update',{method:'POST',body:JSON.stringify({limit:20})});await Promise.all([loadStats(),loadTopics()]);switchView(state.view);if(r.complete){toast(`全部更新完成：新增 ${r.inserted}，更新 ${r.updated}`)}else{const details=Object.entries(r.stages||{}).map(([name,status])=>`${name}：${status}`).join('\n');toast('还有步骤未完成，已列出明细');alert(`本次尚未全部完成\n\n${details}\n\n确认后请等待每日自动任务继续处理。`)}}catch(e){toast('更新失败：'+e.message)}finally{b.disabled=false;b.textContent='更新资料'}}

const tts={active:false,paused:false,loading:false,items:[],itemIndex:0,segments:[],segmentIndex:0,run:0,wakeLock:null,kind:'speaking',audio:null,autoplay:localStorage.getItem('ielts-tts-autoplay')!=='false'};
const ttsPlayer=()=>$('#tts-player');
let kokoroManifestPromise;
function unlockTtsAudio(){
  if(!('Audio'in window))return;
  const audio=tts.audio||new Audio();tts.audio=audio;
  if(!audio.isConnected){audio.id='tts-audio-engine';audio.hidden=true;document.body.appendChild(audio)}
  audio.playsInline=true;audio.preload='auto';audio.loop=true;audio.volume=0;audio.src='/assets/audio/kokoro/unlock.mp3';
  const unlocked=audio.play();
  if(unlocked?.catch)unlocked.catch(()=>{});
}
function kokoroManifest(){
  return kokoroManifestPromise||(kokoroManifestPromise=fetch('/assets/audio/kokoro/manifest.json').then(response=>response.ok?response.json():null).catch(()=>null));
}
function speechChunks(text,max=175){
  const clean=String(text||'').replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim();
  if(!clean)return [];
  const sentences=clean.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[clean];
  const chunks=[];let current='';
  sentences.forEach(sentence=>{
    const next=(current+' '+sentence.trim()).trim();
    if(next.length<=max){current=next;return}
    if(current)chunks.push(current);
    if(sentence.length<=max){current=sentence.trim();return}
    for(let i=0;i<sentence.length;i+=max)chunks.push(sentence.slice(i,i+max));
    current='';
  });
  if(current)chunks.push(current);
  return chunks;
}
function ttsSegment(text,label,targetId=''){return speechChunks(text).map(chunk=>({text:chunk,label,targetId}))}
function preferredVoice(text){
  const chinese=/[\u3400-\u9fff]/.test(text);
  const voices=speechSynthesis.getVoices();
  const candidates=voices.filter(v=>chinese?/^zh(-|_)/i.test(v.lang):/^en(-|_)/i.test(v.lang));
  const score=voice=>{
    const name=`${voice.name} ${voice.voiceURI}`.toLowerCase();
    let value=0;
    if(/siri/.test(name))value+=120;
    if(/premium/.test(name))value+=110;
    if(/enhanced/.test(name))value+=100;
    if(/natural/.test(name))value+=90;
    if(chinese&&/(tingting|yu-shu|meijia|sin-ji)/.test(name))value+=55;
    if(!chinese&&/(samantha|ava|allison|serena|daniel|karen|moira|tessa)/.test(name))value+=55;
    if(voice.localService)value+=18;
    if(voice.default)value+=8;
    if(/compact|eloquence|novelty/.test(name))value-=120;
    return value;
  };
  return candidates.sort((a,b)=>score(b)-score(a))[0]||null;
}
async function holdScreenAwake(){
  if(!navigator.wakeLock||tts.wakeLock)return;
  try{tts.wakeLock=await navigator.wakeLock.request('screen');tts.wakeLock.addEventListener('release',()=>{tts.wakeLock=null})}catch(_error){}
}
function activeDeckTrack(){return state.view==='categories'?$('#category-topic-list .deck-track'):$('#current-topic-list .deck-track')}
function setTtsVisual(item){
  $$('.tts-reading').forEach(el=>el.classList.remove('tts-reading'));
  if(item.kind==='speaking')activeDeckTrack()?.querySelector('.speaking-topic-card.is-spotlight')?.classList.add('tts-reading');
  else{
    const card=$(`#writing-list [data-id="${CSS.escape(item.id)}"]`);
    card?.classList.add('tts-reading');card?.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'center'});
  }
}
function buildSpeakingSegments(group){
  const segments=[...ttsSegment(`Topic. ${group.title}`,'主题')];
  group.questions.forEach((question,index)=>{
    segments.push(...ttsSegment(`${partName(question.part)}. Question ${index+1}. ${question.question_text}`,`问题 ${index+1} / ${group.questions.length}`,question.id));
    if($('#tts-mode').value==='qa'){
      const answer=question.answer?.answer_text?.trim();
      segments.push(...ttsSegment(answer?`Answer. ${answer}`:'答案。暂无。',answer?'答案':'暂无答案',question.id));
    }
  });
  return segments;
}
function buildWritingSegments(question){
  const segments=[...ttsSegment(`${partName(question.part)}. ${question.title||''}. ${question.question_text}`,'写作题目',question.id)];
  if($('#tts-mode').value==='qa'){
    const answer=question.answer?.answer_text?.trim();
    segments.push(...ttsSegment(answer?`Model answer. ${answer}`:'答案。暂无。',answer?'参考范文':'暂无答案',question.id));
  }
  return segments;
}
async function loadTtsItem(){
  if(!tts.active)return;
  const item=tts.items[tts.itemIndex];
  try{
    const detail=await api(item.kind==='speaking'?`/api/speaking-topics/${item.id}`:`/api/questions/${item.id}`);
    if(!tts.active)return;
    tts.segments=item.kind==='speaking'?buildSpeakingSegments(detail):buildWritingSegments(detail);
    tts.segmentIndex=0;
    const accent=item.kind==='speaking'?(detail.palette?.inks?.[0]||'#f2b632'):'#315cc1';
    ttsPlayer().style.setProperty('--tts-accent',accent);
    $('#tts-title').textContent=item.title||detail.title||detail.question_text.split('\n')[0];
    $('#tts-open-current').setAttribute('aria-label',`打开当前播放题目：${item.title||detail.title||''}，第 ${tts.itemIndex+1} 个，共 ${tts.items.length} 个`);
    setTtsVisual(item);
    speakTtsSegment();
  }catch(error){toast('语音读取失败：'+error.message);stopTts()}
}
function speakSystemSegment(segment,token){
  if(!('speechSynthesis'in window)){tts.segmentIndex+=1;speakTtsSegment();return}
  const utterance=new SpeechSynthesisUtterance(segment.text);
  utterance.rate=Number($('#tts-rate').value)||.82;
  utterance.pitch=.98;utterance.lang=/[\u3400-\u9fff]/.test(segment.text)?'zh-CN':'en-GB';
  const voice=preferredVoice(segment.text);if(voice)utterance.voice=voice;
  utterance.onend=()=>{if(tts.active&&!tts.paused&&token===tts.run){tts.segmentIndex+=1;speakTtsSegment()}};
  utterance.onerror=event=>{if(tts.active&&token===tts.run&&event.error!=='interrupted'&&event.error!=='canceled'){tts.segmentIndex+=1;speakTtsSegment()}};
  speechSynthesis.speak(utterance);
}
async function playKokoroSegment(segment,token){
  const loadingTimer=setTimeout(()=>setTtsLoading(true,token),150);
  const finishLoading=()=>{clearTimeout(loadingTimer);setTtsLoading(false,token)};
  const manifest=await kokoroManifest();
  const url=manifest?.items?.[segment.text];
  if(!url||!tts.active||tts.paused||token!==tts.run){finishLoading();return false}
  const audio=tts.audio||new Audio();tts.audio=audio;
  audio.onended=null;audio.onerror=null;audio.loop=false;audio.src=url;audio.volume=1;audio.preload='auto';audio.playsInline=true;audio.playbackRate=Math.max(.7,Math.min(1.4,(Number($('#tts-rate').value)||.82)/.82));
  audio.onended=()=>{if(tts.active&&!tts.paused&&token===tts.run){tts.segmentIndex+=1;speakTtsSegment()}};
  audio.onerror=()=>{finishLoading();if(tts.active&&!tts.paused&&token===tts.run){setTtsPauseUi(true);toast('Kokoro 音频加载失败，请检查网络后重试')}};
  try{await audio.play();finishLoading();return true}catch(_error){finishLoading();setTtsPauseUi(true);toast('请点绿色播放键启用 Kokoro 语音');return true}
}
async function speakTtsSegment(){
  if(!tts.active||tts.paused)return;
  if(tts.segmentIndex>=tts.segments.length){advanceTtsItem();return}
  const segment=tts.segments[tts.segmentIndex];
  const token=++tts.run;
  if(await playKokoroSegment(segment,token))return;
  if(tts.active&&!tts.paused&&token===tts.run)speakSystemSegment(segment,token);
}
function setTtsPauseUi(paused){
  tts.paused=paused;ttsPlayer().classList.toggle('is-paused',paused);$('#tts-toggle').textContent=paused?'▶':'Ⅱ';$('#tts-toggle').setAttribute('aria-label',paused?'继续':'暂停');$('#listen-button').textContent=paused?'▶ 继续':'Ⅱ 暂停';
}
function setTtsLoading(loading,token=tts.run){
  if(token!==tts.run)return;
  tts.loading=loading;ttsPlayer().classList.toggle('is-loading',loading);$('#tts-toggle').setAttribute('aria-busy',String(loading));
  $('#tts-toggle').setAttribute('aria-label',loading?'正在加载语音':(tts.paused?'继续':'暂停'));
}
function advanceTtsItem(){
  if(!tts.active)return;
  if(!tts.autoplay){setTtsPauseUi(true);return}
  if(tts.itemIndex>=tts.items.length-1){toast('当前题库已播放完');stopTts();return}
  tts.itemIndex+=1;tts.segments=[];tts.segmentIndex=0;
  if(tts.kind==='speaking')activeDeckTrack()?._ttsAdvance?.();
  setTimeout(loadTtsItem,tts.kind==='speaking'&&!reduceMotion()?1250:120);
}
function cancelCurrentSpeech(){tts.run+=1;setTtsLoading(false);if(tts.audio){tts.audio.pause();tts.audio.onended=null;tts.audio.onerror=null;try{tts.audio.currentTime=0}catch(_error){}}if('speechSynthesis'in window){speechSynthesis.resume();speechSynthesis.cancel()}}
function stopTts(){
  tts.active=false;tts.paused=false;cancelCurrentSpeech();
  setTimeout(()=>{if(!tts.active&&'speechSynthesis'in window){speechSynthesis.resume();speechSynthesis.cancel()}},80);
  tts.items=[];tts.segments=[];
  ttsPlayer().hidden=true;ttsPlayer().classList.remove('is-paused');document.body.classList.remove('tts-active');$('#tts-top-stop').hidden=true;$('#listen-button').textContent='▷ 听题库';
  $$('.tts-reading').forEach(el=>el.classList.remove('tts-reading'));
  if(tts.wakeLock){tts.wakeLock.release().catch(()=>{});tts.wakeLock=null}
}
function toggleTts(){
  if(!tts.active)return;
  setTtsPauseUi(!tts.paused);
  if(tts.paused){if(tts.audio)tts.audio.pause();else if('speechSynthesis'in window)speechSynthesis.pause()}
  else if(tts.audio)tts.audio.play().catch(()=>speakTtsSegment());else{if('speechSynthesis'in window)speechSynthesis.resume();if(!('speechSynthesis'in window)||!speechSynthesis.speaking)speakTtsSegment()}
}
async function startTts(){
  if(!('Audio'in window)&&!('speechSynthesis'in window)){toast('当前浏览器不支持语音播放');return}
  cancelCurrentSpeech();
  unlockTtsAudio();
  if('speechSynthesis'in window){const primer=new SpeechSynthesisUtterance('\u00a0');primer.volume=0;speechSynthesis.speak(primer)}
  let items=[];let kind='speaking';
  if(state.view==='writing'){
    if(state.writingTab!=='questions'){toast('请先切换到“写作题目”');return}
    const questions=await api('/api/questions?skill=writing&limit=200');
    items=questions.map(q=>({id:q.id,title:q.title||q.question_text.split('\n')[0],kind:'writing'}));kind='writing';
    const active=$('#writing-list .writing-question.tts-reading')?.dataset.id;
    const at=Math.max(0,items.findIndex(item=>item.id===active));items=[...items.slice(at),...items.slice(0,at)];
  }else{
    const family=state.view==='categories'?state.categoryFamily:state.currentFamily;
    const params=new URLSearchParams({part_group:family});
    if(state.view==='categories'&&state.categoryTopic)params.set('topic',state.categoryTopic);
    items=(await api('/api/speaking-topics?'+params)).map(group=>({id:group.id,title:group.title,kind:'speaking'}));
    const active=activeDeckTrack()?.querySelector('.speaking-topic-card.is-spotlight')?.dataset.groupId;
    const at=Math.max(0,items.findIndex(item=>item.id===active));items=[...items.slice(at),...items.slice(0,at)];
  }
  if(!items.length){toast('当前板块没有可朗读题目');return}
  tts.active=true;tts.paused=false;tts.items=items;tts.itemIndex=0;tts.kind=kind;ttsPlayer().hidden=false;ttsPlayer().classList.remove('is-paused');
  setTtsPauseUi(false);document.body.classList.add('tts-active');$('#tts-top-stop').hidden=false;$('#tts-auto').setAttribute('aria-pressed',String(tts.autoplay));$('#tts-auto').textContent=tts.autoplay?'连播 开':'连播 关';
  await holdScreenAwake();loadTtsItem();
}
function navigateTtsItem(direction){
  if(!tts.active||!tts.items.length)return;
  cancelCurrentSpeech();tts.itemIndex=(tts.itemIndex+direction+tts.items.length)%tts.items.length;tts.segments=[];tts.segmentIndex=0;setTtsPauseUi(false);
  if(tts.kind==='speaking')activeDeckTrack()?._ttsNavigate?.(direction);
  setTimeout(loadTtsItem,tts.kind==='speaking'&&!reduceMotion()?1250:120);
}
async function openCurrentTtsItem(){
  if(!tts.active||!tts.items.length)return;
  const item=tts.items[tts.itemIndex];
  const segment=tts.segments[tts.segmentIndex];
  if(item.kind==='speaking'){
    await openSpeakingTopic(item.id);
    if(segment?.targetId){
      setTimeout(()=>document.querySelector(`.practice-question[data-question-id="${CSS.escape(segment.targetId)}"]`)?.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'center'}),reduceMotion()?0:520);
    }
  }else await openQuestion(item.id);
}
function replayTts(){if(!tts.active)return;cancelCurrentSpeech();speakTtsSegment()}
function toggleTtsAutoplay(){tts.autoplay=!tts.autoplay;localStorage.setItem('ielts-tts-autoplay',String(tts.autoplay));$('#tts-auto').setAttribute('aria-pressed',String(tts.autoplay));$('#tts-auto').textContent=tts.autoplay?'连播 开':'连播 关'}
function skipTts(){navigateTtsItem(1)}
document.addEventListener('visibilitychange',()=>{if(tts.active&&document.visibilityState==='visible')void holdScreenAwake()});

async function registerPwa(){
  if(!('serviceWorker'in navigator))return null;
  try{return await navigator.serviceWorker.register('/sw.js',{scope:'/'})}catch(_error){return null}
}
if('serviceWorker'in navigator){
  void registerPwa();
}

$$('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$$('[data-family]').forEach(b=>b.onclick=()=>{$$('[data-family]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.currentFamily=b.dataset.family;loadSpeakingGroups('#current-topic-list',state.currentFamily)});$$('[data-category-family]').forEach(b=>b.onclick=()=>{$$('[data-category-family]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.categoryFamily=b.dataset.categoryFamily;loadSpeakingGroups('#category-topic-list',state.categoryFamily,state.categoryTopic)});$$('[data-writing-tab]').forEach(b=>b.onclick=()=>{$$('[data-writing-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.writingTab=b.dataset.writingTab;loadWriting()});$('#clear-category').onclick=clearCategory;$('#sync-button').onclick=sync;$('#resume-button').onclick=resumeStudy;$('#listen-button').onclick=()=>tts.active?toggleTts():startTts();$('#tts-top-stop').onclick=stopTts;$('#tts-toggle').onclick=toggleTts;$('#tts-next').onclick=skipTts;$('#tts-replay').onclick=replayTts;$('#tts-stop').onclick=stopTts;$('#tts-mode').onchange=()=>{if(tts.active){cancelCurrentSpeech();loadTtsItem()}};$('#index-button').onclick=async()=>{await api('/api/index-resources',{method:'POST',body:'{}'});toast('资料索引完成');loadWriting()};$('#close-drawer').onclick=closeDrawer;$('#drawer-backdrop').onclick=closeDrawer;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});let timer;$('#search-input').oninput=e=>{clearTimeout(timer);timer=setTimeout(()=>{state.search=e.target.value.trim();if(state.view==='current')loadSpeakingGroups('#current-topic-list',state.currentFamily);else if(state.view==='categories'&&state.categoryTopic)loadSpeakingGroups('#category-topic-list',state.categoryFamily,state.categoryTopic);else if(state.view==='writing')loadWriting()},250)};$('#writing-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(loadWriting,300)};
$('#tts-prev').onclick=()=>navigateTtsItem(-1);
$('#tts-auto').onclick=toggleTtsAutoplay;
$('#tts-open-current').onclick=openCurrentTtsItem;
$('#tts-rate').onchange=()=>{if(tts.audio)tts.audio.playbackRate=Math.max(.7,Math.min(1.4,(Number($('#tts-rate').value)||.72)/.82))};
bindDrawerSwipe();
updateSeasonLabel();setInterval(updateSeasonLabel,60*60*1000);
syncProgress().finally(()=>Promise.all([loadTopics(),loadStats()]).then(()=>loadSpeakingGroups('#current-topic-list','p1')).catch(e=>toast(e.message)));
