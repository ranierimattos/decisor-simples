# Decisor do Simples 2027: diagnóstico grátis

Página pública que compara, para o 1º semestre de 2027, o Simples Nacional "puro" com o regime regular de IBS e CBS ("híbrido"), num diagnóstico de quatro cliques: atividade, faixa de faturamento, para quem vende e quanto compra. O cálculo roda no navegador.

Requisições externas (os testes conferem a lista):

- **Formulário da lista:** Brevo (`sibforms.com` para CSS, JS e envio; `static.brevo.com` para países e bandeiras do campo WhatsApp) e Google reCAPTCHA ("Não sou um robô": `www.google.com/recaptcha`, `www.gstatic.com/recaptcha`). Com a inscrição vão os campos ocultos `DIAG_RESULTADO` (`hibrido`, `analisar` ou `puro`) e `DIAG_RESUMO` (`chave=valor;…`, com a faixa, nunca a receita).
- **Evento anônimo:** a cada diagnóstico, um JSON sem dado pessoal vai, sem cookies, ao `coletaEndpoint` de `src/config.json` (Google Apps Script que grava numa planilha; vazio = desligado). Implantação em [`ferramentas/coleta/`](ferramentas/coleta/README.md).

> Estimativa educativa; não substitui o contador.

## Metodologia

`e` = alíquota efetiva do Simples (LC 123), `s` = fatia de CBS + IBS no DAS (LC 227/2026, Anexo XX), `t` = CBS + IBS × (1 − redução), `c` = alíquota cheia sobre as compras com crédito, `P` = receita do mês (RBT12 ÷ 12).

| Cenário | Preço sem IBS/CBS (`B`) | A empresa fica com |
|---|---|---|
| Puro | `P` | `P × (1 − e)` |
| Híbrido, cliente do Lucro Presumido/Real (mantém o custo líquido) | `P × (1 − e·s)` | `B × (1 − e·(1 − s))` |
| Híbrido, cliente do Simples ou consumidor final (mantém o preço final) | `P / (1 + t)` | `B × (1 − e·(1 − s))` |

No híbrido, soma-se uma vez por mês o crédito das compras (`compras × c`). A diferença (híbrido − puro) é ponderada pelo mix de clientes e calculada com `t` de 9% a 12% (padrão 11,3%, TCU).

No diagnóstico de quatro cliques, a receita é o meio da faixa do Simples escolhida, e o intervalo por ano cobre a faixa inteira e `t` de 9% a 12%. Os mixes prontos (Lucro Presumido/Real, Simples, consumidor final) são 70/15/15, 15/70/15, 10/10/80 e 34/33/33; as compras, 5%, 10%, 25% ou 40% da receita, com sugestão pela atividade. A redução de alíquota vem da atividade, e o preço mantém o custo do cliente empresa. Com fator r "não sei", vale o pior entre os Anexos III e V. Semáforo: verde se a diferença for maior que +0,5% da receita em toda a faixa; vermelho se for menor que −0,5%; amarelo nos demais casos.

Cada parâmetro de [`parametros-2027.js`](parametros-2027.js) traz fonte, URL, data de consulta e status (`oficial`, `secundária`, `projetado`). As pendências de conferência ficam em `pendencias`.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `parametros-2027.js` | Anexos I a V, partilha de CBS/IBS de 2027, alíquota de referência, reduções e prazos |
| `diagnostico.js` | Motor (navegador e Node) |
| `src/` | Fontes da página (`pagina.html`, `pagina.js`, `estilos.css`, `formulario.html`, `privacidade.html`, `termos.html`, `config.json`) |
| `ferramentas/coleta/` | Receptor do evento anônimo (`Code.gs`, Google Apps Script) e passo a passo de implantação |
| `scripts/montar.js` | Gera `docs/index.html`, `docs/privacidade.html` e `docs/termos.html` (CSS e scripts em linha) |
| `docs/` | **O que vai ao ar** (GitHub Pages, pasta `/docs`): as três páginas montadas, `img/` (logotipo, ícones, imagem de compartilhamento) e `fontes/` (Manrope auto-hospedada, licença OFL em `docs/fontes/OFL-Manrope.txt`). O resto do repositório não é servido no endereço do site |
| `tests/diagnostico.test.js` | Testes do motor e das páginas |

## Comandos

```bash
node scripts/montar.js
node --test
```

O formulário do Brevo fica em `src/formulario.html`, com o visual da marca em `src/estilos.css`; o reCAPTCHA v2 (chave do site pública; domínios `ranierimattos.github.io` e `sibforms.com` no Google) vem antes do botão, e o `api.js` do Google, depois do `main.js`. Depois de mexer: `node scripts/montar.js` e `node --test`.
