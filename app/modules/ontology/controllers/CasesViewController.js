(function() {

  'use strict';

  function CasesViewController($scope, $state, CaseOntologyDataService) {
    const app = require('electron').remote.app;
    const sysCfg = app.sysConfig();
    const vm = this;
    vm.state = $state.$current;

    vm.cases = [];
    vm.filteredCases = [];

    vm.showCaseStatus = 'open'; // open, closed
    vm.showCaseCreator = 'own'; // own, all

    vm.newCase =  () => {
      $scope.setBusy('Creating new case..');
      const identifier = 'Fall_' + new Date().getTime();
      CaseOntologyDataService.createCase(identifier).then(() => {
        $state.go('app.ontology.case', {caseId: identifier});
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('AddAction', 'mode_edit', err);
        $scope.setReady(true);
      });
    };

    $scope.openCase =  (caseId) => {
      $state.go('app.ontology.case', {caseId: caseId});
    };


    $scope.$on('show-ontology', () => {
      $state.go('app.ontology.view');
    });

    vm.filter = () => {
      $scope.setBusy('Filtering...');
      vm.filteredCases = vm.cases.filter((c) => {
        if (vm.showCaseCreator === 'own') {
          if ((c.metaData.status === vm.showCaseStatus) && (c.metaData.createdBy === sysCfg.user)) {
            return true;
          }
        } else {
          if ((c.metaData.status === vm.showCaseStatus)) {
            return true;
          }
        }
        return false;
      });
      $scope.setReady(true);
    };

    vm.$onInit = () => {
      $scope.setBusy('Loading case data...');

      CaseOntologyDataService.initialize()
        .then(CaseOntologyDataService.loadCaseList)
        .then((result) => {
          vm.cases = result;
          vm.filter();
          $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

  }
  module.exports = CasesViewController;

})();
