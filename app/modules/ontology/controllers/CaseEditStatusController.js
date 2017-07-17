(function() {

  'use strict';

  function CaseEditStatusController($state, CaseMetadataService) {
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
      CaseMetadataService.initialize().then(() => {
        return CaseMetadataService.metadata($state.params.caseId);
      }).then((metaData) => {
        vm.metaData = metaData;
      });
    };
  }
  module.exports = CaseEditStatusController;

})();
