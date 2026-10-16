/* Shared browser Session id — chat + eng BUILD/capture (N1). */
(function (global) {
  var STORE_KEY = "qdagent.sessions.v1";
  var ENG_FALLBACK = "qdagent.eng.session.v1";

  function uid() {
    return (
      "s-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { currentId: null, sessions: [] };
      var data = JSON.parse(raw);
      if (!data.sessions) data.sessions = [];
      return data;
    } catch (e) {
      return { currentId: null, sessions: [] };
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function currentId() {
    var store = loadStore();
    if (store.currentId) return store.currentId;
    try {
      var legacy = localStorage.getItem(ENG_FALLBACK);
      if (legacy) {
        store.currentId = legacy;
        if (
          !store.sessions.some(function (s) {
            return s.id === legacy;
          })
        ) {
          store.sessions.unshift({
            id: legacy,
            title: "工程会话",
            messages: [],
            updatedAt: Date.now(),
          });
        }
        saveStore(store);
        return legacy;
      }
    } catch (_) {}
    var id = uid();
    store.currentId = id;
    store.sessions.unshift({
      id: id,
      title: "新会话",
      messages: [],
      updatedAt: Date.now(),
    });
    saveStore(store);
    try {
      localStorage.setItem(ENG_FALLBACK, id);
    } catch (_) {}
    return id;
  }

  function setCurrentId(id) {
    if (!id) return;
    var store = loadStore();
    store.currentId = id;
    if (
      !store.sessions.some(function (s) {
        return s.id === id;
      })
    ) {
      store.sessions.unshift({
        id: id,
        title: "会话",
        messages: [],
        updatedAt: Date.now(),
      });
    }
    saveStore(store);
    try {
      localStorage.setItem(ENG_FALLBACK, id);
    } catch (_) {}
  }

  global.QdSession = {
    STORE_KEY: STORE_KEY,
    uid: uid,
    loadStore: loadStore,
    saveStore: saveStore,
    currentId: currentId,
    setCurrentId: setCurrentId,
  };
})(window);
