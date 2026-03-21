/*
  Warnings:

  - You are about to drop the column `thumb_path` on the `post_images` table. All the data in the column will be lost.
  - Added the required column `thumbnail_path` to the `post_images` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "post_images" DROP COLUMN "thumb_path",
ADD COLUMN     "thumbnail_path" TEXT NOT NULL;
