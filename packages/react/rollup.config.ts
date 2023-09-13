import { type RollupOptions } from 'rollup';
import { buildConfig } from '../../scripts/getRollupConfig';

export const input = ['src/index.ts', 'src/utils/index.ts'];

export default function rollup(): RollupOptions[] {
  return buildConfig({
    input,
    packageDir: __dirname,
  });
}
