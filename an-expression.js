var library = require("module-library")(require)

module.exports = library.export(
  "an-expression",
  ["function-call", "./expression-to-javascript", "forkable-list"],
  function(functionCall, expressionToJavascript, forkableList) {

    // BUILDING

    function anExpression(treeId, index, id, attributes) {

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
      this.expressionIdWritePosition = 0
      this.expressionIds = forkableList()
      this.expressionsById = {}
      this.keyPairsByValueId = {}
      this.parentExpressionsByChildId = {}
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
      var i = 
      this.expressionIdWritePosition
      this.expressionIdWritePosition++
      return i
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

      tree.expressionsById[id] = expression

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

        var testParent = tree.getParentOf(testId)

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

      function toId(x) {
        if (!x) {
          throw new Error("Tried to get an id while dry copying the \""+attribute+"\" attribute on "+JSON.stringify(expression)+" is something undefined or null there?")
        }
        return x.id
      }

      if (typeof expression[attribute] == "undefined") {
        throw new Error(attribute+" attribute on expression "+expression+" is undefined wtf?")
      }

      switch(attribute) {
        case "body":
        case "arguments":
        case "items":
        case "values":
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
        case "functionName":
        case "argumentNames":
        case "variableName":
        case "string":
        case "number":
        case "isDeclaration":
        case "keys":
        case "pairIds":
        case "value":
          dehydrated[attribute] = expression[attribute]
          break;
        case "id":
          // this is already in the log calls, so we don't need it in the attributes
        case "i":
        case "parentToAdd":
        case "lineIn":
        case "keys":
          // discard these. we add them in javascript-to-ezjs. Ideally we would just not f with expressions at all, and just error if we see these 
        case "role":
          // and this one is added by render-expression
          break;
        default:
          console.log(JSON.stringify(expression, null, 2))
          throw new Error("should "+attribute+" stay on a dehydrated expression?")
      }
    }

    function wetCopy(attribute, dehydrated, tree) {

      function toExpression(id) {
        return tree.get(id)
      }

      switch(attribute) {
        case "body":
        case "arguments":
        case "items":
        case "values":
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
      var expression = this.expressionsById[id]

      if (!expression && this.parent) {
        expression = this.parent.get(id)
      }

      return expression
    }

    ExpressionTree.prototype.getPairForValueId = function(valueExpressionId) {
      var pair = this.keyPairsByValueId[valueExpressionId]

      if (!pair && this.parent) {
        pair = this.parent.getPairForValueId(valueExpressionId)
      }

      if (pair.deleted) {
        return
      } else {
        return pair
      }
    }
    
    ExpressionTree.prototype.getParentOf = function(id) {
      var parentExpression = this.parentExpressionsByChildId[id]

      if (!parentExpression && this.parent) {
        parentExpression = this.parent.getParentOf(id)
      }

      if (parentExpression.deleted) {
        return
      } else {
        return parentExpression
      }
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

      var expression = this.get(expressionId
      expression[property] = newValue
      this.changed()
    }

    ExpressionTree.prototype.setFloatProperty = function(property, expressionId, newValue) {
      throw new Error("implement log")
      var expression = this.get(expressionId)
      expression[property] = parseFloat(newValue)
      this.changed()
    }

    ExpressionTree.prototype.getKeyName = function(id) {
      var pairExpression = this.get(id)
      return pairExpression.key
    }

    ExpressionTree.prototype.onKeyRename = function(pairId, newKey) {
      var pairExpression = this.get(pairId)
      var object = pairExpression.objectExpression.valuesByKey
      var oldKey = pairExpression.key

      pairExpression.key = newKey
      object[newKey] = object[oldKey]

      var baseId = pairExpression.objectExpression.id
      this.pairIds[baseId+"/"+oldKey] = undefined
      this.pairIds[baseId+"/"+newKey] = pairId

      throw new Error("expressions are immutable now")
      delete object[oldKey]
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
      var objectExpression = tree.get(objectId)
      var valueExpression = tree.get(valueId)

      tree.addKeyPair(objectExpression, key, valueExpression, options)
    }

    ExpressionTree.prototype.addKeyPair = function(objectExpression, key, valueExpression, options) {

      this.log("anExpression.addKeyPair", this.id, objectExpression.id, key, valueExpression.id, options)

      if (!options) { options = {} }

      if (!objectExpression.keys) {
        objectExpression.keys = []
      }
      
      var i = options.index || objectExpression.keys.length

      objectExpression.keys.splice(i, 0, key)
      objectExpression.values.splice(i, 0, valueExpression)
      objectExpression.pairIds.splice(i, 0, pairId)
    }

    var DELETED = {deleted: true}

    ExpressionTree.prototype.setKeyValue = function(pairExpression, newExpression) {

      var key = pairExpression.key

      var objectExpression = pairExpression.objectExpression

      var oldExpression = objectExpression.valuesByKey[key]

      objectExpression.valuesByKey[key] = newExpression

      newExpression.key = key

      if (oldExpression.id != newExpression.id) {

        tree.parentExpressionsByChildId[oldExpression.id] = DELETED

        tree.keyPairsByValueId[oldExpression.id] = DELETED
      }

      this.parentExpressionsByChildId[newExpression.id] = pairExpression.objectExpression

      this.keyPairsByValueId[newExpression.id] = pairExpression

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