/*
 * Testes do motor, do diagnóstico em quatro cliques, da coleta anônima e das
 * páginas. Executar na raiz: node --test
 * Valores esperados calculados à mão a partir de parametros-2027.js e do
 * exemplo da pesquisa (seção 4.5).
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const SITE = path.join(RAIZ, 'docs'); // pasta publicada pelo GitHub Pages
const PL = require(path.join(RAIZ, 'parametros-2027.js'));
const D = require(path.join(RAIZ, 'diagnostico.js'));

function quase(real, esperado, tol, msg) {
  assert.ok(Math.abs(real - esperado) <= (tol === undefined ? 0.5 : tol), (msg || '') + ` esperado ${esperado}, obtido ${real}`);
}

function entrada(extra) {
  return Object.assign({
    atividade: 'intelectual', folha28: true, rbt12: 600000,
    pctCredita: 100, pctSimples: 0, pctConsumidor: 0, pctCompras: 10,
    reducao: 'nenhuma', politica: 'custo'
  }, extra || {});
}

// ------------------------------------------------------- exemplo obrigatório

test('exemplo da pesquisa 4.5: 44.970 / 45.605 / 41.720 com e = 10,06% e s = 16,60%', () => {
  const c = D.detalharCenarios({ receita: 50000, e: 0.1006, s: 0.166, t: 0.113, c: 0.113, compras: 5000 });
  quase(c.taxaDasHibrido, 0.0839, 0.00005, 'DAS híbrido 8,39%');
  quase(c.puro.fica, 44970, 0.5, 'puro');
  quase(c.credita.fica, 45605, 1, 'híbrido, 100% clientes que creditam');
  quase(c.naoCredita.fica, 41720, 1, 'híbrido, 100% consumidor final');
  quase(c.credita.fica - c.puro.fica, 635, 1);
  quase(c.naoCredita.fica - c.puro.fica, -3250, 1);
  // linhas intermediárias da tabela
  quase(c.puro.das, 5030, 0.5);
  quase(c.puro.creditoCliente, 835, 1);
  quase(c.credita.base, 49165, 1);
  quase(c.credita.destacado, 5556, 1);
  quase(c.credita.clientePaga, 54721, 1);
  quase(c.credita.custoLiquidoCliente, c.puro.custoLiquidoCliente, 0.01, 'B2B: custo líquido do cliente igual');
  quase(c.credita.das, 4125, 1);
  quase(c.credita.aRecolher, 4991, 1);
  quase(c.naoCredita.base, 44924, 1);
  quase(c.naoCredita.destacado, 5076, 1);
  quase(c.naoCredita.clientePaga, 50000, 0.01, 'B2C: preço final igual');
  quase(c.naoCredita.das, 3769, 1);
  quase(c.naoCredita.aRecolher, 4511, 1);
  quase(c.creditos, 565, 0.01);
});

test('Anexo III, 3ª e 4ª faixas: s = 16,60% (CBS 16,41% + IBS 0,19%, LC 227)', () => {
  const p3 = D.partilhaCbsIbs('III', 2), p4 = D.partilhaCbsIbs('III', 3);
  for (const p of [p3, p4]) {
    quase(p.valor, 0.166, 1e-9);
    quase(p.cbs, 0.1641, 1e-9);
    quase(p.ibs, 0.0019, 1e-9);
    assert.equal(p.status, 'oficial');
  }
});

test('RBT12 de R$ 600 mil no Anexo III cai na 3ª faixa: e = 10,56%, não 10,06% (fórmula da 4ª)', () => {
  const al = D.aliquotaEfetiva('III', 600000);
  assert.equal(al.faixa, 3);
  quase(al.efetiva, 0.1056, 1e-9);
  // 10,06% só sai aplicando a 4ª faixa (16% − 35.640) fora do intervalo dela
  quase((600000 * 0.16 - 35640) / 600000, 0.1006, 1e-9);
});

test('exemplo da página (RBT12 600 mil, 3ª faixa): 44.720 / 45.362 / 41.532', () => {
  const { aliquota, cenarios: c } = D.exemploPagina();
  assert.equal(aliquota.faixa, 3);
  quase(c.puro.fica, 44720, 0.5);
  quase(c.credita.fica, 45362, 1);
  quase(c.naoCredita.fica, 41532, 1);
});

// ------------------------------------------------------------ parâmetros

test('LC 227, Anexo III: CBS + IBS = PIS + Cofins atuais nas faixas lidas', () => {
  PL.partilha2027.III.faixas.forEach((f, i) => {
    if (!f || f.IBS === null) return;
    const rep = PL.anexos.III.faixas[i].reparticao;
    quase(f.CBS + f.IBS, rep.PIS + rep.COFINS, 1e-9, `faixa ${i + 1}`);
  });
});

test('repartição de cada faixa de cada anexo soma 100%', () => {
  for (const [id, anexo] of Object.entries(PL.anexos)) {
    anexo.faixas.forEach((f, i) => {
      const soma = Object.values(f.reparticao).reduce((a, b) => a + b, 0);
      quase(soma, 1, 1e-9, `Anexo ${id}, faixa ${i + 1}`);
    });
  }
});

test('Anexos II e IV: alíquotas e parcelas a deduzir iguais às de referência da LC 123', () => {
  const ref = {
    II: [[0.045, 0], [0.078, 5940], [0.10, 13860], [0.112, 22500], [0.147, 85500], [0.30, 720000]],
    IV: [[0.045, 0], [0.09, 8100], [0.102, 12420], [0.14, 39780], [0.22, 183780], [0.33, 828000]]
  };
  for (const [id, linhas] of Object.entries(ref)) {
    linhas.forEach(([a, pd], i) => {
      assert.equal(PL.anexos[id].faixas[i].aliquota, a, `Anexo ${id}, faixa ${i + 1}`);
      assert.equal(PL.anexos[id].faixas[i].parcelaDeduzir, pd, `Anexo ${id}, faixa ${i + 1}`);
    });
  }
});

test('valor devido contínuo nas fronteiras das faixas 1 a 5 (confere a transcrição)', () => {
  for (const [id, anexo] of Object.entries(PL.anexos)) {
    for (let i = 0; i < 4; i++) {
      const b = anexo.faixas[i].ate, f = anexo.faixas[i], g = anexo.faixas[i + 1];
      quase(b * f.aliquota - f.parcelaDeduzir, b * g.aliquota - g.parcelaDeduzir, 0.01, `Anexo ${id}, fronteira ${b}`);
    }
  }
});

test('fronteira de faixa: 180.000 na 1ª, 180.000,01 na 2ª', () => {
  assert.equal(D.aliquotaEfetiva('III', 180000).faixa, 1);
  assert.equal(D.aliquotaEfetiva('III', 180000.01).faixa, 2);
});

test('teto de ISS de 5%: na 5ª faixa do Anexo IV a fatia de CBS/IBS cresce', () => {
  const al = D.aliquotaEfetiva('IV', 3500000);
  assert.equal(al.issLimitado, true);
  assert.ok(al.s > 0.22, `s = ${al.s}`);
  assert.equal(D.aliquotaEfetiva('III', 600000).issLimitado, false);
});

test('todo parâmetro tem status válido e fonte existente', () => {
  const validos = ['oficial', 'secundária', 'projetado'];
  for (const a of Object.values(PL.anexos)) {
    assert.ok(validos.includes(a.status));
    a.fontes.forEach((f) => assert.ok(PL.fontes[f], f));
  }
  for (const k of ['limiteSimples', 'sublimite', 'fatorR']) assert.ok(PL.fontes[PL[k].fonte], k);
  assert.ok(validos.includes(PL.aliquotaReferencia.status));
  for (const p of Object.values(PL.prazos)) {
    assert.ok(validos.includes(p.status));
    p.fontes.forEach((f) => assert.ok(PL.fontes[f], f));
  }
  for (const f of Object.values(PL.fontes)) assert.match(f.url, /^https:\/\//);
});

// ------------------------------------------------------------ diagnóstico

test('diagnóstico: 100% clientes que creditam → verde', () => {
  const r = D.diagnosticar(entrada());
  assert.equal(r.ok, true);
  assert.equal(r.anexo, 'III');
  quase(r.receitaMensal, 50000, 1e-9);
  quase(r.diferencaMes, 45362 - 44720, 1);
  assert.equal(r.semaforo.cor, 'verde');
  assert.ok(r.faixaAliquota.min.diferenca > 0.005 * 50000);
});

test('diagnóstico: 100% consumidor final → vermelho', () => {
  const r = D.diagnosticar(entrada({ pctCredita: 0, pctConsumidor: 100 }));
  quase(r.diferencaMes, 41532 - 44720, 1);
  assert.equal(r.semaforo.cor, 'vermelho');
});

test('diagnóstico: venda para empresa do Simples equivale a consumidor final', () => {
  const a = D.diagnosticar(entrada({ pctCredita: 0, pctSimples: 100 }));
  const b = D.diagnosticar(entrada({ pctCredita: 0, pctConsumidor: 100 }));
  quase(a.diferencaMes, b.diferencaMes, 1e-6);
});

test('diagnóstico: mix 85/15 com diferença pequena → amarelo', () => {
  const r = D.diagnosticar(entrada({ pctCredita: 85, pctConsumidor: 15 }));
  assert.ok(Math.abs(r.pctReceita) < 0.005, `pct = ${r.pctReceita}`);
  assert.equal(r.semaforo.cor, 'amarelo');
});

test('diagnóstico: diferença por ano = 12 × mês e faixa de alíquota contém o valor central', () => {
  const r = D.diagnosticar(entrada({ pctCredita: 60, pctConsumidor: 40 }));
  quase(r.diferencaAno, r.diferencaMes * 12, 1e-6);
  assert.ok(r.faixaAliquota.min.diferenca <= r.diferencaMes + 1e-9);
  assert.ok(r.faixaAliquota.max.diferenca >= r.diferencaMes - 1e-9);
});

test('fator r: folha ≥ 28% → Anexo III; abaixo → Anexo V', () => {
  assert.equal(D.diagnosticar(entrada({ folha28: true })).anexo, 'III');
  assert.equal(D.diagnosticar(entrada({ folha28: false })).anexo, 'V');
  assert.equal(D.diagnosticar(entrada({ folha28: 'nao' })).anexo, 'V');
  const r = D.diagnosticar(entrada({ folha28: undefined }));
  assert.equal(r.ok, false);
});

test('redução de 60% diminui o IBS/CBS por fora e melhora o híbrido no B2C', () => {
  const sem = D.diagnosticar(entrada({ pctCredita: 0, pctConsumidor: 100 }));
  const com = D.diagnosticar(entrada({ pctCredita: 0, pctConsumidor: 100, reducao: 'sessenta' }));
  assert.ok(com.diferencaMes > sem.diferencaMes);
});

test('política "manter o preço" deixa o cliente que credita igual ao que não credita', () => {
  const r = D.diagnosticar(entrada({ politica: 'preco' }));
  const c = r.central.cenarios;
  quase(c.credita.ficaSemCreditos, c.naoCredita.ficaSemCreditos, 1e-6);
  assert.ok(r.diferencaMes < D.diagnosticar(entrada()).diferencaMes);
});

test('validação: mix diferente de 100%, receita acima do teto e campos vazios', () => {
  assert.equal(D.diagnosticar(entrada({ pctCredita: 50 })).ok, false);
  assert.equal(D.diagnosticar(entrada({ rbt12: 5000000 })).ok, false);
  assert.equal(D.diagnosticar(entrada({ rbt12: '' })).ok, false);
  assert.equal(D.diagnosticar(entrada({ atividade: 'x' })).ok, false);
  assert.equal(D.diagnosticar(entrada({ reducao: 'status' })).ok, false);
  assert.equal(D.diagnosticar(entrada({ pctCompras: 120 })).ok, false);
});

test('acima do sublimite de R$ 3,6 mi: sempre amarelo, com alerta', () => {
  const r = D.diagnosticar(entrada({ rbt12: 4000000 }));
  assert.equal(r.semaforo.cor, 'amarelo');
  assert.ok(r.alertas.some((a) => a.includes('3,6 milhões')));
});

test('entrada em texto com formato brasileiro', () => {
  assert.equal(D.num('600.000'), 600000);
  assert.equal(D.num('R$ 1.234.567,89'), 1234567.89);
  assert.equal(D.num('12,5%'), 12.5);
  assert.ok(Number.isNaN(D.num('')));
  const r = D.diagnosticar(entrada({ rbt12: '600.000', pctCompras: '10' }));
  quase(r.diferencaMes, 642, 1);
});

test('formatação: moeda e percentual em pt-BR', () => {
  assert.equal(D.moeda(44970.4), 'R$ 44.970');
  assert.equal(D.moedaSinal(635.2), '+R$ 635');
  assert.equal(D.moedaSinal(-3250), '−R$ 3.250');
  assert.equal(D.pct(0.1056), '10,56%');
});

// ------------------------------------------------------------ datas

test('recado conforme a data (Brasília, UTC−3)', () => {
  assert.equal(D.recadoPorData(new Date('2026-10-30T13:30:00-03:00')).fase, 'ate-prazo');
  assert.equal(D.recadoPorData(new Date('2026-10-30T23:59:59-03:00')).fase, 'ate-prazo');
  assert.equal(D.recadoPorData(new Date('2026-10-31T00:00:00-03:00')).fase, 'cancelamento');
  assert.equal(D.recadoPorData(new Date('2026-12-20T23:59:59-03:00')).fase, 'cancelamento');
  assert.equal(D.recadoPorData(new Date('2026-12-21T00:00:00-03:00')).fase, 'encerrado');
  const antes = D.recadoPorData(new Date('2026-10-30T12:00:00-03:00'));
  assert.match(antes.textos.join(' '), /03\/11 a 20\/12/);
  assert.match(antes.textos.join(' '), /definitivo/);
  const depois = D.recadoPorData(new Date('2026-11-05T12:00:00-03:00'));
  assert.match(depois.titulo, /20\/12/);
  assert.match(depois.textos.join(' '), /março de 2027/);
});


test('contagem regressiva nas três datas (relógio simulado, Brasília)', (t) => {
  const pz = PL.prazos;
  const em = (iso) => {
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse(iso) });
    const c = D.contagemPorData(new Date());
    t.mock.timers.reset();
    return c;
  };
  const opcao = em('2026-10-30T18:00:00-03:00');
  assert.equal(opcao.fase, 'opcao');
  assert.equal(opcao.alvo, pz.opcao1sem2027.fim);
  assert.match(opcao.mensagem, /^Último dia para optar/);
  assert.equal(em('2026-10-30T23:59:59-03:00').fase, 'opcao');

  const antes = em('2026-10-31T00:00:00-03:00');
  assert.equal(antes.fase, 'antes-cancelamento');
  assert.equal(antes.alvo, '2026-11-03T00:00:00-03:00');
  assert.equal(antes.mensagem, 'Em 03/11 abre o prazo para cancelar o híbrido (até 20/12). Entre na lista: o Decisor completo abre nesse dia.');
  assert.equal(em('2026-11-02T23:59:59-03:00').fase, 'antes-cancelamento');

  const cancel = em('2026-11-03T00:00:00-03:00');
  assert.equal(cancel.fase, 'cancelamento');
  assert.equal(cancel.alvo, '2026-12-20T23:59:59-03:00');
  assert.match(cancel.mensagem, /^Último prazo para cancelar/);
  assert.equal(em('2026-12-20T23:59:59-03:00').fase, 'cancelamento');

  const fim = em('2026-12-21T00:00:00-03:00');
  assert.equal(fim.fase, 'encerrado');
  assert.equal(fim.alvo, null);
});

// ------------------------------------------------------------ diagnóstico em quatro cliques

function rapido(extra) {
  return D.diagnosticarRapido(Object.assign({ atividade: 'intelectual', fatorR: 'sim', faixa: 3, mix: 'empresas' }, extra || {}));
}

test('mix pronto por resposta: 70/15/15, 15/70/15, 10/10/80 e 34/33/33', () => {
  const esperado = { empresas: [70, 15, 15], simples: [15, 70, 15], consumidor: [10, 10, 80], dividido: [34, 33, 33] };
  assert.deepEqual(D.MIXES.map((m) => m.id), Object.keys(esperado));
  for (const [id, [c, s, f]] of Object.entries(esperado)) {
    const r = rapido({ mix: id });
    assert.equal(r.ok, true, id);
    assert.equal(r.mix.id, id);
    quase(r.diagnostico.mix.credita, c / 100, 1e-12, id);
    quase(r.diagnostico.mix.simples, s / 100, 1e-12, id);
    quase(r.diagnostico.mix.consumidor, f / 100, 1e-12, id);
  }
  assert.equal(rapido({ mix: 'outro' }).ok, false);
});

test('faixa → meio da faixa e intervalo que cobre a faixa inteira', () => {
  assert.equal(D.FAIXAS_RECEITA.length, 6);
  D.FAIXAS_RECEITA.forEach((f, i) => {
    assert.equal(f.ate, PL.anexos.III.faixas[i].ate, `faixa ${f.id}`);
    assert.equal(f.de, i ? PL.anexos.III.faixas[i - 1].ate : 0);
    assert.equal(f.meio, (f.de + f.ate) / 2);
  });
  assert.equal(D.FAIXAS_RECEITA[2].meio, 540000);
  for (const f of D.FAIXAS_RECEITA) {
    const r = rapido({ faixa: f.id, mix: 'dividido' });
    quase(r.diagnostico.receitaMensal, f.meio / 12, 1e-9);
    const iv = r.intervaloAno;
    assert.ok(iv.min < iv.max, `faixa ${f.id}: intervalo, não ponto`);
    assert.ok(iv.min <= r.diferencaAno && r.diferencaAno <= iv.max, `faixa ${f.id}: contém o meio`);
    for (const rb of [f.de, f.ate].filter((v) => v > 0)) {
      const borda = D.diagnosticar({ atividade: 'intelectual', folha28: true, rbt12: rb, pctCredita: 34, pctSimples: 33, pctConsumidor: 33, pctCompras: 5, reducao: 'nenhuma', politica: 'custo' });
      assert.ok(iv.min <= borda.faixaAliquota.minAno + 1e-6 && borda.faixaAliquota.maxAno <= iv.max + 1e-6, `faixa ${f.id}: contém a borda ${rb}`);
    }
  }
  const primeira = rapido({ faixa: 1 }).intervaloAno;
  assert.ok(primeira.min <= 0 && primeira.max >= 0, '1ª faixa começa em R$ 0');
  assert.equal(rapido({ faixa: 7 }).ok, false);
  assert.equal(rapido({ faixa: undefined }).ok, false);
});

test('compras: sugestão pela atividade, resposta explícita e dica de percentuais', () => {
  assert.deepEqual(D.COMPRAS.map((c) => c.pct), [5, 10, 25, 40]);
  for (const a of D.ATIVIDADES) assert.ok(D.porId(D.COMPRAS, a.compras), `${a.id}: sugestão de compras válida`);
  assert.equal(D.diagnosticarRapido({ atividade: 'comercio', faixa: 2, mix: 'consumidor' }).compras.pct, 40);
  const r = D.diagnosticarRapido({ atividade: 'comercio', faixa: 2, mix: 'consumidor', compras: 'pouco' });
  assert.equal(r.compras.pct, 10);
  quase(r.diagnostico.compras, r.diagnostico.receitaMensal * 0.10, 1e-9);
});

test('redução vem da atividade e o preço mantém o custo do cliente empresa', () => {
  const saude = rapido({ atividade: 'saude' });
  assert.equal(saude.reducao, 0.6);
  assert.equal(saude.diagnostico.politica, 'custo');
  assert.equal(rapido({ atividade: 'engenharia' }).reducao, 0.3);
  assert.equal(D.diagnosticarRapido({ atividade: 'comercio', faixa: 3, mix: 'empresas' }).reducao, 0);
});

test('fator r: pergunta só nas atividades com fator r; "não sei" mostra o pior entre III e V', () => {
  assert.equal(D.diagnosticarRapido({ atividade: 'comercio', faixa: 3, mix: 'empresas' }).ok, true);
  assert.equal(rapido({ fatorR: undefined }).ok, false);
  assert.equal(rapido({ fatorR: 'sim' }).anexo, 'III');
  assert.equal(rapido({ fatorR: 'nao' }).anexo, 'V');
  for (const mix of ['empresas', 'consumidor']) {
    const ns = rapido({ fatorR: 'naosei', mix });
    const iii = rapido({ fatorR: 'sim', mix }), v = rapido({ fatorR: 'nao', mix });
    assert.equal(ns.fatorRIncerto, true);
    quase(ns.diferencaAno, Math.min(iii.diferencaAno, v.diferencaAno), 1e-6, mix);
    assert.deepEqual([ns.anexo, ns.outroAnexo.anexo].sort(), ['III', 'V']);
    const outro = ns.outroAnexo.anexo === 'III' ? iii : v;
    quase(ns.outroAnexo.diferencaAno, outro.diferencaAno, 1e-6);
  }
  assert.equal(rapido({ fatorR: 'sim' }).outroAnexo, null);
});

test('resultado: hibrido, analisar ou puro conforme o semáforo', () => {
  const casos = [
    [{ atividade: 'comercio', faixa: 3, mix: 'empresas' }, 'hibrido', 'verde'],
    [{ atividade: 'servicos', faixa: 3, mix: 'consumidor' }, 'puro', 'vermelho'],
    [{ atividade: 'saude', fatorR: 'sim', faixa: 3, mix: 'dividido' }, 'analisar', 'amarelo']
  ];
  for (const [resp, res, cor] of casos) {
    const r = D.diagnosticarRapido(resp);
    assert.equal(r.resultado, res, JSON.stringify(resp));
    assert.equal(r.semaforo.cor, cor);
  }
  assert.equal(D.diagnosticarRapido({ atividade: 'comercio', faixa: 6, mix: 'empresas' }).resultado, 'analisar', 'acima do sublimite');
});

// Valores de receita que não podem sair da página: limites, meio da faixa e receita do mês.
function receitasDaFaixa(f) {
  return [f.de, f.ate, f.meio, f.meio / 12].filter((v) => v > 0).map((v) => String(Math.round(v)));
}

test('DIAG_RESUMO: chave=valor; com a faixa, nunca a receita', () => {
  const agora = new Date('2026-10-30T20:00:00-03:00');
  for (const f of D.FAIXAS_RECEITA) {
    for (const fatorR of ['sim', 'naosei']) {
      const r = rapido({ faixa: f.id, fatorR, mix: 'simples' });
      const resumo = D.resumoDiagnostico(r, agora);
      assert.match(resumo, /^atividade=intelectual;anexo=(III|V);fatorr=(sim|naosei);faixa=[1-6];mix=simples;compras=5;reducao=0;dif=-?\d+;motor=\d+\.\d+\.\d+;data=2026-10-30$/);
      const pares = Object.fromEntries(resumo.split(';').map((p) => p.split('=')));
      assert.equal(pares.faixa, String(f.id));
      assert.ok(Number.isInteger(Number(pares.dif) / 1000), 'diferença arredondada ao milhar');
      quase(Number(pares.dif), r.diferencaAno, 500);
      for (const v of receitasDaFaixa(f)) assert.ok(!resumo.includes(v), `faixa ${f.id}: resumo traz ${v}`);
      assert.doesNotMatch(resumo, /receita|rbt12|@/i);
      assert.ok(resumo.length < 200);
    }
  }
  assert.doesNotMatch(D.resumoDiagnostico(D.diagnosticarRapido({ atividade: 'comercio', faixa: 2, mix: 'consumidor' }), agora), /fatorr/);
});

test('evento anônimo: só categorias e resultado, sem dado pessoal', () => {
  const agora = new Date('2026-10-31T01:30:00-03:00');
  const r = D.diagnosticarRapido({ atividade: 'saude', fatorR: 'naosei', faixa: 4, mix: 'dividido', compras: 'bastante', email: 'fulano@empresa.com.br', nome: 'Fulano de Tal', SMS: '11987654321' });
  const ev = D.eventoAnonimo(r, agora);
  assert.deepEqual(Object.keys(ev), D.CAMPOS_EVENTO);
  assert.deepEqual(D.CAMPOS_EVENTO, ['data', 'motor', 'resultado', 'atividade', 'fatorr', 'anexo', 'faixa', 'mix', 'compras', 'reducao', 'dif']);
  for (const v of Object.values(ev)) assert.ok(['string', 'number'].includes(typeof v));
  assert.equal(ev.data, '2026-10-31', 'data de Brasília');
  assert.equal(ev.faixa, 4);
  assert.equal(ev.compras, 25);
  assert.equal(ev.reducao, 60);
  assert.ok(Number.isInteger(ev.dif / 1000));
  const json = JSON.stringify(ev);
  assert.doesNotMatch(json, /@|fulano|11987654321|nome|email|sms|ip|receita/i);
  for (const v of receitasDaFaixa(D.FAIXAS_RECEITA[3])) assert.ok(!json.includes(v), `evento traz ${v}`);
});

test('Code.gs (Apps Script) grava o evento do site e descarta o resto', () => {
  const vm = require('node:vm');
  const linhas = [];
  let extra = 0; // linhas a mais na aba, para testar o teto
  const ctx = {
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => ({ appendRow: (l) => linhas.push(l), getLastRow: () => linhas.length + 1 + extra }) }) },
    ContentService: { MimeType: { TEXT: 'text' }, createTextOutput: (t) => ({ setMimeType() { return this; }, getContent: () => t }) },
    Logger: { log() {} }
  };
  vm.createContext(ctx);
  vm.runInContext(ler('ferramentas/coleta/Code.gs'), ctx);
  assert.deepEqual(Array.from(vm.runInContext('CAMPOS', ctx)), D.CAMPOS_EVENTO);
  const post = (obj) => ctx.doPost({ postData: { contents: typeof obj === 'string' ? obj : JSON.stringify(obj) } }).getContent();

  for (const resp of [
    { atividade: 'saude', fatorR: 'naosei', faixa: 4, mix: 'dividido' },
    { atividade: 'comercio', faixa: 1, mix: 'consumidor' },
    { atividade: 'construcao', faixa: 6, mix: 'empresas', compras: 'quase-nada' }
  ]) {
    const ev = D.eventoAnonimo(D.diagnosticarRapido(resp), new Date());
    assert.equal(post(ev), 'ok', JSON.stringify(ev));
    const l = linhas.at(-1);
    assert.equal(l.length, 1 + D.CAMPOS_EVENTO.length);
    assert.deepEqual(Array.from(l.slice(1), String), D.CAMPOS_EVENTO.map((k) => String(ev[k])));
  }
  const n = linhas.length;
  const ev = D.eventoAnonimo(rapido(), new Date());
  assert.equal(post(Object.assign({}, ev, { resultado: '=HYPERLINK("x")' })), 'ignorado');
  assert.equal(post(Object.assign({}, ev, { atividade: 'fulano@empresa.com.br' })), 'ignorado');
  assert.equal(post('não é json'), 'erro');
  assert.equal(post('x'.repeat(3000)), 'ignorado');
  assert.equal(linhas.length, n, 'nada gravado');
  assert.equal(post(Object.assign({ email: 'fulano@empresa.com.br' }, ev)), 'ok');
  assert.ok(!JSON.stringify(linhas.at(-1)).includes('@'), 'campo extra não é gravado');
  // Teto contra envio em massa: com a aba cheia, nada mais é gravado.
  extra = vm.runInContext('MAX_LINHAS', ctx);
  const antes = linhas.length;
  assert.equal(post(ev), 'ignorado');
  assert.equal(linhas.length, antes, 'acima do teto não grava');
  // Autorização limitada à planilha do script.
  assert.match(ler('ferramentas/coleta/Code.gs'), /^\/\*\* @OnlyCurrentDoc \*\//);
});

test('botão da lista inativo até preencher e-mail, ramo, consentimento e reCAPTCHA', () => {
  const cheio = { email: 'voce@empresa.com.br', ramo: '3', optin: true, captcha: true };
  assert.deepEqual(D.camposFaltando(cheio), []);
  assert.deepEqual(D.camposFaltando({}), ['e-mail', 'ramo da empresa', 'consentimento', '"Não sou um robô"']);
  for (const [campo, vazio] of [['email', ''], ['email', 'voce@empresa'], ['email', 'voce empresa.com'], ['ramo', ''], ['optin', false], ['captcha', false]]) {
    assert.equal(D.camposFaltando(Object.assign({}, cheio, { [campo]: vazio })).length, 1, `${campo} = ${vazio}`);
  }
  const h = ler('index.html');
  assert.match(h, /<button class="sib-form-block__button[^"]*" form="sib-form" type="submit" disabled>/, 'botão começa inativo');
  const js = ler('src/pagina.js');
  assert.match(js, /botao\.disabled = falta\.length > 0;/);
  assert.match(js, /D\.camposFaltando\(\{ email: \$\('EMAIL'\)\.value, ramo: \$\('RAMO'\)\.value, optin: \$\('OPT_IN'\)\.checked, captcha: captchaOk\(\) \}\)/);
  // O PDF abre depois do sucesso do Brevo, com o cabeçalho de impressão.
  assert.match(js, /sib-form-message-panel--active[\s\S]{0,400}abrirPdf\(\)/);
  assert.match(js, /window\.print\(\)/);
  assert.match(h, /id="imprimir-cabecalho"/);
});

// ------------------------------------------------------------ páginas

const PAGINAS = ['index.html', 'privacidade.html', 'termos.html'];
function ler(f) { return fs.readFileSync(path.join(PAGINAS.includes(f) ? SITE : RAIZ, f), 'utf8'); }
const CFG = JSON.parse(ler('src/config.json'));

function blocoFormulario(html) {
  const b = html.match(/<!-- FORMULARIO:INICIO -->[\s\S]*?<!-- FORMULARIO:FIM -->/g) || [];
  return b;
}
function semFormulario(html) {
  return html.replace(/<!-- FORMULARIO:INICIO -->[\s\S]*?<!-- FORMULARIO:FIM -->/g, '');
}

// Destinos externos permitidos: Brevo e reCAPTCHA (formulário) e o endpoint de coleta.
const DESTINOS_DO_FORMULARIO = [
  /^https:\/\/([a-z0-9-]+\.)?sibforms\.com\//, // CSS, JS e envio do Brevo
  /^https:\/\/www\.google\.com\/recaptcha\//,  // reCAPTCHA v2 ("Não sou um robô")
  /^https:\/\/www\.gstatic\.com\/recaptcha\//
];
const COLETA = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;

test('coletaEndpoint: vazio (desligado) ou um app da Web do Apps Script', () => {
  assert.ok(Object.prototype.hasOwnProperty.call(CFG, 'coletaEndpoint'));
  assert.ok(CFG.coletaEndpoint === '' || COLETA.test(CFG.coletaEndpoint), CFG.coletaEndpoint);
  const m = ler('index.html').match(/<meta name="decisor-coleta" content="([^"]*)">/);
  assert.ok(m, 'meta decisor-coleta');
  assert.equal(m[1], CFG.coletaEndpoint);
});

test('requisições externas: só a página, o Brevo, o reCAPTCHA e o endpoint de coleta', () => {
  for (const f of PAGINAS) {
    const h = ler(f);
    // Recursos carregados (não links de navegação <a>).
    const urls = [
      ...h.matchAll(/<(?:script|link|img|iframe|video|audio|source|embed|object)\b[^>]*?\b(?:src|href|data)\s*=\s*"((?:https?:)?\/\/[^"]+)"/gi),
      ...h.matchAll(/<form\b[^>]*\baction\s*=\s*"([^"]+)"/gi),
      ...h.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')]+)/gi)
    ].map((m) => m[1]);
    const meta = h.match(/<meta name="decisor-coleta" content="([^"]*)">/);
    if (meta && meta[1]) urls.push(meta[1]);
    for (const u of urls) {
      assert.ok(DESTINOS_DO_FORMULARIO.some((re) => re.test(u)) || COLETA.test(u), `${f}: destino não permitido: ${u}`);
    }
    const fora = semFormulario(h);
    for (const [re, nome] of [
      [/<script[^>]+src\s*=/i, 'script externo fora do formulário'],
      [/<link[^>]+href\s*=\s*["']?(https?:)?\/\//i, 'link externo (css/fonte) fora do formulário'],
      [/@import/i, '@import'],
      [/<form[^>]+action\s*=/i, 'formulário fora do bloco'],
      [/XMLHttpRequest|new\s+WebSocket|new\s+EventSource/, 'requisição em JS']
    ]) assert.doesNotMatch(fora, re, `${f}: ${nome}`);
  }
  // Envio em JS: só o evento anônimo de src/pagina.js, e só para o endpoint de coleta.
  for (const f of ['parametros-2027.js', 'diagnostico.js']) assert.doesNotMatch(ler(f), /\bfetch\s*\(|sendBeacon|XMLHttpRequest/, f);
  const js = ler('src/pagina.js');
  const envios = [...js.matchAll(/\b(fetch|navigator\.sendBeacon)\s*\(([^,)]*)/g)];
  assert.equal(envios.length, 2, 'um fetch e um sendBeacon');
  for (const m of envios) assert.equal(m[2].trim(), 'COLETA', `${m[1]} só para o endpoint de coleta`);
  assert.match(js, /credentials: 'omit'/, 'sem cookies');
  assert.match(js, /var COLETA = meta && \/\^https:\\\/\\\/script\\\.google\\\.com\\\/macros\\\/s\\\/\[\\w-\]\+\\\/exec\$\/\.test\(meta\.content\) \? meta\.content : '';/);
  for (const f of ['privacidade.html', 'termos.html']) assert.doesNotMatch(ler(f), /decisor-coleta|<script[^>]+src|<form\b/, f);
});

test('formulário do Brevo: campos, ids, campos ocultos do diagnóstico e envio preservados', () => {
  const h = ler('index.html');
  const blocos = blocoFormulario(h);
  assert.equal(blocos.length, 1);
  assert.doesNotMatch(blocos[0], /assets\.brevo\.com|@font-face|Helvetica/);
  assert.match(h, /<form id="sib-form" method="POST" action="https:\/\/bb70b053\.sibforms\.com\/serve\/[^"]+" data-type="subscription">/);
  for (const trecho of [
    'name="EMAIL"', 'name="NOME"', 'name="SMS"', 'name="SMS__COUNTRY_CODE"', 'value="+55"', 'name="RAMO"', 'name="OPT_IN"',
    '<input type="hidden" id="DIAG_RESULTADO" name="DIAG_RESULTADO" value="">',
    '<input type="hidden" id="DIAG_RESUMO" name="DIAG_RESUMO" value="">',
    'name="email_address_check"', 'name="locale" value="pt"', 'id="sib-container"', 'id="error-message"', 'id="success-message"',
    'src="https://sibforms.com/forms/end-form/build/main.js"',
    'placeholder="voce@empresa.com.br"', 'placeholder="Seu nome"', 'data-placeholder="DDD + número"',
    'Digite DDD + número, só números (ex.: 11987654321)',
    'Concordo em receber e-mails e mensagens de WhatsApp do Decisor do Simples 2027, com os avisos sobre a reforma, a abertura do Decisor completo e ofertas dos produtos, e li <a href="privacidade.html" target="_blank" rel="noopener">a Política de Privacidade</a>.',
    'id="inscricao-confirmada"', 'Inscrição confirmada. Você está na lista prioritária.',
    '<div class="g-recaptcha sib-visible-recaptcha" id="sib-captcha" data-sitekey="6LetXQguAAAAAKx7X_TZJf9AVGP3c9rpJDYkRBy1" data-callback="handleCaptchaResponse"',
    'function handleCaptchaResponse()', 'src="https://www.google.com/recaptcha/api.js?hl=pt"'
  ]) assert.ok(h.includes(trecho), trecho);
  // Campos ocultos dentro do <form>; reCAPTCHA antes do botão; api.js do Google depois do main.js
  const form = h.slice(h.indexOf('<form id="sib-form"'), h.indexOf('</form>'));
  assert.ok(form.includes('name="DIAG_RESULTADO"') && form.includes('name="DIAG_RESUMO"'));
  assert.ok(h.indexOf('id="sib-captcha"') < h.indexOf('id="rotulo-botao-lista"'));
  assert.ok(h.indexOf('build/main.js') < h.indexOf('recaptcha/api.js'));
  assert.match(ler('src/pagina.js'), /\$\('DIAG_RESULTADO'\)\.value = rr\.resultado;\s*\$\('DIAG_RESUMO'\)\.value = D\.resumoDiagnostico\(rr, new Date\(\)\);/);
  assert.ok(ler('src/pagina.js').includes("'Baixar meu PDF e entrar na lista'"));
});

test('páginas: viewport móvel, idioma, título, links de privacidade e termos', () => {
  for (const f of PAGINAS) {
    const h = ler(f);
    assert.match(h, /<html lang="pt-BR">/, f);
    assert.match(h, /<meta name="viewport" content="width=device-width, initial-scale=1"/, f);
    assert.match(h, /<title>[^<]+<\/title>/, f);
    assert.match(h, /href="privacidade.html"/, f);
    assert.match(h, /href="termos.html"/, f);
  }
});

test('páginas: arquivos locais referenciados existem (fontes, ícones, logotipo)', () => {
  for (const f of PAGINAS) {
    const h = semFormulario(ler(f));
    const refs = [...h.matchAll(/(?:src|href)\s*=\s*"([^"#:]+)"|url\("([^"]+)"\)/g)].map((m) => m[1] || m[2]);
    assert.ok(refs.length > 5, f);
    for (const r of refs) assert.ok(fs.existsSync(path.join(SITE, r)), `${f}: ${r} não existe`);
  }
});

test('index.html: compartilhamento com imagem absoluta do GitHub Pages', () => {
  const h = ler('index.html');
  const base = 'https://ranierimattos.github.io/decisor-simples/';
  assert.match(h, /<meta property="og:title" content="Simples 2027: híbrido ou não\?">/);
  for (const prop of ['property="og:image"', 'name="twitter:image"']) {
    const m = h.match(new RegExp('<meta ' + prop + ' content="([^"]+)"'));
    assert.ok(m, prop);
    assert.ok(m[1].startsWith(base), m[1]);
    assert.ok(fs.existsSync(path.join(SITE, m[1].slice(base.length))), m[1]);
  }
  assert.match(h, /font-family: "Manrope", "Segoe UI", Roboto, Arial, sans-serif/);
  assert.ok(fs.existsSync(path.join(SITE, 'fontes', 'OFL-Manrope.txt')), 'licença OFL junto das fontes');
});

test('index.html está montado com a versão atual dos scripts', () => {
  const h = ler('index.html');
  for (const f of ['parametros-2027.js', 'diagnostico.js', 'src/pagina.js']) {
    assert.ok(h.includes(ler(f).trim()), `${f} desatualizado em index.html: rode node scripts/montar.js`);
  }
});

test('index.html: quatro perguntas, resultado, conversão e página enxuta', () => {
  const h = ler('index.html');
  for (const trecho of [
    'Simples 2027: híbrido ou não?', 'id="contagem"', 'id="diagnostico"', 'id="resultado"', 'id="lista"', 'id="exemplo"',
    'role="progressbar"', 'Pergunta 1 de 4',
    'O que sua empresa faz?', 'Salários + pró-labore passam de 28% do faturamento?',
    'Quanto a empresa faturou nos últimos 12 meses?', 'Para quem você mais vende?',
    'Quanto do faturamento vai para compras de outras empresas (mercadorias, matéria-prima, serviços)?',
    'No híbrido, você desconta o imposto que veio nessas compras.',
    '>Ver meu diagnóstico</button>', 'Receba seu PDF e o aviso de 03/11',
    'O Decisor completo abre em 03/11, com preço de lançamento para a lista.',
    '<details class="detalhes" id="bloco-premissas">', '<summary>Premissas de cálculo</summary>',
    '<details class="detalhes alertas" id="bloco-alertas">', '<summary>Atenção</summary>',
    '<b>Estimativa educativa; não substitui o contador.</b> Leve este resultado ao seu contador antes de decidir.',
    'Mesmo serviço, resultado oposto: B2B × B2C', 'Como saber se sua empresa optou', 'Perguntas frequentes',
    'Fontes oficiais', 'Opção pelo regime regular de IBS e CBS'
  ]) assert.ok(h.includes(trecho), trecho);
  // Perguntas antigas saíram (viraram premissas)
  for (const antigo of ['Distribua 100%', 'id="pctCredita"', 'Redução de alíquota da atividade', 'Preço para clientes empresa', 'Compras com crédito, em %', 'aviso de 15/12', 'id="imprimir"']) {
    assert.ok(!h.includes(antigo), `ainda tem: ${antigo}`);
  }
  // Ordem: perguntas → resultado → conversão → exemplo (B2B × B2C e o resto ficam embaixo)
  const pos = (s) => h.indexOf(s);
  assert.ok(pos('id="p-atividade"') < pos('id="resultado"'));
  assert.ok(pos('id="resultado"') < pos('id="lista"'));
  assert.ok(pos('id="lista"') < pos('id="exemplo"'));
  // Dois botões para a lista: depois do exemplo e depois de "Optei e me arrependi"
  const exemplo = h.slice(pos('id="exemplo"'), pos('id="como-saber"'));
  assert.match(exemplo, /<a class="botao[^"]*" href="#lista">/);
  const optei = h.slice(pos('Optei e me arrependi'), pos('Não optei. Perdi a chance?'));
  assert.match(optei, /<a class="botao[^"]*" href="#lista">/);
  // Topo: uma frase e a contagem
  const topo = h.slice(pos('<header class="topo">'), pos('</header>'));
  assert.equal((topo.match(/<p>/g) || []).length, 1);
  assert.ok(topo.includes('id="contagem-tempo"'));
  for (const proibido of [/economia garantida/i, /bras[aã]o/i, /logo(tipo)? (da|do) (receita|governo)/i]) assert.doesNotMatch(h, proibido);
  // O PDF é gerado no navegador; a lista não promete relatório por e-mail.
  for (const f of PAGINAS) assert.doesNotMatch(ler(f), /relat[óo]rio em PDF|receber o relat[óo]rio|com o relat[óo]rio/i, f);
  // Botões das perguntas montados a partir do motor
  const js = ler('src/pagina.js');
  for (const lista of ['D.ATIVIDADES', 'D.FAIXAS_RECEITA', 'D.MIXES', 'D.COMPRAS']) assert.ok(js.includes(lista), lista);
});

test('textos: sem a promessa de que o diagnóstico não é enviado nem salvo', () => {
  const re = /n[ãa]o envia os dados|n[ãa]o (é|são) (enviad[oa]s?|gravad[oa]s? nem transmitid)|nem fica salvo|n[ãa]o saem dele|nada é enviado|fica só no seu navegador|No diagnóstico:<\/b> nenhum/i;
  for (const f of [...PAGINAS, 'README.md', 'src/pagina.js']) assert.doesNotMatch(ler(f), re, f);
});

test('privacidade e termos: dados, finalidades, base legal, prazo e operadores', () => {
  const p = ler('privacidade.html');
  for (const trecho of [
    'registro anônimo', 'faixa de faturamento', 'resultado (híbrido, analisar ou puro)', 'diferença anual arredondada ao milhar',
    'resumo do diagnóstico', 'panorama estatístico', 'ofertas',
    'Consentimento', 'art. 7º, I', 'legítimo interesse', 'art. 7º, IX',
    'Por quanto tempo', 'até 31/12/2028', 'em até 30 dias',
    'Brevo', 'Google Apps Script', 'Planilhas Google', 'reCAPTCHA', 'operadores'
  ]) assert.ok(p.includes(trecho), `privacidade: ${trecho}`);
  const t = ler('termos.html');
  for (const trecho of ['registro anônimo', 'meio dela', 'intervalo', 'Brevo e Google', 'href="privacidade.html"']) {
    assert.ok(t.includes(trecho), `termos: ${trecho}`);
  }
});

const pendentes = PAGINAS.filter((f) => !fs.existsSync(path.join(SITE, f)) || /\{\{[A-Z_]+\}\}|FORMULARIO_PENDENTE/.test(ler(f)));
test('sem marcadores pendentes (contato e formulário)', { todo: pendentes.length ? 'falta preencher em: ' + pendentes.join(', ') : false }, () => {
  assert.deepEqual(pendentes, []);
});
