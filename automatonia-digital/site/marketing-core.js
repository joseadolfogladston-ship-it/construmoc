/* Motor de marketing do Automatonia. Funciona offline, sem APIs ou envio de dados. */
(function (root, build) {
  'use strict';
  const api = build();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AutomatoniaMarketing = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const VERSION = 1;
  const MAX_ITEMS = 300;
  const MAX_CENTS = 99999999999;
  const CHANNELS = Object.freeze([
    { id: 'social', business: 'ebooks', label: 'Redes sociais', platform: 'Instagram', title: '3 passos para controlar o orçamento', body: 'Queres organizar melhor o teu dinheiro? Começa por anotar as receitas, separar as despesas essenciais e rever os gastos no fim da semana.\n\nEstamos a preparar um guia prático para principiantes. Queres experimentar uma amostra gratuita?\n\n#OrganizacaoFinanceira #Aprender' },
    { id: 'seo', business: 'ebooks', label: 'Pesquisa e SEO', platform: 'Blog/SEO', title: 'Como organizar um orçamento mensal', body: 'Um orçamento começa por três perguntas: quanto dinheiro entra, quanto sai e que despesas podes ajustar? Neste artigo explicamos uma forma simples de registar receitas e despesas e preparar um plano mensal.\n\nConteúdo educativo. Não substitui aconselhamento financeiro individual.' },
    { id: 'vitrine', business: 'templates', label: 'Vitrine online', platform: 'Facebook', title: 'Experimenta o Gestor de Caixa Simples', body: 'Tens um pequeno negócio e precisas de acompanhar o dinheiro que entra e sai? Experimenta gratuitamente o Gestor de Caixa Simples: regista movimentos em MT, acompanha o saldo e exporta um CSV.\n\nÉ uma demonstração local. Ainda não existem vendas, sincronização ou contabilidade certificada.' },
    { id: 'tutorial', business: 'templates', label: 'Tutoriais', platform: 'TikTok', title: 'Como registar receitas e despesas', body: 'Roteiro de vídeo curto:\n1. Abre o Gestor de Caixa.\n2. Escolhe Entrada ou Saída.\n3. Escreve a descrição e o valor.\n4. Confirma o saldo e exporta um backup.\n\nLegenda: Pequenos passos para teres uma visão mais organizada dos movimentos do teu negócio.' },
    { id: 'analises', business: 'afiliados', label: 'Análises transparentes', platform: 'LinkedIn', title: 'Como comparar ferramentas digitais', body: 'Antes de escolher uma ferramenta digital, compara o preço, a privacidade, a facilidade de utilização e a qualidade do suporte. Testa as funções mais importantes com exemplos reais e confirma as condições de pagamento.\n\nSe no futuro incluirmos links de afiliados, identificaremos claramente eventuais comissões.' },
    { id: 'newsletter', business: 'afiliados', label: 'Newsletter autorizada', platform: 'Email autorizado', title: 'Ferramentas digitais úteis da semana', body: 'Assunto: Ferramentas digitais úteis da semana\n\nOlá!\n\nNesta edição: três perguntas para escolher uma ferramenta digital — é útil, é acessível e protege os teus dados?\n\nEsta mensagem destina-se apenas a pessoas que tenham dado consentimento para receber a newsletter. Inclui opção de cancelamento quando houver serviço de envio.' }
  ]);

  const BUSINESSES = Object.freeze([
    { id: 'ebooks', name: 'eBooks e guias' },
    { id: 'templates', name: 'Modelos e ferramentas' },
    { id: 'afiliados', name: 'Marketing de afiliados' }
  ]);
  const STATUSES = Object.freeze(['ideia', 'rascunho', 'aprovado', 'publicado']);
  const PLATFORMS = Object.freeze(['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Blog/SEO', 'Email autorizado', 'Outro']);

  function isValidLocalDateTime(value) {
    if (value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
    const [day, time] = value.split('T');
    const [y, m, d] = day.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return y >= 2000 && y <= 2100 && dt.getUTCFullYear() === y &&
      dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d && h >= 0 && h <= 23 && min >= 0 && min <= 59;
  }
  function moneyToCents(value) {
    const s = String(value).trim().replace(/\s/g, '');
    if (!/^\d{1,9}(?:[,.]\d{1,2})?$/.test(s)) throw new Error('Valor inválido. Escreve, por exemplo, 1500,50.');
    const p = s.replace(',', '.').split('.');
    const n = Number(p[0]) * 100 + Number((p[1] || '').padEnd(2, '0'));
    if (!Number.isSafeInteger(n) || n > MAX_CENTS) throw new Error('Valor demasiado elevado.');
    return n;
  }
  function validMetrics(metrics) {
    return metrics && typeof metrics === 'object' &&
      ['views', 'leads', 'sales'].every(k => Number.isSafeInteger(metrics[k]) && metrics[k] >= 0 && metrics[k] <= 1000000000) &&
      ['revenueCents', 'costCents'].every(k => Number.isSafeInteger(metrics[k]) && metrics[k] >= 0 && metrics[k] <= MAX_CENTS);
  }
  function validCampaign(row) {
    return row && typeof row === 'object' &&
      typeof row.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(row.id) &&
      BUSINESSES.some(b => b.id === row.business) &&
      typeof row.channel === 'string' && (CHANNELS.some(c => c.id === row.channel) || row.channel === 'personalizado') &&
      PLATFORMS.includes(row.platform) &&
      typeof row.title === 'string' && row.title.trim().length >= 3 && row.title.length <= 120 &&
      typeof row.content === 'string' && row.content.trim().length >= 10 && row.content.length <= 5000 &&
      STATUSES.includes(row.status) && isValidLocalDateTime(row.scheduledAt) &&
      typeof row.createdAt === 'string' && !Number.isNaN(Date.parse(row.createdAt)) && row.createdAt.length <= 40 &&
      validMetrics(row.metrics);
  }
  function validateBackup(raw) {
    if (!raw || raw.version !== VERSION || !Array.isArray(raw.campaigns) || raw.campaigns.length > MAX_ITEMS)
      throw new Error('Backup inválido ou incompatível.');
    if (!raw.campaigns.every(validCampaign)) throw new Error('O backup contém campanhas inválidas.');
    if (new Set(raw.campaigns.map(c => c.id)).size !== raw.campaigns.length)
      throw new Error('O backup contém identificadores repetidos.');
    return raw.campaigns;
  }
  function makeInitialCampaigns() {
    return CHANNELS.map((ch, i) => ({
      id: 'am-demo-' + (i + 1),
      business: ch.business,
      channel: ch.id,
      platform: ch.platform,
      title: ch.title,
      content: ch.body,
      status: 'ideia',
      scheduledAt: '',
      createdAt: '2026-10-28T00:00:00.000Z',
      metrics: {views: 0, leads: 0, sales: 0, revenueCents: 0, costCents: 0}
    }));
  }
  function summary(campaigns) {
    const result = {total: campaigns.length, approved: 0, published: 0, views: 0, leads: 0, sales: 0, revenueCents: 0, costCents: 0};
    for (const c of campaigns) {
      if (c.status === 'aprovado') result.approved++;
      if (c.status === 'publicado') result.published++;
      for (const key of ['views', 'leads', 'sales', 'revenueCents', 'costCents']) result[key] += c.metrics[key];
    }
    result.profitCents = result.revenueCents - result.costCents;
    result.leadRate = result.views > 0 ? result.leads / result.views * 100 : null;
    result.roi = result.costCents > 0 ? result.profitCents / result.costCents * 100 : null;
    return result;
  }
  function csvCell(input) {
    let text = String(input);
    if (/^\s*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function csvExport(campaigns) {
    const header = ['ID', 'Negócio', 'Canal', 'Plataforma', 'Título', 'Conteúdo', 'Estado', 'Data prevista', 'Visualizações', 'Contactos', 'Vendas', 'Receita MT', 'Custo MT'];
    const data = campaigns.map(c => [
      c.id, BUSINESSES.find(b => b.id === c.business).name,
      CHANNELS.find(x => x.id === c.channel)?.label || 'Personalizado',
      c.platform, c.title, c.content, c.status, c.scheduledAt,
      c.metrics.views, c.metrics.leads, c.metrics.sales,
      (c.metrics.revenueCents / 100).toFixed(2).replace('.', ','),
      (c.metrics.costCents / 100).toFixed(2).replace('.', ',')
    ]);
    return '\uFEFF' + [header, ...data].map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
  }
  function generateIdea(channelId) {
    const found = CHANNELS.find(c => c.id === channelId);
    if (!found) throw new Error('Canal não encontrado.');
    return {
      business: found.business, channel: found.id, platform: found.platform,
      title: found.title, content: found.body, status: 'rascunho', scheduledAt: ''
    };
  }
  return Object.freeze({VERSION, MAX_ITEMS, CHANNELS, BUSINESSES, STATUSES, PLATFORMS,
    isValidLocalDateTime, moneyToCents, validCampaign, validateBackup, makeInitialCampaigns,
    summary, csvCell, csvExport, generateIdea});
});