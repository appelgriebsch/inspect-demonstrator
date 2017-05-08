(function() {

  'use strict';

  function CasesViewController($scope, $state, CaseOntologyDataService, OntologySharingService, GraphDataService) {
    const app = require('electron').remote.app;
    const sysCfg = app.sysConfig();
    const vm = this;
    vm.state = $state.$current;

    vm.cases = [];
    vm.filteredCases = [];

    vm.showCaseStatus = 'open'; // open, closed
    vm.showCaseCreator = 'own'; // own, all


    vm.newCase =  () => {
      $scope.setBusy('Initializing Case..');
      const identifier = 'Fall_' + new Date().getTime();
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

    $scope.$on('import-ontology', () => {
      var targetPath = OntologySharingService.requestOpenFile();
      if ((targetPath !== undefined) && (targetPath.length > 0)) {

        $scope.setBusy('Importing ontology...');
        OntologySharingService.import(targetPath[0]).then(() => {
          var info = $scope.createEventFromTemplate('ReceiveAction', 'import_export');
          info.description = 'The ontology has been imported successfully.';
          info.object = {};
          info.result = {};
          return $scope.writeLog('info', info);
        }).then(() => {
          CaseOntologyDataService.reset();
          $scope.notify('Import finished successfully', 'The ontology has been imported successfully.');
          this.initialize();
        }).catch((err) => {
          $scope.setError('ReceiveAction', 'import_export', err);
          $scope.setReady(true);
        });

      }
    });

    $scope.$on('export-ontology', () => {

      var targetPath = OntologySharingService.requestSaveFile();

      if (targetPath !== undefined) {

        $scope.setBusy('Exporting ontology...');

        OntologySharingService.export(targetPath).then(() => {

          var info = $scope.createEventFromTemplate('SendAction', 'share');
          info.description = 'The ontology has been exported successfully.';
          info.object = {};
          info.result = {};
          return $scope.writeLog('info', info);
        }).then(() => {
          $scope.notify('Export finished successfully', 'The ontology has been exported successfully.');
          $scope.setReady();
        }).catch((err) => {
          $scope.setError('SendAction', 'share', err);
          $scope.setReady(true);
        });
      }
    });

    vm.filter = () => {
      $scope.setBusy('Filtering...');
      vm.filteredCases = vm.cases.filter((c) => {
        if (vm.showCaseCreator === 'own') {
          if ((c.status === vm.showCaseStatus) && (c.createdBy === sysCfg.user)) {
            return true;
          }
        } else {
          if ((c.status === vm.showCaseStatus)) {
            return true;
          }
        }
        return false;
      });
      console.log(vm.filteredCases);
      $scope.setReady(true);
    };

    vm.$onInit = () => {
      $scope.setBusy('Loading case data...');
      Promise.all([
        CaseOntologyDataService.initialize(),
        GraphDataService.initialize(),
      ]).then((result) => {
        vm.cases = result[0];
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
