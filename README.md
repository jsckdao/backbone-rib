Rib - 让Backbone可以更优雅
========================

Rib是什么?
---------

[Backbone](http://backbonejs.org)是一款简洁高效的MVC Javascript 框架,
但是它的设计更加侧重于数据模型的管理, 在视图显示交互方面没有提供更高层次的功能.
rib是对Backbone的一个附加扩展, 为其提供一个简单而灵活数据绑定功能, 以弥补其在这方面的不足.

rib尊重 Backbone原本的设计思路, 你可以放心的把它引入任何已存在Backbone项目中,
而不必担心会对原来的代码有任何的影响. 因为rib没有对Backbone做任何富有侵略性的改造,
你唯一能注意的变化就是你所有的 View 对象将会多出一个可调用方法, 仅此而已. 与其他同样具有
数据绑定功能的MVC框架(比如[Ember.js](http://emberjs.com))不同. rib不依赖于任何模板引擎,
也不会与任何现有的模板引擎起冲突, 因为rib所有的DOM操作都只是着眼于现有的DOM树.

让我们开始
--------

你需要做的只是加一行

```html
....
<script type="text/javascript" src="/path/to/backbone.js"></script>
<script type="text/javascript" src="/path/to/backbone-rib.js"></script>
```

然后你所创建的所有的 View 对象中将会多一个名为 bindData 的方法, 这个方法是使用rib
的唯一入口, 可以在一个 View 生命周期的任何时候调用的这个方法. 最简单的用法是这样的:

```js
view.bindData('#form .textbox', model, 'name');
```

所实现的功能就是简单地把一个DOM元素与一个model的name属性绑定, name的值会立即显示在该
元素上, 之后这个 model 的 name 属性值发生的任何变化都会及时地显示在这个DOM元素上.
如果指定的元素是有交互功能的表单元素, 那么这个事件的绑定是双向的, 用户的对DOM元素的操作
也会立即修改model的name属性的值.

**注意**: DOM虽然是通过CSS选择器查询出来的, 但是这个选择器的作用范围仅仅只在当前 View 所
管理的范围之内, 也就是以 view.$el 为根的DOM树中, 而不是整个当前页面, 所以不必担心会发生
奇怪的干扰.

如果所要绑定的元素是需要动态生成的, 可以这么做:

```js
view.bindData('<span></span>', model, 'name', function(span, model) {
  // 这个函数会在完成绑定后调用. 动态生成的DOM不会被自动插入现有的DOM树中, 需要手动插入
  span.appendTo(view.$el);
  //....
});
```

以上是最基本的两种用法, 其他的更高级的用法实际上都是类似于上两种用法的, 你应该能读懂
rib大概是用一种怎样的思路开展它的工作的, 更高级的玩法在下面.

Model绑定
--------

以下可以在指定表单元素中自动查找元素并自动按需要绑定整个Model:

```js
var model = new Backbone.Model({
  name: 'jack',
  password: '123456',
  email: 'jack@abc.com'
});

view.bindData('#form', model);
```

当然前提是要有一段html code:

```html
<form id="form">
  <label>Name:</label>
  <input type="text" name="name" />
  <label>Password</label>
  <input type="password" name="password" />
  <label>Email</label>
  <input type="email" name="email" />
  <button>Submit</button>
</form>
```

rib会搜索指定的form元素中的元素, 发现有存在name属性的元素, 就会根据name的值与model中对应的
属性进行绑定.

Collection绑定
-------------

如果以 collection 进行绑定, 实际上会把指定的DOM元素作为模板克隆很多份并与 collection 中的
所有 model 一一对应地绑定.

```js
var coll = new Backbone.Collection([
  { name: 'jack', password '123456' },
  { name: 'tom', password '123456' },
  { name: 'lucy', password '123456' },
]);

view.bindData('tr.data1', coll, function(tr, model) {
  // collection中每个model绑定完成后都会调用该函数
  // 对于已存在于DOM树中的指定元素, 被克隆的元素会自动插入原来的该元素所在的位置

  // 其他自定义操作 ...
});

view.bindData('<tr> ... </tr>', coll, function(tr, model) {
  // 自动生成的
  tr.appendTo(view.$el.find('.tfoot'));
});

// 如果指定model属性名, 那么只会为每一个model的指定属性绑定
view.bindData('td.data2', coll, 'name', function(tr, model) {

})
```

```html
<table>
  <tbody>
    <tr class="data">
      <td name="name"></td>
      <td name="password"></td>
    </tr>
  </tbody>
  <tbody class="tfoot">
  </tbody>
</table>
```

元素的绑定设置
------------

上面提到过如果绑定的DOM元素是一个有交互功能的元素(input, select, textarea ... )
那么事件的绑定将会是双向的. 这里对其做进一步的细节说明.

默认情况下, 会侦听元素的change事件, 当有change事件发生时, 才会去自动修改对应model的
属性值, 但是可以通过属性 rb-listen 来指定侦听的事件. 比如你想在用户按下键盘时就实时把
文本框的内容同步到绑定的model中去:

```html
<input type="text" name="name" rb-listen="mousedown" />
```

如果你希望在元素与model的数据交换中做一些例如格式转换的中间处理, rb-converter和rb-render
可以帮到你:

```html
<input type="text" name="money" rb-converter="parseFloat(value)" rb-render="value.toString()" />
<!-- 注意: 代码执行时, 传人的参数名只能为value -->
```

这其实就相当于在html中写表达式了. 如果你需要调用view中的方法, rb-converter-name 与 rb-render-name
可以实现这一点.

```html
<input type="text" name="money" rb-converter-name="converter" rb-render-name="render" />
```

然后你需要在你的View对象中加入两个方法:

```js
var view = new Backbone.View.extend({
  ....

  // 当input元素被修改后, 新数据写入model时, 数据被该方法转换
  converter: function(value) {
    return parseFloat(value);
  },

  // 与writer相反的处理
  render: function(value) {
    return value.toString();
  }

  ....
});

数据解除绑定
----------

由于数据绑定功能的实现原理其实就是利用了 backbone Model 与 Collection 本身提供的事件机制, 注册侦听器, 将侦听到的
所有的数据变化都同步到页面上, 反之亦然. 这种机制实现起来简单高效, 不像[Angular](https://angularjs.org/)那样复杂,
但是这种机制也使得框架存在一些隐含的问题. 由于事件的绑定往往会使Model通过侦听器长期持有对应DOM元素的引用, 这时如果你的程序中
存在大量的DOM动态添加和移除的操作, 会因为这种引用而导致那些被移除的DOM迟迟无法被释放, 直到该Model被销毁. 如果这个Model
是个生命周期非常长的对象甚至是个单例, 那么长时间就会造成浏览器的内存膨胀.

这是一个潜在的隐患. 所以你必须知道如果在必要的时候解除所有事件的绑定, 你可以这样做:

```js
view.bindData('off');
```

不管你在一个view 中使用了多少次bindData, 绑定了多少模型都可以通过这个方法解除绑定.



