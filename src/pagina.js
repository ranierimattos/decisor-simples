/*
 * Interface da página: contagem, diagnóstico em quatro cliques, resultado,
 * inscrição na lista (Brevo) com o resumo do diagnóstico, PDF e exemplo.
 * A cada diagnóstico, envia um evento anônimo (sem dado pessoal) ao endpoint de
 * coleta de src/config.json (meta decisor-coleta; vazio = desligado).
 */
(function () {
  'use strict';
  var D = window.Diagnostico, PL = D.parametros;

  function $(id) { return document.getElementById(id); }
  function el(tag, texto, classe) {
    var e = document.createElement(tag);
    if (texto !== undefined) e.textContent = texto;
    if (classe) e.className = classe;
    return e;
  }
  function preencherLista(ul, itens) {
    ul.textContent = '';
    itens.forEach(function (t) { ul.appendChild(el('li', t)); });
  }

  // Endpoint de coleta (Google Apps Script); qualquer outro valor desliga o envio.
  var meta = document.querySelector('meta[name="decisor-coleta"]');
  var COLETA = meta && /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(meta.content) ? meta.content : '';

  // ------------------------------------------------ volta da confirmação dupla do Brevo
  if (/(?:^|[?&])inscricao=confirmada(?:&|$)/.test(window.location.search)) $('inscricao-confirmada').hidden = false;

  // ------------------------------------------------ contagem do topo
  function duasCasas(n) { return (n < 10 ? '0' : '') + n; }
  function atualizarContagem() {
    var agora = new Date(), c = D.contagemPorData(agora);
    $('contagem-rotulo').textContent = c.mensagem;
    if (!c.alvo) { $('contagem-tempo').textContent = 'Prazo encerrado'; return false; }
    var s = Math.max(0, Math.floor((Date.parse(c.alvo) - agora.getTime()) / 1000));
    var dias = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
    $('contagem-tempo').textContent = 'Faltam ' + (dias > 0 ? dias + (dias === 1 ? ' dia ' : ' dias ') : '') + duasCasas(h) + 'h ' + duasCasas(m) + 'min ' + duasCasas(seg) + 's';
    return true;
  }
  if (atualizarContagem()) setInterval(atualizarContagem, 1000);

  // ------------------------------------------------ diagnóstico em quatro cliques
  var respostas = { atividade: null, fatorR: null, faixa: null, mix: null, compras: null };
  var PASSOS = ['atividade', 'fator-r', 'faixa', 'mix', 'compras'];
  var NUMERO = { atividade: 1, 'fator-r': 1, faixa: 2, mix: 3, compras: 4 };
  var atual = 'atividade', ultimo = null;

  function atividadeAtual() { return D.atividade(respostas.atividade); }

  function irPara(passo, focar) {
    atual = passo;
    PASSOS.forEach(function (p) { $('p-' + p).hidden = p !== passo; });
    var n = NUMERO[passo];
    $('passo-rotulo').textContent = 'Pergunta ' + n + ' de 4';
    $('barra').style.width = (n * 25) + '%';
    $('barra-progresso').setAttribute('aria-valuenow', String(n));
    $('voltar').hidden = passo === 'atividade';
    $('erros').hidden = true;
    if (focar === false) return;
    $('p-' + passo).querySelector('h3').focus({ preventScroll: true });
    var caixa = $('perguntas');
    if (caixa.getBoundingClientRect().top < 0) caixa.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function anterior() {
    var a = atividadeAtual();
    return { 'fator-r': 'atividade', faixa: a && a.fatorR ? 'fator-r' : 'atividade', mix: 'faixa', compras: 'mix' }[atual];
  }

  // Grupo de botões de escolha única; cada clique marca e chama aoEscolher.
  function grupo(id, itens, aoEscolher) {
    var caixa = $(id);
    itens.forEach(function (it) {
      var b = el('button', undefined, 'opcao');
      b.type = 'button';
      b.setAttribute('data-valor', String(it.valor));
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', it.rotulo, 'opcao-rotulo'));
      if (it.detalhe) b.appendChild(el('span', it.detalhe, 'opcao-detalhe'));
      b.addEventListener('click', function () { marcar(id, it.valor); aoEscolher(it.valor); });
      caixa.appendChild(b);
    });
  }
  function marcar(id, valor) {
    Array.prototype.forEach.call($(id).children, function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-valor') === String(valor)));
    });
  }

  grupo('opcoes-atividade', D.ATIVIDADES.map(function (a) { return { valor: a.id, rotulo: a.rotulo }; }), function (v) {
    var mudou = respostas.atividade !== v;
    respostas.atividade = v;
    var a = atividadeAtual();
    // A atividade sugere a resposta de compras; quem já escolheu na pergunta 4 e mudou de atividade recebe a nova sugestão.
    if (mudou || !respostas.compras) { respostas.compras = a.compras; marcar('opcoes-compras', a.compras); }
    irPara(a.fatorR ? 'fator-r' : 'faixa');
  });
  grupo('opcoes-fator-r', [
    { valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }, { valor: 'naosei', rotulo: 'Não sei' }
  ], function (v) { respostas.fatorR = v; irPara('faixa'); });
  grupo('opcoes-faixa', D.FAIXAS_RECEITA.map(function (f) { return { valor: f.id, rotulo: f.rotulo }; }), function (v) {
    respostas.faixa = v; irPara('mix');
  });
  grupo('opcoes-mix', D.MIXES.map(function (m) {
    return { valor: m.id, rotulo: m.rotulo, detalhe: m.detalhe };
  }), function (v) { respostas.mix = v; irPara('compras'); });
  grupo('opcoes-compras', D.COMPRAS.map(function (c) {
    return { valor: c.id, rotulo: c.rotulo, detalhe: c.pct + '%' };
  }), function (v) { respostas.compras = v; });

  $('voltar').addEventListener('click', function () { var p = anterior(); if (p) irPara(p); });

  $('ver-diagnostico').addEventListener('click', function () {
    var rr = D.diagnosticarRapido(respostas);
    var caixa = $('erros');
    if (!rr.ok) {
      caixa.textContent = '';
      var ul = el('ul'); preencherLista(ul, rr.erros); caixa.appendChild(ul);
      caixa.hidden = false;
      return;
    }
    ultimo = rr;
    mostrarResultado(rr);
    enviarEvento(D.eventoAnonimo(rr, new Date()));
    prepararInscricao(rr);
  });

  $('refazer').addEventListener('click', function () {
    $('resultado').hidden = true;
    $('perguntas').hidden = false;
    irPara('atividade');
  });

  // Evento anônimo: fetch sem cookies (no-cors); sem fetch, sendBeacon.
  function enviarEvento(ev) {
    if (!COLETA) return;
    var corpo = JSON.stringify(ev);
    try {
      if (window.fetch) {
        fetch(COLETA, { method: 'POST', mode: 'no-cors', credentials: 'omit', keepalive: true, body: corpo })['catch'](function () {});
      } else if (navigator.sendBeacon) {
        navigator.sendBeacon(COLETA, corpo);
      }
    } catch (e) { /* a coleta nunca atrapalha o diagnóstico */ }
  }

  // ------------------------------------------------ resultado
  var FRASES = {
    hibrido: 'Para o seu perfil, pagar IBS e CBS por fora (híbrido) tende a deixar mais dinheiro na empresa.',
    puro: 'Para o seu perfil, ficar no Simples puro tende a deixar mais dinheiro na empresa.',
    analisar: 'A diferença é pequena ou muda de sinal conforme a alíquota final: vale analisar com seu contador.'
  };
  function arred(v) { return Math.round(v / 100) * 100; }
  function intervaloTexto(iv) {
    var a = arred(iv.min), b = arred(iv.max);
    return a === b ? D.moedaSinal(a) : D.moedaSinal(a) + ' a ' + D.moedaSinal(b);
  }

  function mostrarResultado(rr) {
    var r = rr.diagnostico, al = r.aliquota, sem = rr.semaforo;
    $('luz').className = 'luz ' + sem.cor;
    $('rotulo-semaforo').textContent = sem.rotulo;
    $('frase-resultado').textContent = FRASES[rr.resultado];
    $('valor-ano').textContent = intervaloTexto(rr.intervaloAno);
    $('valor-ano').className = rr.resultado === 'hibrido' ? 'positivo' : (rr.resultado === 'puro' ? 'negativo' : '');

    var nota = $('nota-fator-r');
    nota.hidden = !rr.fatorRIncerto;
    if (rr.fatorRIncerto) {
      nota.textContent = 'Como você não sabe se salários + pró-labore passam de 28%, mostramos o pior caso (Anexo ' + rr.anexo + '). No Anexo ' + rr.outroAnexo.anexo + ', a diferença por ano seria de ' + intervaloTexto(rr.outroAnexo.intervaloAno) + '.';
    }

    var fr = { sim: 'sim', nao: 'não', naosei: 'não sei' }[rr.respostas.fatorR];
    function minuscula(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
    var suas = [rr.atividade.rotulo];
    if (fr) suas.push('salários + pró-labore acima de 28%: ' + fr);
    suas.push('faturamento ' + minuscula(rr.faixa.rotulo), 'para quem mais vende: ' + minuscula(rr.mix.rotulo),
      'compras: ' + minuscula(rr.compras.rotulo) + ' (' + rr.compras.pct + '% do faturamento)');
    preencherLista($('lista-premissas'), [
      'Suas respostas: ' + suas.join('; ') + '.',
      'Clientes: ' + rr.mix.credita + '% empresas do Lucro Presumido ou Real (aproveitam o crédito), ' + rr.mix.simples + '% empresas do Simples e ' + rr.mix.consumidor + '% consumidor final.',
      'Faturamento: o cálculo usa o meio da faixa, ' + D.moeda(rr.faixa.meio) + ' em 12 meses (' + D.moeda(r.receitaMensal) + ' por mês). O intervalo cobre a faixa inteira e CBS + IBS de ' + D.pct(PL.aliquotaReferencia.minimo, 0) + ' a ' + D.pct(PL.aliquotaReferencia.maximo, 0) + '. No meio da faixa, com ' + D.pct(r.aliquotaPadrao, 1) + ', a diferença é de ' + D.moedaSinal(arred(r.diferencaAno)) + ' por ano.',
      r.anexoNome + ', ' + al.faixa + 'ª faixa: alíquota efetiva do Simples de ' + D.pct(al.efetiva) + '. Fatia de CBS + IBS no DAS: ' + D.pct(al.s) + ' (' + (al.sStatus === 'oficial' ? 'LC 227/2026, Anexo XX' : 'PIS + Cofins atuais, a conferir na LC 227') + '). No híbrido, o DAS cai para ' + D.pct(r.central.cenarios.taxaDasHibrido) + '.',
      'IBS/CBS por fora: ' + D.pct(r.aliquotaPadrao, 1) + ' (TCU)' + (r.reducao > 0 ? ', com a redução de ' + D.pct(r.reducao, 0) + ' prevista para a atividade (' + D.pct(r.aliquotaPadrao * (1 - r.reducao), 2) + ')' : '') + '. Crédito das compras pela alíquota cheia, supondo fornecedores do regime regular.',
      'Preço no híbrido: o cliente empresa do Lucro Presumido ou Real mantém o custo de hoje (o preço sem IBS/CBS cai um pouco e ele recupera o crédito); para empresas do Simples e consumidor final, o preço final fica igual ao de hoje.',
      'Não considera: sublimite, ICMS/ISS fora do DAS, substituição tributária, exportação, saldo credor acumulado, custo de contabilidade e reação dos clientes.'
    ]);

    var rec = D.recadoPorData(new Date());
    preencherLista($('lista-alertas'), [rec.titulo + ' ' + rec.textos.join(' ')].concat(r.alertas));

    $('perguntas').hidden = true;
    var res = $('resultado');
    res.hidden = false;
    $('titulo-resultado').focus({ preventScroll: true });
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ------------------------------------------------ inscrição na lista (Brevo) e PDF
  // A lista aparece com o resultado ou pelos botões "Entrar na lista" (página enxuta antes disso).
  function mostrarLista() { $('lista').hidden = false; }
  if (window.location.hash !== '#lista') $('lista').hidden = true;
  Array.prototype.forEach.call(document.querySelectorAll('a[href="#lista"]'), function (a) {
    a.addEventListener('click', mostrarLista);
  });
  // Sugestão do campo RAMO do Brevo pela atividade (valores do formulário).
  var RAMO_POR_ATIVIDADE = {
    comercio: '1', industria: '2', servicos: '3', contabilidade: '6', educacao: '3',
    intelectual: '3', engenharia: '4', saude: '5', advocacia: '4', construcao: '3'
  };
  var form = $('sib-form'), botao = form && form.querySelector('button[type="submit"]');
  var enviando = false, inscrito = false;

  function captchaOk() {
    try { return !!(window.grecaptcha && window.grecaptcha.getResponse && window.grecaptcha.getResponse()); } catch (e) { return false; }
  }
  function atualizarBotao() {
    if (!botao || enviando || inscrito) return;
    var falta = D.camposFaltando({ email: $('EMAIL').value, ramo: $('RAMO').value, optin: $('OPT_IN').checked, captcha: captchaOk() });
    botao.disabled = falta.length > 0;
    $('falta-lista').textContent = falta.length ? 'Para liberar o botão, falta: ' + falta.join(', ') + '.' : '';
  }

  function prepararInscricao(rr) {
    mostrarLista();
    if (!form) return;
    $('DIAG_RESULTADO').value = rr.resultado;
    $('DIAG_RESUMO').value = D.resumoDiagnostico(rr, new Date());
    var ramo = $('RAMO');
    if (ramo && !ramo.value && RAMO_POR_ATIVIDADE[rr.atividade.id]) {
      ramo.value = RAMO_POR_ATIVIDADE[rr.atividade.id];
      ramo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    $('rotulo-botao-lista').textContent = 'Baixar meu PDF e entrar na lista';
    atualizarBotao();
  }

  function abrirPdf() {
    if (!ultimo) return;
    $('data-impressao').textContent = new Date().toLocaleString('pt-BR');
    window.print();
  }
  // No PDF, premissas e alertas saem abertos.
  var abertosAntes = [];
  window.addEventListener('beforeprint', function () {
    abertosAntes = ['bloco-premissas', 'bloco-alertas'].map(function (id) { var d = $(id), a = d.open; d.open = true; return [d, a]; });
  });
  window.addEventListener('afterprint', function () {
    abertosAntes.forEach(function (p) { p[0].open = p[1]; });
  });
  $('abrir-pdf').addEventListener('click', abrirPdf);

  if (form) {
    form.addEventListener('input', atualizarBotao);
    form.addEventListener('change', atualizarBotao);
    var cap = $('sib-captcha');
    if (cap) cap.addEventListener('captchaChange', atualizarBotao);
    setInterval(atualizarBotao, 1000); // o reCAPTCHA expira sem avisar
    form.addEventListener('submit', function () { if (!botao.disabled) enviando = true; }, true);

    // O main.js do Brevo marca a mensagem de sucesso ou de erro com a classe --active.
    var sucesso = $('success-message'), erro = $('error-message');
    new MutationObserver(function () {
      if (sucesso.classList.contains('sib-form-message-panel--active')) {
        if (inscrito) return;
        inscrito = true; enviando = false;
        $('sib-container').style.display = 'none';
        $('falta-lista').textContent = '';
        $('pos-inscricao').hidden = false;
        $('abrir-pdf').hidden = !ultimo;
        abrirPdf();
      } else if (erro.classList.contains('sib-form-message-panel--active')) {
        enviando = false;
        atualizarBotao();
      }
    }).observe($('sib-form-container'), { subtree: true, attributes: true, attributeFilter: ['class'] });
    atualizarBotao();
  }

  // ------------------------------------------------ exemplo B2B × B2C
  (function exemplo() {
    var ex = D.exemploPagina(), c = ex.cenarios, tb = document.querySelector('#tabela-exemplo tbody');
    function v(x) { return D.fmtNum(x, 0); }
    var linhas = [
      ['Preço sem IBS/CBS', v(c.puro.base), v(c.credita.base), v(c.naoCredita.base)],
      ['IBS/CBS destacado', '—', v(c.credita.destacado), v(c.naoCredita.destacado)],
      ['Cliente paga', v(c.puro.clientePaga), v(c.credita.clientePaga), v(c.naoCredita.clientePaga)],
      ['Crédito do cliente', v(c.puro.creditoCliente), v(c.credita.creditoCliente), '0'],
      ['Custo líquido do cliente', v(c.puro.custoLiquidoCliente), v(c.credita.custoLiquidoCliente), v(c.naoCredita.custoLiquidoCliente)],
      ['DAS', v(c.puro.das), v(c.credita.das), v(c.naoCredita.das)],
      ['Alíquota do DAS', D.pct(c.e), D.pct(c.taxaDasHibrido), D.pct(c.taxaDasHibrido)],
      ['IBS/CBS a recolher (−' + v(c.creditos) + ' de crédito)', '—', v(c.credita.aRecolher), v(c.naoCredita.aRecolher)],
      ['Empresa fica com', v(c.puro.fica), v(c.credita.fica), v(c.naoCredita.fica)],
      ['Diferença para o puro', '—', D.moedaSinal(c.credita.fica - c.puro.fica).replace('R$ ', ''), D.moedaSinal(c.naoCredita.fica - c.puro.fica).replace('R$ ', '')]
    ];
    linhas.forEach(function (l, i) {
      var tr = el('tr'); if (i >= linhas.length - 2) tr.className = 'destaque';
      l.forEach(function (t) { tr.appendChild(el('td', t)); });
      tb.appendChild(tr);
    });
    $('conclusao-exemplo').textContent = 'Mesmo serviço, mesma alíquota: com clientes empresa, o híbrido deixa ' + D.moeda(c.credita.fica - c.puro.fica) + ' a mais por mês; com consumidor final, ' + D.moeda(c.puro.fica - c.naoCredita.fica) + ' a menos. O que decide é o mix de clientes e a formação de preço.';
  })();

  $('data-parametros').textContent = PL.consulta.split('-').reverse().join('/');
  $('pendencias').textContent = PL.pendencias.join(' ');
})();
