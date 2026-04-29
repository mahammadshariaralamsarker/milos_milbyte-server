FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

COPY start.sh ./
RUN chmod +x start.sh

RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/milos_milbyte" npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["./start.sh"]
