const fs = require('fs');
const path = require('path');

const STATE_FILE_PATH = path.join(__dirname, 'local-component-library-state.local.json');

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowText = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const createInitialState = () => ({
  categories: [
    {
      id: 'category-default',
      name: '默认分类',
      sort: 0,
      builtIn: true,
      createdAt: '2026-06-01 10:00:00',
      updatedAt: '2026-06-01 10:00:00',
    },
  ],
  templates: [],
});

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const ensureStateFile = () => {
  if (fs.existsSync(STATE_FILE_PATH)) {
    return;
  }

  fs.writeFileSync(
    STATE_FILE_PATH,
    JSON.stringify(createInitialState(), null, 2),
    'utf8',
  );
};

const readState = () => {
  ensureStateFile();
  const fileContent = fs.readFileSync(STATE_FILE_PATH, 'utf8');
  return safeJsonParse(fileContent, createInitialState()) || createInitialState();
};

let currentState = readState();

const getLocalComponentLibraryState = () => clone(currentState);

const setLocalComponentLibraryState = (nextState) => {
  currentState = clone(nextState);
  fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(currentState, null, 2), 'utf8');
  return getLocalComponentLibraryState();
};

module.exports = {
  getLocalComponentLibraryState,
  nowText,
  setLocalComponentLibraryState,
};
