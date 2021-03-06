(function(angular) {

  'use strict';

  function LibraryModule(config) {

    var moduleConfig = config;

    angular.module('electron-app')
      .config(function($stateProvider, $urlRouterProvider) {

        $stateProvider
          .state(`${moduleConfig.state}`, {
            url: '/library',
            views: {
              'module': {
                templateUrl: `${moduleConfig.path}/library.html`
              },
              'header@app': {
                template: `${moduleConfig.label}`
              }
            },
            redirectTo: `${moduleConfig.state}.view`
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
          .state(`${moduleConfig.state}.view.itemSelected`, {
            url: '/itemSelected/:doc',
            views: {
              'status@app': {
                templateUrl: `${moduleConfig.path}/views/library.view.status.html`,
                controller: 'LibraryViewStatusController as ctl'
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
                templateUrl: 'shell/views/shell.submit.html'
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
                templateUrl: 'shell/views/shell.submit.html'
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
              'header@app': {
                template: `<a ui-sref="^.view"><md-icon>chevron_left</md-icon>${moduleConfig.label}</a>`
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
              'header@app': {
                template: `<a ui-sref="^.view"><md-icon>chevron_left</md-icon>${moduleConfig.label}</a>`
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/library.pdfViewer.actions.html`
              }
            }
          })
          .state(`${moduleConfig.state}.editmeta`, {
            url: '/editmeta/:doc',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/library.edit.meta.html`,
                controller: 'LibraryEditMetaController as ctl'
              },
              'actions@app': {
                templateUrl: 'shell/views/shell.submit.html'
              }
            }
          });
      });

    var DocumentCaptureService = require('./services/DocumentCaptureService');
    var DocumentSharingService = require('./services/DocumentSharingService');
    var LibraryDataService = require('./services/LibraryDataService');

    var LibraryCaptureController = require('./controllers/LibraryCaptureController');
    var LibraryPDFViewerController = require('./controllers/LibraryPDFViewerController');
    var LibraryUploadController = require('./controllers/LibraryUploadController');
    var LibraryViewController = require('./controllers/LibraryViewController');
    var LibraryViewStatusController = require('./controllers/LibraryViewStatusController');
    var LibraryWebViewerController = require('./controllers/LibraryWebViewerController');
    var LibraryEditMetaController = require('./controllers/LibraryEditMetaController');

    angular.module('electron-app').service('DocumentCaptureService', ['$http', DocumentCaptureService]);
    angular.module('electron-app').service('DocumentSharingService', ['LibraryDataService', DocumentSharingService]);
    angular.module('electron-app').service('LibraryDataService', ['PouchDBService', LibraryDataService]);

    angular.module('electron-app').controller('LibraryCaptureController', ['$scope', '$state', '$q', 'DocumentCaptureService', 'LibraryDataService', LibraryCaptureController]);
    angular.module('electron-app').controller('LibraryUploadController', ['$scope', '$state', '$q', 'DocumentCaptureService', 'LibraryDataService', LibraryUploadController]);

    angular.module('electron-app').controller('LibraryViewController', ['$scope', '$state', '$q', '$mdDialog', 'DocumentSharingService', 'LibraryDataService', LibraryViewController]);
    angular.module('electron-app').controller('LibraryViewStatusController', ['$scope', '$state', '$stateParams', '$q', 'LibraryDataService', LibraryViewStatusController]);

    angular.module('electron-app').controller('LibraryPDFViewerController', ['$scope', '$state', '$stateParams', '$q', '$mdDialog', 'DocumentSharingService', 'LibraryDataService', LibraryPDFViewerController]);
    angular.module('electron-app').controller('LibraryWebViewerController', ['$scope', '$state', '$stateParams', '$q', '$mdDialog', 'DocumentSharingService', 'LibraryDataService', LibraryWebViewerController]);
    angular.module('electron-app').controller('LibraryEditMetaController', ['$scope', '$state', '$stateParams', '$q', 'LibraryDataService', LibraryEditMetaController]);
  }

  module.exports = LibraryModule;

})(global.angular);
