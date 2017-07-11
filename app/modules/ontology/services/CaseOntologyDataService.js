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
    const sortByName = (item1, item2) => {
      return item1.name.localeCompare(item2.name);
    };

    const _buildTreeData = () => {
      const noCaseName = "[No case]";
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchAllIndividuals().then((individuals) => {
          const cases =  individuals.filter((i)=> {
            return i.classIris.indexOf(_caseClassIri) > -1;
          }).map((i) => {
            let name = i.datatypeProperties.find((p) => {
              return p.iri === _caseNamePropertyIri;
            });
            if (name) {
              name = name.target;
            } else {
              name = i.label;
            }
            return { id: i.iri, name: name};
          });
          individuals = individuals.filter((i)=> {
            return i.classIris.indexOf(_caseClassIri) < 0;
          });
          const classIndividualsTree = _classes.map((c) => {
            const individuals_ = individuals.filter((item) => {
              return item.classIris.indexOf(c.iri) > -1;
            }).map((item) => {
              return {id: item.iri, name: item.label };
            }).sort(sortByName);
            return {id: c.iri, name: c.label, individuals: individuals_};
          }).reduce((accumulator, item) => {
            if (item.individuals.length > 0) {
              accumulator.push(item);
            }
            return accumulator;
          }, []).sort(sortByName);

          const individualsWithCases = individuals.map((i)=> {
            // get all cases for an individual
            const individualCases = i.objectProperties.filter((p) => {
              return p.iri === _caseEntityInversePropertyIri;
            }).concat(i.reverseObjectProperties.filter((p) => {
              return p.iri === _caseEntityPropertyIri;
            })).map((p) => {
              return { id: p.target };
            }).reduce((accumulator, item) => {
              const case_ = cases.find((i) => {
                return i.id === item.id;
              });
              const found = accumulator.find((i) => {
                return item.id === i.id;
              });
              if (!found && case_) {
                item.name = case_.name;
                accumulator.push(item);
              }
              return accumulator;
            }, []);
            if (individualCases.length === 0) {
              individualCases.push({id: 'none', name: noCaseName});
            }
            return {id: i.iri, name: i.label, cases: individualCases};
          });
          // aggregating the individuals by case
          const caseTree = individualsWithCases.reduce((accumulator, item) => {
            item.cases.forEach((c) => {
              // console.log(c.name);
              let case_ = accumulator.find((c_) => {
                return c.id === c_.id;
              });
              if (!case_) {
                case_ = {id: c.id, name: c.name, individuals: []};
                accumulator.push(case_);
              }
              case_.individuals.push(item);
            });
            return accumulator;
          }, []);
          caseTree.sort(sortByName);

          // filtering the individuals belonging to multiple cases
          const multipleCasesTree = individualsWithCases.filter((i) => {
            return i.cases.length > 1;
          });

          resolve({classIndividualsTree: classIndividualsTree, caseTree: caseTree, multipleCasesTree: multipleCasesTree});
        }).catch(reject);

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

    const _updateCaseMetadata = (caseIdentifier) => {
      return new Promise((resolve, reject) => {
        CaseMetadataService.retrieveCaseMetadata(caseIdentifier).then((data) => {
          data.lastEditedBy = sysCfg.user;
          data.lastEditedOn = new Date();
          return CaseMetadataService.saveCaseMetadata(data);
        }).then(resolve)
          .catch(reject);
      });
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
        const promises = [];
        if (object.comment) {
          individual.comments.push(object.comment);
        }
        if (object.cases && Array.isArray(object.cases)) {
          object.cases.forEach((c) => {
            individual.objectProperties.push({iri: _caseEntityInversePropertyIri, target: `${ontologyIri}${c}`});
            promises.push(_updateCaseMetadata(c));
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
          //insert individual & update case metadata
          promises.push(OntologyDataService.insertIndividual(individual));
          return Promise.all(promises);
        }).then(resolve)
          .catch(reject);
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
          OntologyDataService.fetchIndividual(iri),
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
        OntologyDataService.fetchIndividualsForClass(_caseClassIri).then((individuals) => {
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
        OntologyDataService.fetchIndividual(caseIri).then((individual) => {
          case_ = _convertFromIndividual(individual);
          let promises = [];
          if (withIndividuals === true) {
            promises = case_.individualIris.map((iri) => {
              return OntologyDataService.fetchIndividual(iri);
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
        return Promise.resolve();
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
            OntologyDataService.fetchAllClasses(),
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
      removeIndividual: (individualIri) => {
        return _removeIndividual(individualIri);
      },
      classTree: () => {
        return Promise.resolve(_classTree);
      },
      treeData: () => {
        return _buildTreeData();
      },
      saveAsIndividual: (object) => {
        return _saveAsIndividual(object);
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
