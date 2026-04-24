/*
  Warnings:

  - You are about to drop the `likes` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "emotion" AS ENUM ('admiration', 'adoration', 'aesthetic_appreciation', 'amusement', 'anger', 'anxiety', 'awe', 'awkwardness', 'boredom', 'calmness', 'confusion', 'craving', 'disgust', 'empathic_pain', 'entrancement', 'excitement', 'fear', 'horror', 'interest', 'joy', 'nostalgia', 'relief', 'romance', 'sadness', 'satisfaction', 'sexual_desire', 'surprise');

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_post_id_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_user_id_fkey";

-- DropTable
DROP TABLE "likes";

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "emotion" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reactions_post_id_user_id_key" ON "reactions"("post_id", "user_id");

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
