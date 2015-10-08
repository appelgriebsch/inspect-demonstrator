(function() {

  'use strict';

  function LibrarySearchController($scope, $state, $q, ActivityService, LibraryDataService) {

    this.initialize = function() {
      return ActivityService.initialize();
    };
  }

  module.exports = LibrarySearchController;

})();
