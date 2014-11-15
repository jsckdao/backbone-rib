/**
 * Created by jsckdao on 14-10-18.
 * Backbone-rib 0.1.1
 *
 * bindData(selector, model, attrName, callback);
 *
 * bindData(selector, model, attrName);
 *
 * bindData(selector, model, callback);
 *
 * bindData(selector, model);
 *
 * bindData(selector);
 *
 * bindData(model, callback);
 *
 * bindData(model);
 *
 * bindData(off);
 */
(function ($, BB, _) {

  // 一个空函数
  var emptyFn = function (res) {
    return res;
  };

  // 参数类型检查配置
  var pcheckMap = {
    'selector': function(param) {
      return typeof param == 'string';
    },
    'model': function(param) {
      return param instanceof BB.Model || param instanceof BB.Collection;
    },
    'attrName': function(param) {
      return typeof  param == 'string';
    },
    'callback': function(param) {
      return typeof param == 'function';
    }
  };

  // 允许传人的参数配置
  var paramNameList = [
    ['selector', 'model', 'attrName', 'callback'],
    ['selector', 'model', 'attrName'],
    ['selector', 'model', 'callback'],
    ['selector', 'model'],
    ['model', 'callback'],
    ['selector'],
    ['model']
  ];

  // 解决大量函数重载的问题, 检查和校正函数传人的参数
  function checkParams() {
    var len = paramNameList.length;
    for (var i = 0; i < len; i++) {
      var pnames = paramNameList[i], obj = {}, key = true;
      for (var j = pnames.length; j--;) {
        var pname = pnames[j], pval = arguments[j];
        if (pcheckMap[pname](pval)) {
          obj[pname] = pval;
        }
        else {
          key = false;
          break;
        }
      }
      if (key) {
        return obj;
      }
    }
    throw new Error('error argv type!!');
  }

  /**
   * 主要的入口函数 拥有多种参数组合
   * @returns {bindData}
   */
  function bindData(selector) {
    var context = this;
    if (selector == 'off') {
      unbindData(context);
    }
    // 对传人参数进行校对
    var argv = arguments.length == 0 ? {} : checkParams.apply(this, arguments);
    // 生成目标DOM元素
    var target = argv.selector ? getTarget(context, argv.selector) : context;
    // 回调函数
    var callback = argv.callback || emptyFn;
    var model = argv.model;

    if (!target) return;

    if (!model) {
      // TODO: 自动模型绑定功能, 暂未完全实现, 预计下一个版本实现
      //bindDataByAutoModle(target)
      return this;
    }

    copyFeature(target, context);
    bindDataToTarget(target, model, argv.attrName, callback);
    return this;
  }

  /**
   * 根据选择器生成目标DOM元素
   * @param context
   * @param selector
   * @returns {*}
   */
  function getTarget(context, selector) {
    return $(selector, context);
  }

  /**
   * 为指定的DOM元素对象绑定
   * @param target
   * @param model
   * @param attrName
   * @param callback
   */
  function bindDataToTarget(target, model, attrName, callback) {
    if (!target) return;

    if (typeof callback != 'function') {
      callback = emptyFn;
    }

    if (model instanceof BB.Model) {
      bindForModel(target, model, attrName, callback);
    }
    else if (model instanceof BB.Collection) {
      bindForCollection(target, model, attrName, callback);
    }
  }

  /**
   * 在指定的DOM树中自动查找, 下一个版本提供支持
   * @param target
   * @param callback
   */
//  function bindDataByAutoModle(target) {
//    traversal(target, function(el) {
//      if (el.hasAttribute('rb-'))
//    }, true);
//  }



  /**
   * 开始绑定数据, 这个方法通常会作为Jquery对象的一个方法被调用, this通常指向
   * 一个当前的jQuery对象
   * @param exp
   * 指定需要进行绑定的目标元素, 传入值可以是CSS选择器, 也可以是html片段,
   * 如果是前者, 则会从当前的jQuery对象中匹配出指定的元素, 如果是后者则
   * 根据这些html新建一个元素.
   * @param model
   * 需要绑定的数据模型, 可以是一个Model也可以是一个Collection, 如果是后者,
   * 指定的元素会被自动复制, 并会一一绑定上Collection中所有的model
   * @param attrName
   * 可选, 以将元素绑定一个单独的属性名
   * @param callback
   * 可选, 可以设定数据绑定的后续操作, 如果应用于一个Collection, callback会被调用多次
   */
  function oldbindData(el, model, attrName, callback) {
    if (typeof el == 'string') {
      var match = rquickExpr.exec(el);
      var target = match ? $(el) : this.find(el);
    }
    else {
      callback = attrName;
      attrName = model;
      model = el;
      var target = this;
    }

    var self = this;

    if (target.length == 0) return;

    if (typeof attrName == 'function') {
      callback = attrName;
      attrName = null;
    }

    callback = callback || emptyFn;

    if (model instanceof BB.Model) {
      copyFeature(target, self);
      bindForModel(target, model, attrName, callback);
    }
    else if (model instanceof BB.Collection) {
      copyFeature(target, self);
      bindForCollection(target, model, attrName, callback);
    }
    else {
      throw new Error('must set model!!');
    }

    return this;
  };

  /**
   * 解除该jQuery对象内部的所有数据绑定, 并清除附加方法和属性
   * @returns {unbindData}
   */
  function unbindData(target) {
    clearBindEl(target);
    target.trigger('rb-unbind');
    delete target.$_rb_bind_el;
    delete target.bindData;
    delete target.$_view;
    delete target.$_parent;
    return target;
  }

  /**
   * 解除内部所有对象数据的绑定
   * @param target
   */
  function clearBindEl(target) {
    for (var i = target.$_rb_bind_el.length; i--;) {
      unbindData(target.$_rb_bind_el[0]);
    }
  }

  /**
   * 复制内部属性特征, 所有用了数据绑定功能的jQuery对象都会被扩展出一些附加的方法和
   * 属性, 并且这些jQuery对象直接会建立起一些父子关联, 以便再解除数据绑定的时候可以快速
   * 处理
   */
  function copyFeature(target, parent) {
    if (!target.$_rb_bind_el) {
      target.bindData = bindData;
      target.$_rb_bind_el = [];
      if (parent) {
        parent.$_rb_bind_el.push(target);
        target.$_view = parent.$_view;
        target.$_parent = parent;

        target.one('rb-unbind', function (evt) {
          evt.stopPropagation();
          var index = _.indexOf(parent.$_rb_bind_el, target);
          parent.$_rb_bind_el.splice(index, 1);
        });
      }
    }
  }

  // 批量绑定集合数据
  function bindForCollection(target, collection, attrName, callback) {
    var tmpl = target.clone();
    var sign = $('<!-- repeat sign -->').insertBefore(target);

    // 清空target对象
    var _clearTarget = function () {
      target.remove();
      clearBindEl(target);
      Array.prototype.splice.call(target, 0, target.length);
    };

    // 把指定的元素作为模板为数据集合中的每一个Model进行绑定
    var _addTarget = function (model) {
      var clo = tmpl.clone();
      copyFeature(clo, target);
      bindForModel(clo, model, attrName, callback);
      model.$_rb_model_el = clo;
      sign.before(clo);
      $.merge(target, clo);
    };

    // 移除一个数据绑定对象
    var _removeTarget = function (model) {
      var clo = model.$_rb_model_el;
      if (clo) {
        unbindData(clo);
        for (var i = clo.length; i--;) {
          for (var j = target.length; j--;) {
            if (target[j] == clo[i]) {
              target.splice(j, 1);
              break;
            }
          }
        }
        delete model.$_rb_model_el;
        clo.remove();
      }
    };

    // 当数据集合重置时, 批量处理
    var _rest = function () {
      _clearTarget();
      collection.each(_addTarget);
    };

    target.hide();

    // 侦听集合的变化事件
    collection.on('reset', _rest);
    collection.on('add', _addTarget);
    collection.on('remove', _removeTarget);

    // 侦听整体解除绑定事件
    target.one('rb-unbind', function () {
      collection.off('reset', _rest);
      collection.off('add', _addTarget);
      collection.off('remove', _removeTarget);
    });

    // 把所有现有的数据绑定起来
    collection.each(_addTarget);
  }

  // 绑定单个数据模型
  function bindForModel(target, model, attrName, callback) {
    if (attrName) {
      bindField(target, model, attrName);
    }
    else {
      traversal(target, function (el) {
        bindField(el, model, attrName, target);
      });
    }
    callback(target, model);
  };

  /**
   * 遍历DOM元素树
   * @param target 指定需要遍历的DOM树的根节点
   * @param callback 处理器
   * @param isLeafFirst 是否优先处理叶子节点(自顶向下的处理)
   */
  function traversal(target, callback, isLeafFirst) {
    target = $(target);
    target.children().each(function (i, c) {
      if (c.nodeType != 1) return;
      !isLeafFirst && callback($(c));
      if (c.children.length != 0) {
        traversal(c, callback);
      }
      isLeafFirst && callback($(c));
    });
  }

  /**
   * 试图为一个元素绑定数据模型中的一个属性项, 如果
   * 没有传入指定的数据模型的属性名, 程序会查找元素
   * 的name属性, 用它的值作为数据模型的属性名, 如果
   * 不存在name属性, 则绑定失败.
   * @param target  指定的DOM元素
   * @param model   需要绑定的模型
   * @param attrName  指定属性名
   * @param parentTarget  上一层的绑定元素
   */
  function bindField(target, model, attrName, parentTarget) {
    var tagName = target[0].nodeName.toLowerCase();
    attrName = attrName || target.attr('name');
    if (tagName == 'input' ||
      tagName == 'textarea' ||
      tagName == 'select') {
      parentTarget && copyFeature(target, parentTarget);
      bindInputField(target, model, attrName);
    }
    else if (attrName) {
      parentTarget && copyFeature(target, parentTarget);
      bindTextField(target, model, attrName);
    }
  }

  /**
   * 把模型数据绑定在表单项元素上
   * @param target  指定的表单元素
   * @param model   需要绑定的模型
   * @param attrName  指定所要绑定的属性名
   */
  function bindInputField(target, model, attrName) {
    var filter = createValueFilter(target);

    var _lock = false;
    var _modelChange = function () {
      if (_lock) return;
      setInputValue(target, filter.render(model.get(attrName)));
    };
    var _inputChange = function () {
      _lock = true;
      model.set(attrName, filter.converter(target.val()));
      _lock = false;
    };

    // 侦听指定事件
    var domEvt = getAttr(target, 'rb-listen') || 'change';

    // 进行双向绑定
    model.on('change:' + attrName, _modelChange);
    target.on(domEvt, _inputChange);

    // 侦听数据解绑事件
    target.one('rb-unbind', function () {
      model.off('change:' + attrName, _modelChange);
      target.unbind('change', _inputChange);
    });

    _modelChange();
  }

  /**
   * 将值写入指定的表单项, 根据不同类型的表单项采取不同的行为
   * @param target  指定的表单项元素
   * @param value   需要写入的值
   */
  function setInputValue(target, value) {
    var tagName = target[0].nodeName.toLowerCase();
    var type = target.attr('type');

    type = type ? type.toLowerCase() : type;

    // 下拉框
    if (tagName == 'select') {
      target.children().each(function (i, option) {
        if (option.value == value) {
          option.selected = true;
        }
      });
    }
    // 单选框
    else if (type == 'radio') {
      if (target.val() == value) {
        target.attr('checked', true);
      }
    }
    // 复选框
    else if (type == 'checkbox') {
      target.attr('checked', !!value);
    }
    else {
      target.val(value);
    }
  }

  /**
   * 把数据绑定在普通元素上
   * @param target
   * @param model
   * @param attrName
   */
  function bindTextField(target, model, attrName) {
    var filter = createValueFilter(target);
    var _change = function () {
      target.html(filter.render(model.get(attrName)));
    };
    model.on('change:' + attrName, _change);
    target.one('rb-unbind', function () {
      model.off('change:' + attrName, _change);
    });
    _change();
  }


  /**
   * 为元素构建 render 与 convertor
   * @param target
   */
  function createValueFilter(target) {
    var converterName = getAttr(target, 'rb-converter-name'),
      renderName = getAttr(target, 'rb-render-name'),
      converterCode = getAttr(target, 'rb-converter'),
      renderCode = getAttr(target, 'rb-render');

    var view = target.$_view;
    return {
      render: view[renderName] || compileFunction(target, renderCode) || emptyFn,
      converter: view[converterName] || compileFunction(target, converterCode) || emptyFn
    };
  }

  // 获取元素属性, xhtml html4 html5 命名可能会存在不同
  function getAttr(target, attrName) {
    return target.attr(attrName);
  }


  // 编译js代码成一个函数
  function compileFunction(target, code) {
    if (!code) return null;
    try {
      code = 'return (' + code + ')';
      var _func = new Function('value', 'el', 'view', code);
      var view = target.$_view;
      return function(value) {
        return _func.apply(view, [value, target, view]);
      }
    }
    catch (e) {
      return null;
    }
  }


  // 为Backbone.View 的原型中加入一个 bindData方法
  BB.View.prototype.bindData = function () {
    this.$el.$_view = this;
    copyFeature(this.$el, null);
    bindData.apply(this.$el, arguments);
  };

})(jQuery, Backbone, _);
