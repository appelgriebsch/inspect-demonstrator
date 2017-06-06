(function () {
  'use strict';

  /**
   *
   * TODO: gesamte Fehlerbehandlung muss überarbeitet werden!
   *
   * @param LevelGraphDBService
   * @returns {*}
   * @constructor
   */
  function OntologyDataService (LevelGraphDBService) {
    let db;
    const path = require('path');
    const fs = require('fs');

    const OwlIndividual = require(path.join(__dirname, '../models/OwlIndividual'));
    const OwlClass = require(path.join(__dirname, '../models/OwlClass'));
    const OwlObjectProperty = require(path.join(__dirname, '../models/OwlObjectProperty'));
    const OwlDatatypeProperty = require(path.join(__dirname, '../models/OwlDatatypeProperty'));

    const regexDatatype = /"([^"]+)"(?:\^\^(.+))?/;
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
        db.search({
          subject: db.v('subject'),
          predicate: db.v('predicate'),
          object: db.v('object')
        }, {}, function (err, result) {
          if (err) {
            reject(err);
          } else {
            const promises = result.map((o) => {
              return new Promise((resolve2, reject2) => {
                db.del(o, function (err2) {
                  if (err2) {
                    reject2(err2);
                  } else {
                    resolve2();
                  }
                });
              });
            });
            Promise.all(promises)
              .then(resolve)
              .catch(reject);
          }
        });
      });
    };
    const _importTTL = (path) => {
      return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(path)
          .pipe(db.n3.putStream());

        stream.on('finish', function () {
          _fetchOntologyIri().then(() => {
            resolve(db);
          });
        });

        stream.on('error', function (err) {
          reject(err);
        });
      });
    };

    const _exportTTL = (path) => {
      if (!db) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(path);
        const dbStream = db.searchStream({
          subject: db.v('s'),
          predicate: db.v('p'),
          object: db.v('o')
        }, {
          n3: {
            subject: db.v('s'),
            predicate: db.v('p'),
            object: db.v('o')
          }
        });
        fileStream.on('finish', () => {
          resolve();
        });
        fileStream.on('error', (err) => {
          reject(err);
        });
        dbStream.pipe(fileStream);
      });
    };

    const _fetchOntologyIri = () => {
      return new Promise((resolve, reject) => {
        const owlURI = _iriForPrefix('owl');
        const ontologyNode = `${owlURI}Ontology`;
        db.get({
          predicate: _iriFor('rdf-type'),
          object: ontologyNode

        }, function (err, results) {
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

    const _prefixForIRI = function (iri) {
      const item = knownIris.find((entry) => {
        return entry.iri === iri;
      });
      return item ? item.prefix : iri;
    };

    const _iriForPrefix = function (prefix) {
      const item = knownIris.find((entry) => {
        return entry.prefix === prefix;
      });
      return item ? item.iri : prefix;
    };

    const _iriFor = function (type) {
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
      if ((!iri) || (typeof iri !== 'string')) {
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
      if (!iri) {
        return Promise.reject(new Error('Iri may not be null.'));
      }
      return new Promise((resolve, reject) => {
        db.get({
          subject: iri
        }, function (err, results) {
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

    const _isValidString = (str) => {
      if (!str) {
        return false;
      }
      if (typeof str !== 'string') {
        return false;
      }
      return (!((str.length === 0) || (str.trim().length === 0)));
    };

    //TODO: remove
    const _isIriValid = (iri) => {
      if (iri === undefined) {
        throw new Error('Iri may not be undefined.');
      }
      if (iri === null) {
        throw new Error('Iri may not be null.');
      }
      if (typeof iri !== 'string') {
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
      if (!db) {
        return Promise.resolve([]);
      }

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
        db.search(searchArray, {}, function (err, result) {
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
    /**
     *
     * @param classIri
     * @param options determines what information to load, can involve: comments, subClasses, superClasses, individuals, objectProperties, datatypeProperties
     * @returns {*}
     * @private
     */
    const _fetchClass = (classIri, options) => {
      try {
        _isIriValid(classIri);
      } catch (err) {
        return Promise.reject(err);
      }
      if (!options) {
        options = {};
      }
      return new Promise((resolve, reject) => {
        const promises = [
          _fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-class'), 'subject')
        ];
        if (options.comments === true) {
          promises.push(_fetch(classIri, _iriFor('rdfs-comment'), _iriFor('owl-class'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.subClasses === true) {
          promises.push(_fetch(classIri, _iriFor('rdfs-subClass'), _iriFor('owl-class'), 'object'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.superClasses === true) {
          promises.push(_fetch(classIri, _iriFor('rdfs-subClass'), _iriFor('owl-class'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.individuals === true) {
          promises.push(_fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-individual'), 'object'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.objectProperties === true) {
          promises.push(_fetchObjectPropertyIrisForClassIri(classIri));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.datatypeProperties === true) {
          // TODO: implement
          // promises.push(_fetchDatatypePropertyIrisForClassIri(classIri));
          promises.push(Promise.resolve([]));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.allParentClassIris === true) {
          promises.push(_fetchAllParentIrisFor([classIri]));
        } else {
          promises.push(Promise.resolve([]));
        }
        Promise.all(promises).then((result) => {
          if (!(result) || (result[0].length === 0)) {
            throw new Error(`Class with iri ${classIri} not found.`);
          } else {
            const clazz = new OwlClass(_iriForPrefix('ontology'), classIri);
            clazz.comments = result[1];
            clazz.childClassIris = result[2];
            clazz.parentClassIris = result[3];
            clazz.individualIris = result[4];
            clazz.objectPropertyIris = result[5];
            clazz.allParentClassIris = result[7];

            resolve(clazz);
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };
    const _fetchObjectProperty = (propertyIri, options) => {
      if (propertyIri === undefined) {
        return Promise.reject(new Error('Property iri may not be null.'));
      }
      if (!options) {
        options = {};
      }
      return new Promise((resolve, reject) => {
        const predDomain = `${_iriForPrefix('rdfs')}domain`;
        const predRange = `${_iriForPrefix('rdfs')}range`;
        const predInverseOf = `${_iriForPrefix('owl')}inverseOf`;
        const symmetricProp = `${_iriForPrefix('owl')}SymmetricProperty`;
        const promises = [
          _fetch(propertyIri, _iriFor('rdf-type'), _iriFor('owl-objectProperty'), 'subject')
        ];
        if (options.comments === true) {
          promises.push(_fetch(propertyIri, _iriFor('rdfs-comment'), _iriFor('owl-objectProperty'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.domain === true) {
          promises.push(_fetch(propertyIri, predDomain, _iriFor('owl-objectProperty'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.range === true) {
          promises.push(_fetch(propertyIri, predRange, _iriFor('owl-objectProperty'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.inverse === true) {
          promises.push(_fetch(propertyIri, predInverseOf, _iriFor('owl-objectProperty'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        Promise.all(promises).then((result) => {
          if (!(result) || (result[0].length === 0)) {
            reject(new Error(`ObjectProperty with iri ${propertyIri} not found.`));
          } else {
            const property = new OwlObjectProperty(_iriForPrefix('ontology'), propertyIri);
            property.comments = result[1];
            property.domainIris = result[2];
            property.rangeIris = result[3];
            property.inverseOfIris = result[4];
            resolve(property);
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _fetchDatatypeProperty = (propertyIri, options) => {
      if (!propertyIri) {
        return Promise.reject(new Error('Property iri may not be null.'));
      }
      if (!options) {
        options = {};
      }
      return new Promise((resolve, reject) => {
        const predDomain = `${_iriForPrefix('rdfs')}domain`;
        const predRange = `${_iriForPrefix('rdfs')}range`;
        const promises = [
          _fetch(propertyIri, _iriFor('rdf-type'), _iriFor('owl-datatypeProperty'), 'subject')
        ];
        if (options.comments === true) {
          promises.push(_fetch(propertyIri, _iriFor('rdfs-comment'), _iriFor('owl-datatypeProperty'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.domain === true) {
          promises.push(_fetch(propertyIri, predDomain, _iriFor('owl-datatypeProperty'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.range === true) {
          promises.push(_fetch(propertyIri, predRange, _iriFor('owl-datatypeProperty'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        Promise.all(promises).then((result) => {
          if (!(result) || (result[0].length === 0)) {
            throw new Error(`DatatypeProperty with iri ${propertyIri} not found.`);
          }
          const property = new OwlDatatypeProperty(_iriForPrefix('ontology'), propertyIri);
          property.comments = result[1];
          property.domainIris = result[2];
          property.rangeIris = result[3];

          resolve(property);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _parseDatatypePropertyValue = (value) => {
      let match;
      if ((match = regexDatatype.exec(value)) !== null) {
        return { value: match[1], type: match[2] };
      }
    };

    const _fetchIndividual = (individualIri, options) => {
      return new Promise((resolve, reject) => {
        if (_isValidString(individualIri) !== true) {
          throw Error(`Iri ${individualIri} is not a valid string.`);
        }
        if (!options) {
          options = {};
        }

        const dataPropType = `${_iriForPrefix('owl')}DatatypeProperty`;
        const objectPropType = `${_iriForPrefix('owl')}ObjectProperty`;
        const promises = [
          _fetch(individualIri, _iriFor('rdf-type'), _iriFor('owl-individual'), 'subject')
        ];
        if (options.comments === true) {
          promises.push(_fetch(individualIri, _iriFor('rdfs-comment'), _iriFor('owl-individual'), 'subject'));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.datatypeProperties === true) {
          promises.push(_fetchForIndividual(individualIri, dataPropType, false));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.objectProperties === true) {
          promises.push(_fetchForIndividual(individualIri, objectPropType, false));
        } else {
          promises.push(Promise.resolve([]));
        }
        if (options.reverseObjectProperties === true) {
          promises.push(_fetchForIndividual(individualIri, objectPropType, true));
        } else {
          promises.push(Promise.resolve([]));
        }
        let individual;
        Promise.all(promises).then((result) => {
          if (!(result) || (result[0].length === 0)) {
            throw new Error(`Individual with iri ${individualIri} not found.`);
          }
          const classIris = result[0].filter((iri) => {
            return iri.startsWith(_iriForPrefix('ontology'));
          });
          individual = new OwlIndividual(_iriForPrefix('ontology'), classIris, individualIri);
          individual.comments = result[1];

          individual.datatypeProperties = result[2].map((item) => {
            const parsedItem = _parseDatatypePropertyValue(item.y);
            if (parsedItem) {
              // TODO: do something about the potential type of a DatatypeProperty
              return {
                iri: item.x,
                label: _labelFor(item.x),
                target: parsedItem.value,
                targetType: parsedItem.type
              };
            }
            throw Error(`Could not parse value: ${item}`);
          });

          individual.objectProperties = result[3].map((item) => {
            return {
              iri: item.x,
              label: _labelFor(item.x),
              target: item.y
            };
          });

          individual.reverseObjectProperties = result[4].map((item) => {
            return {
              iri: item.x,
              label: _labelFor(item.x),
              target: item.y
            };
          });
          if (options.allParentClassIris === true) {
            return _fetchAllParentIrisFor(classIris);
          } else {
            return Promise.resolve([]);
          }
        }).then((result) => {
          individual.allParentClassIris = result;
          resolve(individual);
        }).catch(reject);
      });
    };
    const _fetchForIndividual = function (individualIri, objType, reverse) {
      if (!individualIri) {
        return Promise.reject(new Error('Individual iri may not be null.'));
      }
      if (!objType) {
        return Promise.reject(new Error('Object type may not be null.'));
      }
      return new Promise((resolve, reject) => {
        // noinspection GjsLint,GjsLint
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

        db.search(searchArray, {}, function (err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };

    const _fetchAllForType = (rdfsType, options) => {
      return new Promise((resolve, reject) => {
        _fetchAllIrisForType(rdfsType).then((iris) => {
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
          const promises = iris.map((iri) => {
            return func(iri, options);
          });
          return Promise.all(promises);
        }).then(resolve)
          .catch(reject);
      });
    };

    const _fetchAllIrisForType = (rdfsType) => {
      if (!db) {
        return Promise.resolve([]);
      }
      if (!rdfsType) {
        return Promise.reject(new Error('Type may not be null.'));
      }
      if (!rdfsType) {
        return Promise.reject(new Error('Type must be a string.'));
      }
      if (rdfsType.length === 0) {
        return Promise.reject(new Error('Type may not be empty.'));
      }
      return new Promise((resolve, reject) => {
        db.get({
          predicate: _iriFor('rdf-type'),
          object: rdfsType
        }, function (err, result) {
          if (err) {
            reject(err);
          } else {
            const iris = result.map((value) => {
              return value.subject;
            });
            resolve(iris);
          }
        });
      });
    };
    const _removeEntity = (iri) => {
      if (!iri) {
        return Promise.reject(new Error('Iri must not be null.'));
      }
      return new Promise((resolve, reject) => {
        db.get({
          subject: iri
        }, function (err, results) {
          if (err) {
            reject(err);
          } else {
            let triples = results;
            db.get({
              object: iri
            }, function (err2, results2) {
              if (err2) {
                reject(err2);
              } else {
                triples = triples.concat(results2);
                db.del(triples, function (err3) {
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

    const _removeIndividual = (individual) => {
      if (!individual) {
        return Promise.reject(new Error('Individual must not be null.'));
      }
      if (typeof individual === OwlIndividual) {
        return Promise.reject(new Error('Must be of type OwlIndividual but was type of: ' + typeof individual));
      }
      if (!individual.iri) {
        return Promise.reject(new Error('Individual iri must not be null.'));
      }
      return new Promise((resolve, reject) => {
        db.get({
          subject: individual.iri
        }, function (err, results) {
          if (err) {
            reject(err);
          } else {
            let triples = results;
            db.get({
              object: individual.iri
            }, function (err2, results2) {
              if (err2) {
                reject(err2);
              } else {
                triples = triples.concat(results2);
                db.del(triples, function (err3) {
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
      if (!individual) {
        return Promise.reject(new Error('Individual must not be null.'));
      }
      try {
        _isIriValid(individual.iri);
      } catch (err) {
        return Promise.reject(err);
      }
      return new Promise((resolve, reject) => {
        _iriExists(individual.iri).then((exists) => {
          if (exists === true) {
            throw Error(`Iri: ${individual.iri} already exists!`);
          } else {
            const triples = [{
              subject: individual.iri,
              predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
              object: 'http://www.w3.org/2002/07/owl#NamedIndividual'
            }];
            // classes
            individual.classIris.forEach((iri) => {
              triples.push({
                subject: individual.iri,
                predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                object: iri
              });
            });
            // comments
            individual.comments.forEach((comment) => {
              triples.push({
                subject: individual.iri,
                predicate: 'http://www.w3.org/2000/01/rdf-schema#comment',
                object: comment
              });
            });
            individual.objectProperties.forEach((prop) => {
              triples.push({
                subject: individual.iri,
                predicate: prop.iri,
                object: prop.target
              });
            });
            individual.datatypeProperties.forEach((prop) => {
              triples.push({
                subject: individual.iri,
                predicate: prop.iri,
                object: `"${prop.target}"`
              });
            });
            const promises = [];
            promises.push(new Promise((resolve2, reject2) => {
              db.put(triples, function (err2) {
                if (err2) {
                  reject2(err2);
                } else {
                  resolve2([]);
                }
              });
            }));
            return Promise.all(promises);
          }
        }).then(resolve)
          .catch(reject);
      });
    };

    const _changeIri = (oldIri, newIri) => {
      if (!oldIri) {
        return Promise.reject(new Error('Old Iri must not be null.'));
      }
      if (!newIri) {
        return Promise.reject(new Error('New Iri must not be null.'));
      }
      const _update = (oldTriple, newTriple) => {
        return new Promise((resolve, reject) => {
          db.del(oldTriple, function (err) {
            db.put(newTriple, function (err2) {
              resolve(true);
            });
          });
        });
      };

      return new Promise((resolve, reject) => {
        db.get({
          subject: oldIri
        }, function (err, results) {
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
                object: oldIri
              }, function (err, results) {
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
    const _fetchIndividualIrisForClass = (classIri, options) => {
      if (classIri === undefined) {
        return Promise.reject(new Error('Class iri is undefined.'));
      }
      return new Promise((resolve, reject) => {
        _fetch(classIri, _iriFor('rdf-type'), _iriFor('owl-individual'), 'object').then((result) => {
          const promises = [];
          result.forEach((iri) => {
            promises.push(_fetchIndividual(iri, options));
          });
          return Promise.all(promises);
        }).then(resolve)
          .catch(reject);
      });
    };

    const _fetchObjectPropertyIrisForClassIri = (classIri) => {
      if (classIri === undefined) {
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
        db.search(searchArray, {}, function (err, result) {
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
      if (subject === undefined) {
        return Promise.reject(new Error('Subject must not be undefined.'));
      }
      if (!(subject instanceof OwlIndividual)) {
        return Promise.reject(new Error('Subject must be of type OwlIndividual.'));
      }
      if (property === undefined) {
        return Promise.reject(new Error('Property must not be undefined.'));
      }
      if (!((property instanceof OwlObjectProperty) || (property instanceof OwlDatatypeProperty))) {
        return Promise.reject(new Error('Property must be of type OwlObjectProperty or OwlDatatypeProperty.'));
      }
      return new Promise((resolve, reject) => {
        // get all properties
        db.get({
          subject: subject.iri,
          predicate: property.iri
        }, function (err, results) {
          if (err) {
            reject(err)
          } else {
            db.del(results, function (err2) {
              if (err2) {
                reject(err2)
              } else {
                resolve()
              }
            })
          }
        })
      })
    }
    const _fetchAllParentIrisFor = (classIris) => {
      return new Promise((resolve, reject) => {
        const result = [];
        const promises = [];
        classIris.forEach((iri) => {
          if (result.indexOf(iri) < 0) {
            promises.push(_fetchClass(iri, {superClasses: true}));
          }
        });
        Promise.all(promises).then((classes) => {
          const promises = []
          classes.forEach((clazz) => {
            clazz.parentClassIris.forEach((iri) => {
              if (result.indexOf(iri) < 0) {
                result.push(iri);
                promises.push(_fetchClass(iri, {superClasses: true}));
              }
            });
          });
          return Promise.all(promises);
        }).then((classes) => {
          classes.forEach((clazz) => {
            clazz.parentClassIris.forEach((iri) => {
              result.push(iri);
            });
          });
          resolve(result);
        }).catch(reject);
      });
    };

    const _addOrRemoveIndividualProperty = (subject, property, object, type) => {
      if (!subject) {
        return Promise.reject(new Error('Subject must not be undefined.'));
      }
      if (!(subject instanceof OwlIndividual)) {
        return Promise.reject(new Error('Subject must be of type OwlIndividual.'));
      }
      if (!property) {
        return Promise.reject(new Error('Property must not be undefined.'));
      }
      if (!((property instanceof OwlObjectProperty) || (property instanceof OwlDatatypeProperty))) {
        return Promise.reject(new Error('Property must be of type OwlObjectProperty or OwlDatatypeProperty.'));
      }
      if (!object) {
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
      if (!func) {
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
        // todo: change
        triple.object = `"${object}"`;
      }
      return new Promise((resolve, reject) => {
        func(triple, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    };

    const _isOfType = (iri, type) => {
      if (!_isValidString(iri)) {
        return Promise.reject(Error(`Iri: ${iri} is not valid.`));
      }
      if (!_isValidString(type)) {
        return Promise.reject(Error(`Type: ${type} is not valid.`));
      }
      return new Promise((resolve, reject) => {
        db.get({
          subject: iri,
          predicate: _iriFor('rdf-type'),
          object: type
        }, function (err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result.length === 1);
          }
        });
      });
    };
    return {
      initialize: () => {
        if (!db) {
          db = LevelGraphDBService.initialize('ontology');
        }
        return _fetchOntologyIri();
      },
      isIndividual: (iri) => {
        return _isOfType(iri, _iriFor('owl-individual'));
      },
      isClass: (iri) => {
        return _isOfType(iri, _iriFor('owl-class'));
      },
      iriExists: (iri) => {
        return _iriExists(iri);
      },
      createIndividual: (ontologyIri, classIri, instanceIri) => {
        return new OwlIndividual(ontologyIri, classIri, instanceIri);
      },
      changeIri (oldIri, newIri) {
        return _changeIri(oldIri, newIri);
      },
      fetchIndividual (individualIri, options) {
        return _fetchIndividual(individualIri, options);
      },
      fetchObjectProperty (iri, options) {
        return _fetchObjectProperty(iri, options);
      },
      fetchAllIndividualIris () {
        return _fetchAllIrisForType(_iriFor('owl-individual'));
      },
      fetchAllClassIris () {
        return _fetchAllIrisForType(_iriFor('owl-class'));
      },
      fetchAllIndividuals (options) {
        return _fetchAllForType(_iriFor('owl-individual'), options);
      },
      fetchAllClasses (options) {
        return _fetchAllForType(_iriFor('owl-class'), options);
      },
      fetchAllObjectProperties (options) {
        return _fetchAllForType(_iriFor('owl-objectProperty'), options);
      },
      fetchAllDatatypeProperties (options) {
        return _fetchAllForType(_iriFor('owl-datatypeProperty'), options);
      },
      fetchClass (classIri, options) {
        return _fetchClass(classIri, options);
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
      removeEntity: (iri) => {
        return _removeEntity(iri);
      },
      ontologyIri: function () {
        return _iriForPrefix('ontology');
      },
      fetchIndividualsForClass: (classIri, options) => {
        return _fetchIndividualIrisForClass(classIri, options);
      },

      clear: _deleteAll,
      import: _importTTL,
      export: _exportTTL
    };
  }
  module.exports = OntologyDataService;
})();
