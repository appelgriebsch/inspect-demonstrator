/*jshint esversion: 6 */
(function () {
  'use strict';
  /**
   * @constructor
   */
  function Case(identifier, name, creator, creationDate, status) {
    /** private properties **/
    var lastEditedDate = creationDate;


    var instances = [];


    /** public properties **/
    this.name = name;
    this.status = status;
    this.lastEditedBy = creator;
    this.investigator = undefined;
    this.description = undefined;
    this.closedDate = undefined;
    this.investigator = undefined;



    this.identifier = () => {
      return identifier;
    };
    this.creationDate = () => {
      return creationDate;
    };
    this.export =() => {
      return {
        identifier: identifier,
        name: this.name,
        creator: creator,
        creationDate: creationDate,
        status: this.status,
        lastEditedDate: creationDate,
        lastEditedBy: this.lastEditedBy,
        investigator: this.investigator,
        description: this.description,
        closedDate: this.closedDate,
        instances: instances
      };
    };


  }

  module.exports = Case;
})();
