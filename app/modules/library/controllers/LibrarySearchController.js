(function() {

  'use strict';

  function LibrarySearchController($scope, $state, $q, $mdDialog, DocumentSharingService, LibraryDataService) {

    this.items = [];
    this.query = '';

    var _doSearch = () => {

      $scope.setBusy('Searching documents...');

      LibraryDataService.search(this.query).then((results) => {

        $q.when(true).then(() => {
          results.rows.forEach((item) => {
            if (Array.isArray(item.doc.author)) {
              item.doc.author = item.doc.author.join(', ');
            }
            this.items.push(item.doc);
          });
        });

        $scope.setReady(false);

      }).catch((err) => {
        $scope.setError(err);
      });
    };

    this.initialize = function() {

      var init = [LibraryDataService.initialize()];
      return Promise.all(init);
    };

    this.search = (evt) => {

      if ((evt.keyCode) && (evt.keyCode == 13)) {
        $q.when(true).then(() => {
          _doSearch();
        });
      } else if ((evt.type) && (evt.type === 'click')) {
        $q.when(true).then(() => {
          _doSearch();
        });
      }
    };
  }

  module.exports = LibrarySearchController;

})();
