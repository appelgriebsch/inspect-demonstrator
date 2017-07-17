(function(angular) {

  'use strict';
  function SettingsViewController($scope, $q, CaseOntologyDataService, OntologyMetadataService, OntologyDataService) {
    const vm = this;

    let _fileSelector;

    vm.image = undefined;
    vm.iri = undefined;

    vm.showFileSelector = function() {
      if (!_fileSelector) {
        _fileSelector = document.getElementById('fileSelector');
        _fileSelector.onchange = (e) => {
          $q.when(true).then(() => {
            _addFile(e.target.files[0]);
          });
        };
      }
      $q.when(true).then(() => {
        _fileSelector.click();
      });
    };

    const _addFile = (file) =>  {
      const uploadRequest = {
        name: file.name,
        mime: file.type,
        size: file.size,
        path: file.path,
        url: `file:///${file.path}`
      };

      const reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {
          const result = e.target.result.replace(`data:${file.type};base64,`, '');
          vm.image = e.target.result;
          if (!vm.activeProfile._attachments[vm.iri]) {
            vm.activeProfile._attachments[vm.iri] = {
              content_type: file.type
            };
          }
          vm.activeProfile._attachments[vm.iri].data = result;
          OntologyMetadataService.saveProfile(vm.activeProfile);
          console.log(vm.activeProfile);
        };
      })(file);
      reader.readAsDataURL(file);
    };

    vm.itemSelected = (item) => {
      vm.iri = item.iri;
    };

    vm.$onInit = () => {

      $scope.setBusy('Loading data...');
      CaseOntologyDataService.initialize().then(() => {
          return Promise.all([
            OntologyDataService.fetchAllIndividuals(),
            OntologyMetadataService.profile("default")
          ]);
        })
        .then((result) => {
          vm.individuals = result[0];
          vm.activeProfile = result[1];
          if (!vm.activeProfile._attachments) {
            vm.activeProfile._attachments = {};
          }
          $scope.setReady(true);
        }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });



    };
  }
  module.exports = SettingsViewController;

})(global.angular);
