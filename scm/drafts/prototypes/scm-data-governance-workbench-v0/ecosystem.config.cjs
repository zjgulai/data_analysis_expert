module.exports = {
  apps: [
    {
      name: "scm-governance-workbench",
      script: "server/index.mjs",
      cwd: __dirname,
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "5174"
      },
      max_memory_restart: "512M",
      time: true
    }
  ]
};
