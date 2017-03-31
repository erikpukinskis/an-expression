var library = require("module-library")(require)

module.exports = library.export(
  "an-expression",
  ["function-call", "./expression-to-javascript"],
  function(functionCall, expressionToJavascript) {

    function anExpression(data) {
      if (!data) {
        throw new Error("Passed nothing to anExpression(). Did you mean to make an expression tree? Try var yourTree = anExpression.tree() instead.")
      } else if (data.expressionIds) {
        throw new Error("Tried to turn expression tree data into an expression. Try anExpression.tree(yourTreeData) instead.")
      }

      if (!data.id) {
        data.id = anId()
      }

      return data
    }

    anExpression.tree = function(data) {
      if (data) {
        var tree = new ExpressionTree(data)
      } else {
        var tree = new ExpressionTree()
      }

      return tree
    }

    var lastExpressionInteger = typeof window == "undefined" ? 1000*1000 : 1000

    function anId() {
      lastExpressionInteger++
      var id = lastExpressionInteger.toString(36)
      return "exp"+id
    }

    // Expression Tree

    var trees = {}
    var lastTreeId = 300

    anExpression.getTree = function(treeId) {
      return trees[treeId]
    }

    anExpression.forgetTrees = function() {
      trees = {}
    }

    function aTreeId() {
      lastTreeId++
      return "tree"+lastTreeId.toString(36)
    }

    function ExpressionTree(data) {
      this.expressionIdWritePosition = 0
      this.expressionIds = []
      this.expressionsById = {}
      this.keyPairsByValueId = {}
      this.parentExpressionsByChildId = {}
      this.onchangedCallbacks = []
      this.onnewexpressionCallbacks = []
      this.getIds = getIds.bind(this)
      this.pairIds = {}

      if (typeof data == "string") {
        this.id = data
      } else if (typeof data == "object") {
        if (!data.expressionIds) {
          throw new Error("Tried to create an expression tree out of weird stuff: "+data)
        }
        this.id = data.id
        this.load(data)
      } else {
        this.id = aTreeId()
      }

      trees[this.id] = this
    }

    anExpression.toJavascript = function(expression) {
      return expressionToJavascript(expression)
    }

    ExpressionTree.prototype.logTo = function(universe) {
      this.universe = universe
      universe("anExpression.tree", this.id)
    }

    ExpressionTree.prototype.asBinding = function() {
      return functionCall("library.get(\"program\").findById(\""+this.id+"\")").singleton()
    }

    ExpressionTree.prototype.root = function() {
      var rootId = this.expressionIds[0]
      return this.expressionsById[rootId]
    }

    ExpressionTree.prototype.get = function(id) {
      return this.expressionsById[id]
    }

    ExpressionTree.prototype.getParentOf = function(id) {
      return this.parentExpressionsByChildId[id]
    }

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

    function call(func) { func() }

    function dehydrate(expression) {
      var dehydrated = {}
      for(var key in expression) {
        dryCopy(key, expression, dehydrated)
      }
      return dehydrated
    }

    ExpressionTree.prototype.data = function() {
      var parents = {}
      var dehydratedById = {}
      var tree = this

      this.expressionIds.forEach(function(id) {

        var expression = tree.expressionsById[id]
        var parent = tree.parentExpressionsByChildId[id]

        if (parent) {
          parents[id] = parent.id
        }

        dehydratedById[id] = dehydrate(expression)
      })

      return {
        id: this.id,
        expressionIds: this.expressionIds,
        expressionsById: dehydratedById,
        keyPairsByValueId: null,
        parents: parents,
        pairIds: this.pairIds
      }
    }

    function dryCopy(attribute, expression, dehydrated) {

      function toId(x) {
        if (!x) {
          throw new Error("Tried to get an id while dry copying the \""+attribute+"\" attribute on "+JSON.stringify(expression)+" is something undefined or null there?")
        }
        return x.id
      }

      switch(attribute) {
        case "body":
        case "arguments":
        case "items":
          dehydrated[attribute] = expression[attribute].map(toId)
          break
        case "expression":
          if (!expression[attribute]) {
            throw new Error("expression "+JSON.stringify(expression).slice(0,100)+"'s \""+attribute+"\" attribute is falsy")
          }
          dehydrated[attribute] = toId(expression[attribute])
          break
        case "valuesByKey":
          dehydrated[attribute] = {}
          for(var key in expression.valuesByKey) {
            dehydrated[attribute][key] = toId(expression[attribute][key])
          }
          break
        case "kind":
        case "id":
        case "functionName":
        case "argumentNames":
        case "variableName":
        case "string":
        case "number":
        case "isDeclaration":
          dehydrated[attribute] = expression[attribute]
          break;
        case "i":
        case "parentToAdd":
        case "lineIn":
        case "keys":
          // discard these. we add them in javascript-to-ezjs. Ideally we would just not f with expressions at all, and just error if we see these 
          break;
        default:
          throw new Error("should "+attribute+" stay on a dehydrated expression?")
      }
    }

    function wetCopy(attribute, dehydrated, tree) {

      function toExpression(id) {
        return tree.expressionsById[id]
      }
      switch(attribute) {
        case "body":
        case "arguments":
        case "items":
          dehydrated[attribute] = dehydrated[attribute].map(toExpression)
          break
        case "expression":
          dehydrated[attribute] = toExpression(dehydrated[attribute])
          break
        case "valuesByKey":
          var objectExpression = dehydrated
          var valueIds = dehydrated.valuesByKey
          objectExpression.valuesByKey = {}

          for(var key in valueIds) {

            var pairId = tree.pairIds[objectExpression.id+"/"+key]

            tree.addKeyPair(
              objectExpression,
              key,
              tree.get(valueIds[key]),
              {id: pairId}
            )
          }
          break
      }
    }

    ExpressionTree.prototype.load = function(data) {

      this.expressionIds = data.expressionIds

      if (!data.expressionIds) {
        debugger
      }

      this.expressionIdWritePosition = data.expressionIds.length

      this.pairIds = data.pairIds

      this.expressionsById = data.expressionsById

      this.keyPairsByValueId

      this.parentExpressionsByChildId = {}

      var tree = this

      this.expressionIds.forEach(function(id) {

        var dehydrated = tree.expressionsById[id]

        rehydrate(dehydrated, tree)

        var parentId = data.parents[id]

        if (parentId) {
          tree.parentExpressionsByChildId[id] = tree.expressionsById[parentId]
        }
      }) 
    }

    function rehydrate(dehydrated, tree) {
      for(var attribute in dehydrated) {
        wetCopy(attribute, dehydrated, tree)
      }

      var kind = dehydrated.kind

      if (kind == "function literal") {
        if (!dehydrated.body) {
          dehydrated.body = []
        }
      }

      return dehydrated
    }

    function getIds() {
      return this.expressionIds
    }

    ExpressionTree.prototype.getProperty = function(property, expressionId) {
      var expression = this.expressionsById[expressionId]
      return expression[property]
    }

    ExpressionTree.prototype.setProperty = function(property, expressionId, newValue) {
      throw new Error("implement log")
      var expression = this.expressionsById[expressionId]
      expression[property] = newValue
      this.changed()
    }

    ExpressionTree.prototype.setFloatProperty = function(property, expressionId, newValue) {
      throw new Error("implement log")
      var expression = expressionsById[expressionId]
      expression[property] = parseFloat(newValue)
      this.changed()
    }

    ExpressionTree.prototype.getKeyName = function(id) {
      var pairExpression = this.expressionsById[id]
      return pairExpression.key
    }

    ExpressionTree.prototype.onKeyRename = function(pairId, newKey) {
      var pairExpression = this.expressionsById[pairId]
      var object = pairExpression.objectExpression.valuesByKey
      var oldKey = pairExpression.key

      pairExpression.key = newKey
      object[newKey] = object[oldKey]

      var baseId = pairExpression.objectExpression.id
      this.pairIds[baseId+"/"+oldKey] = undefined
      this.pairIds[baseId+"/"+newKey] = pairId

      delete object[oldKey]
      this.changed()
    }

    ExpressionTree.prototype.getArgumentName = function(expressionId, index) {
      var expression = this.expressionsById[expressionId]

      return expression.argumentNames[index]
    }

    ExpressionTree.prototype.getPairForValueId = function(valueExpressionId) {
      return this.keyPairsByValueId[valueExpressionId]
    }

    ExpressionTree.prototype.renameArgument = function(expressionId, index, newName) {
      throw new Error("implement log")
      var expression = this.expressionsById[expressionId]

      expression.argumentNames[index] = newName

      this.changed()
    }

    ExpressionTree.prototype.addFunctionArgument = function(expressionId, name) {
      throw new Error("implement log")

      var functionExpression = this.expressionsById[expressionId]

      var index = functionExpression.argumentNames.length

      functionExpression.argumentNames.push(name)

      return index
    }

    ExpressionTree.prototype.reservePosition = function() {
      var i = 
      this.expressionIdWritePosition
      this.expressionIdWritePosition++
      return i
    }

    ExpressionTree.prototype.log = function(method, args, etc) {
      var universe = this.universe
      if (!universe) { return }
      var args = Array.prototype.slice.call(arguments)

      universe.apply(null, args)
    }


    // This adds an expression at a specific place in the array, after we reserved it with reservePosition. It overwrites whatever is there, but we're assuming we already moved the write position:

    anExpression.addAt = function(treeId, i, expressionId, dehydrated) {

      var tree = anExpression.getTree(treeId)

      if (!tree) {
        throw new Error("No tree "+treeId+" just "+Object.keys(trees))
      }

      var expression = rehydrate(dehydrated, tree)
      expression.id = expressionId

      tree.addExpressionAt(expression, i)
    }

    anExpression.add = function(treeId, expressionId, dehydrated) {
      var tree = anExpression.getTree(treeId)

      var expression = rehydrate(dehydrated, tree)

      expression.id = expressionId

      var i = tree.reservePosition()

      tree.addExpressionAt(expression, i)
    }

    ExpressionTree.prototype.addExpression = function(newExpression) {
      var i = this.reservePosition()
      this.addExpressionAt(newExpression, i)
    }

    ExpressionTree.prototype.addExpressionAt = function(newExpression, i) {
      
      this.log("anExpression.addAt", this.id, i, newExpression.id, dehydrate(newExpression))

      this.expressionsById[newExpression.id] = newExpression

      if (!newExpression.id) {
        throw new Error("expr "+JSON.stringify(newExpression, null, 2)+" doesn't have an id!")
      }

      this.expressionIds[i] = newExpression.id
    }

    // This adds more space in the array for a new expression positioned relative to others:


    anExpression.addLine = function(treeId, expressionId, functionLiteralId) {

      var tree = anExpression.getTree(treeId)
      var functionLiteral = tree.get(functionLiteralId)
      var expression = tree.get(expressionId)
      if (!expression) {
        throw new Error("expression "+expressionId+" isn't in the tree: "+tree.expressionIds)
      }

      tree.addLine(expression, functionLiteral)
    }

    ExpressionTree.prototype.addLine = function(expression, functionLiteral) {

      this.log("anExpression.addLine", this.id, expression.id, functionLiteral.id)

      functionLiteral.body.push(expression)
      this.setParent(expression.id, functionLiteral)
    }

    ExpressionTree.prototype.insertExpression = function(newExpression, relationship, relativeToThisId) {
      
      throw new Error("impl")

      var parentExpression = this.getParentOf(relativeToThisId)

      var relativeExpression = this.get(relativeToThisId)

      addExpressionToNeighbors(
        newExpression,
        parentExpression.body,
        relationship,
        relativeExpression
      )

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


      this.parentExpressionsByChildId[newExpression.id] = parentExpression

      var d = 1 - deleteThisMany

      this.expressionIdWritePosition += d

      this.expressionIds.splice(splicePosition, deleteThisMany, newExpression.id)
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

      var possibleParentIds = [ids[startIndex]]
      var lastDescendant = startIndex

      for(var i = startIndex+1; i < ids.length; i++) {

        var testId = ids[i]
        var testExpr = tree.expressionsById[testId]

        var testParent = tree.parentExpressionsByChildId[testId]

        if (!testParent) {
          var isDescendant = false
        } else {
          var testParentId = testParent.elementId
          var isDescendant = contains(possibleParentIds, testParent.elementId)
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
        if (ids[i] == relativeId) {
          return i
        }
      }

      throw new Error("Wanted to insert before "+relativeId+" but I can't find it!")

    }

    function indexAfter(tree, relativeId) {

      var ids = tree.expressionIds
      var parentIdStack = []

      for(var i = 0; i < ids.length; i++) {
        var testId = ids[i]

        if (testId == relativeId) {
          return lastDescendantAfter(tree, ids, i)+1
        }
      }

      throw new Error("Wanted to insert after "+relativeId+" but I can't find it!")
    }

    ExpressionTree.prototype.setParent = function(childId, parent) {
      this.parentExpressionsByChildId[childId] = parent
    }

    anExpression.addKeyPair = function(treeId, objectId, key, valueId, options) {

      var tree = anExpression.getTree(treeId)
      var objectExpression = tree.get(objectId)
      if (!objectExpression) {
        debugger
      }
      var valueExpression = tree.get(valueId)

      tree.addKeyPair(objectExpression, key, valueExpression, options)
    }

    ExpressionTree.prototype.addKeyPair = function(objectExpression, key, valueExpression, options) {

      this.log("anExpression.addKeyPair", this.id, objectExpression.id, key, valueExpression.id, options)

      if (!options) { options = {} }

      if (!objectExpression.keys) {
        objectExpression.keys = []
      }
      
      if (options.index) {
        objectExpression.keys.splice(options.index, 0, key)
      } else {
        objectExpression.keys.push(key)
      }

      var pair = {
        kind: "key pair",
        key: key,
        objectExpression: objectExpression,
        id: options.id
      }

      var pairIdentifier = objectExpression.id+"/"+key

      this.pairIds[pairIdentifier] = pair.id

      this.expressionsById[pair.id] = pair

      objectExpression.valuesByKey[key] = valueExpression

      this.keyPairsByValueId[valueExpression.id] = pair

      return pair
    }


    ExpressionTree.prototype.setKeyValue = function(pairExpression, newExpression) {

      var key = pairExpression.key

      var objectExpression = pairExpression.objectExpression

      var oldExpression = objectExpression.valuesByKey[key]

      objectExpression.valuesByKey[key] = newExpression

      newExpression.key = key

      if (oldExpression.id != newExpression.id) {

        delete tree.parentExpressionsByChildId[oldExpression.id]

        delete tree.keyPairsByValueId[oldExpression.id]
      }

      this.parentExpressionsByChildId[newExpression.id] = pairExpression.objectExpression

      this.keyPairsByValueId[newExpression.id] = pairExpression

    }


    // Expression generators

    anExpression.id = anId

    anExpression.stringLiteral =
      function(string) {
        return {
          kind: "string literal",
          string: string,
          id: anId(),
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

    anExpression.objectLiteral =
      function(object) {
        var expression = {
          kind: "object literal",
          valuesByKey: {},
          id: anId(),
        }

        for (var key in object) {
          expression.valuesByKey[key] = toExpression(object[key])
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