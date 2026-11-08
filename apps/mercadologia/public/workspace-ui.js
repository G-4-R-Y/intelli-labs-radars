'use strict';

function initResearchWorkspace(getPapers, rerender) {
  const storageKey = 'research-workspace-v1';
  const selected = new Map();
  const records = new Map();
  let view = 'pins';
  let online = false;
  let message = '';
  let busy = false;
  let requestTopic = '';
  let requestMode = 'review';

  try {
    for (const row of JSON.parse(localStorage.getItem(storageKey) || '[]')) records.set(row.key, row);
  } catch {
    message = 'Não foi possível ler os dados deste navegador.';
  }

  const element = (tag, content, className) => {
    const node = document.createElement(tag);
    if (content) node.textContent = content;
    if (className) node.className = className;
    return node;
  };
  const btn = (name, action) => {
    const button = element('button', name);
    button.type = 'button';
    button.onclick = action;
    return button;
  };
  const link = (name, url) => {
    try { if (new URL(url).protocol !== 'https:') return element('span', name); }
    catch { return element('span', name); }
    const a = element('a', name + ' ↗');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  };
  const pinKey = id => 'pin/' + encodeURIComponent(id);
  const snapshot = p => ({
    id: p.id, title: p.title, source: p.source, date: p.date, url: p.url,
    topics: p.topics || [p.topic].filter(Boolean),
    summary: p.summary || '', evidence: p.evidence || p.method || '',
    limitations: p.limitations || p.limit || '',
  });

  async function load() {
    try {
      const response = await fetch('/api/workspace', {cache: 'no-store'});
      if (!response.ok) return;
      const {records: remote} = await response.json();
      online = true;
      if (records.size && !remote.length) message = 'Você tem itens locais. Use “Importar dados deste navegador” para copiá-los à sua conta.';
      records.clear();
      for (const row of remote) records.set(row.key, row);
      rerender();
    } catch {
      message = 'A biblioteca da conta está temporariamente indisponível.';
    }
  }

  function localRows() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  }

  async function save(key, value) {
    if (online) {
      const response = await fetch('/api/workspace', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({key, value}),
      });
      if (!response.ok) throw Error('A conta recusou a gravação. Recarregue e tente novamente.');
    }
    if (value === null) records.delete(key);
    else records.set(key, {key, kind: key.split('/')[0], value});
    if (!online) localStorage.setItem(storageKey, JSON.stringify([...records.values()]));
  }

  async function run(action, success) {
    if (busy) return;
    busy = true;
    try { await action(); message = success || ''; }
    catch (error) { message = error.message || 'Não foi possível concluir a operação.'; }
    finally {
      busy = false;
      rerender();
      if (dialog.open) render();
    }
  }

  const dialog = element('dialog', '', 'research-workspace');
  dialog.setAttribute('aria-labelledby', 'research-workspace-title');
  const body = element('div', '', 'rw-body');
  dialog.append(body);
  document.body.append(dialog);

  function open(initial) {
    view = initial;
    message = '';
    render();
    if (!dialog.open) dialog.showModal();
    if (online) load().then(() => { if (dialog.open) render(); });
  }

  function itemRow(p) {
    const article = element('article', '', 'rw-row');
    const label = element('label', '', 'rw-select');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected.has(p.id);
    checkbox.onchange = () => {
      if (checkbox.checked) selected.set(p.id, snapshot(p));
      else selected.delete(p.id);
      render();
      rerender();
      [...body.querySelectorAll('input[type=checkbox]')].find(input => input.dataset.paper === p.id)?.focus();
    };
    checkbox.dataset.paper = p.id;
    label.append(checkbox, document.createTextNode(p.title));
    article.append(label, element('small', [p.source, p.date].filter(Boolean).join(' · ')), link('Fonte original', p.url));
    if (view.startsWith('collection/')) {
      article.append(btn('Retirar da coleção', () => run(() => save('member/' + view.slice(11) + '/' + encodeURIComponent(p.id), null))));
    }
    return article;
  }

  function buildBrief() {
    const sources = [...selected.values()].map((p, index) =>
      `${index + 1}. ${p.title} | ${p.source} | ${p.date} | ${p.url}\nResumo no radar: ${p.summary}`);
    const instructions = requestMode === 'summary'
      ? 'Resuma cada paper: pergunta, método, principal evidência, limitações e quando usar. Feche com convergências e divergências.'
      : 'Mapeie vertentes concorrentes, linhas pouco exploradas e por que podem ter ficado para trás, resultados e trade-offs sob orçamentos comparáveis, adoção documentada pelos modelos ou equipes de ponta, questões emergentes e experimentos decisivos. Separe evidência de hipótese e separe o que os labs documentam do que permanece desconhecido.';
    return `Tema: ${requestTopic.trim()}\n${instructions}\nConsulte as fontes originais e inclua links para cada afirmação material. Identifique fontes complementares e limites de cobertura. Escreva em português.\n\n${sources.join('\n\n')}`;
  }

  function requestPanel() {
    const pane = element('section', '', 'rw-section');
    pane.append(element('h3', 'Preparar resumo ou survey'));
    const topic = element('input');
    topic.placeholder = 'Ex. Reasoning sob orçamento fixo';
    topic.setAttribute('aria-label', 'Tema ou pergunta da revisão');
    topic.maxLength = 180;
    topic.value = requestTopic;
    topic.oninput = () => { requestTopic = topic.value; };
    const mode = element('select');
    mode.setAttribute('aria-label', 'Formato da pesquisa');
    for (const [key, label] of [['review', 'Survey temático'], ['summary', 'Resumos comparados']]) {
      const option = element('option', label);
      option.value = key;
      mode.append(option);
    }
    mode.value = requestMode;
    mode.onchange = () => { requestMode = mode.value; };
    const validate = () => {
      if (!requestTopic.trim() || !selected.size || selected.size > 20) throw Error('Informe um tema e selecione de 1 a 20 papers.');
    };
    pane.append(topic, mode, btn('Copiar briefing', () => run(async () => {
      validate();
      await navigator.clipboard.writeText(buildBrief());
    }, 'Briefing copiado com as fontes.')));
    if (online) pane.append(btn('Pedir na próxima rodada semanal', () => run(async () => {
      validate();
      const key = 'review/' + crypto.randomUUID();
      await save(key, {topic: requestTopic.trim(), mode: requestMode, papers: [...selected.values()], status: 'pending'});
      view = 'reviews';
    }, 'Pedido salvo para a próxima rodada.')));
    return pane;
  }

  function render() {
    body.replaceChildren();
    const header = element('div', '', 'rw-head');
    const title = element('h2', 'Minha biblioteca');
    title.id = 'research-workspace-title';
    header.append(title, btn('Fechar', () => dialog.close()));
    body.append(header, element('p', online ? 'Coleções privadas na sua conta.' : 'Coleções deste navegador. Entre como proprietário para sincronizar e pedir revisões.'));
    if (!online) {
      const signin = element('a', 'Entrar com ChatGPT ↗');
      signin.href = '/signin-with-chatgpt?return_to=' + encodeURIComponent(location.pathname);
      signin.target = '_top';
      body.append(signin);
    } else if (localRows().some(row => !records.has(row.key))) {
      body.append(btn('Importar dados deste navegador', () => run(async () => {
        for (const {key, value} of localRows()) if (!records.has(key)) await save(key, value);
      }, 'Dados locais importados.')));
    }
    const nav = element('nav', '', 'rw-tabs');
    for (const [key, label] of [['pins', 'Relevantes'], ['catalog', 'Catálogo'], ['selected', 'Seleção (' + selected.size + ')'], ['reviews', 'Revisões']]) {
      const tab = btn(label, () => { view = key; message = ''; render(); });
      tab.setAttribute('aria-pressed', String(view === key));
      nav.append(tab);
    }
    body.append(nav);
    if (message) {
      const status = element('p', message, 'rw-message');
      status.setAttribute('role', 'status');
      body.append(status);
    }
    const groups = [...records.values()].filter(row => row.kind === 'collection');
    const collections = element('div', '', 'rw-tabs');
    for (const group of groups) {
      const tab = btn((group.value.type === 'toolbox' ? 'Toolbox · ' : 'Lista · ') + group.value.name, () => {
        view = group.key; render();
      });
      tab.setAttribute('aria-pressed', String(view === group.key));
      collections.append(tab);
    }
    body.append(collections);

    if (selected.size) {
      const actions = element('div', '', 'rw-section');
      const name = element('input');
      name.placeholder = 'Nome da nova coleção';
      name.setAttribute('aria-label', 'Nome da nova coleção');
      name.maxLength = 100;
      const kind = element('select');
      kind.setAttribute('aria-label', 'Tipo da coleção');
      for (const [value, label] of [['reading', 'Lista de leitura'], ['toolbox', 'Toolbox']]) {
        const option = element('option', label); option.value = value; kind.append(option);
      }
      const add = async key => {
        for (const p of selected.values()) await save('member/' + key.slice(11) + '/' + encodeURIComponent(p.id), p);
        view = key;
      };
      actions.append(name, kind, btn('Criar com a seleção', () => run(async () => {
        if (!name.value.trim()) throw Error('Dê um nome à coleção.');
        const key = 'collection/' + crypto.randomUUID();
        await save(key, {name: name.value.trim(), type: kind.value});
        await add(key);
      })));
      if (groups.length) {
        const existing = element('select');
        existing.setAttribute('aria-label', 'Coleção de destino');
        for (const group of groups) {
          const option = element('option', group.value.name); option.value = group.key; existing.append(option);
        }
        actions.append(existing, btn('Adicionar à coleção', () => run(() => add(existing.value))));
      }
      actions.append(btn('Limpar seleção', () => { selected.clear(); rerender(); render(); }));
      body.append(actions);
    }

    if (view === 'reviews') {
      const reviews = [...records.values()].filter(row => row.kind === 'review');
      if (!reviews.length) body.append(element('p', 'Selecione papers e peça um resumo ou survey.'));
      for (const {value: review} of reviews) {
        const article = element('article', '', 'rw-row');
        const details = element('details');
        details.append(element('summary', review.topic + ' · ' + ({pending: 'Na fila semanal', ready: 'Pronto', failed: 'Incompleto'}[review.status] || 'Na fila')));
        if (review.text) details.append(element('p', review.text, 'rw-review'));
        (review.sources || review.papers || []).forEach((source, i) => details.append(link((i + 1) + '. ' + source.title, source.url)));
        article.append(details);
        body.append(article);
      }
    } else {
      const list = element('div', '', 'rw-list');
      const catalog = new Map(getPapers().map(p => [p.id, p]));
      const keys = [...records.values()];
      let rows = view === 'catalog' ? [...catalog.values()] : view === 'selected' ? [...selected.values()] :
        keys.filter(row => view === 'pins' ? row.kind === 'pin' : row.key.startsWith('member/' + view.slice(11) + '/')).map(row => row.value);
      const paint = query => {
        list.replaceChildren();
        const matches = rows.filter(p => [p.title, p.source, ...(p.topics || [p.topic])].join(' ').toLowerCase().includes(query.toLowerCase()));
        if (!matches.length) list.append(element('p', 'Nenhum paper aqui. Marque os relevantes nos cards ou selecione no catálogo.'));
        for (const p of matches) list.append(itemRow(catalog.get(p.id) || p));
      };
      const search = element('input');
      search.placeholder = 'Filtrar por título, tema ou fonte';
      search.setAttribute('aria-label', search.placeholder);
      search.oninput = () => paint(search.value);
      body.append(search, list);
      paint('');
    }
    if (selected.size) body.append(requestPanel());
  }

  const trigger = btn('Biblioteca · Listas e toolboxes', () => open(selected.size ? 'selected' : 'pins'));
  trigger.className = 'rw-launch';

  function controls(paper) {
    const row = element('div', '', 'rw-controls');
    const pin = btn('', () => {
      const key = pinKey(paper.id);
      run(() => save(key, records.has(key) ? null : snapshot(paper)));
    });
    const choose = btn('', () => {
      if (selected.has(paper.id)) selected.delete(paper.id);
      else selected.set(paper.id, snapshot(paper));
      rerender();
    });
    const pinned = records.has(pinKey(paper.id));
    const checked = selected.has(paper.id);
    pin.textContent = pinned ? '★ Relevante' : '☆ Relevante';
    pin.setAttribute('aria-pressed', String(pinned));
    choose.textContent = checked ? '✓ Selecionado' : '+ Selecionar';
    choose.setAttribute('aria-pressed', String(checked));
    row.append(pin, choose);
    return row;
  }

  void load();
  return {
    controls,
    trigger,
    updateCount() { trigger.textContent = selected.size ? 'Biblioteca · ' + selected.size + ' selecionados' : 'Biblioteca · Listas e toolboxes'; },
  };
}
