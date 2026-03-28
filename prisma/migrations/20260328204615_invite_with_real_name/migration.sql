/*
  Warnings:

  - You are about to drop the column `display_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - Added the required column `real_name` to the `invitations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `real_name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "real_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "display_name",
DROP COLUMN "username",
ADD COLUMN     "real_name" TEXT NOT NULL;
