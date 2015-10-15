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
              this.items.push(item.doc);
            });
          })
        );
    };

    this.selectItem = function(item) {

      var idx = this.items.indexOf(item);
      if (idx === -1) return;

      $q.when(true).then(() => {
        item.isSelected = !item.isSelected;
        this.items[idx] = item;
      });
    };
  }

  module.exports = LibraryViewController;

})();
