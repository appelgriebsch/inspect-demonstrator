(function(angular) {

  'use strict';

  function IncidentManagementController($scope, $state, $stateParams, $q, IncidentDataService) {

    var uuid = require('uuid').v1();
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
        } else {
          return {
            title: '',
            terminal: '',
            connectivity: 'offline',
            usage: '',
            customerVerification: ''
          };
        }
      }).then((result) => {
        $q.when(true).then(() => {
          if (result.rows) {
            this.document = result.rows[0].doc;
          } else {
            this.document = result;
          }
        });
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

    this.enableSave = function() {
      $scope.setReady(true);
    };

    $scope.$on('submit', (event, args) => {

      $scope.setBusy('Saving incident data...');

      this.document._id = uuid;

      IncidentDataService.save(this.document).then((result) => {
        console.log(result);
        $scope.setReady(false);
        $state.go('^.view');
      });
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
