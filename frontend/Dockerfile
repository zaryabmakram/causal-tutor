FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

# Install dependencies including the newly added ones
RUN npm install

COPY . .

# Run build
RUN npm run build

CMD ["npm", "start"]
