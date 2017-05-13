var library = require("module-library")(require)

module.exports = library.export(
  "expression-to-javascript",
  function() {

    function expressionToJavascript(expression) {

      var kind = expression.kind
      var makeCode = codeGenerators[kind]

      if (typeof makeCode != "function") {
        throw new Error("No code generator called "+kind)
      }

      return makeCode(expression)
    }

    var codeGenerators = {
      "function call": function(expression) {
        var args = expression.arguments.map(
          expressionToJavascript
        ).join(",\n")
        return expression.functionName+"(\n"+pad(args)+"\n)"
      },
      "array literal": function(expression) {
        var items = expression.items.map(
          expressionToJavascript
        )
        return "[\n"+pad(items.join(",\n"))+"\n]"
      },
      "function literal": function(expression) {
        var names = expression.argumentNames.join(", ")
        var lines = expression.body.map(
          expressionToJavascript
        )
        var code = "function"
        var name = expression.functionName

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
      "string literal": function(expression) {
        return JSON.stringify(expression.string)
      },
      "number literal": function(expression) {
        return expression.number.toString()
      },
      "empty expression": function() {
        return "null"
      },
      "variable assignment": function(expression) {

        source = expression.variableName
          +" = "
          +expressionToJavascript(expression.expression)

        if (expression.isDeclaration) {
          source = "var "+source
        }

        return source
      },
      "variable reference": function(expression) {
        return expression.variableName
      },
      "object literal": function(expression) {
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
      "return statement": function(expression) {
        return "return "+expressionToJavascript(expression.expression)
      },
      "boolean": function(expression) {
        if (expression.value) {
          return "true"
        } else {
          return "false"
        }
      }
    }

    // expressionToJavascript.kinds = Object.keys(codeGenerators)

    // console.log("kinds are", JSON.stringify(expressionToJavascript.kinds))

    function argumentNames(func) {
      if (typeof func == "string") {
        var firstLine = func
      } else {
        var firstLine = func.toString().match(/.*/)[0]
      }

      var argString = firstLine.match(/[(]([^)]*)/)[1]

      var args = argString.split(/, */)

      var names = []
      for(var i=0; i<args.length; i++) {
        if (args[i].length > 0) {
          names.push(args[i])
        }
      }

      return names
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
