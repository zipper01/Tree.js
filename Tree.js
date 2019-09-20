'use strict';

import { isEmpty, onErr, log, runSequentially } from './util.js';

class TreeNode {
  constructor() {
    this.async = {};
  }
  isDummy() { }
  update() { }
  paraEquals() { }
  paraIsChild() { }
  paraIsParent() { }

  populate(params, preFn, postFn) {
    return populateTree(this, params, preFn, postFn);
  }

  genForest(params, preFn, postFn) {
    return genForest(this, params, preFn, postFn);
  }

  traverse(preFn, postFn) {
    return traverseTree(this, preFn, postFn);
  }

  async_populate(params, preFn, postFn) {
    return async_populateTree(this, params, preFn, postFn);
  }

  async_traverse(preFn, postFn) {
    return async_traverseTree(this, preFn, postFn);
  }

  async_genForest(params, preFn, postFn) {
    return async_genForest(this, params, preFn, postFn);
  }

  getRoot() {
    return getTreeRoot(this);
  }

  getNode(searchPara) {
    return getTreeNode(this, searchPara);
  }

  addChild(child) {
    return addChild(this, child);
  }

}

function makeSubTree(seenForPreFn, seenForPostFn, node, params, preFn, postFn) {
  if (typeof preFn === 'function') {
    if (!seenForPreFn.includes(node)) {
      preFn(node);
      seenForPreFn.push(node);
    }
  }
  params = params.reverse();
  let children = genChildren(node, params);
  if (params.length === 0) {
    if (typeof preFn === 'function') {
      children.forEach(node => {
        if (!seenForPreFn.includes(node)) {
          preFn(node);
          seenForPreFn.push(node);
        }
      });
    }
    if (typeof postFn === 'function') {
      children.forEach(node => {
        if (!seenForPostFn.includes(node)) {
          postFn(node);
          seenForPostFn.push(node);
        }
      });
      if (!seenForPostFn.includes(node)) {
        postFn(node);
        seenForPostFn.push(node);
      }
    }
  } else {
    params = params.reverse();
    children.forEach(child => makeSubTree(seenForPreFn, seenForPostFn, child, params, preFn, postFn));
    if (typeof postFn === 'function') {
      if (!seenForPostFn.includes(node)) {
        postFn(node);
        seenForPostFn.push(node);
      }
    }
  }
  if (!isEmpty(node.parent)) return makeSubTree(seenForPreFn, seenForPostFn, node.parent, params, preFn, postFn);
  else return node;
}

function genChildren(node, params) {
  let children = [];
  for (let i = params.length; i > 0;) {
    let para = params[--i];
    if (node.paraEquals(para)) {
      node.update(para);
      params.splice(i, 1);
    } else if (node.paraIsChild(para)) {
      let idxMatched = -1;
      for (let j = 0; j < node.children.length; j++) {
        if (node.children[j].paraEquals(para)) {
          idxMatched = j;
          break;
        }
      }
      if (idxMatched >= 0) {
        node.children[idxMatched].update(para);
      } else if (willCircle(node, para)) {
        log('will circle (' + para.name + ')');
        params.splice(i, 1);
      } else {
        let child = new node.constructor(para);
        child.parent = node;
        node.children.push(child);
        children.push(child);
        params.splice(i, 1);
      }
    } else if (node.paraIsParent(para)) {
      if (node.parent) params.splice(i, 1);
      else {
        let parent = new node.constructor(para);
        log('create new parent (' + JSON.stringify(para) + ')');
        parent.children.push(node);
        node.parent = parent;
        params.splice(i, 1);
      }
    } else {
      //log('xxxxxxxxxxxxxxxxxxxxxxx');
    }
  }
  return children;
}

function populateTree(node, params, preFn, postFn) {
  let seenForPreFn = [], seenForPostFn = [];
  let res = makeSubTree(seenForPreFn, seenForPostFn, node, params, preFn, postFn);
  if (params.length > 0) {
    let root = getTreeRoot(node);
    if (root !== node) {
      return populateTree(seenForPreFn, seenForPostFn, root, params, preFn, postFn);
    }
  }
  return res;
}

function genForest(node, params, preFn, postFn) {
  let forest = [populateTree(node, params, preFn, postFn)];
  while (params.length > 0) {
    let newNode = new node.constructor(params.splice(0, 1)[0]);
    forest.push(populateTree(newNode, params, preFn, postFn));
  }
  return forest;
}

function addChild(node, child) {
  node.children.push(child);
  return node;
}

function traverseTree(nodes, preFn, postFn) {
  if (Array.isArray(nodes)) {
    nodes.forEach(node => traverseTree(node, preFn, postFn));
  } else {
    let node = nodes;
    if (isEmpty(node)) {
      onErr('must provide a TreeNode to start');
      return;
    }
    if (typeof preFn === 'function') preFn(node);
    node.children.map(child => traverseTree(child, preFn, postFn));
    if (typeof postFn === 'function') postFn(node);
  }
  return nodes;
}

