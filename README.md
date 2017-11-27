**anExpression** lets you programmatically build JavaScript expressions, modify them, and then turn them into source code.

```javascript
var anExpression = require("an-expression")
var javascriptToEzjs = require("javascript-to-ezjs")

var tree = anExpression.tree()

javascriptToEzjs("blah({\n  a: 1,})", tree)
```

Once we have built a tree, we can query the data. Here we'll iterate through the key value pairs on that object expression, and expect to see the number 1:

```javascript
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
      throw new Error("Bad number") }

    if (parentId != tree.root().id) {
      throw new Error("Bad root")}})
```

We can also modify the tree:

```javascript
tree.addKeyValuePair(
  objectExpressionId,
  "b",
  tree.numberLiteral(2))
```

And then dump the modified code:

```javascript
// tree.toJavaScript() returns:
blah({
  a: 1,
  b: 2})
```

## Methods

```javascript
// Adds an empty function literal at the next available position
tree.addExpressionAt(
  tree.reservePosition(),
  anExpression.functionLiteral())
```

## Expression generators

```javascript

var hello = anExpression.stringLiteral("hello, world")

// "hello, world"

anExpression.functionLiteral({
  functionName: "add",
  argumentNames: ["a", "b"],
  body: hello})

// function add(a, b) {
//   "hello, world"
// }

var a = anExpression.numberLiteral(42)

// 42

var b = anExpression.numberLiteral(1)

// 1

anExpression.functionCall({
  functionName: "add",
  arguments: [a, b]})

// add(42, 1)

anExpression.variableReference("a")

// a

anExpression.variableAssignment({
  variableName: "a",
  expression: "b"})

// a = b

anExpression.variableAssignment({
  variableName: "c",
  expression: "b",
  isDeclaration: true})

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
  expression: a})

// return a

```
