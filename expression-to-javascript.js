var library = require("module-library")(require)

module.exports = library.export(
  "expression-to-javascript",
  function() {

    function expressionToJavascript(tree, id) {

      if (!id) {
        id = tree.rootId()
      }

      var kind = tree.getAttribute("kind", id)

      var makeCode = codeGenerators[kind]

      if (typeof makeCode != "function") {
        debugger
        throw new Error("No code generator called "+kind)
      }

      return makeCode(tree, id)
    }

    var codeGenerators = {
      "function call": function(tree, id) {
        throw new Error("impl")
        var args = expression.arguments.map(
          expressionToJavascript
        ).join(",\n")
        return expression.functionName+"(\n"+pad(args)+"\n)"
      },
      "array literal": function(tree, id) {
        throw new Error("impl")
        var items = expression.items.map(
          expressionToJavascript
        )
        return "[\n"+pad(items.join(",\n"))+"\n]"
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
        throw new Error("impl")
        return JSON.stringify(expression.string)
      },
      "number literal": function(tree, id) {
        throw new Error("impl")
        return expression.number.toString()
      },
      "empty expression": function() {
        return "null"
      },
      "variable assignment": function(tree, id) {
        throw new Error("impl")

        source = expression.variableName
          +" = "
          +expressionToJavascript(expression.expression)

        if (expression.isDeclaration) {
          source = "var "+source
        }

        return source
      },
      "variable reference": function(tree, id) {
        throw new Error("impl")
        return expression.variableName
      },
      "object literal": function(tree, id) {
        throw new Error("impl")
        var keyPairs = []

        for(var i=0; i<expression.keys.length; i++) {
          var key = expression.keys[i]
          var value = expression.values[i]

          keyPairs.push(
            "  "
            +JSON.stringify(key)
            +": "
            +expressionToJavascript(value)
          )
        }
        return "{\n"+keyPairs.join(",\n")+"\n}"
      },
      "return statement": function(tree, id) {
        throw new Error("impl")
        return "return "+expressionToJavascript(expression.expression)
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
