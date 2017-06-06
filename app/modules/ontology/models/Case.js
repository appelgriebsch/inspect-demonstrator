(function () {
  'use strict';

  const uuid = require('uuid');

  class Case {
    constructor (identifier, createdBy, createdOn, description) {
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
      this.lastEditedOn = createdOn;
      this.status = 'new';
      this.name = '';
      this.description = description;
      this.individualIris = [];
      this.individuals = [];
      this.datatypeProperties = [];
      this.objectProperties = [];
    }
    openCase () {
      if (this.status !== 'new') {
        throw Error('Case can not be opened!')
      }
      this.status = 'open';
    }
    closeCase () {
      if (this.status !== 'open') {
        throw Error('Case can not be closed!');
      }
      this.status = 'closed';
    }
  }
  module.exports = Case;
})();
