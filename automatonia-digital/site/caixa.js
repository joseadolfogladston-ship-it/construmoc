'use strict';
/* Automatonia Digital: dados apenas neste navegador; sem rede ou cobranças. */
(function () {
  const KEY = 'automatonia-caixa-v1';
  const LIMIT = 5000;
  const MAX_FILE = 1500000;
  const $ = (id) => document.getElementById(id);
  const form = $('entry-form');
  const feedback = $('action-status');
  const error = $('form-error');
  const money = new Intl.NumberFormat('pt-MZ', {minimumFractionDigits:2,maximumFractionDigits:2});
  let rows = [];

  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === s;
  }
  function validRow(r) {
    return r && typeof r.id === 'string' && r.id.length > 0 && r.id.length <= 80 &&
      (r.type === 'entrada' || r.type === 'saida') &&
      typeof r.description === 'string' && r.description.trim().length > 0 &&
      r.description.length <= 120 && !/[\x00-\x1f\x7f]/.test(r.description) &&
      Number.isSafeInteger(r.cents) && r.cents > 0 && r.cents <= 99999999999 && validDate(r.date);
  }
  function parseCents(s) {
    const text = String(s).trim().replace(/\s+/g,'');
    if (!/^\d{1,9}(?:[,.]\d{1,2})?$/.test(text))
      throw new Error('Usa um valor positivo, como 1500,50, sem separadores de milhares.');
    const parts = text.replace(',','.').split('.');
    const cents = Number(parts[0])*100 + Number((parts[1] || '').padEnd(2,'0'));
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('O valor deve ser maior que zero.');
    return cents;
  }
  function fmt(v) {return money.format(v/100) + ' MT';}
  function status(s) {feedback.textContent=s;}
  function setError(s) {error.textContent=s; error.hidden=!s;}
  function element(tag,klass,text) {
    const el=document.createElement(tag);
    if (klass) el.className=klass;
    if (typeof text === 'string') el.textContent=text;
    return el;
  }
  function totals() {
    let income=0, expenses=0;
    for (const r of rows) {
      if (r.type === 'entrada') income+=r.cents;
      else expenses+=r.cents;
    }
    return {income:income,expenses:expenses,balance:income-expenses};
  }
  function redraw() {
    const t=totals();
    $('balance').textContent=fmt(t.balance);
    $('income').textContent=fmt(t.income);
    $('expenses').textContent=fmt(t.expenses);
    $('record-count').textContent=rows.length===1?'1 movimento registado.':rows.length+' movimentos registados.';
    const list=$('entries');
    list.replaceChildren();
    if (!rows.length) {list.appendChild(element('p','empty','Ainda não existem movimentos.'));return;}
    const sorted=rows.slice().sort((a,b)=>b.date.localeCompare(a.date));
    for (const r of sorted.slice(0,200)) {
      const outer=element('div','entry');
      const first=element('div','entry-main');
      first.appendChild(element('div','entry-title',r.description));
      first.appendChild(element('div','entry-meta',r.date+' · '+(r.type==='entrada'?'Entrada':'Saída')));
      outer.appendChild(first);
      outer.appendChild(element('span','entry-amount '+(r.type==='entrada'?'in':'out'),(r.type==='entrada'?'+ ':'− ')+fmt(r.cents)));
      const del=element('button','remove-entry','Apagar');
      del.type='button';
      del.setAttribute('aria-label','Apagar movimento '+r.description);
      del.addEventListener('click',function () {
        if (confirm('Apagar este movimento?')) {
          if (persist(rows.filter(x=>x.id!==r.id))) status('Movimento apagado.');
        }
      });
      outer.appendChild(del);
      list.appendChild(outer);
    }
    if (rows.length>200) list.appendChild(element('p','fine','Apenas os 200 movimentos mais recentes são mostrados. A exportação inclui todos.'));
  }
  function persist(next) {
    try {
      localStorage.setItem(KEY,JSON.stringify({version:1,records:next}));
      rows=next;
      redraw();
      return true;
    } catch (_) {
      status('Não foi possível guardar os dados. Exporta uma cópia e confirma as permissões do navegador.');
      return false;
    }
  }
  function validatedBackup(obj) {
    if (!obj || obj.version!==1 || !Array.isArray(obj.records) ||
        obj.records.length>LIMIT || !obj.records.every(validRow) ||
        new Set(obj.records.map(x=>x.id)).size!==obj.records.length)
      throw new Error('Formato de backup inválido ou incompatível.');
    return obj.records;
  }
  function load() {
    try {
      const content=localStorage.getItem(KEY);
      if (content) rows=validatedBackup(JSON.parse(content));
    } catch (_) {status('Os dados locais não puderam ser lidos; nenhuma substituição foi realizada.');}
  }
  function today() {
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function download(name,text,mime) {
    const url=URL.createObjectURL(new Blob([text],{type:mime}));
    const a=document.createElement('a');
    a.download=name;
    a.href=url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function csvCell(value) {
    let s=String(value);
    if (/^\s*[=+@-]/.test(s)) s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  form.addEventListener('submit',function (e) {
    e.preventDefault();setError('');status('');
    if (rows.length>=LIMIT) {setError('Limite de movimentos atingido; exporta um backup.');return;}
    const description=$('description').value.trim(), date=$('date').value, type=$('type').value;
    if (!description || description.length>120 || /[\x00-\x1f\x7f]/.test(description)) {
      setError('Descrição inválida (máximo de 120 caracteres).');return;
    }
    if (!validDate(date)) {setError('Data inválida.');return;}
    if (type!=='entrada' && type!=='saida') {setError('Tipo inválido.');return;}
    let cents;
    try {cents=parseCents($('amount').value);}
    catch (err) {setError(err.message);return;}
    const id=(globalThis.crypto && crypto.randomUUID)?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
    if (persist([...rows,{id:id,type:type,description:description,cents:cents,date:date}])) {
      form.reset();$('date').value=today();status('Movimento guardado neste navegador.');
    }
  });
  $('export-csv').addEventListener('click',function () {
    const head=['Data','Tipo','Descrição','Valor (MT)'].map(csvCell).join(';');
    const lines=rows.map(r=>[r.date,r.type,r.description,(r.cents/100).toFixed(2).replace('.',',')].map(csvCell).join(';'));
    download('automatonia-caixa.csv','\uFEFF'+[head,...lines].join('\r\n')+'\r\n','text/csv;charset=utf-8');
    status('CSV exportado.');
  });
  $('backup-json').addEventListener('click',function () {
    download('automatonia-caixa-backup.json',JSON.stringify({version:1,records:rows},null,2),'application/json');
    status('Backup JSON exportado.');
  });
  $('clear-all').addEventListener('click',function () {
    if (!rows.length) {status('Não há movimentos para apagar.');return;}
    if (confirm('Apagar todos os movimentos? A operação não pode ser desfeita. Faz backup primeiro.')) {
      if (persist([])) status('Todos os movimentos foram apagados.');
    }
  });
  $('import-json').addEventListener('change',async function (e) {
    const input=e.target, file=input.files && input.files[0];
    if (!file) return;
    try {
      if (file.size>MAX_FILE) throw new Error('O backup excede 1,5 MB.');
      const imported=validatedBackup(JSON.parse(await file.text()));
      if (confirm('Substituir '+rows.length+' movimentos actuais por '+imported.length+' movimentos do backup?')) {
        if (persist(imported)) status('Backup importado com sucesso.');
      }
    } catch (err) {status('Importação cancelada: '+err.message);}
    finally {input.value='';}
  });
  $('date').value=today();
  load();redraw();
})();