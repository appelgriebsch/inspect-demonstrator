(function() {
  'use strict';
  const OwlEntity = require('./OwlEntity');

  class OwlIndividual extends OwlEntity{
    constructor(ontologyIri, classIri, instanceIri) {
      super(ontologyIri, instanceIri);
      if (!classIri) {
        throw Error('Class iri must not be null!');
      }
      this.classIri = classIri;
      this.datatypeProperties = {};
      this.objectProperties = {};
      this.reverseObjectProperties = {};
    }
    static addProperty(propertyArray, label, propertyIri, target) {
      const prop = {label: label, target: target};
      if (!propertyArray[propertyIri]) {
        propertyArray[propertyIri] = [prop];
      } else {
        if (propertyArray[propertyIri].indexOf(target) < 0) {
          propertyArray[propertyIri].push(prop);
          return true;
        }
      }
      return false;
    }
    static removeProperty(propertyArray, propertyIri, target) {
      if (!propertyArray[propertyIri]) {
        return false;
      }
      const index = propertyArray[propertyIri].indexOf(target);
      if (index > -1) {
        propertyArray[propertyIri].splice(index, 1);
        return true;
      }
      return false;
    }
    addObjectProperty(propertyIri, label, targetInstanceIri) {
      if (!propertyIri) {
        throw Error('Property iri must not be null!');
      }
      if (!targetInstanceIri) {
        throw Error('Target iri must not be null!');
      }
      if (OwlIndividual.addProperty(this.objectProperties, label, propertyIri, targetInstanceIri)) {
        this.saved = false;
      }
    }
    removeObjectProperty(propertyIri, targetInstanceIri) {
      if (!propertyIri) {
        throw Error('Property iri must not be null!');
      }
      if (!targetInstanceIri) {
        throw Error('Target iri must not be null!');
      }
      if (OwlIndividual.removeProperty(this.objectProperties, propertyIri, targetInstanceIri)) {
        this.saved = false;
      }
    }
    addReverseObjectProperty(propertyIri, label, targetInstanceIri) {
      if (!propertyIri) {
        throw Error('Property iri must not be null!');
      }
      if (!targetInstanceIri) {
        throw Error('Target iri must not be null!');
      }
      if (OwlIndividual.addProperty(this.reverseObjectProperties, label, propertyIri, targetInstanceIri)) {
        this.saved = false;
      }
    }
    removeReverseObjectProperty(propertyIri, targetInstanceIri) {
      if (!propertyIri) {
        throw Error('Property iri must not be null!');
      }
      if (!targetInstanceIri) {
        throw Error('Target iri must not be null!');
      }
      if (OwlIndividual.removeProperty(this.reverseObjectProperties, propertyIri, targetInstanceIri)) {
        this.saved = false;
      }
    }
    addDatatypeProperty(propertyIri, label, value) {
      if (!propertyIri) {
        throw Error('Property iri must not be null!');
      }
      if (!value) {
        throw Error('Value must not be null!');
      }
      if (OwlIndividual.addProperty(this.datatypeProperties, label, propertyIri, value)) {
        this.saved = false;
      }
    }

    removeDatatypeProperty(propertyIri, value) {
      if (!propertyIri) {
        throw Error('Property iri must not be null!');
      }
      if (!value) {
        throw Error('Value must not be null!');
      }
      if (OwlIndividual.removeProperty(this.datatypeProperties, propertyIri, value)) {
        this.saved = false;
      }
    }
  }
  module.exports = OwlIndividual;

})();
