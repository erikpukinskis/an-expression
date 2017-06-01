var library = require("module-library")(require)

module.exports = library.export(
  "an-expression",
  ["function-call", "./expression-to-javascript", "forkable-list"],
  function(functionCall, expressionToJavascript, forkableList) {

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
      this.expressionIds = forkableList()
      this.pairIdsByValueId = {}
      this.parentIdsByChildId = {}
      this.onchangedCallbacks = []
      this.onnewexpressionCallbacks = []
      this.getIds = getIds.bind(this)
      this.pairIds = {}

      if (typeof id == "string") {
        this.id = id
      } else if (typeof id == "undefined") {
        this.id = aTreeId()
      } else {
        throw new Error("Can't load tree data anymore. Use tree.logTo(tellTheUniverse) and play it back")
      }

      trees[this.id] = this
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

      var ids = this.expressionIds
      parent.expressionIds = ids


      var branch = anExpression.tree()
      branch.expressionIds = ids.fork()
      branch.parent = parent


      branch.parent = parent
      this.parent = parent
      this.expressionIds = ids.fork()

      return branch
    }

    ExpressionTree.prototype.addExpressionAt = function(newExpression, index) {
      
      this.log("anExpression", this.id, index, newExpression.id, dehydrate(newExpression))

      addToTree(newExpression.id, index, newExpression, this)
    }

    function addToTree(id, index, expression, tree) {

      throw new Error("index body, arguments, etc here:")

      // addKeyPair: 
      // tree.parentIdsByChildId[oldId] = null
      // this.pairIdsByValueId[oldId] = null
      // this.valueIdsByPairId[oldId] = null


        // case "body":
        // case "arguments":
        // case "items":
        // case "values":
        //   forkableList
        // case "expression":
        //   id
        // case "kind":
        // case "functionName":
        // case "argumentNames":
        // case "variableName":
        // case "string":
        // case "number":
        // case "isDeclaration":
        // case "keys":
        // case "pairIds":
        // case "value":
        //   attributesByExpressionId


      if (!id) {
        throw new Error("expr "+JSON.stringify(expression, null, 2)+" doesn't have an id!")
      }

      tree.expressionIds.set(index, id)


      if (expression.kind == "array literal") {
        expression.items.forEach(function(item) {
          item.role = "array item"
        })
      }
    }

    anExpression.lineIn = function(functionLiteralId, treeId, index, expressionId, dehydrated) {

      var tree = anExpression.getTree(treeId)

      var functionLiteral = tree.get(functionLiteralId)

      var expression = rehydrate(dehydrated, tree)
      expression.id = expressionId

      tree.addLine(expression, index, functionLiteral)
    }

    ExpressionTree.prototype.addLine = function(expression, index, functionLiteral) {

      this.log("anExpression.lineIn", functionLiteral.id, this.id, index, expression.id, dehydrate(expression))

      expression.role = "function literal line"

      addToTree(expression.id, index, expression, this)

      functionLiteral.body.push(expression)

      this.setParent(expression.id, functionLiteral)
    }

    ExpressionTree.prototype.insertExpression = function(newExpression, relationship, relativeToThisId) {
      
      var parentId = this.getParentId(relativeToThisId)

      var relativeExpression = this.get(relativeToThisId)

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


      this.parentIdsByChildId[newExpression.id] = parentId

      this.expressionIds.splice(splicePosition, deleteThisMany, newExpression.id)

      var body = this.getList("body", parentId)
      
      throw new Error("need to splice body")

      throw new Error("do we need to pass splicePosition below? we're splicing above.")

      addToTree(newExpression.id, splicePosition, newExpression, this)
    }

    function addExpressionToNeighbors(newExpression, neighbors, relationship, relativeExpression) {
      
      for(var i = 0; i < neighbors.length; i++) {
        var neighborExpression = neighbors[i]

        if (neighborExpression == relativeExpression) {

          lineIndex = i

          if (relationship == "after") {
            lineIndex++
          }

          break
        }
      }

      if (relationship == "inPlaceOf") {
        var deleteThisMany = 1
      } else {
        var deleteThisMany = 0
      }

      neighbors.splice(lineIndex, deleteThisMany,  newExpression)
    }

    function lastDescendantAfter(tree, ids, startIndex) {

      var possibleParentIds = [ids.get(startIndex)]
      var lastDescendant = startIndex

      for(var i = startIndex+1; i < ids.length; i++) {

        var testId = ids.get(i)
        var testExpr = tree.get(testId)

        var testParentId = tree.getParentId(testId)

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

    function dehydrate(expression) {
      var dehydrated = {}
      for(var key in expression) {
        dryCopy(key, expression, dehydrated)
      }
      return dehydrated
    }

    function dryCopy(attribute, expression, dehydrated) {
      throw new Error("deprecated")
    }

    function wetCopy(attribute, dehydrated, tree) {
      throw new Error("deprecated")
    }

    function rehydrate(dehydrated, tree) {
      throw new Error("deprecated")
    }



    // EVENTS

    ExpressionTree.prototype.onchanged = function(callback) {
      this.onchangedCallbacks.push(callback)
    }

    ExpressionTree.prototype.onnewexpression = function(callback) {
      this.onnewexpressionCallbacks.push(callback)
    }

    ExpressionTree.prototype.changed = function() {
      
      var expression = this.root()

      this.onchangedCallbacks.forEach(function(callback) {
        callback(expression)
      })
    }

    ExpressionTree.prototype.newexpression =
      function(parent, newExpression) {
        this.onnewexpressionCallbacks.forEach(function(callback) {

          callback(parent, newExpression)
        })
      }



    // QUERYING

    anExpression.toJavascript = function(expression) {
      return expressionToJavascript(expression)
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

    ExpressionTree.prototype.root = function() {
      var rootId = this.expressionIds.get(0)
      var root = this.get(rootId)
      if (!root) {
        throw new Error(this.id+" has no root expression. ids: "+JSON.stringify(this.expressionIds.values()))
      }
      return root
    }

    ExpressionTree.prototype.get = function(id) {
      throw new Error("deprecated")
    }

    ExpressionTree.prototype.getPairForValueId = function(valueExpressionId) {
      throw new Error("deprecated")
    }
    
    ExpressionTree.prototype.getParentId = function(childId) {
      return getFromFamily(this, "parentIdsByChildId", childId)
    } 

    ExpressionTree.prototype.setParent = function(childId, parent) {
      this.parentExpressionsByChildId[childId] = parent
    }

    ExpressionTree.prototype.getArgumentName = function(expressionId, index) {
      var expression = this.get(expressionId)

      return expression.argumentNames[index]
    }

    ExpressionTree.prototype.getProperty = function(property, expressionId) {
      var expression = this.get(expressionId)
      return expression[property]
    }

    anExpression.setProperty = function(treeId, expressionId, property, newValue) {
      var tree = anExpression.getTree(treeId)
      tree.setProperty(expressionId, property, newValue)
    }

    ExpressionTree.prototype.setProperty = function(property, expressionId, newValue) {

      this.log("anExpression.setProperty", this.id, expressionId, property, newValue)

      var expression = this.get(expressionId)
      expression[property] = newValue
      this.changed()
    }

    ExpressionTree.prototype.setFloatProperty = function(property, expressionId, newValue) {
      throw new Error("implement log")
      var expression = this.get(expressionId)
      expression[property] = parseFloat(newValue)
      this.changed()
    }

    ExpressionTree.prototype.getKeyName = function(pairId) {
      return keysByPairId[pairId]
    }

    ExpressionTree.prototype.onKeyRename = function(pairId, newKey) {

      this.keysByPairId[pairId] = newKey

      this.changed()
    }

    ExpressionTree.prototype.addFunctionArgument = function(expressionId, name) {
      throw new Error("implement log")

      var functionExpression = this.get(expressionId)

      var index = functionExpression.argumentNames.length

      functionExpression.argumentNames.push(name)

      return index
    }

    anExpression.addKeyPair = function(treeId, objectId, key, valueId, options) {
      var tree = anExpression.getTree(treeId)
      tree.addKeyPair(objectId, key, valueId, options)
    }

    ExpressionTree.prototype.addKeyPair = function(objectId, key, valueId, options) {

      this.log("anExpression.addKeyPair", this.id, objectId, key, valueId, options)

      var pairId = anExpression.id()

      this.keysByPairId[pairId] = key

      tree.parentIdsByChildId[valueId] = objectId
      this.pairIdsByValueId[valueId] = pairId
      this.valueIdsByPairId[pairId] = valueId

      var pairs = this.getList("pairs", objectId)

      var i = options.index || pairs.length

      pairs.splice(i, 0, pairId)
    }

    var DELETED = {deleted: true}

    ExpressionTree.prototype.setKeyValue = function(pairId, newValueId) {

      if (typeof pairId == "object" || typeof newValueId == "object") {
        throw new Error("setKeyValue takes ids")
      }

      // var key = pairExpression.key

      // var objectExpression = pairExpression.objectExpression

      // var objectId = this.objectIdsByPairId[pairId]
      // var valueIds = this.valueIdsByKeyByObjectId[objectId]
      // var key = this.keysByPairId[pairId]
      // var oldId = valueIds[key]
      // valueIds[key] = valueId

      // newExpression.key = key

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

    ExpressionTree.prototype.renameArgument = function(expressionId, index, newName) {
      throw new Error("implement log")
      var expression = this.get(expressionId)

      expression.argumentNames[index] = newName

      this.changed()
    }

    function getIds() {
      return this.expressionIds.values()
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

    anExpression.variableAssignment = function(attributes) {
      return {
        kind: "variable assignment",
        id: anId(),
        expression: attributes.expression,
        variableName: attributes.variableName
      }
    }

    anExpression.objectLiteral =
      function(object) {
        var expression = {
          kind: "object literal",
          keys: [],
          pairIds: [],
          values: [],
          id: anId(),
        }

        for (var key in object) {
          var valueExpression = toExpression(object[key])

          expression.keys.push(key)
          expression.pairIds.push(anId())
          expression.values.push(valueExpression)
        }

        return expression
      }

    anExpression.arrayLiteral =
      function(array) {
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