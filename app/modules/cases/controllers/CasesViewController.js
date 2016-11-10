(function() {

  'use strict';

  function CasesViewController($scope, $state, $log, CaseOntologyDataService, OntologySharingService) {
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
          return this.initialize();
        }).then(() => {
          $scope.notify('Import finished successfully', 'The ontology has been imported successfully.');
          $scope.setReady();
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
          CaseOntologyDataService.reset();
          return CaseOntologyDataService.initialize();
        }).then(() => {
          $scope.notify('Export finished successfully', 'The ontology has been exported successfully.');
          $scope.setReady();
        }).catch((err) => {
          $scope.setError('SendAction', 'share', err);
          $scope.setReady(true);
        });
      }
    });

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
