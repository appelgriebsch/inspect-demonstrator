(function() {

  'use strict';

  function OntologyDataService(LevelGraphDBService) {

    var db;
    var path = require('path');
    var fs = require('fs');

    var knownURIs = [{
      prefix: 'owl',
      uri: 'http://www.w3.org/2002/07/owl#'
    }, {
      prefix: 'rdf',
      uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
    }, {
      prefix: 'rdfs',
      uri: 'http://www.w3.org/2000/01/rdf-schema#'
    }, {
      prefix: 'dc',
      uri: 'http://purl.org/dc/elements/1.1/'
    }, {
      prefix: 'xml',
      uri: 'http://www.w3.org/XML/1998/namespace'
    }, {
      prefix: 'xsd',
      uri: 'http://www.w3.org/2001/XMLSchema#'
    }];

    var _importTTL = function(doc) {

      var promise = new Promise((resolve, reject) => {

        var stream = fs.createReadStream(doc)
          .pipe(db.n3.putStream());

        stream.on('finish', function() {
          resolve(db);
        });

        stream.on('error', function(err) {
          reject(err);
        });
      });

      return promise;
    };

    var _prefixForURI = function(uri) {
      var item = knownURIs.find((entry) => {
        return entry.uri === uri;
      });
      return item ? item.prefix : uri;
    };

    var _uriForPrefix = function(prefix) {
      var item = knownURIs.find((entry) => {
        return entry.prefix === prefix;
      });
      return item ? item.uri : prefix;
    };

    var _loadNode = function(uri) {

      var promise = new Promise((resolve, reject) => {

        var nodes = [];

        db.get({
          subject: uri
        }, function(err, subjNodes) {
          if (err) {
            reject(err);
          } else {
            nodes = nodes.concat(subjNodes);
            db.get({
              object: uri
            }, function(err, objNodes) {
              if (err) {
                reject(err);
              } else {
                nodes = nodes.concat(objNodes);
                resolve(nodes);
              }
            });
          }
        });
      });

      return promise;
    };

    var _labelForNode = function(identifier) {

      var label = identifier;

      if (identifier.startsWith('http://') || identifier.startsWith('https://')) {
        var idx = identifier.lastIndexOf('#') > -1 ? identifier.lastIndexOf('#') + 1 : identifier.lastIndexOf('/') + 1;
        var uri = identifier.substr(0, idx);
        var name = identifier.substr(idx);
        var prefix = _prefixForURI(uri);
        label = `${prefix}:${name}`;
      }

      return label;
    };

    var _labelForEdge = function(identifier) {

      var label = identifier;

      if (identifier.startsWith('http://') || identifier.startsWith('https://')) {
        var idx = identifier.lastIndexOf('#') > -1 ? identifier.lastIndexOf('#') + 1 : identifier.lastIndexOf('/') + 1;
        var uri = identifier.substr(0, idx);
        var name = identifier.substr(idx);
        var prefix = _prefixForURI(uri);
        label = `${prefix}:${name}`;
      }

      if ((label === 'rdf:type') ||
        (label === 'rdfs:subClassOf') ||
        (label === 'rdfs:subPropertyOf')) {
        label = 'isA';
      } else if ((label === 'rdfs:domain') ||
        (label === 'rdfs:range')) {
        label = 'property';
      } else if (label === 'rdfs:comment') {
        label = 'comment';
      } else if (label === 'rdfs:label') {
        label = 'label';
      } else if (label === 'dc:title') {
        label = 'title';
      } else if (label === 'dc:creator') {
        label = 'creator';
      } else if (label === 'owl:versionInfo') {
        label = 'version';
      } else if (label === 'rdf:first') {
        label = 'internal';
      }

      return label;
    };

    var _loadClasses = function() {

      var promise = new Promise((resolve, reject) => {

        var pred = `${_uriForPrefix('rdf')}type`;
        var obj = `${_uriForPrefix('owl')}Class`;

        db.get({
          predicate: pred,
          object: obj
        }, function(err, subjNodes) {
          if (err) {
            reject(err);
          } else {
            var nodes = subjNodes.map((subjNode) => {
              return {
                identifier: subjNode.subject,
                label: _labelForNode(subjNode.subject)
              };
            });
            resolve(nodes);
          }
        });
      });

      return promise;
    };

    var _loadInstances = function() {

      var promise = new Promise((resolve, reject) => {

        var pred = `${_uriForPrefix('rdf')}type`;
        var obj = `${_uriForPrefix('owl')}NamedIndividual`;

        db.get({
          predicate: pred,
          object: obj
        }, function(err, subjNodes) {
          if (err) {
            reject(err);
          } else {
            var nodes = subjNodes.map((subjNode) => {
              return {
                identifier: subjNode.subject,
                label: _labelForNode(subjNode.subject)
              };
            });

            var p = [];

            nodes.forEach((node) => {
              p.push(_loadNode(node.identifier));
            });

            var instances = [];

            Promise.all(p).then((results) => {
              results.forEach((result) => {
                var instance = { inherits: [] };
                for (var i = 0; i < result.length; ++i) {
                  var prefix = _labelForNode(result[i].object);
                  var label = _labelForEdge(result[i].predicate);
                  if (prefix === 'owl:NamedIndividual') {
                    continue;
                  } else if (label === 'isA') {
                    instance.subject = result[i].subject;
                    instance.inherits.push(result[i].object);
                  } else {
                    instance.subject = result[i].subject;
                    instance.predicate = result[i].predicate;
                    instance.object = result[i].object;
                  }
                }
                if (instance.subject) {
                  instances.push(instance);
                }
              });
              resolve(instances);
            }).catch((err) => {
              reject(err);
            });
          }
        });
      });

      return promise;
    };

    var _loadProperties = function() {

      var promise = new Promise((resolve, reject) => {

        var pred = `${_uriForPrefix('rdf')}type`;
        var obj = `${_uriForPrefix('owl')}ObjectProperty`;
        var domainProp = `${_uriForPrefix('rdfs')}domain`;
        var rangeProp = `${_uriForPrefix('rdfs')}range`;

        db.get({
          predicate: pred,
          object: obj
        }, function(err, subjNodes) {
          if (err) {
            reject(err);
          } else {
            var nodes = [];
            var promises = subjNodes.map((prop) => {
              var p = new Promise((resolve2, reject2) => {
                db.get({
                  subject: prop.subject
                }, function(err, objects) {
                  if (err) {
                    reject2(err);
                  } else {
                    var domains = [];
                    var ranges = [];
                    objects.forEach((obj) => {
                      if (obj.predicate === domainProp) {
                        domains.push(obj.object);
                      } else if (obj.predicate === rangeProp) {
                        ranges.push(obj.object);
                      }
                    });
                    domains.forEach((domain) => {
                      ranges.forEach((range) => {
                        nodes.push({
                          domain: domain,
                          property: prop.subject,
                          range: range
                        });
                      });
                    });
                    resolve2();
                  }
                });
              });
              return p;
            });
            Promise.all(promises).then(() => {
              resolve(nodes);
            }).catch((err) => {
              reject(err);
            });
          }
        });
      });

      return promise;
    };

    // TODO: check if name is unique
    var _createInstance = function(identifier, classIdentifier) {
      // 2 triples have to be added:
      //  - the individual is of type class
      //  - the individual is of type NamedIndividual
      var promise = new Promise((resolve, reject) => {
        var pred = `${_uriForPrefix('rdf')}type`;
        var namedIndividualProp = `${_uriForPrefix('owl')}NamedIndividual`;
        db.put([
          {
            subject: identifier,
            predicate: pred,
            object: namedIndividualProp
          }, {
            subject: identifier,
            predicate: pred,
            object: classIdentifier
          }
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      return promise;
    };

    /**
     * Adds a new relation.
     * 
     * @param relation relation to be added
     * @param doAddInverse if true, also adds the inverse relation
     * @returns {Promise}
       * @private
       */
    var _createRelation = function(relation, doAddInverse) {
      var promises = [];
      var inverseOfURI = `${_uriForPrefix('owl')}inverseOf`;

      if (doAddInverse) {
        promises.push(new Promise((resolve, reject) => {
          db.get({
            object: relation.predicate,
            predicate: inverseOfURI
          }, function (err, result) {
            if (err) {
              reject(err);
            } else {
              var newRelations = [];
              result.forEach((rel) => {
                newRelations.push({
                  subject: relation.object,
                  object: relation.subject,
                  predicate: rel.object
                });
              });
              resolve(newRelations);
            }
          });
        }));

        promises.push(new Promise((resolve, reject) => {
          db.get({
            subject: relation.predicate,
            predicate: inverseOfURI
          }, function (err, result) {
            if (err) {
              reject(err);
            } else {
              var newRelations = [];
              result.forEach((rel) => {
                newRelations.push({
                  subject: relation.object,
                  object: relation.subject,
                  predicate: rel.object
                });
              });
              resolve(newRelations);
            }
          });
        }));
      }
      var promise = new Promise((resolve, reject) => {
        Promise.all(promises).then((result) => {
          var newRelations = [relation].concat(result[0]).concat(result[1]);
          db.put(newRelations, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }).catch((err) => {
          reject(err);
        });
      });
      return promise;
    };

    var _findInstancesOf = function(classIdentifier) {
      var promise = new Promise((resolve, reject) => {
        var pred = `${_uriForPrefix('rdf')}type`;
        db.get({
          predicate: pred,
          object: classIdentifier
        }, function(err, subjNodes) {
          if (err) {
            reject(err);
          } else {
            resolve(subjNodes);
          }
        });
      });
      return promise;
    };

    return {

      initialize: function() {

        if (!db) {
          db = LevelGraphDBService.initialize('ontology');
        }

        return Promise.all([
          _importTTL(path.join(__dirname, 'ontologie.ttl'))
        ]);
      },

      node: function(uri) {
        return _loadNode(uri);
      },

      prefixForURI: function(uri) {
        return _prefixForURI(uri);
      },

      uriForPrefix: function(prefix) {
        return _uriForPrefix(prefix);
      },

      ontology: function() {

        var promise = new Promise((resolve, reject) => {

          var owlURI = _uriForPrefix('owl');
          var ontologyNode = `${owlURI}Ontology`;

          _loadNode(ontologyNode).then((result) => {
            if (result.length > 0) {
              var ontology = {
                prefix: '',
                uri: `${result[0].subject}#`,
                subject: result[0].subject
              };
              knownURIs.push({
                prefix: ontology.prefix,
                uri: ontology.uri
              });

              _loadNode(ontology.subject).then((entries) => {
                entries.forEach((meta) => {
                  var info = _labelForEdge(meta.predicate);
                  if (info === 'label') {
                    ontology.label = meta.object;
                  } else if (info === 'comment') {
                    ontology.comment = meta.object;
                  } else if (info === 'title') {
                    ontology.title = meta.object;
                  } else if (info === 'creator') {
                    ontology.creator = meta.object;
                  } else if (info === 'version') {
                    ontology.version = meta.object;
                  }
                });
                return _loadClasses();
              }).then((classes) => {
                ontology.classes = classes;
                return _loadProperties();
              }).then((props) => {
                ontology.properties = props;
                return _loadInstances();
              }).then((instances) => {
                ontology.instances = instances;
                console.log(ontology);
                resolve(ontology);
              }).catch((err) => {
                reject(err);
              });
            }
          }).catch((err) => {
            reject(err);
          });
        });

        return promise;
      },

      labelForNode: function(identifier) {

        return _labelForNode(identifier);
      },

      labelForEdge: function(identifier) {

        return _labelForEdge(identifier);
      },
      loadClasses: function () {

        return _loadClasses();
      },
      /**
       * Creates and saves a new Individual
       * @param classIdentifier classIdentifier of the individual
       * @param type uri of the class of which the individual is a type of
       * @addInverseRelations if true, also adds the inverse relations
       * @returns {Promise}
       */
      createInstance: function (identifier, classIdentifier, relations, addInverseRelations) {
        var promises = [_createInstance(identifier, classIdentifier)];
        relations.forEach((relation) => {
          promises.push(_createRelation(relation, addInverseRelations));
        });

        return promises;
      },
      findInstancesOf: function (classIdentifier) {
        return _findInstancesOf(classIdentifier);
      },

      loadProperties: function () {

        return _loadProperties();
      }
    };
  }

  module.exports = OntologyDataService;

})();
