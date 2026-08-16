import gulp from "gulp";
import shell from "gulp-shell";
import gulp_zip from "gulp-zip";

const { series } = gulp;

const dev_server = "ds-001:/data/containers/typhoon/server"; // 开发服务器地址
const stage_server = "dev:/data/projects/typhoon/server"; // 预生产服务器地址
const prod_server = "hejin-online:/data/hejin"; // 生产服务器地址

const zipfile = "typhoon-server.zip";
const srcfiles = ["dist/**/*", "package*.json"];

let serverValue = "";
let serverPathValue = "";

function prepare(server) {
    return cb => {
        const parts = server.split(":");
        serverValue = parts[0];
        serverPathValue = parts[1];
        cb();
    };
}

function zip() {
    return gulp.src(srcfiles, { base: "." }).pipe(gulp_zip(zipfile)).pipe(gulp.dest("./out"));
}

function compile() {
    return shell.task("npm run build")();
}

function upload() {
    return shell.task(`scp ./out/${zipfile} ${serverValue}:${serverPathValue}/${zipfile}`)();
}

function unzip() {
    return shell.task(`ssh ${serverValue} "cd ${serverPathValue} && unzip -o ${zipfile}"`)();
}

export const build = series(compile, zip);
export const dev = series(prepare(dev_server), compile, zip, upload, unzip);
export const stage = series(prepare(stage_server), compile, zip, upload, unzip);
export const prod = series(prepare(prod_server), compile, zip, upload, unzip);
