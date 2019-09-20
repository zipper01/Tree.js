'use strict';

function isEmpty(obj) {
  if (obj === NaN || obj === null || obj === undefined || obj === '') return true;
  else if (Array.isArray(obj) && !obj.find((e) => e)) return true;
  return obj.constructor === Object && Object.keys(obj).length === 0;
}

function runSequentially(asyncTasks) {
  return asyncTasks.reduce((acc, cur) => {
    if (typeof (cur) === 'object' &&
      cur.function &&
      typeof (cur.function) === 'function') {
      return acc.then(res => {
        if (!res) res = [];
        cur.accumulator = res;
        return cur.function(cur.params, cur.accumulator).then((res) => {
          cur.accumulator.push(res);
          return cur.accumulator;
        });
      });
    } else if (typeof (cur) === 'function') {
      return acc.then(cur);
    }
  }, Promise.resolve());
}

function getCircularReplacer(replacer) {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        if (replacer) return replacer;
        return '***';
      }
      seen.add(value);
    }
    return value;
  };
}

function onErr() {
  console.trace(toString(arguments));
}

function log() {
  let e = new Error();
  if (!e.stack)
    try {
      // IE requires the Error to actually be thrown or else the 
      // Error's 'stack' property is undefined.
      throw e;
    } catch (e) {
      if (!e.stack) {
        //return 0; // IE < 10, likely
      }
    }
  let stack = e.stack.toString().split(/\r\n|\n/);

  if ((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) !== -1) {
    alert('Opera');
  } else if (navigator.userAgent.indexOf("Chrome") !== -1) {
    console.log(stack[2] + toString(arguments));
  } else if (navigator.userAgent.indexOf("Safari") !== -1) {
    alert('Safari');
  } else if (navigator.userAgent.indexOf("Firefox") !== -1) {
    console.log(stack[1] + toString(arguments));
  } else if ((navigator.userAgent.indexOf("MSIE") !== -1) || (!!document.documentMode == true)) {
    //IF IE > 10
    alert('IE');
  } else {
    alert('unknown');
  }
}

export { isEmpty, runSequentially, log, onErr};
