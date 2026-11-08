const NOW = new Date();

let works = [];

const topicInfo = {
  all:{label:'Todos'}, prompting:{label:'Prompting',title:'Chain-of-Thought e prompting',copy:'O ponto de partida: elicitar trajetórias melhores. A linha moderna migra de strings manuais para otimização de programas e sistemas.'},
  sampling:{label:'Sampling',title:'Sampling e width scaling',copy:'Gerar múltiplas trajetórias é robusto. O gargalo passa a ser selecionar a solução certa sem gastar compute indiscriminadamente.'},
  search:{label:'Search',title:'Busca sobre raciocínio',copy:'ToT, RAP e LATS transformam geração serial em exploração de estados — útil quando representação e avaliação são boas.'},
  verifiers:{label:'Verifiers',title:'Verifiers e process supervision',copy:'A função de valor é o coração da busca: decide qual trajetória expandir, quanto compute gastar e quando parar.'},
  rl:{label:'Reasoning RL',title:'Reasoning treinado por RL',copy:'A política aprende padrões de reflexão, revisão e raciocínio longo que antes dependiam de scaffolding externo.'},
  scaling:{label:'Test-time',title:'Test-time compute',copy:'A abstração central hoje: alocar orçamento de inferência entre profundidade, largura, seleção e stopping de forma adaptativa.'},
  agents:{label:'Agentes',title:'Agentes, ferramentas e ambiente',copy:'Compiler, testes, busca e simuladores transformam feedback do mundo em parte da função de valor.'},
  latent:{label:'Latent',title:'Raciocínio latente e compressão',copy:'A fronteira questiona se cada estado útil precisa virar texto: hidden states e tokens latentes podem carregar computação intermediária.'},
  optimization:{label:'Otimização',title:'De prompt a sistema otimizado',copy:'DSPy, TextGrad, GEPA e sucessores tratam instruções, exemplos e componentes como parâmetros a otimizar.'},
  interpretability:{label:'Faithfulness',title:'Faithfulness e interpretabilidade',copy:'Reasoning legível não garante reasoning fiel. Labs investigam como monitorar e rastrear mecanismos internos.'}
};

const mapNodeCopy = {
  cot:['RAIZ · 2022','Chain-of-Thought','O prompting textual inaugura a genealogia moderna, mas hoje funciona principalmente como baseline e interface para sistemas maiores.'],
  sampling:['WIDTH SCALING','Sampling','Self-Consistency e Large Language Monkeys mostram que largura bruta funciona — quando há diversidade e seleção confiável.'],
  search:['PLANNING','Search','Tree of Thoughts, RAP e LATS tornam reasoning um problema de busca, planejamento e alocação de expansão.'],
  agents:['AMBIENTE','Agentes','ReAct e Reflexion colocam ações, memória e feedback real dentro do loop de raciocínio.'],
  verifiers:['FUNÇÃO DE VALOR','Verifiers','Gerar candidatos ficou barato; avaliar corretamente qual branch merece compute virou o gargalo.'],
  optimization:['PROGRAMAÇÃO','Prompt → programa','O prompt deixa de ser texto artesanal e vira parâmetro de pipelines compiláveis, diferenciáveis e evolutivos.'],
  scaling:['ABSTRAÇÃO CENTRAL','Test-time compute','A fronteira combina amostragem, busca, verificadores, budget e stopping conforme a dificuldade da tarefa.'],
  rl:['POST-TRAINING','Reasoning RL','R1, Kimi e modelos proprietários internalizam reflexão e revisão por treinamento, alterando o papel do scaffolding externo.'],
  tools:['FEEDBACK OBJETIVO','Tools + ambiente','Testes, compiladores, navegadores e simuladores oferecem sinais mais úteis que autoavaliação puramente textual.'],
  adaptive:['CONTROLE','Compute adaptativo','Mais tokens nem sempre ajudam. A questão é onde, quando e quanto compute alocar por problema.'],
  compound:['SISTEMA COMPLETO','Sistemas inteiros','O objeto de otimização passa a ser modelo + prompt + busca + verificador + tools + regra de parada.'],
  latent:['FRONTEIRA 2026','Reasoning latente','Coconut e A*-Thought-V2 questionam a obrigação de verbalizar cada estado intermediário.']
};

const relations = [['cot','sampling'],['cot','search'],['cot','agents'],['sampling','verifiers'],['search','verifiers'],['search','rl'],['agents','tools'],['verifiers','scaling'],['verifiers','rl'],['optimization','compound'],['scaling','adaptive'],['rl','adaptive'],['tools','compound'],['adaptive','latent'],['compound','latent']];

