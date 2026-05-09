-- CreateTable
CREATE TABLE "Rental" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rentalPrice" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);
