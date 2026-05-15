import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/index.cjs.js',
                format: 'cjs'
            },
            {
                file: 'dist/index.es.js',
                format: 'es'
            }
        ],
        plugins: [
            peerDepsExternal(),
            typescript({
                tsconfig: './tsconfig.json',
            }),
            resolve(),
            commonjs()
        ]
    },
    {
        input: 'src/ztcp.ts',
        output: [
            {
                file: 'dist/ztcp.cjs.js',
                format: 'cjs'
            },
            {
                file: 'dist/ztcp.js',
                format: 'es'
            }
        ],
        external: ['net', './models/Finger', './services/user.service', './services/transaction.service', './services/options.service', './exceptions/handler', './helper/command', './helper/utils'],
        plugins: [
            peerDepsExternal(),
            typescript({
                tsconfig: './tsconfig.json',
            }),
            resolve(),
            commonjs()
        ]
    },
    {
        input: 'src/zudp.ts',
        output: [
            {
                file: 'dist/zudp.cjs.js',
                format: 'cjs'
            },
            {
                file: 'dist/zudp.js',
                format: 'es'
            }
        ],
        external: ['dgram', 'os', './exceptions/handler', './helper/command', './helper/utils'],
        plugins: [
            peerDepsExternal(),
            typescript({
                tsconfig: './tsconfig.json',
            }),
            resolve(),
            commonjs()
        ]
    }
];