(function() {

  'use strict';

  function LibraryWebViewerController($scope, $state, $stateParams, $q, $mdDialog, ActivityService, LibraryDataService) {

    var fs = require('original-fs');
    var path = require('path');
    var remote = require('remote');
    var app = remote.require('app');

    var webViewer = document.getElementById('viewer');
    var docID = $stateParams.doc;
    var webarchive;

    this.document;
    this.action;
    this.sidebarOpened = false;

    this.initialize = function() {
      
      $q.when(LibraryDataService.initialize())
        .then(() => {
          $q.when(LibraryDataService.item(docID))
            .then((result) => {

              if (result._attachments) {
                var asarArchive = result._attachments['archive'].data;
                webarchive = path.join(app.getPath('temp'), result.canonicalID + '.asar');
                fs.writeFileSync(webarchive, asarArchive);
                webViewer.src = 'file://' + webarchive + '/index.html';
              }

              result.custom_tags = result.custom_tags || [];
              result.annotations = result.annotations || [];
              this.document = result;
            });
        });
    };

    this.openSidebar = function() {
      $q.when(true).then(() => {
        angular.element(document.querySelector('.sidebar')).addClass('sidebar-open');
        this.sidebarOpened = true;
      });
    };

    this.closeSidebar = function() {
      $q.when(true).then(() => {
        angular.element(document.querySelector('.sidebar')).removeClass('sidebar-open');
        this.sidebarOpened = false;
      });
    };

    $scope.$on('remove-document', (event, args) => {

      var confirm = $mdDialog.confirm()
        .title('Would you like to delete this document?')
        .content(this.document.title)
        .targetEvent(args)
        .ok('Yes, delete it')
        .cancel('No, please keep it');
      $mdDialog.show(confirm).then(() => {
        LibraryDataService.delete(this.document).then(() => {

          var details = angular.copy(this.document);
          details.status = 'deleted';
          delete details._attachments;
          delete details.preview;

          var info = {
            type: 'delete',
            id: details._id,
            details: details
          };
          ActivityService.addWarning(info).then(() => {
            $state.go('^.view');
          });
        });
      });
    });
  }

  module.exports = LibraryWebViewerController;

})();
