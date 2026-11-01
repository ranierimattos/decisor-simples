/*
 * DIAGNÓSTICO RÁPIDO: SIMPLES PURO × HÍBRIDO (1º semestre de 2027)
 * ---------------------------------------------------------------------------
 * Roda no navegador e no Node (node --test). O motor não faz requisições (o
 * envio do evento anônimo fica em src/pagina.js). Parâmetros legais em
 * parametros-2027.js.
 *
 * Notação: P = receita do mês; e = alíquota efetiva do Simples; s = fatia de
 * CBS + IBS no DAS; t = CBS + IBS × (1 − redução); c = alíquota cheia sobre as
 * compras com crédito.
 *   Puro: a empresa fica com P × (1 − e).
 *   Híbrido, cliente que credita (mantém o custo líquido): B = P × (1 − e·s).
 *   Híbrido, cliente que não credita (mantém o preço final): B = P / (1 + t).
 *   Híbrido: a empresa fica com B × (1 − e·(1 − s)), mais compras × c uma vez no mês.
 */
(function (raiz) {
  'use strict';

  var PL = raiz.Parametros2027 || (typeof require === 'function' ? require('./parametros-2027.js') : null);
  if (!PL) throw new Error('parametros-2027.js precisa ser carregado antes de diagnostico.js');

  var LIMIAR_PADRAO = 0.005; // 0,5% da receita
  var ISS_MAXIMO = 0.05;
  var VERSAO_MOTOR = '2.0.0';

  // compras: resposta pré-marcada na pergunta 4 (ids de COMPRAS).
  var ATIVIDADES = [
    { id: 'comercio', rotulo: 'Comércio (revenda de mercadorias)', anexo: 'I', reducao: 'nenhuma', compras: 'muito' },
    { id: 'industria', rotulo: 'Indústria', anexo: 'II', reducao: 'nenhuma', compras: 'muito' },
    { id: 'servicos', rotulo: 'Serviços em geral (salão, academia, manutenção, agência, transporte municipal)', anexo: 'III', reducao: 'nenhuma', compras: 'pouco' },
    { id: 'contabilidade', rotulo: 'Contabilidade', anexo: 'III', reducao: 'trinta', compras: 'quase-nada' },
    { id: 'educacao', rotulo: 'Educação (escola, curso)', anexo: 'III', reducao: 'sessenta', compras: 'quase-nada' },
    { id: 'intelectual', rotulo: 'TI, consultoria, publicidade, design', fatorR: true, reducao: 'nenhuma', compras: 'quase-nada' },
    { id: 'engenharia', rotulo: 'Engenharia, arquitetura', fatorR: true, reducao: 'trinta', compras: 'pouco' },
    { id: 'saude', rotulo: 'Saúde (médico, dentista, psicólogo, fisioterapeuta)', fatorR: true, reducao: 'sessenta', compras: 'pouco' },
    { id: 'advocacia', rotulo: 'Advocacia', anexo: 'IV', reducao: 'trinta', compras: 'quase-nada' },
    { id: 'construcao', rotulo: 'Construção civil, vigilância, limpeza', anexo: 'IV', reducao: 'nenhuma', compras: 'bastante' }
  ];

  // Pergunta 2: as 6 faixas de receita bruta em 12 meses do Simples (limites da LC 123).
  var ROTULOS_FAIXA = [
    'Até R$ 180 mil', 'De R$ 180 mil a R$ 360 mil', 'De R$ 360 mil a R$ 720 mil',
    'De R$ 720 mil a R$ 1,8 milhão', 'De R$ 1,8 milhão a R$ 3,6 milhões', 'De R$ 3,6 milhões a R$ 4,8 milhões'
  ];
  var FAIXAS_RECEITA = PL.anexos.I.faixas.map(function (f, i, todas) {
    var de = i ? todas[i - 1].ate : 0;
    return { id: i + 1, de: de, ate: f.ate, meio: (de + f.ate) / 2, rotulo: ROTULOS_FAIXA[i] };
  });

  // Pergunta 3: mix de clientes pronto, em % (Lucro Presumido/Real, Simples, consumidor final).
  var MIXES = [
    { id: 'empresas', rotulo: 'Empresas maiores (fora do Simples)', detalhe: 'Lucro Presumido ou Real', credita: 70, simples: 15, consumidor: 15 },
    { id: 'simples', rotulo: 'Empresas do Simples', detalhe: 'outras pequenas empresas', credita: 15, simples: 70, consumidor: 15 },
    { id: 'consumidor', rotulo: 'Consumidor final', detalhe: 'pessoas físicas', credita: 10, simples: 10, consumidor: 80 },
    { id: 'dividido', rotulo: 'Bem dividido', detalhe: 'um pouco de cada', credita: 34, simples: 33, consumidor: 33 }
  ];

  // Pergunta 4: compras de outras empresas, em % do faturamento.
  var COMPRAS = [
    { id: 'quase-nada', rotulo: 'Quase nada', pct: 5 },
    { id: 'pouco', rotulo: 'Pouco', pct: 10 },
    { id: 'bastante', rotulo: 'Bastante', pct: 25 },
    { id: 'muito', rotulo: 'Muito', pct: 40 }
  ];

  var RESULTADO_POR_COR = { verde: 'hibrido', amarelo: 'analisar', vermelho: 'puro' };

  function porId(lista, id) {
    for (var i = 0; i < lista.length; i++) if (String(lista[i].id) === String(id)) return lista[i];
    return null;
  }
  function atividade(id) { return porId(ATIVIDADES, id); }

  function anexoDaAtividade(id, folha28) {
    var a = atividade(id);
    if (!a) return null;
    if (a.fatorR) return folha28 ? 'III' : 'V';
    return a.anexo;
  }

  // Fatia de CBS + IBS no DAS de 2027: lida na LC 227 quando disponível; senão, PIS + Cofins.
  function partilhaCbsIbs(anexoId, idx) {
    var rep = PL.anexos[anexoId].faixas[idx].reparticao;
    var pisCofins = rep.PIS + rep.COFINS;
    var lida = PL.partilha2027[anexoId] && PL.partilha2027[anexoId].faixas[idx];
    if (lida && lida.CBS !== null && lida.IBS !== null) {
      return { valor: lida.CBS + lida.IBS, cbs: lida.CBS, ibs: lida.IBS, status: 'oficial', origem: 'LC 227/2026, Anexo XX' };
    }
    return { valor: pisCofins, cbs: null, ibs: null, status: 'secundária', origem: 'PIS + Cofins atuais da mesma faixa (LC 123)' };
  }

  function aliquotaEfetiva(anexoId, rbt12) {
    var anexo = PL.anexos[anexoId];
    if (!anexo) throw new Error('Anexo inválido: ' + anexoId);
    var fx = anexo.faixas, base = Math.max(0, Number(rbt12) || 0), idx = -1;
    for (var i = 0; i < fx.length; i++) { if (base <= fx[i].ate) { idx = i; break; } }
    var excede = idx < 0;
    if (excede) idx = fx.length - 1;
    var f = fx[idx];
    var ef = Math.max(0, base > 0 ? (base * f.aliquota - f.parcelaDeduzir) / base : fx[0].aliquota);
    var p = partilhaCbsIbs(anexoId, idx);
    var s = p.valor, issLimitado = false;
    // ISS efetivo limitado a 5%: a diferença vai proporcionalmente aos demais tributos.
    if (f.reparticao.ISS > 0 && ef * f.reparticao.ISS > ISS_MAXIMO) {
      s = (ef - ISS_MAXIMO) * (p.valor / (1 - f.reparticao.ISS)) / ef;
      issLimitado = true;
    }
    return {
      anexo: anexoId, faixa: idx + 1, nominal: f.aliquota, parcelaDeduzir: f.parcelaDeduzir,
      efetiva: ef, s: s, sStatus: p.status, sOrigem: p.origem, cbs: p.cbs, ibs: p.ibs,
      issLimitado: issLimitado, excedeLimite: excede || base > PL.limiteSimples.valor,
      acimaSublimite: base > PL.sublimite.valor
    };
  }

  /*
   * Detalhe dos três cenários de um mês, sem mix: puro, híbrido com cliente que
   * credita e híbrido com cliente que não credita. Créditos incluídos em cada
   * cenário do híbrido.
   */
  function detalharCenarios(d) {
    var P = d.receita, e = d.e, s = d.s, t = d.t, c = d.c === undefined ? d.t : d.c;
    var compras = d.compras || 0;
    var creditos = compras * c;
    var taxaDasHibrido = e * (1 - s);
    var bCredita = d.politica === 'preco' ? P / (1 + t) : P * (1 - e * s);
    var bNaoCredita = P / (1 + t);
    function hibrido(B, credita) {
      var destacado = B * t, das = B * taxaDasHibrido;
      return {
        base: B, destacado: destacado, clientePaga: B + destacado,
        creditoCliente: credita ? destacado : 0,
        custoLiquidoCliente: credita ? B : B + destacado,
        das: das, aRecolher: destacado - creditos,
        ficaSemCreditos: B - das, fica: B - das + creditos
      };
    }
    var dasPuro = P * e;
    return {
      receita: P, e: e, s: s, t: t, c: c, compras: compras, creditos: creditos,
      taxaDasHibrido: taxaDasHibrido,
      puro: {
        base: P, destacado: 0, clientePaga: P, creditoCliente: P * e * s,
        custoLiquidoCliente: P - P * e * s, das: dasPuro, aRecolher: 0, fica: P - dasPuro
      },
      credita: hibrido(bCredita, true),
      naoCredita: hibrido(bNaoCredita, false)
    };
  }

  // Um mês com o mix de clientes (frações que somam 1).
  function compararMes(d) {
    var cen = detalharCenarios(d);
    var mix = d.mix, naoCred = (mix.simples || 0) + (mix.consumidor || 0);
    var ficaHibrido = (mix.credita || 0) * cen.credita.ficaSemCreditos + naoCred * cen.naoCredita.ficaSemCreditos + cen.creditos;
    return {
      cenarios: cen, ficaPuro: cen.puro.fica, ficaHibrido: ficaHibrido,
      diferenca: ficaHibrido - cen.puro.fica
    };
  }

  function num(v) {
    if (typeof v === 'number') return v;
    if (v === null || v === undefined) return NaN;
    var s = String(v).trim().replace(/\s|R\$|%/g, '');
    if (s === '') return NaN;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return Number(s);
  }

  function semaforo(difMin, difMax, receita, limiar) {
    var l = (limiar === undefined ? LIMIAR_PADRAO : limiar) * receita;
    if (difMin > l) return { cor: 'verde', rotulo: 'Tende ao híbrido', texto: 'Em toda a faixa de alíquota testada, o híbrido deixa mais dinheiro na empresa.' };
    if (difMax < -l) return { cor: 'vermelho', rotulo: 'Tende ao puro', texto: 'Em toda a faixa de alíquota testada, o Simples puro deixa mais dinheiro na empresa.' };
    return { cor: 'amarelo', rotulo: 'Analise com seu contador', texto: 'A diferença é pequena ou muda de sinal conforme a alíquota final. Vale uma análise detalhada.' };
  }

  /*
   * Entradas: atividade, folha28 (true/false), rbt12, pctCredita, pctSimples,
   * pctConsumidor, pctCompras (0–100), reducao ('nenhuma' | 'trinta' | 'sessenta'),
   * politica ('custo' | 'preco'). Opcionais: aliquota (CBS + IBS), limiar.
   */
  function diagnosticar(ent) {
    var erros = [], alertas = [];
    var at = atividade(ent.atividade);
    if (!at) erros.push('Escolha a atividade.');
    var folha28 = ent.folha28 === true || ent.folha28 === 'sim';
    if (at && at.fatorR && ent.folha28 !== true && ent.folha28 !== false && ent.folha28 !== 'sim' && ent.folha28 !== 'nao') {
      erros.push('Informe se a folha é de pelo menos 28% do faturamento.');
    }
    var rbt12 = num(ent.rbt12);
    if (!(rbt12 > 0)) erros.push('Informe a receita bruta dos últimos 12 meses.');
    else if (rbt12 > PL.limiteSimples.valor) erros.push('Receita acima de R$ 4,8 milhões: a empresa fica fora do Simples Nacional.');
    var pc = num(ent.pctCredita), ps = num(ent.pctSimples), pf = num(ent.pctConsumidor), pcomp = num(ent.pctCompras);
    [pc, ps, pf, pcomp].forEach(function (v, i) {
      if (!(v >= 0 && v <= 100)) erros.push(['% de vendas para Lucro Presumido/Real', '% de vendas para empresas do Simples', '% de vendas para consumidor final', '% de compras com crédito'][i] + ': use um número de 0 a 100.');
    });
    if (pc >= 0 && ps >= 0 && pf >= 0 && Math.abs(pc + ps + pf - 100) > 0.5) erros.push('As três parcelas de vendas precisam somar 100% (hoje somam ' + fmtNum(pc + ps + pf, 0) + '%).');
    var red = PL.reducoes[ent.reducao];
    if (!red || typeof red.valor !== 'number') erros.push('Escolha a redução de alíquota.');
    var politica = ent.politica === 'preco' ? 'preco' : 'custo';
    if (erros.length) return { ok: false, erros: erros };

    var anexoId = anexoDaAtividade(at.id, folha28);
    var al = aliquotaEfetiva(anexoId, rbt12);
    var P = rbt12 / 12;
    var mix = { credita: pc / 100, simples: ps / 100, consumidor: pf / 100 };
    var compras = P * pcomp / 100;
    var ref = PL.aliquotaReferencia;
    var tPadrao = ent.aliquota === undefined ? ref.padrao : num(ent.aliquota);

    function rodar(aliq) {
      return compararMes({ receita: P, e: al.efetiva, s: al.s, t: aliq * (1 - red.valor), c: aliq, compras: compras, mix: mix, politica: politica });
    }
    var central = rodar(tPadrao);
    var grade = [];
    for (var a = ref.minimo; a <= ref.maximo + 1e-9; a += 0.0025) grade.push(Math.round(a * 10000) / 10000);
    if (grade.indexOf(tPadrao) < 0) grade.push(tPadrao);
    var min = null, max = null;
    grade.forEach(function (aliq) {
      var r = rodar(aliq);
      if (!min || r.diferenca < min.diferenca) min = { aliquota: aliq, diferenca: r.diferenca };
      if (!max || r.diferenca > max.diferenca) max = { aliquota: aliq, diferenca: r.diferenca };
    });

    var sem = semaforo(min.diferenca, max.diferenca, P, ent.limiar);
    if (al.acimaSublimite) {
      alertas.push('Receita acima de R$ 3,6 milhões: ICMS/ISS e IBS saem do DAS, e o diagnóstico rápido não modela esse caso.');
      sem = { cor: 'amarelo', rotulo: 'Analise com seu contador', texto: 'Acima do sublimite de R$ 3,6 milhões, a conta precisa de análise detalhada.' };
    }
    if (al.sStatus !== 'oficial') alertas.push('A fatia de CBS/IBS no DAS deste anexo ainda não foi conferida na LC 227: usamos a de PIS + Cofins atual, que a lei repete no Anexo III.');
    if (red.valor > 0) alertas.push('A redução de alíquota tem requisitos (atividade, habilitação dos sócios etc.). Confirme com seu contador.');
    if (pcomp > 0) alertas.push('Créditos supõem compras de fornecedores do regime regular, com nota e sem vedação (uso e consumo pessoal não dá crédito).');

    return {
      ok: true, erros: [], alertas: alertas,
      atividade: at, anexo: anexoId, anexoNome: PL.anexos[anexoId].nome, aliquota: al,
      receitaMensal: P, compras: compras, mix: mix, politica: politica, reducao: red.valor,
      aliquotaPadrao: tPadrao, central: central,
      diferencaMes: central.diferenca, diferencaAno: central.diferenca * 12,
      pctReceita: central.diferenca / P,
      faixaAliquota: { min: min, max: max, minAno: min.diferenca * 12, maxAno: max.diferenca * 12 },
      semaforo: sem
    };
  }

  // Recado conforme a data (Brasília). agora: Date.
  function recadoPorData(agora) {
    var pz = PL.prazos, t = agora.getTime();
    if (t <= Date.parse(pz.opcao1sem2027.fim)) {
      return {
        fase: 'ate-prazo',
        titulo: 'Hoje, 30/10, é o último dia para optar pelo híbrido no 1º semestre de 2027.',
        textos: ['Se optar hoje, dá para cancelar de 03/11 a 20/12. O cancelamento é definitivo: depois dele, não se pode optar de novo para o mesmo semestre.'],
        alvo: pz.opcao1sem2027.fim, alvoRotulo: 'para optar pelo híbrido (30/10, 23h59, Brasília)'
      };
    }
    if (t <= Date.parse(pz.cancelamento.fim)) {
      return {
        fase: 'cancelamento',
        titulo: 'Optou pelo híbrido? Decida até 20/12 se mantém ou cancela.',
        textos: [
          'Optou? O cancelamento vai de 03/11 a 20/12 e é definitivo para o 1º semestre de 2027.',
          'Não optou? A próxima janela é em ' + pz.opcao2sem2027.rotulo + ', para o 2º semestre.'
        ],
        alvo: pz.cancelamento.fim, alvoRotulo: 'para cancelar a opção (20/12, 23h59, Brasília)'
      };
    }
    return {
      fase: 'encerrado',
      titulo: 'A janela de cancelamento terminou em 20/12/2026.',
      textos: ['A próxima decisão é em ' + pz.opcao2sem2027.rotulo + ', para o 2º semestre.'],
      alvo: null, alvoRotulo: ''
    };
  }

  /*
   * Diagnóstico em quatro cliques. Respostas: atividade, fatorR ('sim' | 'nao' |
   * 'naosei', só nas atividades com fator r), faixa (1–6), mix (id de MIXES) e
   * compras (id de COMPRAS; sem resposta, vale a sugestão da atividade).
   * Redução: a da atividade. Preço: mantém o custo do cliente empresa.
   * O cálculo usa o meio da faixa; o intervalo por ano cobre a faixa inteira e
   * CBS + IBS de 9% a 12%. Com fator r "não sei", vale o pior entre III e V.
   */
  function diagnosticarRapido(resp) {
    var erros = [];
    var at = atividade(resp.atividade);
    if (!at) erros.push('Escolha a atividade.');
    var fr = resp.fatorR;
    if (at && at.fatorR && ['sim', 'nao', 'naosei'].indexOf(fr) < 0) erros.push('Responda se salários + pró-labore passam de 28% do faturamento.');
    var fx = porId(FAIXAS_RECEITA, resp.faixa);
    if (!fx) erros.push('Escolha a faixa de faturamento.');
    var mx = porId(MIXES, resp.mix);
    if (!mx) erros.push('Escolha para quem você mais vende.');
    var cp = porId(COMPRAS, resp.compras || (at && at.compras));
    if (!cp) erros.push('Escolha quanto vai para compras.');
    if (erros.length) return { ok: false, erros: erros };

    function rodar(folha28, rbt12) {
      return diagnosticar({
        atividade: at.id, folha28: folha28, rbt12: rbt12,
        pctCredita: mx.credita, pctSimples: mx.simples, pctConsumidor: mx.consumidor,
        pctCompras: cp.pct, reducao: at.reducao, politica: 'custo'
      });
    }
    function cenario(folha28) {
      var meio = rodar(folha28, fx.meio);
      var pontos = [meio.faixaAliquota.minAno, meio.faixaAliquota.maxAno];
      [fx.de, fx.ate].forEach(function (rb) {
        if (!(rb > 0)) { pontos.push(0); return; }
        var r = rodar(folha28, rb);
        pontos.push(r.faixaAliquota.minAno, r.faixaAliquota.maxAno);
      });
      return { r: meio, intervaloAno: { min: Math.min.apply(null, pontos), max: Math.max.apply(null, pontos) } };
    }

    var incerto = !!at.fatorR && fr === 'naosei';
    var escolhido, outro = null;
    if (incerto) {
      var c3 = cenario(true), c5 = cenario(false);
      escolhido = c3.r.diferencaAno <= c5.r.diferencaAno ? c3 : c5;
      outro = escolhido === c3 ? c5 : c3;
    } else {
      escolhido = cenario(at.fatorR ? fr === 'sim' : false);
    }
    var r = escolhido.r;
    return {
      ok: true, erros: [],
      respostas: { atividade: at.id, fatorR: at.fatorR ? fr : '', faixa: fx.id, mix: mx.id, compras: cp.id },
      atividade: at, faixa: fx, mix: mx, compras: cp, reducao: r.reducao,
      anexo: r.anexo, diagnostico: r, semaforo: r.semaforo, resultado: RESULTADO_POR_COR[r.semaforo.cor],
      diferencaAno: r.diferencaAno, intervaloAno: escolhido.intervaloAno,
      fatorRIncerto: incerto,
      outroAnexo: outro && { anexo: outro.r.anexo, diferencaAno: outro.r.diferencaAno, intervaloAno: outro.intervaloAno, semaforo: outro.r.semaforo }
    };
  }

  // Data no fuso de Brasília (UTC−3), AAAA-MM-DD.
  function dataBrasilia(agora) {
    return new Date(agora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  }

  // Diferença por ano arredondada ao milhar (sem −0).
  function milhar(v) { return Math.round(v / 1000) * 1000 || 0; }

  /*
   * Evento anônimo de cada diagnóstico: só respostas em categorias e o resultado.
   * Sem nome, e-mail, telefone, receita exata ou identificador do aparelho.
   */
  var CAMPOS_EVENTO = ['data', 'motor', 'resultado', 'atividade', 'fatorr', 'anexo', 'faixa', 'mix', 'compras', 'reducao', 'dif'];
  function eventoAnonimo(rr, agora) {
    return {
      data: dataBrasilia(agora), motor: VERSAO_MOTOR, resultado: rr.resultado,
      atividade: rr.atividade.id, fatorr: rr.respostas.fatorR, anexo: rr.anexo,
      faixa: rr.faixa.id, mix: rr.mix.id, compras: rr.compras.pct,
      reducao: Math.round(rr.reducao * 100), dif: milhar(rr.diferencaAno)
    };
  }

  // Campo DIAG_RESUMO do Brevo: chave=valor;… (a faixa, nunca a receita).
  function resumoDiagnostico(rr, agora) {
    var ev = eventoAnonimo(rr, agora);
    var pares = [['atividade', ev.atividade], ['anexo', ev.anexo]];
    if (ev.fatorr) pares.push(['fatorr', ev.fatorr]);
    pares.push(['faixa', ev.faixa], ['mix', ev.mix], ['compras', ev.compras], ['reducao', ev.reducao],
      ['dif', ev.dif], ['motor', ev.motor], ['data', ev.data]);
    return pares.map(function (p) { return p[0] + '=' + p[1]; }).join(';');
  }

  // Contagem regressiva do topo, conforme a data (Brasília).
  function contagemPorData(agora) {
    var pz = PL.prazos, t = agora.getTime();
    if (t <= Date.parse(pz.opcao1sem2027.fim)) {
      return { fase: 'opcao', alvo: pz.opcao1sem2027.fim, mensagem: 'Último dia para optar pelo híbrido no 1º semestre de 2027 (até 30/10, 23h59, Brasília).' };
    }
    if (t < Date.parse(pz.cancelamento.inicio)) {
      return { fase: 'antes-cancelamento', alvo: pz.cancelamento.inicio, mensagem: 'Em 03/11 abre o prazo para cancelar o híbrido (até 20/12).' };
    }
    if (t <= Date.parse(pz.cancelamento.fim)) {
      return { fase: 'cancelamento', alvo: pz.cancelamento.fim, mensagem: 'Último prazo para cancelar o híbrido do 1º semestre de 2027 (até 20/12, 23h59, Brasília).' };
    }
    return { fase: 'encerrado', alvo: null, mensagem: 'O prazo para cancelar o híbrido terminou em 20/12/2026. A próxima opção é em ' + pz.opcao2sem2027.rotulo + ', para o 2º semestre.' };
  }

  // Inscrição na lista: o que falta para liberar o botão (vazio = pronto).
  function camposFaltando(c) {
    var falta = [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(c.email || '').trim())) falta.push('e-mail');
    if (!c.ramo) falta.push('ramo da empresa');
    if (!c.optin) falta.push('consentimento');
    if (!c.captcha) falta.push('"Não sou um robô"');
    return falta;
  }

  // Exemplo da página: consultoria de TI, Anexo III, RBT12 de R$ 600 mil, compras de R$ 5 mil.
  function exemploPagina() {
    var al = aliquotaEfetiva('III', 600000);
    var t = PL.aliquotaReferencia.padrao;
    return { aliquota: al, cenarios: detalharCenarios({ receita: 50000, e: al.efetiva, s: al.s, t: t, c: t, compras: 5000 }) };
  }

  function fmtNum(v, casas) {
    var neg = v < 0, x = Math.abs(v), c = casas || 0;
    var s = (Math.round(x * Math.pow(10, c)) / Math.pow(10, c)).toFixed(c);
    var partes = s.split('.');
    var int = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg && Number(s) !== 0 ? '−' : '') + int + (c ? ',' + partes[1] : '');
  }
  function moeda(v) { return (Math.round(v) < 0 ? '−' : '') + 'R$ ' + fmtNum(Math.abs(v), 0); }
  function moedaSinal(v) { var r = Math.round(v); return (r > 0 ? '+' : '') + moeda(v); }
  function pct(v, casas) { return fmtNum(v * 100, casas === undefined ? 2 : casas) + '%'; }

  var Diagnostico = {
    ATIVIDADES: ATIVIDADES, FAIXAS_RECEITA: FAIXAS_RECEITA, MIXES: MIXES, COMPRAS: COMPRAS,
    LIMIAR_PADRAO: LIMIAR_PADRAO, VERSAO_MOTOR: VERSAO_MOTOR, CAMPOS_EVENTO: CAMPOS_EVENTO,
    atividade: atividade, porId: porId, anexoDaAtividade: anexoDaAtividade, partilhaCbsIbs: partilhaCbsIbs,
    aliquotaEfetiva: aliquotaEfetiva, detalharCenarios: detalharCenarios, compararMes: compararMes,
    semaforo: semaforo, diagnosticar: diagnosticar, diagnosticarRapido: diagnosticarRapido,
    eventoAnonimo: eventoAnonimo, resumoDiagnostico: resumoDiagnostico, dataBrasilia: dataBrasilia,
    contagemPorData: contagemPorData, camposFaltando: camposFaltando, recadoPorData: recadoPorData,
    exemploPagina: exemploPagina, num: num, fmtNum: fmtNum, moeda: moeda, moedaSinal: moedaSinal, pct: pct,
    parametros: PL
  };

  raiz.Diagnostico = Diagnostico;
  if (typeof module === 'object' && module.exports) module.exports = Diagnostico;
})(typeof window !== 'undefined' ? window : globalThis);
