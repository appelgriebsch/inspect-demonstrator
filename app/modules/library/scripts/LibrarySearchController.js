(function() {

  'use strict';

  function LibrarySearchController($q, ActivityService, LibraryDataService) {

    this.initialize = function() {
      return ActivityService.initialize();
    };
  }

  module.exports = LibrarySearchController;

})();
