(function(angular) {

  'use strict';

  function LibraryWebViewerController($scope, $state, $stateParams, $q, $mdDialog, DocumentSharingService, LibraryDataService) {

    var uuid = require('uuid').v1();
    var webViewer = document.getElementById('viewer');
    var docID = $stateParams.doc;

    this.document;
    this.sidebarOpened = false;

    this.initialize = function() {

      var ps = [LibraryDataService.initialize()];

      $scope.setBusy('Loading Web Site...');

      Promise.all(ps).then(() => {
        return LibraryDataService.item(docID);
      }).then((result) => {
        var archive = result._attachments[result.meta.name] || undefined;
        if (archive) {
          var fileName = DocumentSharingService.requestTemporaryFile(result.meta.name, archive);
          webViewer.src = `file://${fileName}`;
        }
        result.tags = result.meta.keywords.split(/\s*,\s*/);
        result.custom_tags = result.custom_tags || [];
        result.annotations = result.annotations || [];
        this.document = result;
        $scope.setReady(false);
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

    this.getUniqueId = function() {
      return uuid;
    };

    $scope.$on('remove-document', (event, args) => {

      var confirm = $mdDialog.confirm()
        .title('Would you like to delete this document?')
        .content(this.document.meta.headline)
        .targetEvent(args)
        .ok('Yes, delete it')
        .cancel('No, please keep it');

      $mdDialog.show(confirm).then(() => {

        LibraryDataService.delete(this.document).then(() => {

          var info = angular.copy(this.document);
          info.type = 'delete';
          info.status = 'deleted';
          info.icon = 'delete';
          info.description = `Document <i>${info.title}</i> has been deleted.`;

          delete info._attachments;
          delete info.preview;

          $scope.writeLog('warning', info).then(() => {
            $scope.notify('Document deleted successfully', info.description);
            $state.go('^.view');
          });

        }).catch((err) => {
          $scope.setError('Remove Document', 'delete', err);
          $scope.setReady(true);
        });
      });
    });

    $scope.$on('export-document', (event, args) => {

      var targetPath = DocumentSharingService.requestFolder();

      if (targetPath !== undefined) {

        $scope.setBusy('Exporting Document...');

        DocumentSharingService.export([this.document], targetPath).then((result) => {

          var info = angular.copy(this.document);
          info.icon = 'share';
          info.type = 'export';
          info.description = `Document <i>${info.title}</i> exported successfully.`;

          delete info._attachments;
          delete info.preview;

          angular.merge(info, result);

          $scope.writeLog('info', info).then(() => {
            $scope.notify('Document exported successfully', info.description);
            $scope.setReady(false);
          });
        }).catch((err) => {
          $scope.setError('Export Document', 'share', err);
          $scope.setReady(true);
        });
      }
    });
  }

  module.exports = LibraryWebViewerController;

})(global.angular);
