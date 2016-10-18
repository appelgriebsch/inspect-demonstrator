(function(angular) {
  'use strict';

  const OwlEntity = require('./OwlEntity');

  class OwlProperty extends OwlEntity {
    constructor(ontologyIri, propertyIri, type) {
      super(ontologyIri, propertyIri);
      if (angular.isUndefined(type)) {
        throw Error('Type must not be null!');
      }
      if ((type !== 'datatype') && (type !== 'object')) {
        throw Error('Type must either be datatype or object!');
      }
      this.domainIris = [];
      this.rangeIris = [];
      this.inverseOfIris = [];
      this.symmetric = false;
      this.type = type;

      //TODO: possibly add transitive, symmetric etc.
    }
  }
  module.exports = OwlProperty;

})(global.angular);
