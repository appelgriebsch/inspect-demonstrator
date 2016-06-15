(function(angular) {

  'use strict';

  /**
   * Controls the Add/Edit instance form
   * @param $scope
   * @param $state
   * @param $q
   * @param $location
   * @param OntologyDataService
   * @constructor
   */
  function OntologyFormController($scope, $state, $q, $location, OntologyDataService) {
    // TODO: how get this without loading the whole ontology?
    var ontologyUri = "http://www.AMSL/GDK/ontologie#";
    this.state = $state.$current;

    $scope.showRelationFormIsShown = false;
    $scope.data = {
      // readonly data
      classes: [],
      properties1: [], // instance is subject
      properties2: [], // instance is object FIXME: unused
      instances: [],

      // changeable data
      name: undefined,
      selectedClass: undefined,
      selectedInstance: undefined,
      selectedProperty: undefined,
      instanceRelations: []
    };
    /**
     * Called when the type of the instance is changed.
     * TODO: invalidate all relations (automatic or confirmed removal?)
     */
    $scope.typeChanged = function() {
      $scope.data.properties1 = {};
      $scope.data.objs1 = [];
      $scope.data.properties2 = {};

      // TODO: might be better to filter in the service
      OntologyDataService.loadProperties().then((props) => {
        props.find((prop) => {
          if ((prop.domain == $scope.data.selectedClass)) {
            $scope.data.properties1[prop.property] = prop;
          } else if ((prop.range == $scope.data.selectedClass)) {
            $scope.data.properties2[prop.property] = prop;
          }
        });
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
      });
    };

    /**
     * Called when the name of the instance was changed.
     * All relations of the instance will be renamed.
     */
    $scope.nameChanged = function() {
      var instanceIdentifier = `${ontologyUri}${$scope.data.name}`;
      $scope.data.instanceRelations.forEach(function(value) {
        if (value.type === "subject") {
          value.subject = instanceIdentifier;
        }
        if (value.type === "object") {
          value.object = instanceIdentifier;
        }
      });
    };

    /**
     * Called when the property selection was changed.
     * Fetches all the corresponding instance choices for the selected property.
     * XXX: only works for relation where the current instance is subject so far
     */
    $scope.propertyChanged = function() {
      if (!$scope.data.selectedClass) {
        return;
      }
      var prop = $scope.data.properties1[$scope.data.selectedProperty];

      OntologyDataService.findInstancesOf(prop.range).then((instances) => {
        $scope.data.instances = instances;
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
      });
    };

    /**
     * Extracts the name of the item (without namespace)
     * @param identifier uri of the item
     * @returns {*) 
       */
    $scope.label = function (identifier) {
      if (identifier) {
        return identifier.split(/#/)[1];
      }
      return "";
    };

    /**
     * Determines if the relations area is shown.
     * @returns {boolean} if there are relations to be shown
     */
    $scope.showInstanceRelations = function() {
      if ((!$scope.data.instanceRelations) || ($scope.data.instanceRelations.length == 0)) {
        return false;
      }
      return true;
    };

    /**
     *
     */
    $scope.toggleShowRelationForm = function() {
      $scope.showRelationFormIsShown = !$scope.showRelationFormIsShown;
    };

    $scope.enableInstanceRelationsForm = function() {
      if ((!$scope.data.name) || (!$scope.data.selectedClass)) {
        return false;
      }
      return true;
    };
    $scope.addRelationButtonEnabled = function() {
      if ((!$scope.data.name) || (!$scope.data.selectedClass) || (!$scope.data.selectedInstance)) {
        return false;
      }
      return true;
    };

    /**
     * Called if the form is cancelled, the application will route to the ontology view.
     */
    $scope.$on("cancel-add-form", () => {
      $location.path("/app/ontology/view");
    });

    /**
     * Called if the form is submitted.
     * A new instance with the corresponding relations are created.
     * The application will route to the ontology view, if the creation was successful
     * 
     * TODO: check whether name is valid
     * 
     */
    $scope.$on("save-instance", ($event, args) => {
      $scope.setBusy('Saving data...');

      var instanceIdentifier = `${ontologyUri}${$scope.data.name}`;
      //TODO: should there always be an inverse relation be created?
      var promises = OntologyDataService.createInstance(instanceIdentifier, $scope.data.selectedClass, $scope.data.instanceRelations, true);
      Promise.all(promises).then(() => {
        $scope.setReady(true);
        $location.path("app/ontology/view");
      }).catch((err) => {
        $scope.setError('InsertAction', 'insert', err);
        $scope.setReady(true);
      });
    });

    $scope.addRelation = function () {
      var newInstance = `${ontologyUri}${$scope.data.name}`;
      // TODO: reverse prop
      $scope.data.instanceRelations.push({subject: newInstance, predicate: $scope.data.selectedProperty, object: $scope.data.selectedInstance, type: "subject"});
      $scope.data.selectedProperty = undefined;
      $scope.data.selectedInstance = undefined;
    };

    $scope.removeRelation = function (index) {
      if ((index !== undefined) && (index > -1)) {
        $scope.data.instanceRelations.splice(index, 1);
      }
    };

    this.initialize = function() {
      $scope.setBusy('Loading ontology data...');

      var init = [OntologyDataService.initialize()];
      Promise.all(init).then(() => {
        return OntologyDataService.loadClasses();
      }).then((classes) => {
        $scope.data.classes = classes;
        $scope.setReady(false);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };
  }


  module.exports = OntologyFormController;

})(global.angular);
