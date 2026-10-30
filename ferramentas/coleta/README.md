# Coleta anônima dos diagnósticos (Google Apps Script)

Cada clique em "Ver meu diagnóstico" envia ao endpoint `coletaEndpoint` de `src/config.json` um JSON sem dado pessoal:

```json
{"data":"2026-10-30","motor":"2.0.0","resultado":"analisar","atividade":"saude","fatorr":"naosei","anexo":"III","faixa":3,"mix":"dividido","compras":10,"reducao":60,"dif":-2000}
```

`faixa` é uma das 6 faixas do Simples (nunca a receita), `compras` e `reducao` estão em %, e `dif` é a diferença anual (híbrido − puro) arredondada ao milhar. O `Code.gs` grava uma linha por evento na aba `eventos` e descarta o que não estiver na lista de valores aceitos.

Com `coletaEndpoint` vazio, a página não envia nada.

## Implantação (uma vez, ~10 min)

1. No Google Drive da conta do Decisor, crie a planilha **Decisor: diagnósticos anônimos**.
2. Na planilha: **Extensões → Apps Script**. Apague o conteúdo de `Código.gs` e cole o de `ferramentas/coleta/Code.gs`. Salve.
3. No editor, escolha a função `testar` e clique em **Executar**. Autorize o acesso à planilha (é a sua conta). Confira se a aba `eventos` apareceu com o cabeçalho e uma linha de exemplo; apague a linha de exemplo.
4. **Implantar → Nova implantação → tipo "App da Web"**:
   - Descrição: `coleta v1`;
   - Executar como: **Eu**;
   - Quem pode acessar: **Qualquer pessoa** (sem login; o site envia sem cookies).
5. Copie o URL do app da Web, no formato `https://script.google.com/macros/s/…/exec`.
6. Em `src/config.json`, preencha `"coletaEndpoint": "<URL>"`. O `scripts/montar.js` recusa qualquer outro formato.
7. Na raiz do repositório:

   ```bash
   node scripts/montar.js
   node --test
   ```

8. Teste o endpoint (deve responder `ok` e gravar uma linha):

   ```bash
   curl -sL -X POST -H "Content-Type: text/plain" --data '{"data":"2026-10-30","motor":"2.0.0","resultado":"puro","atividade":"comercio","fatorr":"","anexo":"I","faixa":2,"mix":"consumidor","compras":40,"reducao":0,"dif":-9000}' "<URL>"
   ```

9. Faça commit de `src/config.json` e dos HTML gerados, e publique.

## Manutenção

- **Mudou o `Code.gs`?** Use **Implantar → Gerenciar implantações → editar → Nova versão** para manter o mesmo URL.
- **Taxa de conversão:** contatos novos no Brevo ÷ linhas novas na aba `eventos`, no mesmo período.
- **Prazo de guarda:** a Política de Privacidade promete apagar a planilha até 31/12/2028.
- **Mudou o formato do evento** (`eventoAnonimo` em `diagnostico.js`)? Atualize `CAMPOS` e `PERMITIDOS` no `Code.gs`, e a versão do motor (`VERSAO_MOTOR`).