const state = {topic:'all',source:'all',period:'all',sort:'relevance',query:'',queueOnly:false,visible:9};
const saved = new Set(JSON.parse(localStorage.getItem('frontier-saved') || '[]'));
const read = new Set(JSON.parse(localStorage.getItem('frontier-read') || '[]'));
const $ = (s,root=document) => root.querySelector(s);

function daysAgo(date){ return Math.floor((NOW - new Date(`${date}T12:00:00Z`))/86400000); }
function freshness(work){ const d=daysAgo(work.date); if(d<=30)return ['NOVO','new']; if(d<=90)return ['RECENTE','recent']; if(work.landmark)return ['MARCO','landmark']; return ['MAPEADO','']; }
function formatDate(date){ return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00Z`)).replace('.',''); }
function sourceMatch(w){ if(state.source==='all')return true; if(state.source==='china')return w.region==='china'; return w.group===state.source; }
function periodMatch(w){ if(state.period==='all')return true; if(state.period==='2026'||state.period==='2025')return w.date.startsWith(state.period); return daysAgo(w.date)<=Number(state.period); }

function filteredWorks(){
  const q=state.query.trim().toLocaleLowerCase('pt-BR');
  const list=works.filter(w => (state.topic==='all'||w.topics.includes(state.topic)) && sourceMatch(w) && periodMatch(w) && (!state.queueOnly||saved.has(w.id)) && (!q||`${w.title} ${w.source} ${w.summary} ${w.topics.join(' ')}`.toLocaleLowerCase('pt-BR').includes(q)));
  return list.sort((a,b)=> state.sort==='date' ? b.date.localeCompare(a.date) : state.sort==='saved' ? Number(saved.has(b.id))-Number(saved.has(a.id)) || b.score-a.score : b.score-a.score || b.date.localeCompare(a.date));
}

function renderTopics(){
  const row=$('#topic-row'); row.innerHTML='';
  Object.entries(topicInfo).forEach(([key,info])=>{ const b=document.createElement('button'); b.className=`topic-chip${state.topic===key?' active':''}`; b.textContent=info.label; b.dataset.topic=key; b.onclick=()=>{state.topic=key;state.visible=9;syncMap();render();}; row.appendChild(b); });
}

const workspace = initResearchWorkspace(() => works, render);
$('#queue-toggle').after(workspace.trigger);

function render(){
  workspace.updateCount();
  const list=filteredWorks(); const shown=list.slice(0,state.visible); const root=$('#research-list'); root.innerHTML='';
  $('#result-count').textContent=list.length; $('#metric-works').textContent=works.length; $('#metric-new').textContent=works.filter(w=>daysAgo(w.date)<=30).length;
  $('#queue-count').textContent=saved.size; $('#active-filter').textContent=state.topic==='all'?'':`· ${topicInfo[state.topic].label}`;
  $('#queue-toggle').setAttribute('aria-pressed',String(state.queueOnly));
  shown.forEach(work=>{
    const node=$('#paper-template').content.cloneNode(true); const card=$('.paper-card',node); card.dataset.id=work.id; if(read.has(work.id))card.classList.add('is-read');
    $('.rank-value',node).textContent=work.score; const [label,cls]=freshness(work); const fresh=$('.freshness',node); fresh.textContent=label; if(cls)fresh.classList.add(cls);
    $('.paper-date',node).textContent=formatDate(work.date); $('.paper-source',node).textContent=work.source; $('h3',node).textContent=work.title; $('.paper-summary',node).textContent=work.summary;
    const distill=$('.distill',node); const hasDistill=work.contribution||work.evidence||work.limitations||work.verdict;
    if(hasDistill){distill.hidden=false;$('.distill-contribution',node).textContent=work.contribution||'—';$('.distill-evidence',node).textContent=work.evidence||'—';$('.distill-limitations',node).textContent=work.limitations||'—';$('.distill-verdict',node).textContent=work.verdict||'—';}
    work.topics.slice(0,3).forEach(t=>{const tag=document.createElement('span');tag.textContent=topicInfo[t]?.label || t;$('.paper-tags',node).appendChild(tag);});
    const link=$('.paper-actions a',node); link.href=work.url;
    const saveBtn=$('.save-btn',node); saveBtn.textContent=saved.has(work.id)?'◆':'◇'; saveBtn.classList.toggle('active',saved.has(work.id)); saveBtn.title=saved.has(work.id)?'Remover da fila':'Salvar na fila';
    saveBtn.onclick=()=>{ saved.has(work.id)?saved.delete(work.id):saved.add(work.id); localStorage.setItem('frontier-saved',JSON.stringify([...saved])); render(); };
    const readBtn=$('.read-btn',node); readBtn.textContent=read.has(work.id)?'✓':'○'; readBtn.classList.toggle('active',read.has(work.id)); readBtn.title=read.has(work.id)?'Marcar como não lido':'Marcar como lido';
    readBtn.onclick=()=>{ read.has(work.id)?read.delete(work.id):read.add(work.id); localStorage.setItem('frontier-read',JSON.stringify([...read])); render(); };
    card.append(workspace.controls(work));
    root.appendChild(node);
  });
  $('#empty-state').hidden=list.length>0; $('#load-more').hidden=state.visible>=list.length || list.length===0;
  renderTopics();
}

function setTopic(topic,scroll=false){ state.topic=topic;state.visible=9;syncMap();render(); if(scroll)$('#radar').scrollIntoView({behavior:'smooth'}); }
function syncMap(){ document.querySelectorAll('.map-node').forEach(n=>n.classList.toggle('active',state.topic!=='all'&&n.dataset.topic===state.topic)); }
function focusNode(node){
  const [kicker,title,copy]=mapNodeCopy[node.dataset.node]; const topic=node.dataset.topic; $('#focus-kicker').textContent=kicker;$('#focus-title').textContent=title;$('#focus-copy').textContent=copy;$('#focus-count').textContent=`${works.filter(w=>w.topics.includes(topic)).length} itens relacionados`;$('#focus-action').onclick=()=>setTopic(topic,true);setTopic(topic,false);
}

function drawConnections(){
  const canvas=$('#map-canvas'), svg=$('#map-lines'); if(!canvas||innerWidth<=720)return; svg.querySelectorAll('.connection').forEach(p=>p.remove()); const cb=canvas.getBoundingClientRect();
  relations.forEach(([from,to])=>{ const a=$(`[data-node="${from}"]`),b=$(`[data-node="${to}"]`); if(!a||!b)return; const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect(); const x1=ar.right-cb.left,y1=ar.top+ar.height/2-cb.top,x2=br.left-cb.left,y2=br.top+br.height/2-cb.top,dx=Math.max(22,(x2-x1)*.45); const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('class','connection');p.setAttribute('d',`M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2-3} ${y2}`);svg.appendChild(p); });
}

$('#search').addEventListener('input',e=>{state.query=e.target.value;state.visible=9;render();});
$('#source-filter').addEventListener('change',e=>{state.source=e.target.value;state.visible=9;render();});
$('#period-filter').addEventListener('change',e=>{state.period=e.target.value;state.visible=9;render();});
$('#sort-filter').addEventListener('change',e=>{state.sort=e.target.value;render();});
$('#queue-toggle').onclick=()=>{state.queueOnly=!state.queueOnly;state.visible=9;render();};
$('#load-more').onclick=()=>{state.visible+=9;render();};
$('#reset-filters').onclick=()=>{Object.assign(state,{topic:'all',source:'all',period:'all',sort:'relevance',query:'',queueOnly:false,visible:9});$('#search').value='';$('#source-filter').value='all';$('#period-filter').value='all';$('#sort-filter').value='relevance';syncMap();render();};
document.querySelectorAll('.map-node').forEach(n=>n.addEventListener('click',()=>focusNode(n)));
$('#clear-focus').onclick=()=>{setTopic('all');$('#focus-kicker').textContent='VISÃO GERAL';$('#focus-title').textContent='De prompt a sistema';$('#focus-copy').textContent='A mudança decisiva não foi uma nova árvore de pensamentos: foi combinar geração, busca, avaliação, feedback e orçamento de inferência.';$('#focus-count').textContent=`${works.length} itens relacionados`;$('#focus-action').onclick=()=>$('#radar').scrollIntoView({behavior:'smooth'});};
$('#focus-action').onclick=()=>$('#radar').scrollIntoView({behavior:'smooth'});
window.addEventListener('resize',()=>requestAnimationFrame(drawConnections));

async function hydrateFromDb(){
  try{
    const response=await fetch('/api/papers',{headers:{accept:'application/json'}});
    if(!response.ok)return;
    const payload=await response.json();
    if (payload.latestScan) {
      const date = new Date(payload.latestScan.runAt.replace(' ', 'T').replace(/(?<!Z)$/, 'Z'));
      $('#scan-status').textContent = 'Última varredura registrada · ' + date.toLocaleDateString('pt-BR', {timeZone:'America/Sao_Paulo'});
    }
    if(Array.isArray(payload.papers)&&payload.papers.length){
      const merged=new Map(works.map(work=>[work.id,work]));
      payload.papers.forEach(work=>merged.set(work.id,{...(merged.get(work.id)||{}),...work}));
      works=[...merged.values()];
    }
  }catch(error){console.warn('D1 indisponível; usando catálogo embarcado.',error);}
}

async function bootstrap(){await hydrateFromDb();render();requestAnimationFrame(drawConnections);}
bootstrap();
