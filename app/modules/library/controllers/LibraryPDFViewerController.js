(function(angular, PDFJS) {

  'use strict';

  function LibraryPDFViewerController($scope, $state, $stateParams, $q, $mdDialog, DocumentSharingService, LibraryDataService) {

    var docID = $stateParams.doc;

    this.document;
    this.sidebarOpened = false;

    this.initialize = function() {

      var init = [LibraryDataService.initialize()];
      var pdfData;

      $scope.setBusy('Loading Document...');

      Promise.all(init).then(() => {
        return LibraryDataService.item(docID);
      }).then((result) => {

        $q.when(true).then(() => {

          this.document = result;

          if (result._attachments) {
            pdfData = result._attachments[result.meta.name].data;
          }

          var container = document.getElementById('pdfViewerContainer');

          // (Optionally) enable hyperlinks within PDF files.
          var pdfLinkService = new PDFJS.PDFLinkService();

          var pdfViewer = new PDFJS.PDFViewer({
            container: container,
            linkService: pdfLinkService,
            // We can enable text/annotations layers, if needed
            textLayerFactory: new PDFJS.DefaultTextLayerFactory(),
            annotationsLayerFactory: new PDFJS.DefaultAnnotationsLayerFactory()
          });

          pdfLinkService.setViewer(pdfViewer);

          container.addEventListener('pagesinit', function() {
            // We can use pdfViewer now, e.g. let's change default scale.
            pdfViewer.currentScaleValue = 'page-width';
          });

          // Loading document.
          PDFJS.getDocument({
            data: pdfData
          }).then(function(pdfDocument) {
            // Document loaded, specifying document for the viewer and
            // the (optional) linkService.
            pdfViewer.setDocument(pdfDocument);
            pdfLinkService.setDocument(pdfDocument, null);

          }).catch((err) => {
            $scope.setError('ReceiveAction', 'insert_drive_file', err);
            $scope.setReady(true);
          });

          result.tags = result.tags || result.meta.keywords.split(/\s*,\s*/);
          result.custom_tags = result.custom_tags || [];
          result.annotations = result.annotations || [];
          result.outline = result.outline || [];

          $scope.setReady(false);
        });
      }).catch((err) => {
        $scope.setError('ReceiveAction', 'insert_drive_file', err);
        $scope.setReady(true);
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
        .content(this.document.meta.headline)
        .targetEvent(args)
        .ok('Yes, delete it')
        .cancel('No, please keep it');
      $mdDialog.show(confirm).then(() => {

        LibraryDataService.delete(this.document).then(() => {

          var info = $scope.createEventFromTemplate('DeleteAction', 'delete');
          info.description = `Document <i>${this.document.meta.name}</i> has been deleted.`;
          info.object = this.document.meta;
          delete info.result;

          $scope.writeLog('warning', info).then(() => {
            $scope.notify('Document deleted successfully', info.description);
            this.document = null;
            $scope.setReady(true);
            $state.go('^.view');
          });
        }).catch((err) => {
          $scope.setError('DeleteAction', 'delete', err);
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
          $scope.setError('SendAction', 'share', err);
          $scope.setReady(true);
        });
      }
    });
  }

  module.exports = LibraryPDFViewerController;

})(global.angular, global.PDFJS);
