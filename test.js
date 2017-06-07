var runTest = require("run-test")(require)

runTest.skip(
  "adding multiple expressions at once",
  ["./"],
  function(expect, done, anExpression) {
    var attributes = 
      anExpression.functionCall({
        functionName: "addHtml",
        arguments: [
          anExpression.stringLiteral("text")
        ]
      })

    var tree = anExpression.tree()
    tree.addExpressionAt(0, attributes)

    var string = tree.query("root.arguments.0.text")

    expect(string).to.equal("text")
    done()
  }
)

runTest(
  "source generation",
  ["./"],
  function(expect, done, anExpression) {

    var expectedSource = 
function micCheck(one, two) {
  callIt(
    "hi",
    [
    1
  ])
  var foo = {
    "a": b
  }
  return false
}.toString()

    var tree = anExpression.tree()

    var mic = anExpression.functionLiteral({
      functionName: "micCheck",
      argumentNames: ["one", "two"]
    })

    tree.addExpressionAt(tree.reservePosition(), mic)

    var string = anExpression.stringLiteral("hi")
    var number = anExpression.numberLiteral(1)
    var array = anExpression.arrayLiteral([number.id])
    var call = anExpression.functionCall({
      functionName: "callIt",
      arguments: [
        string.id,
        array.id
      ]
    })
    
    tree.addLine(mic.id, tree.reservePosition(), call)
    tree.addExpressionAt(tree.reservePosition(), string)
    tree.addExpressionAt(tree.reservePosition(), array)
    tree.addExpressionAt(tree.reservePosition(), number)

    expect(tree.getRole(call.id)).to.equal("function literal line")
    expect(tree.getRole(number.id)).to.equal("array item")
    done.ish("remember roles")

    var b = anExpression.variableReference("b")
    var object = anExpression.objectLiteral({
      a: b.id
    })
    var ass = anExpression.variableAssignment({
      variableName: "foo",
      isDeclaration: true,
      expression: object.id,
    })

    tree.addLine(mic.id, tree.reservePosition(), ass)
    tree.addExpressionAt(tree.reservePosition(), object)
    tree.addExpressionAt(tree.reservePosition(), b)


    var falseLiteral = anExpression.false()
    var ret = anExpression.returnStatement({
      expression: falseLiteral.id,
    })

    tree.addLine(mic.id, tree.reservePosition(), ret)
    tree.addExpressionAt(tree.reservePosition(), falseLiteral)

    var expectedIds = [
      mic.id,
      call.id,
      string.id,
      array.id,
      number.id,
      ass.id,
      object.id,
      b.id,
      ret.id,
      falseLiteral.id,
    ]

    expect(tree.getIds()).to.eql(expectedIds)


    // console.log("\n\nORIGINAL\n========================\n"+tree.toJavaScript()+"\n=====================\n\n\n\nEXPECTED:\n======================\n"+expectedSource+"\n=====================\n\n\n")

    expect(tree.toJavaScript()).to.equal(expectedSource)


    done()
  }
)


runTest(
  "forking",
  ["./"],
  function(expect, done, anExpression) {

    var orig = anExpression.tree()

    var func = anExpression.functionLiteral({functionName: "whatev"})

    orig.addExpressionAt(orig.reservePosition(), func)

    var originalTrue = anExpression.true()

    orig.addLine(func.id, orig.reservePosition(), originalTrue)

    var fork = orig.fork()

    var originalKind = fork.getAttribute("kind", originalTrue.id)

    expect(originalKind).to.equal("boolean")
    done.ish("forking maintains attributes")

    fork.addLine(func.id, fork.reservePosition(), anExpression.false())

    var falseFalse = fork.toJavaScript()

    expect(falseFalse).to.equal(
function whatev() {
  true
  false
}.toString())
    done.ish("fork looks good")

    var vals = []
    fork.eachListItem("body", func.id, function(booleanId) {
      var value = fork.getAttribute("value", booleanId)
      vals.push(value) 
    })
    expect(vals).to.eql([true, false])
    done.ish("can iterate fork")

    orig.addLine(func.id, orig.reservePosition(), anExpression.true())

    var trueTrue = orig.toJavaScript()

    expect(trueTrue).to.equal(
function whatev() {
  true
  true
}.toString())
    done.ish("original program looks good")


    done()
  }
)