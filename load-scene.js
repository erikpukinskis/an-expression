var anExpression = require("an-expression")

function triangle() {

  var expression = {
    kind: "array literal",
    items: [
      anExpression.objectLiteral({
        name: "triangle",
        position: [-1.5, 0.0, -7.0],
        verticies: [
           0.0,  1.0,  0.0,
          -1.0, -1.0,  0.0,
           1.0, -1.0,  0.0
        ],
        pointCount: 3,
        colors: [
          1.0, 0.4, 0.6, 1.0,
          0.9, 0.4, 0.7, 1.0,
          0.8, 0.4, 0.9, 1.0
        ]
      })
    ]
  }

  return expression
}

var loadedProgram = anExpression({
  kind: "function literal",
  argumentNames: ["addHtml", "drawScene"],
  body: [
    {
      kind: "function call",
      functionName: "addHtml",
      arguments: [
        anExpression.stringLiteral("<canvas></canvas>")
      ]
    },
    {
      kind: "function call",
      functionName: "drawScene",
      arguments: [triangle()]
    },
  ]
})
