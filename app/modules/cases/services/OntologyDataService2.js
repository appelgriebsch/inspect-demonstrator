(function(angular) {

  'use strict';

  /**
   *
   * TODO: gesamte Fehlerbehandlung muss überarbeitet werden!
   *
   * @param LevelGraphDBService
   * @returns {*}
   * @constructor
   */
  function OntologyDataService($log, LevelGraphDBService) {

    let db;
    const path = require('path');
    const fs = require('fs');

    const OwlIndividual = require(path.join(__dirname, '../models/OwlIndividual'));
    const OwlClass = require(path.join(__dirname, '../models/OwlClass'));
    const OwlObjectProperty = require(path.join(__dirname, '../models/OwlObjectProperty'));
    const OwlDatatypeProperty = require(path.join(__dirname, '../models/OwlDatatypeProperty'));

    const regexRemoveQuotationMarks = /^"?(.*?)"?$/;
    const regexIriCheck = /\s+/m;

    const knownIris = [{
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

    const _deleteAll = () => {
      return new Promise((resolve, reject) => {
        db.get({}, function(err, list) {
          if (err) {
            reject(err);
          } else {
            const promises = [];
            angular.forEach(list, (triple) => {
              promises.push(new Promise((resolve2, reject2) => {
                db.del(triple, function(err2) {
                  if (err2) {
                    reject2(err2);
                  } else {
                    resolve2();
                  }
                });
              }));
            });
            Promise.all(promises).then(() => {
              resolve();
            }).catch((err3) => {
              reject(err3);
            });
          }
        });
      });
    };



    const _importTTL = (path) => {

      return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(path)
          .pipe(db.n3.putStream());

        stream.on('finish', function() {

          _fetchOntologyIri().then(() => {
            resolve(db);
          });
        });

        stream.on('error', function(err) {
          reject(err);
        });
      });
    };

    const _exportObject = (iri) => {
      return new Promise((resolve, reject) => {
        db.search([{
            subject: iri,
            predicate: db.v('p'),
            object: db.v('o')
          }], {
            n3: {
              subject: iri,
              predicate: db.v('p'),
              object: db.v('o')
            }
          },
          function(err, result) {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
      });
    };

    const _exportType = (type) => {
      return new Promise((resolve, reject) => {
        db.get({
            predicate: `${_iriForPrefix('rdf')}type`,
            object: type,

          },
          function(err, result) {
            if (err) {
              reject(err);
            } else {
              const promises = [];
              angular.forEach(result, (item) => {
                  promises.push(_exportObject(item.subject));
                });
              Promise.all(promises).then((result) => {
                resolve(result);
              });
            }
          });
      });
    };

    const _exportTTL = (path) => {
      return new Promise((resolve, reject) => {
        Promise.all([
          _exportType(`${_iriForPrefix('owl')}Ontology`),
          _exportType(`${_iriForPrefix('owl')}Annotation`),
          _exportType(`${_iriForPrefix('owl')}AnnotationProperty`),
          _exportType(`${_iriForPrefix('owl')}DatatypeProperty`),
          _exportType(`${_iriForPrefix('owl')}ObjectProperty`),
          _exportType(`${_iriForPrefix('owl')}Class`),
          _exportType(`${_iriForPrefix('owl')}NamedIndividual`)
        ]).then((result) => {
          const stream = fs.createWriteStream(path);
          angular.forEach(result, (result2) => {
            angular.forEach(result2, (item) => {
              stream.write(item);
            });
          });
          stream.end('\n');
          stream.on('finish', () => {
            resolve();
          });
          stream.on('error', (err) => {
            reject(err);
          });
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _fetchOntologyIri = () => {
      return new Promise((resolve, reject) => {
        const owlURI = _iriForPrefix('owl');
        const ontologyNode = `${owlURI}Ontology`;
        db.get({
          predicate: _iriFor('rdf-type'),
          object: ontologyNode

        }, function(err, results) {
          if (err) {
            reject(err);
          } else {
            if (results.length > 0) {
              const ontology = {
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

    const _prefixForIRI = function(iri) {
      const item = knownIris.find((entry) => {
        return entry.iri === iri;
      });
      return item ? item.prefix : iri;
    };

    const _iriForPrefix = function(prefix) {
      const item = knownIris.find((entry) => {
        return entry.prefix === prefix;
      });
      return item ? item.iri : prefix;
    };

    const _iriFor = function(type) {
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

    const _labelFor = (iri, label) => {
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
    const _iriExists = (iri) => {
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

    const _checkIri = (iri) => {
      if (angular.isUndefined(iri)) {
        throw new Error('Iri may not be null.');
      }
      if (!angular.isString(iri)) {
        throw new Error(`Iri (${iri}) must be a string.`);
      }
      if (iri.length === 0) {
        throw new Error('Iri may not be an empty string.');
      }
      if (regexIriCheck.test(iri)) {
        throw new Error(`Iri (${iri}) may not contain a space.`);
      }
    };

    const _fetch = (iri, predicate, rdfsType, type) => {
      return new Promise((resolve, reject) => {
        const searchArray = [];
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
        const predDomain = `${_iriForPrefix('rdfs')}domain`;
        const predRange = `${_iriForPrefix('rdfs')}range`;
        const predInverseOf = `${_iriForPrefix('owl')}inverseOf`;
        const symmetricProp = `${_iriForPrefix('owl')}SymmetricProperty`;
        const promises = [
          _fetch(propertyIri, _iriFor('rdf-type'), _iriFor('owl-objectProperty'), 'subject'),
          _fetch(propertyIri, predDomain, _iriFor('owl-objectProperty'), 'subject'),
          _fetch(propertyIri, predRange, _iriFor('owl-objectProperty'), 'subject'),
          _fetch(propertyIri, predInverseOf, _iriFor('owl-objectProperty'), 'subject'),
          _fetch(propertyIri, _iriFor('rdfs-comment'), _iriFor('owl-objectProperty'), 'subject'),
        ];
        Promise.all(promises).then((result) => {
          if (angular.isUndefined(result) || (result[0].length === 0)) {
            throw new Error(`ObjectProperty with iri ${propertyIri} not found.`);
          }
          const property = new OwlObjectProperty(_iriForPrefix('ontology'), propertyIri);
          angular.forEach(result[0], (item) => {
            if (item.x === symmetricProp) {
              property.symmetric = true;
            }
          });
          angular.forEach(result[1], (item) => {
            if (item.x) {
              property.domainIris.push(item.x);
            }
          });
          angular.forEach(result[2], (item) => {
            if (item.x) {
              property.rangeIris.push(item.x);
            }
          });
          angular.forEach(result[3], (item) => {
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

    const _fetchDatatypeProperty = (propertyIri) => {
      if (angular.isUndefined(propertyIri)) {
        return Promise.reject(new Error('Property iri may not be null.'));
      }
      return new Promise((resolve, reject) => {
        const predDomain = `${_iriForPrefix('rdfs')}domain`;
        const predRange = `${_iriForPrefix('rdfs')}range`;
        const promises = [
          _fetch(propertyIri, _iriFor('rdf-type'), _iriFor('owl-datatypeProperty'), 'subject'),
          _fetch(propertyIri, predDomain, _iriFor('owl-datatypeProperty'), 'subject'),
          _fetch(propertyIri, predRange, _iriFor('owl-datatypeProperty'), 'subject'),
          _fetch(propertyIri, _iriFor('rdfs-comment'), _iriFor('owl-datatypeProperty'), 'subject'),
        ];
        Promise.all(promises).then((result) => {
          if (angular.isUndefined(result) || (result[0].length === 0)) {
            throw new Error(`DatatypeProperty with iri ${propertyIri} not found.`);
          }
          const property = new OwlDatatypeProperty(_iriForPrefix('ontology'), propertyIri);

          angular.forEach(result[1], (item) => {
            if (item.x) {
              property.domainIris.push(item.x);
            }
          });
          angular.forEach(result[2], (item) => {
            if (item.x) {
              property.ranges.push(item.x);
            }
          });
          angular.forEach(result[3], (comment) => {
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
              func = _fetchDatatypeProperty;
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
      try {
        _checkIri(individual.iri);
      } catch (err) {
        return Promise.reject(err);
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
    const _fetchIndividualIrisForClass = (classIri) => {
      if (!classIri) {
        Promise.reject(new Error('ClassIri is undefined.'));
      }
      return new Promise((resolve, reject) => {
        _fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-individual'), 'object').then((result, err) => {
          if (!angular.isUndefined(err)) {
            reject(err);
          } else {
            const instanceIris = [];
            result.forEach((item) => {
              instanceIris.push(item.x);
            });
            resolve(instanceIris);
          }
        });
      });
    };

    const _removeAllIndividualProperties = (subject, property) => {
      if (angular.isUndefined(subject)) {
        return Promise.reject(new Error('Subject must not be undefined.'));
      }
      if (!(subject instanceof OwlIndividual)) {
        return Promise.reject(new Error('Subject must be of type OwlIndividual.'));
      }
      if (angular.isUndefined(property)) {
        return Promise.reject(new Error('Property must not be undefined.'));
      }
      if (!((property instanceof OwlObjectProperty) || (property instanceof OwlDatatypeProperty))) {
        return Promise.reject(new Error('Property must be of type OwlObjectProperty or OwlDatatypeProperty.'));
      }
      return new Promise((resolve, reject) => {
        // get all properties
        db.get({
          subject: subject.iri,
          predicate: property.iri,
        }, function(err, results) {
          if (err) {
            reject(err);
          } else {
            db.del(results, function(err2) {
              if (err2) {
                reject(err2);
              } else {
                resolve();
              }
            });
          }
        });
      });
    };

    const _addOrRemoveIndividualProperty = (subject, property, object, type) => {
      if (angular.isUndefined(subject)) {
        return Promise.reject(new Error('Subject must not be undefined.'));
      }
      if (!(subject instanceof OwlIndividual)) {
        return Promise.reject(new Error('Subject must be of type OwlIndividual.'));
      }
      if (angular.isUndefined(property)) {
        return Promise.reject(new Error('Property must not be undefined.'));
      }
      if (!((property instanceof OwlObjectProperty) || (property instanceof OwlDatatypeProperty))) {
        return Promise.reject(new Error('Property must be of type OwlObjectProperty or OwlDatatypeProperty.'));
      }
      if (angular.isUndefined(object)) {
        return Promise.reject(new Error('Object must not be undefined.'));
      }
      if ((property instanceof OwlObjectProperty) && !(object instanceof OwlIndividual)) {
        return Promise.reject(new Error('Object must be of type OwlIndividual.'));
      }
      let func;
      if (type === 'add') {
        func = db.put;
      }
      if (type === 'remove') {
        func = db.del;
      }
      if (angular.isUndefined(func)) {
        return Promise.resolve();
      }
      const triple = {
        subject: subject.iri,
        predicate: property.iri
      };
      if (property instanceof OwlObjectProperty) {
        triple.object = object.iri;
      }
      if (property instanceof OwlDatatypeProperty) {
        triple.object = `"${object}"`;
      }
      return new Promise((resolve, reject) => {
        func(triple, function(err) {
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
         _fetchOntologyIri()
        ]);
      },
      isInitialized: () => {
        return !angular.isUndefined(db);
      },
      iriExists: (iri) => {
        return _iriExists(iri);
      },
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
      fetchAllDatatypeProperties() {
        return _fetchAllForType(_iriFor('owl-datatypeProperty'));
      },
      fetchClass(classIri) {
        return _fetchClass(classIri);
      },
      insertIndividual: (individual) => {
        return _insertIndividual(individual);
      },
      addIndividualProperty: (subject, property, object) => {
        return _addOrRemoveIndividualProperty(subject, property, object, 'add');
      },
      removeIndividualProperty: (subject, property, object) => {
        return _addOrRemoveIndividualProperty(subject, property, object, 'remove');
      },
      removeAllIndividualProperties: (subject, property) => {
        return _removeAllIndividualProperties(subject, property);
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
      clear: _deleteAll,
      import: _importTTL,
      export: _exportTTL
    };
  }
  module.exports = OntologyDataService;

})(global.angular);