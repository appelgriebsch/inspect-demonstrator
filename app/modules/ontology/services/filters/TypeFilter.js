(function() {
  'use strict';

  class TypeFilter {
    constructor(priority, type, name, hasColor, isVisible, enabled = false) {
      if (priority === undefined) {
        throw Error('Priority must not be null!');
      }
      if (type === undefined) {
        throw Error('Type must not be null!');
      }
      if (name === undefined) {
        throw Error('Name must not be null!');
      }
      if (hasColor === undefined) {
        throw Error('Has color must not be null!');
      }
      this.id = type;
      this.type = type;
      this.priority = priority;
      this.name = name;
      this.enabled = enabled;
      this.hasColor = hasColor;
      this.isVisible = isVisible;
    }

    filter(item, nodes, edges) {
      return item.type === this.type;
    }
  }
  module.exports = TypeFilter;

})();
