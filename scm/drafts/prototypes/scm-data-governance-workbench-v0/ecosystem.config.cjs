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
        PORT: "5174",
        SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED: "0",
        SCM_DATABASE_WRITES_AUTHORIZED: "0"
      },
      max_memory_restart: "512M",
      time: true
    }
  ]
};
