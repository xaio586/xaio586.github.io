const legacyCompleted=JSON.parse(localStorage.getItem('ielts-completed-questions')||'[]');
const progressRecords=JSON.parse(localStorage.getItem('ielts-progress-v2')||'{}');
if(!Object.keys(progressRecords).length)legacyCompleted.forEach(id=>{progressRecords[id]={completed:true,updated_at:1}});
const state={view:'current',currentFamily:'p1',categoryFamily:'p1',categoryTopic:'',search:'',writingTab:'questions',browseMode:'deck',completed:new Set(Object.entries(progressRecords).filter(([,item])=>item.completed).map(([id])=>id))};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const api=async(path,options={})=>{const r=await fetch(path,{headers:{'Content-Type':'application/json'},...options});const data=await r.json();if(!r.ok)throw new Error(data.error||'请求失败');return data};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coverThumb=url=>String(url||'').replace(/(\/assets\/(?:topic|category)-covers\/)([^/]+\.webp)$/,'$1thumbs/$2');
const partName=p=>({part1:'Part 1',part2:'Part 2',part3:'Part 3',task1:'写作 Task 1',task2:'写作 Task 2'}[p]||p);
const topicName=k=>window.topicCache?.find(t=>t.key===k)?.name||k||'未分类';
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
function toggleCompleted(questionId,groupId){state.completed.has(questionId)?state.completed.delete(questionId):state.completed.add(questionId);saveProgress(questionId,state.completed.has(questionId));void syncProgress();openSpeakingTopic(groupId);loadSpeakingGroups('#current-topic-list',state.currentFamily);if(state.categoryTopic)loadSpeakingGroups('#category-topic-list',state.categoryFamily,state.categoryTopic)}
let backdropCloseTimer;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function setDetailContent(markup){const drawer=$('#detail-drawer');const content=$('#detail-content');const wasOpen=drawer.classList.contains('open');const previousScroll=drawer.scrollTop;content.innerHTML=markup;if(wasOpen){drawer.scrollTop=previousScroll;if(!reduceMotion())animateSurface(content)}else drawer.scrollTop=0}
function openDrawer(immediate=false){const drawer=$('#detail-drawer');const backdrop=$('#drawer-backdrop');if(drawer.classList.contains('open'))return;clearTimeout(backdropCloseTimer);drawer.inert=false;backdrop.hidden=false;const reveal=()=>{drawer.classList.add('open');backdrop.classList.add('visible')};immediate?reveal():requestAnimationFrame(reveal);drawer.setAttribute('aria-hidden','false')}
function closeDrawer(){const drawer=$('#detail-drawer');const backdrop=$('#drawer-backdrop');if(!drawer.classList.contains('open'))return;if(activeTopicTransition)activeTopicTransition.skipTransition();activeCoverMorph?.cancel();drawer.classList.remove('morph-open','open');backdrop.classList.remove('visible');drawer.setAttribute('aria-hidden','true');drawer.inert=true;clearTimeout(backdropCloseTimer);backdropCloseTimer=setTimeout(()=>{if(!drawer.classList.contains('open'))backdrop.hidden=true},260)}

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
  return `<article class="speaking-topic-card ${done===g.question_count?'topic-complete':''}" style="--cover-a:${esc(inks[0])};--cover-b:${esc(inks[1])}" data-group-id="${g.id}" tabindex="0">${coverVisual(g,coverLoading)}<div class="topic-card-copy"><div class="topic-card-top"><div>${status}<h2>${esc(g.title)}</h2></div><span class="season">2026年9–12月</span></div><p>${count} · 已练 <b>${done}/${g.question_count}</b></p><div class="progress-track" aria-label="练习进度 ${percent}%"><span style="width:${percent}%"></span></div><div class="topic-preview" aria-hidden="true"><div class="preview-label"><span>题目速览</span><span>PREVIEW / ${g.question_count}</span></div><ol>${previews}</ol></div><div class="topic-card-foot"><span>${g.family==='p1'?'Part 1':'P2 · P3'}</span><span>${esc(topicName(g.topic))}</span><button>去练习 →</button></div></div></article>`;
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
  const box=$(target);
  const toolbar=box.closest('.view')?.querySelector('.speaking-tabs');
  toolbar?.querySelector('.deck-toolbar-navigation')?.remove();
  toolbar?.classList.remove('has-deck-navigation','is-list-mode');
  box.innerHTML='<div class="empty-state"><strong>正在整理话题…</strong></div>';
  const q=new URLSearchParams({part_group:family});
  if(topic)q.set('topic',topic);
  if(state.search)q.set('q',state.search);
  const groups=await api('/api/speaking-topics?'+q);
  box.classList.add('deck-browser');
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
  track.onclick=e=>{
    if(Date.now()-(track._lastSwipeAt||0)<350||busy)return;
    const card=e.target.closest('.speaking-topic-card');
    if(!card)return;
    if(card!==cards[order[0]]){advance(1,1);return}
    if(e.target.closest('.topic-cover')){advance(1,1);return}
    openSpeakingTopic(card.dataset.groupId,e.detail===0?null:card);
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
    if(gesture.moved&&Math.abs(dx)>track.clientWidth*.16){track._lastSwipeAt=Date.now();advance(1,Math.sign(dx))}
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
}
async function openSpeakingTopic(id,trigger=null){
  const g=await api('/api/speaking-topics/'+id);
  $('#detail-drawer').classList.remove('writing-detail');
  const done=completedCount(g);
  const questions=g.questions.map((q,i)=>{
    const answer=q.answer?.answer_text||'';
    const label=q.answer?.source==='user_provided_document'?'资料示范答案':'本地练习草稿';
    const finished=state.completed.has(q.id);
    return `<article class="practice-question ${finished?'is-complete':''}"><div class="question-number"><span>${partName(q.part)}</span><strong>${q.part==='part2'?'Cue Card':`Q${i+1}`}</strong><button class="done-toggle" data-complete-id="${q.id}" aria-pressed="${finished}">${finished?'✓ 已做':'○ 标记已做'}</button></div><div class="question-body"><div class="question-text">${esc(q.question_text)}</div>${answer?`<details><summary>查看答案</summary><span class="answer-source">${label}</span><div class="answer-text">${esc(answer)}</div></details>`:`<button class="secondary generate-answer" data-question-id="${q.id}">生成答案</button>`}</div></article>`;
  }).join('');
  const markup=`<div class="drawer-cover">${coverVisual(g)}</div><span class="detail-label">${g.family==='p1'?'PART 1':'PART 2 & 3'} · ${esc(topicName(g.topic))}</span><h2>${esc(g.title)}</h2><p class="drawer-intro">关键词 · ${(g.keywords||[]).map(esc).join(' / ')}<br>练习进度 ${done}/${g.question_count} · 每道题单独作答。</p><div class="practice-list">${questions}</div>`;
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

async function openQuestion(id){const q=await api('/api/questions/'+id);const drawer=$('#detail-drawer');drawer.classList.add('writing-detail');const answer=q.answer?`<div class="answer-block writing-answer-card"><div class="writing-section-label">${q.answer.kind==='model_essay'?'参考范文':'参考答案'}</div><div class="answer-text">${esc(q.answer.answer_text)}</div></div>`:'<div class="answer-block writing-answer-card writing-answer-empty"><button class="primary" id="generate-button">生成一份本地草稿</button></div>';setDetailContent(`<section class="writing-prompt-card"><span class="detail-label">${partName(q.part)} · ${esc(topicName(q.topic))}</span><h2>${esc(q.title||q.question_text.split('\n')[0])}</h2><div class="question-text">${esc(q.question_text)}</div></section>${answer}`);openDrawer();const gen=$('#generate-button');if(gen)gen.onclick=async()=>{gen.disabled=true;await api('/api/generate-answer',{method:'POST',body:JSON.stringify({question_id:id})});openQuestion(id)}}
function resourceMarkup(d){const meta=d.metadata||{};const kind=meta.file_type==='docx'?'Word':'PDF';return `<article class="resource-card"><div class="resource-title"><div><span class="resource-kind">${esc(meta.category_label||'写作资料')}</span><h2>${esc(d.title)}</h2><p>${kind} · ${meta.searchable?'支持内容搜索':'直接打开阅读'}</p></div><a href="/api/resources/${d.id}/file" target="_blank">打开${kind} ↗</a></div>${(d.matches||[]).map(m=>`<div class="match"><strong>${kind==='PDF'?`第 ${m.page_number} 页`:'内容匹配'}</strong><br>${esc(m.text.slice(0,240))}…</div>`).join('')}</article>`}
async function loadWriting(){const box=$('#writing-list');const tab=state.writingTab;const searchWrap=$('#writing-search-wrap');searchWrap.hidden=tab==='questions';box.innerHTML='<div class="empty-state"><strong>正在读取写作内容…</strong></div>';if(tab==='questions'){const items=await api('/api/questions?skill=writing&limit=200');box.innerHTML=items.map(q=>`<article class="question-card writing-question" data-id="${q.id}" tabindex="0"><div class="card-top"><span class="badge">${partName(q.part)}</span><span class="answer-dot">${q.has_answer?'● 有范文':'○ 待生成'}</span></div><h3>${esc(q.question_text.split('\n')[0])}</h3><div class="card-meta"><span>${esc(topicName(q.topic))}</span><span>·</span><span>${esc(q.title)}</span></div></article>`).join('');$$('.writing-question').forEach(card=>card.onclick=()=>openQuestion(card.dataset.id));animateSurface(box);return}const term=$('#writing-search').value.trim();const section=tab==='simon'?'simon':'writing_library';const q=new URLSearchParams({section});if(term)q.set('q',term);let docs=await api('/api/resources?'+q);if(tab==='task1')docs=docs.filter(d=>(d.metadata.category||'').startsWith('task1_'));if(tab==='task2')docs=docs.filter(d=>(d.metadata.category||'').startsWith('task2_'));box.innerHTML=docs.length?docs.map(resourceMarkup).join(''):'<div class="empty-state"><strong>没有匹配的资料</strong></div>';animateSurface(box)}

function switchView(view){if(state.view===view)return;state.view=view;$$('.view').forEach(v=>v.classList.toggle('active',v.id===view+'-view'));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));$('#search-input').placeholder=view==='writing'?'搜索写作题目或资料':'搜索口语话题';if(view==='current')loadSpeakingGroups('#current-topic-list',state.currentFamily);if(view==='categories'&&!state.categoryTopic)loadTopics();if(view==='writing')loadWriting()}
async function sync(){const b=$('#sync-button');b.disabled=true;b.textContent='正在更新…';try{const r=await api('/api/update',{method:'POST',body:JSON.stringify({limit:20})});toast(`更新完成：新增 ${r.inserted}，更新 ${r.updated}`);await Promise.all([loadStats(),loadTopics()]);switchView(state.view)}catch(e){toast('更新失败：'+e.message)}finally{b.disabled=false;b.textContent='更新资料'}}

