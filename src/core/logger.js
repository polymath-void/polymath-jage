const IS_DEBUG = process.argv.includes('--debug');

export const Colors = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgCyan: "\x1b[36m",
};

export const Logger = {
  info: (msg) => console.log(`${Colors.FgBlue}[INFO]${Colors.Reset} ${msg}`),
  success: (msg) => console.log(`${Colors.FgGreen}✔ ${msg}${Colors.Reset}`),
  warn: (msg) => console.log(`${Colors.FgYellow}⚠ WARNING: ${msg}${Colors.Reset}`),
  error: (msg, err = null) => {
    console.log(`${Colors.FgRed}✖ ERROR: ${msg}${Colors.Reset}`);
    if (err && IS_DEBUG) {
      console.log(`${Colors.Dim}${err.stack || err}${Colors.Reset}`);
    }
  },
  debug: (context, msg) => {
    if (IS_DEBUG) {
      console.log(`${Colors.Dim}[DEBUG] [${context}] ${msg}${Colors.Reset}`);
    }
  },
  divider: () => console.log(`${Colors.Dim}----------------------------------${Colors.Reset}`)
};
