(function() {

  'use strict';

  function LibraryViewController($q, LibraryDataService) {

    this.items = [];

    this.initialize = function() {

      $q.when(LibraryDataService.initialize())
        .then(
          $q.when(LibraryDataService.books())
          .then((result) => {
            result.rows.map((item) => {
              this.items.push(item.doc);
            });
          })
        );
    };
  }

  module.exports = LibraryViewController;

})();