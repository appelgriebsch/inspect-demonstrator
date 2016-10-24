(function(angular) {

  'use strict';

  /**
   * Has some sort of caching
   *
   * TODO: how does holding the data in maps and promises work?
   *
   * TODO: gesamte Fehlerbehandlung muss überarbeitet werden!
   *
   * @param LevelGraphDBService
   * @returns {*}
   * @constructor
   */
  function OntologyDataService($log, LevelGraphDBService) {

    var db;
    var path = require('path');
    var fs = require('fs');
    const OwlIndividual = require('../models/OwlIndividual');
    const OwlClass = require('../models/OwlClass');
    const OwlProperty = require('../models/OwlProperty');

    const regexRemoveQuotationMarks = /^"?(.*?)"?$/;

    var knownIris = [{
      prefix: 'owl',
      iri: 'http://www.w3.org/2002/07/owl#'
    }, {
      prefix: 'rdf',
      iri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
    }, {
      prefix: 'rdfs',
      iri: 'http://www.w3.org/2000/01/rdf-schema#'
    }, {
      prefix: 'dc',
      iri: 'http://purl.org/dc/elements/1.1/'
    }, {
      prefix: 'xml',
      iri: 'http://www.w3.org/XML/1998/namespace'
    }, {
      prefix: 'xsd',
      iri: 'http://www.w3.org/2001/XMLSchema#'
    }];

    var _importTTL = (doc) => {

      return new Promise((resolve, reject) => {

        var stream = fs.createReadStream(doc)
          .pipe(db.n3.putStream());

        stream.on('finish', function() {
          resolve(db);
        });

        stream.on('error', function(err) {
          reject(err);
        });
      });
    };

    var _exportTTL = () => {

      return new Promise((resolve, reject) => {
        var owlURI = _iriForPrefix('owl');
        var turtle = '';
        knownIris.forEach((item) => {
          turtle += `@prefix ${item.prefix}: ${item.iri}.
`;
        });
        db.get({},
          function(err, result) {
            result.forEach((item) => {
              turtle += `${item.subject} ${item.predicate} ${item.object}.
`;
            });
            fs.writeFile('export.ttl', turtle,  function(err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
      });
    };

    var _fetchOntologyIri = () => {
      return new Promise((resolve, reject) => {
        var owlURI = _iriForPrefix('owl');
        var ontologyNode = `${owlURI}Ontology`;
        db.get({
          predicate: _iriFor('rdf-type'),
          object: ontologyNode

        }, function(err, results) {
          if (err) {
            reject(err);
          } else {
            if (results.length > 0) {
              var ontology = {
                prefix: 'ontology',
                iri: `${results[0].subject}#`,
                subject: results[0].subject
              };
              knownIris.push({
                prefix: ontology.prefix,
                iri: ontology.iri
              });
            }
            resolve();
          }
        });
      });
    };

    var _prefixForIRI = function(iri) {
      var item = knownIris.find((entry) => {
        return entry.iri === iri;
      });
      return item ? item.prefix : iri;
    };

    var _iriForPrefix = function(prefix) {
      var item = knownIris.find((entry) => {
        return entry.prefix === prefix;
      });
      return item ? item.iri : prefix;
    };

    var _iriFor = function(type) {
      if (type === 'rdf-type') {
        return `${_iriForPrefix('rdf')}type`;
      }
      if (type === 'owl-individual') {
        return `${_iriForPrefix('owl')}NamedIndividual`;
      }
      if (type === 'owl-objectProperty') {
        return `${_iriForPrefix('owl')}ObjectProperty`;
      }
      if (type === 'owl-datatypeProperty') {
        return `${_iriForPrefix('owl')}DatatypeProperty`;
      }
      if (type === 'owl-class') {
        return `${_iriForPrefix('owl')}Class`;
      }
      if (type === 'rdfs-subProp') {
        return `${_iriForPrefix('rdfs')}subPropertyOf`;
      }
      if (type === 'rdfs-subClass') {
        return `${_iriForPrefix('rdfs')}subClassOf`;
      }
      if (type === 'rdfs-label') {
        return `${_iriForPrefix('rdfs')}label`;
      }
      if (type === 'rdfs-comment') {
        return `${_iriForPrefix('rdfs')}comment`;
      }
      if (type === 'case-name') {
        return `${_iriForPrefix('ontology')}Fallname`;
      }
      if (type === 'case-individual') {
        return `${_iriForPrefix('ontology')}beinhaltet_Fallinformationen`;
      }
      throw new Error('Type not found!');
    };

    var _labelFor = (iri, label) => {
      if ((label) && (typeof label === 'string') && (label.length > 0)) {
        return label;
      }
      if ((!iri) || (typeof iri !== 'string'))  {
        return '';
      }
      return iri.replace(_iriForPrefix('ontology'), '');
    };

    /**
     * Checks if the given iri exists as subject in the database.
     * @param iri
     * @returns {Promise}
     * @private
     */
    var _iriExists = (iri) => {
      if (angular.isUndefined(iri)) {
        return Promise.reject(new Error('Iri may not be null.'));
      }
      return new Promise((resolve, reject) => {
        db.get({
          subject: iri,
        }, function(err, results) {
          if (err) {
            reject(err);
          } else {
            if (results.length > 0) {
              resolve(true);
            } else {
              resolve(false);
            }
          }
        });
      });
    };

    var _fetch = (iri, predicate, rdfsType, type) => {
      return new Promise((resolve, reject) => {
        var searchArray = [];
        if (type === 'subject') {
          searchArray.push({
            subject: iri,
            predicate: _iriFor('rdf-type'),
            object: rdfsType
          });
          searchArray.push({
            subject: iri,
            predicate: predicate,
            object: db.v('x')
          });
        }
        if (type === 'object') {
          searchArray.push({
            subject: db.v('x'),
            predicate: _iriFor('rdf-type'),
            object: rdfsType
          });
          searchArray.push({
            subject: db.v('x'),
            predicate: predicate,
            object: iri
          });

        }
        db.search(searchArray, {}, function(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };
    const _fetchClass = (classIri) => {
      if (angular.isUndefined(classIri)) {
        return Promise.reject(new Error('Class iri may not be null.'));
      }
      return new Promise((resolve, reject) => {
        const promises = [
          _fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-class'), 'subject'),
          _fetch(classIri, _iriFor('rdfs-comment'), _iriFor('owl-class'), 'subject'),
          _fetch(classIri, _iriFor('rdfs-subClass'), _iriFor('owl-class'), 'subject'),
          _fetch(classIri, _iriFor('rdfs-subClass'), _iriFor('owl-class'), 'object'),
        ];
        Promise.all(promises).then((result) => {
          if (angular.isUndefined(result) || (result[0].length === 0)) {
            throw new Error(`Class with iri ${classIri} not found.`);
          } else {
            const clazz = new OwlClass(_iriForPrefix('ontology'), classIri);
            angular.forEach(result[1], (comment) => {
              clazz.addComment(comment);
            });
            if (result[2].length > 0) {
              clazz.parentClassIri = result[2][0].x || '';
            }
            angular.forEach(result[3], (childIri) => {
              clazz.childClassIris.push(childIri.x);
            });
            resolve(clazz);
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };
    const _fetchObjectProperty = (propertyIri) => {
      if (angular.isUndefined(propertyIri)) {
        return Promise.reject(new Error('Property iri may not be null.'));
      }
      return new Promise((resolve, reject) => {
        var predDomain = `${_iriForPrefix('rdfs')}domain`;
        var predRange = `${_iriForPrefix('rdfs')}range`;
        var predInverseOf = `${_iriForPrefix('owl')}inverseOf`;
        var promises = [
          _fetch(propertyIri, predDomain, _iriFor('owl-objectProperty'), 'subject'),
          _fetch(propertyIri, predRange, _iriFor('owl-objectProperty'), 'subject'),
          _fetch(propertyIri, predInverseOf, _iriFor('owl-objectProperty'), 'subject'),
          _fetch(propertyIri, _iriFor('rdfs-subProp'), _iriFor('owl-objectProperty'), 'subject'),
          _fetch(propertyIri, _iriFor('rdfs-comment'), _iriFor('owl-objectProperty'), 'subject'),
        ];
        Promise.all(promises).then((result) => {
          const property = new OwlProperty(_iriForPrefix('ontology'), propertyIri, 'object');

          angular.forEach(result[0], (item) => {
            if (item.x) {
              property.domainIris.push(item.x);
            }
          });
          angular.forEach(result[1], (item) => {
            if (item.x) {
              property.rangeIris.push(item.x);
            }
          });
          angular.forEach(result[2], (item) => {
            if (item.x) {
              property.inverseOfIris.push(item.x);
            }
          });
          angular.forEach(result[4], (comment) => {
            property.comments.push(comment);
          });
          resolve(property);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _fetchIndividual = (individualIri, deep) => {
      if (angular.isUndefined(individualIri)) {
        return Promise.reject(new Error('Individual iri may not be null.'));
      }
      if (!angular.isString(individualIri)) {
        return Promise.reject(new Error('Individual iri must be a string.'));
      }
      if (individualIri.length === 0) {
        return Promise.reject(new Error('Individual iri must not be empty.'));
      }
      return new Promise((resolve, reject) => {
        const dataPropType = `${_iriForPrefix('owl')}DatatypeProperty`;
        const objectPropType = `${_iriForPrefix('owl')}ObjectProperty`;
        const promises = [
          _fetch(individualIri, _iriFor('rdf-type'), _iriFor('owl-individual'), 'subject'),
          _fetch(individualIri, _iriFor('rdfs-comment'), _iriFor('owl-individual'), 'subject'),
          _fetchForIndividual(individualIri, dataPropType)
        ];
        if (deep === true) {
          promises.push(_fetchForIndividual(individualIri, objectPropType));
        }

        Promise.all(promises).then((result) => {
          if (angular.isUndefined(result) || (result[0].length === 0)) {
            throw new Error(`Individual with iri ${individualIri} not found.`);
          } else {
            const individual = new OwlIndividual(_iriForPrefix('ontology'), result[0][0].x, individualIri);

            result[1].forEach((item) => {
              individual.addComment(item.x);
            });
            result[2].forEach((item) => {

              let value = item.y;
              if (typeof item.y  === 'string') {
                // remove leading and trailing quotation marks
                value = regexRemoveQuotationMarks.exec(value)[1];
              }
              individual.addDatatypeProperty(item.x, _labelFor(item.x), value);
            });
            if (result.length > 3) {
              result[3].forEach((item) => {
                individual.addObjectProperty(item.x, _labelFor(item.x), item.y);
              });
            }
            resolve(individual);
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };
    const _fetchForIndividual = function(individualIri, objType) {
      if (angular.isUndefined(individualIri)) {
        return Promise.reject(new Error('Individual iri may not be null.'));
      }
      if (angular.isUndefined(objType)) {
        return Promise.reject(new Error('Object type may not be null.'));
      }
      return new Promise((resolve, reject) => {
        const searchArray = [{
          subject: individualIri,
          predicate: _iriFor('rdf-type'),
          object: _iriFor('owl-individual')
        }, {
          subject: individualIri,
          predicate: db.v('x'),
          object: db.v('y')
        }, {
          subject: db.v('x'),
          predicate: _iriFor('rdf-type'),
          object: objType
        }];

        db.search(searchArray, {}, function(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };

    const _fetchAllForType = (rdfsType) => {
      return new Promise((resolve, reject) => {
        _fetchAllIrisForType(rdfsType).then((iris) => {
          const promises = [];
          let func;
          switch (rdfsType) {
            case _iriFor('owl-class'):
              func = _fetchClass;
              break;
            case _iriFor('owl-objectProperty'):
              func = _fetchObjectProperty;
              break;
            case _iriFor('owl-datatypeProperty'):
              func = '';
              break;
            default: return Promise.resolve();
          }
          angular.forEach(iris, (iri) => {
            promises.push(func(iri));
          });
          return Promise.all(promises);
        }).then((entities) => {
          resolve(entities);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _fetchAllIrisForType = (rdfsType) => {
      if (angular.isUndefined(rdfsType)) {
        return Promise.reject(new Error('Type may not be null.'));
      }
      if (!angular.isString(rdfsType)) {
        return Promise.reject(new Error('Type must be a string.'));
      }
      if (rdfsType.length === 0) {
        return Promise.reject(new Error('Type may not be empty.'));
      }
      return new Promise((resolve, reject) => {
        const iris = [];
        db.get({
          predicate: _iriFor('rdf-type'),
          object: rdfsType
        }, function(err, result) {
          if (err) {
            reject(err);
          } else {
            angular.forEach(result, (value) => {
              iris.push(value.subject);
            });
            resolve(iris);
          }
        });
      });
    };
    /*const _removeIndividual = (individualIri) => {
     return new Promise((resolve, reject) => {
     _fetchIndividual(individualIri).then((individual) => {
     db.del(individual.toSaveTriples(), function(err) {
     if (err) {
     reject(err);
     } else {
     resolve();
     }
     });

     });
     });
     };*/
    const _removeIndividual = (individualIri) => {
      return new Promise((resolve, reject) => {
        db.get({
          subject: individualIri
        }, function(err, results) {
          if (err) {
            reject(err);
          } else {
            let triples = results;
            db.get({
              object: individualIri
            }, function(err2, results2) {
              if (err2) {
                reject(err2);
              } else {
                triples = triples.concat(results2);
                db.del(triples, function(err3) {
                  if (err3) {
                    reject(err3);
                  } else {
                    resolve(triples);
                  }
                });
              }
            });
          }
        });
      });
    };

    const _insertIndividual = (individual) => {
      if (angular.isUndefined(individual)) {
        return Promise.reject(new Error('Individual must not be null.'));
      }

       return new Promise((resolve, reject) => {
        _iriExists(individual.iri).then((exists)  => {
          if (exists === true) {
            reject(new Error(`Iri: ${individual.iri} already exists!`));
          } else {
            db.put(individual.toSaveTriples(), function(err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _changeIri = (oldIri, newIri) => {
      if (angular.isUndefined(oldIri)) {
        return Promise.reject(new Error('Old Iri must not be null.'));
      }
      if (angular.isUndefined(newIri)) {
        return Promise.reject(new Error('New Iri must not be null.'));
      }
      const _update = (oldTriple, newTriple) => {
        return new Promise((resolve, reject) => {
          db.del(oldTriple, function(err) {
            db.put(newTriple, function(err2) {
              resolve(true);
            });
          });
        });
      };

      return new Promise((resolve, reject) => {
        db.get({
          subject: oldIri,
        }, function(err, results) {
          if (err) {
            reject(err);
          } else {
            const promises = [];
            angular.forEach(results, (triple) => {
              const newTriple = angular.copy(triple);
              newTriple.subject = newIri;
              promises.push(_update(triple, newTriple));
            });
            Promise.all(promises).then(() => {
              db.get({
                object: oldIri,
              }, function(err, results) {
                if (err) {
                  reject(err);
                } else {
                  const promises = [];
                  angular.forEach(results, (triple) => {
                    const newTriple = angular.copy(triple);
                    newTriple.object = newIri;
                    promises.push(_update(triple, newTriple));
                  });
                  Promise.all(promises).then(() => {
                    resolve();
                  });

                }
              });
            });

          }
        });
      });
    };
    var _saveIndividual = (individual) => {
      if (angular.isUndefined(individual)) {
        return Promise.reject(new Error('Individual may not be null.'));
      }
      //TODO: add quotation marks again
      return new Promise((resolve, reject) => {

        // if it doesn't need to be saved resolve instantly
        if (individual.saved) {
          resolve();
        }
        var promises = [];
        // if individual was renamed, both iris have to be checked
        if (individual.iri !== individual.initialIri) {
          promises.push(_iriExists(individual.initialIri));
        } else {
          promises.push(Promise.resolve(false));
        }
        promises.push(_iriExists(individual.iri));
        Promise.all(promises).then((result) => {
          if (!result[0] && result[1]) {
            return _removeIndividual(individual.iri);
          }
          if (result[0] && !result[1]) {
            return _removeIndividual(individual.initialIri);
          }
          // if both iris exist, the individual can't be removed
          if (result[0] && result[1]) {
            throw new Error(`Can't rename individual from: ${individual.initialIri} to: ${individual.iri}`);
          }
          return Promise.resolve();
        }).then(() => {
          // insert new individual
          return _insertIndividual(individual);
        }).then(() => {
          //TODO: rename!!!
          // if individual was renamed, change all targets of ObjectProperties
          /*if (individual.iri !== individual.initialIri) {
           promises.push(_iriExists(individual.initialIri));
           } else {
           return Promise.resolve();
           }
           */
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    var _fetchIndividualIrisForClass = (classIri) => {
      if (!classIri) {
        Promise.reject(new Error('ClassIri is undefined.'));
      }
      return new Promise((resolve, reject) => {
        _fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-individual'), 'object').then((result, err) => {
          if (!angular.isUndefined(err)) {
            reject(err);
          } else {
            var instanceIris = [];
            result.forEach((item) => {
              instanceIris.push(item.x);
            });
            resolve(instanceIris);
          }
        });
      });
    };

    var _addOrRemoveIndividual = (instance, type) => {
      if (angular.isUndefined(instance)) {
        return Promise.reject(new Error('Instance may not be undefined.'));
      }
      if (angular.isUndefined(type)) {
        return Promise.reject(new Error('Type may not be undefined.'));
      }
      if ((type !== 'add') && (type !== 'remove')) {
        return Promise.reject(new Error('Type may only be add or remove'));
      }
      // 2 triples have to be added:
      //  - the individual is of type class
      //  - the individual is of type NamedIndividual
      return new Promise((resolve, reject) => {
        const triples = [];
        // type definition
        triples.push({
          subject: instance.iri,
          predicate: _iriFor('rdf-type'),
          object: _iriFor('owl-individual')
        });
        triples.push({
          subject: instance.iri,
          predicate: _iriFor('rdf-type'),
          object: instance.classIri
        });
        //comments
        instance.comments.forEach((comment) => {
          triples.push({
            subject: instance.iri,
            predicate: _iriFor('rdfs-comment'),
            object: comment
          });
        });
        //TODO: add object and data properties
        /* individual.objectProperties.forEach((prop) => {
         individual.objectProperties.forEach((prop) => {
         triples.push({
         subject: individual.iri,
         predicate: prop.iri,
         object: prop.
         });
         });
         */
        if (type === 'add') {
          db.put(triples, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
        if (type === 'remove') {
          db.del(triples, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    };

    const _addObjectRelation = (subjectIndividual, objectProperty, objectIndividual) => {
      if (angular.isUndefined(subjectIndividual)) {
        return Promise.reject(new Error('Subject individual may not be undefined.'));
      }
      if (!(subjectIndividual instanceof OwlIndividual)) {
        return Promise.reject(new Error('Subject individual must be of type OwlIndividual.'));
      }
      if (angular.isUndefined(objectProperty)) {
        return Promise.reject(new Error('Property may not be undefined.'));
      }
      if (!(objectProperty instanceof OwlProperty)) {
        return Promise.reject(new Error('Property must be of type OwlProperty.'));
      }
      if (angular.isUndefined(objectIndividual)) {
        return Promise.reject(new Error('Object individual may not be undefined.'));
      }
      if (!(objectIndividual instanceof OwlIndividual)) {
        return Promise.reject(new Error('Object individual must be of type OwlIndividual.'));
      }
      subjectIndividual.addObjectProperty(objectProperty.iri, objectProperty.label, objectIndividual.iri);
      return new Promise((resolve, reject) => {
        db.put({
          subject: subjectIndividual.iri,
          predicate: objectProperty.iri,
          object: objectIndividual.iri
        }, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    };

    return {
      initialize: function() {
        db = LevelGraphDBService.initialize('ontology2');

        return Promise.all([
          _importTTL(path.join(__dirname, 'ontologie.ttl')),
          _fetchOntologyIri()
        ]);
      },
      isInitialized: () => {
        return !angular.isUndefined(db);
      },
      iriExists: (iri) => {
        return _iriExists(iri);
      },
      /* newInstance: (className, instanceName) => {
       if (angular.isUndefined(className)) {
       return Promise.reject('Class name must not be null!');
       }
       if (angular.isUndefined(instanceName)) {
       return Promise.reject('Instance name must not be null!');
       }
       var classIri =  `${_iriForPrefix('ontology')}${className}`;
       var instanceIri = `${_iriForPrefix('ontology')}${instanceName}`;
       return Promise.resolve(_createInstanceFromTemplate(classIri, instanceIri));
       },
       createInstance: (individual) => {
       if (angular.isUndefined(individual)) {
       return Promise.reject('Instance must not be null!');
       }
       if (angular.isUndefined(individual.name)) {
       return Promise.reject('Instance name must not be null!');
       }
       individual.iri = `${_iriForPrefix('ontology')}${individual.name}`;
       if (_iriExists(individual.iri)) {
       return Promise.reject('Instance Iri already exists!');
       }
       return _addOrRemoveInstance(individual, 'add');
       },*/

      changeIri(oldIri, newIri) {
        return _changeIri(oldIri, newIri);
      },
      fetchIndividual(individualIri, deep) {
        return _fetchIndividual(individualIri, deep);
      },
      fetchAllClasses() {
        return _fetchAllForType(_iriFor('owl-class'));
      },
      fetchAllObjectProperties() {
        return _fetchAllForType(_iriFor('owl-objectProperty'));
      },
      fetchClass(classIri) {
        return _fetchClass(classIri);
      },
      insertIndividual: (individual) => {
        return _insertIndividual(individual);
      },
      addObjectRelation(subjectIndividual, objectProperty, objectIndividual) {
        return _addObjectRelation(subjectIndividual, objectProperty, objectIndividual);
      },
      removeIndividual: (individualIri) => {
        return _removeIndividual(individualIri);
      },
      ontologyIri: function() {
        return angular.copy(_iriForPrefix('ontology'));
      },
      fetchIndividualsForClass: (classIri) => {
        return _fetchIndividualIrisForClass(classIri);
      },
      export: () => {
        return _exportTTL(path.join(__dirname, 'test.ttl'));
      },
    };
  }
  module.exports = OntologyDataService;

})(global.angular);
