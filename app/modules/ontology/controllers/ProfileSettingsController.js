(function(angular) {

  'use strict';
  function ProfileSettingsController($scope, $state, OntologyMetadataService, OntologyDataService) {
    const vm = this;

    vm.classes = [];
    vm.datatypeProperties = [];
    vm.objectProperties = [];

    /*vm.selectedCaseClassIri = 'http://www.AMSL/GDK/ontologie#Fall';
    vm.selectedCaseNamePropertyIri = 'http://www.AMSL/GDK/ontologie#Fallname';
    vm.selectedCaseIndividualPropertyIri = 'http://www.AMSL/GDK/ontologie#beinhaltet';
    vm.selectedIndividualCasePropertyIri = 'http://www.AMSL/GDK/ontologie#ist_Bestandteil_von';*/

    vm.selectedCaseClassIri = '';
    vm.selectedCaseNamePropertyIri = '';
    vm.selectedCaseIndividualPropertyIri = '';
    vm.selectedIndividualCasePropertyIri = '';

    vm.selectedCaseClass = '';
    vm.selectedCaseNameProperty = '';
    vm.selectedCaseIndividualProperty = '';
    vm.selectedIndividualCaseProperty = '';

    vm.symbolCount = 0;


    vm.changeSymbolSettings = () => {
      $state.go('app.ontology.symbols');
    };

    vm.caseSelected = (case_) => {
      vm.activeProfile.cases.caseClassIri = case_;
    };
    vm.caseNameSelected = (prop) => {
      vm.activeProfile.cases.caseNamePropertyIri = prop;
    };
    vm.casePropertySelected = (prop) => {
      vm.activeProfile.cases.caseIndividualPropertyIri = prop;
    };
    vm.caseInversePropertySelected = (prop) => {
      vm.activeProfile.cases.individualCasePropertyIri = prop;
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
          return Promise.all([
            OntologyDataService.fetchAllClasses(),
            OntologyDataService.fetchAllDatatypeProperties(),
            OntologyDataService.fetchAllObjectProperties(),
            OntologyMetadataService.profile($state.params.profileName)
          ]);
        })
        .then((result) => {
          vm.classes = result[0].map((c) => {
            return {id: c.iri, label: c.label};
          });
          vm.datatypeProperties = result[1].map((p) => {
            return {id: p.iri, label: p.label};
          });
          vm.objectProperties = result[2].map((p) => {
            return {id: p.iri, label: p.label};
          });
          vm.activeProfile = result[3];
          vm.symbolCount = Object.keys(vm.activeProfile.symbols).length;
          if(!vm.activeProfile.cases) {
            vm.activeProfile.cases = {};
          }
          if (vm.activeProfile.cases.caseClassIri) {
            vm.selectedCaseClass = vm.classes.find((c) => {
              return c.id === vm.activeProfile.cases.caseClassIri;
            });
          }
          if (vm.activeProfile.cases.caseNamePropertyIri) {
            vm.selectedCaseNameProperty = vm.datatypeProperties.find((c) => {
              return c.id === vm.activeProfile.cases.caseNamePropertyIri;
            });
          }
          if (vm.activeProfile.cases.caseIndividualPropertyIri) {
            vm.selectedCaseIndividualProperty = vm.objectProperties.find((c) => {
              return c.id === vm.activeProfile.cases.caseIndividualPropertyIri;
            });
          }
          if (vm.activeProfile.cases.individualCasePropertyIri) {
            vm.selectedIndividualCaseProperty = vm.objectProperties.find((c) => {
              return c.id === vm.activeProfile.cases.individualCasePropertyIri;
            });
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
      OntologyMetadataService.saveProfile(vm.activeProfile).then((result) => {
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    });

  }
  module.exports = ProfileSettingsController;

})(global.angular);
