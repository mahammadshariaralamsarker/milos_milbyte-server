#!/bin/sh

# Generate Prisma Client
npx prisma generate

# Push schema changes to the database
npx prisma db push

# Seed initial data inside the container so VPS deploys do not need a manual command
node dist/prisma/schema/seed.js

# Start the NestJS application
npm run start:prod
