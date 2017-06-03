var library = require("module-library")(require)

module.exports = library.export(
  "an-expression",
  ["function-call", "./expression-to-javascript", "forkable-list"],
  function(functionCall, treeToJavascript, forkableList) {

    // BUILDING

    function anExpression(treeId, index, id, attributes) {

      throw new Error("broken")

      if (typeof id != "string") {
        throw new Error("anExpression takes (treeId, index, id, kind, attributes)")
      }

      var tree = anExpression.getTree(treeId)

      if (!tree) {
        throw new Error("No tree "+treeId+" just "+Object.keys(trees))
      }

      var expression = rehydrate(attributes, tree)

      expression.id = id

      if (typeof index == "undefined") {
        throw new Error("no index?")
      }

      tree.addExpressionAt(expression, index)

      return expression
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
      this.keysByPairId = {}
      this.valueIdsByPairId = {}
      this.pairIdsByValueId = {}
      this.parentIdsByChildId = {}
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
      }
    }

    function freshLists() {
      return {
        body: {},
        argumentNames: {},
      }
    }

    ExpressionTree.prototype.moveDataTo = function(parent) {

      parent.attributes = this.attributes
      this.attributes = freshAttributes()

      parent.lists = this.lists
      this.lists = freshLists()

      parent.expressionIds = this.expressionIds
      this.expressionIds = parent.expressionIds.fork()

      parent.keysByPairId = this.keysByPairId
      this.keysByPairId = {}

      parent.valueIdsByPairId = this.valueIdsByPairId
      this.valueIdsByPairId = {}

      parent.pairIdsByValueId = this.pairIdsByValueId
      this.pairIdsByValueId = {}

      parent.parentIdsByChildId = this.parentIdsByChildId
      this.parentIdsByChildId = {}
    }

    ExpressionTree.prototype.reservePosition = function() {
      return this.expressionIds.next()
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
        tree.setAttribute(id, "kind", attributes.kind)
      } else {
        throw new Error("expr "+JSON.stringify(attributes, null, 2)+" doesn't have a kind!")
      }

      switch(attributes.kind) {
      case "function literal":
        setChildren("body", tree, attributes)
        setChildren("argumentNames", tree, attributes)
        tree.setAttribute(id, "functionName", attributes.functionName)
        break;
      case "function call":
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
        tree.setAttribute(id, "variableName", attributes.variableName)
        tree.setAttribute(id, "expression", rhsId) 
        tree.setAttribute(id, "isDeclaration", attributes.isDeclaration) 
        tree.parentIdsByChildId[rhsId] = id
        break;
      case "string literal":
        tree.setAttribute(id, "string", attributes.string)
        break;
      case "number literal":
        tree.setAttribute(id, "number", attributes.number)
        break;
      case "object literal":
        if (!attributes.valuesByKey) {
          throw new Error("object expression attributes need valuesByKey")
        }
        var paidIds = []

        for(var key in attributes.valuesByKey) {
          var valueId = attributes.valuesByKey[key]
          tree.parentIdsByChildId[valueId] = id
          var pairId = anExpression.id()
          pairIds.push(pairId)
          tree.pairIdsByValueId[valueId] = pairId
          tree.keysByPairId[pairId] = key
          tree.valueIdsByPairId[pairId] = valueId
        }
        break;
      case "boolean":
        tree.setAttribute(id, "value", attributes.value)
        break;
      default:
        throw new Error("how to add a "+attributes.kind+" expression?")
      }

      tree.expressionIds.set(index, id)
    }

    var EMPTY_LIST = {emptyList: true}

    function setChildren(key, tree, attributes) {
      var array = attributes[key]
      var expressionId = attributes.id

      if (!array) {
        tree.lists[key][expressionId] = EMPTY_LIST
        return
      }

      var list = tree.lists[key][expressionId]

      if (list) {
        throw new Error("overwrite "+key+" list on "+expressionId+"?")
      }

      if (!tree.lists[key]) {
        throw new Error("trying to set children in "+key+" attribute, but there's no store for that.")
      }

      tree.lists[key][expressionId] = forkableList(array)

      for (var i=0; i<array.length; i++) {
        var id = array[i]

        tree.parentIdsByChildId[id] = expressionId
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

      addToTree(index, attributes, this)

      this.log("anExpression.lineIn", functionLiteralId, this.id, index, attributes)

      // expression.role = "function literal line"

      addLine(this, functionLiteralId, attributes.id)
    }

    function addLine(tree, functionLiteralId, expressionId) {
      var body = tree.ensureList("body", functionLiteralId)
      body.set(body.next(), expressionId)
      tree.parentIdsByChildId[expressionId] = functionLiteralId
    }

    ExpressionTree.prototype.insertExpression = function(attributes, relationship, relativeToThisId) {
      
      var newExpressionId = attributes.id

      var parentId = this.getAttribute("parentIdsByChildId", relativeToThisId)

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

      this.parentIdsByChildId[newExpressionId] = parentId

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

        var testParentId = getFromFamily(tree, "parentIdsByChildId", testId)

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



    // QUERYING

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
      return this.expressionIds.get(0)
    }

    ExpressionTree.prototype.getArgumentName = function(expressionId, index) {
      var names = this.getList("argumentNames", expressionId)
      return names.get(index)
    }


    anExpression.setAttribute = function(treeId, expressionId, key, newValue) {
      var tree = anExpression.getTree(treeId)
      setAttribute(tree, expressionId, key, newValue)
    }

    function expectId(id) {
      if (typeof id == "undefined" || id.slice(0,3) != "exp") {
        throw new Error("This: "+id+"  doesn't seem to be an expression id?")
      }
    }

    function setAttribute(tree, expressionId, key, newValue) {

      if (!tree.attributes[key]) {
        throw new Error("no place for "+key+" attributes yet.")
      }

      expectId(expressionId)

      tree.attributes[key][expressionId] = newValue      
    }

    ExpressionTree.prototype.getAttribute = function(key, expressionId) {

      if (!this.attributes[key]) {
        throw new Error("no place for "+key+" attributes yet.")
      }

      expectId(expressionId)

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

    ExpressionTree.prototype.setAttribute = function(expressionId, key, newValue) {

      this.log("anExpression.setAttribute", this.id, expressionId, key, newValue)

      setAttribute(this, expressionId, key, newValue)

      this.changed()
    }


    ExpressionTree.prototype.getList = function(key, expressionId, array) {
      if (!this.lists[key]) {
        throw new Error(
          "No place for "+key+" lists yet" ) }

      var list = this.lists[key][expressionId]

      if (this.parent && typeof list == "undefined") {
        list = this.parent.getList(key, expressionId)
      }

      var isString = typeof expressionId == "string"
      var isExpression = isString && expressionId.slice(0,3) == "exp"

      expectId(expressionId)

      return list
    }

    ExpressionTree.prototype.ensureList = function(key, expressionId, array) {
      if (!this.lists[key]) {
        throw new Error(
          "No place for "+key+" lists yet" ) }

      var list = this.lists[key][expressionId]

      if (list && (list != null)) {
        if (array) {
          throw new Error("can't initialize a forkable list where one already exists")
        }

        return list

      } else if (!list && this.parent) {
        if (array) {
          throw new Error("can't initialize a forkable list while forking")
        }

        var parentList = this.parent.getList(key, expressionId, array)

        if (parentList && (parentList != null)) {
          var list = parentList.fork()
          this.lists[key][expressionId] = list

          return list
        }

      } else {
        list = forkableList(array)
        this.lists[key][expressionId] = list

        return list        
      }
    }

    ExpressionTree.prototype.getKeyName = function(pairId) {
      return getFromFamily(this, "keysByPairId", pairId)
    }

    anExpression.renameKey = function(treeId, pairId, newKey) {
      this.keysByPairId[pairId] = newKey
    }

    ExpressionTree.prototype.onKeyRename = function(pairId, newKey) {
      this.log("anExpression.renameKey", this.id, pairId, newKey)

      this.keysByPairId[pairId] = newKey

      this.changed()
    }

    anExpression.addFunctionArgument = function(treeId, functionLiteralId, argumentName) {
      var tree = this.getTree(treeId)
      addFunctionArgument(tree, functionLiteralId, argumentName)
    }

    function addFunctionArgument(tree, functionLiteralId, argumentName) {
      var list = this.ensureList("argumentNames", functionLiteralId)

      list.set(list.next(), argumentName)
    }

    ExpressionTree.prototype.renameArgument = function(expressionId, index, newName) {
      throw new Error("just use setAttribute(\"argumentNames\"...)")
      this.changed()
    }

    anExpression.addKeyPair = function(treeId, objectId, key, valueId, options) {
      var tree = anExpression.getTree(treeId)
      addKeyPair(tree, objectId, key, valueId, options)
    }

    function addKeyPair(tree, objectId, key, valueId, options) {
      var pairId = anExpression.id()

      this.keysByPairId[pairId] = key
      tree.parentIdsByChildId[valueId] = objectId
      this.pairIdsByValueId[valueId] = pairId
      this.valueIdsByPairId[pairId] = valueId

      var pairs = this.ensureList("pairs", objectId)

      if (options.index) {
        pairs.splice(options.index, 0, pairId)
      } else {
        pairs.set(pairs.next(), pairId)
      }
    }

    ExpressionTree.prototype.addKeyPair = function(objectId, key, valueId, options) {

      this.log("anExpression.addKeyPair", this.id, objectId, key, valueId, options)

      addKeyPair(this, objectId, key, valueId, options)
    }

    var DELETED = {deleted: true}

    anExpression.setKeyValue = function(treeId, pairId, newValueId) {
      var tree = this.getTree(treeId)
      setKeyValue(tree, pairId, newValueId)
    }

    function setKeyValue(tree, pairId, newValueId) {
      if (typeof pairId == "object" || typeof newValueId == "object") {
        throw new Error("setKeyValue takes ids")
      }

      var oldId = this.valueIdsByPairId[pairId]
      var objectId = this.objectIdsByPairId[pairId]

      if (newValueId == oldId) {
        return
      }

      tree.parentIdsByChildId[oldId] = null
      this.pairIdsByValueId[oldId] = null
      this.valueIdsByPairId[oldId] = null
      tree.parentIdsByChildId[pairId] = objectId
      this.valueIdsByPairId[pairId] = newValueId
      this.pairIdsByValueId[newValueId] = pairId
    }

    ExpressionTree.prototype.setKeyValue = function(pairId, newValueId) {
      this.log("anExpression.setKeyValue", this.id, pairId, newValueId)
      setKeyValue(this, pairId, newValueId)
    }

    function getFromFamily(tree, indexName, key) {
      var value = tree[indexName][key]
      if (typeof value == "undefined" && tree.parent) {
        return getFromFamily(tree.parent, indexName, key)
      } else if (value == null) {
        return
      } else {
        return value
      }
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
      throw new Error("impl")
      return {
        kind: "function call",
        id: anId(),
        arguments: attributes.arguments,
        functionName: attributes.functionName,
      }
    }

    anExpression.variableAssignment = function(attributes) {
      throw new Error("impl")
      return {
        kind: "variable assignment",
        id: anId(),
        expression: attributes.expression,
        variableName: attributes.variableName
      }
    }

    anExpression.objectLiteral =
      function(object) {
      throw new Error("impl")
        var expression = {
          kind: "object literal",
          valuesByKey: {},
          id: anId(),
        }

        for (var key in object) {
          var valueExpression = toExpression(object[key])

          expression.valuesByKey
          expression.keys.push(key)
          expression.pairIds.push(anId())
          expression.values.push(valueExpression)
        }

        return expression
      }

    anExpression.arrayLiteral =
      function(array) {
      throw new Error("impl")
        return {
          kind: "array literal",
          items: array.map(toExpression),
          id: anId(),
        }
      }

    anExpression.true = function() {
      return {
        kind: "boolean",
        value: true,
        id: anId(),
      }
    }

    anExpression.false = function() {
      return {
        kind: "boolean",
        value: false,
        id: anId(),
      }
    }

    function toExpression(stuff) {
      if (typeof stuff == "string") {
        return anExpression.stringLiteral(stuff)
      } else if (typeof stuff == "number") {
        return anExpression.numberLiteral(stuff)
      } else if (Array.isArray(stuff)) {
        return anExpression.arrayLiteral(stuff)
      } else if (typeof stuff == "object") {
        return anExpression.objectLiteral(stuff)
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