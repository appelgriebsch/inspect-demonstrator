(function(angular) {

  'use strict';

  function IncidentManagementController($scope, $state, $stateParams, $q, IncidentDataService) {

    var docID = $stateParams.doc;

    this.document = null;

    this.initialize = function() {
      var init = [IncidentDataService.initialize()];
      Promise.all(init).then(() => {
        console.log(docID);
        if (docID) {
          return IncidentDataService.get(docID);
        } else {
          return $q.when(true);
        }
      }).then((result) => {
        console.log(result);
      }).catch((err) => {
        $scope.setError(err);
      });
    };
  }

  module.exports = IncidentManagementController;

})(global.angular);
