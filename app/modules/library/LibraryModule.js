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
                templateUrl: `${moduleConfig.path}/views/library.view.html`,
                controller: 'LibraryViewController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/library.actions.html`
              }
            }
          })
          .state(`${moduleConfig.state}.upload`, {
            url: '/upload',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/library.upload.html`,
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
                templateUrl: `${moduleConfig.path}/views/library.capture.html`,
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
                templateUrl: `${moduleConfig.path}/views/library.search.html`,
                controller: 'LibrarySearchController as ctl'
              }
            }
          });

      });

    var FileSystemService = require('./services/FileSystemService');
    var FileUploadService = require('./services/FileUploadService');
    var LibraryDataService = require('./services/LibraryDataService');

    var LibraryCaptureController = require('./controllers/LibraryCaptureController');
    var LibrarySearchController = require('./controllers/LibrarySearchController');
    var LibraryUploadController = require('./controllers/LibraryUploadController');
    var LibraryViewController = require('./controllers/LibraryViewController');

    angular.module('inspectApp').service('FileSystemService', ['$q', FileSystemService]);
    angular.module('inspectApp').service('FileUploadService', ['$q', 'PouchDBService', FileUploadService]);
    angular.module('inspectApp').service('LibraryDataService', ['PouchDBService', LibraryDataService]);

    angular.module('inspectApp').controller('LibraryCaptureController', ['$rootScope', '$state', '$q', '$notification', 'ActivityService', 'PouchDBService', LibraryCaptureController]);
    angular.module('inspectApp').controller('LibrarySearchController', ['$q', 'ActivityService', 'LibraryDataService', LibrarySearchController]);
    angular.module('inspectApp').controller('LibraryUploadController', ['$rootScope', '$state', '$q', '$notification', 'ActivityService', 'FileSystemService', 'FileUploadService', LibraryUploadController]);
    angular.module('inspectApp').controller('LibraryViewController', ['$q', 'LibraryDataService', LibraryViewController]);

  }

  module.exports = LibraryModule;

})();
