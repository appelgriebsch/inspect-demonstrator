(function(angular) {

  'use strict';

  function IncidentManagementController($scope, $state, $q, IncidentDataService) {

    this.initialize = function() {
      var init = [IncidentDataService.initialize()];
      return Promise.all(init);
    }
    
  }

  module.exports = IncidentManagementController;

})(global.angular);
