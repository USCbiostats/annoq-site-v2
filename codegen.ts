import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: `${process.env.VITE_ANNOV_API_BASE ?? 'https://api-v2.annoq.org'}/graphql`,
  documents: ['src/**/*.graphql', 'src/**/*.{ts,tsx}'],
  generates: {
    './src/generated/': {
      preset: 'client'
    }
  },
  ignoreNoDocuments: true
};

export default config;
