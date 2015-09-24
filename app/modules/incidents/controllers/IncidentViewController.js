(function() {

  'use strict';

  function IncidentViewController($state, $q, ActivityService, IncidentDataService) {

    this.initialize = function() {
      return IncidentDataService.initialize();
    };
  }

  module.exports = IncidentViewController;

})();
