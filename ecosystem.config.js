module.exports = {
  apps: [
    {
      name: "petaboo-dev",
      script: "pnpm",
      args: "run dev",
      cwd: "./",
      log_file: "./logs/dev.log",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      time: true,
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
