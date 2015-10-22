(function() {

  'use strict';

  function LibrarySearchController($scope, $state, $q, LibraryDataService) {

    this.initialize = function() {

      var init = [LibraryDataService.initialize()];
      return Promise.all(init);
    };
  }

  module.exports = LibrarySearchController;

})();