const tts={active:false,paused:false,items:[],itemIndex:0,segments:[],segmentIndex:0,run:0,wakeLock:null,kind:'speaking'};
const ttsPlayer=()=>$('#tts-player');
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
function ttsSegment(text,label){return speechChunks(text).map(chunk=>({text:chunk,label}))}
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
    segments.push(...ttsSegment(`${partName(question.part)}. Question ${index+1}. ${question.question_text}`,`问题 ${index+1} / ${group.questions.length}`));
    if($('#tts-mode').value==='qa'){
      const answer=question.answer?.answer_text?.trim();
      segments.push(...ttsSegment(answer?`Answer. ${answer}`:'答案。暂无。',answer?'答案':'暂无答案'));
    }
  });
  return segments;
}
function buildWritingSegments(question){
  const segments=[...ttsSegment(`${partName(question.part)}. ${question.title||''}. ${question.question_text}`,'写作题目')];
  if($('#tts-mode').value==='qa'){
    const answer=question.answer?.answer_text?.trim();
    segments.push(...ttsSegment(answer?`Model answer. ${answer}`:'答案。暂无。',answer?'参考范文':'暂无答案'));
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
    $('#tts-title').textContent=item.title||detail.title||detail.question_text.split('\n')[0];
    $('#tts-kicker').textContent=`${String(tts.itemIndex+1).padStart(2,'0')} / ${String(tts.items.length).padStart(2,'0')} · 自动连播`;
    setTtsVisual(item);
    speakTtsSegment();
  }catch(error){toast('语音读取失败：'+error.message);stopTts()}
}
function speakTtsSegment(){
  if(!tts.active||tts.paused)return;
  if(tts.segmentIndex>=tts.segments.length){advanceTtsItem();return}
  const segment=tts.segments[tts.segmentIndex];
  const token=++tts.run;
  const utterance=new SpeechSynthesisUtterance(segment.text);
  utterance.rate=Number($('#tts-rate').value)||.82;
  utterance.pitch=.98;utterance.lang=/[\u3400-\u9fff]/.test(segment.text)?'zh-CN':'en-GB';
  const voice=preferredVoice(segment.text);if(voice)utterance.voice=voice;
  $('#tts-detail').textContent=segment.label;
  utterance.onend=()=>{if(tts.active&&!tts.paused&&token===tts.run){tts.segmentIndex+=1;speakTtsSegment()}};
  utterance.onerror=event=>{if(tts.active&&token===tts.run&&event.error!=='interrupted'&&event.error!=='canceled'){tts.segmentIndex+=1;speakTtsSegment()}};
  speechSynthesis.speak(utterance);
}
function advanceTtsItem(){
  if(!tts.active)return;
  if(tts.itemIndex>=tts.items.length-1){toast('当前题库已播放完');stopTts();return}
  tts.itemIndex+=1;tts.segments=[];tts.segmentIndex=0;
  if(tts.kind==='speaking')activeDeckTrack()?._ttsAdvance?.();
  setTimeout(loadTtsItem,tts.kind==='speaking'&&!reduceMotion()?1250:120);
}
function cancelCurrentSpeech(){tts.run+=1;speechSynthesis.resume();speechSynthesis.cancel()}
function stopTts(){
  tts.active=false;tts.paused=false;tts.run+=1;speechSynthesis.resume();speechSynthesis.cancel();
  setTimeout(()=>{if(!tts.active){speechSynthesis.resume();speechSynthesis.cancel()}},80);
  tts.items=[];tts.segments=[];
  ttsPlayer().hidden=true;ttsPlayer().classList.remove('is-paused');document.body.classList.remove('tts-active');$('#tts-top-stop').hidden=true;$('#listen-button').textContent='▷ 听题库';
  $$('.tts-reading').forEach(el=>el.classList.remove('tts-reading'));
  if(tts.wakeLock){tts.wakeLock.release().catch(()=>{});tts.wakeLock=null}
}
function toggleTts(){
  if(!tts.active)return;
  tts.paused=!tts.paused;ttsPlayer().classList.toggle('is-paused',tts.paused);$('#tts-toggle').textContent=tts.paused?'继续':'暂停';
  $('#listen-button').textContent=tts.paused?'▶ 继续':'Ⅱ 暂停';
  if(tts.paused)speechSynthesis.pause();else{speechSynthesis.resume();if(!speechSynthesis.speaking)speakTtsSegment()}
}
async function startTts(){
  if(!('speechSynthesis'in window)){toast('当前浏览器不支持文字转语音');return}
  cancelCurrentSpeech();
  const primer=new SpeechSynthesisUtterance('\u00a0');primer.volume=0;speechSynthesis.speak(primer);
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
  $('#tts-toggle').textContent='暂停';document.body.classList.add('tts-active');$('#tts-top-stop').hidden=false;$('#listen-button').textContent='Ⅱ 暂停';
  await holdScreenAwake();loadTtsItem();
}
function skipTts(){if(!tts.active)return;cancelCurrentSpeech();tts.segmentIndex+=1;speakTtsSegment()}
function replayTts(){if(!tts.active)return;cancelCurrentSpeech();speakTtsSegment()}
document.addEventListener('visibilitychange',()=>{if(tts.active&&document.visibilityState==='visible')void holdScreenAwake()});

