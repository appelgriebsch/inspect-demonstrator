(function() {

  'use strict';

  function CasesViewController($scope, $state, $log, CaseOntologyDataService) {
    const app = require('electron').remote.app;
    const sysCfg = app.sysConfig();

    this.state = $state.$current;
    $scope.data = {
      cases: [],
      filteredCases: []
    };
    $scope.viewData = {
      showCaseStatus: 'open', // open, closed
      showCaseCreator: 'own' // own, all
    };

    $scope.newCase =  () => {
      $scope.setBusy('Initializing Case..');
      const identifier = 'Fall ' + new Date().getTime();
      CaseOntologyDataService.createCase(identifier).then(() => {
        $state.go('app.cases.edit', {caseId: identifier});
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

    $scope.openCase =  (caseId) => {
      $state.go('app.cases.edit', {caseId: caseId});
    };

    $scope.filter = () => {
      $scope.setBusy('Filtering...');
      $scope.data.filteredCases = $scope.data.cases.filter((c) => {
        if ($scope.viewData.showCaseCreator === 'own') {
          if ((c.status === $scope.viewData.showCaseStatus) && (c.createdBy === sysCfg.user)) {
            return true;
          }
        } else {
          if ((c.status === $scope.viewData.showCaseStatus)) {
            return true;
          }
        }
        return false;
      });
      $scope.setReady(true);
    };

    this.initialize = () => {
      $scope.setBusy('Initializing...');
      CaseOntologyDataService.initialize().then(() => {
        $scope.data.cases = [];
        return CaseOntologyDataService.loadCasesOverview();
      }).then((cases) => {
        $scope.data.cases = cases;
        $log.debug('cases: ', cases);
        $scope.filter();
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };
  }
  module.exports = CasesViewController;

})();
