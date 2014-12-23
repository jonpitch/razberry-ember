module.exports = function (grunt) {

	// load tasks
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-ember-templates');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-string-replace');

	// init
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		// combine ember templates into Em.TEMPLATES
		emberTemplates: {
			compile: {
				options: {
					templateBasePath: 'public/scripts/templates/',
					templateName: function (sourceFile) {
						return sourceFile.substr(sourceFile.indexOf('/') + 1, sourceFile.length);
					}
				},
				files: {
					'public/scripts/templates/templates.js': ['public/scripts/templates/**/*.{hbs, handlebars}']
				}
			}
		},

		// concatenate files together
		concat: {
			ember: {
				src: ['public/scripts/application/*.js',
				      'public/scripts/routes/application/routes.js',
				      'public/scripts/routes/**/*.js',
				      'public/scripts/models/*.js',
				      'public/scripts/controllers/**/*.js',
				      'public/scripts/views/**/*.js',
				      'public/scripts/components/**/*.js',
				      'public/scripts/templates/templates.js'],
				dest: 'public/scripts/app.js'
			},
			bower: {
				src: ['public/bower_components/jquery/dist/jquery.js',
				      'public/bower_components/bootstrap/dist/js/bootstrap.js',
				      'public/bower_components/handlebars/handlebars.js',
				      'public/bower_components/ember/ember.js',
				      'public/bower_components/ember-data/ember-data.js',
				      'public/bower_components/html5shiv/dist/html5shiv.js',
				      'public/bower_components/bower_components/modernizr/modernizr.js',
				      'public/bower_components/moment/moment.js',
				      'public/bower_components/seiyria-bootstrap-slider/dist/bootstrap-slider.min.js'],
				dest: 'public/bower_components/app.includes.js'
			}
		},

		// combine css files
		cssmin: {
			combine: {
				options: {
					root: './public'
				},
				files: {
					'public/styles/app.css': ['public/bower_components/bootstrap/dist/css/bootstrap.css',
					                          'public/bower_components/bootstrap/dist/css/bootstrap-theme.css',
					                          'public/bower_components/seiyria-bootstrap-slider/dist/css/bootstrap-slider.min.css',
					                          'public/styles/razberry.css']
				}
			},
			minify: {
				expand: true,
				cwd: 'public/styles',
				src: ['*.css', '!*.min.css'],
				dest: 'public/styles',
				ext: '.min.css'
			}
		},

		// lint JavaScript files
		jshint: {
			files: ['Gruntfile.js',
			        'public/scripts/controllers/**/*.js',
			        'public/scripts/models/**/*.js',
			        'public/scripts/routes/**/*.js',
			        'public/scripts/views/**/*.js',
			        'public/scripts/components/**/*.js',
			        'public/scripts/application/*.js'],
			options: {
				globals: {
					jQuery: true,
					console: true,
					module: true,
				}
			}
		},

		// minify javascript
		uglify: {
			options: {

			},
			release: {
				files: {
					'public/scripts/app.min.js': ['<%= concat.ember.dest %>'],
					'public/bower_components/app.includes.min.js': ['<%= concat.bower.dest %>']
				}
			}
		},

		// perform any string replace operations.
		// swap out urls, change files to their minified versions, etc.
		'string-replace': {
			release: {
				files: {
					'public/index.html': 'public/index.html'
				},
				options: {
					replacements: [{
						pattern: '/scripts/app.js',
						replacement: '/scripts/app.min.js'
					}, {
						pattern: '/bower_components/app.includes.js',
						replacement: '/bower_components/app.includes.min.js',
					}, {
						pattern: '/styles/app.css',
						replacement: '/styles/app.min.css'
					}]
				}
			}
		},

		// watch for changes
		watch: {
			emberTemplates: {
				files: 'public/scripts/templates/**/*.{hbs, handlebars}',
				tasks: ['emberTemplates']
			},
			app: {
				files: ['public/index.html', 'public/scripts/**/*.js'],
				spawn: false,
				tasks: ['jshint', 'concat', 'cssmin']
			}
		}
	});

	// the local development build task
	grunt.registerTask('default', ['emberTemplates',
	                               'concat',
	                               'jshint',
	                               'cssmin']);

	// the release build task
	grunt.registerTask('release', ['emberTemplates',
	                               'concat',
	                               'jshint',
	                               'uglify',
	                               'cssmin',
	                               'string-replace:release']);
};