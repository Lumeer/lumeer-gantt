import typescript from 'rollup-plugin-typescript2';
import postcss from 'rollup-plugin-postcss';
import terser from '@rollup/plugin-terser';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import merge from 'deepmerge';

// PostCSS plugins
import simplevars from 'postcss-simple-vars';

const dev = {
  input: 'src/index.ts',
  output: [
    {
      name: 'Gantt',
      file: 'dist/lumeer-gantt.js',
      format: 'umd',
    },
  ],
  plugins: [
    postcss({
      plugins: [simplevars()],
      extract: 'dist/lumeer-gantt.css',
      extensions: ['.scss'],
    }),
    typescript({
      typescript: require('typescript'),
    }),
    commonjs({
      include: ['node_modules/moment/**'],
    }),
    resolve(),
  ],
};

const prod = merge(dev, {
  output: {
    name: 'Gantt',
    file: 'dist/lumeer-gantt.min.js',
    format: 'umd',
  },
  plugins: [terser()],
});

export default [dev, prod];
