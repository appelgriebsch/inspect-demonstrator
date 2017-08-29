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
  }
  module.exports = Case;
})();
