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
  function OntologyDataService(LevelGraphDBService) {
    let db;
    const path = require('path');
    const fs = require('fs');

    const OwlIndividual = require(path.join(__dirname, '../models/OwlIndividual'));
    const OwlClass = require(path.join(__dirname, '../models/OwlClass'));
    const OwlObjectProperty = require(path.join(__dirname, '../models/OwlObjectProperty'));
    const OwlDatatypeProperty = require(path.join(__dirname, '../models/OwlDatatypeProperty'));

    const regexRemoveQuotationMarks = /^""([\w-\d:'\.`_]+)"/;
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
      if (type === 'rdfs-range') {
        return `${_iriForPrefix('rdfs')}range`;
      }
      if (type === 'rdfs-domain') {
        return `${_iriForPrefix('rdfs')}domain`;
      }
      if (type === 'case-name') {
        return `${_iriForPrefix('ontology')}Fallname`;
      }
      if (type === 'case-individual') {
        return `${_iriForPrefix('ontology')}beinhaltet_Fallinformationen`;
      }
      throw new Error(`Type: ${type} not found!`);
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
            resolve(result.map((item) => {
              return item.x;
            }));
          }
        });
      });
    };
    const _fetchClass = (classIri, complete) => {
      if (angular.isUndefined(classIri)) {
        return Promise.reject(new Error('Class iri may not be null.'));
      }
      return new Promise((resolve, reject) => {
        const promises = [
          _fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-class'), 'subject')
        ];
        if (complete === true) {
          promises.push(_fetch(classIri, _iriFor('rdfs-comment'), _iriFor('owl-class'), 'subject'));
          promises.push(_fetch(classIri, _iriFor('rdfs-subClass'), _iriFor('owl-class'), 'subject'));
          promises.push(_fetch(classIri, _iriFor('rdfs-subClass'), _iriFor('owl-class'), 'object'));
          promises.push(_fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-individual'), 'object'));
          promises.push(_fetchObjectPropertyIrisForClassIri(classIri));
        }
        Promise.all(promises).then((result) => {
          if (angular.isUndefined(result) || (result[0].length === 0)) {
            throw new Error(`Class with iri ${classIri} not found.`);
          } else {
            const clazz = new OwlClass(_iriForPrefix('ontology'), classIri);
            angular.forEach(result[1], (comment) => {
              clazz.addComment(comment);
            });
            clazz.parentClassIris = angular.isUndefined(result[2]) ? [] : result[2];
            clazz.childClassIris = angular.isUndefined(result[3]) ? [] : result[3];
            clazz.individualIris = angular.isUndefined(result[4]) ? [] : result[4];
            clazz.objectPropertyIris = angular.isUndefined(result[5]) ? [] : result[5];
            resolve(clazz);
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _fetchEntity = (iri, complete) => {
      return new Promise((resolve, reject) => {
        db.get({
          subject: iri,
          //predicate: _iriFor('rdf-type'),
     //     predicate: db.v('y'),
      //    object: db.v('x')
        }, (err, result) => {
          if (err) {
            reject(err);
          } else {
            if (angular.isUndefined(result) || (result.length === 0)) {
              throw new Error(`Entity with iri ${iri} not found.`);
            } else {
              console.log("fetch entity", result);
              resolve(result.map((item) => {
                console.log(item);
              }));
            }
          }
        });
      });
    };
    const _fetchObjectProperty = (propertyIri, complete) => {
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
        ];
        if (complete === true) {
          promises.push(_fetch(propertyIri, predDomain, _iriFor('owl-objectProperty'), 'subject'));
          promises.push(_fetch(propertyIri, predRange, _iriFor('owl-objectProperty'), 'subject'));
          promises.push(_fetch(propertyIri, predInverseOf, _iriFor('owl-objectProperty'), 'subject'));
          promises.push(_fetch(propertyIri, _iriFor('rdfs-comment'), _iriFor('owl-objectProperty'), 'subject'));
        }

        Promise.all(promises).then((result) => {
          if (angular.isUndefined(result) || (result[0].length === 0)) {
            throw new Error(`ObjectProperty with iri ${propertyIri} not found.`);
          }
          const property = new OwlObjectProperty(_iriForPrefix('ontology'), propertyIri);
          angular.forEach(result[0], (item) => {
            if (item === symmetricProp) {
              property.symmetric = true;
            }
          });

          property.domainIris = !angular.isUndefined(result[1]) ? [] : result[1];
          property.rangeIris = !angular.isUndefined(result[2]) ? [] : result[2];
          property.inverseOfIris = !angular.isUndefined(result[3]) ? [] : result[3];
          property.comments = !angular.isUndefined(result[4]) ? [] : result[4];

          resolve(property);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _fetchDatatypeProperty = (propertyIri, complete) => {
      if (angular.isUndefined(propertyIri)) {
        return Promise.reject(new Error('Property iri may not be null.'));
      }
      return new Promise((resolve, reject) => {
        const predDomain = `${_iriForPrefix('rdfs')}domain`;
        const predRange = `${_iriForPrefix('rdfs')}range`;
        const promises = [
          _fetch(propertyIri, _iriFor('rdf-type'), _iriFor('owl-datatypeProperty'), 'subject'),
        ];
        if (complete === true) {
          promises.push(_fetch(propertyIri, predDomain, _iriFor('owl-datatypeProperty'), 'subject'));
          promises.push(_fetch(propertyIri, predRange, _iriFor('owl-datatypeProperty'), 'subject'));
          promises.push(_fetch(propertyIri, _iriFor('rdfs-comment'), _iriFor('owl-datatypeProperty'), 'subject'));
        }
        Promise.all(promises).then((result) => {
          if (angular.isUndefined(result) || (result[0].length === 0)) {
            throw new Error(`DatatypeProperty with iri ${propertyIri} not found.`);
          }
          const property = new OwlDatatypeProperty(_iriForPrefix('ontology'), propertyIri);

          property.domainIris = !angular.isUndefined(result[1]) ? [] : result[1];
          property.rangeIris = !angular.isUndefined(result[2]) ? [] : result[2];
          property.comments = !angular.isUndefined(result[3]) ? [] : result[3];

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
          _fetchForIndividual(individualIri, dataPropType, false)

        ];
        if (deep === true) {
          promises.push(_fetchForIndividual(individualIri, objectPropType, false));
          promises.push(_fetchForIndividual(individualIri, objectPropType, true));
        }

        Promise.all(promises).then((result) => {
          if (angular.isUndefined(result) || (result[0].length === 0)) {
            throw new Error(`Individual with iri ${individualIri} not found.`);
          } else {
            const individual = new OwlIndividual(_iriForPrefix('ontology'), result[0][0], individualIri);
            individual.comments = result[1];
            result[2].forEach((item) => {
             //TODO: doesn't work with numerical or date time values
              /*if (typeof item.y  === 'string') {
                // remove leading and trailing quotation marks
                  value = regexRemoveQuotationMarks.exec(value)[1];
              }*/
              individual.addDatatypeProperty(item.x, _labelFor(item.x), item.y);
            });
            if (result.length === 5) {
              individual.comments = result[1];
              result[3].forEach((item) => {
                individual.addObjectProperty(item.x, _labelFor(item.x), item.y);
              });
              result[4].forEach((item) => {
                individual.addReverseObjectProperty(item.x, _labelFor(item.x), item.y);
              });
            }

            resolve(individual);
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };
    const _fetchForIndividual = function(individualIri, objType, reverse) {
      if (angular.isUndefined(individualIri)) {
        return Promise.reject(new Error('Individual iri may not be null.'));
      }
      if (angular.isUndefined(objType)) {
        return Promise.reject(new Error('Object type may not be null.'));
      }
      return new Promise((resolve, reject) => {
        //noinspection GjsLint,GjsLint
        const searchArray = [{
          subject: individualIri,
          predicate: _iriFor('rdf-type'),
          object: _iriFor('owl-individual')
        }, {
          subject: db.v('x'),
          predicate: _iriFor('rdf-type'),
          object: objType
        }];
        if (reverse === false) {
          searchArray.push({
            subject: individualIri,
            predicate: db.v('x'),
            object: db.v('y')
          });
        } else {
          searchArray.push({
            subject: db.v('y'),
            predicate: db.v('x'),
            object: individualIri
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

    const _fetchAllForType = (rdfsType, complete) => {
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
            case _iriFor('owl-individual'):
              func = _fetchIndividual;
              break;
            default: return Promise.reject(new Error(`Not found: ${rdfsType}`));
          }
          angular.forEach(iris, (iri) => {
            promises.push(func(iri, complete));
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
    const _removeIndividual = (individual) => {
      if (angular.isUndefined(individual)) {
        return Promise.reject(new Error('Individual must not be null.'));
      }
      if (typeof individual === OwlIndividual) {
        return Promise.reject(new Error('Must be of type OwlIndividual but was type of: '+typeof individual));
      }
      if (angular.isUndefined(individual.iri)) {
        return Promise.reject(new Error('Individual iri must not be null.'));
      }
     return new Promise((resolve, reject) => {
       db.get({
         subject: individual.iri
       }, function(err, results) {
         if (err) {
           reject(err);
         } else {
           let triples = results;
           db.get({
             object: individual.iri
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
        return Promise.reject(new Error('Class IRI is undefined.'));
      }
      return new Promise((resolve, reject) => {
        _fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-individual'), 'object').then((result, err) => {
          if (!angular.isUndefined(err)) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };

    const _fetchObjectPropertyIrisForClassIri = (classIri) => {
      if (angular.isUndefined(classIri)) {
        return Promise.reject(new Error('Class IRI is undefined.'));
      }
      return new Promise((resolve, reject) => {
        const searchArray = [{
          subject: classIri,
          predicate: _iriFor('rdf-type'),
          object: _iriFor('owl-class')
        }, {
          subject: db.v('x'),
          predicate: _iriFor('rdf-type'),
          object: _iriFor('owl-objectProperty')
        }, {
          subject: db.v('x'),
          predicate: db.v('y'),
          object: classIri
        }];
        db.search(searchArray, {}, function(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result.map((item) => {
              return item.x;
            }));
          }
        });
      });
    };

    const _removeIndividualProperties = (subject, property) => {
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
        db = LevelGraphDBService.initialize('ontology');

        return Promise.all([
         _fetchOntologyIri()
        ]);
      },
      isInitialized: () => {
        return !angular.isUndefined(db);
      },
      isIndividual: (object) => {
        return object instanceof  OwlIndividual;
      },
      isClass: (object) => {
        return object instanceof  OwlClass;
      },
      isObjectProperty: (object) => {
        return object instanceof  OwlObjectProperty;
      },
      iriExists: (iri) => {
        return _iriExists(iri);
      },
      createIndividual: (ontologyIri, classIri, instanceIri) => {
        return new OwlIndividual(ontologyIri, classIri, instanceIri);
      },
      changeIri(oldIri, newIri) {
        return _changeIri(oldIri, newIri);
      },
      fetchIndividual(individualIri, complete) {
        return _fetchIndividual(individualIri, complete);
      },
      fetchObjectProperty(iri, complete) {
        return _fetchObjectProperty(iri, complete);
      },
      fetchAllInstances(complete) {
        return _fetchAllForType(_iriFor('owl-individual'), complete);
      },
      fetchAllClasses(complete) {
        return _fetchAllForType(_iriFor('owl-class'), complete);
      },
      fetchAllObjectProperties(complete) {
        return _fetchAllForType(_iriFor('owl-objectProperty'), complete);
      },
      fetchAllDatatypeProperties(complete) {
        return _fetchAllForType(_iriFor('owl-datatypeProperty'), complete);
      },
      fetchClass(classIri, complete) {
        return _fetchClass(classIri, complete);
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
      removeIndividualProperties: (subject, property) => {
        return _removeIndividualProperties(subject, property);
      },
      removeIndividual: (individual) => {
        return _removeIndividual(individual);
      },
      ontologyIri: function() {
        return angular.copy(_iriForPrefix('ontology'));
      },
      fetchIndividualsForClass: (classIri, complete) => {
        return _fetchIndividualIrisForClass(classIri, complete);
      },
      fetchEntity: (iri, complete) => {
        return _fetchEntity(iri, complete);
      },
      test: () => {
        return _fetchForIndividual("http://www.AMSL/GDK/ontologie#KFZ_gestohlen_001", `${_iriForPrefix('owl')}DatatypeProperty`);
      //  return _fetchClass("http://www.AMSL/GDK/ontologie#Wirtschaftliche_Konsequenzen", true);
      },
      clear: _deleteAll,
      import: _importTTL,
      export: _exportTTL
    };
  }
  module.exports = OntologyDataService;

})(global.angular);
