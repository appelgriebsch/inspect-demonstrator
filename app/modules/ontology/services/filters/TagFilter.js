(function() {
  'use strict';

  class TagFilter {
    constructor(priority, tag, name, hasColor, isVisible, enabled = false) {
      if (priority === undefined) {
        throw Error('Priority must not be null!');
      }
      if (tag === undefined) {
        throw Error('Tag id must not be null!');
      }
      if (name === undefined) {
        throw Error('Name must not be null!');
      }
      this.id = tag;
      this.tag = tag;
      this.priority = priority;
      this.name = name;
      this.enabled = enabled;
      this.hasColor = hasColor;
      this.isVisible = isVisible;
    }

    filter(item, nodes, edges) {
      if ((item.tags === undefined) || (!Array.isArray(item.tags))) {
        return false;
      }
      return item.tags.indexOf(this.tag) > -1;
    }
  }
  module.exports = TagFilter;

})();
