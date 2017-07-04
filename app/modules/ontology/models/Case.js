(function () {
  'use strict';

  const uuid = require('uuid');

  class Case {
    constructor (identifier, description = '') {
      if (identifier === undefined) {
        throw Error('Identifier must not be null!');
      }
      this.identifier = identifier;
      this.name = '';
      this.description = description;
      this.individualIris = [];
      this.individuals = [];
      this.datatypeProperties = [];
      this.objectProperties = [];
      this.metaData = {};
    }
    openCase () {
      if (this.status !== 'new') {
        throw Error('Case can not be opened!');
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
