// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [eslint.configs.recommended, eslintConfigPrettier, ...tseslint.configs.recommended];
