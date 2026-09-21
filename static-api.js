(function(){
  if(!window.IELTS_STATIC_SITE)return;
  const nativeFetch=window.fetch.bind(window);
  let snapshotPromise;
  const snapshot=()=>snapshotPromise||(snapshotPromise=nativeFetch('./site-data.json?v=20260922-01',{cache:'no-store'}).then(r=>{
    if(!r.ok)throw new Error('题库快照加载失败');
    return r.json();
  }));
  const json=value=>new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json; charset=utf-8'}});
  const notFound=message=>new Response(JSON.stringify({error:message}),{status:404,headers:{'Content-Type':'application/json; charset=utf-8'}});
  window.fetch=async function(input,options={}){
    const raw=typeof input==='string'?input:input.url;
    const url=new URL(raw,location.href);
    if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return nativeFetch(input,options);
    const method=(options.method||'GET').toUpperCase();
    if(method!=='GET'){
      if(url.pathname==='/api/progress')return json({saved:0,local_only:true});
      if(url.pathname==='/api/update')return json({inserted:0,updated:0,unchanged:0,complete:false,static_site:true,stages:{'手机端检查':'已提交','题库数据':'等待每日 12:00 自动任务','新题答案':'等待自动任务','主题封面':'等待自动任务','Kokoro 语音':'等待自动任务','手机版发布':'等待自动任务'}});
      return notFound('手机版为只读题库，内容由每日同步任务更新');
    }
    const data=await snapshot();
    if(url.pathname==='/api/stats')return json(data.stats);
    if(url.pathname==='/api/topics')return json(data.topics);
    if(url.pathname==='/api/progress')return json([]);
    if(url.pathname==='/api/offline-index')return json(data.offline_index);
    if(url.pathname==='/api/speaking-topics'){
      let groups=data.speaking_groups;
      const family=url.searchParams.get('part_group');
      const topic=url.searchParams.get('topic');
      const term=(url.searchParams.get('q')||'').toLowerCase();
      if(family)groups=groups.filter(group=>group.family===family);
      if(topic)groups=groups.filter(group=>group.topic===topic);
      if(term)groups=groups.filter(group=>group.title.toLowerCase().includes(term)||(group.preview_questions||[]).some(item=>item.text.toLowerCase().includes(term)));
      return json(groups);
    }
    if(url.pathname.startsWith('/api/speaking-topics/'))return json(data.speaking_details[url.pathname.split('/').pop()]||{error:'话题不存在'});
    if(url.pathname==='/api/questions'){
      let questions=data.writing_questions;
      const term=(url.searchParams.get('q')||'').toLowerCase();
      if(term)questions=questions.filter(item=>(item.title+' '+item.question_text).toLowerCase().includes(term));
      return json(questions);
    }
    if(url.pathname.startsWith('/api/questions/'))return json(data.question_details[url.pathname.split('/').pop()]||{error:'题目不存在'});
    if(url.pathname==='/api/resources'){
      let docs=data.resources;
      const section=url.searchParams.get('section');
      const term=(url.searchParams.get('q')||'').toLowerCase();
      if(section)docs=docs.filter(item=>item.metadata?.section===section);
      if(term)docs=docs.filter(item=>item.title.toLowerCase().includes(term)||(item.pages||[]).some(page=>page.text.toLowerCase().includes(term)));
      return json(docs);
    }
    if(url.pathname.startsWith('/api/resources/'))return json(data.resources.find(item=>item.id===url.pathname.split('/').pop())||{error:'资料不存在'});
    return notFound('静态接口不存在');
  };
})();
