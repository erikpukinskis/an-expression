**anExpression** lets you programmatically build JavaScript expressions, modifemy them, and then turn them into source code.

## Builders

Build a function call:

```javascript
var sqrtMinusOne = anExpression.functionCall({
  functionName: "Math.sqrt",
  arguments: [-1]
})
```

Add a line to a function literal:

```javascript
var imaginary = anExpression.functionLiteral({
  functionName: "imaginary",
  body: [
    anExpression.variableAssignment({
      variableName: "i",
      expression: sqrtMinusOne
    })
  ]
})
```
Etc:

```javascript
anExpression.objectLiteral({foo: "bar"})
anExpression.stringLiteral("hiya")
````

You can also just build expressions manually:

```
var returnTrue = {
  kind: "return statement",
  id: anExpression.id(),
  expression: anExpression.true()
}
```

## Expression tree

An expression tree keeps track of all of the expressions within a parent expression. It keeps references to every expression, key-value, etc, as well as indexes for fast lookups of expressions and methods for modifying the tree.

Create a new tree and add a function call:

```javascript
var tree = anExpression.tree()
tree.addExpressionAt(imaginary, 0)
```

We knew we were adding that expression at index 0, but if you are just adding a line to the end of the function, you can call tree.reservePosition() to get the next index. The expression tree maintains an ordered array of all of the expressions in the tree.

Add more lines to the function:

```javascript
tree.addLine(returnTrue, tree.reservePosition(),  imaginary)
```

You can get a list of expressions if you want to iterate through them all:

```javascript
var ids = tree.getIds()
```

## Getting source code

Once you're done, you can get the source code for the tree:

```javascript
var source = anExpression.toJavascript(tree.root())
```

Which is equivalent to:

```javascript
anExpression.toJavascript(imaginary)
```

## Rebuilding

If you want to be able to rebuild the tree with all of its modifications, you can log the tree to a universe:

```javascript
var universe = tellTheUniverse.called("my-program").withNames({"anExpression": "anExpression"})
var tree = anExpression.tree()
tree.logTo(universe)
tree.addExpressionAt(...)
var builder = tree.builder()

var idForLater = tree.id

// some time later
builder(anExpression)
var rebuiltTree = anExpression.getTree(idForLater)
```

