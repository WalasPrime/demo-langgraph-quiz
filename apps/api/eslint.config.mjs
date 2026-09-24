import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['dist/**', 'coverage/**', 'jest.config.js'] },
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			indent: ['error', 'tab', { SwitchCase: 1 }],
			'nonblock-statement-body-position': ['error', 'beside', { overrides: { if: 'below' } }],
			'no-trailing-spaces': 'error',
			'padding-line-between-statements': [
				'error',
				{ blankLine: 'always', prev: '*', next: ['const', 'let', 'var'] },
				{ blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
				{ blankLine: 'always', prev: '*', next: 'if' },
				{ blankLine: 'always', prev: 'if', next: '*' },
				{ blankLine: 'always', prev: '*', next: 'return' },
				{ blankLine: 'never', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
			],
		},
	},
);