async function registerPwa(){
  if(!('serviceWorker'in navigator))return null;
  try{return await navigator.serviceWorker.register('/sw.js',{scope:'/'})}catch(_error){return null}
}
async function downloadForIPhone(){
  const button=$('#offline-button');
  if(!window.isSecureContext){toast('iPhone 安装需要 HTTPS 地址');return}
  button.disabled=true;button.textContent='准备离线包…';
  try{
    const [index,registration]=await Promise.all([api('/api/offline-index'),navigator.serviceWorker.ready]);
    const worker=registration.active||registration.waiting||registration.installing;
    if(!worker)throw new Error('离线服务尚未就绪');
    worker.postMessage({type:'CACHE_OFFLINE_DATA',urls:index.urls});
    button.textContent=`下载 0/${index.urls.length}`;
  }catch(error){button.disabled=false;button.textContent='iPhone 离线';toast(error.message)}
}
if('serviceWorker'in navigator){
  navigator.serviceWorker.addEventListener('message',event=>{
    if(event.data?.type==='OFFLINE_PROGRESS')$('#offline-button').textContent=`下载 ${event.data.completed}/${event.data.total}`;
    if(event.data?.type==='OFFLINE_READY'){
      const button=$('#offline-button');button.disabled=false;button.textContent='离线包已就绪';
      const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
      toast(ios&&!matchMedia('(display-mode: standalone)').matches?'已下载：点 Safari 分享 → 添加到主屏幕':'离线题库已保存');
    }
  });
  void registerPwa();
}

