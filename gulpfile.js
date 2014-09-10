var gulp = require('gulp'),
  nodemon = require('gulp-nodemon'),
  livereload = require('gulp-livereload');

gulp.task('default', function() {
  livereload.listen();
  nodemon({ script: 'server.js', ext: 'ejs js', env: { NODE_ENV: 'devlepment' } })
    .on('restart', livereload.changed);
});
