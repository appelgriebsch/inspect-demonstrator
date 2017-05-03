(function() {
  'use strict';
  const OwlEntity = require('./OwlEntity');

  class OwlIndividual extends OwlEntity{
    constructor(ontologyIri, classIris, instanceIri) {
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
  /*  static addProperty(propertyArray, label, propertyIri, target) {
      const property = {
        iri:propertyIri,
        label: label,
        target: target
      };
      const found = propertyArray.find((prop) => {
        return prop.iri === propertyIri && prop.target === target;
      });
      if (!found) {
        propertyArray.push(property);
        return true;
      }
      return false;
    }
    static removeProperty(propertyArray, propertyIri, target) {
      //TODO: implement!

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
    }*/
  }
  module.exports = OwlIndividual;

})();
