(function () {
  'use strict';

  const OwlEntity = require('./OwlEntity');

  class OwlClass extends OwlEntity {
    constructor (ontologyIri, classIri) {
      super(ontologyIri, classIri);

      this.name = OwlEntity.extractName(classIri, ontologyIri);
      this.individualIris = [];
      this.childClassIris = [];
      this.parentClassIris = [];
      this.objectPropertyIris = [];
    }
  }
  module.exports = OwlClass;
})();
