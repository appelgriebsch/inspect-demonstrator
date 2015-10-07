(function() {

  'use strict';

  function LibraryDocumentController($stateParams, $q, ActivityService, LibraryDataService) {

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
            this.document = result;
          })
        });
    };
  }

  module.exports = LibraryDocumentController;

})();
