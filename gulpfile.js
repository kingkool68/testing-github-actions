/**
 * Gulpfile.
 *
 * Gulp with WordPress.
 *
 * Implements:
 *      1. Live reloads browser with BrowserSync.
 *      2. CSS: Sass to CSS conversion, error catching, Autoprefixing, Sourcemaps,
 *         CSS minification, and Merge Media Queries.
 *      3. JS: Concatenates & uglifies Vendor and Custom JS files.
 *      4. Images: Minifies PNG, JPEG, GIF and SVG images.
 *      5. Watches files for changes in CSS or JS.
 *      6. Watches files for changes in PHP.
 *      7. Corrects the line endings.
 *
 * @author Ahmad Awais (https://github.com/ahmadawais)
 *         Contributors: https://AhmdA.ws/WPGContributors
 * @version 1.9.3
 */

/**
 * Load Config.
 *
 * Customize your project in the config.js file
 */
 const config = require( './gulp-config.js' );

 /**
  * Load Plugins.
  *
  * Load gulp plugins and passing them semantic names.
  */
 var gulp = require( 'gulp' ); // Gulp of-course

 // CSS related plugins.
 var sass         = require('gulp-dart-sass'); // Gulp pluign for Sass compilation.
 var minifycss    = require( 'gulp-uglifycss' ); // Minifies CSS files.
 var autoprefixer = require( 'gulp-autoprefixer' ); // Autoprefixing magic.
 var mmq          = require( 'gulp-merge-media-queries' ); // Combine matching media queries into one media query definition.
 var rtlcss       = require( 'gulp-rtlcss' ); // Generates RTL stylesheet.

 // JS related plugins.
 var concat = require( 'gulp-concat' ); // Concatenates JS files
 var uglify = require( 'gulp-uglify' ); // Minifies JS files
 var babel  = require( 'gulp-babel' ); // Compiles ESNext to browser compatible JS.
 var esbuild = require( 'gulp-esbuild' ); // Modern bundling

 // Utility related plugins.
 var rename      = require( 'gulp-rename' ); // Renames files E.g. style.css -> style.min.css
 var lineec      = require( 'gulp-line-ending-corrector' ); // Consistent Line Endings for non UNIX systems. Gulp Plugin for Line Ending Corrector (A utility that makes sure your files have consistent line endings)
 var filter      = require( 'gulp-filter' ); // Enables you to work on a subset of the original files by filtering them using globbing.
 var sourcemaps  = require( 'gulp-sourcemaps' ); // Maps code in a compressed file (E.g. style.css) back to it’s original position in a source file (E.g. structure.scss, which was later combined with other css files to generate style.css)
 var notify      = require( 'gulp-notify' ); // Sends message notification to you
 var sort        = require( 'gulp-sort' ); // Recommended to prevent unnecessary changes in pot-file.
 var cache       = require( 'gulp-cache' ); // Cache files in stream for later use
 var remember    = require( 'gulp-remember' ); // Adds all the files it has ever seen back into the stream
 var plumber     = require( 'gulp-plumber' ); // Prevent pipe breaking caused by errors from gulp plugins

 /**
  * Task: `styles`.
  *
  * Compiles Sass, Autoprefixes it and Minifies CSS.
  *
  * This task does the following:
  *    1. Gets the source scss file
  *    2. Compiles Sass to CSS
  *    3. Writes Sourcemaps for it
  *    4. Autoprefixes it and generates style.css
  *    5. Renames the CSS file with suffix .min.css
  *    6. Minifies the CSS file and generates style.min.css
  */
 gulp.task( 'styles', function() {
     return gulp
         .src( config.styleSRC )
         .pipe( sourcemaps.init() )
         .pipe(
             sass({
                 errLogToConsole: config.errLogToConsole,
                 outputStyle: config.outputStyle,
                 precision: config.precision
             })
         )
         .on( 'error', sass.logError )
         .pipe( autoprefixer( config.BROWSERS_LIST ) )
         .pipe( filter( '**/*.css' ) ) // Filtering stream to only css files
         .pipe( mmq({ log: true }) ) // Merge Media Queries only for .min.css version.
         .pipe( rename({ suffix: '.min' }) )
         .pipe( minifycss() )
         .pipe( sourcemaps.write( './' ) )
         .pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
         .pipe( gulp.dest( config.styleDestination ) )
         .pipe( notify({ message: 'TASK: "styles" Completed! 💯', onLast: true }) );
 });

 /**
  * Task: `stylesRTL`.
  *
  * Compiles Sass, Autoprefixes it, Generates RTL stylesheet, and Minifies CSS.
  *
  * This task does the following:
  *    1. Gets the source scss file
  *    2. Compiles Sass to CSS
  *    4. Autoprefixes it and generates style.css
  *    5. Renames the CSS file with suffix -rtl and generates style-rtl.css
  *    6. Writes Sourcemaps for style-rtl.css
  *    7. Renames the CSS files with suffix .min.css
  *    8. Minifies the CSS file and generates style-rtl.min.css
  *    9. Injects CSS or reloads the browser via browserSync
  */
 gulp.task( 'stylesRTL', function() {
     return gulp
         .src( config.styleSRC )
         .pipe( sourcemaps.init() )
         .pipe(
             sass({
                 errLogToConsole: config.errLogToConsole,
                 outputStyle: config.outputStyle,
                 precision: config.precision
             })
         )
         .on( 'error', sass.logError )
         .pipe( sourcemaps.write({ includeContent: false }) )
         .pipe( sourcemaps.init({ loadMaps: true }) )
         .pipe( autoprefixer( config.BROWSERS_LIST ) )
         .pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
         .pipe( rename({ suffix: '-rtl' }) ) // Append "-rtl" to the filename.
         .pipe( rtlcss() ) // Convert to RTL.
         .pipe( sourcemaps.write( './' ) ) // Output sourcemap for style-rtl.css
         .pipe( gulp.dest( config.styleDestination ) )
         .pipe( filter( '**/*.css' ) ) // Filtering stream to only css files.
         .pipe( mmq({ log: true }) ) // Merge Media Queries only for .min.css version.
         .pipe( rename({ suffix: '.min' }) )
         .pipe( minifycss({ maxLineLen: 10 }) )
         .pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
         .pipe( gulp.dest( config.styleDestination ) )
         .pipe( filter( '**/*.css' ) ) // Filtering stream to only css files.
         .pipe( notify({ message: 'TASK: "stylesRTL" Completed! 💯', onLast: true }) );
 });

 /**
  * Task: `customJS`.
  *
  * Concatenate and uglify custom JS scripts.
  *
  * This task does the following:
  *     1. Gets the source folder for JS custom files
  *     2. Concatenates all the files and generates custom.js
  *     3. Renames the JS file with suffix .min.js
  *     4. Uglifes/Minifies the JS file and generates custom.min.js
  */
 gulp.task( 'customJS', function() {
     return gulp
         .src( config.jsCustomSRC, { since: gulp.lastRun( 'customJS' ) }) // Only run on changed files.
         .pipe(
             plumber({
                 errorHandler: function( err ) {
                     notify.onError( 'Error: <%= error.message %>' )( err );
                     this.emit( 'end' ); // End stream if error is found
                 }
             })
         )
         .pipe(
             esbuild({

                 // outfile: 'bundle.js',
                 bundle: true,
                 loader: { '.js': 'js' }
             })
         )

         .pipe(
             babel({
                 presets: [
                     [
                         '@babel/preset-env', // Preset to compile your modern JS to ES5.
                         {
                             targets: {browsers: config.BROWSERS_LIST} // Target browser list to support.
                         }
                     ]
                 ]
             })
         )

         .pipe( remember( 'customJS' ) ) // Bring all files back to stream
         .pipe(
             rename( function( path ) {
                 path.basename = path.basename.replace( '.src', '' );
                 return path;
             })
         )
         .pipe( uglify() )
         .pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
         .pipe( gulp.dest( config.jsCustomDestination ) )
         .pipe( notify({ message: 'TASK: "customJS" Completed! 💯', onLast: true }) );
 });

 /**
  * Task: `images`.
  *
  * Minifies PNG, JPEG, GIF and SVG images.
  *
  * This task does the following:
  *     1. Gets the source of images raw folder
  *     2. Minifies PNG, JPEG, GIF and SVG images
  *     3. Generates and saves the optimized images
  *
  * This task will run only once, if you want to run it
  * again, do it with the command `gulp images`.
  *
  * Read the following to change these options.
  * @link https://github.com/sindresorhus/gulp-imagemin
  */
 gulp.task( 'images', function() {
     return gulp
         .src( config.imgSRC )
         .pipe(
             cache(
                 imagemin([
                     imagemin.gifsicle({ interlaced: true }),
                     imagemin.jpegtran({ progressive: true }),
                     imagemin.optipng({ optimizationLevel: 3 }), // 0-7 low-high.
                     imagemin.svgo({
                         plugins: [ { removeViewBox: true }, { cleanupIDs: false } ]
                     })
                 ])
             )
         )
         .pipe( gulp.dest( config.imgDST ) )
         .pipe( notify({ message: 'TASK: "images" Completed! 💯', onLast: true }) );
 });

 gulp.task( 'setup', function() {
     config.filesToMove.forEach( function( file ) {
         if ( ! file.rename ) {
             file.rename = {};
         }
         gulp
             .src( file.src )
             .pipe(

                 rename( file.rename )
             )
             .pipe( gulp.dest( file.dest ) );
     });
     return gulp
         .src( '.' )
         .pipe( notify({ message: 'TASK: "setup" Completed! 💯', onLast: true }) );
 });

 /**
  * Task: `clear-images-cache`.
  *
  * Deletes the images cache. By running the next "images" task,
  * each image will be regenerated.
  */
 gulp.task( 'clearCache', function( done ) {
     return cache.clearAll( done );
 });

 /**
  * Watch Tasks.
  *
  * Watches for file changes and runs specific tasks.
  */
 gulp.task(
     'default',
     gulp.parallel(
         'styles',
         'customJS',
         function watchFiles() {
             gulp.watch( config.styleWatchFiles, gulp.parallel( 'styles' ) ); // Reload on SCSS file changes.
             gulp.watch( config.customJSWatchFiles, gulp.series( 'customJS' ) ); // Reload on customJS file changes.
         }
     )
 );
