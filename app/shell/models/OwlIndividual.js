(function(angular) {
  'use strict';
  const OwlEntity = require('./OwlEntity');

  class OwlIndividual extends OwlEntity{
    constructor(ontologyIri, classIri, instanceIri) {
      super(ontologyIri, instanceIri);
      if (angular.isUndefined(classIri)) {
        throw Error('Class iri must not be null!');
      }
      this.classIri = classIri;
      this.saved = false;
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
      if (angular.isUndefined(propertyIri)) {
        throw Error('Property iri must not be null!');
      }
      if (angular.isUndefined(targetInstanceIri)) {
        throw Error('Target iri must not be null!');
      }
      if (OwlIndividual.addProperty(this.objectProperties, label, propertyIri, targetInstanceIri)) {
        this.saved = false;
      }
    }
    removeObjectProperty(propertyIri, targetInstanceIri) {
      if (angular.isUndefined(propertyIri)) {
        throw Error('Property iri must not be null!');
      }
      if (angular.isUndefined(targetInstanceIri)) {
        throw Error('Target iri must not be null!');
      }
      if (OwlIndividual.removeProperty(this.objectProperties, propertyIri, targetInstanceIri)) {
        this.saved = false;
      }
    }
    addReverseObjectProperty(propertyIri, label, targetInstanceIri) {
      if (angular.isUndefined(propertyIri)) {
        throw Error('Property iri must not be null!');
      }
      if (angular.isUndefined(targetInstanceIri)) {
        throw Error('Target iri must not be null!');
      }
      if (OwlIndividual.addProperty(this.reverseObjectProperties, label, propertyIri, targetInstanceIri)) {
        this.saved = false;
      }
    }
    removeReverseObjectProperty(propertyIri, targetInstanceIri) {
      if (angular.isUndefined(propertyIri)) {
        throw Error('Property iri must not be null!');
      }
      if (angular.isUndefined(targetInstanceIri)) {
        throw Error('Target iri must not be null!');
      }
      if (OwlIndividual.removeProperty(this.reverseObjectProperties, propertyIri, targetInstanceIri)) {
        this.saved = false;
      }
    }
    addDatatypeProperty(propertyIri, label, value) {
      if (angular.isUndefined(propertyIri)) {
        throw Error('Property iri must not be null!');
      }
      if (angular.isUndefined(value)) {
        throw Error('Value must not be null!');
      }
      if (OwlIndividual.addProperty(this.datatypeProperties, label, propertyIri, value)) {
        this.saved = false;
      }
    }

    removeDatatypeProperty(propertyIri, value) {
      if (angular.isUndefined(propertyIri)) {
        throw Error('Property iri must not be null!');
      }
      if (angular.isUndefined(value)) {
        throw Error('Value must not be null!');
      }
      if (OwlIndividual.removeProperty(this.datatypeProperties, propertyIri, value)) {
        this.saved = false;
      }
    }

    toSaveTriples() {
      const triples = [];
      const iri = this.iri;

      const toPropTriples = function(properties) {
        angular.forEach(properties, (targets, key) => {
          angular.forEach(targets, (prop) => {
            triples.push({
              subject: iri,
              predicate: key,
              object: prop.target
            });
          });
        });
      };
      // type definition
      triples.push({
        subject: this.iri,
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: 'http://www.w3.org/2002/07/owl#NamedIndividual'
      });
      triples.push({
        subject: this.iri,
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: this.classIri
      });
      //comments
      angular.forEach(this.comments, (comment) => {
        triples.push({
          subject: this.iri,
          predicate: 'http://www.w3.org/2000/01/rdf-schema#comment',
          object: comment
        });
      });

      toPropTriples(this.datatypeProperties);
      toPropTriples(this.objectProperties);
      return triples;
    }

  }
  module.exports = OwlIndividual;

})(global.angular);
