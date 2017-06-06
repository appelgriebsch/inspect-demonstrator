(function () {
  'use strict';

  const OwlEntity = require('./OwlEntity');

  class OwlObjectProperty extends OwlEntity {
    constructor (ontologyIri, propertyIri, type) {
      super(ontologyIri, propertyIri);
      this.domainIris = [];
      this.rangeIris = [];
      this.inverseOfIris = [];
      this.symmetric = false;
      // TODO: possibly add transitive, symmetric etc.
    }
  }
  module.exports = OwlObjectProperty;
})();
