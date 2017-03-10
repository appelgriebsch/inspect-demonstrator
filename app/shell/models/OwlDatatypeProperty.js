(function() {
  'use strict';

  const OwlEntity = require('./OwlEntity');

  class OwlDatatypeProperty extends OwlEntity {
    constructor(ontologyIri, propertyIri) {
      super(ontologyIri, propertyIri);

      this.domainIris = [];
      this.ranges = [];
    }
  }
  module.exports = OwlDatatypeProperty;

})();
