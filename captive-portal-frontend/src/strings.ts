// Single source of truth for all pt-BR copy (Decision 5).
// Verbatim port from notes/MKT WiFi - Captive Portal _standalone_.html
// AT-018 (string-snapshot test) diffs DOM text against tests/fixtures/expected_strings_pt-BR.txt
// regenerated from this module — keep in sync.

export const STR = {
  connecting: {
    seq: [
      { title: "Procurando rede…", subtitle: "Localizando sinal Wi-Fi disponível na praça." },
      { title: "Rede encontrada", subtitle: "{ssid} · sem senha" },
      { title: "Pronto para conectar", subtitle: "Redirecionando para o portal de acesso." },
    ],
    ssidTemplate: "MKT_WiFi_{venue}",
  },
  form: {
    headline: "Acesso liberado em 30 minutos.",
    sub: "Preencha rapidinho e assista a um vídeo de 30s para começar a navegar.",
    fields: {
      name: { label: "Nome", placeholder: "Seu primeiro nome" },
      age: { label: "Idade" },
      gender: { label: "Gênero" },
      neighborhood: { label: "Bairro" },
    },
    consentBefore: "Aceito os ",
    consentLink: "termos de uso",
    consentAfter: " e o tratamento dos meus dados conforme a LGPD.",
    privacyReassurance: "Seus dados ficam seguros e nunca são vendidos.",
    submit: "Continuar →",
  },
  ad: {
    badge: "ANÚNCIO",
    nonSkippable: "Não é possível pular o anúncio",
    muteOn: "Ativar som",
    muteOff: "Desativar som",
  },
  connected: {
    eyebrow: "CONECTADO",
    headlineTemplate: "Aproveite, {firstName}!",
    sub: "Já pode usar a internet livremente.",
    infoCardTitle: "Quando o tempo acabar",
    infoCardBody: "Assista a um vídeo de 1 minuto e ganhe mais 30 min.",
    foot: "Pode fechar esta aba e usar normalmente.",
  },
  renew: {
    headline: "Seu tempo acabou.",
    sub: "Assista a um vídeo de 1 minuto e ganhe mais 30 minutos de acesso.",
    statAd: "Anúncio: 60s",
    statAccess: "Acesso liberado: 30 min",
    cta: "Assistir e renovar",
  },
  errors: {
    bootstrapFailed: "Não foi possível carregar o portal. Recarregue a página.",
    sessionNotFound: "Sessão expirada. Recarregue a página para começar de novo.",
    adCompleteRetrying: "Liberando acesso…",
    adCompleteRetryWaiting: "Tentando novamente em {seconds}s…",
    adCompleteOverlayHeadline: "Não foi possível liberar o acesso.",
    adCompleteOverlaySub: "Verifique sua conexão ou recarregue a página.",
    adCompleteOverlayRetryCta: "Tentar novamente",
    adCompleteOverlayReloadCta: "Recarregar página",
  },
} as const;
