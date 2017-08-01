(function(angular) {

  'use strict';
  function ProfileSettingsController($scope, $state, OntologyMetadataService, OntologyDataService) {
    const vm = this;

    vm.activeProfile = undefined;
    vm.symbolCount = 0;


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
          vm.symbolCount = Object.keys(vm.activeProfile.symbols).length;
          if(!vm.activeProfile.cases) {
            vm.activeProfile.cases = {};
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
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    });

  }
  module.exports = ProfileSettingsController;

})(global.angular);
