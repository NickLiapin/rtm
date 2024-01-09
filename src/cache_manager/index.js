const Logger = require('../logger');
const logger = Logger.getInstance();
const fs = require('fs');

class CacheManager {
    static instance;

    /**
     * Private constructor to prevent direct instantiation.
     */
    constructor(cacheFile, localEnv) {
        if (CacheManager.instance) {
            throw new Error("CacheManager instance already created. Use CacheManager.getInstance()");
        }
        this.localEnv = localEnv;
        this.loadOldCache(cacheFile);
        CacheManager.instance = this;
    }

    /**
     * The function returns data from the cache file or null.
     * @param cacheFile - path to the cache file
     * @returns {any|null}
     */
    loadCache(cacheFile) {
        try {
            const data = fs.readFileSync(cacheFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    loadOldCache(cacheFile) {
        this.localEnv.oldGlobalCache = this.loadCache(cacheFile);
    }

    loadNewCache(cacheFile) {
        this.localEnv.globalCache = this.loadCache(cacheFile);
    }

    get oldCache() {
        return this._oldCache;
    }

    set oldCache(value) {
        this.localEnv.oldGlobalCache = value;
        this._oldCache = value;
    }

    get newCache() {
        return this._newCache;
    }

    set newCache(value) {
        this.localEnv.globalCache = value;
        this._newCache = value;
    }

    /**
     * Provides access to the singleton instance of the cache manager.
     * @param cacheFile - path to the cache file
     * @param localEnv - env
     * @returns {CacheManager} The singleton cache manager instance.
     */
    static getInstance(cacheFile, localEnv) {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager(cacheFile, localEnv);
        }
        return CacheManager.instance;
    }
}

module.exports = CacheManager;

