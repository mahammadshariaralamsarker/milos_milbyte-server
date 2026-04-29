#!/bin/sh

# Generate Prisma Client
npx prisma generate

# Push schema changes to the database
npx prisma db push

# Start the NestJS application
npm run start:prod
