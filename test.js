var runTest = require("run-test")(require)

runTest(
  "forking",
  ["./"],
  function(expect, done, anExpression) {

    var orig = anExpression.tree()

    var func = anExpression.functionLiteral({functionName: "whatev"})

    orig.addExpressionAt(func, orig.reservePosition())

    orig.addLine(anExpression.true(), orig.reservePosition(), func)

    var fork = orig.fork()

    debugger

    fork.addLine(anExpression.false(), fork.reservePosition(), func)

    orig.addLine(anExpression.true(), orig.reservePosition(), func)

    var trueTrue = anExpression.toJavascript(orig.root())

    expect(trueTrue).to.equal(function whatev() {
  true
  true
}.toString())

    done.ish("original program looks good")

    var falseFalse = anExpression.toJavascript(fork.root())

    expect(trueTrue).to.equal(function whatev() {
  true
  false
}.toString())

    done()
  }
)