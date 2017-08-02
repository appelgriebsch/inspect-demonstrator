(function() {

  'use strict';

  function CaseEditStatusController($state, OntologyMetadataService) {
    const vm = this;
    /**
     * Initializes dependant services.
     * After completion the case and the ontology class structure is loaded.
     */
    vm.$onInit = () => {
      if (!$state.params.caseId) {
        vm.metaData = {};
        return;
      }
      OntologyMetadataService.initialize().then(() => {
        return OntologyMetadataService.metadata($state.params.caseId);
      }).then((metaData) => {
        vm.metaData = metaData;
      });
    };
  }
  module.exports = CaseEditStatusController;

})();
