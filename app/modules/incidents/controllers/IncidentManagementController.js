(function(angular) {

  'use strict';

  function IncidentManagementController($scope, $state, $stateParams, $q, IncidentDataService) {

    var docID = $stateParams.doc;
    var terminalTypes = ['NFC', 'Contact'];
    var usageTypes = ['EMV', 'Magnetic Stripe'];

    this.document = null;
    this.connectivity = false;

    this.initialize = function() {
      var init = [IncidentDataService.initialize()];
      Promise.all(init).then(() => {
        if (docID) {
          return IncidentDataService.get(docID);
        } else {
          return {
            terminal: '',
            connectivity: 'offline',
            usage: ''
          };
        }
      }).then((result) => {
        console.log(result);
        this.document = result;
      }).catch((err) => {
        $scope.setError(err);
      });
    };

    this.terminalTypes = function() {
      return terminalTypes;
    };

    this.usageTypes = function() {
      return usageTypes;
    };

    this.toggleConnectivity = () => {
      $q.when(true).then(() => {
        this.document.connectivity = (this.connectivity ? 'online' : 'offline');
      });
    };
  }

  module.exports = IncidentManagementController;

})(global.angular);
