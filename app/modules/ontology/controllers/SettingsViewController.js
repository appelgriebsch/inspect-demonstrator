(function(angular) {

  'use strict';
  function SettingsViewController($scope, $q, $state, CaseOntologyDataService, OntologyMetadataService, OntologyDataService) {
    const vm = this;
    const path = require('path');
    const Icons = require(path.join(__dirname, '../models/Icons'));

    const _urlCreator = window.URL || window.webkitURL;
    let _fileSelector;
    const maxSize = 100;
    const minSize = 50;

    vm.showIconSelection = false;
    vm.showImageSelection = false;

    vm.selectedItem = undefined;
    vm.definedSymbols = [];

    vm.iconData = undefined;

    vm.selectedIconFont = undefined;
    vm.selectedIcon = undefined;

    vm.selectedImage = undefined;

    vm.error = undefined;

    const _addFile = (file) =>  {
      vm.error = undefined;
      vm.image = '';
      const reader = new FileReader();

      reader.onloaderror = function (e) {
        //TODO: error!
      };

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return (e)  => {

          const result = e.target.result;
          vm.selectedImage  = new Image();
          vm.selectedImage.addEventListener("load", () => {
            if ((vm.selectedImage.width > maxSize) || (vm.selectedImage.width < minSize) || (vm.selectedImage.height > maxSize) || (vm.selectedImage.height < minSize)) {
              vm.error = `The submitted image is ${vm.selectedImage.width} pixels wide and ${vm.selectedImage.height} pixels high. Images must be at least ${minSize} pixels wide and ${minSize} pixels high, but no larger than ${maxSize} pixels wide and ${maxSize} pixels high.`;
              _urlCreator.revokeObjectURL( vm.selectedImage.src);
              vm.selectedImage = undefined;
              $scope.$apply();
              return;
            }
            vm.selectedIcon = undefined;
            vm.selectedIconFont = undefined;
            vm.activeProfile.symbols[vm.selectedItem] = {
              shape: vm.imageType,
              image:  result
            };
            filterForSavedSymbols();
            $scope.$apply();
          });
          vm.selectedImage.src = _urlCreator.createObjectURL(file);
        };
      })(file);
      reader.readAsDataURL(file);
    };

    const filterForSavedSymbols = () => {
      vm.definedSymbols = vm.terms.filter((t) => {
        return vm.activeProfile.symbols[t.id];
      });
      vm.definedSymbols.sort((a, b) =>{
        return a.label.localeCompare(b.label);
      });
    };

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


    vm.itemSelected = (item) => {
      if (!item) {
        return;
      }
      vm.selectedItem = item;
      vm.selectedImage = undefined;
      vm.selectedIconFont = undefined;
      vm.selectedIcon = undefined;

      const symbol = vm.activeProfile.symbols[vm.selectedItem];
      if (!symbol) {
        return;
      }
      if (symbol.shape === 'icon') {
        vm.selectedIconFont = symbol.icon.face;
        vm.selectedIcon =  symbol.icon.code;
      }
      if ((symbol.shape === 'image') || (symbol.shape === 'circularImage')) {
        vm.selectedImage  = new Image();
        vm.selectedImage.src =  symbol.image;
      }
    };

    vm.clear = () => {
      if (!vm.selectedItem) {
        return;
      }
      vm.showIconSelection = false;
      vm.showImageSelection = false;

      vm.selectedIconFont = undefined;
      vm.selectedIcon =  undefined;
      vm.selectedImage = undefined;

      delete vm.activeProfile.symbols[vm.selectedItem];
      vm.definedSymbols = vm.definedSymbols.filter((s) => {
        return s.id !== vm.selectedItem;
      });
    };
    vm.iconSelected = (icon) => {
      vm.selectedIcon = icon;
      vm.selectedImage = undefined;

      vm.activeProfile.symbols[vm.selectedItem] = {
        shape: 'icon',
        icon: {
          code:  vm.selectedIcon,
          face: vm.selectedIconFont,
          size: 60
        }
      };
      filterForSavedSymbols();
    };
    vm.chooseIcon = () => {
      vm.showIconSelection = true;
      vm.showImageSelection = false;
    };
    vm.chooseImage = () => {
      vm.imageType = 'image';
      vm.showIconSelection = false;
      vm.showImageSelection = true;
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

    vm.$onInit = () => {
      $scope.setBusy('Loading data...');

      CaseOntologyDataService.initialize().then(() => {
          return Promise.all([
            CaseOntologyDataService.searchTerms(),
            OntologyMetadataService.profile("default")
          ]);
        })
        .then((result) => {
          vm.terms = result[0];

          vm.activeProfile = result[1];
          if (!vm.activeProfile._attachments) {
            vm.activeProfile._attachments = {};
          }
          vm.iconData = new Icons();
          filterForSavedSymbols();
          $scope.setReady(true);
        }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };
  }
  module.exports = SettingsViewController;

})(global.angular);
