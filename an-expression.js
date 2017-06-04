var library = require("module-library")(require)

module.exports = library.export(
  "an-expression",
  ["function-call", "./expression-to-javascript", "forkable-list"],
  function(functionCall, treeToJavascript, forkableList) {

    function anExpression() {
      throw new Error("deprecated")
    }

    anExpression.tree = function(data) {
      if (data) {
        var tree = new ExpressionTree(data)
      } else {
        var tree = new ExpressionTree()
      }

      return tree
    }

    function ExpressionTree(id) {

      if (typeof id == "string") {
        this.id = id
      } else if (typeof id == "undefined") {
        this.id = aTreeId()
      } else {
        throw new Error("Can't load tree data anymore. Use tree.logTo(tellTheUniverse) and play it back")
      }

      // Virtual tree data
      this.expressionIds = forkableList()
      this.attributes = freshAttributes()
      this.lists = freshLists()

      // Instance data
      this.onchangedCallbacks = []
      this.onnewexpressionCallbacks = []

      this.toJavaScript = treeToJavascript.bind(null, this)

      trees[this.id] = this
    }

    function freshAttributes() {
      return {
        kind: {},
        functionName: {},
        value: {},
        string: {},
        number: {},
        key: {},
        valueId: {},
        pairId: {},
        parentId: {},
        variableName: {},
        expression: {},
        isDeclaration: {},
      }
    }

    function freshLists() {
      return {
        body: {},
        argumentNames: {},
        arguments: {},
        items: {},
        pairIds: {},
      }
    }

    ExpressionTree.prototype.moveDataTo = function(parent) {

      parent.attributes = this.attributes
      this.attributes = freshAttributes()

      parent.lists = this.lists
      this.lists = freshLists()

      parent.expressionIds = this.expressionIds
      this.expressionIds = parent.expressionIds.fork()
    }

    ExpressionTree.prototype.reservePosition = function() {
      var index = this.expressionIds.next()
      return index
    }

    var lastExpressionInteger = typeof window == "undefined" ? 1000*1000 : 1000
    function anId() {
      lastExpressionInteger++
      var id = lastExpressionInteger.toString(36)
      return "exp"+id
    }

    var trees = {}
    anExpression.getTree = function(treeId) {
      return trees[treeId]
    }

    anExpression.forgetTrees = function() {
      trees = {}
    }

    var lastTreeId = 300
    function aTreeId() {
      lastTreeId++
      return "tree"+lastTreeId.toString(36)
    }

    ExpressionTree.prototype.next = function() {
      return this.expressionIds.next()
    }

    ExpressionTree.prototype.fork = function() {

      var parent = anExpression.tree()

      this.moveDataTo(parent)
      this.parent = parent

      var branch = anExpression.tree()
      branch.parent = parent
      branch.expressionIds = parent.expressionIds.fork()

      return branch
    }

    anExpression.addToTree = function(treeId, index, attributes) {
      var tree = this.getTree(treeId)
      addToTree(index, attributes, tree)
    }

    ExpressionTree.prototype.addExpressionAt = function(index, attributes) {
      if (typeof index != "number") {
        throw new Error("addExpressionAt takes an index first")
      }
      if (typeof attributes != "object") {
        throw new Error("addExpressionAt takes an attributes object as the second argument")
      }
      
      this.log("anExpression.addToTree", this.id, index, attributes)

      addToTree(index, attributes, this)
    }

    function addToTree(index, attributes, tree) {

      var id = attributes.id
      if (!id) {
        throw new Error("expr "+JSON.stringify(attributes, null, 2)+" doesn't have an id!")
      }

      if (attributes.kind) {
        tree.setAttribute("kind", id, attributes.kind)
      } else {
        throw new Error("expr "+JSON.stringify(attributes, null, 2)+" doesn't have a kind!")
      }

      switch(attributes.kind) {
      case "function literal":
        var attributesHaveBody = tree.attributes.body && tree.attributes.body.length
        var bodyAlreadyExists = tree.getList("body", attributes.id)

        if (attributesHaveBody && bodyAlreadyExists) {
          throw new Error("Trying to add a function literal with some line ids, but there are already lines in the body. Not sure what to do.")
        } else if (attributesHaveBody) {
          setChildren("body", tree, attributes)
        }

        if (attributes.argumentNames) {
          var args = tree.ensureList("argumentNames", id, attributes.argumentNames)
        }
        tree.setAttribute("functionName", id, attributes.functionName)
        break;
      case "function call":
        tree.setAttribute("functionName", id, attributes.functionName)
        setChildren("arguments", tree, attributes)
        break;
      case "array literal":
        setChildren("items", tree, attributes)
        break;
      case "variable assignment":
        if (!attributes.variableName) {
          throw new Error("no variable name")
        }
        if (!attributes.expression) {
          throw new Error("no rhs")
        }
        var rhsId = attributes.expression
        tree.setAttribute("variableName", id, attributes.variableName)
        tree.setAttribute("expression", id, rhsId) 
        tree.setAttribute("isDeclaration", id, attributes.isDeclaration) 
        tree.setAttribute("parentId", rhsId, id)
        break;
      case "string literal":
        tree.setAttribute("string", id,attributes.string)
        break;
      case "number literal":
        tree.setAttribute("number", id,attributes.number)
        break;
      case "object literal":
        if (!attributes.valueIdsByKey) {
          throw new Error("object expression attributes need valueIdsByKey")
        }
        var pairIds = []
        var objectId = attributes.id

        for(var key in attributes.valueIdsByKey) {
          var pairId = anExpression.id()
          var valueId = attributes.valueIdsByKey[key]

          pairIds.push(pairId)

          tree.setAttribute("parentId", valueId, objectId)
          tree.setAttribute("key", pairId, key)
          tree.setAttribute("valueId", pairId, valueId)
          tree.setAttribute("pairId", valueId, pairId)
        }

        tree.ensureList("pairIds", objectId, pairIds)

        break;
      case "boolean":
        tree.setAttribute("value", id, attributes.value)
        break;
      case "return statement":
        tree.setAttribute("expression", id, attributes.expression)
        break;
      case "variable reference":
        tree.setAttribute("variableName", id, attributes.variableName)
        break;
      default:
        throw new Error("how to add a "+attributes.kind+" expression?")
      }

      tree.expressionIds.set(index, id)
    }

    var EMPTY_LIST = {emptyList: true}

    function setChildren(key, tree, attributes) {
      var array = attributes[key]
      var arrayId = attributes.id

      if (!array || array.length == 0) {
        tree.lists[key][arrayId] = EMPTY_LIST
        return
      }

      if (!tree.lists[key]) {
        throw new Error("Tree doesn't have a place for "+key+" lists")
      }

      var list = tree.lists[key][arrayId]

      if (list) {
        throw new Error("overwrite "+key+" list on "+arrayId+"?")
      }

      if (!tree.lists[key]) {
        throw new Error("trying to set children in "+key+" attribute, but there's no store for that.")
      }

      tree.ensureList(key, arrayId, array)

      for (var i=0; i<array.length; i++) {
        var itemId = array[i]
        expectId(itemId)
        tree.setAttribute("parentId", itemId, arrayId)
      }
    }

    anExpression.lineIn = function(functionLiteralId, treeId, index, attributes) {

      if (typeof attributes != "object") {
        throw new Error("anExpression.lineIn takes attributes fourth")
      }

      var tree = anExpression.getTree(treeId)

      addToTree(index, attributes, tree)

      addLine(tree, functionLiteralId, attributes.id)
    }

    ExpressionTree.prototype.addLine = function(functionLiteralId, index, attributes) {

      expectId(functionLiteralId, "first argument to tree.addLine")

      if (typeof attributes != "object") {
        throw new Error("tree.addLine expects (functionId, integer index, attributes object). Attributes object was "+attributes)
      }

      addToTree(index, attributes, this)

      this.log("anExpression.lineIn", functionLiteralId, this.id, index, attributes)

      // expression.role = "function literal line"

      addLine(this, functionLiteralId, attributes.id)
    }

    function addLine(tree, functionId, lineId) {
      var body = tree.ensureList("body", functionId)
      body.set(body.next(), lineId)
      tree.setAttribute("parentId", lineId, functionId)
    }

    ExpressionTree.prototype.insertExpression = function(attributes, relationship, relativeToThisId) {
      
      var newExpressionId = attributes.id

      var parentId = this.getAttribute("parentId", relativeToThisId)

      if (relationship == "before") {

        var splicePosition = indexBefore(this, relativeToThisId)
        var deleteThisMany = 0

      } else if (relationship == "after") {

        var splicePosition = indexAfter(this, relativeToThisId)
        var deleteThisMany = 0

      } else if (relationship == "inPlaceOf") {

        var splicePosition = 0
        var deleteThisMany = 1

      } else { throw new Error() }

      addToTree(splicePosition, attributes, this)

      this.setAttribute("parentId", newExpressionId, parentId)

      this.expressionIds.splice(splicePosition, deleteThisMany, newExpressionId)

      var body = this.ensureList("body", parentId)
      
      body.spliceRelativeTo(relativeToThisId, relationship, 0, newExpressionId)
    }

    function lastDescendantAfter(tree, ids, startIndex) {

      var possibleParentIds = [ids.get(startIndex)]
      var lastDescendant = startIndex

      for(var i = startIndex+1; i < ids.length; i++) {

        var testId = ids.get(i)
        var testExpr = tree.get(testId)

        var testParentId = tree.getAttribute("parentId", testId)

        if (!testParentId) {
          var isDescendant = false
        } else {
          var isDescendant = contains(possibleParentIds, testParentId)
        }

        if (isDescendant) {
          possibleParentIds.push(testId)
          lastDescendant = i
        } else {
          return lastDescendant
        }      
      }

      return lastDescendant
    }

    function indexBefore(tree, relativeId) {

      var ids = tree.expressionIds

      for(var i = 0; i < ids.length; i++) {
        if (ids.get(i) == relativeId) {
          return i
        }
      }

      throw new Error("Wanted to insert before "+relativeId+" but I can't find it!")

    }


    function indexAfter(tree, relativeId) {

      var ids = tree.expressionIds
      var parentIdStack = []

      for(var i = 0; i < ids.length; i++) {
        var testId = ids.get(i)

        if (testId == relativeId) {
          return lastDescendantAfter(tree, ids, i)+1
        }
      }

      throw new Error("Wanted to insert after "+relativeId+" but I can't find it!")
    }


    ExpressionTree.prototype.logTo = function(universe) {
      this.universe = universe
    }

    ExpressionTree.prototype.log = function(method, args, etc) {
      var universe = this.universe
      if (!universe) { return }
      var args = Array.prototype.slice.call(arguments)

      universe.apply(null, args)
    }

    ExpressionTree.prototype.builder = function() {
      return eval("("+this.universe.source()+")")
    }

    ExpressionTree.prototype.asBinding = function() {
      return functionCall("library.get(\"program\").findById(\""+this.id+"\")").singleton()
    }

    ExpressionTree.prototype.rootId = function() {
      var id = this.expressionIds.get(0)
      if (typeof id == "undefined") {
        debugger
        throw new Error("Tree has no root!")
      }
      return id
    }

    ExpressionTree.prototype.getArgumentName = function(expressionId, index) {
      return this.getListItem("argumentNames", expressionId, index)
    }

    function expectId(id, message) {
      if (typeof id != "string" || id.slice(0,3) != "exp") {
        if (message) {
          message += " is supposed to be an expression id, but you passed "+_wtf(id)
        } else {
          message = _wtf(id)+"  doesn't seem to be an expression id?"
        }
        throw new Error(message)
      }
    }

    anExpression.setAttribute = function(treeId, key, expressionId, newValue) {
      var tree = anExpression.getTree(treeId)
      setAttribute(tree, key, expressionId, newValue)
    }

    function setAttribute(tree, key, expressionId, newValue) {

      expectId(expressionId)

      if (!tree.attributes[key]) {
        throw new Error("no place for "+key+" attributes yet.")
      }

      tree.attributes[key][expressionId] = newValue      
    }

    ExpressionTree.prototype.setAttribute = function(key, expressionId, newValue) {

      expectId(expressionId, "second parameter to tree.setAttribute")

      this.log("anExpression.setAttribute", this.id, key, expressionId, newValue)

      setAttribute(this, key, expressionId, newValue)

      this.changed()
    }

    ExpressionTree.prototype.getAttribute = function(key, expressionId) {

      if (!this.attributes[key]) {
        throw new Error("no place for "+key+" attributes yet.")
      }

      expectId(expressionId, "second parameter to tree.getAttribute")

      var value = this.attributes[key][expressionId]

      if (this.parent && typeof value == "undefined") {
        return this.parent.getAttribute(key, expressionId)
      } else if (value == null) {
        return
      } else {
        if (typeof value == "undefined") {
          throw new Error("Attribute "+key+" on "+expressionId+" is undefined.")
        }
        return value
      }
    }

    ExpressionTree.prototype.getListItem = function(key, expressionId, index) {
      expectId(expressionId, "second parameter to tree.getListItem")

      var list = this.getList(key, expressionId)

      if (!list) {
        throw new Error("tried to get item "+index+" from "+key+" list on "+expressionId+" but couldn't find a list?")
      }

      return list.get(index)
    }

    ExpressionTree.prototype.getList = function(key, expressionId) {

      expectId(expressionId, "second parameter to tree.getList")

      if (!this.lists[key]) {
        throw new Error(
          "No place for "+key+" lists yet" ) }

      var list = this.lists[key][expressionId]

      if (this.parent && typeof list == "undefined") {
        list = this.parent.getList(key, expressionId)
      }

      if (list == EMPTY_LIST) {
        return
      } else {
        return list
      }
    }

    ExpressionTree.prototype.ensureList = function(key, expressionId, array) {
      if (!this.lists[key]) {
        throw new Error(
          "No place for "+key+" lists yet" ) }

      var list = this.lists[key][expressionId]

      if (list && (list != EMPTY_LIST)) {
        if (array) {
          throw new Error("can't initialize a forkable list where one already exists")
        }

        return list

      } else if (!list && this.parent) {
        if (array) {
          throw new Error("can't initialize a forkable list while forking")
        }

        var parentList = this.parent.getList(key, expressionId, array)

        if (parentList) {
          var list = parentList.fork()
          this.lists[key][expressionId] = list

          return list
        }
      }

      list = forkableList(array)
      this.lists[key][expressionId] = list

      return list        
    }

    ExpressionTree.prototype.getKeyName = function(pairId) {
      return this.getAttribute("key", pairId)
    }

    anExpression.renameKey = function(treeId, pairId, newKey) {

      var tree = anExpression.getTree(treeId)

      setAttribute(tree, "key", pairId, newKey)
    }

    ExpressionTree.prototype.renameKey = function(pairId, newKey) {
      this.log("anExpression.renameKey", this.id, pairId, newKey)

      setAttribute(this, "key", pairId, newKey)

      this.changed()
    }

    anExpression.addFunctionArgument = function(treeId, functionLiteralId, argumentName) {
      var tree = this.getTree(treeId)
      addFunctionArgument(tree, functionLiteralId, argumentName)
    }

    function addFunctionArgument(tree, functionLiteralId, argumentName) {
      var list = tree.ensureList("argumentNames", functionLiteralId)

      list.set(list.next(), argumentName)
    }

    ExpressionTree.prototype.renameArgument = function(expressionId, index, newName) {
      throw new Error("deprecated. use setAttribute/argumentNames")
      this.changed()
    }

    anExpression.addKeyPair = function(treeId, objectId, key, valueId, options) {
      var tree = anExpression.getTree(treeId)
      addKeyPair(tree, objectId, key, valueId, options)
    }

    function addKeyPair(tree, objectId, key, valueId, options) {
      var pairId = anExpression.id()

      setAttribute(tree, "key", pairId, key)
      setAttribute(tree, "parentId", valueId, objectId)
      setAttribute(tree, "pairId", valueId, pairId)
      setAttribute(tree, "valueId", pairId, valueId)

      var pairs = tree.ensureList("pairIds", objectId)

      if (options && typeof options.index != "undefined") {
        pairs.splice(options.index, 0, pairId)
      } else {
        pairs.set(pairs.next(), pairId)
      }
    }

    ExpressionTree.prototype.addKeyPair = function(objectId, key, valueId, options) {

      expectId(objectId, "object id as the first argument to tree.addKeyPair")

      expectId(valueId, "valid id as the third argument to tree.addKeyPair")

      this.log("anExpression.addKeyPair", this.id, objectId, key, valueId, options)

      addKeyPair(this, objectId, key, valueId, options)
    }

    anExpression.setKeyValue = function(treeId, pairId, newValueId) {
      var tree = this.getTree(treeId)
      setKeyValue(tree, pairId, newValueId)
    }

    function setKeyValue(tree, pairId, newValueId) {
      if (typeof pairId == "object" || typeof newValueId == "object") {
        throw new Error("setKeyValue takes ids")
      }

      var oldId = tree.getAttribute("valueId", pairId)
      var objectId = tree.getAttribute("parentId", pairId)

      if (newValueId == oldId) {
        return
      }

      tree.setAttribute("parentId", oldId, null)
      tree.setAttribute("pairId", oldId, null)
      tree.setAttribute("valueId", oldId, null)

      tree.setAttribute("parentId", pairId, objectId)
      tree.setAttribute("valueId", pairId, newValueId)
      tree.setAttribute("pairId", newValueId, pairId)
    }

    ExpressionTree.prototype.setKeyValue = function(pairId, newValueId) {
      this.log("anExpression.setKeyValue", this.id, pairId, newValueId)
      setKeyValue(this, pairId, newValueId)
    }





    // EVENTS

    ExpressionTree.prototype.onchanged = function(callback) {
      this.onchangedCallbacks.push(callback)
    }

    ExpressionTree.prototype.onnewexpression = function(callback) {
      this.onnewexpressionCallbacks.push(callback)
    }

    ExpressionTree.prototype.changed = function() {
      
      this.onchangedCallbacks.forEach(function(callback) {
        callback()
      })
    }

    ExpressionTree.prototype.newexpression =
      function(parent, newExpression) {
        this.onnewexpressionCallbacks.forEach(function(callback) {

          callback(parent, newExpression)
        })
      }




    // GENERATORS

    anExpression.id = anId

    anExpression.stringLiteral =
      function(string) {
        return {
          kind: "string literal",
          string: string,
          id: anId(),
        }
      }

    anExpression.functionLiteral = function(attributes) {
      if (attributes.body) {
        throw new Error("Don't know how to initialize function bodies. Try anExpression.lineIn(...)")
      }
      return {
        kind: "function literal",
        id: anId(),
        functionName: attributes.functionName,
        argumentNames: attributes.argumentNames||[],
        body: attributes.body||[],
      }
    }

    anExpression.numberLiteral =
      function(number) {
        return {
          kind: "number literal",
          number: number,
          id: anId(),
        }
      }

    anExpression.emptyExpression =
      function() {
      throw new Error("impl")
        return {
          kind: "empty expression",
          id: anId(),
        }
      }

    anExpression.functionCall = function(attributes) {
      return {
        kind: "function call",
        id: anId(),
        arguments: attributes.arguments,
        functionName: attributes.functionName,
      }
    }

    anExpression.variableReference = function(variableName) {
        return {
          kind: "variable reference",
          variableName: variableName,
          id: anId(),
        }
      }

    anExpression.variableAssignment = function(attributes) {
      return {
        kind: "variable assignment",
        id: anId(),
        expression: attributes.expression,
        variableName: attributes.variableName,
        isDeclaration: attributes.isDeclaration,
      }
    }

    anExpression.objectLiteral =
      function(valueIdsbyKey) {

        var expression = {
          kind: "object literal",
          valueIdsByKey: valueIdsbyKey,
          id: anId(),
        }

        return expression
      }

    anExpression.arrayLiteral =
      function(ids) {
        if (ids) {
          ids.forEach(expectId)
        }
        return {
          kind: "array literal",
          items: ids,
          id: anId(),
        }
      }

    anExpression.boolean = function(value) {
      return {
        kind: "boolean",
        value: value,
        id: anId(),
      }
    }

    anExpression.true = function() {
      return anExpression.boolean(true)
    }

    anExpression.false = function() {
      return anExpression.boolean(false)
    }

    anExpression.returnStatement = function(attributes) {
      return {
        kind: "return statement",
        expression: attributes.expression,
        id: anId(),
      }
    }


    function contains(array, value) {
      if (!Array.isArray(array)) {
        throw new Error("looking for "+JSON.stringify(value)+" in "+JSON.stringify(array)+", which is supposed to be an array. But it's not.")
      }
      var index = -1;
      var length = array.length;
      while (++index < length) {
        if (array[index] == value) {
          return true;
        }
      }
      return false;
    }

    return anExpression
  }
)
