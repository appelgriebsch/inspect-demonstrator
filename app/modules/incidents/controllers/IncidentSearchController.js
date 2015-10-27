(function(angular) {

  'use strict';

  function IncidentSearchController($scope, $state, $q, IncidentDataService) {

    this.items = [];
    this.query = '';

    var _doSearch = () => {

      this.items = [];

      $scope.setBusy('Searching documents...');

      IncidentDataService.search(this.query).then((results) => {

        $q.when(true).then(() => {
          results.rows.forEach((item) => {
            this.items.push(item);
          });
        });

        $scope.setReady(false);

      }).catch((err) => {
        $scope.setError(err);
      });
    };

    this.initialize = function() {
      var init = [IncidentDataService.initialize()];
      return Promise.all(init);
    };

  }

  module.exports = IncidentSearchController;

})(global.angular);
