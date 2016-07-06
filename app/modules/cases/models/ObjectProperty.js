/*jshint esversion: 6 */
(function () {
  'use strict';
  /**
   * Describes a
   * @constructor
   */
  function ObjectProperty() {
    /**
     * identifier for this property
     * @type {string}
     */
    var identifier = "";
    /**
     * name for this property
     * @type {string}
     */
    var name = "";
    /**
     * allowed subject class identifier for this relation
     * @type {Array}
     */
    var domainUris = [];
    /**
     * allowed object class identifier for this relation
     * @type {Array}
     */
    var rangeUris = [];
    /**
     * list of ObjectProperties which are the inverse of this one
     * @type {Array}
     */
    var inverseOfUris = [];
    /**
     *
     * @type {Array}
     */
    var properties = [];
    var allowedProperties = ["symmetric", "asymmetric", "transitive", "functional", "inverse functional", "reflexive", "irreflexive"];


    /************************ private methods **************************/
    var _find = (element, array) => {
      var index = array.indexOf(element);
      if (index < 0) {
        return true;
      }
      return false;
    };
    var _removeProperty = (property) => {
      if (properties.length === 0) {
        return;
      }
      var index = properties.indexOf(property);
      if (index < 0) {
        return;
      }
      properties.splice(index, 1);
    };
    var _addIfNotContained = (element, array) => {
      var index = array.indexOf(element);
      if (index < 0) {
        array.push(element);
      }
    };
    var _addProperty = (property) => {
      if (!property) {
        return;
      }
      var index = properties.indexOf(property);
      if (index < 0) {
        properties.push(property);
      }
    };
    var _addUri = (uri, type) => {
      if (!uri) {
        return;
      }
      if (type === "range") {
        _addIfNotContained(uri, rangeUris);
        return;
      }
      if (type === "domain") {
        _addIfNotContained(uri, domainUris);
        return;
      }
      if (type === "inverseOf") {
        if (identifier === uri) {
          return;
        }
        _addIfNotContained(uri, inverseOfUris);
        return;
      }
    };

    /************************ public methods **************************/
    /**
     *
     * @param property
       */
    this.addProperty = (property) => {
      if(allowedProperties.indexOf(property) < 0) {
        //xxx raise error?
        return;
      }
      switch (property) {
        case "symmetric":
          _removeProperty("asymmetric");
          _addProperty(property);
          break;
        case "asymmetric":
          _removeProperty("symmetric");
          _addProperty(property);
          break;
        case "transitive":
          _addProperty(property);
          break;
        case "functional":
          _removeProperty("inverse functional");
          _addProperty(property);
          break;
        case "inverse functional":
          _removeProperty("functional");
          _addProperty(property);
          break;
        case "reflexive":
          _removeProperty("irreflexive");
          _addProperty(property);
          break;
        case "irreflexive":
          _removeProperty("reflexive");
          _addProperty(property);
          break;
      }
    };
    this.addDomainUri = (domainUri) => {
      _addUri(domainUri, "domain");
    };
    this.addRangeUri = (rangeUri) => {
      _addUri(rangeUri, "range");
    };
    this.addInverseOfUri = (inverseOfUri) => {
      _addUri(inverseOfUri, "inverseOf");
    };
    this.isSymmetric = () => {
      return _find("symmetric", properties);
    };
    this.isAsymmetric = () => {
      return _find("asymmetric", properties);
    };
    this.isTransitive = () => {
      return _find("transitive", properties);
    };
    this.isFunctional = () => {
      return _find("functional", properties);
    };
    this.isInverseFunctional = () => {
      return _find("inverse functional", properties);
    };
    this.isReflexive = () => {
      return _find("reflexive", properties);
    };
    this.isIrreflexive = () => {
      return _find("irreflexive", properties);
    };
  }
  module.exports = ObjectProperty;
})();
