(function() {

  'use strict';

  function LibraryPDFViewerController($scope, $state, $stateParams, $q, $mdDialog, ActivityService, LibraryDataService) {

    var docID = $stateParams.doc;

    this.document;
    this.pdfData;
    this.sidebarOpened = false;

    this.initialize = function() {

      $q.when(LibraryDataService.initialize())
        .then(() => {
          $q.when(LibraryDataService.item(docID))
            .then((result) => {

              if (result._attachments) {
                this.pdfData = result._attachments[result.name].data;
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

              container.addEventListener('pagesinit', function () {
              // We can use pdfViewer now, e.g. let's change default scale.
                pdfViewer.currentScaleValue = 'page-width';
              });

              // Loading document.
              PDFJS.getDocument({ data: this.pdfData }).then(function (pdfDocument) {
                // Document loaded, specifying document for the viewer and
                // the (optional) linkService.
                pdfViewer.setDocument(pdfDocument);
                pdfLinkService.setDocument(pdfDocument, null);
              });

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

  module.exports = LibraryPDFViewerController;

})();
