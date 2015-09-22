(function() {

  'use strict';

  angular.module('inspectApp').controller('LibraryController', ['$state', '$log', '$q', 'LibraryService', LibraryController]);

  function LibraryController($state, $log, $q, LibraryService) {

    this.items = [];

    this.initialize = function() {

      $q.when(LibraryService.initialize())
        .then(
          $q.when(LibraryService.books())
          .then((result) => {
            result.rows.map((item) => {
              this.items.push(item.doc);
            });
          })
        );
    };
  }

})();
