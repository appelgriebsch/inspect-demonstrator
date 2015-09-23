(function() {

  'use strict';

  function LibraryModule() {

    this.initialize = function() {

      angular.module('inspectApp')
        .config(function($stateProvider, $urlRouterProvider) {

          $stateProvider
            .state('app.library', {
              url: '/library',
              views: {
                'module': {
                  templateUrl: './modules/library/library.html'
                }
              }
            })
            .state('app.library.view', {
              url: '/view',
              views: {
                'content': {
                  templateUrl: './modules/library/templates/library.view.html',
                  controller: 'LibraryViewController as ctl'
                },
                'actions@app': {
                  templateUrl: './modules/library/templates/library.actions.html'
                }
              }
            })
            .state('app.library.upload', {
              url: '/upload',
              views: {
                'content': {
                  templateUrl: './modules/library/templates/library.upload.html',
                  controller: 'LibraryUploadController as ctl'
                },
                'actions@app': {
                  templateUrl: './templates/shell.submit.html'
                }
              }
            })
            .state('app.library.capture', {
              url: '/capture',
              views: {
                'content': {
                  templateUrl: './modules/library/templates/library.capture.html',
                  controller: 'LibraryCaptureController as ctl'
                },
                'actions@app': {
                  templateUrl: './templates/shell.submit.html'
                }
              }
            })
            .state('app.library.search', {
              url: '/search',
              views: {
                'content': {
                  templateUrl: './modules/library/templates/library.search.html',
                  controller: 'LibrarySearchController as ctl'
                }
              }
            });

        });

      var FileSystemService = require('./scripts/FileSystemService');
      var FileUploadService = require('./scripts/FileUploadService');
      var LibraryDataService = require('./scripts/LibraryDataService');

      var LibraryCaptureController = require('./scripts/LibraryCaptureController');
      var LibrarySearchController = require('./scripts/LibrarySearchController');
      var LibraryUploadController = require('./scripts/LibraryUploadController');
      var LibraryViewController = require('./scripts/LibraryViewController');

      angular.module('inspectApp').service('FileSystemService', ['$q', FileSystemService]);
      angular.module('inspectApp').service('FileUploadService', ['$q', 'PouchDBService', FileUploadService]);
      angular.module('inspectApp').service('LibraryDataService', ['PouchDBService', LibraryDataService]);

      angular.module('inspectApp').controller('LibraryCaptureController', ['$q', 'ActivityService', 'LibraryDataService', LibraryCaptureController]);
      angular.module('inspectApp').controller('LibrarySearchController', ['$q', 'ActivityService', 'LibraryDataService', LibrarySearchController]);
      angular.module('inspectApp').controller('LibraryUploadController', ['$scope', '$q', 'ActivityService', 'FileSystemService', 'FileUploadService', LibraryUploadController]);
      angular.module('inspectApp').controller('LibraryViewController', ['$q', 'LibraryDataService', LibraryViewController]);

    };
  }

  module.exports = LibraryModule;

})();
