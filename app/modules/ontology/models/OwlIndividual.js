(function () {
  'use strict';
  const OwlEntity = require('./OwlEntity');

  class OwlIndividual extends OwlEntity {
    constructor (ontologyIri, classIris, instanceIri) {
      super(ontologyIri, instanceIri);
      if (!classIris) {
        throw Error('Class iri must not be null!');
      }
      if (!Array.isArray(classIris)) {
        throw Error('Class iris is not an array!');
      }
      this.classIris = classIris;
      this.datatypeProperties = [];
      this.objectProperties = [];
      this.reverseObjectProperties = [];
    }

  }
  module.exports = OwlIndividual;
})();
