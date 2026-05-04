export const environment = {
  dataset: import.meta.env.VITE_ANNOQ_DATASET ?? 'annoq-annotations-v5',
  production: import.meta.env.PROD,
  annotationApiV2: import.meta.env.VITE_ANNOQ_API_V2 ?? import.meta.env.VITE_ANNOV_API_BASE ?? 'https://api-v2.annoq.org',
  snpResultsSize: Number(import.meta.env.VITE_ANNOQ_SNP_RESULTS_SIZE ?? 50),
  termsDisplayedSize: Number(import.meta.env.VITE_ANNOQ_TERMS_DISPLAYED_SIZE ?? (import.meta.env.PROD ? 5 : 8)),
  genesDisplayedSize: Number(import.meta.env.VITE_ANNOQ_GENES_DISPLAYED_SIZE ?? 5),
  amigoTermUrl: import.meta.env.VITE_ANNOQ_AMIGO_TERM_URL ?? 'http://amigo.geneontology.org/amigo/term/',
  pubmedUrl: import.meta.env.VITE_ANNOQ_PUBMED_URL ?? 'https://www.ncbi.nlm.nih.gov/pubmed/',
  ucscUrl:
    import.meta.env.VITE_ANNOQ_UCSC_URL ??
    'https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&lastVirtModeType=default&lastVirtModeExtraState=&virtModeType=default&virtMode=0&nonVirtPosition=&position=chr',
  googleAnalyticsId: import.meta.env.VITE_ANNOQ_GA_ID ?? 'G-ZRDY68GK00'
};
