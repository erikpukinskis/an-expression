var runTest = require("run-test")(require)

runTest(
  "forking",
  ["./"],
  function(expect, done, anExpression) {

    var orig = anExpression.tree()

    var func = anExpression.functionLiteral({functionName: "whatev"})

    orig.addExpressionAt(func, 0)

    orig.addLine(anExpression.true(), 1, func)

    var fork = orig.fork()

    fork.addLine(anExpression.false(), 1, func)

    orig.addLine(anExpression.true(), 1, func)

    var trueTrue = anExpression.toJavascript(orig.root())

    expect(trueTrue).to.equal(function whatev() {
  true
  true
}.toString())

    var falseFalse = anExpression.toJavascript(fork.root())

    expect(trueTrue).to.equal(function whatev() {
  true
  false
}.toString())

    done()
  }
)