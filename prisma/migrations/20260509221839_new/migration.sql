-- CreateTable
CREATE TABLE "AiSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL DEFAULT 'location',
    "aiMessage" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "travelers" INTEGER,
    "budget" TEXT,
    "experience" TEXT,
    "citizenship" TEXT,
    "passengers" INTEGER,
    "passengerPreferences" TEXT,
    "tripCard" JSONB,
    "tripGuide" JSONB,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "checkoutRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSession_sessionId_key" ON "AiSession"("sessionId");

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
