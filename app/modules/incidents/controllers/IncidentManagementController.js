(function(angular) {

  'use strict';

  function IncidentManagementController($scope, $state, $stateParams, $q, IncidentDataService) {

    var docID = $stateParams.doc;
    var terminalTypes = ['NFC', 'Contact'];
    var usageTypes = ['EMV', 'Magnetic Stripe'];
    var verificationTypes = ['PIN (plain)', 'PIN (encr.)', 'Signature', 'No CVM'];

    this.document = null;
    this.connectivity = false;

    this.initialize = function() {
      var init = [IncidentDataService.initialize()];
      Promise.all(init).then(() => {
        if (docID) {
          return IncidentDataService.get(docID);
        }
      }).then((result) => {
        console.log(result);
        this.document = result.rows[0].doc;
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

    this.verificationTypes = function() {
      return verificationTypes;
    };

    this.toggleConnectivity = () => {
      $q.when(true).then(() => {
        this.document.connectivity = (this.connectivity ? 'online' : 'offline');
      });
    };

    $scope.$on('submit', (event, args) => {
      
      $scope.setBusy('Saving incident data...');

    });

    $scope.$on('cancel', (event, args) => {
      $q.when(true).then(() => {
        this.document = null;
        $scope.setReady(false);
        $state.go('^.view');
      });
    });
  }

  module.exports = IncidentManagementController;

})(global.angular);
