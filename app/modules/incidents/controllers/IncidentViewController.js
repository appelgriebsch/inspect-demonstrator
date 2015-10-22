(function() {

  'use strict';

  function IncidentViewController($scope, $state, $q, IncidentDataService) {

    this.initialize = function() {
      var init = [IncidentDataService.initialize()];
      return Promise.all(init);
    };
  }

  module.exports = IncidentViewController;

})();
