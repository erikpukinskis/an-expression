var anExpression = require("an-expression")

var loadedProgram = anExpression({
  kind: "function literal",
  argumentNames: ["webElement", "bridgeTo"],
  body: [
    {
      kind: "variable assignment",
      variableName: "sup",
      expression: {
        kind: "function call",
        functionName: "webElement",
        arguments: [
          anExpression.stringLiteral(
            "sup family"
          ),
          {
            kind: "function call",
            functionName: "webElement.style",
            arguments: [styleObject()]
          }
        ]
      }
    },
    {
      kind: "function call",
      functionName: "bridgeTo.webPage",
      arguments: [
        {
          kind: "function literal",
          argumentNames: ["page"],
          body: [sendPage()]
        }
      ]
    }
  ]
})


function styleObject() {
  return {
    kind: "object literal",
    valuesByKey:
      {
    "font-size": anExpression.stringLiteral("60pt"),
    "font-family": anExpression.stringLiteral("georgia")
      }
  }
}

function sendPage() {
  return {
    kind: "function call",
    functionName: "page.send",
    arguments: [
      {
        kind: "variable reference",
        variableName: "sup"
      }
    ]
  }
}

loadedProgram.name = "home-page"

module.exports = loadedProgram

