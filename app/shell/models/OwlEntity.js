(function(angular) {
  'use strict';

  class OwlEntity {
    constructor(ontologyIri, iri) {
      if (angular.isUndefined(iri)) {
        throw Error('Identifier must not be null!');
      }
      if (angular.isUndefined(ontologyIri)) {
        throw Error('Ontology iri must not be null!');
      }
      this.iri = iri;
      this.label = OwlEntity.extractName(iri, ontologyIri);
      this.ontologyIri = ontologyIri;
      this.comments = [];
    }
    static extractName(iri, ontologyIri) {
      return iri.replace(ontologyIri, '');
    }

    addComment(comment) {
      this.comments.push(comment);
      this.saved = false;
    }
    removeAllComments() {
      this.comments = [];
      this.saved = false;
    }
  }
  module.exports = OwlEntity;

})(global.angular);
