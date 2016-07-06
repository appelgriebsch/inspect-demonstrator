/*jshint esversion: 6 */
(function(angular) {

  'use strict';

  /**
   * Controls the Add/Edit instance form
   * @param $scope
   * @param $state
   * @param $q
   * @param $location
   * @param CasesDataService
   * @constructor
   */
  function CasesViewController($scope, $state, $q, $location, CasesDataService) {
    this.state = $state.$current;

    $scope.moveToAddCase =  () => {
      $location.path("/app/cases/edit");
    };

    this.initialize = function() {
      /*$scope.setBusy('Loading ontology data...');

      var init = [CasesDataService.initialize(), CasesDataService.loadClasses(), CasesDataService.findInstances()];
      Promise.all(init).then((result) => {
        $scope.data.classes = result[1];

        $scope.data.instances = [];
        result[2].forEach((entry) => {
          entry.label = entry.subject.replace(ontologyUri, "");
          $scope.data.instances.push(entry);
        });
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });*/
    };
  }


  module.exports = CasesViewController;

})(global.angular);
