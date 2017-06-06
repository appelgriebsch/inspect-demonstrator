(function () {
  'use strict';

  class OwlEntity {
    constructor (ontologyIri, iri) {
      if (!iri) {
        throw Error('Identifier must not be null!');
      }
      if (!ontologyIri) {
        throw Error('Ontology iri must not be null!');
      }
      this.iri = iri;
      this.label = OwlEntity.extractName(iri, ontologyIri);
      this.ontologyIri = ontologyIri;
      this.comments = [];
    }
    static extractName (iri, ontologyIri) {
      return iri.replace(ontologyIri, '');
    }
  }
  module.exports = OwlEntity;
})();
