const memory = new Map();

async function getContext(userId) {
  return memory.get(userId) || { stage: 'initial', cart: [], history: [] };
}

async function updateContext(userId, context) {
  memory.set(userId, context);
}

export { getContext, updateContext };
