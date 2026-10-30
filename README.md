# Decisor do Simples 2027: diagnóstico grátis

Página pública que compara, para o 1º semestre de 2027, o Simples Nacional "puro" com o regime regular de IBS e CBS ("híbrido"). O diagnóstico roda no navegador e não envia os dados da empresa. Só o formulário da lista prioritária faz requisição externa: Brevo (`sibforms.com` para CSS, JS e envio; `static.brevo.com` para países e bandeiras do campo WhatsApp) e Google reCAPTCHA da verificação "Não sou um robô" (`www.google.com/recaptcha`, `www.gstatic.com/recaptcha`). Os testes conferem essa lista.

> Estimativa educativa; não substitui o contador.

## Metodologia

`e` = alíquota efetiva do Simples (LC 123), `s` = fatia de CBS + IBS no DAS (LC 227/2026, Anexo XX), `t` = CBS + IBS × (1 − redução), `c` = alíquota cheia sobre as compras com crédito, `P` = receita do mês (RBT12 ÷ 12).

| Cenário | Preço sem IBS/CBS (`B`) | A empresa fica com |
|---|---|---|
| Puro | `P` | `P × (1 − e)` |
| Híbrido, cliente do Lucro Presumido/Real (mantém o custo líquido) | `P × (1 − e·s)` | `B × (1 − e·(1 − s))` |
| Híbrido, cliente do Simples ou consumidor final (mantém o preço final) | `P / (1 + t)` | `B × (1 − e·(1 − s))` |

No híbrido, soma-se uma vez por mês o crédito das compras (`compras × c`). A diferença (híbrido − puro) é ponderada pelo mix de clientes e calculada com `t` de 9% a 12% (padrão 11,3%, TCU). Semáforo: verde se a diferença for maior que +0,5% da receita em toda a faixa; vermelho se for menor que −0,5%; amarelo nos demais casos.

Cada parâmetro de [`parametros-2027.js`](parametros-2027.js) traz fonte, URL, data de consulta e status (`oficial`, `secundária`, `projetado`). As pendências de conferência ficam em `pendencias`.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `parametros-2027.js` | Anexos I a V, partilha de CBS/IBS de 2027, alíquota de referência, reduções e prazos |
| `diagnostico.js` | Motor (navegador e Node) |
| `src/` | Fontes da página (`pagina.html`, `pagina.js`, `estilos.css`, `privacidade.html`, `termos.html`, `config.json`) |
| `scripts/montar.js` | Gera `index.html`, `privacidade.html` e `termos.html` (CSS e scripts em linha) |
| `img/`, `fontes/` | Marca Decisor: logotipo, ícones, imagem de compartilhamento e Manrope auto-hospedada (licença OFL em `fontes/OFL-Manrope.txt`) |
| `tests/diagnostico.test.js` | Testes do motor e das páginas |

## Comandos

```bash
node scripts/montar.js
node --test
```

O formulário do Brevo fica em `src/formulario.html`, com o visual da marca em `src/estilos.css`; o reCAPTCHA v2 (chave do site pública; domínios `ranierimattos.github.io` e `sibforms.com` no Google) vem antes do botão, e o `api.js` do Google, depois do `main.js`. Depois de mexer: `node scripts/montar.js` e `node --test`.
