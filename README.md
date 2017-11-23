**anExpression** lets you programmatically build JavaScript expressions, modify them, and then turn them into source code.

```javascript
var tree = anExpression.tree()
javascriptToEzjs("blah({\n  a: 1,})", tree)

var objectExpressionId = tree.root().arguments[0]

tree.eachListItem(
  "pairIds",
  objectExpressionId,
  function(pairId) {
    var key = tree.getAttribute(tree, "key", pairId)
    var parentId = tree.getAttribute("key", pairId)
    var valueId = tree.getAttribute("valueId", pairId)
    var number = tree.getAttribute("number", valueId)

    if (number != 1) {
      throw new Error("Bad number")}

    if (parentId != tree.root().id) {
      throw new Error("Bad root")} })

tree.addKeyValuePair(
  objectExpressionId,
  "b",
  tree.numberLiteral(2))
```

## Expression generators

```javascript

var hello = anExpression.stringLiteral("hello, world")

// "hello, world"

anExpression.functionLiteral({
  functionName: "add",
  argumentNames: ["a", "b"],
  body: hello
})

// function add(a, b) {
//   "hello, world"
// }

var a = anExpression.numberLiteral(42)

// 42

var b = anExpression.numberLiteral(1)

// 1

anExpression.functionCall({
  functionName: "add",
  arguments: [a, b]
})

// add(42, 1)

anExpression.variableReference("a")

// a

anExpression.variableAssignment({
  variableName: "a",
  expression: "b"
})

// a = b

anExpression.variableAssignment({
  variableName: "c",
  expression: "b",
  isDeclaration: true
})

// var c = b

anExpression.objectLiteral({
  name: a.id
})

// {name: a}

anExpression.arrayLiteral([a.id, b.id])

// [a, b]

anExpression.boolean(true)
anExpression.true()

// true

anExpression.false()

// false

anExpression.returnStatement({
  expression: a
})

// return a

```
