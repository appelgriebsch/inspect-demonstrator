(function() {

  'use strict';

  function LibraryDocumentController($scope, $state, $stateParams, $q, $mdDialog, ActivityService, LibraryDataService) {

    var nativeImage = require('native-image');
    var docID = $stateParams.doc;

    this.document;

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
