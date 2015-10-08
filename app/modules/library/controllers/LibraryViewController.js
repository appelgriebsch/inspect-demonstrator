(function() {

  'use strict';

  function LibraryViewController($scope, $state, $q, LibraryDataService) {

    this.items = [];

    this.initialize = function() {

      $q.when(LibraryDataService.initialize())
        .then(
          $q.when(LibraryDataService.library())
          .then((result) => {
            result.rows.map((item) => {
              console.log(item.doc);
              this.items.push(item.doc);
            });
          })
        );
    };
  }

  module.exports = LibraryViewController;

})();
