FROM node:20-alpine

WORKDIR /home/node

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run
RUN npm run build

RUN export $(cat env/.env.${NODE_ENV} | xargs) && npx prisma migrate deploy

EXPOSE 3000
CMD ["npm", "run", "start"]