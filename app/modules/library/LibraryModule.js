(function() {

  'use strict';

  function LibraryModule(config) {

    var moduleConfig = config;

    angular.module('inspectApp')
      .config(function($stateProvider, $urlRouterProvider) {

        $stateProvider
          .state(`${moduleConfig.state}`, {
            url: '/library',
            views: {
              'module': {
                templateUrl: `${moduleConfig.path}/library.html`
              }
            }
          })
          .state(`${moduleConfig.state}.view`, {
            url: '/view',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/templates/library.view.html`,
                controller: 'LibraryViewController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/templates/library.actions.html`
              }
            }
          })
          .state(`${moduleConfig.state}.upload`, {
            url: '/upload',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/templates/library.upload.html`,
                controller: 'LibraryUploadController as ctl'
              },
              'actions@app': {
                templateUrl: 'templates/shell.submit.html'
              }
            }
          })
          .state(`${moduleConfig.state}.capture`, {
            url: '/capture',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/templates/library.capture.html`,
                controller: 'LibraryCaptureController as ctl'
              },
              'actions@app': {
                templateUrl: 'templates/shell.submit.html'
              }
            }
          })
          .state(`${moduleConfig.state}.search`, {
            url: '/search',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/templates/library.search.html`,
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
    angular.module('inspectApp').controller('LibraryUploadController', ['$rootScope', '$q', 'ActivityService', 'FileSystemService', 'FileUploadService', LibraryUploadController]);
    angular.module('inspectApp').controller('LibraryViewController', ['$q', 'LibraryDataService', LibraryViewController]);

  }

  module.exports = LibraryModule;

})();
