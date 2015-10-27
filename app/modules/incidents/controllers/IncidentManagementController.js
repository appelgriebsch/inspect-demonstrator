(function(angular) {

  'use strict';

  function IncidentManagementController($scope, $state, $stateParams, $q, IncidentDataService) {

    var docID = $stateParams.doc;
    var terminalTypes = ['NFC', 'Contact'];

    this.document = null;

    this.initialize = function() {
      var init = [IncidentDataService.initialize()];
      Promise.all(init).then(() => {
        if (docID) {
          return IncidentDataService.get(docID);
        } else {
          return {
            terminal: ''
          };
        }
      }).then((result) => {
        console.log(result);
      }).catch((err) => {
        $scope.setError(err);
      });
    };

    this.terminalTypes = function() {
      return terminalTypes;
    };
  }

  module.exports = IncidentManagementController;

})(global.angular);
