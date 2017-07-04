(function () {
  'use strict';

  function CaseOntologyDataService (OntologyDataService, CaseMetadataService) {
    const path = require('path');
    const app = require('electron').remote.app;
    const sysCfg = app.sysConfig();
    const Case = require(path.join(__dirname, '../models/Case'));

    const caseClassName = 'Fall';
    const caseNamePropertyName = 'Fallname';
    const caseEntityPropertyName = 'beinhaltet';
    const caseEntityInversePropertyName = 'ist_Bestandteil_von';

    let _caseClassIri = '';
    let _caseNamePropertyIri = '';
    let _caseEntityPropertyIri = '';
    let _caseEntityInversePropertyIri = '';
    let _cases = [];
    const regexExcludedClasses = new RegExp(`_:[a-zA-Z0-9]+|${caseClassName}`, 'g');
    let _initialized = false;

    let _objectProperties = [];
    let _datatypeProperties = [];
    let _classTree = [];
    let _classes = [];

    const _filterClasses = (classes) => {
      // filter out all classes we don't need
      return  classes.filter((c) => {
        return (c.name.search(regexExcludedClasses) < 0);
      });
    };

    const _buildClassTree = (classes) => {
      // transform classes into nodes
      const nodes = classes.map((c) => {
        return { id: c.iri, title: c.label, children: [] };
      });
      // make a map for easy lookup
      const map = new Map(nodes.map((n) =>
        [n.id, n]
      ));
      const result = [];
      // populate the children array and add nodes without parents to the result
      classes.forEach((c) => {
        const node = map.get(c.iri);
        c.parentClassIris.forEach((iri) => {
          map.get(iri).children.push(node);
        });
        if (c.parentClassIris.length === 0) {
          result.push(node);
        }
      });
      return result;
    };

    const _createCase = (identifier) => {
      return new Promise((resolve, reject) => {
        const c = new Case(identifier);
        c.name = identifier;
        c.createdBy = sysCfg.user;
        c.createdOn = new Date();
        c.lastEditedBy = sysCfg.user;
        c.lastEditedOn = new Date();
        c.description = [];
        c.status = 'open';
        OntologyDataService.insertIndividual(_convertToIndividual(c)).then(() => {
          _cases.push(c);
          return CaseMetadataService.saveCaseMetadata(c.metaData());
        }).then(() => {
          resolve(c);
        }).catch(reject);
      });
    };

    const _convertToIndividual = (case_) => {
      const ontologyIri = OntologyDataService.ontologyIri();
      const caseIri = `${ontologyIri}${case_.identifier}`;
      const individual = OntologyDataService.createIndividual(ontologyIri, [_caseClassIri], caseIri);
      individual.datatypeProperties.push({iri: _caseNamePropertyIri, label: caseNamePropertyName, target: case_.name});
      individual.objectProperties = case_.individualIris.map((iri) => {
        return { iri: _caseEntityPropertyIri, label: caseEntityPropertyName, target: iri};
      });
      if (case_.description.length > 0) {
        individual.comments.push(case_.description);
      }
      return individual;
    };

    const _saveAsIndividual = (object) => {
      if (!object) {
        return Promise.reject(new Error('Object must not be undefined'));
      }
      if (!object.label) {
        return Promise.reject(new Error('Object label must not be undefined'));
      }
      if (!object["class"]) {
        return Promise.reject(new Error('Object class must not be undefined'));
      }
      return new Promise((resolve, reject) => {
        const ontologyIri = OntologyDataService.ontologyIri();
        const iri = `${ontologyIri}${object.label}`;
        const oldIri = `${ontologyIri}${object.oldLabel}`;
        const individual = OntologyDataService.createIndividual(ontologyIri, [object["class"]], iri);
        if (object.comment) {
          individual.comments.push(object.comment);
        }
        if (object.cases && Array.isArray(object.cases)) {
          object.cases.forEach((c) => {
            individual.objectProperties.push({iri: _caseEntityInversePropertyIri, target: `${ontologyIri}${c}`});
          });
        }
        if (object.objectRelations && Array.isArray(object.objectRelations)) {
          object.objectRelations.forEach((prop) => {
            individual.objectProperties.push({iri: prop.relation, target: prop.target});
          });
        }
        if (object.reverseObjectRelations && Array.isArray(object.reverseObjectRelations)) {
          object.reverseObjectRelations.forEach((prop) => {
            individual.reverseObjectProperties.push({iri: prop.relation, target: prop.target});
          });
        }
        if (object.dataRelations && Array.isArray(object.dataRelations)) {
          object.dataRelations.forEach((prop) => {
            individual.datatypeProperties.push({iri: prop.relation, target: prop.target, type: prop.type});
          });
        }
        console.log("individual to save", individual);
        Promise.all([
          OntologyDataService.iriExists(iri),
          OntologyDataService.isIndividual(iri),
          OntologyDataService.iriExists(oldIri),
          OntologyDataService.isIndividual(oldIri)
        ]).then((result) => {
          // remove phase

          // if individual was renamed
          if (object.label !== object.oldLabel) {
            // if new iri already exists, throw error
            if (result[0] === true) {
              throw new Error(`Ontology already contains entity with iri ${iri}`);
            }
          } else {
            // if iri exists & entity is not an individual, throw error
            if ((result[0] === true) && (result[1] !== true )) {
              throw new Error('Entity with iri ${iri} is not an individual');
            }
          }

          // if iri exists & entity is an individual, remove entity
          if ((result[2] === true) && (result[3] === true )) {
            return OntologyDataService.removeIndividual(individual);
          }
          // else, nothing to do
          return true;
        }).then(() => {
          //insert individual
          return OntologyDataService.insertIndividual(individual);
        }).then(resolve)
          .catch(reject);
      });
    };
    const _createAndAddIndividual = (classIri, instanceName, case_) => {
      if (!classIri) {
        return Promise.reject(new Error('Class iri is undefined.'));
      }
      if (!instanceName) {
        return Promise.reject(new Error('Instance name is undefined.'));
      }
      if (!case_) {
        return Promise.reject(new Error('Case is undefined.'));
      }
      return new Promise((resolve, reject) => {
        const ontologyIri = OntologyDataService.ontologyIri();
        const individual = OntologyDataService.createIndividual(ontologyIri, [classIri], `${ontologyIri}${instanceName}`);
        individual.objectProperties.push({
          iri: _caseEntityInversePropertyIri,
          label: caseEntityInversePropertyName,
          target: `${ontologyIri}${case_.identifier}`
        });
        OntologyDataService.insertIndividual(individual).then(() => {
          resolve(individual);
        }).catch(reject);
      });
    };
    const _addOrRemoveProperty = (individual, property, target, type) => {
      if (angular.isUndefined(individual)) {
        return Promise.reject(new Error('Individual must not be null!'));
      }
      if (angular.isUndefined(property)) {
        return Promise.reject(new Error('Property must not be null!'));
      }
      if (angular.isUndefined(target)) {
        return Promise.reject(new Error('Target must not be null!'));
      }
      if (angular.isUndefined(type)) {
        return Promise.reject(new Error('Type must not be null!'));
      }
      if ((type !== 'add') && (type !== 'remove')) {
        return Promise.reject(new Error('Type must be "add" or "remove"!'));
      }

      return new Promise((resolve, reject) => {
        let promise;
        if (type === 'add') {
          promise = OntologyDataService.addIndividualProperty(individual, property, target);
        }
        if (type === 'remove') {
          promise = OntologyDataService.removeIndividualProperty(individual, property, target);
        }
        if (promise) {
          promise.then(() => {
            return OntologyDataService.fetchIndividual(individual.iri, {datatypeProperties: true, objectProperties: true});
          }).then((result) => {
            _cases.forEach((c) => {
              c.individuals = c.individuals.map((i) => {
                if (i.iri === result.iri) {
                  return result;
                }
                return i;
              });
            });
            resolve(individual);
          }).catch(reject);
        }
      });
    };

    const _renameIndividual = (individualIri, newName) => {
      if (!individualIri) {
        return Promise.reject(new Error('Individual iri must not be null!'));
      }
      if (!angular.isString(individualIri)) {
        return Promise.reject(new Error('Individual iri must be a string!'));
      }
      if (!newName) {
        return Promise.reject(new Error('New name must not be null!'));
      }
      if (!angular.isString(newName)) {
        return Promise.reject(new Error('New name must be a string!'));
      }
      return new Promise((resolve, reject) => {
        const newIri = `${OntologyDataService.ontologyIri()}${newName}`;
        if (newIri === individualIri) {
          resolve(newIri);
          return
        }
        OntologyDataService.iriExists(newIri).then((result) => {
          if (result === true) {
            throw new Error('Name already exists!');
          }
          return OntologyDataService.changeIri(individualIri, newIri);
        }).then(() => {
          return OntologyDataService.fetchIndividual(newIri, {datatypeProperties: true, objectProperties: true});
        }).then((result) => {
          _cases.forEach((c) => {
            c.individuals = c.individuals.map((i) => {
              if (i.iri === individualIri) {
                return result;
              }
              return i;
            });
          });

          resolve(result);
        }).catch((err) => {
          reject(err);
        });
      });
    };
    const _saveCase = (case_) => {
      if (!case_) {
        return Promise.reject(new Error('Case must not be null!'));
      }
      if (!(case_ instanceof Case)) {
        return Promise.reject(new Error('Case must be of type Case!'));
      }
      case_.metaData.lastEditedBy = sysCfg.user;
      case_.metaData.lastEditedOn = new Date();
      return new Promise((resolve, reject) => {
        const individual = _convertToIndividual(case_);
        let nameProperty;

        _datatypeProperties.forEach((prop) => {
          if (prop.label === caseNamePropertyName) {
            nameProperty = prop;
          }
        });
        OntologyDataService.removeIndividual(individual).then(() => {
          return OntologyDataService.insertIndividual(individual);
        }).then(() => {
          return CaseMetadataService.saveCaseMetadata(case_.metaData);
        }).then(resolve)
          .catch(reject);
      });
    };
    const _removeIndividual = (individualIri) => {
      if (!individualIri) {
        return Promise.reject(new Error('Individual iri must not be null!'));
      }
      // TODO: if individual is a member of several cases, it shouldn't be deleted completely
      return OntologyDataService.removeEntity(individualIri);
    };


    const _getCaseIdentifiersFor = (individualIri) => {
      if (!individualIri) {
        throw Error('Iri may not be undefined.');
      }
      return new Promise((resolve, reject) => {
        Promise.all([
          OntologyDataService.fetchIndividualIrisWith(_caseEntityPropertyIri, individualIri, 'subject'),
          OntologyDataService.fetchIndividualIrisWith(_caseEntityInversePropertyIri, individualIri, 'object')
        ]).then((result) => {
          const identifiers = result[0]
            .concat(result[1])
            .reduce((accumulator, iri) => {
              if ((iri) && (accumulator.indexOf(iri) < 0)) {
                accumulator.push(iri);
              }
              return accumulator;
            }, [])
            .map((iri) => {
              return iri.replace(OntologyDataService.ontologyIri() ,'');
            });
          resolve(identifiers);
        }).catch(reject);
      });
    };

    const _convertFromIndividual = (individual) => {
      const c = new Case(individual.label, individual.comments);
      let name = individual.datatypeProperties.find((prop) => {
        return prop.iri === _caseNamePropertyIri;
      });
      if (name === undefined) {
        c.name = individual.label;
      } else {
        c.name = name.target;
      }

      // add all individual iris that are connected to the case
      c.individualIris = individual.objectProperties
        .concat(individual.reverseObjectProperties)
        .filter((prop) => {
          return (prop.iri === _caseEntityPropertyIri || prop.iri === _caseEntityInversePropertyIri);
        })
        .map((prop) => {
          return prop.target;
        })
        .reduce((accumulator, iri) => {
          if (accumulator.indexOf(iri) < 0) {
            accumulator.push(iri);
          }
          return accumulator;
        }, []);
      return c;
    };
    const _loadIndividual = (iri) => {
      return new Promise((resolve, reject) => {
        Promise.all([
          OntologyDataService.fetchIndividual(iri, {
            comments: true,
            datatypeProperties: true,
            objectProperties: true,
            reverseObjectProperties: true
          }),
          _getCaseIdentifiersFor(iri)
        ]).then((result) => {
          result[0].objectProperties = result[0].objectProperties.filter((prop) => {
            return prop.iri !== _caseEntityInversePropertyIri;
          });
          result[0].cases = result[1];
          resolve(result[0]);
        }).catch(reject);
      });
    };


    const _loadCaseList = () => {
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchIndividualsForClass(_caseClassIri, {
          datatypeProperties: true,
          comments: true
        }).then((individuals) => {
          const promises = individuals.map((individual) => {
            const c = _convertFromIndividual(individual);
            return Promise.all([
              Promise.resolve(c),
              CaseMetadataService.retrieveCaseMetadata(c.identifier)
            ]);
          });
          return Promise.all(promises);
        }).then((result) => {
          const cases = result.map((r) => {
            r[0].metaData = r[1];
            return r[0];
          });
          resolve(cases);
        }).catch(reject);
      });
    };

    const _loadCase2 = (caseIdentifier, withIndividuals) => {
      if (!caseIdentifier) {
        return Promise.reject(Error("Case Identifier must not be undefined."));
      }
      return new Promise((resolve, reject) => {
        const caseIri = `${OntologyDataService.ontologyIri()}${caseIdentifier}`;
        let case_;
        OntologyDataService.fetchIndividual(caseIri, {
          objectProperties: true,
          reverseObjectProperties: true,
          datatypeProperties: true,
          comments: true
        }).then((individual) => {
          case_ = _convertFromIndividual(individual);
          let promises = [];
          if (withIndividuals === true) {
            promises = case_.individualIris.map((iri) => {
              return OntologyDataService.fetchIndividual(iri, {
                datatypeProperties: true,
                objectProperties: true,
                parentClassIris: true,
                allParentClassIris: true
              });
            });
          }
          return Promise.all(promises);
        }).then((individuals) => {
          case_.individuals = individuals;
          return  CaseMetadataService.retrieveCaseMetadata(case_.identifier);
        }).then((metaData) => {
          case_.metaData = metaData;
          resolve(case_);
        }).catch(reject);
      });
    };

    const _createMetadataForCases = () => {
      const promises = [];
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchIndividualsForClass(_caseClassIri).then((individuals) => {
          individuals.forEach((individual) => {
            CaseMetadataService.retrieveCaseMetadata(individual.label)
              .then()
              .catch((err) => {
                if (err.status === 404) {
                  const metadata = CaseMetadataService.createCaseMetadata(individual.label, sysCfg.user, new Date());
                  promises.push(CaseMetadataService.saveCaseMetadata(metadata));
                } else {
                  throw err;
                }
              });
          });
          return Promise.all(promises);
        }).then(resolve)
          .catch(reject);
      });
    };

    const _initialize = () => {
      if (_initialized === true) {
        return Promise.resolve(_cases);
      }
      return new Promise((resolve, reject) => {
        Promise.all([
          OntologyDataService.initialize(),
          CaseMetadataService.initialize()
        ]).then(() => {
          _caseClassIri = `${OntologyDataService.ontologyIri()}${caseClassName}`;
          _caseNamePropertyIri = `${OntologyDataService.ontologyIri()}${caseNamePropertyName}`;
          _caseEntityPropertyIri = `${OntologyDataService.ontologyIri()}${caseEntityPropertyName}`;
          _caseEntityInversePropertyIri = `${OntologyDataService.ontologyIri()}${caseEntityInversePropertyName}`;

          return Promise.all([
            OntologyDataService.fetchAllObjectProperties(),
            OntologyDataService.fetchAllDatatypeProperties(),
            OntologyDataService.fetchAllClasses({superClasses: true})
          ]);
        }).then((result) => {
          _objectProperties = result[0];
          _datatypeProperties = result[1];
          _classes = _filterClasses(result[2]);
          _classTree = _buildClassTree(_classes);
          _initialized = true;
          resolve();
        }).catch(reject);
      });
    };


    return {
      initialize: () => {
        return _initialize();
      },
      createCase: (identifier) => {
        return _createCase(identifier);
      },
      saveCase: (c) => {
        return _saveCase(c);
      },
      reset: () => {
        _initialized = false;
      },
      getClasses: () => {
        return _classes;
      },
      getObjectProperties: () => {
        return _objectProperties;
      },
      getDatatypeProperties: () => {
        return _datatypeProperties;
      },
      createAndAddIndividual: (classIri, instanceName, case_) => {
        return _createAndAddIndividual(classIri, instanceName, case_);
      },
      removeIndividual: (individualIri) => {
        return _removeIndividual(individualIri);
      },
      classTree: () => {
        return Promise.resolve(_classTree);
      },
      saveAsIndividual: (object) => {
        return _saveAsIndividual(object);
      },
      addObjectProperty: (individual, property, target) => {
        return _addOrRemoveProperty(individual, property, target, 'add');
      },
      addDatatypeProperty: (individual, property, target) => {
        return _addOrRemoveProperty(individual, property, target, 'add');
      },
      removeObjectProperty: (individual, property, target) => {
        return _addOrRemoveProperty(individual, property, target, 'remove');
      },
      removeDatatypeProperty: (individual, property, target) => {
        return _addOrRemoveProperty(individual, property, target, 'remove');
      },
      renameIndividual: (individualIri, newName) => {
        return _renameIndividual(individualIri, newName);
      },
      loadCaseList: () => {
        return _loadCaseList();
      },
      loadCase: (identifier, withIndividuals) => {
        return _loadCase2(identifier, withIndividuals);
      },
      loadIndividual: (iri) => {
        return _loadIndividual(iri);

      },
      createMetadataForCases: () => {
        return _createMetadataForCases();
      },
      getCaseIdentifiersFor: (individualIri) => {
        return _getCaseIdentifiersFor(individualIri);
      },
      isCaseIndividual: (individual) => {
        return individual.classIris.indexOf(`${OntologyDataService.ontologyIri()}${caseClassName}`) > -1;
      }
    };
  }
  module.exports = CaseOntologyDataService;
})();