$$('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$$('[data-family]').forEach(b=>b.onclick=()=>{$$('[data-family]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.currentFamily=b.dataset.family;loadSpeakingGroups('#current-topic-list',state.currentFamily)});$$('[data-category-family]').forEach(b=>b.onclick=()=>{$$('[data-category-family]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.categoryFamily=b.dataset.categoryFamily;loadSpeakingGroups('#category-topic-list',state.categoryFamily,state.categoryTopic)});$$('[data-writing-tab]').forEach(b=>b.onclick=()=>{$$('[data-writing-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.writingTab=b.dataset.writingTab;loadWriting()});$('#clear-category').onclick=clearCategory;$('#sync-button').onclick=sync;$('#offline-button').onclick=downloadForIPhone;$('#listen-button').onclick=()=>tts.active?toggleTts():startTts();$('#tts-top-stop').onclick=stopTts;$('#tts-toggle').onclick=toggleTts;$('#tts-next').onclick=skipTts;$('#tts-replay').onclick=replayTts;$('#tts-stop').onclick=stopTts;$('#tts-mode').onchange=()=>{if(tts.active){cancelCurrentSpeech();loadTtsItem()}};$('#index-button').onclick=async()=>{await api('/api/index-resources',{method:'POST',body:'{}'});toast('资料索引完成');loadWriting()};$('#close-drawer').onclick=closeDrawer;$('#drawer-backdrop').onclick=closeDrawer;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});let timer;$('#search-input').oninput=e=>{clearTimeout(timer);timer=setTimeout(()=>{state.search=e.target.value.trim();if(state.view==='current')loadSpeakingGroups('#current-topic-list',state.currentFamily);else if(state.view==='categories'&&state.categoryTopic)loadSpeakingGroups('#category-topic-list',state.categoryFamily,state.categoryTopic);else if(state.view==='writing')loadWriting()},250)};$('#writing-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(loadWriting,300)};
syncProgress().finally(()=>Promise.all([loadTopics(),loadStats()]).then(()=>loadSpeakingGroups('#current-topic-list','p1')).catch(e=>toast(e.message)));
