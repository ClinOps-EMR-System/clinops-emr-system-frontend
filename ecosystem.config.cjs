module.exports = {
  apps: [
    {
      name: "clinops-frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/var/www/clinops-frontend",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_API_BASE_URL: "https://clinops.dpdns.org/api",
        NEXT_PUBLIC_APP_ENV: "production",
      },
      max_memory_restart: "512M",
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
