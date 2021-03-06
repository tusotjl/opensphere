goog.provide('os.state.XMLStateManager');

goog.require('goog.dom');
goog.require('goog.dom.xml');
goog.require('goog.log');
goog.require('goog.log.Logger');
goog.require('os.config');
goog.require('os.file.FileManager');
goog.require('os.file.mime.xmlstate');
goog.require('os.state');
goog.require('os.state.BaseStateManager');
goog.require('os.state.Tag');
goog.require('os.state.XMLStateOptions');
goog.require('os.tag');
goog.require('os.ui.im.ImportManager');
goog.require('os.ui.state.StateImportUI');



/**
 * XML state manager.
 * @extends {os.state.BaseStateManager.<!Document, !os.state.XMLStateOptions>}
 * @constructor
 */
os.state.XMLStateManager = function() {
  os.state.XMLStateManager.base(this, 'constructor');
  this.contentType = 'text/xml';
  this.log = os.state.XMLStateManager.LOGGER_;

  /**
   * The namespace URI to use in exported state files
   * @type {string}
   * @private
   */
  this.nsUri_ = os.state.XMLStateManager.NS_URI;

  // register the import UI
  var im = os.ui.im.ImportManager.getInstance();
  im.registerImportDetails(os.config.getAppName('Application') + ' state files.');
  im.registerImportUI(os.file.mime.xmlstate.TYPE, new os.ui.state.StateImportUI());
};
goog.inherits(os.state.XMLStateManager, os.state.BaseStateManager);


/**
 * Logger
 * @type {goog.log.Logger}
 * @private
 * @const
 */
os.state.XMLStateManager.LOGGER_ = goog.log.getLogger('os.state.XMLStateManager');


/**
 * The namespace uri for exported states.
 * @type {string}
 * @const
 */
// os.state.XMLStateManager.NS_URI = 'http://www.bit-sys.com/state/';
// TODO:STATE -> Was the namespace rename intentional?
os.state.XMLStateManager.NS_URI = 'http://www.bit-sys.com/mist/state/';


/**
 * @inheritDoc
 */
os.state.XMLStateManager.prototype.setVersion = function(version) {
  os.state.XMLStateManager.base(this, 'setVersion', version);
  this.nsUri_ = os.state.XMLStateManager.NS_URI + version;
};


/**
 * @inheritDoc
 */
os.state.XMLStateManager.prototype.analyze = function(obj) {
  if (typeof obj === 'string') {
    var doc = goog.dom.xml.loadXml(obj);
    if (doc) {
      obj = doc;
    }
  }

  var list = [];
  if (obj instanceof Document && goog.dom.getFirstElementChild(obj) instanceof Element) {
    var rootNode = goog.dom.getFirstElementChild(obj);
    var v = rootNode.namespaceURI;
    v = v.substring(v.lastIndexOf('/') + 1);

    if (v in this.versions) {
      var states = this.versions[v];
      var children = goog.dom.getChildren(rootNode);
      if (children) {
        var i = children.length;
        while (i--) {
          var tag = os.state.serializeTag(children[i]);
          if (tag && tag in states) {
            var s = new states[tag]();
            s.setEnabled(true);
            list.push(s);
          }
        }
      }
    }
  }

  list.sort(os.state.titleCompare);
  return list;
};


/**
 * @inheritDoc
 */
os.state.XMLStateManager.prototype.loadState = function(obj, states, stateId, opt_title) {
  if (obj && states) {
    if (typeof obj === 'string') {
      var doc = goog.dom.xml.loadXml(obj);
      if (doc) {
        obj = doc;
      }
    }

    if (obj instanceof Document && goog.dom.getFirstElementChild(obj) instanceof Element) {
      states.sort(os.state.priorityCompare);

      var children = goog.dom.getChildren(goog.dom.getFirstElementChild(obj));
      for (var i = 0, n = states.length; i < n; i++) {
        var state = states[i];
        if (state.getEnabled()) {
          for (var j = 0, m = children.length; j < m; j++) {
            if (os.state.serializeTag(children[j]) == state.toString()) {
              state.load(children[j], stateId, opt_title);
              break;
            }
          }
        }
      }
    }
  }
};


/**
 * @inheritDoc
 */
os.state.XMLStateManager.prototype.createStateObject = function(method, title, opt_desc, opt_tags) {
  var appName = os.config.getAppName('Unknown Application');
  var version = os.config.getAppVersion('Unknown Version');
  var doc = goog.dom.xml.createDocument();
  var rootNode = os.xml.createElementNS(os.state.Tag.STATE, this.nsUri_, doc);
  rootNode.setAttribute(os.state.Tag.SOURCE, appName + ' (' + version + ')');
  // v4 support
  rootNode.setAttribute(os.state.Tag.VERSION, this.getVersion());
  doc.appendChild(rootNode);

  os.xml.appendElement(os.state.Tag.TITLE, rootNode, title);

  if (opt_desc) {
    os.xml.appendElement(os.state.Tag.DESCRIPTION, rootNode, opt_desc);
  }

  if (opt_tags) {
    var tagEl = os.tag.xmlFromTags(opt_tags, os.state.Tag.TAGS, doc);
    if (tagEl) {
      rootNode.appendChild(tagEl);
    }
  }

  return doc;
};


/**
 * @inheritDoc
 */
os.state.XMLStateManager.prototype.createStateOptions = function(method, title, obj, opt_desc, opt_tags) {
  var options = new os.state.XMLStateOptions(title, obj);
  options.description = opt_desc || null;
  options.method = method;
  options.tags = opt_tags || null;
  return options;
};


/**
 * @inheritDoc
 */
os.state.XMLStateManager.prototype.serializeContent = function(options) {
  return options.doc ? os.xml.serialize(options.doc) : null;
};


/**
 * @inheritDoc
 */
os.state.XMLStateManager.prototype.getStateFileName = function(options) {
  return options.doc ? options.doc.querySelector(os.state.Tag.TITLE).textContent + '_state.xml' : null;
};
