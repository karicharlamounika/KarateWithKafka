FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY start.sh ./
RUN npm ci --omit=dev


COPY . .

EXPOSE 6000

CMD ["sh", "start.sh"]
