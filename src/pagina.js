/*
 * Interface da página: contagem, formulário do diagnóstico, resultado e
 * exemplo. Tudo roda no navegador; nada é enviado.
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
  function classeSinal(v) { return Math.round(v) > 0 ? 'positivo' : (Math.round(v) < 0 ? 'negativo' : ''); }

  // ------------------------------------------------ contagem e recado do topo
  function duasCasas(n) { return (n < 10 ? '0' : '') + n; }
  function atualizarContagem() {
    var agora = new Date(), recado = D.recadoPorData(agora);
    var topo = $('recado-topo');
    topo.textContent = '';
    topo.appendChild(el('p', recado.titulo, 'titulo-recado'));
    recado.textos.forEach(function (t) { topo.appendChild(el('p', t)); });
    if (!recado.alvo) {
      $('contagem-tempo').textContent = 'Prazo encerrado';
      $('contagem-rotulo').textContent = recado.titulo;
      return false;
    }
    var ms = Date.parse(recado.alvo) - agora.getTime();
    var s = Math.max(0, Math.floor(ms / 1000));
    var dias = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
    $('contagem-tempo').textContent = (dias > 0 ? dias + (dias === 1 ? ' dia ' : ' dias ') : '') + duasCasas(h) + 'h ' + duasCasas(m) + 'min ' + duasCasas(seg) + 's';
    $('contagem-rotulo').textContent = 'faltam ' + recado.alvoRotulo;
    return true;
  }
  if (atualizarContagem()) setInterval(atualizarContagem, 1000);

  // ------------------------------------------------ formulário
  var selAtividade = $('atividade'), selReducao = $('reducao');
  D.ATIVIDADES.forEach(function (a) {
    var o = el('option', a.rotulo); o.value = a.id; selAtividade.appendChild(o);
  });
  ['nenhuma', 'trinta', 'sessenta'].forEach(function (k) {
    var o = el('option', PL.reducoes[k].rotulo); o.value = k; selReducao.appendChild(o);
  });

  selAtividade.addEventListener('change', function () {
    var a = D.atividade(selAtividade.value);
    $('bloco-fator-r').hidden = !(a && a.fatorR);
    if (a) selReducao.value = a.reducao;
  });

  function lerRadio(nome) {
    var r = document.querySelector('input[name="' + nome + '"]:checked');
    return r ? r.value : undefined;
  }
  // Total do mix: avisa sem bloquear a digitação.
  function pctTexto(v) { return D.fmtNum(v, Math.round(v) === v ? 0 : 1) + '%'; }
  function somaMix() {
    var soma = ['pctCredita', 'pctSimples', 'pctConsumidor'].reduce(function (acc, id) {
      var v = D.num($(id).value); return acc + (isNaN(v) ? 0 : v);
    }, 0);
    soma = Math.round(soma * 10) / 10;
    var box = $('soma-mix'), fecha = Math.abs(soma - 100) <= 0.5;
    box.textContent = fecha ? 'Total: 100%'
      : 'Total: ' + pctTexto(soma) + ' · ' + (soma < 100 ? 'faltam ' + pctTexto(100 - soma) : 'passou ' + pctTexto(soma - 100));
    box.className = 'total-mix ' + (fecha ? 'ok' : 'falta');
  }
  ['pctCredita', 'pctSimples', 'pctConsumidor'].forEach(function (id) { $(id).addEventListener('input', somaMix); });
  somaMix();

  // Valores em reais com separador de milhar enquanto a pessoa digita (centavos são ignorados).
  Array.prototype.forEach.call(document.querySelectorAll('input[data-formato="milhar"]'), function (inp) {
    inp.addEventListener('input', function () {
      var digitos = inp.value.split(',')[0].replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      inp.value = digitos ? D.fmtNum(Number(digitos), 0) : '';
    });
  });

  $('form-diagnostico').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var a = D.atividade(selAtividade.value);
    var f28 = lerRadio('folha28');
    var r = D.diagnosticar({
      atividade: selAtividade.value,
      folha28: a && a.fatorR ? f28 : false,
      rbt12: $('rbt12').value,
      pctCredita: $('pctCredita').value, pctSimples: $('pctSimples').value, pctConsumidor: $('pctConsumidor').value,
      pctCompras: $('pctCompras').value,
      reducao: selReducao.value,
      politica: lerRadio('politica')
    });
    var caixa = $('erros');
    if (!r.ok) {
      caixa.textContent = '';
      var ul = el('ul'); preencherLista(ul, r.erros); caixa.appendChild(ul);
      caixa.hidden = false; $('resultado').hidden = true;
      caixa.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    caixa.hidden = true;
    mostrarResultado(r);
  });

  function mostrarResultado(r) {
    var sem = r.semaforo;
    $('luz').className = 'luz ' + sem.cor;
    $('rotulo-semaforo').textContent = sem.rotulo;
    $('texto-semaforo').textContent = sem.texto;
    var dif = r.diferencaMes;
    $('frase-resultado').textContent = Math.round(dif) === 0
      ? 'Com CBS + IBS de ' + D.pct(r.aliquotaPadrao, 1) + ', o resultado é praticamente o mesmo nos dois regimes.'
      : 'Com CBS + IBS de ' + D.pct(r.aliquotaPadrao, 1) + ' (TCU), o híbrido deixa ' + D.moeda(Math.abs(dif)) + ' por mês ' + (dif > 0 ? 'a mais' : 'a menos') + ' na empresa do que o Simples puro (' + D.pct(r.pctReceita, 1) + ' da receita).';
    $('dif-mes').textContent = D.moedaSinal(dif);
    $('dif-mes').className = classeSinal(dif);
    $('dif-ano').textContent = D.moedaSinal(r.diferencaAno);
    $('dif-ano').className = classeSinal(r.diferencaAno);
    $('fica-puro').textContent = D.moeda(r.central.ficaPuro);
    $('fica-hibrido').textContent = D.moeda(r.central.ficaHibrido);
    var fx = r.faixaAliquota;
    $('frase-faixa').textContent = 'Se a alíquota final ficar entre ' + D.pct(PL.aliquotaReferencia.minimo, 0) + ' e ' + D.pct(PL.aliquotaReferencia.maximo, 0) + ', a diferença por ano vai de ' + D.moedaSinal(fx.minAno) + ' a ' + D.moedaSinal(fx.maxAno) + '.';

    var rec = D.recadoPorData(new Date()), box = $('recado-resultado');
    box.textContent = '';
    box.appendChild(el('p', rec.titulo, 'titulo-recado'));
    rec.textos.forEach(function (t) { box.appendChild(el('p', t)); });

    var al = r.aliquota;
    preencherLista($('lista-premissas'), [
      r.anexoNome + ', ' + al.faixa + 'ª faixa: alíquota efetiva do Simples de ' + D.pct(al.efetiva) + '.',
      'Fatia de CBS + IBS no DAS: ' + D.pct(al.s) + ' (' + (al.sStatus === 'oficial' ? 'LC 227/2026, Anexo XX' : 'PIS + Cofins atuais, a conferir na LC 227') + '). No híbrido, o DAS cai para ' + D.pct(r.central.cenarios.taxaDasHibrido) + '.',
      'Receita do mês: ' + D.moeda(r.receitaMensal) + ' (receita de 12 meses ÷ 12). Compras com crédito: ' + D.moeda(r.compras) + ' por mês.',
      'IBS/CBS por fora: ' + D.pct(r.aliquotaPadrao, 1) + (r.reducao > 0 ? ', com redução de ' + D.pct(r.reducao, 0) + ' (' + D.pct(r.aliquotaPadrao * (1 - r.reducao), 2) + ')' : '') + '. Crédito das compras pela alíquota cheia.',
      r.politica === 'preco'
        ? 'Clientes empresa: o preço total cobrado continua o mesmo.'
        : 'Clientes do Lucro Presumido ou Real: custo líquido igual ao de hoje. Demais clientes: preço final igual ao de hoje.',
      'Não considera: sublimite, ICMS/ISS fora do DAS, substituição tributária, exportação, saldo credor acumulado, custo de contabilidade e reação dos clientes.'
    ]);
    $('bloco-alertas').hidden = !r.alertas.length;
    preencherLista($('lista-alertas'), r.alertas);

    $('data-impressao').textContent = new Date().toLocaleString('pt-BR');
    var res = $('resultado');
    res.hidden = false;
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('imprimir').addEventListener('click', function () { window.print(); });

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
