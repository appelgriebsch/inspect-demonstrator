(function() {
  'use strict';

  const OwlEntity = require('./OwlEntity');

  class OwlClass extends OwlEntity{
    constructor(ontologyIri, classIri) {
      super(ontologyIri, classIri);

      this.name = OwlEntity.extractName(classIri, ontologyIri);
      this.instanceIris = [];
      this.childClassIris = [];
      this.parentClassIri = undefined;
    }
  }
  module.exports = OwlClass;

})();
