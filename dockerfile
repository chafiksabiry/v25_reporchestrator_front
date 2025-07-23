# Use Node.js LTS version with Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment variables
ENV VITE_RUN_MODE=in-app
#ENV VITE_RUN_MODE=standalone
ENV VITE_STANDALONE_USER_ID=68233d8b4d60b1ff38096193
ENV VITE_STANDALONE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzM2Q4YjRkNjBiMWZmMzgwOTYxOTMiLCJpYXQiOjE3NDcxNDAzOTd9.ytQA5H1JiUJtKARMEN_LGL2JqlX-I1cKmuW3aEocnBM
ENV VITE_STANDALONE_AGENT_ID=6825bd9f0a0fc3b46f7ba5a7
ENV VITE_API_URL=https://preprod-api-repcreationwizard.harx.ai/api

#Rep dahsboard
ENV VITE_REP_DASHBOARD_URL_STANDALONE=https://preprod-rep-dashboard.harx.ai/profile
ENV VITE_REP_DASHBOARD_URL=/repdashboard/profile
ENV VITE_FRONT_URL=https://rep-orchestrator.harx.ai/
# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend application in qiankun mode
RUN npm run build:qiankun

# Install serve to host the built files
RUN npm install -g serve

# Expose port 3000 for the frontend
EXPOSE 5185

# Start the application using serve
CMD ["serve", "-s", "dist", "-l", "5185"]
