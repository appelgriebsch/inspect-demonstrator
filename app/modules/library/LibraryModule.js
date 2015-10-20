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
                templateUrl: `${moduleConfig.path}/views/library.view.actions.html`
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
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/library.search.actions.html`
              }
            }
          })
          .state(`${moduleConfig.state}.webview`, {
            url: '/webview/:doc',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/library.webViewer.html`,
                controller: 'LibraryWebViewerController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/library.webViewer.actions.html`
              }
            }
          })
          .state(`${moduleConfig.state}.pdfview`, {
            url: '/pdfview/:doc',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/library.pdfViewer.html`,
                controller: 'LibraryPDFViewerController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/library.pdfViewer.actions.html`
              }
            }
          });
      });

    var DocumentSharingService = require('./services/DocumentSharingService');
    var FileUploadService = require('./services/FileUploadService');
    var LibraryDataService = require('./services/LibraryDataService');

    var LibraryCaptureController = require('./controllers/LibraryCaptureController');
    var LibraryPDFViewerController = require('./controllers/LibraryPDFViewerController');
    var LibrarySearchController = require('./controllers/LibrarySearchController');
    var LibraryUploadController = require('./controllers/LibraryUploadController');
    var LibraryViewController = require('./controllers/LibraryViewController');
    var LibraryWebViewerController = require('./controllers/LibraryWebViewerController');

    angular.module('inspectApp').service('DocumentSharingService', [DocumentSharingService]);
    angular.module('inspectApp').service('FileUploadService', ['$q', 'PouchDBService', FileUploadService]);
    angular.module('inspectApp').service('LibraryDataService', ['PouchDBService', LibraryDataService]);

    angular.module('inspectApp').controller('LibraryCaptureController', ['$scope', '$state', '$q', '$notification', 'ActivityService', 'PouchDBService', LibraryCaptureController]);
    angular.module('inspectApp').controller('LibraryPDFViewerController', ['$scope', '$state', '$stateParams', '$q', '$mdDialog', 'ActivityService', 'LibraryDataService', 'DocumentSharingService', LibraryPDFViewerController]);
    angular.module('inspectApp').controller('LibrarySearchController', ['$scope', '$state', '$q', 'ActivityService', 'LibraryDataService', LibrarySearchController]);
    angular.module('inspectApp').controller('LibraryUploadController', ['$scope', '$state', '$q', '$http', '$notification', 'ActivityService', 'FileUploadService', LibraryUploadController]);
    angular.module('inspectApp').controller('LibraryViewController', ['$scope', '$state', '$q', 'LibraryDataService', 'DocumentSharingService', 'ActivityService', LibraryViewController]);
    angular.module('inspectApp').controller('LibraryWebViewerController', ['$scope', '$state', '$stateParams', '$q', '$mdDialog', 'ActivityService', 'LibraryDataService', 'DocumentSharingService', LibraryWebViewerController]);
  }

  module.exports = LibraryModule;

})();
