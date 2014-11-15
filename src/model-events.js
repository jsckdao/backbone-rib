(function (BB, _) {

  var oldSet = BB.Model.prototype.set,
    oldGet = BB.Model.prototype.get;

  // 重写get方法
  BB.Model.prototype.get = function(attrName) {
    attrName = parseAttrName(attrName);
    if (attrName.length < 2 || !this.fields) {
      return oldGet.call(this, attrName[0]);
    }
    else {
      return getModelValue(this, attrName);
    }
  };

  // 重写set 方法
  BB.Model.prototype.set = function(attrName, value) {
    attrName = parseAttrName(attrName);
    if (attrName.length < 2 || !this.fields) {
      return oldSet.call(this, attrName[0]);
    }
    else {
      return setModelValue(this, attrName, value);
    }
  }

  // 模型数据深度查找
  function getModelValue(model, attrNames) {
    var len = attrNames.length;
    for (var i = 0; i < len; i++) {
      var attr = attrNames[i];
      if (!model) {
        break;
      }
      else if (model instanceof BB.Model) {
        model = model.get(attr);
      }
      else if (model instanceof BB.Conllection) {
        model = model.get(attr);
      }
      else if (typeof model == 'object') {
        model = model[attr];
      }
      else {
        model = null;
      }
    }
    return model;
  }

  // 模型深度设置
  function setModelValue(model, attrNames, value) {
    var len = attrNames.length;
    var obj, fields = this.fields;
    for (var i = 0; i < len; i++) {
      var attr = attrNames[i];

      if (i == len - 1) {
        model.set(attr, value);
        break;
      }

      var field = fields ? fields[attr] : null;

      if (typeof field == 'function' && 
        (field.prototype instanceof BB.Model || field.prototype instanceof BB.Conllection)) {
        obj = new field();
      }
      else {
        obj = new BB.Model();
        obj.fields = true;
        if (typeof field == 'object') {
          fields = field;
        }
      }

      if (model instanceof BB.Model) {
        model.set(attr, obj);
      }
      else if (model instanceof BB.Conllection) {
        model.add(obj);
      }
      model = obj;
    }
  }



  function parseAttrName(attrName) {
    attrName = attrName.split(/\.\[\]/);
    return attrName;
  }

})(Backbone, _);