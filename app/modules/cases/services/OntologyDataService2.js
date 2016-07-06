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

    var _fetchOntologyUri = () =>{
      var promise = new Promise((resolve, reject) => {
        var owlURI = _uriForPrefix('owl');
        var ontologyNode = `${owlURI}Ontology`;
        var typePred = `${_uriForPrefix('rdf')}type`;
        db.get({
          predicate: typePred,
          object: ontologyNode

        }, function (err, results) {
          if (err) {
            reject(err);
          } else {
            if (results.length > 0) {
              var ontology = {
                prefix: 'ontology',
                uri: `${results[0].subject}#`,
                subject: results[0].subject
              };
              knownURIs.push({
                prefix: ontology.prefix,
                uri: ontology.uri
              });
            }
            resolve();
          }
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



    var _fetchRootClasses = () => {
      var promise = new Promise((resolve, reject) => {
        var typePred = `${_uriForPrefix('rdf')}type`;
        var subClassPred = `${_uriForPrefix('rdfs')}subClassOf`;
        var obj = `${_uriForPrefix('owl')}Class`;
        db.search([{
            // entity is a Class
            subject: db.v("subject"),
            predicate: typePred,
            object: obj
          }],
          {
            filter: function(solution, callback) {
              db.get({
                subject: solution.subject,
                predicate: subClassPred
              }, function (err, results) {
                if (err) {
                  callback(err);
                  return;
                }
                if (results.length > 0) {
                  callback();
                } else {
                  callback(null, {id: solution.subject, name: solution.subject.replace(`${_uriForPrefix('ontology')}`, "")});
                }
              });
            }
          },
          function(error, results) {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
      });
      return promise;
    };
    /**
     *
     * @param parent
     * @returns {Array}
     * @private
     */
    var _fetchClasses = (parentUri) => {
      var promise = new Promise((resolve, reject) => {

        var typePred = `${_uriForPrefix('rdf')}type`;
        var subClassPred = `${_uriForPrefix('rdfs')}subClassOf`;
        var obj = `${_uriForPrefix('owl')}Class`;

        db.search([{
          // entity is a Class
          subject: db.v("subject"),
          predicate: typePred,
          object: obj
        }],
          {

            filter: function(solution, callback) {
              console.log("filter");
              db.get({
                subject: solution.x
                , predicate: 'friend'
                , object: 'marco'
              }, function (err, results) {
                if (err) {
                  callback(err);
                  return;
                }
                if (results.length > 0) {
                  // confirm the solution
                  //callback(null, solution);
                  callback();
                } else {
                  // refute the solution
                  callback();
                }
              });
            }
          }, function (err, results) {

          // this will print "[{ x: 'daniele', y: 'marco' }]"
          console.log("results", results);
        });

        /*db.get({
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
        });*/
      });

      return promise;

    };


    return {

      initialize: function() {

        if (!db) {
          db = LevelGraphDBService.initialize('ontology2');

        }

        return Promise.all([
          _importTTL(path.join(__dirname, 'ontologie.ttl')),
          _fetchOntologyUri()
        ]);
      },
      fetchClassesTree() {
        return _fetchRootClasses();
      }


    };
  }
  module.exports = OntologyDataService;

})();
