(function(angular) {

  'use strict';
  function NodeEditController($scope, $state, CaseOntologyDataService) {
    const vm = this;
    vm.state = $state.$current;

    vm.mode = "add";
    vm.dataTypes = [
      {id: "http://www.w3.org/2001/XMLSchema#string",  label: "string"},
      {id: "http://www.w3.org/2001/XMLSchema#int",  label: "int"},
      {id: "http://www.w3.org/2001/XMLSchema#float",  label: "float"},
    ];
    vm.object = {
      label: "",
      oldLabel: "",
      comment: "",
      "class": {},
      objectRelations: [],
      dataRelations: [],
      cases: [],
    };
    vm.selectedObjectRelation = undefined;
    vm.selectedIndividual = undefined;

    vm.selectedDataRelation = undefined;
    vm.selectedDataRelationType = undefined;
    vm.selectedDataRelationTarget = undefined;

    vm.addObjectRelation = () => {
      const obj = vm.object.objectRelations.find((r) => {
        return ((r.relation === vm.selectedObjectRelation) && (r.target === vm.selectedIndividual));
      });
      if (!obj) {
        vm.object.objectRelations.push({
          relation: vm.selectedObjectRelation,
          relationLabel: vm.objectRelations.find((r) => { return r.id === vm.selectedObjectRelation;}).label,
          target: vm.selectedIndividual,
          targetLabel: vm.individuals.find((r) => { return r.id === vm.selectedIndividual;}).label,
        });
      }
      vm.clearObjectRelation();
    };

    vm.addDataRelation = () => {
      if (!vm.selectedDataRelationTarget || vm.selectedDataRelationTarget.length === 0) {
        return;
      }

      const obj = vm.object.dataRelations.find((r) => {
        return ((r.relation === vm.selectedDataRelation) && (r.target === vm.selectedDataRelationTarget));
      });
      if (!obj) {
        vm.object.dataRelations.push({
          relation: vm.selectedDataRelation,
          relationLabel: vm.dataRelations.find((r) => { return r.id === vm.selectedDataRelation;}).label,
          target: vm.selectedDataRelationTarget,
          type: vm.selectedDataRelationType
        });
      } else {
        obj.type = vm.selectedDataRelationType;
      }
      vm.clearDataRelation();
    };
    vm.removeObjectRelation = (index) => {
      if ((index >= 0) && (index < vm.object.objectRelations.length)){
        vm.object.objectRelations.splice(index, 1);
      }
    };
    vm.removeDataRelation = (index) => {
      if ((index >= 0) && (index < vm.object.dataRelations.length)){
        vm.object.dataRelations.splice(index, 1);
      }
    };
    vm.clearObjectRelation = () => {
      vm.selectedObjectRelation = undefined;
      vm.selectedIndividual = undefined;
    };

    vm.clearDataRelation = () => {
      vm.selectedDataRelation = undefined;
      vm.selectedDataRelationType = "http://www.w3.org/2001/XMLSchema#string";
      vm.selectedDataRelationTarget = undefined;
    };


    vm.toggle = function (item, list) {
      const idx = list.indexOf(item);
      if (idx > -1) {
        list.splice(idx, 1);
      }
      else {
        list.push(item);
      }

    };

    vm.exists = function (item, list) {
      return list.indexOf(item) > -1;
    };

    const _goBack = () => {
      if ($state.params.caseId) {
        $state.go('app.ontology.case', {caseId: $state.params.caseId, mode: 'graph'});
      } else {
        $state.go('app.ontology.cases');
      }
    };

    $scope.$on('cancel', () => {
      _goBack();
    });

    $scope.$on('submit', () => {
      console.log("object",vm.object);
      CaseOntologyDataService.saveAsIndividual(vm.object).then(() => {
        _goBack();
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });

    });
    vm.$onInit = () => {
      $scope.setBusy('Loading node...');
      if ((($state.params.mode !== 'edit') && ($state.params.mode !== 'add'))
        || (($state.params.mode === 'edit') && (!$state.params.nodeId))
        || (($state.params.mode === 'add') && (!$state.params.nodeType))){
        $state.go('app.ontology.case', {caseId: $state.params.caseId});
        return;
      }

      CaseOntologyDataService.initialize()
        .then(CaseOntologyDataService.loadCaseList)
        .then((cases) => {
          vm.cases = cases.map((c) => {
            return {id: c.identifier, label: c.name};
          });
          // load case to have possible targets for the object relations
          if ($state.params.caseId) {
            return CaseOntologyDataService.loadCase($state.params.caseId, true);
          } else {
            return false;
          }
        }).then((case_) => {
        if (case_) {
          vm.individuals = case_.individuals.map((c) => {
            return {id: c.iri, label: c.label};
          });
        }
        if ($state.params.mode === 'edit') {
          return CaseOntologyDataService.loadIndividual($state.params.nodeId);
        } else {
          return false;
        }
      }).then((individual) => {

        // get classes and properties
        vm.classes = CaseOntologyDataService.getClasses().map((c) => {
          return {id: c.iri, label: c.label};
        });
        vm.objectRelations = CaseOntologyDataService.getObjectProperties().map((c) => {
          return {id: c.iri, label: c.label};
        });
        vm.dataRelations = CaseOntologyDataService.getDatatypeProperties().map((c) => {
          return {id: c.iri, label: c.label};
        });

        if (individual) {
            console.log("individual", individual);
          vm.object.label = individual.label;
          vm.object["class"] = individual.classIris[0];
          vm.object.comment = individual.comments[0];
          vm.object.cases = individual.cases;
          vm.object.objectRelations = individual.objectProperties.map((prop) => {
            return {
              relation: prop.iri,
              relationLabel: vm.objectRelations.find((r) => { return r.id === prop.iri;}).label,
              target: prop.target,
              targetLabel: prop.target
            };
          });
          vm.object.reverseObjectRelations  = individual.reverseObjectProperties.map((prop) => {
            return {
              relation: prop.iri,
              relationLabel: vm.objectRelations.find((r) => { return r.id === prop.iri;}).label,
              target: prop.target,
              targetLabel: prop.target
            };
          });
          vm.object.dataRelations = individual.datatypeProperties.map((prop) => {
            return {
              relation: prop.iri,
              relationLabel: vm.dataRelations.find((r) => { return r.id === prop.iri;}).label,
              target: prop.target,
              type: prop.targetType
            };
          });
        } else {
          vm.object["class"] = $state.params.nodeType;
          vm.object.cases = [$state.params.caseId];
        }
        // in case it will be renamed
        vm.object.oldLabel = vm.object.label;
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });

      vm.clearObjectRelation();
      vm.clearDataRelation();

    };
  }
  module.exports = NodeEditController;

})(global.angular);
