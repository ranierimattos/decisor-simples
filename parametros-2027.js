/*
 * PARÂMETROS LEGAIS DO DIAGNÓSTICO (2027)
 * ---------------------------------------------------------------------------
 * Todos os valores legais usados por diagnostico.js ficam aqui. Nenhum outro
 * arquivo deve conter alíquotas, faixas, partilhas ou datas legais.
 *
 * STATUS:
 *   'oficial'     lido no texto oficial (Planalto, CGSN, Senado) na data de consulta;
 *   'secundária'  transcrito da legislação ou derivado por regra conferida,
 *                 sem leitura do texto oficial do item na data de consulta;
 *   'projetado'   ainda não publicado em definitivo; premissa de simulação.
 *
 * Repartição no DAS (frações do total): IRPJ, CSLL, COFINS, PIS, CPP, IPI, ICMS, ISS.
 * Em 2027–2028, CBS + IBS ocupam a fatia de PIS + Cofins (LC 227/2026, Anexo XX).
 */
(function (raiz) {
  'use strict';

  var CONSULTA = '2026-10-30';

  var FONTES = {
    lc123: {
      titulo: 'Lei Complementar nº 123/2006, Anexos I a V (redação da LC nº 155/2016): alíquotas nominais, parcelas a deduzir e repartição',
      url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm',
      consulta: CONSULTA
    },
    lc227: {
      titulo: 'Lei Complementar nº 227/2026, Anexo XX: novos Anexos da LC 123 com a partilha de CBS e IBS (vigência 2027–2028)',
      url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm',
      consulta: CONSULTA
    },
    lc214: {
      titulo: 'Lei Complementar nº 214/2025: regime regular de IBS/CBS (art. 41), crédito do adquirente de optante (art. 47, § 9º), reduções de 30% (art. 127) e de 60%',
      url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      consulta: CONSULTA
    },
    senadoTcu: {
      titulo: 'Agência Senado, 28/10/2026: TCU calcula a alíquota de referência da CBS de 2027 em 11,3%; o Senado pode fixar outra até 15/12/2026',
      url: 'https://www12.senado.leg.br/noticias/materias/2026/10/28/reforma-tributaria-tcu-calcula-aliquota-da-cbs-em-11-3-para-2027',
      consulta: CONSULTA
    },
    manualCgsn: {
      titulo: 'Manual da Opção pelo Regime Regular do IBS e da CBS no Simples Nacional (CGSN, versão de 07/10/2026) e Res. CGSN nº 194/2026',
      url: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/Manual%20op%C3%A7%C3%A3o%20regime%20regular%20IBS%20e%20CBS%20no%20Simples%20Nacional.pdf',
      consulta: CONSULTA
    },
    cgibs: {
      titulo: 'Comitê Gestor do IBS: prazos de 2027 para o Simples Nacional',
      url: 'https://www.cgibs.gov.br/embora-os-periodos-sejam-parecidos-tratam-de-escolhas-diferentes-por-isso-e-importante-entender-cada-situacao',
      consulta: CONSULTA
    }
  };

  // rep = [IRPJ, CSLL, COFINS, PIS, CPP, IPI, ICMS, ISS]
  function faixa(ate, aliq, pd, rep) {
    return {
      ate: ate, aliquota: aliq, parcelaDeduzir: pd,
      reparticao: {
        IRPJ: rep[0], CSLL: rep[1], COFINS: rep[2], PIS: rep[3],
        CPP: rep[4], IPI: rep[5], ICMS: rep[6], ISS: rep[7]
      }
    };
  }

  var ANEXOS = {
    I: {
      nome: 'Anexo I',
      descricao: 'Comércio',
      faixas: [
        faixa(180000.00, 0.04, 0.00, [0.055, 0.035, 0.1274, 0.0276, 0.415, 0, 0.34, 0]),
        faixa(360000.00, 0.073, 5940.00, [0.055, 0.035, 0.1274, 0.0276, 0.415, 0, 0.34, 0]),
        faixa(720000.00, 0.095, 13860.00, [0.055, 0.035, 0.1274, 0.0276, 0.42, 0, 0.335, 0]),
        faixa(1800000.00, 0.107, 22500.00, [0.055, 0.035, 0.1274, 0.0276, 0.42, 0, 0.335, 0]),
        faixa(3600000.00, 0.143, 87300.00, [0.055, 0.035, 0.1274, 0.0276, 0.42, 0, 0.335, 0]),
        faixa(4800000.00, 0.19, 378000.00, [0.135, 0.10, 0.2827, 0.0613, 0.421, 0, 0, 0])
      ],
      status: 'secundária',
      fontes: ['lc123'],
      observacao: 'Copiado de med-business (transcrito da LC 123). Partilha de CBS/IBS de 2027 não lida no Anexo XX: usa-se a fatia de PIS + Cofins.'
    },
    II: {
      nome: 'Anexo II',
      descricao: 'Indústria',
      faixas: [
        faixa(180000.00, 0.045, 0.00, [0.055, 0.035, 0.1151, 0.0249, 0.375, 0.075, 0.32, 0]),
        faixa(360000.00, 0.078, 5940.00, [0.055, 0.035, 0.1151, 0.0249, 0.375, 0.075, 0.32, 0]),
        faixa(720000.00, 0.10, 13860.00, [0.055, 0.035, 0.1151, 0.0249, 0.375, 0.075, 0.32, 0]),
        faixa(1800000.00, 0.112, 22500.00, [0.055, 0.035, 0.1151, 0.0249, 0.375, 0.075, 0.32, 0]),
        faixa(3600000.00, 0.147, 85500.00, [0.055, 0.035, 0.1151, 0.0249, 0.375, 0.075, 0.32, 0]),
        faixa(4800000.00, 0.30, 720000.00, [0.085, 0.075, 0.2096, 0.0454, 0.235, 0.35, 0, 0])
      ],
      status: 'secundária',
      fontes: ['lc123'],
      observacao: 'Transcrito da LC 123 (sem conferência online). Partilha de CBS/IBS de 2027 não lida no Anexo XX: usa-se a fatia de PIS + Cofins. Tratamento do IPI em 2027 não modelado.'
    },
    III: {
      nome: 'Anexo III',
      descricao: 'Serviços (inclui atividades com fator "r" ≥ 28%)',
      faixas: [
        faixa(180000.00, 0.06, 0.00, [0.04, 0.035, 0.1282, 0.0278, 0.434, 0, 0, 0.335]),
        faixa(360000.00, 0.112, 9360.00, [0.04, 0.035, 0.1405, 0.0305, 0.434, 0, 0, 0.32]),
        faixa(720000.00, 0.135, 17640.00, [0.04, 0.035, 0.1364, 0.0296, 0.434, 0, 0, 0.325]),
        faixa(1800000.00, 0.16, 35640.00, [0.04, 0.035, 0.1364, 0.0296, 0.434, 0, 0, 0.325]),
        faixa(3600000.00, 0.21, 125640.00, [0.04, 0.035, 0.1282, 0.0278, 0.434, 0, 0, 0.335]),
        faixa(4800000.00, 0.33, 648000.00, [0.35, 0.15, 0.1603, 0.0347, 0.305, 0, 0, 0])
      ],
      status: 'secundária',
      fontes: ['lc123'],
      observacao: 'Copiado de med-business. A partilha de CBS/IBS de 2027–2028 deste anexo foi lida na LC 227 (ver PARTILHA_2027.III).'
    },
    IV: {
      nome: 'Anexo IV',
      descricao: 'Serviços com CPP fora do DAS (advocacia, construção civil, vigilância, limpeza)',
      faixas: [
        faixa(180000.00, 0.045, 0.00, [0.188, 0.152, 0.1767, 0.0383, 0, 0, 0, 0.445]),
        faixa(360000.00, 0.09, 8100.00, [0.198, 0.152, 0.2055, 0.0445, 0, 0, 0, 0.40]),
        faixa(720000.00, 0.102, 12420.00, [0.208, 0.152, 0.1973, 0.0427, 0, 0, 0, 0.40]),
        faixa(1800000.00, 0.14, 39780.00, [0.178, 0.192, 0.189, 0.041, 0, 0, 0, 0.40]),
        faixa(3600000.00, 0.22, 183780.00, [0.188, 0.192, 0.1808, 0.0392, 0, 0, 0, 0.40]),
        faixa(4800000.00, 0.33, 828000.00, [0.535, 0.215, 0.2055, 0.0445, 0, 0, 0, 0])
      ],
      status: 'secundária',
      fontes: ['lc123'],
      observacao: 'Transcrito da LC 123 (sem conferência online); alíquotas e parcelas iguais aos valores de referência do HANDOFF. Partilha de CBS/IBS de 2027 não lida no Anexo XX: usa-se a fatia de PIS + Cofins.'
    },
    V: {
      nome: 'Anexo V',
      descricao: 'Serviços com fator "r" < 28%',
      faixas: [
        faixa(180000.00, 0.155, 0.00, [0.25, 0.15, 0.141, 0.0305, 0.2885, 0, 0, 0.14]),
        faixa(360000.00, 0.18, 4500.00, [0.23, 0.15, 0.141, 0.0305, 0.2785, 0, 0, 0.17]),
        faixa(720000.00, 0.195, 9900.00, [0.24, 0.15, 0.1492, 0.0323, 0.2385, 0, 0, 0.19]),
        faixa(1800000.00, 0.205, 17100.00, [0.21, 0.15, 0.1574, 0.0341, 0.2385, 0, 0, 0.21]),
        faixa(3600000.00, 0.23, 62100.00, [0.23, 0.125, 0.141, 0.0305, 0.2385, 0, 0, 0.235]),
        faixa(4800000.00, 0.305, 540000.00, [0.35, 0.155, 0.1644, 0.0356, 0.295, 0, 0, 0])
      ],
      status: 'secundária',
      fontes: ['lc123'],
      observacao: 'Copiado de med-business (transcrito da LC 123). Partilha de CBS/IBS de 2027 não lida no Anexo XX: usa-se a fatia de PIS + Cofins.'
    }
  };

  /*
   * CBS e IBS no DAS em 2027–2028, por faixa. null = não lido no texto oficial;
   * nesse caso o diagnóstico usa PIS + Cofins da mesma faixa (regra conferida
   * nas faixas lidas do Anexo III: CBS + IBS = PIS + Cofins).
   */
  var PARTILHA_2027 = {
    III: {
      faixas: [
        { CBS: 0.1543, IBS: 0.0017, status: 'oficial' },
        { CBS: 0.1691, IBS: 0.0019, status: 'oficial' },
        { CBS: 0.1641, IBS: 0.0019, status: 'oficial' },
        { CBS: 0.1641, IBS: 0.0019, status: 'oficial' },
        { CBS: 0.1543, IBS: null, status: 'oficial' },
        null
      ],
      fontes: ['lc227'],
      observacao: 'Lido em 30/10/2026 no Planalto (LC 227, Anexo XX, Anexo III, vigência 1º/1/2027 a 31/12/2028). O texto disponível termina na 5ª faixa, antes do IBS; o IBS da 5ª faixa e a 6ª faixa seguem a regra CBS + IBS = PIS + Cofins.'
    }
  };

  var PENDENCIAS = [
    'Anexos I, II, IV e V: ler no Anexo XX da LC 227/2026 a partilha de CBS e IBS de 2027–2028 (hoje: PIS + Cofins atuais, status secundária).',
    'Anexo III: ler o IBS da 5ª faixa e a 6ª faixa no Anexo XX (o texto do Planalto obtido termina antes).',
    'Anexo II: conferir o tratamento do IPI na partilha de 2027.',
    'Alíquota de referência da CBS de 2027: resolução do Senado até 15/12/2026.'
  ];

  var PARAMETROS_2027 = {
    versao: '2027.1',
    consulta: CONSULTA,
    fontes: FONTES,
    anexos: ANEXOS,
    partilha2027: PARTILHA_2027,
    limiteSimples: { valor: 4800000, status: 'oficial', fonte: 'lc123' },
    sublimite: { valor: 3600000, status: 'secundária', fonte: 'lc123', observacao: 'Acima do sublimite, ICMS/ISS (e IBS desde 2027) saem do DAS; o diagnóstico rápido não modela esse caso.' },
    fatorR: { limite: 0.28, status: 'secundária', fonte: 'lc123' },
    aliquotaReferencia: {
      padrao: 0.113, minimo: 0.09, maximo: 0.12,
      status: 'projetado',
      fontes: ['senadoTcu'],
      observacao: 'CBS + IBS de 2027: 11,3% calculado pelo TCU em 28/10/2026 (o IBS de teste de 0,1% está contido). O Senado pode fixar outra alíquota até 15/12/2026; a faixa de 9% a 12% cobre essa incerteza.'
    },
    reducoes: {
      nenhuma: { valor: 0, rotulo: 'Nenhuma' },
      trinta: { valor: 0.30, rotulo: '30% (profissões regulamentadas, LC 214, art. 127)' },
      sessenta: { valor: 0.60, rotulo: '60% (saúde, educação e outros)' },
      status: 'oficial', fontes: ['lc214']
    },
    // Horários de Brasília (UTC−3, sem horário de verão) em ISO 8601.
    prazos: {
      opcao1sem2027: { fim: '2026-10-30T23:59:59-03:00', status: 'oficial', fontes: ['manualCgsn', 'cgibs'] },
      cancelamento: { inicio: '2026-11-03T00:00:00-03:00', fim: '2026-12-20T23:59:59-03:00', status: 'oficial', fontes: ['manualCgsn'], observacao: 'Cancelamento irretratável: não se pode optar de novo para o mesmo semestre.' },
      aliquotaOficial: { fim: '2026-12-15', status: 'oficial', fontes: ['senadoTcu'] },
      opcao2sem2027: { rotulo: 'março de 2027', status: 'oficial', fontes: ['manualCgsn'], observacao: 'O manual do CGSN fala em "setembro e março de cada ano"; um comentário da LC 227 fala em abril.' }
    },
    pendencias: PENDENCIAS
  };

  raiz.Parametros2027 = PARAMETROS_2027;
  if (typeof module === 'object' && module.exports) module.exports = PARAMETROS_2027;
})(typeof window !== 'undefined' ? window : globalThis);
