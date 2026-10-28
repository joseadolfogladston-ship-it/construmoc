/* Interface local do Centro de Marketing Automatonia. Sem redes, API, pagamentos ou publicação. */
(function () {
  'use strict';
  const Core = globalThis.AutomatoniaMarketing;
  if (!Core) { throw new Error('marketing-core.js não foi carregado.'); }

  const KEY = 'automatonia-marketing-v1';
  const MAX_IMPORT_BYTES = 1200000;
  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat('pt-MZ', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const number = new Intl.NumberFormat('pt-MZ');
  let campaigns = [];
  let activeId = null;
  let blockedStorage = false;
  let storageWarning = '';
  let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  function fmt(cents) {
    const sign = cents < 0 ? '−' : '';
    return sign + money.format(Math.abs(cents) / 100) + ' MT';
  }
  function info(text) { $('mkt-status').textContent = text; }
  function error(text) { $('editor-error').textContent = text; $('editor-error').hidden = !text; }
  function textEl(tag, css, value) {
    const el = document.createElement(tag);
    if (css) el.className = css;
    if (value !== undefined) el.textContent = String(value);
    return el;
  }
  function load() {
    try {
      const json = localStorage.getItem(KEY);
      if (json === null) {
        campaigns = Core.makeInitialCampaigns();
        localStorage.setItem(KEY, JSON.stringify({version: Core.VERSION, campaigns}));
      } else {
        campaigns = Core.validateBackup(JSON.parse(json));
      }
    } catch (ex) {
      blockedStorage = true;
      campaigns = Core.makeInitialCampaigns();
      storageWarning = 'Não foi possível ler/guardar o armazenamento local. Não alterámos o backup anterior. Podes importar um backup ou repor os exemplos após confirmação.';
    }
  }
  function save(next, force = false) {
    if (blockedStorage && !force) {
      info(storageWarning || 'Armazenamento indisponível. Exporta os dados antes de continuar.');
      return false;
    }
    try {
      Core.validateBackup({version: Core.VERSION, campaigns: next});
      localStorage.setItem(KEY, JSON.stringify({version: Core.VERSION, campaigns: next}));
      blockedStorage = false;
      storageWarning = '';
      campaigns = next;
      render();
      return true;
    } catch (ex) {
      info('Não foi possível guardar os dados localmente: ' + ex.message);
      return false;
    }
  }
  function nodeStatus(value) { return value === 'publicado' ? 'Publicado (manual)' : value === 'aprovado' ? 'Aprovado' : value === 'rascunho' ? 'Rascunho' : 'Ideia'; }

  function renderOverview() {
    const m = Core.summary(campaigns);
    $('kpi-total').textContent = number.format(m.total);
    $('kpi-approved').textContent = number.format(m.approved);
    $('kpi-published').textContent = number.format(m.published);
    $('kpi-leads').textContent = number.format(m.leads);
    $('kpi-sales').textContent = number.format(m.sales);
    $('kpi-revenue').textContent = fmt(m.revenueCents);
    $('kpi-cost').textContent = fmt(m.costCents);
    $('kpi-profit').textContent = fmt(m.profitCents);
    $('kpi-rate').textContent = m.leadRate === null ? '—' : money.format(m.leadRate) + '%';
  }
  function renderList() {
    const box = $('campaign-list');
    box.replaceChildren();
    const business = $('filter-business').value, status = $('filter-status').value;
    const q = $('filter-search').value.trim().toLocaleLowerCase('pt');
    const matched = campaigns.filter(c =>
      (!business || c.business === business) &&
      (!status || c.status === status) &&
      (!q || (c.title + ' ' + c.content + ' ' + c.platform).toLocaleLowerCase('pt').includes(q))
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!matched.length) {
      box.appendChild(textEl('p', 'mkt-empty', 'Nenhuma campanha corresponde aos filtros.'));
      return;
    }
    for (const c of matched) {
      const card = textEl('article', 'mkt-campaign');
      const head = textEl('div', 'mkt-campaign-top');
      const b = Core.BUSINESSES.find(b => b.id === c.business);
      head.appendChild(textEl('small', '', b ? b.name : c.business));
      head.appendChild(textEl('span', 'mkt-chip ' + c.status, nodeStatus(c.status)));
      card.appendChild(head);
      card.appendChild(textEl('h3', '', c.title));
      card.appendChild(textEl('p', '', c.content));
      const foot = textEl('div', 'mkt-campaign-foot');
      foot.appendChild(textEl('span', 'mkt-meta', c.platform +
        (c.scheduledAt ? ' · ' + c.scheduledAt.replace('T', ' ') : ' · Sem data agendada') +
        ' · ' + number.format(c.metrics.leads) + ' contactos'));
      const buttons = textEl('div', 'mkt-tiny-actions');
      const edit = textEl('button', 'mkt-small-btn', 'Editar');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Editar campanha ' + c.title);
      edit.addEventListener('click', () => openEditor(c));
      buttons.appendChild(edit);
      const remove = textEl('button', 'mkt-small-btn danger', 'Apagar');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Apagar campanha ' + c.title);
      remove.addEventListener('click', () => {
        if (confirm('Apagar esta campanha do teu navegador? Esta acção não pode ser desfeita.')) {
          if (save(campaigns.filter(x => x.id !== c.id))) {
            if (activeId === c.id) clearEditor();
            info('Campanha eliminada do armazenamento local.');
          }
        }
      });
      buttons.appendChild(remove);
      foot.appendChild(buttons);
      card.appendChild(foot);
      box.appendChild(card);
    }
  }

  function renderCalendar() {
    const y = calendarMonth.getFullYear(), m = calendarMonth.getMonth();
    const label = new Intl.DateTimeFormat('pt-MZ', {month: 'long', year: 'numeric'}).format(calendarMonth);
    $('calendar-month').textContent = label.charAt(0).toUpperCase() + label.slice(1);
    const grid = $('calendar-grid');
    grid.replaceChildren();
    for (const w of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']) {
      grid.appendChild(textEl('div', 'mkt-weekday', w));
    }
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const count = Math.ceil((offset + days) / 7) * 7;
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'),
      String(now.getDate()).padStart(2,'0')].join('-');
    for (let i=0; i<count; i++) {
      const day = i - offset + 1;
      if (day < 1 || day > days) {
        grid.appendChild(textEl('div', 'mkt-day empty-day', ''));
        continue;
      }
      const key = y + '-' + String(m+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
      const current = campaigns.filter(c => c.scheduledAt.slice(0,10) === key)
        .sort((a,b) => a.scheduledAt.localeCompare(b.scheduledAt));
      const cell = textEl('div', 'mkt-day' + (key === today ? ' current-day' : ''));
      const dayHeading = textEl('div', 'mkt-day-number', day);
      cell.appendChild(dayHeading);
      for (const c of current.slice(0,3)) {
        const button = textEl('button', 'mkt-calendar-event '+c.status, c.title);
        button.type = 'button';
        button.title = c.scheduledAt.slice(11) + ' · ' + c.title + ' · ' + nodeStatus(c.status);
        button.setAttribute('aria-label', key + ', ' + c.title + ': editar campanha');
        button.addEventListener('click', () => openEditor(c));
        cell.appendChild(button);
      }
      if (current.length > 3) cell.appendChild(textEl('small', 'mkt-event-overflow', '+' + (current.length-3) + ' campanhas'));
      grid.appendChild(cell);
    }
  }
  function render() {renderOverview();renderList();renderCalendar();}
  function makeId() {
    if (globalThis.crypto && typeof crypto.randomUUID === 'function') return 'am-' + crypto.randomUUID();
    return 'am-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
  function fillEditor(row) {
    $('edit-business').value = row.business;
    $('edit-channel').value = row.channel;
    $('edit-platform').value = row.platform;
    $('edit-status').value = row.status;
    $('edit-title').value = row.title;
    $('edit-content').value = row.content;
    $('edit-scheduled').value = row.scheduledAt;
    $('edit-views').value = row.metrics?.views ?? 0;
    $('edit-leads').value = row.metrics?.leads ?? 0;
    $('edit-sales').value = row.metrics?.sales ?? 0;
    $('edit-revenue').value = money.format((row.metrics?.revenueCents ?? 0) / 100);
    $('edit-cost').value = money.format((row.metrics?.costCents ?? 0) / 100);
  }
  function openEditor(row) {
    activeId = row.id;
    $('editor-heading').textContent = 'Editar: ' + row.title;
    fillEditor(row);
    error('');
    $('editor-panel').scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  function clearEditor() {
    activeId = null;
    $('editor-heading').textContent = 'Criar campanha personalizada';
    $('campaign-form').reset();
    fillEditor({
      business: 'templates', channel: 'personalizado', platform: 'Facebook',
      status: 'rascunho', title: '', content: '', scheduledAt: '',
      metrics: {views:0,leads:0,sales:0,revenueCents:0,costCents:0}
    });
    error('');
  }
  function countValue(id) {
    const s = $(id).value.trim();
    if (!/^\d{1,10}$/.test(s)) throw new Error('Usa números inteiros não negativos nos indicadores.');
    const n = Number(s);
    if (!Number.isSafeInteger(n) || n > 1000000000) throw new Error('O indicador excede o limite permitido.');
    return n;
  }
  function readEditor() {
    const now = new Date().toISOString();
    const old = campaigns.find(c => c.id === activeId);
    const row = {
      id: old?.id || makeId(), createdAt: old?.createdAt || now,
      business: $('edit-business').value,
      channel: $('edit-channel').value,
      platform: $('edit-platform').value,
      status: $('edit-status').value,
      title: $('edit-title').value.trim(),
      content: $('edit-content').value.trim(),
      scheduledAt: $('edit-scheduled').value,
      metrics: {
        views: countValue('edit-views'),
        leads: countValue('edit-leads'),
        sales: countValue('edit-sales'),
        revenueCents: Core.moneyToCents($('edit-revenue').value),
        costCents: Core.moneyToCents($('edit-cost').value)
      }
    };
    if (!Core.validCampaign(row))
      throw new Error('Verifica os campos: título (3–120), conteúdo (10–5000), data, plataforma e valores.');
    return {row, old};
  }
  function download(name, text, mime) {
    const blob = new Blob([text], {type: mime});
    const uri = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = uri;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(uri), 1200);
  }

  $('create-draft').addEventListener('click', () => {
    if (campaigns.length >= Core.MAX_ITEMS) {info('Limite de 300 campanhas atingido. Faz backup e elimina registos antigos.');return;}
    const row = {
      ...Core.generateIdea($('idea-channel').value),
      id: makeId(), createdAt: new Date().toISOString(),
      metrics: {views:0,leads:0,sales:0,revenueCents:0,costCents:0}
    };
    if (save([...campaigns, row])) {
      openEditor(row);
      info('Rascunho criado. Personaliza e aprova o conteúdo antes de publicar.');
    }
  });
  $('new-custom').addEventListener('click', () => {
    clearEditor();
    $('editor-panel').scrollIntoView({behavior:'smooth',block:'start'});
    $('edit-title').focus();
  });
  $('campaign-form').addEventListener('submit', (event) => {
    event.preventDefault();
    error('');
    try {
      const {row, old} = readEditor();
      if (!old && campaigns.length >= Core.MAX_ITEMS) throw new Error('Limite de campanhas atingido.');
      if (row.status === 'publicado' && old?.status !== 'publicado' &&
          !confirm('Confirmas que publicaste esta campanha fora da aplicação? Aqui apenas registas o estado; não será enviada a nenhuma rede social.')) return;
      const next = old ? campaigns.map(c => c.id === row.id ? row : c) : [...campaigns,row];
      if (save(next)) {
        activeId = row.id;
        $('editor-heading').textContent = 'Editar: ' + row.title;
        info('Campanha guardada localmente. Nenhuma publicação ou envio foi realizado.');
      }
    } catch (ex) {error(ex.message);}
  });
  $('cancel-editor').addEventListener('click', () => {clearEditor();info('Editor limpo.');});
  $('copy-content').addEventListener('click', async () => {
    const text = $('edit-content').value.trim();
    if (!text) {info('Escreve o conteúdo antes de copiar.');return;}
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      $('edit-content').focus(); $('edit-content').select();
      info('Selecciona e copia o texto manualmente com Ctrl+C.');
      return;
    }
    try {await navigator.clipboard.writeText(text);info('Conteúdo copiado. Revê antes de publicar.');}
    catch (_) {$('edit-content').focus();$('edit-content').select();info('Cópia automática bloqueada. Usa Ctrl+C no texto seleccionado.');}
  });
  $('download-content').addEventListener('click', () => {
    const title = $('edit-title').value.trim(), body = $('edit-content').value.trim();
    if (!body) {info('Escreve o conteúdo antes de descarregar.');return;}
    download('automatonia-conteudo.txt', (title ? title + '\n\n' : '') + body + '\n\nRASCUNHO PARA REVISÃO HUMANA\n', 'text/plain;charset=utf-8');
    info('Texto descarregado. Não foi publicado.');
  });
  $('calendar-prev').addEventListener('click', () => {calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1, 1);renderCalendar();});
  $('calendar-next').addEventListener('click', () => {calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 1);renderCalendar();});
  $('calendar-today').addEventListener('click', () => {calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);renderCalendar();});
  for (const id of ['filter-business', 'filter-status']) $(id).addEventListener('change', renderList);
  $('filter-search').addEventListener('input', renderList);
  $('export-json').addEventListener('click', () => {
    download('automatonia-marketing-backup.json', JSON.stringify({version:Core.VERSION,campaigns},null,2), 'application/json');
    info('Backup JSON descarregado.');
  });
  $('export-csv').addEventListener('click', () => {
    download('automatonia-marketing.csv', Core.csvExport(campaigns), 'text/csv;charset=utf-8');
    info('CSV exportado. Inclui todos os registos, mesmo os filtrados.');
  });
  $('import-json').addEventListener('change', async event => {
    const input = event.target, file = input.files && input.files[0];
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('O ficheiro excede 1,2 MB.');
      const restored = Core.validateBackup(JSON.parse(await file.text()));
      if (!confirm('Substituir os '+campaigns.length+' registos por '+restored.length+' campanhas do backup? Faz cópia dos dados actuais primeiro.')) return;
      if (save(restored, true)) {clearEditor();info('Backup importado com sucesso.');}
    } catch (ex) {info('Importação não realizada: ' + ex.message);}
    finally {input.value = '';}
  });
  $('reset-data').addEventListener('click', () => {
    if (confirm('Repor as seis ideias de exemplo e apagar todos os registos locais? Exporta um backup antes.')) {
      if (save(Core.makeInitialCampaigns(), true)) {clearEditor();info('Exemplos repostos. Todos os indicadores foram colocados a zero.');}
    }
  });

  load();
  clearEditor();
  render();
  if (storageWarning) info(storageWarning);
})();