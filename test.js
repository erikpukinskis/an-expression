var runTest = require("run-test")(require)

runTest(
  "source generation",
  ["./"],
  function(expect, done, anExpression) {

    var orig = anExpression.tree()

    var func = anExpression.functionLiteral({
      functionName: "micCheck",
      argumentNames: ["one", "two"]
    })

    orig.addExpressionAt(orig.reservePosition(), func)


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

    orig.addLine(func.id, orig.reservePosition(), call)
    orig.addExpressionAt(orig.reservePosition(), string)
    orig.addExpressionAt(orig.reservePosition(), array)
    orig.addExpressionAt(orig.reservePosition(), number)


    var b = anExpression.variableReference("b")
    var object = anExpression.objectLiteral({
      a: b.id
    })
    var ass = anExpression.variableAssignment({
      variableName: "foo",
      isDeclaration: true,
      expression: object.id,
    })

    orig.addLine(func.id, orig.reservePosition(), ass)
    orig.addExpressionAt(orig.reservePosition(), object)
    orig.addExpressionAt(orig.reservePosition(), b)


    var falseLiteral = anExpression.false()
    var ret = anExpression.returnStatement({
      expression: falseLiteral.id,
    })

    orig.addLine(func.id, orig.reservePosition(), ret)
    orig.addExpressionAt(orig.reservePosition(), falseLiteral)


    var correctSource = 
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

  console.log("\n\nORIGINAL\n========================\n"+orig.toJavaScript()+"\n=====================\n\n\n\nCORRECT:\n======================\n"+correctSource+"\n=====================\n\n\n")

    expect(orig.toJavaScript()).to.equal(correctSource)


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