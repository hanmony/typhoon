

import gulp from 'gulp';
import shell from 'gulp-shell';
import gulp_zip from 'gulp-zip';

const { series } = gulp;

const dev_server = "ds-001:/data/containers/typhoon/client"; // 开发服务器地址
const stage_server = "dev:/data/projects/typhoon/client"; // 预生产服务器地址
const prod_server = "hejin-online:/data/hejin"; // 生产服务器地址

const zipfile = 'typhoon-client.zip';
const srcfiles = ['dist/typhoon/**/*'];
const basePath = './dist/typhoon';

let serverValue = '';
let serverPathValue = '';

function prepare(server) {
  return cb => {
    const parts = server.split(':');
    serverValue = parts[0];
    serverPathValue = parts[1];
    cb();
  };
}

function zip() {
  return gulp.src(srcfiles, { base: basePath, encoding: false }).pipe(gulp_zip(zipfile)).pipe(gulp.dest('./dist'));
}

function compile() {
  return shell.task('ng build')();
}

function compileStage() {
  return shell.task('ng build --configuration=stage')();
}

function upload() {
  return shell.task(`scp ./dist/${zipfile} ${serverValue}:${serverPathValue}/${zipfile}`)();
}

function unzip() {
  return shell.task(`ssh ${serverValue} "cd ${serverPathValue} && unzip -o ${zipfile}"`)();
}

export const build = series(compile, zip);
export const prod = series(prepare(prod_server), compile, zip, upload, unzip);
export const dev = series(prepare(dev_server), compile, zip, upload, unzip);
export const stage = series(prepare(stage_server), compileStage, zip, upload, unzip);
