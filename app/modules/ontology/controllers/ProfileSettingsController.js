(function(angular) {

  'use strict';
  function ProfileSettingsController($scope, $state, OntologyMetadataService, OntologyDataService, CaseOntologyDataService) {
    const vm = this;

    vm.activeProfile = undefined;
    const app = require('electron').remote.app;
    const sysCfg = app.sysConfig();

    vm.changeSymbolSettings = () => {
      $state.go('app.ontology.symbols');
    };
     vm.$onInit = () => {
      $state.params.profileName = "default";
      $scope.setBusy('Loading data...');
      if (!$state.params.profileName) {
        $state.go('app.ontology.view');
        return;
      }
      OntologyDataService.initialize()
        .then(OntologyMetadataService.initialize)
        .then(() => {
          return OntologyMetadataService.profile($state.params.profileName);
        })
        .then((result) => {
          vm.activeProfile = result;
          if(!vm.activeProfile.cases) {
            vm.activeProfile.cases = {
              caseClassIri: '',
              caseNamePropertyIri: '',
              caseIndividualPropertyIri: '',
              individualCasePropertyIri: '',
            };
          }
          $scope.setReady(true);
        }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };
    $scope.$on('cancel', () => {
      $state.go('app.ontology.view');
    });

    $scope.$on('submit', () => {
      $scope.setBusy('Saving data...');
      OntologyMetadataService.saveProfile(vm.activeProfile).then(() => {
        if (vm.activeProfile.cases.caseClassIri) {
          // get all classes
          return OntologyDataService.fetchIndividualsForClass(vm.activeProfile.cases.caseClassIri);
        } else {
          return [];
        }
      }).then((cases) => {
        const promises = cases.map((c) => {
          return OntologyMetadataService.metadata(c.label);
        });
        return Promise.all(promises);
      }).then((metadata) => {
        const promises = metadata.filter((data) => {
          return (data.ok === false);
        }).map((c) => {
          return OntologyMetadataService.newMetadata(c.id, sysCfg.user, new Date());
        }).map((data) => {
          return OntologyMetadataService.saveMetadata(data);
        });
        CaseOntologyDataService.reset();
        promises.push(CaseOntologyDataService.initialize());
        return Promise.all(promises);
      }).then(() => {
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    });

  }
  module.exports = ProfileSettingsController;

})(global.angular);
