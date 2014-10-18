/**
 * Created by jsckdao on 14-10-18.
 */
(function($, BB, _) {

  var rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/;
  var emptyFn = function () {};

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
  function bindData(el, model, attrName, callback) {
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
  function unbindData() {
    this.trigger('bb-unbind');
    clearBindEl(this);
    delete this.$_bb_bind_el;
    delete this.bindData;
    delete this.unbindData;
    return this;
  }

  /**
   * 解除内部所有对象数据的绑定
   * @param target
   */
  function clearBindEl(target) {
    for (var i = target.$_bb_bind_el.length; i--;) {
      target.$_bb_bind_el[i].unbindData();
    };
  }

  /**
   * 复制内部属性特征, 所有用了数据绑定功能的jQuery对象都会被扩展出一些附加的方法和
   * 属性, 并且这些jQuery对象直接会建立起一些父子关联, 以便再解除数据绑定的时候可以快速
   * 处理
   */
  function copyFeature(target, parent) {
    if (!target.$_bb_bind_el) {
      target.bindData = bindData;
      target.unbindData = unbindData;
      target.$_bb_bind_el = [];

      if (parent) {
        parent.$_bb_bind_el.push(target);
        target.on('bb-unbind', function() {
          var index = _.indexOf(parent.$_bb_bind_el, target);
          parent.$_bb_bind_el.splice(index, 1);
        });
      }
    }
  }

  // 批量绑定集合数据
  function bindForCollection(target, collection, attrName, callback) {
    var tmpl = target.clone();
    var sign = $('<!-- repeat sign -->').insertBefore(target);

    // 清空target对象
    var _clearTarget = function() {
      target.remove();
      clearBindEl(target);
      Array.prototype.splice(target, 0, target.length);
    }

    // 把指定的元素作为模板为数据集合中的每一个Model进行绑定
    var _addTarget = function(model) {
      var clo = tmpl.clone();
      copyFeature(clo, target);
      bindForModel(clo, model, attrName, callback);
      model.$_bb_model_el = clo;
      sign.before(clo);
      $.merge(target, clo);
    };

    // 移除一个数据绑定对象
    var _removeTarget = function(model) {
      var clo = model.$_bb_model_el;
      if (clo) {
        clo.unbindData && clo.unbindData();
        clo.remove();
        _.without(target, clo);
        delete model.$_bb_model_el;
      }
    };

    var _rest = function() {
      _clearTarget();
      collection.each(_addTarget);
    };

    _clearTarget();

    // 侦听集合的变化事件
    collection.on('reset', _rest);
    collection.on('add', _addTarget);
    collection.on('remove', _removeTarget);

    // 侦听整体解除绑定事件
    target.one('bb-unbind', function() {
      collection.off('reset', _rest);
      collection.off('add', _addTarget);
      collection.off('remove', _removeTarget);
    });

    collection.each(_addTarget);
  }

  // 绑定单个数据模型
  function bindForModel(target, model, attrName, callback) {
    if (attrName) {
      bindField(target, model, attrName);
    }
    else {
      traversal(target, function(el) {
        if (bindField(el, model, attrName)) {
          copyFeature(el, target);
        }
      });
    }
    callback(target, model);
  };

  // 遍历元素
  function traversal(target, callback) {
    target = $(target);
    target.children().each(function(i, c) {
      if (c.nodeType != 1) return;
      callback($(c));
      if (c.children.length != 0) {
        traversal(c, callback);
      }
    });
  }

  // 试图位一个元素绑定数据模型中的一个属性项
  function bindField(target, model, attrName) {
    var tagName = target[0].nodeName.toLowerCase();
    attrName = attrName || getAttr(target, 'bb-attr');
    if (tagName == 'input' ||
      tagName == 'textarea' ||
      tagName == 'select') {
      bindInputField(target, model, attrName);
      return true;
    }
    else if (attrName) {
      bindTextField(target, model, attrName);
      return true;
    }
    return false;
  }

  // 把模型数据绑定在表单项元素上
  function bindInputField(target, model, attrName) {
    attrName = attrName || target.attr('name');
    var _lock = false;
    var _modelChange = function() {
      if (_lock) return;
      setInputValue(target, model.get(attrName));
    };
    var _inputChange = function() {
      _lock = true;
      model.set(attrName, target.val());
      _lock = false;
    };

    // 进行双向绑定
    model.on('change:' + attrName, _modelChange);
    target.on('change', _inputChange);

    // 侦听数据解绑事件
    target.one('bb-unbind', function() {
      model.off('change:' + attrName, _modelChange);
      target.unbind('change', _inputChange);
    });

    _modelChange();
  }

  // 设置表单项
  function setInputValue(target, value) {
    var tagName = target[0].nodeName.toLowerCase();
    var type = target.attr('type');

    type = type ? type.toLowerCase() : type;

    if (tagName == 'select') {
      target.children().each(function(i, option) {
        if (option.value == value) {
          option.selected = true;
        }
      });
    }
    else if (type == 'radio') {
      if (target.val() == value) {
        target.attr('checked', true);
      }
    }
    else if (type == 'checkbox') {

    }
    else {
      target.val(value);
    }
  }

  // 把数据绑定在普通元素上
  function bindTextField(target, model, attrName) {
    var _change = function() {
      target.html(model.get(attrName));
    };
    model.on('change:' + attrName, _change);
    target.one('bb-unbind', function() {
      model.off('change:' + attrName, _change);
    });
    _change();
  }

  function getAttr(target, attrName) {
    return target.attr(attrName);
  }

  BB.View.prototype.bindData = function() {
    copyFeature(this.$el, null);
    bindData.apply(this.$el, arguments);
  };

})(jQuery, Backbone, _);