function willCircle(node, newNodePara) {
  while (true) {
    if (node.paraEquals(newNodePara)) return true;
    if (isEmpty(node.parent) || node.parent === node) return false;
    node = node.parent;
  }
}

function getTreeNode(node, searchPara) {
  if (isEmpty(node)) {
    onErr('must provide a TreeNode to start');
    return;
  }
  let root = getTreeRoot(node);
  return traverseTree(root, function (node) {
    if (node.paraEquals(searchPara)) return node;
  });
}

function getTreeRoot(node, fn) {
  if (isEmpty(node.parent) || node.parent === node) return node;
  if (typeof fn === 'function') {
    fn(node.parent);
  }
  return getTreeRoot(node.parent);
}

async function async_makeSubTree(seenForPreFn, seenForPostFn, node, params, preFn, postFn) {
  let children = [];
  let asyncTasks1 = [];

  if (typeof preFn === 'function' && !seenForPreFn.includes(node)) {
    asyncTasks1.push(async function () {
      return preFn(node);
    });
    seenForPreFn.push(node);
  }

  asyncTasks1.push(async function () {
    children = genChildren(node, params);
    let asyncTasks2 = [];
    if (params.length === 0) {
      if (typeof preFn === 'function') {
        children.forEach(node => {
          if (!seenForPreFn.includes(node)) {
            asyncTasks2.push(async function () {
              return preFn(node);
            });
          }
          seenForPreFn.push(node);
        });
      }
      if (typeof postFn === 'function') {
        children.forEach(node => {
          if (!seenForPostFn.includes(node)) {
            asyncTasks2.push(async function () {
              return postFn(node);
            });
            seenForPostFn.push(node);
          }
        });
        if (!seenForPostFn.includes(node)) {
          asyncTasks2.push(async function () {
            return postFn(node);
          });
          seenForPostFn.push(node);
        }
      }
    } else {
      children.forEach(child => asyncTasks2.push(async function () {
        return async_makeSubTree(seenForPreFn, seenForPostFn, child, params, preFn, postFn);
      }));
      if (typeof postFn === 'function' && !seenForPostFn.includes(node)) {
        asyncTasks2.push(async function () {
          return postFn(node);
        });
        seenForPostFn.push(node);
      }
    }
    return runSequentially(asyncTasks2).then(() => { return node; });
  });

  return runSequentially(asyncTasks1).then(() => {
    if (!isEmpty(node.parent)) {
      return async_makeSubTree(seenForPreFn, seenForPostFn, node.parent, params, preFn, postFn);
    }
    else return node;
  });

}

async function async_populateTree(node, params, preFn, postFn) {
  let seenForPreFn = [], seenForPostFn = [];
  return async_makeSubTree(seenForPreFn, seenForPostFn, node, params, preFn, postFn).then(res => {
    if (params.length > 0) {
      let root = getTreeRoot(node);
      if (root !== node) {
        return async_populateTree(seenForPreFn, seenForPostFn, root, params, preFn, postFn);
      }
    }
    return res;
  });
}

async function async_genForest(node, params, preFn, postFn) {
  if (isEmpty(node)) onErr('must provide a TreeNode to start');
  return async_genForest_run([], node, params, preFn, postFn);
}

async function async_genForest_run(forest, node, params, preFn, postFn) {
  return async_populateTree(node, params, preFn, postFn).then(node => {
    forest.push(node);
    if (params.length === 0) return forest;
    else {
      let newNode = new node.constructor(params.splice(0, 1)[0]);
      return async_genForest_run(forest, newNode, params, preFn, postFn);
    }
  });
}

async function async_traverseTree(nodes, preFn, postFn) {

  if (isEmpty(nodes)) onErr('must provide a TreeNode to start');

  if (Array.isArray(nodes)) {
    let asyncTasks = [];
    nodes.forEach(node => asyncTasks.push(function () {
      return async_traverseTree(node, preFn, postFn);
    }));
    return runSequentially(asyncTasks).then(() => { return nodes; });
  } else {
    let asyncTasks = [];
    if (typeof preFn === 'function') asyncTasks.push(async function () {
      return preFn(nodes);
    });
    nodes.children.forEach(child => asyncTasks.push(async function () {
      return async_traverseTree(child, preFn, postFn);
    }));
    if (typeof postFn === 'function') asyncTasks.push(async function () {
      return postFn(nodes);
    });
    return runSequentially(asyncTasks).then(() => { return nodes; });
  }
}

function isEmpty(obj) {
  if (obj === NaN || obj === null || obj === undefined || obj === '') return true;
  else if (Array.isArray(obj) && !obj.find((e) => e)) return true;
  return obj.constructor === Object && Object.keys(obj).length === 0;
}

export { TreeNode };