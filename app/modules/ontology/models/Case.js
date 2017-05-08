(function() {
  'use strict';

  const uuid = require('uuid');

  class Case {
    constructor(identifier, createdBy, createdOn, description) {
      if (identifier === undefined) {
        throw Error('Identifier must not be null!');
      }
      if (createdBy === undefined) {
        throw Error('Created by must not be null!');
      }
      if (createdOn === undefined) {
        throw Error('Created on must not be null!');
      }
      this.identifier = identifier;
      this.createdBy = createdBy;
      this.createdOn = createdOn;
      this.lastEditedBy = createdBy;
      this.lastEditedOn =  createdOn;
      this.status = 'new';
      this.name = '';
      this.description = description;
      this.individualIris = [];
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
      if (individual === undefined) {
        throw Error('Individual must not be null!');
      }
      return {id: individual.iri, label: individual.label, title: individual.label, group: 'instanceNode'};
    }

    generateNodesAndEdges() {
      const result = {
        nodes: [],
        edges: []
      };
     /* this.individuals.map((individual) => {
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
      });*/
     // throw Error("Not yet implemented!");
      return result;
    }
  }
  module.exports = Case;

})();

