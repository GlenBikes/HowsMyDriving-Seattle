const { series, parallel, src, dest } = require('gulp');

var gulp = require('gulp');

const gulp_prettier = require('gulp-prettier');
const ts = require('gulp-typescript');
const mocha = require('gulp-mocha');
const del = require('del');
const path = require('path');

exports.rebuild = series(
  clean,
  pretty_check,
  parallel(build, copyconfigfiles),
  test
);
exports.clean = clean;
exports.copyconfigfiles = copyconfigfiles;
exports.test = test;
exports.pretty = pretty;
exports.pretty_check = pretty_check;
exports.default = series(
  clean,
  pretty_check,
  parallel(build, copyconfigfiles),
  test
);

const tsProject = ts.createProject('./tsconfig.json');

function build(cb) {
  const merge = require('merge2');

  var tsResult = tsProject.src().pipe(tsProject());

  return merge([
    tsResult.dts.pipe(dest('./definitions')),
    tsResult.js.pipe(dest(tsProject.config.compilerOptions.outDir))
  ]);
}

function clean(cb) {
  return del(['dist/**/*']);
}

function test(cb) {
  return src('./dist/test/**/*.ts')
    .pipe(tsProject())
    .pipe(mocha({ require: ['ts-node/register'] }))
    .on('end', function() {
      cb;
    });
}

function copyconfigfiles(cb) {
  return src('./config/**/*.json').pipe(dest('./dist/config/'));
}

function pretty(cb) {
  const merge = require('merge2');

  return merge([tsProject.src(), src('./gulpfile.js')])
    .pipe(
      gulp_prettier({
        config: './.prettierrc.js',
        ignorePath: './prettierignore',
        loglevel: 'debug'
      })
    )
    .pipe(dest('.'));
}

function pretty_check(cb) {
  const merge = require('merge2');

  return merge([tsProject.src(), src('./gulpfile.js')]).pipe(
    gulp_prettier.check({
      config: './.prettierrc.js',
      ignorePath: './prettierignore',
      loglevel: 'debug'
    })
  );
}
