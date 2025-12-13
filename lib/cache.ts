import NodeCache from 'node-cache';

// Create a singleton instance of the cache
const cache = new NodeCache({
  stdTTL: 60 * 5, // 5 minutes
  checkperiod: 60 * 1, // 1 minute
  useClones: false, // For performance
});

export default cache;
