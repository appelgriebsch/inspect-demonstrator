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
      }
    };
  }

  module.exports = OntologyDataService;

})();
