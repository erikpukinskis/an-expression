var library = require("module-library")(require)

module.exports = library.export(
  "an-expression",
  ["./program"],
  function(Program) {
    // HELPERS

    function pad(str) {
      var lines = str.split("\n")
      return lines.map(function(line) {
        return "  "+line
      }).join("\n")
    }


    var lastExpressionInteger = typeof window == "undefined" ? 1000*1000 : 1000

    function anExpression(json) {
      if (!json) { throw new Error("what are you trying to make an expression of?") }

      if (!json.id) {
        json.id = anId()
      }

      if (json.arguments) {
        json.arguments.forEach(anExpression)
      } else if (json.body) {
        json.body.forEach(anExpression)
      } else if (json.expression) {
        anExpression(json.expression)
      }

      return json
    }


    function sourceToExpression(stack, source, addToParent) {
      if (typeof stack == "number") {
        throw new Error("stack should be array")
      }
      var parent = stack[stack.length-1]

      var returnStatement = source.match(/^ *return (.*)/)

      var functionLiteralStart = !returnStatement && source.match(/^ *function ?([^(]*) ?([(][^)]*[)])/)

      var assignment = !functionLiteralStart && source.match(/^ *(var)? ?([^=]+) ?= ?(.*)/)

      var object = !assignment && source.match(/^ *{.*} *$/)

      var functionCall = !object && source.match(/^ *([^( ]+)[(]([^)]*)[)] *$/)

      var functionCallStart = !functionCall && source.match(/^ *([^( ]+)[(]([^)]*) *$/)

      var variable = !functionCallStart && source.match(/^ *([^(){}."'+-]+) *$/)

      var string = !variable && source.match(/^ *"(.*)" *$/)

      var isClosingBracket = !string && !!source.match(/^ *} *$/)

      var isFunctionCallEnd = !string && !!source.match(/^ *[)] *$/)

      var isWhitespace = !isClosingBracket && !!source.match(/^ *$/)


      if (isClosingBracket || isFunctionCallEnd) {
        stack.pop()
        return

      } else if (isWhitespace) {
        return

      } else if (returnStatement) {
        var rhs = returnStatement[1]

        var expression = {
          kind: "return statement",
          expression: sourceToExpression(stack, rhs),
          id: anId(),
        }

      } else if (functionLiteralStart) {
        var name = functionLiteralStart[1]

        var expression = {
          kind: "function literal",
          id: anId(),
        }

        if (name.length > 0) {
          expression.functionName = name
        }

        expression.argumentNames = argumentNames(functionLiteralStart[2])

        expression.body = []

      } else if (assignment) {
        var name = assignment[2].trim()

        if (!name) { throw new Error("no name on line: "+source) }

        var rhs = assignment[3].trim()

        if (!rhs) {
          throw new Error("not assigning anything to "+JSON.stringify(expression, null, 2))
        }

        var expression = {
          kind: "variable assignment",
          isDeclaration: !!assignment[1],
          variableName: name,
          expression: sourceToExpression(stack, rhs),
          id: anId(),
        }

      } else if (object) {
        var expression = anExpression.objectLiteral(eval(object[0]))

      } else if (functionCall) {
        var expression = matchToFunctionCall(functionCall)

      } else if (functionCallStart) {
        var expression = matchToFunctionCall(functionCallStart)

        stack.push(expression)

      } else if (variable) {
        var expression = {
          kind: "variable reference",
          variableName: variable[1],
          id: anId(),
        }

      } else if (string) {
        var expression = anExpression.stringLiteral(string[1])

      } else {
        debugger
        throw new Error("render-module's sourceToExpression function doesn't understand this line: "+source)
      }

      function matchToFunctionCall(match) {
        if (match[2].match(/".*,/)) {
          throw new Error("Your javascript is getting too fancy. If you need to use literals as function arguments, put each one on its own line. Your code: "+source)
        }

        var argSources = match[2].split(",")
        var args = []

        for(var i=0; i<argSources.length; i++) {
          var arg = sourceToExpression(stack, argSources[i])
          if (arg) {
            args.push(arg)
          }
        }

        var expression = {
          kind: "function call",
          functionName: match[1],
          arguments: args,
          id: anId(),
        }

        return expression
      }


      if (addToParent) {
        if (!parent) {
          debugger
          throw new Error("no parent")
        }
        if (parent.kind == "function literal") {
          parent.body.push(expression)
        } else if (parent.kind == "function call") {
          parent.arguments.push(expression)
        } else {
          throw new Error("Don't know how to add child expressions to a "+parent.kind)
        }
      }

      if (expression.kind == "function literal") {
        stack.push(expression)
      }

      if (expression && !expression.id) {
        throw new Error("Didn't give expression an id")
      }

      return expression
    }


    function anId() {
      lastExpressionInteger++
      var id = lastExpressionInteger.toString(36)
      return "expr-"+id
    }

    anExpression.id = anId

    anExpression.functionLiteral =function(func) {

      var lines = func.toString().split("\n")

      var stack = []
      var functionLiteral

      for(var i=0; i<lines.length-1; i++) {

        var newExpression = sourceToExpression(stack, lines[i], i>0)

        if (i == 0) {
          functionLiteral = newExpression
        }

      }

      return functionLiteral
    }


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


    // CODE GENERATORS

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
        var code = "function("
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

        for(var key in expression.valuesByKey) {
          keyPairs.push(
            "  "
            +JSON.stringify(key)
            +": "
            +expressionToJavascript(expression.valuesByKey[key])
          )
        }
        return "{\n"+keyPairs.join(",\n")+"\n}"
      },
      "return statement": function(expression) {
        return "return "+expressionToJavascript(expression.expression)
      },
    }

    anExpression.kinds = Object.keys(codeGenerators)


    // RUN

    anExpression.run =
      function(expression, fileName) {
    
        var js = expressionToJavascript(expression)

        js = js + "\n//# sourceURL="+fileName+".js"

        return eval(js)
      }

    function expressionToJavascript(expression) {

      var kind = expression.kind
      var makeCode = codeGenerators[kind]

      if (typeof makeCode != "function") {
        throw new Error("No code generator called "+kind)
      }

      return makeCode(expression)
    }


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

    anExpression.program = function(data) {
      return new Program(data)
    }

    anExpression.findProgram = function(id) {
      return Program.findById(id)
    }

    return anExpression
  }
)
