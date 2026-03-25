let sub1 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
let sub2 = [{ x: 0, y: 0 }, { x: 0, y: 1, w: 2 }];
let count = 0;
[...sub1, ...sub2].forEach(d => d.content = String(count++));
let subOptions = {
  cellHeight: 50,
  column: 'auto', // size to match container
  itemClass: 'sub', // style sub items differently and use to prevent dragging in/out
  acceptWidgets: '.grid-stack-item.sub', // only pink sub items can be inserted
  margin: 2,
  minRow: 1, // don't collapse when empty
};
let options = { // main grid options
  cellHeight: 50,
  margin: 5,
  minRow: 2, // don't collapse when empty
  acceptWidgets: true,
  id: 'main',
  children: [
    { y: 0, content: 'regular item' },
    { x: 1, w: 4, h: 4, subGridOpts: { children: sub1, class: 'sub1', ...subOptions } },
    { x: 5, w: 4, h: 4, subGridOpts: { children: sub2, class: 'sub2', ...subOptions } },
  ]
};

// create and load it all from JSON above
let grid = GridStack.addGrid(document.querySelector('.container-fluid'), options);

addNested = function () {
  grid.addWidget({ x: 0, y: 100, content: "new item" });
}

addNewWidget = function (selector) {
  let subGrid = document.querySelector(selector).gridstack;
  let node = {
    x: Math.round(6 * Math.random()),
    y: Math.round(5 * Math.random()),
    w: Math.round(1 + 1 * Math.random()),
    h: Math.round(1 + 1 * Math.random()),
    content: String(count++)
  };
  subGrid.addWidget(node);
  return false;
};

save = function (content = true, full = true) {
  options = grid.save(content, full);
  console.log(options);
  // console.log(JSON.stringify(options));
}
destroy = function (full = true) {
  if (full) {
    grid.destroy();
    grid = undefined;
  } else {
    grid.removeAll();
  }
}
load = function (full = true) {
  if (full) {
    grid = GridStack.addGrid(document.querySelector('.container-fluid'), options);
  } else {
    grid.load(options);
  }
}
