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
    const _iriExists = (iri, type) => {
      if (!_isValidString(iri)) {
        return Promise.reject(new Error('Iri is no valid string.'));
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

    const _isIriValid = (iri) => {
      if (!_isValidString(iri)) {
        return false;
      }
      if (regexIriCheck.test(iri)) {
        return false;
      }
      return true;
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

    const _parseLiteralValue = (value) => {
      let match;
      if ((match = regexDatatype.exec(value)) !== null) {
        return { value: match[1], type: match[2] };
      }
      return value;
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
              func = _fetchEntity;
              break;
            case _iriFor('owl-objectProperty'):
              func = _fetchEntity;
              break;
            case _iriFor('owl-datatypeProperty'):
              func = _fetchDatatypeProperty;
              break;
            case _iriFor('owl-individual'):
              //func = _fetchIndividual;
              func = _fetchEntity;
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

    const _writeToDb = (triples) => {
      return new Promise((resolve, reject) => {
        db.put(triples, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    };

    const _insertIndividual = (individual) => {
      if (!individual) {
        return Promise.reject(new Error('Individual must not be null.'));
      }
      if (!_isIriValid(individual.iri)) {
        return Promise.reject(new Error('Individual iri is not valid.'));
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
                object: `"${comment}"`
              });
            });
            individual.objectProperties.forEach((prop) => {
              triples.push({
                subject: individual.iri,
                predicate: prop.iri,
                object: prop.target
              });
            });
            individual.reverseObjectProperties.forEach((prop) => {
              triples.push({
                subject: prop.target,
                predicate: prop.iri,
                object: individual.iri
              });
            });
            individual.datatypeProperties.forEach((prop) => {
              if (prop.type) {
                triples.push({
                  subject: individual.iri,
                  predicate: prop.iri,
                  object: `"${prop.target}"^^${prop.type}`
                });
              } else {
                triples.push({
                  subject: individual.iri,
                  predicate: prop.iri,
                  object: `"${prop.target}"`
                });
              }
            });
            return _writeToDb(triples);
          }
        }).then(resolve)
          .catch(reject);
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
            promises.push(_fetchEntity(iri, options));
          });
          return Promise.all(promises);
        }).then(resolve)
          .catch(reject);
      });
    };

    const _fetchAllParentIrisFor = (classIris, level = 1) => {
       return new Promise((resolve, reject) => {
        const promises = classIris.map((iri) => {
          const triples = [{
            subject: iri,
            predicate:  _iriFor('rdf-type'),
            object:  _iriFor('owl-class')
          }, {
            subject: iri,
            predicate:  _iriFor('rdfs-subClass'),
            object: db.v('x')
          }];
          return _search(triples, {
            materialized: { iri: db.v('x')}
          });
        });
        Promise.all(promises).then((result) => {
            const iris = result.reduce((accumulator, array) => {
              array.forEach((item) => {
                accumulator.push(item.iri);
              });
              return accumulator;
            }, []);
           resolve(iris);
        }).catch(reject);
      });
    };


    const _fetchIndividualIrisWith = (propertyIri, otherIndividualIri, type) => {
      if (!_isValidString(propertyIri)) {
        return Promise.reject(Error(`Property iri: ${propertyIri} is not valid.`));
      }
      if (!_isValidString(otherIndividualIri)) {
        return Promise.reject(Error(`Individual iri: ${otherIndividualIri} is not valid.`));
      }
      if (!_isValidString(type)) {
        return Promise.reject(Error(`Type: ${type} is not valid.`));
      }
      return new Promise((resolve, reject) => {
        const searchArray = [{
          subject: db.v('x'),
          predicate: _iriFor('rdf-type'),
          object: _iriFor('owl-individual')
        }, {
          subject: otherIndividualIri,
          predicate: _iriFor('rdf-type'),
          object: _iriFor('owl-individual')
        }, {
          subject: propertyIri,
          predicate: _iriFor('rdf-type'),
          object: _iriFor('owl-objectProperty')
        }];
        if (type === 'subject') {
          searchArray.push({
            subject: db.v('x'),
            predicate: propertyIri,
            object: otherIndividualIri
          });
        }
        if (type === 'object') {
          searchArray.push({
            subject: otherIndividualIri,
            predicate: propertyIri,
            object: db.v('x')
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

    const _get = (triples) => {
      return new Promise((resolve, reject) => {
        db.get(triples, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };
    const _search = (triples, func) => {
      return new Promise((resolve, reject) => {
        db.search(triples, func, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };

    const _assembleClass = (iri, subjectTriples, objectTriples) => {
      return new Promise((resolve, reject) => {
        const clazz = new OwlClass(_iriForPrefix('ontology'), iri);
        for (let t of subjectTriples) {
          if (t.predicate === _iriFor('rdfs-comment')) {
            const literal = _parseLiteralValue(t.object);
            clazz.comments.push(literal.value);
            continue;
          }
          if (t.predicate === _iriFor('rdfs-subClass')) {
            clazz.parentClassIris.push(t.object);
            continue;
          }
        }
        for (let t of objectTriples) {
          if (t.predicate === _iriFor('rdfs-subClass')) {
            clazz.childClassIris.push(t.subject);
            continue;
          }
          if (t.predicate === _iriFor('rdf-type')) {
            clazz.individualIris.push(t.subject);
            continue;
          }
        }
       _fetchAllParentIrisFor([iri]).then((result) => {
          clazz.allParentClassIris = result;
          resolve(clazz);
        }).catch(reject);
      });
    };
    const _assembleIndividual = (iri, subjectTriples, objectTriples) => {
      return new Promise((resolve, reject) => {
        const individual = new OwlIndividual(_iriForPrefix('ontology'), [], iri);
        const properties = [];
        for (let t of subjectTriples) {
          if ((t.predicate === _iriFor('rdf-type')) && (t.object !== _iriFor('owl-individual'))) {
            individual.classIris.push(t.object);
          }
          if (t.predicate === _iriFor('rdfs-comment')) {
            const literal = _parseLiteralValue(t.object);
            individual.comments.push(literal.value);
          }
          if (t.predicate.startsWith(_iriForPrefix('ontology'))) {
            if (properties.indexOf(t.predicate) < 0) {
              properties.push(t.predicate);
            }
          }
        }
        for (let t of objectTriples) {
          if (t.predicate.startsWith(_iriForPrefix('ontology'))) {
            if (properties.indexOf(t.predicate) < 0) {
              properties.push(t.predicate);
            }
          }
        }
        const promises = properties.map((p) => {
          return _get({ subject: p, predicate: _iriFor('rdf-type') });
        });
        promises.push(_fetchAllParentIrisFor(individual.classIris));
        //promises.push(Promise.resolve([]));

        Promise.all(promises).then((result) => {
          individual.allParentClassIris = result.pop();
          const map = result.reduce((accumulator, item) => {
            item.forEach((i) => {
             accumulator[i.subject] = i.object;
            });
            return accumulator;
          }, {});
          for (let t of subjectTriples) {
            const prop = map[t.predicate];
            if (prop === _iriFor('owl-objectProperty')) {
              individual.objectProperties.push({
                iri: t.predicate,
                label: _labelFor(t.predicate),
                target: t.object
              });
              continue;
            }
             if (prop === _iriFor('owl-datatypeProperty')) {
              const literal = _parseLiteralValue(t.object);
              individual.datatypeProperties.push({
                iri: t.predicate,
                label: _labelFor(t.predicate),
                target: literal.value,
                targetType: literal.type
              });
            }
          }
          for (let t of objectTriples) {
            const prop = map[t.predicate];
            if (prop === _iriFor('owl-objectProperty')) {
              individual.reverseObjectProperties.push({
                iri: t.predicate,
                label: _labelFor(t.predicate),
                target: t.subject
              });
            }
          }
          resolve(individual);
        }).catch(reject);
      });
    };
    const _assembleObjectProperty = (iri, subjectTriples, objectTriple) => {
      return new Promise((resolve, reject) => {
        const property = new OwlObjectProperty(_iriForPrefix('ontology'), iri);
        property.parentPropertyIris = [];
        for (let t of subjectTriples) {
          if (t.predicate === _iriFor('rdfs-comment')) {
            const literal = _parseLiteralValue(t.object);
            property.comments.push(literal.value);
            continue;
          }
          if (t.predicate === _iriFor('rdfs-subProp')) {
            property.parentPropertyIris.push(t.object);
            continue;
          }
          if (t.predicate === _iriFor('rdfs-domain')) {
            property.domainIris.push(t.object);
          }
          if (t.predicate === _iriFor('rdfs-range')) {
            property.rangeIris.push(t.object);
          }
          if (t.predicate === 'http://www.w3.org/2002/07/owl#inverseOf') {
            property.inverseOfIris.push(t.object);
          }
        }
        for (let t of objectTriple) {
          if (t.predicate === 'http://www.w3.org/2002/07/owl#inverseOf') {
            property.inverseOfIris.push(t.subject);
          }
        }
        resolve(property);
      });
    };

    const _assembleDatatypeProperty = (iri, subjectTriples, objectTriple) => {

    };

    const _fetchEntity = (iri) => {
      return new Promise((resolve, reject) => {
        Promise.all([
          _get({ subject: iri }),
          _get({ object: iri }),
        ]).then((result) => {
          if (result[0].length === 0) {
            throw Error(`Ontology does not contain an entity with iri: ${iri}.`);
          }
          const typeClass = result[0].find((r) => {
            return ((r.predicate === _iriFor('rdf-type')) && (r.object === _iriFor('owl-class')));
          });
          if (typeClass) {
            return resolve(_assembleClass(iri, result[0], result[1]));
          }
          const typeIndividual = result[0].find((r) => {
             return ((r.predicate === _iriFor('rdf-type')) && (r.object === _iriFor('owl-individual')));
          });
          if (typeIndividual) {
            return resolve(_assembleIndividual(iri, result[0], result[1]));
          }
          const typeObjectProperty = result[0].find((r) => {
            return ((r.predicate === _iriFor('rdf-type')) && (r.object === _iriFor('owl-objectProperty')));
          });
          if (typeObjectProperty) {
            return resolve(_assembleObjectProperty(iri, result[0], result[1]));
          }
          throw Error(`Type for iri ${iri} not known`);
        }).then(resolve)
          .catch(reject);
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
      fetchIndividual (individualIri, options) {
        //return _fetchIndividual(individualIri, options);
        return _fetchEntity(individualIri);
      },
      fetchObjectProperty (iri) {
        return _fetchEntity(iri);
      },
      fetchAllIndividualIris () {
        return _fetchAllIrisForType(_iriFor('owl-individual'));
      },
      fetchAllClassIris () {
        return _fetchAllIrisForType(_iriFor('owl-class'));
      },
      fetchAllIndividuals () {
        return _fetchAllForType(_iriFor('owl-individual'));
      },
      fetchAllClasses () {
        return _fetchAllForType(_iriFor('owl-class'));
      },
      fetchAllObjectProperties () {
        return _fetchAllForType(_iriFor('owl-objectProperty'));
      },
      fetchAllDatatypeProperties (options) {
        return _fetchAllForType(_iriFor('owl-datatypeProperty'), options);
      },
      fetchClass (classIri) {
        //return _fetchClass(classIri, options);
        return _fetchEntity(classIri);
      },
      insertIndividual: (individual) => {
        return _insertIndividual(individual);
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
      fetchIndividualIrisWith: (propertyIri, otherIndividualIri, type) => {
        return _fetchIndividualIrisWith(propertyIri, otherIndividualIri, type);
      },
      clear: _deleteAll,
      import: _importTTL,
      export: _exportTTL
    };
  }
  module.exports = OntologyDataService;
})();
