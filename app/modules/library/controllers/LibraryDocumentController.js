(function() {

  'use strict';

  function LibraryDocumentController($scope, $state, $stateParams, $q, $mdDialog, ActivityService, LibraryDataService) {

    var nativeImage = require('native-image');
    var docID = $stateParams.doc;

    this.document;
    this.sidebarOpened = false;

    this.initialize = function() {
      $q.when(LibraryDataService.initialize())
        .then(() => {
          $q.when(LibraryDataService.item(docID))
          .then((result) => {
            if (result._attachments) {
              result.image = nativeImage.createFromBuffer(result._attachments[result.canonicalID].data);
            }
            result.custom_tags = [];
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

    this.runAction = function() {
      angular.element(document.querySelector('.pagePreview')).removeClass('zoom-in-activated');
      angular.element(document.querySelector('.pagePreview')).removeClass('zoom-out-activated');
    };

    $scope.$on('zoom-in', (event, args) => {
      angular.element(document.querySelector('.pagePreview')).addClass('zoom-in-activated');
    });

    $scope.$on('zoom-out', (event, args) => {
      angular.element(document.querySelector('.pagePreview')).addClass('zoom-out-activated');
    });

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
          ActivityService.addWarning(info).then(() =>{
            $state.go('^.view');
          });
        });
      });
    });
  }

  module.exports = LibraryDocumentController;

})();
