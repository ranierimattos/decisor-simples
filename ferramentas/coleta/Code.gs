/** @OnlyCurrentDoc */
// A anotação acima limita a autorização a esta planilha (escopo .currentonly).

/*
 * Receptor do evento anônimo do Decisor do Simples 2027 (Google Apps Script).
 * Grava uma linha por diagnóstico na aba "eventos" da planilha a que o script
 * está vinculado. Implantação em README.md, nesta pasta.
 *
 * O site envia, por POST, um JSON com as chaves de CAMPOS (ver
 * eventoAnonimo em diagnostico.js). Cada valor é conferido contra a lista do
 * que o site pode mandar; o que não confere vira vazio. Nada pessoal chega
 * aqui: o Apps Script não recebe o IP de quem envia.
 */
var ABA = 'eventos';
var CAMPOS = ['data', 'motor', 'resultado', 'atividade', 'fatorr', 'anexo', 'faixa', 'mix', 'compras', 'reducao', 'dif'];
var PERMITIDOS = {
  data: /^\d{4}-\d{2}-\d{2}$/,
  motor: /^\d+\.\d+\.\d+$/,
  resultado: /^(hibrido|analisar|puro)$/,
  atividade: /^(comercio|industria|servicos|contabilidade|educacao|intelectual|engenharia|saude|advocacia|construcao)$/,
  fatorr: /^(sim|nao|naosei)?$/,
  anexo: /^(I|II|III|IV|V)$/,
  faixa: /^[1-6]$/,
  mix: /^(empresas|simples|consumidor|dividido)$/,
  compras: /^(5|10|25|40)$/,
  reducao: /^(0|30|60)$/,
  dif: /^-?\d{1,9}$/
};
var TAMANHO_MAXIMO = 2000; // bytes do corpo
var MAX_LINHAS = 100000;   // teto contra envio em massa: acima disso, ignora

function doPost(e) {
  try {
    var corpo = e && e.postData && e.postData.contents;
    if (!corpo || corpo.length > TAMANHO_MAXIMO) return resposta('ignorado');
    var ev = JSON.parse(corpo);
    var linha = [new Date()];
    var validos = 0;
    CAMPOS.forEach(function (k) {
      var v = ev[k] === undefined || ev[k] === null ? '' : String(ev[k]);
      if (PERMITIDOS[k].test(v)) { validos++; linha.push(k === 'dif' || k === 'faixa' || k === 'compras' || k === 'reducao' ? Number(v) : v); }
      else linha.push('');
    });
    if (validos < CAMPOS.length) return resposta('ignorado');
    var trava = LockService.getScriptLock();
    trava.waitLock(10000);
    try {
      var a = aba();
      if (a.getLastRow() > MAX_LINHAS) return resposta('ignorado');
      a.appendRow(linha);
    } finally { trava.releaseLock(); }
    return resposta('ok');
  } catch (err) {
    return resposta('erro');
  }
}

function doGet() {
  return resposta('Coleta anônima do Decisor do Simples 2027: envie por POST.');
}

function aba() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var a = planilha.getSheetByName(ABA);
  if (!a) {
    a = planilha.insertSheet(ABA);
    a.appendRow(['recebido'].concat(CAMPOS));
    a.setFrozenRows(1);
  }
  return a;
}

function resposta(texto) {
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.TEXT);
}

// Para testar no editor do Apps Script (Executar > testar): grava uma linha de exemplo.
function testar() {
  var r = doPost({ postData: { contents: JSON.stringify({
    data: '2026-10-30', motor: '2.0.0', resultado: 'analisar', atividade: 'saude', fatorr: 'naosei', anexo: 'III',
    faixa: 3, mix: 'dividido', compras: 10, reducao: 60, dif: -2000
  }) } });
  Logger.log(r.getContent());
}
