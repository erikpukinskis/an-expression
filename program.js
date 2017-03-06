var library = require("module-library")(require)

module.exports = library.export(
  "an-expression/Program",
  ["function-call"],
  function(functionCall) {

    var programs = {}
    var lastProgramId = 300
    function makeId() {
      lastProgramId++
      return "prog-"+lastProgramId.toString(36)
    }

    function Program(data) {
      this.expressionIdWritePosition = 0
      this.id = makeId()
      programs[this.id] = this
      this.expressionIds = []
      this.expressionsById = {}
      this.keyPairsByValueId = {}
      this.parentExpressionsByChildId = {}
      this.onchangedCallbacks = []
      this.onnewexpressionCallbacks = []
      this.getIds = getIds.bind(this)
      this.pairIds = {}

      if (data && data.expressionIds.length > 0 && !data.expressionIds[0]) {
        throw new Error("no ida!")
      }

      if (data) { this.load(data) }
    }

    Program.prototype.reservePosition = function() {
      var i = 
      this.expressionIdWritePosition
      this.expressionIdWritePosition++
      return i
    }

    Program.findById = function(id) {
      return programs[id]
    }

    Program.prototype.asBinding = function() {
      return functionCall("library.get(\"program\").findById(\""+this.id+"\")").singleton()
    }

    Program.prototype.rootExpression = function() {
      var rootId = this.expressionIds[0]
      return this.expressionsById[rootId]
    }

    Program.prototype.get = function(id) {
      return this.expressionsById[id]
    }

    Program.prototype.getParentOf = function(id) {
      return this.parentExpressionsByChildId[id]
    }

    Program.prototype.onchanged = function(callback) {
      this.onchangedCallbacks.push(callback)
    }

    Program.prototype.onnewexpression = function(callback) {
      this.onnewexpressionCallbacks.push(callback)
    }

    Program.prototype.changed = function() {

      window.__nrtvFocusSelector = ".output"

      document.querySelector(".output").innerHTML = ""

      var expression = this.rootExpression()

      this.onchangedCallbacks.forEach(function(callback) {
        callback(expression)
      })
    }

    Program.prototype.newexpression =
      function(parent, newExpression) {
        this.onnewexpressionCallbacks.forEach(function(callback) {

          callback(parent, newExpression)
        })
      }

    function call(func) { func() }

    Program.prototype.data = function() {
      var parents = {}
      var dehydratedById = {}
      var program = this

      this.expressionIds.forEach(function(id) {

        var expression = program.expressionsById[id]
        var parent = program.parentExpressionsByChildId[id]

        if (parent) {
          parents[id] = parent.id
        }

        var dehydrated = {}
        for(var key in expression) {
          dryCopy(key, expression, dehydrated)
        }

        dehydratedById[id] = dehydrated
      })

      return {
        expressionIds: this.expressionIds,
        expressionsById: dehydratedById,
        keyPairsByValueId: null,
        parents: parents,
        pairIds: this.pairIds
      }
    }

    function dryCopy(attribute, expression, dehydrated) {

      switch(attribute) {
        case "body":
        case "arguments":
        case "items":
          dehydrated[attribute] = expression[attribute].map(toId)
          break
        case "expression":
          dehydrated[attribute] = toId(expression[attribute])
          break
        case "valuesByKey":
          dehydrated[attribute] = {}
          for(var key in expression.valuesByKey) {
            dehydrated[attribute][key] = toId(expression[attribute][key])
          }
          break
        default:
          dehydrated[attribute] = expression[attribute]
      }
    }

    function toId(x) { return x.id }

    function wetCopy(attribute, dehydrated, program) {

      function toExpression(id) {
        return program.expressionsById[id]
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

            var pairId = program.pairIds[objectExpression.id+"/"+key]

            program.addKeyPair(
              objectExpression,
              key,
              program.get(valueIds[key]),
              {id: pairId}
            )
          }
          break
      }
    }

    Program.prototype.load = function(data) {

      this.expressionIds = data.expressionIds

      this.expressionIdWritePosition = data.expressionIds.length

      this.pairIds = data.pairIds

      this.expressionsById = data.expressionsById

      this.keyPairsByValueId

      this.parentExpressionsByChildId = {}

      var program = this

      function rehydrate(id) {

        var dehydrated = program.expressionsById[id]

        for(var attribute in dehydrated) {
          wetCopy(attribute, dehydrated, program)
        }

        var parentId = data.parents[id]

        if (parentId) {
          program.parentExpressionsByChildId[id] = program.expressionsById[parentId]
        }
      }

      this.expressionIds.forEach(rehydrate) 
    }

    function getIds() {
      return this.expressionIds
    }

    Program.prototype.getProperty = function(property, expressionId) {
      var expression = this.expressionsById[expressionId]
      return expression[property]
    }

    Program.prototype.setProperty = function(property, expressionId, newValue, oldValue) {
      var expression = this.expressionsById[expressionId]
      expression[property] = newValue
      this.changed()
    }

    Program.prototype.setFloatProperty = function(property, expressionId, newValue, oldValue) {
      var expression = expressionsById[expressionId]
      expression[property] = parseFloat(newValue)
      this.changed()
    }

    Program.prototype.getKeyName = function(id) {
      var pairExpression = this.expressionsById[id]
      return pairExpression.key
    }

    Program.prototype.onKeyRename = function(pairId, newKey) {
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

    Program.prototype.getArgumentName = function(expressionId, index) {
      var expression = this.expressionsById[expressionId]

      return expression.argumentNames[index]
    }

    Program.prototype.getPairForValueId = function(valueExpressionId) {
      return this.keyPairsByValueId[valueExpressionId]
    }

    Program.prototype.renameArgument = function(expressionId, index, newName) {
      var expression = this.expressionsById[expressionId]

      expression.argumentNames[index] = newName

      this.changed()
    }

    Program.prototype.addFunctionArgument = function(expressionId, name) {

      var functionExpression = this.expressionsById[expressionId]

      var index = functionExpression.argumentNames.length

      functionExpression.argumentNames.push(name)

      return index
    }

    Program.prototype.addExpressionAt = function(newExpression, i) {

      this.expressionsById[newExpression.id] = newExpression

      if (!newExpression.id) {
        throw new Error("expr "+JSON.stringify(newExpression, null, 2)+" doesn't have an id!")
      }
      this.expressionIds[i] = newExpression.id
    }


    Program.prototype.insertExpression = function(newExpression, relationship, relativeToThisId) {

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

    function lastDescendantAfter(program, ids, startIndex) {

      var possibleParentIds = [ids[startIndex]]
      var lastDescendant = startIndex

      for(var i = startIndex+1; i < ids.length; i++) {

        var testId = ids[i]
        var testExpr = program.expressionsById[testId]

        var testParent = program.parentExpressionsByChildId[testId]

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

    function indexBefore(program, relativeId) {

      var ids = program.expressionIds

      for(var i = 0; i < ids.length; i++) {
        if (ids[i] == relativeId) {
          return i
        }
      }

      throw new Error("Wanted to insert before "+relativeId+" but I can't find it!")

    }

    function indexAfter(program, relativeId) {

      var ids = program.expressionIds
      var parentIdStack = []

      for(var i = 0; i < ids.length; i++) {
        var testId = ids[i]

        if (testId == relativeId) {
          return lastDescendantAfter(program, ids, i)+1
        }
      }

      throw new Error("Wanted to insert after "+relativeId+" but I can't find it!")
    }

    Program.prototype.setParent = function(childId, parent) {
      this.parentExpressionsByChildId[childId] = parent
    }

    Program.prototype.addVirtualExpression = function(expression) {

      this.expressionsById[expression.id] = expression
    }

    Program.prototype.addKeyPair = function(objectExpression, key, valueExpression, options) {

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

    Program.prototype.setKeyValue = function(pairExpression, newExpression) {

      var key = pairExpression.key

      var objectExpression = pairExpression.objectExpression

      var oldExpression = objectExpression.valuesByKey[key]

      objectExpression.valuesByKey[key] = newExpression

      newExpression.key = key

      if (oldExpression.id != newExpression.id) {

        delete program.parentExpressionsByChildId[oldExpression.id]

        delete program.keyPairsByValueId[oldExpression.id]
      }

      this.parentExpressionsByChildId[newExpression.id] = pairExpression.objectExpression

      this.keyPairsByValueId[newExpression.id] = pairExpression

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

    return Program
  }
)