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

tree.addKeyPair(
  objectExpressionId,
  "b",
  tree.numberLiteral(2))
```