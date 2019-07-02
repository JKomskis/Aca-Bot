var { task, src, dest, parallel, series } = require("gulp");
var watch = require("gulp-watch");
var { createProject } = require("gulp-typescript");

var tsProject = createProject("tsconfig.json");

task("typescript", () => {
    return tsProject.src()
        .pipe(tsProject())
        .js
        .pipe(dest("dist"));
});

task("default", series(
    "typescript"
));

task("watch", () => {
    watch("src/**/*.ts", series("typescript"));
});