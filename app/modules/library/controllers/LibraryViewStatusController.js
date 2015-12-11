(function(angular) {

  'use strict';

  function LibraryViewStatusController($scope, $state, $stateParams, $q, LibraryDataService) {

    var docID = $stateParams.doc;

    this.document;

    this.initialize = function() {

      var ps = [LibraryDataService.initialize()];

      Promise.all(ps).then(() => {
        return LibraryDataService.itemMeta(docID);
      }).then((result) => {

        result.datePublished = result.meta.datePublished ? new Date(result.meta.datePublished) : null,
        result.tags = result.tags || result.meta.keywords.split(/\s*,\s*/);
        result.annotations = result.annotations || [];

        $q.when(true).then(() => {
          this.document = result;
        });
      });
    };
  }

  module.exports = LibraryViewStatusController;

})(global.angular);
