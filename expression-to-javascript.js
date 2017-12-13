var library = require("module-library")(require)

module.exports = library.export(
  "expression-to-javascript",
  function() {

    function expressionToJavascript(tree, id) {

      if (!id) {
        id = tree.rootId()
      }

      var kind = tree.getAttribute("kind", id)

      if (!kind) {
        throw new Error("Some expression "+id+" in this tree: "+JSON.stringify(tree, null, 2)+" has no kind. Weird.")
      }

      var makeCode = codeGenerators[kind]

      if (typeof makeCode != "function") {
        debugger
        throw new Error("No code generator called "+kind)
      }

      return makeCode(tree, id)
    }

    var codeGenerators = {
      "function call": function(tree, id) {
        var argIds = tree.getList("arguments", id)
        var name = tree.getAttribute("functionName", id)

        if (!argIds) {
          var argLines = ""
        } else {
          var argLines = argIds.map(toArgLine).join(",\n")
        }

        function toArgLine(expressionId) {
          return "  "+expressionToJavascript(tree, expressionId)
        }

        return name+"(\n"+argLines+")"
      },
      "array literal": function(tree, id) {
        var itemIds = tree.getList("items", id)

        var items = itemIds.map(function(itemId) {
          return "  "+expressionToJavascript(tree, itemId)
        })

        return "[\n"+items.join(",\n")+"\n]"
      },
      "function literal": function(tree, id) {
        var names = tree.getList("argumentNames", id).join(", ")

        var body = tree.getList("body", id)

        var lines = body.map(function(lineId) {
          return expressionToJavascript(tree, lineId)
        })

        var code = "function"
        var name = tree.getAttribute("functionName", id)

        if (name) {
          code += " "+name
        }

        code += "("
          +names
          +") {\n"
          +pad(lines.join("\n"))
          +"\n}"

        return code
      },
      "string literal": function(tree, id) {
        var string = tree.getAttribute("string", id)
        return JSON.stringify(string)
      },
      "number literal": function(tree, id) {
        var number = tree.getAttribute("number", id)
        return number.toString()
      },
      "empty expression": function() {
        return "null"
      },
      "variable assignment": function(tree, id) {
        var variableName = tree.getAttribute("variableName", id)
        var rhsId = tree.getAttribute("expression", id)
        var isDeclaration = tree.getAttribute("isDeclaration", id)

        var rhsSource = expressionToJavascript(tree, rhsId)

        var source = variableName+" = "+rhsSource

        if (isDeclaration) {
          source = "var "+source
        }

        return source
      },
      "variable reference": function(tree, id) {
        return tree.getAttribute("variableName", id)
      },
      "object literal": function(tree, id) {

        var pairIds = tree.getList("pairIds", id)

        if (pairIds) {
          var pairLines = pairIds.map(toLine).join(",\n")
        } else {
          var pairLines = ""
        }

        function toLine(pairId) {
          var key = tree.getAttribute("key", pairId)
          var valueId = tree.getAttribute("valueId", pairId)

          var valueSource = expressionToJavascript(tree, valueId)

          var pairSource = "  "+JSON.stringify(key)+": "+valueSource

          return pairSource
        }

        return "{\n"+pairLines+"\n}"
      },
      "return statement": function(tree, id) {
        var rhsId = tree.getAttribute("expression", id)
        var rhsSource = expressionToJavascript(tree, rhsId)
        return "return "+rhsSource
      },
      "boolean": function(tree, id) {
        var value = tree.getAttribute("value", id)
        if (value) {
          return "true"
        } else {
          return "false"
        }
      }
    }

    function pad(str) {
      var lines = str.split("\n")
      return lines.map(function(line) {
        return "  "+line
      }).join("\n")
    }

    return expressionToJavascript
  }
)
