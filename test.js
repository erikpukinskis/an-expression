var runTest = require("run-test")(require)

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