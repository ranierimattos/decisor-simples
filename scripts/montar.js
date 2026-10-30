/*
 * Monta index.html, privacidade.html e termos.html a partir de src/.
 * Executar na raiz: node scripts/montar.js
 *
 * - <!-- INCLUIR:arquivo --> vira o conteúdo do arquivo, em linha (página única);
 * - <!-- INCLUIR:formulario --> vira src/formulario.html (código do provedor),
 *   ou o link de src/config.json (formularioLink), ou um aviso de pendência;
 * - {{CHAVE}} vira o valor de src/config.json; vazio fica como está (o teste acusa),
 *   menos {{COLETA_ENDPOINT}} (coletaEndpoint), que pode ficar vazio: coleta desligada.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'src');
const ler = (p) => fs.readFileSync(p, 'utf8');
const cfg = JSON.parse(ler(path.join(SRC, 'config.json')));

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formulario() {
  const f = path.join(SRC, 'formulario.html');
  if (fs.existsSync(f)) return ler(f).trim();
  if (cfg.formularioLink) {
    return '<p><a class="botao cheio" href="' + esc(cfg.formularioLink) + '" rel="noopener">Entrar na lista prioritária</a></p>';
  }
  return '<!-- FORMULARIO_PENDENTE --><p><b>Formulário em configuração.</b> Volte em alguns minutos.</p>';
}

const INCLUSOES = {
  'cabeca.html': () => ler(path.join(SRC, 'cabeca.html')).trim(),
  'estilos.css': () => '<style>\n' + ler(path.join(SRC, 'estilos.css')) + '</style>',
  'parametros-2027.js': () => '<script>\n' + ler(path.join(RAIZ, 'parametros-2027.js')) + '</script>',
  'diagnostico.js': () => '<script>\n' + ler(path.join(RAIZ, 'diagnostico.js')) + '</script>',
  'pagina.js': () => '<script>\n' + ler(path.join(SRC, 'pagina.js')) + '</script>',
  formulario: formulario
};

// Coleta anônima: URL do app da Web do Google Apps Script (ferramentas/coleta/); vazio = desligada.
const COLETA = String(cfg.coletaEndpoint || '').trim();
if (COLETA && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(COLETA)) {
  throw new Error('coletaEndpoint inválido em src/config.json: use https://script.google.com/macros/s/…/exec ou deixe vazio.');
}

const VALORES = {
  CONTATO_EMAIL: cfg.contatoEmail,
  RESPONSAVEL: cfg.responsavel,
  PROVEDOR_FORMULARIO: cfg.provedorFormulario
};
const OPCIONAIS = { COLETA_ENDPOINT: COLETA }; // vazio é válido

function montar(origem, destino) {
  let h = ler(path.join(SRC, origem));
  h = h.replace(/<!-- INCLUIR:([\w.-]+) -->/g, (m, nome) => {
    if (!INCLUSOES[nome]) throw new Error('Inclusão desconhecida: ' + nome);
    return INCLUSOES[nome]();
  });
  h = h.replace(/\{\{([A-Z_]+)\}\}/g, (m, chave) => {
    if (Object.prototype.hasOwnProperty.call(OPCIONAIS, chave)) return esc(OPCIONAIS[chave]);
    return VALORES[chave] ? esc(VALORES[chave]) : m;
  });
  fs.writeFileSync(path.join(RAIZ, destino), h);
  const pend = h.match(/\{\{[A-Z_]+\}\}|FORMULARIO_PENDENTE/g);
  console.log(destino + (pend ? '  (pendente: ' + [...new Set(pend)].join(', ') + ')' : ''));
}

montar('pagina.html', 'index.html');
montar('privacidade.html', 'privacidade.html');
montar('termos.html', 'termos.html');
