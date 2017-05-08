(function(angular) {
  'use strict';

  function CaseOntologyDataService($log, $filter, OntologyDataService) {
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
    let _caseEntityInverseProperty = {};
    let _caseEntityProperty = {};
    let _cases = [];
    const regexExcludedClasses = new RegExp(`_:[a-zA-Z0-9]+|${caseClassName}`, 'g');
    let _initialized = false;

    let objectProperties = [];
    let datatypeProperties = [];
    let _classTree = [];

    const _createCase = (identifier) => {
      return new Promise((resolve, reject) => {
        const c = new Case(identifier, sysCfg.user, new Date());
        c.name = identifier;
        c.description = [];
        OntologyDataService.insertIndividual(_convertToIndividual(c)).then(() => {
          _cases.push(c);
          resolve(c);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _convertToIndividual = (case_) => {
      const ontologyIri = OntologyDataService.ontologyIri();
      const caseIri = `${ontologyIri}${case_.identifier}`;
      const individual =  OntologyDataService.createIndividual(ontologyIri, [_caseClassIri], caseIri);
      individual.datatypeProperties.push({iri: _caseNamePropertyIri, label: caseNamePropertyName, target: case_.name});
      individual.objectProperties = case_.individualIris.map((iri) => {
        return { iri: _caseEntityPropertyIri, label: caseEntityPropertyName, target: iri};
      });
      if (case_.description.length > 0) {
        individual.comments.push(case_.description);
      }
      return individual;
    };


    const _buildClassTree = () => {
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchAllClasses({
          superClasses: true,
          subClasses: true
        }).then((classes) => {
          const map = {};
          const classTree = [];
          classes = classes.filter((c) => {
            return (c.name.search(regexExcludedClasses) < 0);
          });
          classes.forEach((c) => {
            if (!map[c.iri]) {
              map[c.iri] = {iri: c.iri, name: c.name, subClasses: []};
            } else {
              map[c.iri].name = c.name;
            }
            c.parentClassIris.forEach((iri) => {
              if (!map[iri]) {
                map[iri] = {iri: iri, name: c.name, subClasses: [c.iri]};
              } else {
                map[iri].subClasses.push(map[c.iri]);
              }
            });
            if (c.parentClassIris.length === 0) {
              classTree.push(map[c.iri]);
            }
          });
          resolve(classTree);
        });
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
        const caseIndividual = _convertToIndividual(case_);
        const individual = OntologyDataService.createIndividual(ontologyIri, [classIri], `${ontologyIri}${instanceName}`);
        individual.objectProperties.push({
          iri: _caseEntityInversePropertyIri,
          label: caseEntityInversePropertyName,
          target: caseIndividual.iri
        });
        caseIndividual.objectProperties.push({
          iri: _caseEntityPropertyIri,
          label: caseEntityPropertyName,
          target: individual.iri
        });
        OntologyDataService.insertIndividual(individual).then(() => {
          return OntologyDataService.addIndividualProperty(caseIndividual, _caseEntityProperty, individual, 'add');
        }).then(()=> {
          resolve(individual);
        }).catch((err) => {
          reject(err);
        });
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
          }).catch((err) => {
            reject(err);
          });
        }

      });
    };

    const _renameIndividual = (individualIri, newName) => {
      if (!individualIri) {
        return Promise.reject(new Error('Individual iri must not be null!'));
      }
      if (!angular.isString(individualIri)) {
        return Promise.reject(new Error('Individual iri must not be a string!'));
      }
      if (!newName) {
        return Promise.reject(new Error('New name must not be null!'));
      }
      if (!angular.isString(newName)) {
        return Promise.reject(new Error('New name must not be a string!'));
      }
      return new Promise((resolve, reject) => {
        const newIri = `${OntologyDataService.ontologyIri()}${newName}`;
        if (newIri === individualIri) {
          resolve(newIri);
          return;
        }
        OntologyDataService.iriExists(newIri).then((result) => {
          if (result === true) {
            throw new Error('Name already exists!');
          }
          return OntologyDataService.changeIri(individualIri, newIri);
        }).then(()  => {
          return OntologyDataService.fetchIndividual(newIri, {datatypeProperties: true, objectProperties: true});
        }).then((result)  => {
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
      if (angular.isUndefined(case_)) {
        return Promise.reject(new Error('Case must not be null!'));
      }
      if (!(case_ instanceof Case)) {
        return Promise.reject(new Error('Case must be of type Case!'));
      }
      return new Promise((resolve, reject) => {
        const individual = _convertToIndividual(case_);
        let nameProperty = undefined;
        const promises= [];
        angular.forEach(datatypeProperties, (prop) => {
          if (prop.label === caseNamePropertyName) {
            nameProperty = prop;
          }
        });
        OntologyDataService.removeIndividual(individual).then(() => {

          return OntologyDataService.insertIndividual(individual);
        }).then(() => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };
    const _removeIndividual = (individualIri) => {
      if (!individualIri) {
        return Promise.reject(new Error('Individual iri must not be null!'));
      }
      return new Promise((resolve, reject) => {
        //TODO: if individual is a member of several cases, it shouldn't be deleted completely
        OntologyDataService.removeEntity(individualIri).then(() => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _getCaseIdentifiers = () => {
      const identifiers = _cases.map((c) => {
        return {
          id: c.identifier,
          name: c.name
        };
      });
      return Promise.resolve(identifiers);
    };

    const _getCaseIdentifiersFor = (individualIri) => {
      if (!individualIri) {
        return Promise.reject(Error('Iri may not be undefined.'));
      }
      return new Promise((resolve, reject) => {
        const result = [];
        _cases.forEach((c) => {
          if (c.individualIris.indexOf(individualIri) > -1){
            result.push(c.identifier);
          }
        });
        resolve(result);
      });
    };

    const _loadCaseIndividuals = (case_) => {
      return new Promise((resolve, reject) => {
        const promises = case_.individualIris.map((iri) =>  {
          return OntologyDataService.fetchIndividual(iri, {datatypeProperties: true, objectProperties: true});
        });
        Promise.all(promises).then((result) => {
          case_.individuals = result;
          resolve(result);
        });
      });

    };

    const _loadCase = (individual) => {
      const c = new Case(individual.label, sysCfg.user, new Date(), individual.comments);
      c.status = 'open';

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

    return {
      initialize: ()  => {
        if (_initialized === true) {
          return Promise.resolve(_cases);
        }
        return new Promise((resolve, reject) => {
          OntologyDataService.initialize().then(() => {
            _caseClassIri = `${OntologyDataService.ontologyIri()}${caseClassName}`;
            _caseNamePropertyIri = `${OntologyDataService.ontologyIri()}${caseNamePropertyName}`;
            _caseEntityPropertyIri = `${OntologyDataService.ontologyIri()}${caseEntityPropertyName}`;
            _caseEntityInversePropertyIri = `${OntologyDataService.ontologyIri()}${caseEntityInversePropertyName}`;

            return Promise.all([
              OntologyDataService.fetchIndividualsForClass(_caseClassIri, {
                objectProperties: true,
                reverseObjectProperties: true,
                datatypeProperties: true,
                comments: true,
              }),
              OntologyDataService.fetchAllObjectProperties(),
              OntologyDataService.fetchAllDatatypeProperties(),
              _buildClassTree(),
            ]).then((result) => {
              _cases = result[0].map((individual) => {
                return _loadCase(individual);
              });
              _initialized = true;
              objectProperties = result[1];
              datatypeProperties = result[2];
              _classTree = result[3];


              _caseEntityProperty = objectProperties.find((prop) => {
                return prop.iri === _caseEntityPropertyIri;
              });
              _caseEntityInverseProperty = objectProperties.find((prop) => {
                return prop.iri === _caseEntityInversePropertyIri;
              });

              resolve(_cases);
            }).catch((err) => {
              reject(err);
            });
          });
        });
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
      getObjectProperties: () => {
        return objectProperties;
      },
      getDatatypeProperties: () => {
        return datatypeProperties;
      },
      createAndAddIndividual: (classIri, instanceName, case_) => {
        return _createAndAddIndividual(classIri, instanceName, case_);
      },
      removeIndividual: (individualIri) => {
        return _removeIndividual(individualIri);
      },

      getClassTree: () => {
        return angular.copy(_classTree);
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
      loadCase: (identifier) => {
        const case_ =  _cases.find((c) => {
          return c.identifier === identifier;
        });

        return Promise.all([
          Promise.resolve(case_),
          _loadCaseIndividuals(case_)
        ]);
      },
      getCaseIdentifiersFor: (individualIri) => {
        return _getCaseIdentifiersFor(individualIri);
      },
      getCaseIdentifiers: () => {
        return _getCaseIdentifiers();
      },
      isCaseIndividual: (individual) => {
        return individual.classIris.indexOf(`${OntologyDataService.ontologyIri()}${caseClassName}`) > -1;
      },
      isCaseClass: (clazz) => {
        return clazz.iri === `${OntologyDataService.ontologyIri()}${caseClassName}`;
      },
    };
  }
  module.exports = CaseOntologyDataService;

})(global.angular);
