(function(angular) {
  'use strict';

  var uuid = require('uuid');

  class Case {
    constructor(identifier, createdBy, createdOn, description) {
      if (angular.isUndefined(identifier)) {
        throw Error('Identifier must not be null!');
      }
      if (angular.isUndefined(createdBy)) {
        throw Error('Created by must not be null!');
      }
      if (angular.isUndefined(createdOn)) {
        throw Error('Created on must not be null!');
      }
      this.identifier = identifier;
      this.createdBy = createdBy;
      this.createdOn = createdOn;
      this.lastEditedBy = createdBy;
      this.lastEditedOn =  createdOn;
      this.status = 'new';
      this.name = '';
      //ik = instanzKnoten, ak = attributsKnoten, k = kanten.
      this.iksize = 12;
      this.ikcolor = '#aa80ff';
      this.ikform = 'dot';
      this.aksize = 12;
      this.akcolor = '#aa80ff';
      this.akform = 'dot';
      this.ksize = 1;
      this.kcolor = '#aa80ff';
      this.kform = 'dynamic';
      this.description = description;
      this.individuals = [];
      this.datatypeProperties = [];
      this.objectProperties = [];
    }
    openCase() {
      if (this.status !== 'new') {
        throw Error('Case can not be opened!');
      }
      this.status = 'open';
    }
    closeCase() {
      if (this.status !== 'open') {
        throw Error('Case can not be closed!');
      }
      this.status = 'closed';
    }


    generateNode(individual) {
      if (angular.isUndefined(individual)) {
        throw Error('Individual must not be null!');
      }
      return {id: individual.iri, label: individual.label, title: individual.label, group: 'instanceNode'};
    }

    generateNodesAndEdges() {
      const result = {
        nodes: [],
        edges: []
      };
      this.individuals.map((individual) => {
        result.nodes.push(this.generateNode(individual));
        angular.forEach(individual.datatypeProperties, (value, key) => {
          angular.forEach(value, (prop) => {
            const id = uuid.v4();
            result.nodes.push({id: id, label: prop.target, title: prop.target, group: 'dataNode'});
            result.edges.push({from: individual.iri, to: id, label: prop.label, title: prop.label});
          });
        });
        angular.forEach(individual.objectProperties, (value) => {
          angular.forEach(value, (prop) => {
            result.edges.push({from: individual.iri, to: prop.target, label: prop.label, title: prop.label});
          });
        });
      });

      return result;
    }
  }
  module.exports = Case;

})(global.angular);

