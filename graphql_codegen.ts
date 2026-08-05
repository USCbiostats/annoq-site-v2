import type { CodegenConfig } from '@graphql-codegen/cli';
import { environment } from './src/lib/environment';

const config: CodegenConfig = {
  overwrite: true,
  schema: `${environment.annotationApiV2}/graphql`,
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript']
    }
  }
};

export default config;
