const childProcess = require("node:child_process");
const moduleApi = require("node:module");

const originalExec = childProcess.exec;
const originalSpawn = childProcess.spawn;
childProcess.exec = function patchedExec(command, ...args) {
  if (command === "net use") {
    const callback = args.find((arg) => typeof arg === "function");
    if (callback) queueMicrotask(() => callback(new Error("network drive lookup unavailable"), "", ""));
    return undefined;
  }
  return originalExec.call(this, command, ...args);
};

childProcess.spawn = function patchedSpawn(command, args, options) {
  const executable = command === "git" ? "C:\\Program Files\\Git\\cmd\\git.exe" : command;
  return originalSpawn.call(this, executable, args, options);
};

moduleApi.syncBuiltinESMExports();
