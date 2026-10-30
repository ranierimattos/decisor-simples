/*
 * Testes do diagnóstico e das páginas. Executar na raiz: node --test
 * Valores esperados calculados à mão a partir de parametros-2027.js e do
 * exemplo da pesquisa (seção 4.5).
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
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

// ------------------------------------------------------------ páginas

const PAGINAS = ['index.html', 'privacidade.html', 'termos.html'];
function ler(f) { return fs.readFileSync(path.join(RAIZ, f), 'utf8'); }

// Tira o bloco do formulário (o único autorizado a fazer requisição externa).
function semFormulario(html) {
  return html.replace(/<!-- FORMULARIO:INICIO -->[\s\S]*?<!-- FORMULARIO:FIM -->/g, '');
}

test('páginas: só o formulário faz requisição externa', () => {
  for (const f of PAGINAS) {
    const h = semFormulario(ler(f));
    const proibidos = [
      [/<script[^>]+src\s*=/i, 'script externo'],
      [/<link[^>]+href\s*=\s*["']?(https?:)?\/\//i, 'link externo (css/fonte)'],
      [/<(img|iframe|video|audio|source|embed|object)[^>]+(src|data)\s*=\s*["']?(https?:)?\/\//i, 'mídia externa'],
      [/url\(\s*["']?(https?:)?\/\//i, 'url() externa'],
      [/@import/i, '@import'],
      [/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new\s+WebSocket|new\s+EventSource/, 'requisição em JS'],
      [/<form[^>]+action\s*=/i, 'formulário fora do bloco']
    ];
    for (const [re, nome] of proibidos) assert.doesNotMatch(h, re, `${f}: ${nome}`);
  }
});

// Únicos destinos externos permitidos, todos dentro do bloco do formulário.
const DESTINOS_DO_FORMULARIO = [
  /^https:\/\/([a-z0-9-]+\.)?sibforms\.com\//, // CSS, JS e envio do Brevo
  /^https:\/\/www\.google\.com\/recaptcha\//,  // reCAPTCHA v2 ("Não sou um robô")
  /^https:\/\/www\.gstatic\.com\/recaptcha\//
];

test('formulário: requisições externas só para o Brevo e o reCAPTCHA', () => {
  const h = ler('index.html');
  const blocos = h.match(/<!-- FORMULARIO:INICIO -->[\s\S]*?<!-- FORMULARIO:FIM -->/g) || [];
  assert.equal(blocos.length, 1);
  const urls = [...blocos[0].matchAll(/(?:src|href|action)\s*=\s*"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  for (const u of urls) assert.ok(DESTINOS_DO_FORMULARIO.some((re) => re.test(u)), `destino não permitido: ${u}`);
  assert.doesNotMatch(blocos[0], /assets\.brevo\.com|@font-face|Helvetica/);
});

test('formulário do Brevo: campos, ids e envio preservados', () => {
  const h = ler('index.html');
  assert.match(h, /<form id="sib-form" method="POST" action="https:\/\/bb70b053\.sibforms\.com\/serve\/[^"]+" data-type="subscription">/);
  for (const trecho of [
    'name="EMAIL"', 'name="NOME"', 'name="SMS"', 'name="SMS__COUNTRY_CODE"', 'value="+55"', 'name="RAMO"', 'name="OPT_IN"',
    'name="email_address_check"', 'name="locale" value="pt"', 'id="sib-container"', 'id="error-message"', 'id="success-message"',
    'src="https://sibforms.com/forms/end-form/build/main.js"',
    'placeholder="voce@empresa.com.br"', 'placeholder="Seu nome"', 'data-placeholder="DDD + número"',
    'Digite DDD + número, só números (ex.: 11987654321)',
    'Concordo em receber e-mails e mensagens de WhatsApp do Decisor do Simples 2027, com os avisos sobre a reforma, a abertura do Decisor completo e ofertas dos produtos, e li <a href="privacidade.html" target="_blank" rel="noopener">a Política de Privacidade</a>.',
    'id="inscricao-confirmada"', 'Inscrição confirmada. Você está na lista prioritária.',
    '<div class="g-recaptcha sib-visible-recaptcha" id="sib-captcha" data-sitekey="6LetXQguAAAAAKx7X_TZJf9AVGP3c9rpJDYkRBy1" data-callback="handleCaptchaResponse"',
    'function handleCaptchaResponse()', 'src="https://www.google.com/recaptcha/api.js?hl=pt"'
  ]) assert.ok(h.includes(trecho), trecho);
  // reCAPTCHA antes do botão; api.js do Google depois do main.js
  assert.ok(h.indexOf('id="sib-captcha"') < h.indexOf('Quero entrar na lista'));
  assert.ok(h.indexOf('build/main.js') < h.indexOf('recaptcha/api.js'));
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
    for (const r of refs) assert.ok(fs.existsSync(path.join(RAIZ, r)), `${f}: ${r} não existe`);
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
    assert.ok(fs.existsSync(path.join(RAIZ, m[1].slice(base.length))), m[1]);
  }
  assert.match(h, /font-family: "Manrope", "Segoe UI", Roboto, Arial, sans-serif/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'fontes', 'OFL-Manrope.txt')), 'licença OFL junto das fontes');
});

test('index.html está montado com a versão atual dos scripts', () => {
  const h = ler('index.html');
  for (const f of ['parametros-2027.js', 'diagnostico.js', 'src/pagina.js']) {
    assert.ok(h.includes(ler(f).trim()), `${f} desatualizado em index.html: rode node scripts/montar.js`);
  }
});

test('index.html: conteúdo obrigatório da página', () => {
  const h = ler('index.html');
  for (const trecho of [
    'Simples 2027: híbrido ou não?', 'id="contagem"', 'id="diagnostico"', 'id="resultado"',
    'id="lista"', 'id="exemplo"', 'Como saber se sua empresa optou', 'Perguntas frequentes',
    '3. Para quem a empresa vende?', 'Distribua 100% entre os três tipos de cliente.',
    '<span class="afixo" aria-hidden="true">R$</span>',
    'Fontes oficiais', 'não substitui o contador', 'Opção pelo regime regular de IBS e CBS'
  ]) assert.ok(h.includes(trecho), trecho);
  for (const proibido of [/economia garantida/i, /bras[aã]o/i, /logo(tipo)? (da|do) (receita|governo)/i]) {
    assert.doesNotMatch(h, proibido);
  }
  // O PDF é baixado na hora; a lista não promete relatório por e-mail.
  for (const f of PAGINAS) assert.doesNotMatch(ler(f), /relat[óo]rio em PDF|receber o relat[óo]rio|com o relat[óo]rio/i, f);
  assert.ok(h.indexOf('id="imprimir"') < h.indexOf('id="lista"'), 'botão do PDF antes do formulário');
  assert.ok(h.indexOf('id="imprimir"') - h.indexOf('id="frase-resultado"') < 400, 'botão do PDF logo abaixo do semáforo');
});

const pendentes = PAGINAS.filter((f) => !fs.existsSync(path.join(RAIZ, f)) || /\{\{[A-Z_]+\}\}|FORMULARIO_PENDENTE/.test(ler(f)));
test('sem marcadores pendentes (contato e formulário)', { todo: pendentes.length ? 'falta preencher em: ' + pendentes.join(', ') : false }, () => {
  assert.deepEqual(pendentes, []);
});
