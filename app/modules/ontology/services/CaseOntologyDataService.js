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

    const _cases = [];

    let caseEntityProperty = {};

    let caseEntityInverseProperty = {};

    const regexExcludedClasses = new RegExp(`_:[a-zA-Z0-9]+|${caseClassName}`, 'g');
    let isInitialized = false;

    const classes = {};
    let objectProperties = [];
    let datatypeProperties = [];
    const classTree = [];

    const _createCase = (identifier) => {
      const c = new Case(identifier, sysCfg.user, new Date());
      c.name = identifier;
      c.description = [];
      return OntologyDataService.insertIndividual(_convertToIndividual(c));
    };

    const _convertToIndividual = (case_) => {
      const ontologyIri = OntologyDataService.ontologyIri();
      const individual =  OntologyDataService.createIndividual(ontologyIri, `${ontologyIri}${caseClassName}`, `${ontologyIri}${case_.identifier}`);
      individual.addDatatypeProperty(`${ontologyIri}${caseNamePropertyName}`, caseNamePropertyName, case_.name);
      angular.forEach(case_.individuals, function(ind) {
        individual.addObjectProperty(`${ontologyIri}${caseEntityPropertyName}`, caseEntityPropertyName, ind.iri);
      });

      if (case_.description.length > 0) {
        individual.addComment(case_.description);
      }
      return individual;
    };
    const _convertToCase = (individual) => {
      if (angular.isUndefined(individual)) {
        return Promise.reject('Individual must not be null!');
      }
      if (!OntologyDataService.isIndividual(individual)) {
        return Promise.reject(new Error('Individual of type OwlIndividual!'));
      }
      return new Promise((resolve, reject) => {
        // TODO: as long as those values don't get saved
        const c = new Case(individual.label, sysCfg.user, new Date());
        c.status = 'open';

        const promises = [c];
        if (individual.comments.length > 0) {
          c.description = individual.comments[0];
        } else {
          c.description = [];
        }
        const caseNamePropertyIri = `${individual.ontologyIri}${caseNamePropertyName}`;
        angular.forEach(individual.datatypeProperties, function(value, key) {
          if (key === caseNamePropertyIri) {
            c.name = value[0].target;
          }
        });
        const temp = {};

        const caseEntityPropertyIri = `${individual.ontologyIri}${caseEntityPropertyName}`;
        angular.forEach(individual.objectProperties, function(value, key) {
          if (key === caseEntityPropertyIri) {
            angular.forEach(value, function(prop) {
              temp[prop.target] = true;
            });
          } else {
            // TODO: load other ObjectProperties of case?
          }
        });
        const caseInverseEntityPropertyIri = `${individual.ontologyIri}${caseEntityInversePropertyName}`;
        angular.forEach(individual.reverseObjectProperties, function(value, key) {
          if (key === caseInverseEntityPropertyIri) {
            angular.forEach(value, function(prop) {
              temp[prop.target] = true;
            });
          }
        });
        angular.forEach(temp, function(value, key) {
          promises.push(OntologyDataService.fetchIndividual(key, true));
        });

        Promise.all(promises).then((result) => {
          // delete case relations
          angular.forEach(result, (value, index) => {
            if (index > 0) {
              delete value.objectProperties[caseEntityInverseProperty.iri];
            }
          });
          resolve(result);
        }).catch((err) => {
          reject(err);
        });
      });
    };
    const _loadCases = () => {
      return new Promise((resolve, reject) => {
        _loadCasesOverview().then((cases) => {
          const promises = [];
          angular.forEach(cases, (c) => {
            promises.push(_loadCase(`${OntologyDataService.ontologyIri()}${c.identifier}`, true));
          });
          return Promise.all(promises);
        }).then((cases) => {
          resolve(cases);
        }).catch((err) => {
          $log.error(err);
          reject(new Error('Could not load cases !'));
        });
      });
    };

    const _loadCase = (identifier, deep) => {
      if (angular.isUndefined(identifier)) {
        return Promise.reject(new Error('Identifier may not be null!'));
      }
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchIndividual(identifier, deep).then((individual) => {
          return _convertToCase(individual);
        }).then((result) =>  {
          const c = result[0];
          c.individuals = result.slice(1);
          resolve(c);
        }).catch((err) => {
          $log.error(err);
          reject(new Error('Could not load case with identifier: ' + identifier + '!'));
        });
      });
    };
    const _buildClassesTree = (rootClassIris, maxLevel) => {
      classTree.length = 0;
      const convertClass = (clazz) => {
        return {iri: clazz.iri, name: clazz.name,  subClasses: []};
      };
      const build = (arr, parentIris, level, maxLevel) => {
        if (((maxLevel > -1) && (level > maxLevel)) || (parentIris.length === 0)) {
          return;
        }
        angular.forEach(parentIris, (iri) => {
          const clazz = classes[iri];
          if (clazz.name.search(regexExcludedClasses) < 0) {
            const convertedClass = convertClass(clazz);
            arr.push(convertedClass);
            build(convertedClass.subClasses, clazz.childClassIris, level + 1, maxLevel);
          }
        });
      };
      build(classTree, rootClassIris, 0, maxLevel);
    };
    const _loadCasesOverview = () => {
      const ontologyIri = OntologyDataService.ontologyIri();
      const caseClassIri = `${ontologyIri}${caseClassName}`;
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchIndividualsForClass(caseClassIri).then((iris) => {
          const promises = [];
          angular.forEach(iris, function(iri) {
            promises.push(_loadCase(iri, true));
          });
          return Promise.all(promises);
        }).then((cases) => {
          resolve(cases);
        }).catch((err) => {
          $log.error(err);
          reject(new Error('Could not load cases overview!'));
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
        const individual = OntologyDataService.createIndividual(ontologyIri, classIri, `${ontologyIri}${instanceName}`);

        OntologyDataService.insertIndividual(individual).then(() => {
          const caseIndividual = _convertToIndividual(case_);

          return Promise.all([
            OntologyDataService.addIndividualProperty(individual, caseEntityInverseProperty, caseIndividual),
            OntologyDataService.addIndividualProperty(caseIndividual, caseEntityProperty, individual)
          ]);
        }).then(()=> {
          case_.individuals.push(individual);
          resolve(individual);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _addOrRemoveDatatypeProperty = (case_, subjectIri, propertyIri, value, type) => {
      if (angular.isUndefined(case_)) {
        return Promise.reject(new Error('Case must not be null!'));
      }
      if (!(case_ instanceof Case)) {
        return Promise.reject(new Error('Case must be of type Case!'));
      }
      if (angular.isUndefined(subjectIri)) {
        return Promise.reject(new Error('Subject iri must not be null!'));
      }
      if (!angular.isString(subjectIri)) {
        return Promise.reject(new Error('Subject iri must be a string!'));
      }
      if (angular.isUndefined(propertyIri)) {
        return Promise.reject(new Error('Property iri must not be null!'));
      }
      if (!angular.isString(propertyIri)) {
        return Promise.reject(new Error('Property iri must be a string!'));
      }
      if (angular.isUndefined(value)) {
        return Promise.reject(new Error('Value must not be null!'));
      }
      if ((type !== 'add') && (type !== 'remove')) {
        return Promise.reject(new Error('Type must be \'add\' or \'remove\'!'));
      }
      return new Promise((resolve, reject) => {
        let subjectIndividual = {};
        let datatypeProperty = {};
        angular.forEach(case_.individuals, (individual) => {
          if (individual.iri === subjectIri) {
            subjectIndividual = individual;
          }
        });
        angular.forEach(datatypeProperties, (prop) => {
          if (prop.iri === propertyIri) {
            datatypeProperty = prop;
          }
        });
        if (type === 'add') {
          OntologyDataService.addIndividualProperty(subjectIndividual, datatypeProperty, value).then(() => {
            subjectIndividual.addDatatypeProperty(datatypeProperty.iri, datatypeProperty.label, value);
            resolve();
          }).catch((err) => {
            reject(err);
          });
        }
        if (type === 'remove') {
          OntologyDataService.removeIndividualProperty(subjectIndividual, datatypeProperty, value).then(() => {
            subjectIndividual.removeDatatypeProperty(datatypeProperty.iri, datatypeProperty.label, value);
            resolve();
          }).catch((err) => {
            reject(err);
          });
        }
      });
    };
    const _addOrRemoveObjectProperty = (case_, subjectIri, propertyIri, objectIri, type) => {
      if (angular.isUndefined(case_)) {
        return Promise.reject(new Error('Case must not be null!'));
      }
      if (!(case_ instanceof Case)) {
        return Promise.reject(new Error('Case must be of type Case!'));
      }
      if (angular.isUndefined(subjectIri)) {
        return Promise.reject(new Error('Subject iri must not be null!'));
      }
      if (!angular.isString(subjectIri)) {
        return Promise.reject(new Error('Subject iri must be a string!'));
      }
      if (angular.isUndefined(propertyIri)) {
        return Promise.reject(new Error('Property iri must not be null!'));
      }
      if (!angular.isString(propertyIri)) {
        return Promise.reject(new Error('Property iri must be a string!'));
      }
      if (angular.isUndefined(objectIri)) {
        return Promise.reject(new Error('Object iri must not be null!'));
      }
      if (!angular.isString(objectIri)) {
        return Promise.reject(new Error('Object iri must be a string!'));
      }
      if ((type !== 'add') && (type !== 'remove')) {
        return Promise.reject(new Error('Type must be \'add\' or \'remove\'!'));
      }

      return new Promise((resolve, reject) => {
        let subjectIndividual = {};
        let objectIndividual = {};
        let objectProperty = {};
        angular.forEach(case_.individuals, (individual) => {
          if (individual.iri === subjectIri) {
            subjectIndividual = individual;
          }
          if (individual.iri === objectIri) {
            objectIndividual = individual;
          }
        });
        angular.forEach(objectProperties, (prop) => {
          if (prop.iri === propertyIri) {
            objectProperty = prop;
          }
        });
        if (type === 'add') {
          OntologyDataService.addIndividualProperty(subjectIndividual, objectProperty, objectIndividual).then(() => {
            subjectIndividual.addObjectProperty(objectProperty.iri, objectProperty.label, objectIndividual.iri);
            resolve();
          }).catch((err) => {
            reject(err);
          });
        }
        if (type === 'remove') {
          OntologyDataService.removeIndividualProperty(subjectIndividual, objectProperty, objectIndividual).then(() => {
            subjectIndividual.removeObjectProperty(objectProperty.iri, objectProperty.label, objectIndividual.iri);
            resolve();
          }).catch((err) => {
            reject(err);
          });
        }
      });
    };

    const _renameIndividual = (case_, individualIri, newName) => {
      if (angular.isUndefined(case_)) {
        return Promise.reject(new Error('Case must not be null!'));
      }
      if (!(case_ instanceof Case)) {
        return Promise.reject(new Error('Case must be of type Case!'));
      }
      if (angular.isUndefined(individualIri)) {
        return Promise.reject(new Error('Individual iri must not be null!'));
      }
      if (!angular.isString(individualIri)) {
        return Promise.reject(new Error('Individual iri must not be a string!'));
      }
      if (angular.isUndefined(newName)) {
        return Promise.reject(new Error('New name must not be null!'));
      }
      if (!angular.isString(newName)) {
        return Promise.reject(new Error('New name must not be a string!'));
      }
      return new Promise((resolve, reject) => {
        const newIri = `${OntologyDataService.ontologyIri()}${newName}`;
        if (newIri === individualIri) {
          resolve();
          return;
        }
        OntologyDataService.iriExists(newIri).then((result) => {
          if (result === true) {
            throw new Error('Name already exists!');
          }
          return OntologyDataService.changeIri(individualIri, newIri);
        }).then(()  => {
          let result = undefined;
          angular.forEach(case_.individuals, (individual) => {
            if (individual.iri === individualIri) {
              individual.iri = newIri;
              individual.label = newName;
              result = individual;
            }
            angular.forEach(individual.objectProperties, (props) => {
              angular.forEach(props, (prop) => {
                if (prop.target === individualIri) {
                  prop.target = newIri;
                }
              });
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
        /* OntologyDataService.removeIndividualProperties(individual, nameProperty).then(() => {
         angular.forEach(individual.datatypeProperties[nameProperty.iri], (prop) => {
         promises.push(OntologyDataService.addIndividualProperty(individual, nameProperty, prop.target));
         });
         return Promise.all(promises);
         }).then(() => {
         resolve();
         }).catch((err) => {
         reject(err);
         });*/
      });
    };
    const _removeIndividual = (individual, case_) => {
      if (angular.isUndefined(individual)) {
        return Promise.reject(new Error('Individual must not be null!'));
      }
      if (!OntologyDataService.isIndividual(individual)) {
        return Promise.reject(new Error('Individual must be of type OwlIndividual!'));
      }
      if (angular.isUndefined(case_)) {
        return Promise.reject(new Error('Case must not be null!'));
      }
      if (!(case_ instanceof Case)) {
        return Promise.reject(new Error('Case must be of type Case!'));
      }
      return new Promise((resolve, reject) => {
        const ontologyIri = OntologyDataService.ontologyIri();

        //check whether this individual is only linked to this case
        const propIri = `${ontologyIri}${caseEntityInversePropertyName}`;
        let justOneCase = true;
        angular.forEach(individual.objectProperties[propIri], (value) => {
          if (value.target !== `${ontologyIri}${case_.identifier}`) {
            justOneCase = false;
          }
        });

        //TODO: if individual is a member of several cases, it shouldn't be deleted completely
        OntologyDataService.removeIndividual(individual).then(() => {
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

    const _loadCase2 = (individual) => {
      const c = new Case(individual.label, sysCfg.user, new Date(), individual.comments);

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
        return new Promise((resolve, reject) => {
          _caseClassIri = `${OntologyDataService.ontologyIri()}${caseClassName}`;
          _caseNamePropertyIri = `${OntologyDataService.ontologyIri()}${caseNamePropertyName}`;
          _caseEntityPropertyIri = `${OntologyDataService.ontologyIri()}${caseEntityPropertyName}`;
          _caseEntityInversePropertyIri = `${OntologyDataService.ontologyIri()}${caseEntityInversePropertyName}`;
          OntologyDataService.fetchIndividualsForClass(_caseClassIri, {
            objectProperties: true,
            reverseObjectProperties: true,
            datatypeProperties: true,
            comments: true,
          }).then((caseIndividuals) => {
            caseIndividuals.forEach((individual) => {
              _cases.push(_loadCase2(individual));
            });
            resolve();
          }).catch((err) => {
            reject(err);
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
        isInitialized = false;
      },
      getObjectProperties: () => {
        return angular.copy(objectProperties);
      },
      getDatatypeProperties: () => {
        return angular.copy(datatypeProperties);
      },
      createAndAddIndividual: (classIri, instanceName, case_) => {
        return _createAndAddIndividual(classIri, instanceName, case_);
      },
      removeIndividual: (individual, case_) => {
        return _removeIndividual(individual, case_);
      },

      getClassTree: () => {
        return angular.copy(classTree);
      },
      addObjectProperty: (case_, subjectIri, propertyIri, objectIri) => {
        return _addOrRemoveObjectProperty(case_, subjectIri, propertyIri, objectIri, 'add');
      },
      addDatatypeProperty: (case_, subjectIri, propertyIri, value) => {
        return _addOrRemoveDatatypeProperty(case_, subjectIri, propertyIri, value, 'add');
      },
      removeObjectProperty: (case_, subjectIri, propertyIri, objectIri) => {
        return _addOrRemoveObjectProperty(case_, subjectIri, propertyIri, objectIri, 'remove');
      },
      removeDatatypeProperty: (case_, subjectIri, propertyIri, value) => {
        return _addOrRemoveDatatypeProperty(case_, subjectIri, propertyIri, value, 'remove');
      },
      renameIndividual: (case_, individualIri, newName) => {
        return _renameIndividual(case_, individualIri, newName);
      },
      loadCase: (identifier) => {
        return _loadCase(`${OntologyDataService.ontologyIri()}${identifier}`, true);
      },
      loadCases: () => {
        return _loadCases();
      },


      loadCasesOverview: () => {
        return _loadCasesOverview();
      },

      // XXX: new!
      getCaseIdentifiersFor: (individualIri) => {
        // XXX: is promise
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